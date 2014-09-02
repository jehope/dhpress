// PURPOSE: Handle management of Project content visualizations
// NOTES:   Format of project settings is documented in dhp-class-project.php
//          This file contains:
//              dhpProjServices: a special object data serving common needs of DHPress projects
//              Bootstrapper: initialization code that gets visualization prepared & running
// ASSUMES: dhpData is used to pass parameters to this function via wp_localize_script()
//          vizParams.layerData = array with all data needed for dhp-custom-maps
//          vizParams.current = index of current visualization in entry points
//          vizParams.menu = array of labels of visualizations
//          Section for marker modal is marked with HTML div as "markerModal"
// USES:    JavaScript libraries jQuery, Underscore, (Zurb) Foundation ...


    // Ensure that current Array methods are defined
    // ============================================

if (!Array.prototype.find) {
  Object.defineProperty(Array.prototype, 'find', {
    enumerable: false,
    configurable: true,
    writable: true,
    value: function(predicate) {
      if (this == null) {
        throw new TypeError('Array.prototype.find called on null or undefined');
      }
      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function');
      }
      var list = Object(this);
      var length = list.length >>> 0;
      var thisArg = arguments[1];
      var value;

      for (var i = 0; i < length; i++) {
        if (i in list) {
          value = list[i];
          if (predicate.call(thisArg, value, i, list)) {
            return value;
          }
        }
      }
      return undefined;
    }
  });
}

// Production steps of ECMA-262, Edition 5, 15.4.4.18
// Reference: http://es5.github.com/#x15.4.4.18
if (!Array.prototype.forEach) {
  Array.prototype.forEach = function (callback, thisArg) {
    var T, k;

    if (this == null) {
      throw new TypeError(" this is null or not defined");
    }

    // 1. Let O be the result of calling ToObject passing the |this| value as the argument.
    var O = Object(this);

    // 2. Let lenValue be the result of calling the Get internal method of O with the argument "length".
    // 3. Let len be ToUint32(lenValue).
    var len = O.length >>> 0;

    // 4. If IsCallable(callback) is false, throw a TypeError exception.
    // See: http://es5.github.com/#x9.11
    if (typeof callback !== "function") {
      throw new TypeError(callback + " is not a function");
    }

    // 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
    if (thisArg) {
      T = thisArg;
    }

    // 6. Let k be 0
    k = 0;

    // 7. Repeat, while k < len
    while (k < len) {
      var kValue;
      // a. Let Pk be ToString(k).
      //   This is implicit for LHS operands of the in operator
      // b. Let kPresent be the result of calling the HasProperty internal method of O with argument Pk.
      //   This step can be combined with c
      // c. If kPresent is true, then
      if (k in O) {

        // i. Let kValue be the result of calling the Get internal method of O with argument Pk.
        kValue = O[k];

        // ii. Call the Call internal method of callback with T as the this value and
        // argument list containing kValue, k, and O.
        callback.call(T, kValue, k, O);
      }
      // d. Increase k by 1.
      k++;
    }
    // 8. return undefined
  };
}

    // PURPOSE: This Object contains methods to service & coordinate common needs of DH Press visualizations
