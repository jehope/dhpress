// DH Press Pinboard View
// ASSUMES: Visualization area is marked with HTML div as "dhp-visual"
// NOTES:   Format of Marker and Legend data (GeoJSON) is documented in dhp-project-functions.php
//          The class active-legend is added to whichever legend is currently visible and selected

// USES:    JavaScript libraries jQuery, Underscore, Snap svg


var dhpPinboardView = {

        // Contains fields: ajaxURL, projectID, mapEP, viewParams, vizIndex
        //                  callBacks = object containing callback functions to dhp-project-page

        //					rawAjaxData = raw data returned from AJAX
        //					allMarkers = All marker posts assoc. w/ Project; see data desc in createMarkerArray() of dhp-project-functions.php

        //                  currentLegend = name of current legend/filter mote
        //                  catFilter = All values for currently selected Legend; see data desc in getIconsForTerms() of dhp-project-functions.php
        //                  catFilterSelect = Current selection of legend/categories; Subset of catFilter.terms

        //                  radius = radius of geometric markers
        //                  iconSize = "s" | "m" | "l"

        //                  viewL, viewT, viewW, viewH = current viewport into background image
        //                  viewScale = current zoom scale % (100=fullsize)
        //                  zoomStep = % of zoom or reduce for each step

        //                  useParent = if true (always true!), actions on parent term affect child terms
        //                  isTouch = this is a touch-screen interface, not mouse
        //                  currentFeature = map feature currently highlighted or selected (with modal)
        //                  anyPopupsOpen = true when a popover modal is currently open

        // PURPOSE: Initialize new leaflet map, layers, and markers                         
        // INPUT:   ajaxURL      = URL to WP
        //          projectID    = ID of project
        //          mapEP        = settings for map entry point (from project settings)
        //          viewParams   = array of data about map layers (see dhpGetMapLayerData() in dhp-project-functions)
        //          callBacks    = set of callback functions back to dhp-project-page functions
    initPinboard: function(ajaxURL, projectID, vizIndex, pinboardEP, viewParams, callBacks) {
             // Constants
        dhpPinboardView.checkboxHeight  = 12; // default checkbox height
        dhpPinboardView.navButtonsW     = 182;
        dhpPinboardView.navButtonsH     = 30;

            // Save visualization data for later
        dhpPinboardView.ajaxURL        = ajaxURL;
        dhpPinboardView.projectID      = projectID;
        dhpPinboardView.vizIndex       = vizIndex;
        dhpPinboardView.pinboardEP     = pinboardEP;
        dhpPinboardView.viewParams     = viewParams;
        dhpPinboardView.callBacks      = callBacks;

        dhpPinboardView.isTouch        = dhpPinboardView.isTouchDevice();

        dhpPinboardView.iconSize       = pinboardEP.size;
        switch (pinboardEP.size) {
        case "s":
            dhpPinboardView.radius     = 4;
            break;
        case "m":
            dhpPinboardView.radius     = 8;
            break;
        case "l":
            dhpPinboardView.radius     = 12;
            break;
        }
            // Expand to show/hide child terms and use their colors
        dhpPinboardView.useParent = true;

        dhpPinboardView.anyPopupsOpen = false;

            // set view/scroll window parameters

            // viewBox coordinates -- start out 1-1 actual pixel view
        dhpPinboardView.viewL=0;
        dhpPinboardView.viewT=0;
        dhpPinboardView.viewW=pinboardEP.width;
        dhpPinboardView.viewH=pinboardEP.height;
        dhpPinboardView.viewScale=100;
        dhpPinboardView.zoomStep=10;

            // Add pinboard elements to nav bar
        jQuery('.dhp-nav .top-bar-section .left').append(Handlebars.compile(jQuery("#dhp-script-pin-menus").html()));

            // Set size of visualization space to background image plus navigation controls
        jQuery("#dhp-visual").width(pinboardEP.width <= dhpPinboardView.navButtonsW ?
                                    dhpPinboardView.navButtonsW : pinboardEP.width+4);
        jQuery("#dhp-visual").height(pinboardEP.height+dhpPinboardView.navButtonsH);

            // Create buttons for navigating & zooming background image
        jQuery("#dhp-visual").append('<div id="dhp-controls"></div>');
        jQuery("#dhp-controls").append('<ul><li class="refresh"></li><li class="zoom"></li><li class="reduce"></li><li class="left"></li><li class="right"></li><li class="up"></li><li class="down"></li></ul>');

            // Create placeholder for Legend menu
        jQuery('#dhp-visual').append(Handlebars.compile(jQuery("#dhp-script-pin-legend-head").html()));

            // Create view for background image
        jQuery('#dhp-visual').append('<div id="dhpMap"></div>');

        dhpPinboardView.loadMarkers();
    }, // initPinboard()


        // PURPOSE: Create marker objects for pinboard visualization; called by loadMapMarkers()
        // INPUT:   geoData = all AJAX data as JSON object: Array of ["type", ...]
        // SIDE-FX: assigns variables allMarkers, catFilter, rawAjaxData
    createDataObjects: function(geoData) 
    {
        dhpPinboardView.rawAjaxData = geoData;

        var legends = [];

            // Assign data to appropriate objects
        _.each(dhpPinboardView.rawAjaxData, function(dataSet) {
            switch(dataSet.type) {
            case 'filter':
                legends.push(dhpPinboardView.formatTerms(dataSet));
                break;
            case 'FeatureCollection':
                dhpPinboardView.allMarkers = dataSet;
                break;
            }
        });

            // First legend will be selected by default
        dhpPinboardView.createLegends(legends);
        dhpPinboardView.createMarkerLayer();
        dhpPinboardView.buildLayerControls();   
    }, // createDataObjects()


        // PURPOSE: Called by createDataObjects() to take nested array(s) of terms and convert to flat array
        //              of items with fields: id, parent, name, icon_url
        // NOTES:   In array returned by php, parent markers have <id> field but children have <term_id>
        // TO DO:   This looks very inefficient -- redo
        // RETURNS: Object with 2 properties: terms and all
    formatTerms: function(oldTerms)
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

            // use array of just IDs for speedy intersection checks
        _.each(newTerms.terms, function(theTerm) {
            allTerms.push(theTerm.id);
        });
        newTerms.all = allTerms;

        return newTerms;
    }, // formatTerms()


        // PURPOSE: Creates and draws marker layer on map
        //          Called whenever the terms are filtered (inc initial display)
    createMarkerLayer: function() {
    }, // createMarkerLayer()


        // PURPOSE: Determine what color to use for marker
        // INPUT:   cats = the array of legend categories for this marker
        // TO DO:   Make more efficient: goes through 2 to 3 exhaustive searches for each marker
    getActiveTermColor: function(cats) {
        var returnColor;
            // Find which of this item's legend values match current legend selection
        var matchID = _.intersection(dhpPinboardView.catFilterSelect, cats);
            // For motes with multiple values, we will need to arbitrarily select first match
        if (_.isArray(matchID)) {
            matchID = matchID[0];
        }

            // Now, look through the current legend values for which matches first overlap
            // TO DO: Make this more efficient: the search is done (exhaustively) twice here!
        var term = _.find(dhpPinboardView.catFilter.terms, function(item) {
            return (item.id == matchID);
        });

            // Does this term have a parent? Get color from parent
        if (term.parent && dhpPinboardView.useParent) {
                // Search through filter for parent's term entry
                // NOTE: Further inefficiency: 3rd exhaustive search!!
            var parentTerm = _.find(dhpPinboardView.catFilter.terms, function(parent) {
                return (parent.id == term.parent);
            });
            returnColor = parentTerm['icon_url'];

            // No parent, get this icon's color
        } else {
            dhpPinboardView.parentIcon = term['icon_url'];
            returnColor = term['icon_url'];
        }

        return returnColor;
    }, // getActiveTermColor()


        // PURPOSE: Create the Leaflet feature associated with this entry
    pointToLayer: function(feature, latlng) {
        var fColor = dhpPinboardView.getActiveTermColor(feature.properties.categories);
        var fType = fColor.substring(0,1);
        switch (fType) {
        case '#':
            return L.circleMarker(latlng, {
                radius: dhpPinboardView.radius,
                fillColor: fColor,
                color: "#000",
                weight: 1,
                opacity: 1,
                fillOpacity: dhpPinboardView.checkOpacity
            });
        case '.':
                // See if maki-icon has already been created and if not create it
            var iName = fColor.substring(1);
            var mIcon = dhpPinboardView.makiIcons[iName];
            if (mIcon == undefined || mIcon == null) {
                mIcon = L.MakiMarkers.icon({
                    icon: iName,
                    color: "#12a",
                    size: dhpPinboardView.makiSize
                });
                dhpPinboardView.makiIcons[iName] = mIcon;
            }
            return L.marker(latlng, { icon: mIcon, riseOnHover: true });
        default:
            throw new Error("Unsupported feature type: "+fColor);
        }
    }, // pointToLayer()

        // PURPOSE: Bind controls for each Marker
    onEachFeature: function(feature, layer)
    {
            // Hover popup only for touchscreen
        if (dhpPinboardView.isTouch) {
            layer.bindPopup('<div><h1>'+feature.properties.title+
                '</h1><a class="button success" onclick="javascript:dhpPinboardView.onFeatureSelect()">More</a></div>',
                {offset: L.Point(0, -10)});

                // Click is automatically handled by Leaflet popup
            layer.on({
                mouseover: dhpPinboardView.hoverFeature,
                mouseout: dhpPinboardView.resetHighlight
            });
        } else {
            layer.on({
                click: dhpPinboardView.clickFeature
            });
        }
    }, // onEachFeature()

        // PURPOSE: Determine which markers to display based on selected array
        // RETURNS: true or false, depending on if its id is in selected array
    filterMapMarkers: function(feature)
    {
        return (_.intersection(feature.properties.categories, dhpPinboardView.catFilterSelect).length >= 1);
    }, // filterMapMarkers()

        // PURPOSE: Handle visual impact of change of Legend selection: selecting entirely (new Legend or selection )
    refreshMarkerLayer: function() {
        dhpPinboardView.findSelectedCats();
        dhpPinboardView.control.removeLayer(dhpPinboardView.markerLayer);
        dhpPinboardView.mapLeaflet.removeLayer(dhpPinboardView.markerLayer);
            // since createMarkerLayer() is going to create new marker layer, need to remove from layer array
        dhpPinboardView.mapLayers.pop();
        dhpPinboardView.createMarkerLayer();
    }, // refreshMarkerLayer()

        // PURPOSE: Handle user selection of legend in navbar menu
        // INPUT:   target = element selected by user
    switchLegend: function(target)
    {
            // Unhighlight the layers button in nav bar
        jQuery('#layers-button').parent().removeClass('active');

        var newLegend = jQuery(target).text();

            // If sliders are showing, then might just need to adjust Legend display, not recalculate
        if (dhpPinboardView.slidersShowing || newLegend !== dhpPinboardView.currentLegend) {
            dhpPinboardView.slidersShowing = false;

                // Don't display current (or any) Legend
            jQuery('.legend-div').hide();
            jQuery('.legend-div').removeClass('active-legend');

                // Display selected legend (whose ID was stored in href)
            var action = jQuery(target).attr('href');
            jQuery(action).addClass('active-legend');
            jQuery(action).show();

            if (newLegend !== dhpPinboardView.currentLegend) {
                    // Update the markers to show on map
                dhpPinboardView.switchFilter(newLegend);
                dhpPinboardView.dhpUpdateSize();

                    // Change active menu item
                jQuery('.legend-dropdown > .active').removeClass('active');
                jQuery(target).parent().addClass('active');

                dhpPinboardView.currentLegend = newLegend;
            }
        }
    },  // switchLegend()

        // PURPOSE: Handle user selecting new legend category
        // INPUT:   filterName = name of legend/category selected
        // ASSUMES: rawAjaxData has been assigned, selectControl has been initialized
        // SIDE-FX: Changes catFilter
    switchFilter: function(filterName)
    {
        var filterObj = _.where(dhpPinboardView.rawAjaxData, {type: "filter", name: filterName});
        dhpPinboardView.catFilter = filterObj[0];
        dhpPinboardView.refreshMarkerLayer();
    },  // switchFilter()

        // PURPOSE: Handle user selection of a legend value, so that only markers with that value shown
        // INPUT:   singleID = ID of the Legend value to select
        // RETURNS: Array of term objects from catFilter that match current UI selection based on ID
        // ASSUMES: catFilter is null or contains lists of terms for current Legend/Filter
    findSelectedCats: function(singleID)
    {
        var selCatFilter = [];
        var countTerms = 0;
        var i, tempSelCat, tempFilter;

        if (dhpPinboardView.catFilter) {
            countTerms = Object.keys(dhpPinboardView.catFilter.terms).length;
        }

        if (singleID) {
            for (i=0;i<countTerms;i++) {
                tempFilter = dhpPinboardView.catFilter.terms[i];
                if(tempFilter.id==singleID) {
                    selCatFilter[0] = tempFilter.id;
                    break;
                }
            }
            // unknown, or multiple selection from legend
        } else {
            jQuery('#legends .active-legend .compare input:checked').each(function(index) {
                tempSelCat = jQuery(this).closest('.row').find('.columns .value').data( 'id' );
                for(i=0;i<countTerms;i++) {
                    tempFilter = dhpPinboardView.catFilter.terms[i];
                    if(tempFilter.id==tempSelCat) {
                        selCatFilter[index] = tempFilter.id;
                    }
                }
            });
        }
        dhpPinboardView.catFilterSelect = selCatFilter;
    }, // findSelectedCats()

        // PURPOSE: Create HTML for all of the legends for this visualization
        // INPUT:   legendList = array of legends to display; each element has field "name" and array "terms" of [id, name, icon_url ]
    createLegends: function(legendList) 
    {
        var legendHtml;
        var legendHeight;

            // Build Legend controls on the right (category toggles) for each legend value and insert Legend name into dropdown above
        _.each(legendList, function(theLegend, legIndex) {
            var filterTerms = theLegend.terms;
            var legendName = theLegend.name;

                // "Root" DIV for this particular Legend
            legendHtml = jQuery('<div class="'+legendName+' legend-div" id="term-legend-'+legIndex+
                            '"><div class="legend-title">'+legendName+'</div><div class="terms"></div></div>');
                // Create entries for all of the 1st-level terms (do not represent children of terms)
            _.each(filterTerms, function(theTerm) {
                if (legendName !== theTerm.name) {
                    var hasParentClass = '';
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
            jQuery('.terms',legendHtml).prepend(Handlebars.compile(jQuery("#dhp-script-map-legend-hideshow").html()));

            jQuery('#legends .legend-row').append(legendHtml);
                // Add Legend title to dropdown menu in navbar -- make 1st Legend active by default
            var active = (legIndex == 0) ? ' class="active"' : '';
            jQuery('.dhp-nav .legend-dropdown').append('<li'+active+'><a href="#term-legend-'+legIndex+'">'+legendName+'</a></li>');         
        });
            // Update checkbox height(varies by theme/browser) 
        dhpPinboardView.checkboxHeight = jQuery('#legends').find('input:checkbox').height();

            //Initialize new foundation elements
        jQuery(document).foundation();

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

            // Handle user selection of value name from current Legend
        jQuery('#legends div.terms .row a').on('click', function(event) {
            var spanName = jQuery(this).data('id');

                // "Hide/Show all" button
            if(spanName==='all') {
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

                    //child terms are now hidden in legend. This selects them if parent is checked
                if(dhpPinboardView.useParent) {
                    jQuery('.active-legend .terms .row').find('*[data-parent="'+spanName+'"]').each(function( index ) {
                        jQuery( this ).closest('.row').find('input').prop('checked',true);
                    }); 
                }
            }
                //update map
            dhpPinboardView.refreshMarkerLayer();
        });

            // Handle user selection of checkbox from current Legend
        jQuery('#legends div.terms input').on('click', function(event) {
            var checkAll = jQuery(this).closest('.row').hasClass('check-all');
            var boxState = jQuery(this).prop('checked');
            var spanName = jQuery(this).closest('.row').find('a').data('id');
                // "Hide/Show all" checkbox
            if( checkAll ) {
                jQuery('.active-legend .terms .row').find('input').prop('checked',boxState);
            }
                // toggle individual terms
            else {
                jQuery('.active-legend .terms .check-all').find('input').prop('checked',false);
                
                    //child terms are now hidden in legend. This selects them if parent is checked
                if(dhpPinboardView.useParent) {
                    jQuery('.active-legend .terms .row').find('*[data-parent="'+spanName+'"]').each(function( index ) {
                        jQuery( this ).closest('.row').find('input').prop('checked',true);
                    });
                }
            }
            dhpPinboardView.refreshMarkerLayer();
        });
            // Add Layers to legends
        jQuery('#legends .legend-row').append('<div class="legend-div" id="layers-panel"><div class="legend-title">Layer Controls</div></div>');
        jQuery('.legend-div').hide();

            // Show Legend 0 by default
        jQuery('#term-legend-0').show();
        jQuery('#term-legend-0').addClass('active-legend');

            // Handle selection of different Legends from navbar
        jQuery('.dhp-nav .legend-dropdown a').click(function(evt) {
            evt.preventDefault();
            dhpPinboardView.switchLegend(evt.target);
        });

            // Handle selecting "Layer Sliders" button on navbar
        jQuery('#layers-button').click(function(evt) {
            evt.preventDefault();

                // Hide current Legend info
            jQuery('.legend-div').hide();
            jQuery('.legend-div').removeClass('active-legend');

                // Were sliders already showing? Make filter mote legend visible again
            if (dhpPinboardView.slidersShowing) {
                    // Find the legend div that should be active now!
                var activeLegend = jQuery('.legend-title').filter(function() {
                    return (jQuery(this).text() === dhpPinboardView.currentLegend);
                }).parent();

                jQuery(activeLegend).addClass('active-legend');
                jQuery(activeLegend).show();

                jQuery('#layers-button').parent().removeClass('active');

                dhpPinboardView.slidersShowing = false;

                // Show sliders now
            } else {
                    // Show section of Legend with sliders
                jQuery('#layers-panel').addClass('active-legend');
                jQuery('#layers-panel').show();

                jQuery('#layers-button').parent().addClass('active');

                dhpPinboardView.slidersShowing = true;
            }
        });

          // Show initial Legend selection and show it as active on the menu
        dhpPinboardView.slidersShowing = false;
        dhpPinboardView.catFilter = legendList[0];
        dhpPinboardView.currentLegend = legendList[0].name;
        dhpPinboardView.slidersShowing = false;
        dhpPinboardView.findSelectedCats();
    }, // createLegends()

        // PURPOSE: Handle user selection of a marker on a map to bring up modal
        // INPUT:   e = event whose target is the feature selected on map
        //             HOWEVER! This also called from hover modal WITHOUT a parameter!
        // ASSUMES: currentFeature is set for reason noted above
    onFeatureSelect: function(e)
    {
        dhpPinboardView.callBacks.showMarkerModal(dhpPinboardView.currentFeature);
    }, // onFeatureSelect()

        // PURPOSE: Resizes map-specific elements when browser size changes
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

            // This is an Leaflet function to redraw the markers after map resize
        dhpPinboardView.mapLeaflet.invalidateSize();
    }, // dhpUpdateSize()

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
