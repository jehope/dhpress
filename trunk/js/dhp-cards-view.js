// DH Press Maps View -- contains all data and functions for rendering cards
// ASSUMES: A view area for the cards has been marked with HTML div as "dhp-visual"
// NOTES:   Format of Marker and Legend data is documented in dhp-project-functions.php
// USES:    JavaScript libraries jQuery, Isotope, Underscore
// TO DO:   When numeric motes supported, sort will need to convert strings to integers

var dhpCardsView = {

        // Contains fields: ajaxURL, projectID, vizIndex, cardsEP, callBacks
        //                  rawData
        //                  colorValues   = array of { id, icon_url }
        //                  defTextColor  = default text color
        //                  allMotes      = array (unique sorted) of all data and content mote names
        //                  allDataMotes  = array of all sort and filter mote names
        //                  dataAttrs     = array of just motes whose data is stored in attributes
        //                  currentSort   = name of mote currently used for sorting
        //                  currentFilter = name of mote currently used for filtering

        // PURPOSE: Initialize card viewing area with controls and layers
        // INPUT:   ajaxURL      = URL to WP
        //			projectID    = ID of project
        //			cardsEP      = settings for cards entry point (from project settings)
        //          callBacks    = object loaded with project-page callback functions
    initializeCards: function(ajaxURL, projectID, vizIndex, cardsEP, callBacks)
    {
        var menuHTML, active;

            // Save reset data for later
        dhpCardsView.ajaxURL        = ajaxURL;
        dhpCardsView.projectID      = projectID;
        dhpCardsView.vizIndex       = vizIndex;
        dhpCardsView.cardsEP        = cardsEP;
        dhpCardsView.callBacks      = callBacks;

        dhpCardsView.currentSort    = null;
        dhpCardsView.currentFilter  = null;

        dhpCardsView.allDataMotes   = [];
        dhpCardsView.dataAttrs      = [];

            // Add Sort By controls
        if (cardsEP.sortMotes.length > 0) {
            jQuery('.top-bar-section .left').append(Handlebars.compile(jQuery("#dhp-script-cards-sort").html()));
            _.each(cardsEP.sortMotes, function(theMote, index) {
                dhpCardsView.allDataMotes.push(theMote);
                if (index == 0) {
                    dhpCardsView.currentSort = theMote;
                    active = ' class="active"';
                } else {
                    active = '';
                }
                menuHTML = '<li'+active+'><a href="#">'+theMote+'</a></li>';
                jQuery('#dhp-cards-sort').append(menuHTML);
            });
                // Handle selection of a sort mote
            jQuery('#dhp-cards-sort').click(function(e) {
                    // Find out which one selected
                var newSortMenu = jQuery(e.target);
                var newSortMote = jQuery(newSortMenu).text();
                if (newSortMote != dhpCardsView.currentSort) {
                        // Remove whatever was active previously
                    jQuery('#dhp-cards-sort > .active').removeClass('active');
                    jQuery(newSortMenu).parent().addClass('active');
                    dhpCardsView.currentSort = newSortMote;
                    jQuery('#card-container').isotope( { sortBy: newSortMote } );
                }
            });
        } // if sortMotes

            // Add Filter By controls
        if (cardsEP.filterMotes.length > 0) {
            jQuery('.top-bar-section .left').append(Handlebars.compile(jQuery("#dhp-script-cards-filter-menu").html()));
            _.each(cardsEP.filterMotes, function(theMote, index) {
                dhpCardsView.allDataMotes.push(theMote);
                if (index == 0) {
                    dhpCardsView.currentFilter = theMote;
                    active = ' class="active"';
                } else {
                    active = '';
                }
                menuHTML = '<li'+active+'><a href="#">'+theMote+'</a></li>';
                jQuery('#dhp-cards-filter-menu').append(menuHTML);
            });

                // Handle selection of a filter mote
            jQuery('#dhp-cards-filter-menu').click(function(e) {
                    // Find out which one selected
                var newFilterMenu = jQuery(e.target);
                var newFilterMote = jQuery(newFilterMenu).text();
                if (newFilterMote != dhpCardsView.currentFilter) {
                        // Remove whatever was active previously
                    jQuery('#dhp-cards-filter-menu > .active').removeClass('active');
                    jQuery(newFilterMenu).parent().addClass('active');
                    dhpCardsView.currentFilter = newFilterMote;
                }
            });

            jQuery('.top-bar-section .left').append(Handlebars.compile(jQuery("#dhp-script-cards-filter-input").html()));

            jQuery('#dhp-filter-run').click(function() {
                var filterText;
                filterText = jQuery('#dhp-filter-input').val();
                if (filterText.length) {
                        // Create regular expression from filter string
                    var regExp = new RegExp(filterText, "i");
                    var className = '.datamote'+_.indexOf(dhpCardsView.allMotes, dhpCardsView.currentFilter, true);
                    var text;

                        // Get the text for each item and check against regular expression
                    jQuery('#card-container').isotope({
                      filter: function() {
                        text = jQuery(this).find(className).text();
                        return (text.search(regExp) != -1);
                      }
                    });
                } else {
                        // Allow all cards to pass!
                    jQuery('#card-container').isotope({
                      filter: function() {
                        return true;
                      }
                    });
                }
            });

            jQuery('#dhp-filter-reset').click(function() {
                jQuery('#dhp-filter-input').val('');
                    // Allow all cards to pass!
                jQuery('#card-container').isotope({
                  filter: function() {
                    return true;
                  }
                });
            });
        } // if filterMotes


        jQuery(document).foundation();

            // Ensure all fields unique -- this is needed for creating cards
        dhpCardsView.allDataMotes = _.uniq(dhpCardsView.allDataMotes);
        dhpCardsView.allDataMotes = _.sortBy(dhpCardsView.allDataMotes, function(moteName) { return moteName; });
            // Create complete list of content and data fields, unique and sorted
        dhpCardsView.allMotes     = _.union(dhpCardsView.allDataMotes, cardsEP.content);
        dhpCardsView.allMotes     = _.sortBy(dhpCardsView.allMotes, function(moteName) { return moteName; });

            // What motes are in allDataMotes[] but not in cardsEP.content?
            // Will need to add data attributes for these
        dhpCardsView.dataAttrs     = _.difference(dhpCardsView.allDataMotes, dhpCardsView.cardsEP.content);
        dhpCardsView.dataAttrs     = _.sortBy(dhpCardsView.dataAttrs, function(moteName) { return moteName; });

        dhpCardsView.loadCards();
    }, // initializeCards()


        // PURPOSE: Resizes dhp elements when browser size changes
        // 
    updateVizSpace: function()
    {
        jQuery("#card-container").isotope();
    }, // updateVizSpace()

        // PURPOSE: Return the text color for card depending on background color
        // ASSUMES: bColor is in format #xxxxxx where each x is a hexadecimal numeral
        // NOTES:   Algorithm for choosing white or black at:
        //            http://www.particletree.com/notebook/calculating-color-contrast-for-legible-text/
        //          and http://stackoverflow.com/questions/5650924/javascript-color-contraster
    textColor: function(bColor)
    {
        var brightness = 1.1;

        brightness = ((parseInt(bColor.substr(1,2), 16) * 299.0) +
                    (parseInt(bColor.substr(3,2), 16) * 587.0) +
                    (parseInt(bColor.substr(5,2), 16) * 114.0)) / 255000.0;

        if (brightness >= 0.5) {
            return "black";
        } else {
            return "white";
        }
    }, // textColor

        // PURPOSE: Called by createCards to determine color to use for marker
        // INPUT:   featureVals = array of category IDs (integers) associated with a feature/marker
        // RETURNS: Partial string to set color and background color (w/o closing ")
        // NOTES:   Will use first match on color to use for icon, or else default color
        // ASSUMES: colorValues has been loaded
        // SIDEFX:  Caches textColor in text field, which builds first time encountered
    getCardColors: function(featureVals)
    {
        var countTerms = dhpCardsView.colorValues.length; 
        var countCats = featureVals.length;
        var thisCat, thisCatID;
        var thisMarkerID;
        var catChildren;
        var i,j,k;

            // If no color motes or if marker has no category values, return default
        if (countTerms==0 || countCats==0) {
            return dhpCardsView.cardsEP.defColor+'; color:'+dhpCardsView.defTextColor;
        }

        for(i=0;i<countTerms;i++) {         // for all category values
            thisCat = dhpCardsView.colorValues[i];
            thisCatID = thisCat.id;

            for(j=0;j<countCats;j++) {      // for all marker values
                // legend categories
                thisMarkerID = featureVals[j];
                    // have we matched this element?
                if (thisCatID===thisMarkerID) {
                    if(thisCat.icon_url.substring(0,1) == '#') {
                        if (thisCat.txtColor == undefined) {
                            thisCat.txtColor = dhpCardsView.textColor(thisCat.icon_url);
                        }
                        return thisCat.icon_url+'; color:'+thisCat.txtColor;
                    } else {
                        return dhpCardsView.cardsEP.defColor+'; color:'+dhpCardsView.defTextColor;
                    }
                    // check for matches on its children
                } else {
                    if (thisCat.children) {
                        catChildren = thisCat.children;
                        for (k=0;k<catChildren.length;k++) {
                            if(catChildren[k].term_id==thisMarkerID) {
                               if(thisCat.icon_url.substring(0,1) == '#') {
                                    if (thisCat.txtColor == undefined) {
                                        thisCat.txtColor = dhpCardsView.textColor(thisCat.icon_url);
                                    }
                                    return thisCat.icon_url+'; color:'+thisCat.txtColor;
                                } else {
                                    return dhpCardsView.cardsEP.defColor+'; color:'+dhpCardsView.defTextColor;
                                }
                            }
                        }
                    }
                }
           }
        }
    }, // getHighestParentColor()

        // PURPOSE: Handle selection in "card space"
    selectCard: function(evt)
    {
        var targetCard, index, selectedFeature;

            // Search up the chain to find selected card
        targetCard = jQuery(evt.target).closest(".card");
            // If no card found (selected outside one), abort
        if (targetCard == null || targetCard == undefined) {
            return;
        }
        targetCard = jQuery(targetCard).get(0);
        if (targetCard == null || targetCard == undefined) {
            return;
        }
            // Convert cardID to index of feature in marker array
        index = parseInt(targetCard.id.substring(6));

            // Use ID of card to find index of item in array
        selectedFeature = dhpCardsView.rawData[dhpCardsView.rawData.length-1]['features'][index];

            // Open modal for feature
        dhpCardsView.callBacks.showMarkerModal(selectedFeature);
    },

        // PURPOSE: Create marker objects for map visualization; called by loadMapMarkers()
        // ASSUMES: rawdata assigned to JSON object (as outlined in createMarkerArray() in dhp-project-functions.php)
    createCards: function()
    {
            // Set dhpCardsView.colorValues to array of color values in AJAX data
        dhpCardsView.colorValues = null;
        if (dhpCardsView.cardsEP.color && dhpCardsView.cardsEP.color != '' && dhpCardsView.cardsEP.color != 'disable') {
            _.find(dhpCardsView.rawData, function(theArray, index) {
                    // Last array is markers -- if we got here, it doesn't exist
                if (index == (dhpCardsView.rawData.length-1)) {
                    dhpCardsView.colorValues = null;
                    return false;
                }
                if (theArray.type !== 'filter') {
                    throw new Error("Error in filter array at "+index);
                }
                if (theArray.name === dhpCardsView.cardsEP.color) {
                    dhpCardsView.colorValues = theArray.terms;
                    return true;
                }
                return false;
            });
        }

            // Create Legend for colors (if colors exist)
        if (dhpCardsView.colorValues.length > 1) {
            jQuery('#dhp-visual').prepend('<div id="card-legend"></div>');
            var legendStr = '<p>';
            _.each(dhpCardsView.colorValues, function(theColor) {
                    // "Parent" term can't be displayed and won't have an icon_url value
                if (theColor.icon_url) {
                    legendStr += '<span class="color-legend"><span class="splash" style="background-color:'+
                                theColor.icon_url+'"></span> '+theColor.name+'</span>';
                }
            });

            // Create cards
        jQuery('#dhp-visual').append('<div id="card-container"></div>');
        var cardHolder = jQuery('#card-container');

        var theCard, contentElement, contentData, theTitle, colorStr, classStr, moteIndex;

            // set default background and text colors
        var match = dhpCardsView.cardsEP.defColor.match(/^#([0-9a-f]{6})$/i);
        if (match) {
            defTextColor = dhpCardsView.textColor(dhpCardsView.cardsEP.defColor);
            colorStr = dhpCardsView.cardsEP.defColor+'; color:'+defTextColor;
        } else {
            colorStr = dhpCardsView.cardsEP.defColor+'; color:#000000';
            defTextColor = '#000000';
        }

            // get class for these cards
        classStr='';
        if (dhpCardsView.cardsEP.width != 'auto') {
            classStr = dhpCardsView.cardsEP.width+' ';
        }
        if (dhpCardsView.cardsEP.height != 'auto') {
            classStr += dhpCardsView.cardsEP.height;
        }

            // Markers are last array in data
        _.each(dhpCardsView.rawData[dhpCardsView.rawData.length-1]['features'], function(theFeature, index) {
                // little error-check
            if (theFeature.type !== 'Feature') {
                throw new Error("Error in marker array");
            }

                // If there is no data specifically about card, data will not be sent
            if (theFeature.card && theFeature.card.title && theFeature.card.title != 'disable') {
                theTitle = theFeature.card.title;
            } else {
                theTitle = null;
            }

            if (dhpCardsView.colorValues) {
                colorStr = dhpCardsView.getCardColors(theFeature.properties.categories);
            }

                // Create container element for the card
            theCard = jQuery('<div class="card '+classStr+'" id="cardID'+index+'" style="background-color:' + colorStr +'"></div');
            if (theTitle) {
                jQuery(theCard).append('<p style="font-weight: bold">'+theTitle+'</p></div>');
            }

                // Add class IDs to all data; mote names can be irregular, so class IDs must be index

                // Go through all content motes specified for each card view
            _.each(dhpCardsView.cardsEP.content, function(moteName) {
                    // get the index into allDataMotes for this content mote
                moteIndex = _.indexOf(dhpCardsView.allMotes, moteName, true);
                contentData = theFeature.properties.content[moteName];
                if (contentData) {
                    contentElement = jQuery('<p class="datamote'+moteIndex+'"><i>'+moteName+'</i>: '+contentData+'</p>');
                    jQuery(theCard).append(contentElement);
                }
            });
                // Now add invisible data
            _.each(dhpCardsView.dataAttrs, function(moteName) {
                    // get the index into allDataMotes for this content mote
                moteIndex = _.indexOf(dhpCardsView.allMotes, moteName, true);
                contentData = theFeature.properties.content[moteName];
                if (contentData) {
                    contentElement = jQuery('<div class="datamote'+moteIndex+'" style="display: none">'+contentData+'</div>');
                    jQuery(theCard).append(contentElement);
                }
            });

            jQuery(cardHolder).append(theCard);
        }); // _.each()

        var sortObj, moteIDs = [];

        if (dhpCardsView.cardsEP.sortMotes.length > 0) {
                // Create Object that describes sort options for Isotope by
                //   associating names of sort motes with the class names that mark the data
            _.each(dhpCardsView.cardsEP.sortMotes, function(moteName) {
                moteIndex = _.indexOf(dhpCardsView.allMotes, moteName, true);
                    // Just name by itself results in case-sensitive comparison
                // moteIDs.push('.datamote'+moteIndex);
                    // Create a curried function which has the mote index and does case-insensitive comparison
                moteIDs.push((function(index) { 
                    return function(itemElem) {
                        return jQuery(itemElem).find('.datamote'+index).text().toLowerCase();
                    } } )(moteIndex) );
            });
            sortObj = _.object(dhpCardsView.cardsEP.sortMotes, moteIDs);

                // Initialize Isotope
            cardHolder.isotope(
                { itemSelector: '.card',
                  getSortData: sortObj
                } );
        } else {
                // Initialize Isotope
            cardHolder.isotope(
                { itemSelector: '.card' }
            );

        }

        if (dhpCardsView.currentSort) {
            cardHolder.isotope( { sortBy: dhpCardsView.currentSort } );
        }

            // Bind click code to the whole container... we'll search for specific card
        jQuery(cardHolder).click(dhpCardsView.selectCard);
    }, // createCards()


        // PURPOSE: Get markers associated with projectID via AJAX, insert into HTML
    loadCards: function()
    {
        // console.log('loading');
    	jQuery.ajax({
            type: 'POST',
            url: dhpCardsView.ajaxURL,
            data: {
                action: 'dhpGetMarkers',
                project: dhpCardsView.projectID,
                index: dhpCardsView.vizIndex
            },
            success: function(data, textStatus, XMLHttpRequest)
            {
                dhpCardsView.rawData = JSON.parse(data);
                dhpCardsView.createCards();
                dhpCardsView.callBacks.remLoadingModal();
            },
            error: function(XMLHttpRequest, textStatus, errorThrown)
            {
               alert(errorThrown);
            }
        });
    } // loadCards()

};