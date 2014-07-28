// DH Press Trees View
// ASSUMES: Visualization area is marked with HTML div as "dhp-visual"
// NOTES:   Format of Marker and Legend data is documented in dhp-project-functions.php
//          The class active-legend is added to whichever legend is currently visible and selected

// USES:    JavaScript libraries jQuery, Underscore, D3

var dhpTreeView = {

        // Contains fields: ajaxURL, projectID, treeEP, viewParams, vizIndex
        //                  callBacks = object containing callback functions to dhp-project-page

        //					rawAjaxData = raw data returned from AJAX
        //                  legendTerms = terms array of Legend

        //                  iWidth, iHeight = pixel width and height of "palette"
        //                  padding = padding in pixels -- tree-specific
        //                      flat: the space given to labels of first and last nodes

        //                  mRadius = radius of geometric markers
        //                  iconSize = "s" | "m" | "l"
        //                  icons (Object with properties that are SNAP path defs)
        //                      ballon, magGlass, thumbtack

        //                  tRadius = radius of radial tree
        //                  m0 = original mouse click coordinate (rotating radial tree)
        //                  rotate = degree to which radial tree currently rotated

        //                  === D3 Objects ===
        //                  svg = the D3 object for the SVG div
        //                  vis = the D3 object which takes the shapes
        //                  tree = D3 layout for flat and radial trees
        //                  partition = D3 layout for segment wheel
        //                  diagonal = diagonal projection (if used)
        //                  xScale, yScale = scales for segment wheel
        //                  arc = function that creates segment arcs

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
        dhpTreeView.mRadius = typeof(treeEP.radius) === 'number' ? treeEP.radius  : parseInt(treeEP.radius);
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

        jQuery(document).foundation();

            // Create SVG for D3
        jQuery("#dhp-visual").append('<div id="svg-container"></div>');
        dhpTreeView.svg = d3.select("#svg-container").append("svg").attr("width", dhpTreeView.iWidth).attr("height", dhpTreeView.iHeight);

            // Other initialization will depend on form of tree
        switch (treeEP.form) {
        case 'flat':
            dhpTreeView.vis = dhpTreeView.svg.append("g")
                .style("font-size", dhpTreeView.fSize+'px')
                .attr("transform", "translate("+treeEP.padding+",0)");

            dhpTreeView.tree = d3.layout.cluster().size([dhpTreeView.iHeight, dhpTreeView.iWidth - (treeEP.padding*2)]);
            dhpTreeView.diagonal = d3.svg.diagonal().projection(function(d) { return [d.y, d.x]; });
            break;

        case 'radial':
            dhpTreeView.tRadius = Math.min(dhpTreeView.iWidth, dhpTreeView.iHeight) / 2;
            dhpTreeView.m0 = null;
            dhpTreeView.rotate = 0;

                // Size here is in a radial coordinate system
                // Leave a pixel padding around outside arc
            dhpTreeView.tree = d3.layout.tree().size([360, dhpTreeView.tRadius - (dhpTreeView.padding + 2)])
                    // set the spacing function between neighboring nodes
                .separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });

                // Generator of coordinates based on "diagonal" space
                // X is the angle and Y is the position along radius
            dhpTreeView.diagonal = d3.svg.diagonal.radial()
                .projection(function(d) { return [d.y, d.x / 180 * Math.PI]; });

            dhpTreeView.vis = dhpTreeView.svg.append("g")
                .style("font-size", dhpTreeView.fSize+'px')
                .attr("transform", "translate(" + (dhpTreeView.tRadius+1)
                                    + "," + (dhpTreeView.tRadius+1) + ")");

                // Create the outer rotate wheel
            dhpTreeView.vis.append("path")
                .attr("class", "arc")
                .attr("d", d3.svg.arc().innerRadius(dhpTreeView.tRadius - dhpTreeView.padding).outerRadius(dhpTreeView.tRadius).startAngle(0).endAngle(2 * Math.PI))
                .on("mousedown.spin", dhpTreeView.mDownSpin)
                .on("mousemove.spin", dhpTreeView.mMoveSpin)
                .on("mouseup.spin", dhpTreeView.mUpSpin);
            break;

        case 'segment':
            dhpTreeView.tRadius = Math.min(dhpTreeView.iWidth, dhpTreeView.iHeight) / 2;
            dhpTreeView.xScale = d3.scale.linear().range([0, 2 * Math.PI]);
            dhpTreeView.yScale = d3.scale.linear().range([0, dhpTreeView.tRadius]);

            dhpTreeView.vis = dhpTreeView.svg.append("g")
                .style("font-size", dhpTreeView.fSize+'px')
                .attr("transform", "translate(" + (dhpTreeView.tRadius+1)
                                    + "," + (dhpTreeView.tRadius+1) + ")");

                // All partitions of equal size
            dhpTreeView.partition = d3.layout.partition().value(function(d) { return 1; } );

            dhpTreeView.arc = d3.svg.arc()
                .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, dhpTreeView.xScale(d.x))); })
                .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, dhpTreeView.xScale(d.x + d.dx))); })
                .innerRadius(function(d) { return Math.max(0, dhpTreeView.yScale(d.y)); })
                .outerRadius(function(d) { return Math.max(0, dhpTreeView.yScale(d.y + d.dy)); });
            break;
        } // switch()

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
                    // Prepare the data for use
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
        var svgHeight = jQuery('#dhp-visual').height() - (dhpTreeView.controlHeight+10);
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


        // PURPOSE: To compute the brightness value of the background
        // INPUT:   rgb = a string in hex format (#xxxxxx)
        // http://www.w3.org/WAI/ER/WD-AERT/#color-contrast
    brightness: function(rgb) {
      return rgb.r * .299 + rgb.g * .587 + rgb.b * .114;
    }, // brightness()


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
        var nodeData = dhpTreeView.rawData[dhpTreeView.rawData.length-1];
        var padding = dhpTreeView.treeEP.padding;
        var nodes, links, link, node;
        var paths, labels, aLabel;

        switch (dhpTreeView.treeEP.form) {
        case 'flat': 
                // The cluser algorithms will create placement in x and y fields
            nodes = dhpTreeView.tree.nodes(nodeData);
            links = dhpTreeView.tree.links(nodes);

                // Create branches ("links") between markers ("nodes")
            link = dhpTreeView.vis.selectAll(".link").data(links)
                        .enter().append("path")
                        .attr("class", "link")
                        .attr("d", dhpTreeView.diagonal);

                // Create the markers ("nodes") themselves
            node = dhpTreeView.vis.selectAll(".node").data(nodes)
                        .enter().append("g")
                        .attr("class", "node")
                        .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })
                        .on("click", function(d) {
                            dhpTreeView.callBacks.showMarkerModal(d);
                            // console.log("Selected node name "+d.name+" which is index "+index);
                        });

            node.append("circle")
                  .attr("r", dhpTreeView.mRadius)
                  .style("fill", function(d) {
                      return dhpTreeView.getItemColor(d.properties.categories);
                  });

            node.append("text")
                  .attr("dx", function(d) { return d.children ? -8 : 8; })
                  .attr("dy", 3)
                  // .style("font-size", dhpTreeView.fSize+'px')
                  .style("text-anchor", function(d) { return d.children ? "end" : "start"; })
                  .text(function(d) { return d.name; });
            break;

        case 'radial':
            nodes = dhpTreeView.tree.nodes(nodeData);
            links = dhpTreeView.tree.links(nodes);

              // Create all of the link paths (using diagonal projection)
            link = dhpTreeView.vis.selectAll(".link")
                    .data(links)
                    .enter().append("path")
                    .attr("class", "link")
                    .attr("d", dhpTreeView.diagonal);

              // Create all of the g-elements that contain node svg-elements
            node = dhpTreeView.vis.selectAll(".node")
                .data(nodes)
                .enter()
                .append("g")
                .attr("class", "node")
                .attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")"; })
                .on("click", function(d) {
                    dhpTreeView.callBacks.showMarkerModal(d);
                });

                // Create the actual circle element
            node.append("circle")
                .attr("r", dhpTreeView.mRadius)
                    // In actuality, will need to access property of d
                .style("fill", function(d) {
                    return dhpTreeView.getItemColor(d.properties.categories);
                })
                // Create the text label for the node
            node.append("text")
                // .style( "font-size", dhpTreeView.fSize+'px')
                    // 1/3 character size between anchor point (of g) and text
                .attr("dy", ".31em")
                    // Whether the end or beginning of the label is next to the node depends on the angle
                .attr("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
                    // May also need to turn text upside down
                .attr("transform", function(d) { return d.x < 180 ? "translate(8)" : "rotate(180)translate(-8)"; })
                .text(function(d) { return d.name; });
            break;

        case 'segment':
            paths = dhpTreeView.vis.selectAll("path")
                .data(dhpTreeView.partition.nodes(nodeData))
                .enter().append("path")
                .attr("d", dhpTreeView.arc)
                .style("fill", function(d) {
                  return dhpTreeView.getItemColor(d.properties.categories);
                })
                .on("click", function(d) {
                    dhpTreeView.callBacks.showMarkerModal(d);
                } );

            labels = dhpTreeView.vis.selectAll(".label")
                .data(dhpTreeView.partition.nodes(nodeData));

            aLabel = labels.enter().append("text")
                .attr("class", "label")
                .on("click", function(d) {
                    dhpTreeView.callBacks.showMarkerModal(d);
                } )
                // .style("font-size", dhpTreeView.fSize+'px')
                .style("fill", function(d) {
                  return dhpTreeView.brightness(d3.rgb(dhpTreeView.getItemColor(d.properties.categories))) < 125 ? "#eee" : "#000";
                })
                    // Does the text point belong on the left or right side?
                .attr("text-anchor", function(d) {
                  if (d.depth) {
                      return dhpTreeView.xScale(d.x + d.dx / 2) > Math.PI ? "end" : "start";
                  } else {
                      return "middle";
                  }
                })
                .attr("dy", ".2em")
                .attr("transform", function(d) {
                      if (d.depth) {
                          var multiline = (d.name || "").split(" ").length > 1,
                              angle = dhpTreeView.xScale(d.x + d.dx / 2) * 180 / Math.PI - 90,
                              rotate = angle + (multiline ? -.5 : 0);
                          return "rotate(" + rotate + ")translate(" + (dhpTreeView.yScale(d.y) + dhpTreeView.padding) +
                                ")rotate(" + (angle > 90 ? -180 : 0) + ")"; 
                      } else {
                          // return "translate(-"+topNodeLOffset+",-"+topNodeTOffset+")";
                          return "";
                      }
                }) // .text(function(d) { return d.name; })
                ;

                // Enable up to three word segments in label
            aLabel.append("tspan")
                .attr("x", 0)
                .text(function(d) { return d.name.split(" ")[0]; });
            aLabel.append("tspan")
                .attr("x", 0)
                .attr("dy", "1em")
                .text(function(d) { return d.name.split(" ")[1]; });
            aLabel.append("tspan")
                .attr("x", 0)
                .attr("dy", "1em")
                .text(function(d) { return d.name.split(" ")[2]; });
            break;
        } // switch(tree form)
    }, // createData()


