// DH Press Pinboard View
// ASSUMES: Visualization area is marked with HTML div as "dhp-visual"
// NOTES:   Format of Marker and Legend data (GeoJSON) is documented in dhp-project-functions.php
//          The class active-legend is added to whichever legend is currently visible and selected

// USES:    JavaScript libraries jQuery, Underscore, Snap svg


var dhpPinboardView = {

        // Contains fields: ajaxURL, projectID, pinboardEP, viewParams, vizIndex
        //                  callBacks = object containing callback functions to dhp-project-page

        //					rawAjaxData = raw data returned from AJAX
        //					allMarkers = All marker posts assoc. w/ Project; see data desc in createMarkerArray() of dhp-project-functions.php
        //                          Points to features array

        //                  filters = array of all reformatted(flattend) Legend/Filter data
        //                  curLgdName = name of current legend/filter
        //                  curLgdFilter = pointer to current legend/filter array

        //                  iWidth, iHeight = actual pixel width and height of image
        //                  viewL, viewT, viewW, viewH = current viewport into background image
        //                  viewScale = current zoom scale % (100=fullsize)
        //                  zoomStep = % of zoom or reduce for each step

        //                  useParent = if true (always true!), actions on parent term affect child terms
        //                  isTouch = this is a touch-screen interface, not mouse
        //                  currentFeature = map feature currently highlighted or selected (with modal)
        //                  anyPopupsOpen = true when a popover modal is currently open

        //                  radius = radius of geometric markers
        //                  iconSize = "s" | "m" | "l"
        //                  icons (Object with properties that are SNAP path defs)
        //                      ballon, magGlass, thumbtack

        // PURPOSE: Initialize new leaflet map, layers, and markers                         
        // INPUT:   ajaxURL      = URL to WP
        //          projectID    = ID of project
        //          mapEP        = settings for map entry point (from project settings)
        //          viewParams   = array of data about map layers (see dhpGetMapLayerData() in dhp-project-functions)
        //          callBacks    = set of callback functions back to dhp-project-page functions
    initialize: function(ajaxURL, projectID, vizIndex, pinboardEP, viewParams, callBacks) {
             // Constants
        dhpPinboardView.checkboxHeight  = 12; // default checkbox height
        dhpPinboardView.minWidth        = 182; // 182px for horizontal + 260px for Legend key
        dhpPinboardView.controlHeight   = 49;  // max(navButtonHeight[30], LegendHeight[45]) + 4

            // Save visualization data for later
        dhpPinboardView.ajaxURL        = ajaxURL;
        dhpPinboardView.projectID      = projectID;
        dhpPinboardView.vizIndex       = vizIndex;
        dhpPinboardView.pinboardEP     = pinboardEP;
        dhpPinboardView.viewParams     = viewParams;
        dhpPinboardView.callBacks      = callBacks;

        dhpPinboardView.isTouch        = dhpPinboardView.isTouchDevice();

            // Expand to show/hide child terms and use their colors
        dhpPinboardView.useParent = true;

        dhpPinboardView.anyPopupsOpen = false;

            // ensure that EP parameters are integers, not strings
        dhpPinboardView.iWidth  = typeof(pinboardEP.width)  === 'number' ? pinboardEP.width  : parseInt(pinboardEP.width);
        dhpPinboardView.iHeight = typeof(pinboardEP.height) === 'number' ? pinboardEP.height : parseInt(pinboardEP.height);

            // set view/scroll window parameters

            // viewBox coordinates -- start out 1-1 actual pixel view
        dhpPinboardView.viewL=0;
        dhpPinboardView.viewT=0;
        dhpPinboardView.viewW=dhpPinboardView.iWidth;
        dhpPinboardView.viewH=dhpPinboardView.iHeight;
        dhpPinboardView.viewScale=100;
        dhpPinboardView.zoomStep=10;

            // Add pinboard elements to nav bar
        jQuery('.dhp-nav .top-bar-section .left').append(Handlebars.compile(jQuery("#dhp-script-pin-menus").html()));

            // Set total size of visualization space to background image plus navigation controls
        // jQuery("#dhp-visual").width(pinboardEP.width < dhpPinboardView.minWidth ?
        //                             dhpPinboardView.minWidth : pinboardEP.width+4);
        // jQuery("#dhp-visual").height(pinboardEP.height+dhpPinboardView.controlHeight);

            // Create control div for Legend and image navigation buttons
        jQuery("#dhp-visual").append('<div id="dhp-controls"></div>');

            // Create placeholder for Legend menu
        jQuery('#dhp-controls').append(Handlebars.compile(jQuery("#dhp-script-pin-legend-head").html()));

            // Create buttons for navigating & zooming background image
        jQuery('#dhp-controls').append('<div id="dhp-image-controls"><div id="pin-left"></div><div id="pin-right"></div><div id="pin-down"></div><div id="pin-up"></div><div id="pin-reduce"></div><div id="pin-zoom"></div><div id="pin-refresh"></div></div>');
        jQuery("#pin-refresh").click(dhpPinboardView.resetView);
        jQuery("#pin-zoom").click(dhpPinboardView.zoomIn);
        jQuery("#pin-reduce").click(dhpPinboardView.zoomOut);
        jQuery("#pin-left").click(dhpPinboardView.goLeft);
        jQuery("#pin-right").click(dhpPinboardView.goRight);
        jQuery("#pin-up").click(dhpPinboardView.goUp);
        jQuery("#pin-down").click(dhpPinboardView.goDown);

            // Initialize Snap and create "paper" palette
        dhpPinboardView.svgRoot = document.createElementNS("http://www.w3.org/2000/svg", "svg");

        jQuery(dhpPinboardView.svgRoot).width(dhpPinboardView.iWidth+2).height(dhpPinboardView.iHeight+2);
        // jQuery(dhpPinboardView.svgRoot).css({"border": "1px solid red" });

            // Create container for SVG and insert the "paper"
        jQuery("#dhp-visual").append('<div id="svg-container"></div>');
        jQuery("#svg-container").append(dhpPinboardView.svgRoot);
        dhpPinboardView.paper = Snap(dhpPinboardView.svgRoot);

            // Create background image
        dhpPinboardView.paper.image(pinboardEP.imageURL, 0, 0, dhpPinboardView.iWidth, dhpPinboardView.iHeight);

        var pathBallon = "M8,0C4.687,0,2,2.687,2,6c0,3.854,4.321,8.663,5,9.398C7.281,15.703,7.516,16,8,16s0.719-0.297,1-0.602  C9.679,14.663,14,9.854,14,6C14,2.687,11.313,0,8,0z M8,10c-2.209,0-4-1.791-4-4s1.791-4,4-4s4,1.791,4,4S10.209,10,8,10z M8,4  C6.896,4,6,4.896,6,6s0.896,2,2,2s2-0.896,2-2S9.104,4,8,4z";
        var pathMagGlass = "M15.7,14.3l-3.105-3.105C13.473,10.024,14,8.576,14,7c0-3.866-3.134-7-7-7S0,3.134,0,7s3.134,7,7,7  c1.576,0,3.024-0.527,4.194-1.405L14.3,15.7c0.184,0.184,0.38,0.3,0.7,0.3c0.553,0,1-0.447,1-1C16,14.781,15.946,14.546,15.7,14.3z   M2,7c0-2.762,2.238-5,5-5s5,2.238,5,5s-2.238,5-5,5S2,9.762,2,7z";
        var pathThumbtack = "M16.729,4.271c-0.389-0.391-1.021-0.393-1.414-0.004c-0.104,0.104-0.176,0.227-0.225,0.355  c-0.832,1.736-1.748,2.715-2.904,3.293C10.889,8.555,9.4,9,7,9C6.87,9,6.74,9.025,6.618,9.076C6.373,9.178,6.179,9.373,6.077,9.617  c-0.101,0.244-0.101,0.52,0,0.764c0.051,0.123,0.124,0.234,0.217,0.326l3.243,3.243L5,20l6.05-4.537l3.242,3.242  c0.092,0.094,0.203,0.166,0.326,0.217C14.74,18.973,14.87,19,15,19s0.26-0.027,0.382-0.078c0.245-0.102,0.44-0.295,0.541-0.541  C15.974,18.26,16,18.129,16,18c0-2.4,0.444-3.889,1.083-5.166c0.577-1.156,1.556-2.072,3.293-2.904  c0.129-0.049,0.251-0.121,0.354-0.225c0.389-0.393,0.387-1.025-0.004-1.414L16.729,4.271z";

            // Prepare marker usage and icons
        dhpPinboardView.iconSize       = pinboardEP.size;
        switch (pinboardEP.size) {
        case "s":
            dhpPinboardView.radius     = 4;
            dhpPinboardView.diamondPts = [ [0,-4], [4,0], [0,4], [-4,0] ];
            break;
        case "m":
            dhpPinboardView.radius     = 8;
            dhpPinboardView.diamondPts = [ [0,-9], [9,0], [0,9], [-9,0] ];
            break;
        case "l":
            dhpPinboardView.radius     = 12;
            dhpPinboardView.diamondPts = [ [0,-12], [12,0], [0,12], [-12,0] ];
            break;
        }
            // Prepare object for icon definitions
        dhpPinboardView.icons = { };
            // Create each one as path and move to definitions section of SVG
        dhpPinboardView.icons.ballon = dhpPinboardView.paper.path(pathBallon);
        dhpPinboardView.icons.ballon.toDefs();
        dhpPinboardView.icons.magGlass = dhpPinboardView.paper.path(pathMagGlass);
        dhpPinboardView.icons.magGlass.toDefs();
        dhpPinboardView.icons.thumbtack = dhpPinboardView.paper.path(pathThumbtack);
        dhpPinboardView.icons.thumbtack.toDefs();

        dhpPinboardView.loadMarkers();
    }, // initPinboard()


        // PURPOSE: Resizes pinboard-specific elements initially and when browser size changes
    dhpUpdateSize: function()
    {
        var newRowHeight, checkboxMargin;

            //resize legend term position for long titles
        jQuery('.active-legend .terms').css({top: jQuery('.active-legend .legend-title').height() });

            //resize legend items that are two lines and center checkbox
        jQuery('.active-legend .row').each(function(key,value) {
                //height of row containing text(could be multiple lines)
            newRowHeight   = jQuery('.columns', this).eq(1).height();
                // variable to center checkbox in row
            checkboxMargin = (newRowHeight - dhpPinboardView.checkboxHeight) / 2;
                // set elements in rows with new values
            jQuery('.columns', this).eq(0).height(newRowHeight);
            jQuery('.columns', this).eq(0).find('input').css({'margin-top': checkboxMargin});
        });

            // Width of svg-container is same as visual space
        jQuery('#svg-container').width(jQuery('#dhp-visual').width()-2);
            // Height of svg-container will be total viz space minus height of navbar, margins, border & scroll bar itself
        var svgHeight = jQuery('#dhp-visual').height() - (dhpPinboardView.controlHeight+40);
        jQuery('#svg-container').height(svgHeight);
    }, // dhpUpdateSize()


        // PURPOSE: Reset background image to initial 1-1 setting
    resetView: function() {
        dhpPinboardView.viewL=0;
        dhpPinboardView.viewT=0;
        dhpPinboardView.viewW=dhpPinboardView.iWidth;
        dhpPinboardView.viewH=dhpPinboardView.iHeight;
        dhpPinboardView.viewScale=100;
        dhpPinboardView.recalcViewBox();
    }, // resetView()


    zoomIn: function() {
        var centX, centY, newW, newH;
            // Allow a maximum of 5x zoom
        if (dhpPinboardView.viewScale > 20) {
                // To zoom in, we need to substract % of pix shown!
            dhpPinboardView.viewScale -= dhpPinboardView.zoomStep;
                // Compute current width, height and center point
            centX = dhpPinboardView.viewL + (dhpPinboardView.viewW / 2);
            centY = dhpPinboardView.viewT + (dhpPinboardView.viewH / 2);
                // calculate new width and height according to new zoom
            newW = ((dhpPinboardView.iWidth  * dhpPinboardView.viewScale) / 100);
            newH = ((dhpPinboardView.iHeight * dhpPinboardView.viewScale) / 100);
                // calculate new viewBox coords
            dhpPinboardView.viewL = centX - (newW / 2);
            dhpPinboardView.viewW = newW;
            dhpPinboardView.viewT = centY - (newH / 2);
            dhpPinboardView.viewH = newH;
            dhpPinboardView.recalcViewBox();
        }
    }, // zoomIn()


    zoomOut: function() {
        var centX, centY, newW, newH;
            // Allow a maximum of 1.5x zoom
        if (dhpPinboardView.viewScale < 150) {
                // To zoom out, we need to add % of pix shown!
            dhpPinboardView.viewScale += dhpPinboardView.zoomStep;
                // Compute current width, height and center point
            centX = dhpPinboardView.viewL + (dhpPinboardView.viewW / 2);
            centY = dhpPinboardView.viewT + (dhpPinboardView.viewH / 2);
                // calculate new width and height according to new zoom
            newW = ((dhpPinboardView.iWidth  * dhpPinboardView.viewScale) / 100);
            newH = ((dhpPinboardView.iHeight * dhpPinboardView.viewScale) / 100);
                // calculate new viewBox coords
            dhpPinboardView.viewL = centX - (newW / 2);
            dhpPinboardView.viewW = newW;
            dhpPinboardView.viewT = centY - (newH / 2);
            dhpPinboardView.viewH = newH;
            dhpPinboardView.recalcViewBox();
        }
    }, // zoomOut()


    goLeft: function() {
        var stepX;
        stepX = (dhpPinboardView.iWidth * dhpPinboardView.zoomStep) / 100;
            // calculate new viewBox coords
        dhpPinboardView.viewL += stepX;
        dhpPinboardView.recalcViewBox();
    }, // goLeft()


    goRight: function() {
        var stepX;
        stepX = (dhpPinboardView.iWidth * dhpPinboardView.zoomStep) / 100;
            // calculate new viewBox coords
        dhpPinboardView.viewL -= stepX;
        dhpPinboardView.recalcViewBox();
    }, // goRight()


    goUp: function() {
        var stepY;
        stepY = (dhpPinboardView.iHeight * dhpPinboardView.zoomStep) / 100;
            // calculate new viewBox coords
        dhpPinboardView.viewT += stepY;
        dhpPinboardView.recalcViewBox();
    }, // goUp()


    goDown: function() {
        var stepY;
        stepY = (dhpPinboardView.iHeight * dhpPinboardView.zoomStep) / 100;
            // calculate new viewBox coords
        dhpPinboardView.viewT -= stepY;
        dhpPinboardView.recalcViewBox();
    }, // goDown()


        // PURPOSE: Set new viewBox given current coordinates
    recalcViewBox: function() {
            // reset viewBox with new settings (top, left, width, height)
        var newSettings = dhpPinboardView.viewL.toString()+" "+dhpPinboardView.viewT.toString()+" "+
                            dhpPinboardView.viewW.toString()+" "+dhpPinboardView.viewH.toString();
        dhpPinboardView.svgRoot.setAttribute("viewBox", newSettings);
    }, // recalcViewBox()


        // PURPOSE: Create marker objects for pinboard visualization; called by loadMapMarkers()
        // INPUT:   geoData = all AJAX data as JSON object: Array of ["type", ...]
        // SIDE-FX: assigns variables rawAjaxData, allMarkers, filters
    createDataObjects: function(geoData) 
    {
        dhpPinboardView.rawAjaxData = geoData;

        dhpPinboardView.filters = [];

            // Assign data to appropriate objects
        _.each(dhpPinboardView.rawAjaxData, function(dataSet) {
            switch(dataSet.type) {
            case 'filter':
                dhpPinboardView.filters.push(dhpPinboardView.reformatTerms(dataSet));
                break;
            case 'FeatureCollection':
                dhpPinboardView.allMarkers = dataSet.features;
                break;
            }
        });

            // filters will now consist of array of objects with .name and .terms properties
            // each .terms property is an array of flattened legend key arrays

            // First legend will be selected by default
        dhpPinboardView.createLegends();
        dhpPinboardView.createSVG();

        // dhpPinboardView.dhpUpdateSize();
    }, // createDataObjects()


        // RETURNS: An array of indices to the markers belonging to the given category
        // NOTES:   Must return 1st-level terms and all 2nd-level children
    getMarkersOfCategory: function(theCategory)
    {
        var catIndices=[], found;

            // Go through all of the markers
        _.each(dhpPinboardView.allMarkers, function(theMarker, index) {
                // For each marker, see if it is marked with this category
            found= _.find(theMarker.properties.categories, function(theCat) {
                return theCat == theCategory;
            });
            if (found) {
                catIndices.push(index);
            }
        });
        return catIndices;
    }, // getMarkersOfCategory()


        // PURPOSE: Create SVG data to represent markers on image
        // NOTES:   Need to create nested <g> groups to correspond to Legend heads and values
        //          Then we can show or hide various Legends by setting attributes
        //          Legend heads will have class .lgd-head and id #lgd-id+ID#
        //          Legend values will have class .lgd-val and id #lgd-id+ID#
        // ASSUMES: 2nd-level Legend value gets checked or unchecked by 1st-level parent, so that
        //              Markers can retain their distinctive 2nd-level IDs
        //          Legend head is the first term that appears in each Legend/Filter array
    createSVG: function()
    {
        var legendName, lgdHeadGroup, lgdHeadVal, markerIndices, theMarker, shape;

        _.each(dhpPinboardView.filters, function(theLegend, legIndex) {
            legendName = theLegend.name;

                // Create grouping for Legend head
            lgdHeadGroup = dhpPinboardView.paper.group();
                // Create entries for all of the 1st-level terms
            _.each(theLegend.terms, function(theTerm) {
                if (legendName === theTerm.name) {
                        // Can't set the attributes for Legend head until we get to its term entry
                        // Only first legend is visible initially, so set class accordingly
                    var lgdAtts = { id: 'lgd-id'+theTerm.id,
                                    stroke: "#000",
                                    strokeWidth: 1
                                  };
                    if (legIndex == 0) {
                        lgdAtts.class = 'lgd-head';
                    } else {
                        lgdAtts.class = 'lgd-head hide';
                    }
                    lgdHeadGroup.attr(lgdAtts);
                } else {
                        // Create grouping for Legend value
                        // Set color for all items of this value
                    lgdHeadVal = lgdHeadGroup.group();
                    lgdHeadVal.attr( { class: 'lgd-val',
                                        id: 'lgd-id'+theTerm.id,
                                        fill: theTerm.icon_url
                                    } );
                    markerIndices = dhpPinboardView.getMarkersOfCategory(theTerm.id);
                        // Create each marker in this group
                    _.each(markerIndices, function(mIndex) {
                        theMarker = dhpPinboardView.allMarkers[mIndex];
                        switch(dhpPinboardView.pinboardEP.icon) {
                        case 'circle':
                            shape = dhpPinboardView.paper.circle(theMarker.geometry.coordinates[0],
                                                                theMarker.geometry.coordinates[1],
                                                                dhpPinboardView.radius);
                            break;
                        case 'diamond':
                            shape = dhpPinboardView.paper.polygon(dhpPinboardView.diamondPts);
                            shape.transform("t" + theMarker.geometry.coordinates[0] + "," + theMarker.geometry.coordinates[1]);
                            break;
                        case 'tack':
                            shape = dhpPinboardView.icons.thumbtack.use();
                            shape.transform("t" + theMarker.geometry.coordinates[0] + "," + theMarker.geometry.coordinates[1]);
                            break;
                        case 'ballon':
                            shape = dhpPinboardView.icons.ballon.use();
                            shape.transform("t" + theMarker.geometry.coordinates[0] + "," + theMarker.geometry.coordinates[1]);
                            break;
                        case 'mag':
                            shape = dhpPinboardView.icons.magGlass.use();
                            shape.transform("t" + theMarker.geometry.coordinates[0] + "," + theMarker.geometry.coordinates[1]);
                            break;
                        } // switch
                        shape.node.id = mIndex;
                        shape.data("i", mIndex);
                            // Clicking shape must invoke select modal
                        shape.click(function() {
                                // Get index to marker
                            var index = parseInt(this.data("i"));
                            var clicked = dhpPinboardView.allMarkers[index];
                            dhpPinboardView.callBacks.showMarkerModal(clicked);
                        });
                        lgdHeadVal.add(shape);
                    }); // each marker
                } // if
            }); // each Legend value
            lgdHeadGroup.add(lgdHeadVal);
        }); // each Legend Head
    }, // createSVG()


        // PURPOSE: Called by createDataObjects() to take nested array(s) of terms and convert to flat array
        //              of items with fields: id, parent, name, icon_url
        // NOTES:   In array returned by php, parent markers have <id> field but children have <term_id>
        // RETURNS: Object with 2 properties: terms and all
    reformatTerms: function(oldTerms)
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
    }, // reformatTerms()


        // PURPOSE: Handle user selection of legend in navbar menu
        // INPUT:   target = element selected by user
    switchLegend: function(target)
    {
        var newLgdName = jQuery(target).text();

        if (newLgdName !== dhpPinboardView.curLgdName) {
                // Don't display current (or any) Legend in main Legend key
            jQuery('.legend-div').hide();
            jQuery('.legend-div').removeClass('active-legend');

                // Display selected legend (whose ID was stored in href) in main Legend key
            var action = jQuery(target).attr('href');
            jQuery(action).addClass('active-legend');
            jQuery(action).show();

                // Change active menu item
            jQuery('.legend-dropdown > .active').removeClass('active');
            jQuery(target).parent().addClass('active');

                // Update the markers to show on pinboard
            dhpPinboardView.switchFilter(newLgdName);
            dhpPinboardView.dhpUpdateSize();
        }
    }, // switchLegend()


        // PURPOSE: Handle data implications of new Legend/Category
        // INPUT:   filterName = name of legend/category selected
        // ASSUMES: rawAjaxData has been assigned, selectControl has been initialized
        // SIDE-FX: Sets curLgdName, curLgdFilter; modifies svg class settings
    switchFilter: function(filterName)
    {
            // Reset current Legend/Filter variables
        dhpPinboardView.curLgdName = filterName;
        dhpPinboardView.curLgdFilter = _.find(dhpPinboardView.filters, function(theFilter) {
            return theFilter.name == filterName;
        });

        var term0 = dhpPinboardView.curLgdFilter.terms[0];

            // Add "hide" to class of all Legend heads in SVG
        var allGroupings = dhpPinboardView.paper.selectAll('.lgd-head');
        _.each(allGroupings, function(theGrouping, index) {
            if (!theGrouping.hasClass('hide')) {
                theGrouping.addClass('hide');
            }
        });

            // Remove "hide" for this Legend head in SVG
        var thisGroup = dhpPinboardView.paper.select('#lgd-id'+term0.id);
        if (thisGroup) {
            thisGroup.removeClass('hide');
        } else {
            throw new Error("Bug in Legend head handling: Legend Head ID not found in SVG");
        }
    }, // switchFilter()


        // PURPOSE: Handle user changing Legend keys in current Legend -- show current marker selection
        // ASSUMES: All Legends but current has "hide" in class
    refreshMarkerLayer: function()
    {
        var grpsToHide, lgdID, grpsToShow;

            // Hide all Legend values in current Legend by default
        grpsToHide = dhpPinboardView.paper.selectAll('#lgd-id'+dhpPinboardView.curLgdFilter.terms[0].id+' .lgd-val');
        _.each(grpsToHide, function(theGrouping, index) {
            if (!theGrouping.hasClass('hide')) {
                theGrouping.addClass('hide');
            }
        });

            // Go through all checked Legend values and remove hide from class of all assoc. markers
        jQuery('#legends .active-legend .compare input:checked').each(function(index) {
            lgdID = jQuery(this).closest('.row').find('.columns .value').data('id');
            grpsToShow = dhpPinboardView.paper.selectAll('#lgd-id'+lgdID);
            _.each(grpsToShow, function(theGrouping, index) {
                    theGrouping.removeClass('hide');
            });
        });
    }, // refreshMarkerLayer()


        // PURPOSE: Create HTML for all of the legends for this visualization
    createLegends: function() 
    {
        var legendHtml;
        var legendHeight;

            // Build Legend controls on the right (category toggles) for each legend value and insert Legend name into dropdown above
        _.each(dhpPinboardView.filters, function(theLegend, legIndex) {
            var filterTerms = theLegend.terms;
            var legendName = theLegend.name;

                // "Root" DIV for this particular Legend
            legendHtml = jQuery('<div class="'+legendName+' legend-div" id="term-legend-'+legIndex+
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
                        htmlStr = '<div class="small-3 large-2 columns" style="background:'+
                            theTerm.icon_url+'"><input type="checkbox" checked="checked"></div>';
                        break;
                    case '.':
                        htmlStr = '<div class="small-2 large-1 columns"><div class="maki-icon '+
                            theTerm.icon_url.substring(1)+'"></div></div><input type="checkbox" checked="checked">';
                        break;
                    default:
                            // TO DO: Support uploaded images!
                        // icon = 'background: url(\''+theTerm.icon_url+'\') no-repeat right; background-size: 50%;';
                        throw new Error('Unknown visual feature: '+theTerm.icon_url);
                    }

                        // Append new legend value to menu according to type
                    jQuery('.terms', legendHtml).append('<div class="row compare '+hasParentClass+'">'+htmlStr+
                                                    '<div class="small-9 large-10 columns"><a class="value" data-id="'+
                                                    theTerm.id+'" data-parent="'+theTerm.parent+'">'+theTerm.name+'</a></div></div>');
                }
            });
                // Put the Hide/Show checkbox at beginning of Legend
            jQuery('.terms',legendHtml).prepend(Handlebars.compile(jQuery("#dhp-script-pin-legend-hideshow").html()));
                // Add constructed Legend key to total
            jQuery('#legends .legend-row').append(legendHtml);
                // Add Legend title to dropdown menu in navbar -- make 1st Legend active by default
            var active = (legIndex == 0) ? ' class="active"' : '';
            jQuery('.dhp-nav .legend-dropdown').append('<li'+active+'><a href="#term-legend-'+legIndex+'">'+legendName+'</a></li>');         
        });

            // Hide all Legends, except 0 by default
        jQuery('.legend-div').hide();
        jQuery('#term-legend-0').show();
        jQuery('#term-legend-0').addClass('active-legend');

            // Update checkbox height(varies by theme/browser) 
        dhpPinboardView.checkboxHeight = jQuery('#legends').find('input:checkbox').height();

            //Initialize new foundation elements
        jQuery(document).foundation();

            // For small mobile screens, expand Legend menu on hover
        jQuery('#legends').prepend('<a class="legend-resize btn pull-right" href="#" alt="mini"><i class="fi-arrows-compress"></i></a>');
        if(!jQuery('body').hasClass('isMobile')) {
            jQuery('.legend-resize').hide();
            jQuery('#legends').hover(function() {
                jQuery('.legend-resize').fadeIn(100);
            },
            function() {
                jQuery('.legend-resize').fadeOut(100);
            });
        }

            // Add legend Min-Max expand/contract action
        jQuery('.legend-resize').click(function(){
            if (jQuery('#legends').hasClass('mini')) {
                jQuery('#legends').animate({ height: legendHeight },
                    500,
                    function() {
                        jQuery('#legends').removeClass('mini');
                    });
            } 
            else {
                legendHeight = jQuery('#legends').height();
                jQuery('#legends').addClass('mini');                
                jQuery('#legends').animate({ height: 37 }, 500 );
            }
        });

            // Handle user selection of value name from current Legend
        jQuery('#legends div.terms .row a').click(function(event) {
            var spanName = jQuery(this).data('id');

                // "Hide/Show all" button
            if (spanName==='all') {
                    // Should legend values now be checked or unchecked?
                var boxState = jQuery(this).closest('.row').find('input').prop('checked');
                jQuery('.active-legend .terms .row').find('input').prop('checked',!boxState);
            }
                // a specific legend/category value (ID#)
            else {
                    // uncheck everything
                jQuery('.active-legend .terms input').prop('checked', false);
                jQuery('.active-legend .terms .row.selected').removeClass('selected');
                    // select just this item
                jQuery(this).closest('.row').addClass('selected');
                jQuery(this).closest('.row').find('input').prop('checked', true);

                    // Child terms are hidden in menu -- selects them also automatically if parent is checked
                if (dhpPinboardView.useParent) {
                    jQuery('.active-legend .terms .row').find('*[data-parent="'+spanName+'"]').each(function( index ) {
                        jQuery( this ).closest('.row').find('input').prop('checked',true);
                    }); 
                }
            }
                //update pinboard
            dhpPinboardView.refreshMarkerLayer();
        });

            // Handle user selection of checkbox from current Legend
        jQuery('#legends div.terms input').click(function(event) {
            var checkAll = jQuery(this).closest('.row').hasClass('check-all');
            var boxState = jQuery(this).prop('checked');
            var spanName = jQuery(this).closest('.row').find('a').data('id');
                // "Hide/Show all" checkbox
            if (checkAll) {
                jQuery('.active-legend .terms .row').find('input').prop('checked',boxState);
            }
                // toggle individual terms
            else {
                jQuery('.active-legend .terms .check-all').find('input').prop('checked',false);
                
                    //child terms are now hidden in legend. This selects them if parent is checked
                if (dhpPinboardView.useParent) {
                    jQuery('.active-legend .terms .row').find('*[data-parent="'+spanName+'"]').each(function( index ) {
                        jQuery( this ).closest('.row').find('input').prop('checked',true);
                    });
                }
            }
            dhpPinboardView.refreshMarkerLayer();
        });

            // Handle selection of different Legends from navbar
        jQuery('.dhp-nav .legend-dropdown a').click(function(evt) {
            evt.preventDefault();
            dhpPinboardView.switchLegend(evt.target);
        });

            // Set defaults without calling switchfilter()
        dhpPinboardView.curLgdFilter = dhpPinboardView.filters[0];
        dhpPinboardView.curLgdName = dhpPinboardView.curLgdFilter.name;
    }, // createLegends()


        // RETURNS: true if touch is supported (and hence no mouse)
    isTouchDevice: function() {
        // var msTouchEnabled = window.navigator.msMaxTouchPoints;
        // var generalTouchEnabled = "ontouchstart" in document.createElement("div");

        // if (msTouchEnabled || generalTouchEnabled) {
        //     return true;
        // }
        // return false;
        return (('ontouchstart' in window) || (navigator.MaxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0));
    },

        // PURPOSE: Get markers associated with projectID via AJAX, insert into mLayer of map
    loadMarkers: function()
    {
    	jQuery.ajax({
            type: 'POST',
            url: dhpPinboardView.ajaxURL,
            data: {
                action: 'dhpGetMarkers',
                project: dhpPinboardView.projectID,
                index: dhpPinboardView.vizIndex
            },
            success: function(data, textStatus, XMLHttpRequest)
            {
                dhpPinboardView.createDataObjects(JSON.parse(data));
                    // Remove Loading modal
                dhpPinboardView.callBacks.remLoadingModal();
                jQuery('.reveal-modal-bg').remove();
            },
            error: function(XMLHttpRequest, textStatus, errorThrown)
            {
               alert(errorThrown);
            }
        });
    } // loadMarkers()

};
