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

        //                  legendTerms = terms array of Legend

        //                  iWidth, iHeight = pixel width and height of "palette"
        //                  padding
        //                  svg = svg div

        //                  radius = radius of geometric markers
        //                  iconSize = "s" | "m" | "l"
        //                  icons (Object with properties that are SNAP path defs)
        //                      ballon, magGlass, thumbtack

        //                  === D3 Objects ===
        //                  cluster = cluster layout
        //                  diagonal = diagonal projection (if used)

        //                  useParent = if true (always true!), actions on parent term affect child terms
        //                  isTouch = this is a touch-screen interface, not mouse
        //                  currentFeature = map feature currently highlighted or selected (with modal)
        //                  anyPopupsOpen = true when a popover modal is currently open

        // PURPOSE: Initialize new leaflet map, layers, and markers                         
        // INPUT:   ajaxURL      = URL to WP
        //          projectID    = ID of project
        //          treeEP       = settings for tree entry point (from project settings)
        //          callBacks    = set of callback functions back to dhp-project-page functions
    initialize: function(ajaxURL, projectID, vizIndex, treeEP, callBacks) {
             // Constants
        dhpTreeView.checkboxHeight  = 12; // default checkbox height
        dhpTreeView.minWidth        = 182; // 182px for horizontal + 260px for Legend key
        dhpTreeView.controlHeight   = 49;  // max(navButtonHeight[30], LegendHeight[45]) + 4

            // Save visualization data for later
        dhpTreeView.ajaxURL        = ajaxURL;
        dhpTreeView.projectID      = projectID;
        dhpTreeView.vizIndex       = vizIndex;
        dhpTreeView.treeEP         = treeEP;
        dhpTreeView.callBacks      = callBacks;

            // Expand to show/hide child terms and use their colors
        dhpTreeView.useParent = true;

        dhpTreeView.anyPopupsOpen = false;

            // ensure that EP parameters are integers, not strings
        dhpTreeView.iWidth  = typeof(treeEP.width)  === 'number' ? treeEP.width  : parseInt(treeEP.width);
        dhpTreeView.iHeight = typeof(treeEP.height) === 'number' ? treeEP.height : parseInt(treeEP.height);
        dhpTreeView.padding = typeof(treeEP.padding) === 'number' ? treeEP.padding  : parseInt(treeEP.padding);
        dhpTreeView.radius  = typeof(treeEP.radius) === 'number' ? treeEP.radius  : parseInt(treeEP.radius);
        dhpTreeView.fSize   = typeof(treeEP.fSize) === 'number' ? treeEP.fSize  : parseInt(treeEP.fSize);
            // set view/scroll window parameters

            // Add pinboard elements to nav bar
        // jQuery('.dhp-nav .top-bar-section .left').append(Handlebars.compile(jQuery("#dhp-script-tree-menus").html()));

            // Set total size of visualization space to background image plus navigation controls
        // jQuery("#dhp-visual").width(pinboardEP.width < dhpPinboardView.minWidth ?
        //                             dhpPinboardView.minWidth : pinboardEP.width+4);
        // jQuery("#dhp-visual").height(pinboardEP.height+dhpPinboardView.controlHeight);

            // Create control div for Legend Key
        jQuery("#dhp-visual").append('<div id="dhp-controls"></div>');

            // Create placeholder for Legend menu
        jQuery('#dhp-controls').append(Handlebars.compile(jQuery("#dhp-script-tree-legend-head").html()));

            // Create SVG for D3
        jQuery("#dhp-visual").append('<div id="svg-container"></div>');
        dhpTreeView.svg = d3.select("#svg-container").append("svg").attr("width", dhpTreeView.iWidth).attr("height", dhpTreeView.iHeight);

            // Other initialization will depend on form of tree
        switch (treeEP.form) {
        case 'flat':
            dhpTreeView.svg = dhpTreeView.svg.append("g").attr("transform", "translate("+treeEP.padding+",0)");

            dhpTreeView.cluster = d3.layout.cluster().size([dhpTreeView.iHeight, dhpTreeView.iWidth - (treeEP.padding*2)]);
            dhpTreeView.diagonal = d3.svg.diagonal().projection(function(d) { return [d.y, d.x]; });
            break;
        }

            // Make asynchronous call to load marker data in tree form
        jQuery.ajax({
            type: 'POST',
            url: ajaxURL,
            data: {
                action: 'dhpGetMarkerTree',
                project: projectID,
                index: vizIndex
            },
            success: function(data, textStatus, XMLHttpRequest)
            {
                dhpTreeView.rawData = JSON.parse(data);
                dhpTreeView.legendTerms = dhpTreeView.rawData[0];
                if (dhpTreeView.legendTerms.type !== 'filter') {
                    throw new Error('Data does not contain filter: '+dhpTreeView.rawData);
                }
                dhpTreeView.legendTerms = dhpTreeView.legendTerms.terms;

                dhpTreeView.createLegend();
                dhpTreeView.createGraph();
                dhpTreeView.callBacks.remLoadingModal();
            },
            error: function(XMLHttpRequest, textStatus, errorThrown)
            {
               alert(errorThrown);
            }
        });
    }, // initPinboard()


        // PURPOSE: Resizes pinboard-specific elements initially and when browser size changes
    dhpUpdateSize: function()
    {
        var newRowHeight, checkboxMargin;

            //resize legend term position for long titles
        // jQuery('.active-legend .terms').css({top: jQuery('.active-legend .legend-title').height() });

        //     //resize legend items that are two lines and center checkbox
        // jQuery('.active-legend .row').each(function(key,value) {
        //         //height of row containing text(could be multiple lines)
        //     newRowHeight   = jQuery('.columns', this).eq(1).height();
        //         // variable to center checkbox in row
        //     checkboxMargin = (newRowHeight - dhpTreeView.checkboxHeight) / 2;
        //         // set elements in rows with new values
        //     jQuery('.columns', this).eq(0).height(newRowHeight);
        //     jQuery('.columns', this).eq(0).find('input').css({'margin-top': checkboxMargin});
        // });

            // Width of svg-container is same as visual space
        jQuery('#svg-container').width(jQuery('#dhp-visual').width()-2);
            // Height of svg-container will be total viz space minus height of navbar, margins, border & scroll bar itself
        var svgHeight = jQuery('#dhp-visual').height() - (dhpTreeView.controlHeight+40);
        jQuery('#svg-container').height(svgHeight);
    }, // dhpUpdateSize()


    createLegend: function() {
        var legendData = dhpTreeView.legendTerms;

            // Create Legend for colors (if colors exist)
            //   This code modified from dhp-maps-view
        if (legendData.length > 1) {
            var legendName = dhpTreeView.treeEP.color;
            var legendHtml;

                // "Root" DIV for the Legend
            legendHtml = jQuery('<div class="legend-div"><div class="legend-title">'+legendName+'</div><div class="terms"></div></div>');
                // Create entries for all of the 1st-level terms (do not represent children of terms)
            _.each(legendData, function(theTerm) {
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
                            '<div class="small-2 large-1 columns splash" style="background:'+theTerm.icon_url+'"></div>'+
                            '<div class="small-10 large-11 columns"><a class="value" data-id="'+
                            theTerm.id+'" data-parent="'+theTerm.parent+'">'+theTerm.name+'</a></div></div>');
                        break;
                    default:
                        throw new Error('Visual feature not supported for Trees: '+theTerm.icon_url);
                    }
                }
            });

            jQuery('#legends').append(legendHtml);

                // Handle resizing Legend (min/max)
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

                // Add legend hide/show action
            jQuery('.legend-resize').on('click', function(){
                if(jQuery('#legends').hasClass('mini')) {
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

        } // if legendData
    }, // createLegend()



        // PURPOSE: To determine color to use for marker
        // INPUT:   featureVals = array of category IDs (integers) associated with a feature/marker
        // RETURNS: Partial string to set color and background color (w/o closing ")
        // NOTES:   Will use first match on color to use for icon, or else default color
        // ASSUMES: colorValues has been loaded
        // SIDEFX:  Caches textColor in text field of Legend, which builds first time encountered
    getItemColor: function(featureVals)
    {
        var countTerms = dhpTreeView.legendTerms.length; 
        var countCats = featureVals.length;
        var thisCat, thisCatID;
        var thisMarkerID;
        var catChildren;
        var i,j,k;

            // If no color motes or if marker has no category values, return default
        if (countTerms==0 || countCats==0) {
            return '#eecc88';
        }

        for(i=0;i<countTerms;i++) {         // for all category values
            thisCat = dhpTreeView.legendTerms[i];
            thisCatID = thisCat.id;

            for(j=0; j<countCats; j++) {      // for all marker values
                // legend categories
                thisMarkerID = featureVals[j];
                    // have we matched this element?
                if (thisCatID===thisMarkerID) {
                    return thisCat.icon_url;
                    // check for matches on its children
                } else {
                    if (thisCat.children) {
                        catChildren = thisCat.children;
                        for (k=0; k<catChildren.length; k++) {
                            if (catChildren[k].term_id==thisMarkerID) {
                                return thisCat.icon_url;
                            }
                        }
                    }
                }
           }
        }
    }, // getItemColor()


        // PURPOSE: Create visualization with results of data fetch
        // ASSUMES: rawdata = results of data call, as JSON object
        //              array [0..n-1] = Legends
        //                    [n] = Feature Tree
    createGraph: function()
    {
        var tree = dhpTreeView.rawData[dhpTreeView.rawData.length-1];

        var xStart = dhpTreeView.treeEP.padding;

            // The cluser algorithms will create placement in x and y fields
        var nodes = dhpTreeView.cluster.nodes(tree),
            links = dhpTreeView.cluster.links(nodes);

            // Create branches ("links") between markers ("nodes")
        var link = dhpTreeView.svg.selectAll(".link").data(links)
                    .enter().append("path")
                    .attr("class", "link")
                    .attr("d", dhpTreeView.diagonal);

            // Create the markers ("nodes") themselves
        var node = dhpTreeView.svg.selectAll(".node").data(nodes)
                    .enter().append("g")
                    .attr("class", "node")
                    .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })
                    .on("click", function(d, index) {
                        console.log("Selected node name "+d.name+" which is index "+index);
                    });

        node.append("circle")
              .attr("r", dhpTreeView.radius)
              .style("fill", function(d, index) {
                  return dhpTreeView.getItemColor(d.properties.categories);
              });

        node.append("text")
              .attr("dx", function(d) { return d.children ? -8 : 8; })
              .attr("dy", 3)
              .style("font-size", dhpTreeView.fSize+'px')
              .style("text-anchor", function(d) { return d.children ? "end" : "start"; })
              .text(function(d) { return d.name; });

    } // createData()
}