// MOUSE CONTROL CODE ==========================

    mTrans: function(e) {
      return [e.pageX - dhpTreeView.tRadius, e.pageY - dhpTreeView.tRadius];
    }, // transMouse()

    mDownSpin: function() {
      dhpTreeView.m0 = dhpTreeView.mTrans(d3.event);
      d3.event.preventDefault();
    }, // mDownSpin()

    mMoveSpin: function() {
      if (dhpTreeView.m0) {
        var m1 = dhpTreeView.mTrans(d3.event),
            dm = Math.atan2(dhpTreeView.mCross(dhpTreeView.m0, m1), dhpTreeView.mDot(dhpTreeView.m0, m1)) * 180 / Math.PI,
            tx = "rotate3d(0,0,0," + dm + "deg)";
            // tx = "translate3d(0," + (ry - rx) + "px,0)rotate3d(0,0,0," + dm + "deg)translate3d(0," + (rx - ry) + "px,0)";
        dhpTreeView.svg
            .style("-moz-transform", tx)
            .style("-ms-transform", tx)
            .style("-webkit-transform", tx);
      }
    }, // mMoveSpin()

    mUpSpin: function() {
      if (dhpTreeView.m0) {
        var m1 = dhpTreeView.mTrans(d3.event),
            dm = Math.atan2(dhpTreeView.mCross(dhpTreeView.m0, m1), dhpTreeView.mDot(dhpTreeView.m0, m1)) * 180 / Math.PI,
            tx = "rotate3d(0,0,0,0deg)";

        dhpTreeView.rotate += dm;
        if (dhpTreeView.rotate > 360) { dhpTreeView.rotate -= 360; }
        else if (dhpTreeView.rotate < 0) { dhpTreeView.rotate += 360; }
        dhpTreeView.m0 = null;

        dhpTreeView.svg
            .style("-moz-transform", tx)
            .style("-ms-transform", tx)
            .style("-webkit-transform", tx);

        dhpTreeView.vis
            .attr("transform", "translate(" + dhpTreeView.tRadius + "," + dhpTreeView.tRadius +
                    ")rotate(" + dhpTreeView.rotate + ")")
            // .attr("transform", "translate(" + rx + "," + ry + ")rotate(" + rotate + ")")
          .selectAll("g.node text")
            .attr("dx", function(d) { return (d.x + dhpTreeView.rotate) % 360 < 180 ? 8 : -8; })
            .attr("text-anchor", function(d) { return (d.x + dhpTreeView.rotate) % 360 < 180 ? "start" : "end"; })
            .attr("transform", function(d) { return (d.x + dhpTreeView.rotate) % 360 < 180 ? null : "rotate(180)"; });
      }
    }, // mUpSpin()

    mCross: function(a, b) {
      return a[0] * b[1] - a[1] * b[0];
    }, // mCross()

    mDot: function(a, b) {
      return a[0] * b[0] + a[1] * b[1];
    } // mDot()

} //  dhpTreeView