var dhpServices = {

        // LOCAL PROPERTIES
    ajaxURL: null,
    projectID: null,
    projSettings: null,         // Project Settings

        // PURPOSE: Provide data about DH Press needed to carry out other services
    initialize: function(theAjaxURL, theProjID, theSettings)
    {
        ajaxURL = theAjaxURL;
        projectID = theProjID;
        projSettings = theSettings;
        dhpServices.parseTimeCode = /(\d\d)\:(\d\d)\:(\d\d)\.(\d\d?)/;         // an exacting regular expression for parsing time
    }, // initialize()

        // PURPOSE: Create multi-legend Legend key for the visualization
        // INPUT:   legendList = array of legends to display; each element has field "name" and array "terms" of [id, name, icon_url ]
        //          layerTitle = label for the Layers panel (or null if none)
        // NOTES:   Handles user interaction with Legend itself, but not actions connected to visualization
        //          legend-head div must have already been inserted at appropriate place
    createLegends: function(legendList, layerTitle)
    {
        var legendHtml;

            // Build Legend controls on the right (category toggles) for each legend value and insert Legend name into dropdown above
        _.each(legendList, function(theLegend, legIndex) {
            var filterTerms = theLegend.terms;
            var legendName = theLegend.name;

                // "Root" DIV for this particular Legend
            legendHtml = jQuery('<div class="legend-div" id="term-legend-'+legIndex+
                            '"><div class="legend-title">'+legendName+'</div><div class="terms"></div></div>');
                // Create entries for all terms (though 2nd-level children are made invisible)
            _.each(filterTerms, function(theTerm) {
                if (legendName !== theTerm.name) {
                    var hasParentClass = '';
                        // Make 2nd-level children invisible with CSS
                    if(theTerm.parent) {
                        hasParentClass = 'hasParent';
                    }
                    if (theTerm.icon_url == null || theTerm.icon_url == undefined) {
                        throw new Error("Legend value "+theTerm.name+" has not been assigned a color or icon");
                    }

                    var firstIconChar = theTerm.icon_url.substring(0,1);
                    var htmlStr;

                    switch (firstIconChar) {
                    case '#':
                        htmlStr = '<div class="small-2 large-2 columns" style="background:'+
                            theTerm.icon_url+'"><input type="checkbox" checked="checked"></div>';
                        break;
                    case '.':
                        htmlStr = '<div class="small-1 large-1 columns"><div class="maki-icon '+
                            theTerm.icon_url.substring(1)+'"></div></div><input type="checkbox" checked="checked">';
                        break;
                    default:
                            // TO DO: Support uploaded images!
                        // icon = 'background: url(\''+theTerm.icon_url+'\') no-repeat right; background-size: 50%;';
                        throw new Error('Unknown visual feature: '+theTerm.icon_url);
                    }

                        // Append new legend value to menu according to type
                    jQuery('.terms', legendHtml).append('<div class="row compare '+hasParentClass+'">'+htmlStr+
                                                    '<div class="small-10 large-10 columns"><a class="value" data-id="'+
                                                    theTerm.id+'" data-parent="'+theTerm.parent+'">'+theTerm.name+'</a></div></div>');
                }
            });
            jQuery('.terms',legendHtml).prepend(Handlebars.compile(jQuery("#dhp-script-legend-hideshow").html()));

            jQuery('#legends .legend-row').append(legendHtml);
                // Add Legend title to dropdown menu in navbar -- make 1st Legend active by default
            var active = (legIndex == 0) ? ' class="active"' : '';
            jQuery('.dhp-nav .legend-dropdown').append('<li'+active+'><a href="#term-legend-'+legIndex+'">'+legendName+'</a></li>');         
        });
            // Add Layers div to legends (if any)
        if (layerTitle) {
            jQuery('#legends .legend-row').append('<div class="legend-div" id="layers-panel"><div class="legend-title">'+layerTitle+'</div></div>');
        }

            // Hide all Legends, except 0 by default
        jQuery('.legend-div').hide();
        jQuery('#term-legend-0').show();
        jQuery('#term-legend-0').addClass('active-legend');

            // Update checkbox height(varies by theme/browser) 
        // checkboxHeight = jQuery('#legends').find('input:checkbox').height();
            // Save height for min/max
        legendHeight = jQuery('#legends').height();

            //Initialize new foundation elements
        jQuery(document).foundation();

            // For small mobile screens, expand Legend menu on hover
        jQuery('#legends').prepend('<a class="legend-resize btn pull-right" href="#" alt="mini"><i class="fi-arrows-compress"></i></a>');
        if(!jQuery('body').hasClass('isMobile')) {
            jQuery('.legend-resize').hide();
            jQuery('#legends').hover(function(){
                jQuery('.legend-resize').fadeIn(100);
            },
            function() {
                jQuery('.legend-resize').fadeOut(100);
            });
        }

            // Add legend Min-Max expand/contract action
        jQuery('.legend-resize').click( function() {
            if (jQuery('#legends').hasClass('mini')) {
                jQuery('#legends').animate({ height: legendHeight },
                    500,
                    function() {
                        jQuery('#legends').removeClass('mini');
                    });
            } else {
                jQuery('#legends').addClass('mini');
                jQuery('#legends').animate({ height: 37 }, 500 );
            }
        });
    }, // createLegends()


        // PURPOSE: Create a single-legend Legend key
        // INPUT:   legendName = name of legend (String)
        //          legendList = array of Legend terms
        // NOTES:   Handles user interaction with Legend itself, but not actions connected to visualization
        //          legend-head div must have already been inserted at appropriate place
        //          Handles maki-icons though they are not actually supported yet in relevant visualizations
    create1Legend: function(legendName, legendList) {
        var legendHtml;

            // "Root" DIV for the Legend
        legendHtml = jQuery('<div class="legend-div"><div class="legend-title">'+legendName+'</div><div class="terms"></div></div>');
            // Create entries for all of the 1st-level terms (do not represent children of terms)
        _.each(legendList, function(theTerm) {
            if (legendName !== theTerm.name) {
                var hasParentClass = '';
                if (theTerm.parent) {
                    hasParentClass = 'hasParent';
                }
                var firstIconChar = theTerm.icon_url.substring(0,1);
                switch (firstIconChar) {
                case '#':
                        // Append new legend value to menu according to type
                    jQuery('.terms', legendHtml).append('<div class="row compare '+hasParentClass+'">'+
                        '<div class="small-1 large-1 columns splash" style="background:'+theTerm.icon_url+'"></div>'+
                        '<div class="small-11 large-11 columns"><a class="value" data-id="'+
                        theTerm.id+'" data-parent="'+theTerm.parent+'">'+theTerm.name+'</a></div></div>');
                    break;
                case '.':
                    jQuery('.terms', legendHtml).append('<div class="row compare '+hasParentClass+'">'+

                        '<div class="small-2 large-1 columns"><div class="maki-icon '+
                        theTerm.icon_url.substring(1)+'"></div></div><input type="checkbox" checked="checked">'+
                        '<div class="small-9 large-10 columns"><a class="value" data-id="'+

                        // '<div class="small-2 large-2 columns"><div class="maki-icon '+
                        // theTerm.icon_url.substring(1)+'"></div><input type="checkbox" checked="checked"></div>'+
                        // '<div class="small-10 large-10 columns"><a class="value" data-id="'+

                        theTerm.id+'" data-parent="'+theTerm.parent+'">'+theTerm.name+'</a></div></div>');
                    break;
                default:
                    throw new Error('Visual feature not supported for Legend: '+theTerm.icon_url);
                }
            }
        });

        jQuery('#legends').append(legendHtml);

            // Update checkbox height (varies by theme/browser)
        // checkboxHeight = jQuery('#legends').find('input:checkbox').height();
            // Save height for min/max
        legendHeight = jQuery('#legends').height();

            // Handle resizing Legend (min/max)
        jQuery('#legends').prepend('<a class="legend-resize btn pull-right" href="#" alt="mini"><i class="fi-arrows-compress"></i></a>');
        if (!jQuery('body').hasClass('isMobile')) {
            jQuery('.legend-resize').hide();
            jQuery('#legends').hover(function(){
                jQuery('.legend-resize').fadeIn(100);
            },
            function() {
                jQuery('.legend-resize').fadeOut(100);
            });
        }

            // Add legend hide/show action
        jQuery('.legend-resize').click(function() {
            if (jQuery('#legends').hasClass('mini')) {
                jQuery('#legends').animate({ height: legendHeight },
                    500,
                    function() {
                        jQuery('#legends').removeClass('mini');
                    });
            } else {
                jQuery('#legends').addClass('mini');
                jQuery('#legends').animate({ height: 37 }, 500 );
            }
        });
    }, // create1Legend()


        // PURPOSE: Takes nested array(s) of Legend terms and converts to flat array with fields:
        //              id, parent, name, icon_url
        // NOTES:   In array returned by php, parent markers have <id> field but children have <term_id>
        // RETURNS: Object with new properties: terms
    flattenTerms: function(oldTerms)
    {
        var newTerms = oldTerms;
        var termArray = [];
        var allTerms = [];

        _.each(oldTerms.terms, function(theTerm) {
            termArray.push(theTerm);
            _.each(theTerm.children, function(theChild) {
                termArray.push( {
                    id: theChild.term_id,
                    parent: theTerm.id,
                    icon_url: theTerm.icon_url,    // child inherits parent's viz
                    name: theChild.name
                });
            });
        });

        newTerms.terms = termArray;

        return newTerms;
    }, // flattenTerms()


        // RETURNS: Color for feature given a particular Legend filter or null (no match)
        // INPUT:   catTerms = array of category IDs (integers) associated with a feature/marker
        //          legendTerms = array of category IDs for Legend key
        // NOTES:   Will use first match on color to use for icon, or else default color
        //          This could be optimized if legendTerms and/or catTerms were guaranteed to be in numeric order
    getItemColor: function(catTerms, legendTerms)
    {
        var countCats = catTerms.length;

        if (countCats) {
            var countTerms = legendTerms.length;
            var thisCat, thisCatID;
            var thisMarkerID;
            var catChildren;
            var i,j,k;

            for(i=0;i<countTerms;i++) {         // for all category terms
                thisCat = legendTerms[i];
                thisCatID = thisCat.id;

                for(j=0; j<countCats; j++) {      // for all marker terms
                    // legend categories
                    thisMarkerID = catTerms[j];
                        // have we matched this element?
                    if (thisCatID===thisMarkerID) {
                        return thisCat.icon_url;
                        // check for matches on its children
                    } else {
                        catChildren = thisCat.children;
                        if (catChildren) {
                            for (k=0; k<catChildren.length; k++) {
                                if (catChildren[k].term_id==thisMarkerID) {
                                    return thisCat.icon_url;
                                }
                            }
                        }
                    }
               }
            }
        }
            // no match: default with null result
        return null;
    }, // getItemColor()


        // RETURNS: Text color for card depending on background color
        // INPUT:   bColor = color in format #xxxxxx where each x is a hexadecimal numeral
        // NOTES:   Algorithm for choosing white or black at:
        //            http://www.particletree.com/notebook/calculating-color-contrast-for-legible-text/
        //          and http://stackoverflow.com/questions/5650924/javascript-color-contraster
    getTextColor: function(bColor)
    {
            // Prepare var for float value (? needed)
        var brightness = 1.1;

        brightness = ((parseInt(bColor.substr(1,2), 16) * 299.0) +
                    (parseInt(bColor.substr(3,2), 16) * 587.0) +
                    (parseInt(bColor.substr(5,2), 16) * 114.0)) / 255000.0;

        if (brightness >= 0.5) {
            return "black";
        } else {
            return "white";
        }
    }, // getTextColor


        // RETURNS: Mote definition for mote whose name is moteName
    findMoteByName: function(moteName)
    {
        return _.find(projSettings.motes, function(theMote) {
            return (theMote.name === moteName);
        });
    }, // findMoteByName()

        // RETURNS: true if the Select Modal has a widget whose name is modalName
    modalViewHas: function(modalName)
    {
        return (_.find(projSettings.views.select.widgets,
                        function(theName) { return (theName == modalName); }) != undefined);
    },

        // PURPOSE: Remove the Loading pop-up modal dialog
    remLoadingModal: function()
    {
            // Remove Loading modal
        jQuery('#loading').foundation('reveal', 'close');
    }, // remLoadingModal()


        // PURPOSE: Fill out and show modal for marker
        // INPUT:   feature = the feature selected to show (in same format as generated by createMarkerArray())
        // SIDE-FX: Modifies DOM to create modal dialog window
    showMarkerModal: function(feature)
    {
        var selectParams = projSettings.views.select;
        var titleAtt='';
        var builtHTML;
        var link1, link2, link1Target, link2Target;

        if(selectParams.title) {
            titleAtt =  feature.properties.title;
        }

        link1  = feature.properties.link;
        link2  = feature.properties.link2;
            // Open in new tab?
        if (selectParams.linkNewTab) {
            link1Target = 'target="_blank"';
        }
        if (selectParams.link2NewTab) {
            link2Target = 'target="_blank"';
        }

            // Remove anything currently in body -- will rebuild from scratch
        jQuery('#markerModal .modal-body').empty();

            // Should Select Modal show SoundCloud or YouTube widgets?
        if (dhpServices.modalViewHas("scloud") || dhpServices.modalViewHas("youtube"))
        {
            jQuery('#markerModal').addClass('transcript');

            dhpWidget.initialize();

                // Clear out all widget settings
            var widgetSettings = {
                playerType: null,
                stream: null,
                transcript: null,
                transcript2: null,
                timecode: null,
                startTime: -1,
                endTime: -1
            };

                // Configure player-specific data
            if (dhpServices.modalViewHas('scloud'))
            {
                widgetSettings.stream = feature.properties.audio;
                widgetSettings.playerType = 'scloud';
            } else if (dhpServices.modalViewHas('youtube'))
            {
                widgetSettings.stream = feature.properties.video;
                widgetSettings.playerType = 'youtube';
            }

                // Configure transcript data
            if (feature.properties.timecode && feature.properties.timecode !== '') {
                widgetSettings.timecode = feature.properties.timecode;
                var time_codes = widgetSettings.timecode.split('-');
                widgetSettings.startTime = dhpServices.tcToMilliSeconds(time_codes[0]);
                widgetSettings.endTime   = dhpServices.tcToMilliSeconds(time_codes[1]);
            }
            if (feature.properties.transcript && feature.properties.transcript !== '') {
                widgetSettings.transcript  = feature.properties.transcript;
            }
            if (feature.properties.transcript2 && feature.properties.transcript2 !== '') {
                widgetSettings.transcript2 = feature.properties.transcript2;
            }

            dhpWidget.prepareOneTranscript(ajaxURL, projectID, '#markerModal .modal-body', widgetSettings);
         }

            // Create HTML for all of the data related to the Marker
         if (selectParams.content) {
            builtHTML = '<div><h3>Details:</h3></div>';
                // Go through each of the motes specified to be shown in select modal
            _.each(selectParams.content, function(cMote) {
                var mVal = feature.properties.content[cMote];
                if (mVal) {
                    if (cMote==='Thumbnail Right') {
                        builtHTML += '<div class="thumb-right">'+mVal+'</div>';
                    } else if (cMote==='Thumbnail Left') {
                        builtHTML += '<div class="thumb-left">'+mVal+'</div>';
                    } else if (cMote == 'the_content') {
                        builtHTML += '<div>'+mVal+'</div>';
                    } else {
                        builtHTML += '<div><span class="key-title">'+cMote+'</span>: '+mVal+'</div>';
                    }
                }
            }); // _.each()
        }

        jQuery('#markerModal .modal-body').append(builtHTML);

            // clear previous marker links
        jQuery('#markerModal .reveal-modal-footer .marker-link').remove();
            // Change title
        jQuery('#markerModal #markerModalLabel').empty().append(titleAtt);

            // setup links
        if (link1 && link1!='disable') {
            jQuery('#markerModal .reveal-modal-footer .button-group').prepend('<li><a '+link1Target+
                ' class="button success marker-link" href="'+link1+'">'+selectParams.linkLabel+'</a></li>');
        }
        if (link2 && link2 !='disable') {
            jQuery('#markerModal .reveal-modal-footer .button-group').prepend('<li><a '+link2Target+
                ' class="button success marker-link" href="'+link2+'">'+selectParams.link2Label+'</a></li>');
        }
            //Open modal
        jQuery('#markerModal').foundation('reveal', 'open');
    }, // showMarkerModal()


        // RETURNS: true if touch control is active (and hence no mouse)
    isTouchDevice: function()
    {
        // var msTouchEnabled = window.navigator.msMaxTouchPoints;
        // var generalTouchEnabled = "ontouchstart" in document.createElement("div");

        // if (msTouchEnabled || generalTouchEnabled) {
        //     return true;
        // }
        // return false;
        return (('ontouchstart' in window) || (navigator.MaxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0));
    }, // isTouchDevice()


        // PURPOSE: Create a single Date from three numbers
        // INPUT:   year, month, day must be definite numbers
        // NOTE:    month is 0-based (not 1-based: 0=January)
    createDate3Nums: function(year, month, day)
    {
        var date;

        if (year < 0 || year > 99) { // 'Normal' dates
            date = new Date(year, month, day);
        } else if (year == 0) { // Year 0 is '1 BC'
            date = new Date (-1, month, day);
        } else {
            // Create arbitrary year and then set the correct year
            date = new Date(year, month, day);
            date.setUTCFullYear(("0000" + year).slice(-4));
        }
        return date;
    }, // createDate3Nums


        // PURPOSE: Create a single Date from three strings
    createDate3Strings: function(yStr, mStr, dStr, from)
    {
        var yearBCE;
        var year, month, day;

            // First check for negative year
        if (yStr.charAt(0) == '-') {
            yearBCE = true;
            yStr = yStr.substring(1);
        } else {
            yearBCE = false;
        }

        year = parseInt(yStr);
        if (yearBCE) {
            year = -year;
        }

            // If it's a start date, defaulted data must be early as possible

        if (dStr == null || dStr === '') {
            if (mStr == null || mStr ==='') {
                if (from) {
                    month = 0; day = 1;
                } else {
                    month = 11; day = 31;
                }
            } else {
                month = parseInt(mStr) - 1;
                if (from) {
                    day = 1;
                } else {
                    day = 31;
                }
            }
        } else {
            month = parseInt(mStr) - 1;
            day = parseInt(dStr);
        }

        return dhpServices.createDate3Nums(year, month, day);
    }, // createDate3Strings()


        // PURPOSE: Parse a text string as a single Date
        // RETURNS: Date object or null if error
        // INPUT:   dateString = string itself containing Date
        //          from = true if it is the from Date, false if it is the to Date
        // ASSUMES: dateString has been trimmed
        // NOTE:    month # is 0-based!!
    parseADate: function(dateString, from)
    {
        var strComponents;
        var yearBCE;
        var year, month, day;

            // First check for negative year
        if (dateString.charAt(0) == '-') {
            yearBCE = true;
            dateString = dateString.substring(1);
        } else {
            yearBCE = false;
        }

        strComponents = dateString.split('-');

            // Year must be supplied at very least
        year = parseInt(strComponents[0]);
        if (yearBCE) {
            year = -year;
        }
            // If it's a start date, we want defaulted data to be early as possible
        switch (strComponents.length) {
        case 3:
            month = parseInt(strComponents[1]) - 1;
            day = parseInt(strComponents[2]);
            break;
        case 2:
            month = parseInt(strComponents[1]) - 1;
            if (from) {
                day = 1;
            } else {
                day = 31;
            }
            break;
        case 1:
            if (from) {
                month = 0; day = 1;
            } else {
                month = 11; day = 31;
            }
            break;
        } // switch

        return dhpServices.createDate3Nums(year, month, day);
    }, // parseADate()


        // PURPOSE: Create an event object by parsing Date string (which can have from & to)
        // INPUT:   dStr = text string representing a Date (range)
        //          minBound = minimum Date in range
        //          maxBound = maximum Date in range
    eventFromDateStr: function(dStr, minBound, maxBound)
    {
        var newEvent = { };

        var dateSegs = dStr.split('/');

        dateSegs[0] = dateSegs[0].trim();
        if (dateSegs[0] == 'open') {
            newEvent.start = minBound;
        } else {
            newEvent.start = dhpServices.parseADate(dateSegs[0], true);
        }

            // Is it a range of from/to?
        if (dateSegs.length == 2) {
            newEvent.instant = false;
            dateSegs[1] = dateSegs[1].trim();
            if (dateSegs[1] === 'open') {
                newEvent.end = maxBound;
            } else {
                newEvent.end = dhpServices.parseADate(dateSegs[1], false);
            }

            // Otherwise an instantaneous event -- just set to start Date
        } else {
            newEvent.instant = true;
            newEvent.end = newEvent.start;
        }

        return newEvent;
    }, // eventFromDateStr

        // PURPOSE: Convert timecode string into # of milliseconds
        // INPUT:   timecode must be in format [HH:MM:SS] or [HH:MM:SS.ss]
        // ASSUMES: timecode in correct format, parseTimeCode contains compiled RegEx
    tcToMilliSeconds: function (timecode)
    {
        var milliSecondsCode = new Number();
        var matchResults;

        matchResults = dhpServices.parseTimeCode.exec(timecode);
        if (matchResults !== null) {
            // console.log("Parsed " + matchResults[1] + ":" + matchResults[2] + ":" + matchResults[3]);
            milliSecondsCode = (parseInt(matchResults[1])*3600 + parseInt(matchResults[2])*60 + parseFloat(matchResults[3])) * 1000;
                // The multiplier to use for last digits depends on if it is 1 or 2 digits long
            if (matchResults[4].length == 1) {
                milliSecondsCode += parseInt(matchResults[4])*100;
            } else {
                milliSecondsCode += parseInt(matchResults[4])*10;
            }
        } else {
            throw new Error("Error in transcript file: Cannot parse " + timecode + " as timecode.");
            milliSecondsCode = 0;
        }
        return milliSecondsCode;
    } // tcToMilliSeconds()

}; // dhpServices


    // The code in the next section bootstraps the DH Press visualization
    //      Loads resources
    //      Creates windows and common navigational elements
    //      Initializes and prepares the active visualization

