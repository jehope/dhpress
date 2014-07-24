// DH Press Trees View
// ASSUMES: Visualization area is marked with HTML div as "dhp-visual"
// NOTES:   Format of Marker and Legend data is documented in dhp-project-functions.php
//          The class active-legend is added to whichever legend is currently visible and selected

// USES:    JavaScript libraries jQuery, Underscore, D3


var dhpTreeView = {

        // Contains fields: ajaxURL, projectID, treeEP, viewParams, vizIndex
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

        //                  loadedLayers = Snap group element for loaded SVG overlay layers
        //                  layerBtnsOn = TRUE if the layer buttons are currently showing on Legend menu

        // PURPOSE: Initialize new leaflet map, layers, and markers                         
        // INPUT:   ajaxURL      = URL to WP
        //          projectID    = ID of project
        //          treeEP       = settings for tree entry point (from project settings)
        //          callBacks    = set of callback functions back to dhp-project-page functions
    initialize: function(ajaxURL, projectID, vizIndex, treeEP, viewParams, callBacks) {
             // Constants
        dhpTreeView.checkboxHeight  = 12; // default checkbox height
        dhpTreeView.minWidth        = 182; // 182px for horizontal + 260px for Legend key
        dhpTreeView.controlHeight   = 49;  // max(navButtonHeight[30], LegendHeight[45]) + 4

            // Save visualization data for later
        dhpTreeView.ajaxURL        = ajaxURL;
        dhpTreeView.projectID      = projectID;
        dhpTreeView.vizIndex       = vizIndex;
        dhpTreeView.pinboardEP     = pinboardEP;
        dhpTreeView.viewParams     = viewParams;
        dhpTreeView.callBacks      = callBacks;

            // Expand to show/hide child terms and use their colors
        dhpTreeView.useParent = true;
        dhpTreeView.layerBtnsOn = false;

        dhpTreeView.anyPopupsOpen = false;

            // ensure that EP parameters are integers, not strings
        dhpTreeView.iWidth  = typeof(treeEP.width)  === 'number' ? treeEP.width  : parseInt(treeEP.width);
        dhpTreeView.iHeight = typeof(treeEP.height) === 'number' ? treeEP.height : parseInt(treeEP.height);

            // set view/scroll window parameters

            // Add pinboard elements to nav bar
        jQuery('.dhp-nav .top-bar-section .left').append(Handlebars.compile(jQuery("#dhp-script-tree-menus").html()));

            // Set total size of visualization space to background image plus navigation controls
        // jQuery("#dhp-visual").width(pinboardEP.width < dhpPinboardView.minWidth ?
        //                             dhpPinboardView.minWidth : pinboardEP.width+4);
        // jQuery("#dhp-visual").height(pinboardEP.height+dhpPinboardView.controlHeight);

            // Create control div for Legend and image navigation buttons
        jQuery("#dhp-visual").append('<div id="dhp-controls"></div>');

            // Create placeholder for Legend menu
        jQuery('#dhp-controls').append(Handlebars.compile(jQuery("#dhp-script-tree-legend-head").html()));

            // Initialize Snap and create "paper" palette
        dhpTreeView.svgRoot = document.createElementNS("http://www.w3.org/2000/svg", "svg");

        jQuery(dhpTreeView.svgRoot).width(dhpTreeView.iWidth+2).height(dhpTreeView.iHeight+2);
        // jQuery(dhpPinboardView.svgRoot).css({"border": "1px solid red" });

            // Create container for SVG and insert the "paper"
        jQuery("#dhp-visual").append('<div id="svg-container"></div>');
        jQuery("#svg-container").append(dhpTreeView.svgRoot);
        dhpTreeView.paper = Snap(dhpTreeView.svgRoot);

        dhpTreeView.loadMarkers();
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
            checkboxMargin = (newRowHeight - dhpTreeView.checkboxHeight) / 2;
                // set elements in rows with new values
            jQuery('.columns', this).eq(0).height(newRowHeight);
            jQuery('.columns', this).eq(0).find('input').css({'margin-top': checkboxMargin});
        });

            // Width of svg-container is same as visual space
        jQuery('#svg-container').width(jQuery('#dhp-visual').width()-2);
            // Height of svg-container will be total viz space minus height of navbar, margins, border & scroll bar itself
        var svgHeight = jQuery('#dhp-visual').height() - (dhpTreeView.controlHeight+40);
        jQuery('#svg-container').height(svgHeight);
    }, // dhpUpdateSize()

}