jQuery(document).ready(function($) {
        // Project variables
    var dhpSettings,            // all project settings
        projectID,
        ajaxURL,
        vizIndex;               // index of current visualization

        // modal and GUI support
    var modalSize;
    var browserMobile = (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase()));
    var legendHeight;

        // For reaching functions in this file used by various visualization modules
    var callBacks;
        // Visualization-specific callbacks
    var updateVizSpace;

    if(browserMobile) {
        $('body').addClass('isMobile');
    }

    ajaxURL        = dhpData.ajax_url;
    dhpSettings    = dhpData.settings;
    projectID      = dhpSettings.general.id;

    vizIndex       = dhpData.vizParams.current;

    dhpServices.initialize(ajaxURL, projectID, dhpSettings);

    jQuery(document).foundation();

        // Add generic project navigation bar
    createNavBar();

        // Insert Marker modal window HTML
    $('body').append(Handlebars.compile($("#dhp-script-markerModal").html()));
        // Set modal width
    modalSize      = dhpSettings.views.select.width;
    if(modalSize) {
        jQuery('#markerModal').addClass(modalSize);
    }

        // Did user provide visualization size params?
    var sizeStr = '';
    if (dhpSettings.views.miniWidth && dhpSettings.views.miniWidth != '') {
        sizeStr = 'width:'+ String(dhpSettings.views.miniWidth)+'px; ';
    }
    if (dhpSettings.views.miniHeight && dhpSettings.views.miniHeight != '') {
        sizeStr += 'height:'+ String(dhpSettings.views.miniHeight)+'px';
    }
    if (sizeStr !== '') {
        $('<style type="text/css"> @media screen and (min-width: 600px) { #dhp-visual { '+
            sizeStr+' }} </style>').appendTo('head');
    }

        // initialize fullscreen mode settings
    if(dhpSettings.views.fullscreen) {
        $('body, html').addClass('fullscreen');
        $('.dhp-nav .fullscreen').addClass('active');
    }

        // Constants regarding GUI items
    var wpAdminBarWidth        = 783; // Width at which the admin bar changes to mobile version
    var wpAdminBarHeight       = 32;  // Default admin bar height
    var wpMobileAdminBarHeight = 46;  // Mobile admin bar height
    var wpAdminBarVisible      = jQuery('body').hasClass('admin-bar'); // check if WP admin bar is present

    jQuery(window).resize( windowResized );

        //configure marker modal for future selection
    jQuery('#markerModal').foundation('reveal', {
        animation: 'fadeAndPop',
        animation_speed: 250,
        close_on_background_click: true,
        close_on_esc: true,
        dismiss_modal_class: 'close-select-modal',
        bg_class: 'reveal-modal-bg',
        bg : jQuery('reveal-modal-bg'),
        css : {
            open : {
                'opacity': 0,
                'visibility': 'visible',
                'display' : 'block'
            },
            close : {
                'opacity': 1,
                'visibility': 'hidden',
                'display': 'none'
            }
        }
    });

        // Attach reveal bg listener for mobile devices(iPad bug)
    if (jQuery('body').hasClass('isMobile')) {
        jQuery('body').on('touchend', function(evt) {
            if(jQuery(evt.target).hasClass('reveal-modal-bg')) {
                jQuery('#markerModal').foundation('reveal', 'close');
            }            
        });
    }

        // Don't know why this is needed -- but Select Modal Close button won't work without it
    $('#markerModal a.close-select-modal').click(function() {
      $('#markerModal').foundation('reveal', 'close');
    });

    createLoadingMessage();

        // Get the settings for current visualization
    var thisEP = dhpSettings.eps[vizIndex];
    switch (thisEP.type) {
    case 'map':
            // vizParams.layerData must have array of DHP custom map layers to add to "library" -- not base maps (??)
        _.each(dhpData.vizParams.layerData, function(theLayer) {
            dhpCustomMaps.maps.addMap(theLayer.dhp_map_typeid, theLayer.dhp_map_shortname,
                                    theLayer.dhp_map_n_bounds, theLayer.dhp_map_s_bounds,
                                    theLayer.dhp_map_e_bounds, theLayer.dhp_map_w_bounds, 
                                    theLayer.dhp_map_cent_lat, theLayer.dhp_map_cent_lon,
                                    theLayer.dhp_map_min_zoom, theLayer.dhp_map_max_zoom,
                                    theLayer.dhp_map_url,      null );
        });

            // all custom maps must have already been loaded into run-time "library"
        dhpMapsView.initialize(ajaxURL, projectID, vizIndex, thisEP.settings, dhpData.vizParams);

        updateVizSpace = dhpMapsView.dhpUpdateSize;
        break;

    case 'cards':
        dhpCardsView.initialize(ajaxURL, projectID, vizIndex, thisEP.settings);

        updateVizSpace = dhpCardsView.dhpUpdateSize;
        break;

    case 'pinboard':
        dhpPinboardView.initialize(ajaxURL, projectID, vizIndex, thisEP.settings, dhpData.vizParams);

        updateVizSpace = dhpPinboardView.dhpUpdateSize;
        break;

    case 'tree':
        dhpTreeView.initialize(ajaxURL, projectID, vizIndex, thisEP.settings);

        updateVizSpace = dhpTreeView.dhpUpdateSize;
        break;

    case 'time':
        dhpTimeline.initialize(ajaxURL, projectID, vizIndex, thisEP.settings);

        updateVizSpace = dhpTimeline.dhpUpdateSize;
        break;
    }

    // ========================= FUNCTIONS


    function windowResized()
    {
        var windowWidth, windowHeight;

            //reset body height to viewport so user can't scroll visualization area
        if (jQuery('body').hasClass('fullscreen')) {
                // get new dimensions of browser
            windowWidth  = jQuery(window).width();
            windowHeight = jQuery(window).height();

                // Override modal class size to/from medium if window size is under/over certain sizes
            if (windowWidth<800) {
                jQuery('#markerModal').removeClass('medium');
                jQuery('#markerModal').addClass(modalSize);
            }
            else if (modalSize==='tiny' && windowWidth >= 800 && windowWidth < 1200) {
                jQuery('#markerModal').removeClass('tiny');
                jQuery('#markerModal').addClass('medium');
            }
            else if (modalSize==='small' && windowWidth >= 800 && windowWidth < 1200) {
                jQuery('#markerModal').removeClass('small');
                jQuery('#markerModal').addClass('medium');
            }
            else {
                jQuery('#markerModal').removeClass('medium');
                jQuery('#markerModal').addClass(modalSize);
            }

                // New WordPress has a mobile admin bar with larger height(displays below 783px width)
            if (wpAdminBarVisible && windowWidth >= wpAdminBarWidth ) {
                jQuery('body').height(windowHeight - wpAdminBarHeight);
            }
                // Non mobile admin bar height
            else if (wpAdminBarVisible && windowWidth < wpAdminBarWidth ) {
                jQuery('body').height(windowHeight - wpMobileAdminBarHeight);
                    // ?? Joe added this later -- remove?
                // jQuery('#dhp-visual').height(windowHeight - wpMobileAdminBarHeight);
            }
                //Non logged in users
            else {
                jQuery('body').height(windowHeight);
            }
                // Force visual space to take full room
            // jQuery('#dhp-visual').css({ 'height': jQuery('body').height() - wpMobileAdminBarHeight, 'top' : wpMobileAdminBarHeight });
        }

            // Do whatever needed for specific visualization
        if (updateVizSpace) {
            updateVizSpace();
        }


            // Ensure that a long Legend title can take two lines w/o overlapping terms below
            //   by setting top of terms section to bottom of title
            // Loop through legend-div divs but only operate on those that are not Layer panels!
        jQuery('.legend-div').each( function(index) {
            if (jQuery(this).attr('id') !== 'layers-panel') {
                var height = jQuery('.legend-title', this).height();
                jQuery('terms', this).css( { top: height } );
            }
        });

            // Resize legend items that are two lines and center checkbox
            // NOTE: This algorithm is buggy -- creating height of 0px and margin-top of negative sizes
        // jQuery('.legend-div > .terms > .row').each(function(key,value) {
        //     var newRowHeight, checkboxMargin;
        //         //height of row containing text(could be multiple lines)
        //     newRowHeight   = jQuery('.columns', this).eq(1).height();
        //         // variable to center checkbox in row
        //     checkboxMargin = (newRowHeight - checkboxHeight) / 2;
        //         // set elements in rows with new values
        //     jQuery('.columns', this).eq(0).height(newRowHeight);
        //     jQuery('.columns', this).eq(0).find('input').css({'margin-top': checkboxMargin});
        // });

            // Resize Layers controls?
    } // windowResized()

        // PURPOSE: Create the bones of the top navigation bar; visualizations can further specialize it
    function createNavBar()
    {
        var homeBtnLabel = dhpSettings.general.homeLabel;
        var homeBtnURL   = dhpSettings.general.homeURL;

            // Detect appropriate theme location to attach nav bar(header or body)
            // insert top navigational bar and controls
        if($('header.site-header')) {
            $('header.site-header').append(Handlebars.compile($('#dhp-script-nav-bar').html()));
        }
        else {
            $('#content').prepend(Handlebars.compile($('#dhp-script-nav-bar').html()));
        }
            // If Home button defined, insert it
        if ((homeBtnLabel !== null) && (homeBtnLabel !== '') && (homeBtnURL !== null) && (homeBtnURL !== '')) {
            var homeBtnHTML = '<li ><a href="'+ homeBtnURL +'"><i class="fi-home"></i> ' + homeBtnLabel + ' </a></li>';
            $('.top-bar-section .right').prepend(homeBtnHTML);
        }

            // Create drop-down menu for visualizations
            // Place at start (left end) of right side (??)
        if (dhpData.vizParams.menu.length > 1) {
                // Insert slot into nav-bar
            $('.top-bar-section .right').prepend(Handlebars.compile($('#dhp-script-epviz-menu').html()));

                // Matches viz parameter in URL
            var vizPattern = /viz=\d+/;
                // Get URL of current location, ensure it is a string
            var baseURL = String(window.location);
                // remove any trailing # in case we need to append query var
            if (baseURL.substr(-1,1) == '#') {
                baseURL = baseURL.substring(0, baseURL.length-1);
            }
                // get query string
            var queryStr = window.location.search;
                // if no query string at all, need to add initial query character and viz param
            if (queryStr.length < 2) {
                baseURL += '?viz=0'

                // Check to see if the query string lacks viz param
            } else if (!queryStr.match(vizPattern)) {
                baseURL += '&viz=0'
            }

                // Split off the query params -- may need to include "project=X" in any URL
            var menuHTML, active, linkStr;
            _.each(dhpData.vizParams.menu, function(mItem, index) {
                    // Don't need to create menu for this current visualization, and select shouldn't do anything
                if (vizIndex == index) {
                    active = ' class="active"';
                    linkStr = '<a href="#">'+mItem+'</a>';
                } else {
                    active = '';
                    linkStr = '<a href="'+baseURL.replace(vizPattern, 'viz='+index)+'">'+mItem+'</a>';
                }
                menuHTML = '<li'+active+'>'+linkStr+'</li>';
                $('.dropdown.epviz-dropdown').append(menuHTML);
            });
        }

            // Get name of Project and put on Nav Bar
        var projName = $('.entry-title').text();
        if (projName && projName.length) {
            $('.dhp-nav .title-area .name h1 a').text(projName);
        }

            // handle toggling fullscreen mode
        $('.dhp-nav .fullscreen').click(function(){
            if($('body').hasClass('fullscreen')) {
                $('body, html').removeClass('fullscreen');
                $('.dhp-nav .fullscreen').removeClass('active');
            } else {
                $('body, html').addClass('fullscreen');
                $('.dhp-nav .fullscreen').addClass('active');
            }
            windowResized();
        });

            // If tipsModal exists, create link to open it
        var helpText = $('#tipModal .modal-body').text();
        if (helpText !== undefined && helpText.length > 1) {
            $('.dhp-nav .top-bar-section .right').append('<li><a href="#" class="tips" data-reveal-id="tipModal" data-reveal><i class="fi-info"></i>Tips</a></li>');
                // Don't know why this is needed -- but Select Modal Close button won't work without it
            $('#tipModal .close-tip').click(function() {
              $('#tipModal').foundation('reveal', 'close');
            });
        }
    } // createNavBar()

        // PURPOSE: Bring up Loading pop-box modal dialog
    function createLoadingMessage()
    {
        $('body').append(Handlebars.compile($("#dhp-script-modal-loading").html()));  
        // FIX: Error in Foundation Reveal needs the following. 
        // Link: http://foundation.zurb.com/forum/posts/375-foundation-5-reveal-options-not-working
        $('#loading').foundation('reveal', {
            animation: 'fadeAndPop',
            animation_speed: 250,
            close_on_background_click: false,
            close_on_esc: false,
            dismiss_modal_class: 'close-reveal-modal',
            bg_class: 'loading-reveal-modal-bg',
            bg : $('.loading-reveal-modal-bg'),
            css : {
                open : {
                    'opacity': 0,
                    'visibility': 'visible',
                    'display' : 'block'
                },
                close : {
                    'opacity': 1,
                    'visibility': 'hidden',
                    'display': 'none'
                }
            }
        });
        // $('#loading').modal({backdrop:false});
        // $('#loading').modal('show');
        $('#loading').foundation('reveal', 'open');
        // $('.loading-reveal-modal-bg').remove();
    } // createLoadingMessage()
}); // project page bootstrap


    // Interface between embedded YouTube player and code that uses it
    // This is called once iFrame and API code is ready
    // Need to determine whether this calls dhpWidget or dhpPinboard animation...
function onYouTubeIframeAPIReady()
{
        // Viewing pinboard but video player not yet instantiated yet it is loading
    if (dhpPinboardView && (dhpPinboardView.vidPlayer==null) && (dhpPinboardView.playState==dhpPinboardView.STATE_LOADING)) {
        dhpPinboardView.onYouTubeIframeAPIReady();
    } else {
        dhpWidget.bindPlayerHandlers();
    }
}
