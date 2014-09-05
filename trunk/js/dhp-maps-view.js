// DH Press Maps View -- contains all data and functions for rendering maps with help of dhpCustomMaps
// ASSUMES: An area for the map has been marked with HTML div as "dhp-visual"
//          That the custom maps "library" has already been loaded with corresponding map entries
// NOTES:   Format of Marker and Legend data (GeoJSON) is documented in dhp-project-functions.php
//          Once size of Marker array increases, may need to make filter more efficient
//          FeatureCollections can now consist of both Points and Polygons; however, mixing makes it
//              difficult to pass as GeoJSON to Leaflet, as markerStyle() does redundant work. A better
//              solution would be to create and pass separate GeoJSON arrays for Points and Polygons
//              but this is not conducive to current architecture. Better support in next Leaflet?

// USES:    JavaScript libraries jQuery, Underscore, Zurb Foundation, Leaflet


var dhpMapsView = {

        // Contains fields: ajaxURL, projectID, mapEP, viewParams, vizIndex

        //					rawAjaxData = raw data returned from AJAX
        //					allMarkers = All marker posts assoc. w/ Project; see data desc in createMarkerArray() of dhp-project-functions.php

        //                  currentLegend = name of current legend/filter mote
        //                  slidersShowing = true if Legend currently shows Layer sliders
        //                  catFilter = All values for currently selected Legend; see data desc in getIconsForTerms() of dhp-project-functions.php
        //                  catFilterSelect = Current selection of legend/categories; Subset of catFilter.terms

        //                  markerOpacity = opacity of marker layer (for all markers)
        //                  radius = radius of geometric markers
        //                  makiSize = "s" | "m" | "l"
        //                  makiIcons = array of maki icons, indexed by name
        //                  pngIcons = array of PNG image icons, indexed by name

        //                  mapLayers = array of map overlay data to display (compiled in this code)
        //                  mapLeaflet = Leaflet map object
        //                  control = Leaflet map layer selection controller
        //                  useParent = if true (always true!), actions on parent term affect child terms
        //                  isTouch = this is a touch-screen interface, not mouse

        //                  currentFeature = map feature currently highlighted or selected (with modal)
        //                  anyPopupsOpen = true when a popover modal is currently open

        // PURPOSE: Initialize new leaflet map, layers, and markers                         
        // INPUT:   ajaxURL      = URL to WP
        //          projectID    = ID of project
        //          mapEP        = settings for map entry point (from project settings)
        //          viewParams   = array of data about map layers (see dhpGetMapLayerData() in dhp-project-functions)
    initialize: function(ajaxURL, projectID, vizIndex, mapEP, viewParams) {
             // Constants
        dhpMapsView.checkboxHeight = 12; // default checkbox height

            // Save reset data for later
        dhpMapsView.mapEP          = mapEP;
        dhpMapsView.viewParams     = viewParams;

        dhpMapsView.isTouch        = dhpServices.isTouchDevice();

        dhpMapsView.markerOpacity  = 1;     // default marker opacity
        dhpMapsView.makiSize       = mapEP.size;
        switch (mapEP.size) {
        case "s":
            dhpMapsView.radius     = 4;
            break;
        case "m":
            dhpMapsView.radius     = 8;
            break;
        case "l":
            dhpMapsView.radius     = 12;
            break;
        }
        dhpMapsView.makiIcons      = [];    // array of Maki-icons by name
        dhpMapsView.pngIcons       = [];    // array of PNG image icons by name

        dhpMapsView.mapLayers      = [];

            // expand to show/hide child terms and use their colors
        dhpMapsView.useParent = true;

        dhpMapsView.initializeMap2();

        dhpMapsView.createLayers();
        dhpMapsView.createMapControls();

            // Create Leaflet icons for each defined PNG image
        for (var i=0; i<viewParams.pngs.length; i++)
        {
            var thePNG = viewParams.pngs[i];
            var pngSize = [ thePNG.w, thePNG.h ];
            var pngAnchor = [ thePNG.w/2, thePNG.h ];
            dhpMapsView.pngIcons[thePNG.title] = L.icon(
                {   iconUrl: thePNG.url,
                    iconSize: pngSize,
                    iconAnchor: pngAnchor
                } );
        }


        jQuery.ajax({
            type: 'POST',
            url: ajaxURL,
            data: {
                action: 'dhpGetMarkers',
                project: projectID,
                index: vizIndex
            },
            success: function(data, textStatus, XMLHttpRequest)
            {
                dhpMapsView.createDataObjects(JSON.parse(data));
                    // Remove Loading modal
                dhpServices.remLoadingModal();
                jQuery('.reveal-modal-bg').remove();
            },
            error: function(XMLHttpRequest, textStatus, errorThrown)
            {
               alert(errorThrown);
            }
        });
    }, // initialize()


        // PURPOSE: Initialize map viewing area with controls
    initializeMap2: function()
    {
        dhpMapsView.anyPopupsOpen = false;

            // Add map elements to nav bar
        jQuery('.dhp-nav .top-bar-section .left').append(Handlebars.compile(jQuery("#dhp-script-map-menus").html()));

            // Insert Legend area -- Joe had "after" but menu off map above if not "append"
        jQuery('#dhp-visual').append(Handlebars.compile(jQuery("#dhp-script-legend-head").html()));

        jQuery('#dhp-visual').append('<div id="dhpMap"/>');

           //create map with view
        dhpMapsView.mapLeaflet = L.map('dhpMap',{ zoomControl:false }).setView([dhpMapsView.mapEP.lat, dhpMapsView.mapEP.lon], dhpMapsView.mapEP.zoom);

            // Handle hover modal popup
        if (dhpMapsView.isTouch) {
            dhpMapsView.mapLeaflet.on('popupopen', function(e) {
                dhpMapsView.anyPopupsOpen = true;
            });
            dhpMapsView.mapLeaflet.on('popupclose', function(e) {
                    // popupclose event fires on open and close (bug?)
                if (dhpMapsView.anyPopupsOpen) {
                    dhpMapsView.markerLayer.resetStyle(e.popup._source);
                    dhpMapsView.anyPopupsOpen = false;
                }
            });
        }

        // jQuery('#dhp-visual').height(jQuery('#dhp-visual')-45);
    }, // initializeMap2()

        // PURPOSE: Create base layers and overlays
        // NOTES:   While mapEP.layers specifies which predefined layers to use (and opacity),
        //              vizParams.layerData contains data defining those layers needed by dhp-custom-maps.js
        // TO DO:   Make dhp-project-functions combine dhpMapsView.mapEP.layers and dhpData.vizParams.layerData objects
    createLayers: function()
    {
        var opacity, layerDef;

            // Compile map layer data into mapLayers array and create with Leaflet
        _.each(dhpMapsView.mapEP.layers, function(layerToUse, index) {
            layerDef = dhpMapsView.viewParams.layerData[index];
            var newLayer;

            opacity = layerToUse.opacity || 1;

            switch (layerDef.dhp_map_type) {
            case 'OSM':
                var subDomains = layerDef.dhp_map_subdomains.split('|');
                if(subDomains.length>1) {
                    newLayer = L.tileLayer(layerDef.dhp_map_url, {
                        subdomains: subDomains,
                        attribution: layerDef.dhp_map_source,
                        maxZoom: 20,
                        opacity: opacity,
                        layerName: layerDef.dhp_map_shortname,
                        layerType: layerDef.dhp_map_category
                    });
                }
                else {
                    newLayer = L.tileLayer(layerDef.dhp_map_url, { 
                        attribution: layerDef.dhp_map_source, 
                        maxZoom: 20, 
                        opacity: opacity,
                        layerName: layerDef.dhp_map_shortname,
                        layerType: layerDef.dhp_map_category
                    });
                }

                newLayer.addTo(dhpMapsView.mapLeaflet);
                break;

            case 'DHP':
                dhpCustomMaps.maps.defaultAPI(dhpCustomMaps.maps.API_LEAFLET);
                var dhpObj = new dhpCustomMaps.maps.Map(layerDef.dhp_map_typeid);
                newLayer = dhpObj.layer();
                newLayer.options.opacity = opacity;
                newLayer.options.attribution = 'Layer data &copy; ' + layerDef.dhp_map_source;
                newLayer.addTo(dhpMapsView.mapLeaflet);
                break;

            case 'Blank':
                newLayer = {};
                newLayer.options = {};
                newLayer.options.layerName = 'Blank';
                newLayer.options.isBaseLayer = true;
                dhpMapsView.mapLeaflet.minZoom = 1;
                dhpMapsView.mapLeaflet.maxZoom = 20;
                break;

            default:
                throw new Error("Unsupported map type: "+layerDef.dhp_map_type);
            } // switch

            dhpMapsView.mapLayers.push(newLayer);
        }); // each sourceLayers

            // The control object manages which layers are visible at any time (user selection)
        dhpMapsView.control = L.control.layers();
        dhpMapsView.control.addTo(dhpMapsView.mapLeaflet);
            // Add each layer to the map object
        _.each(dhpMapsView.mapLayers, function(theLayer) {
            if(theLayer.options.isBaseLayer || theLayer.options.layerType == 'base layer') {
                dhpMapsView.control.addBaseLayer(theLayer, theLayer.options.layerName);
            }
            else {
                dhpMapsView.control.addOverlay(theLayer, theLayer.options.layerName);
            }
        });
    }, // createLayers()

        // PURPOSE: Create Leaflet map controls
    createMapControls: function() {
        //control position
        var layerControl = L.control.zoom({position: 'topright'});
        layerControl.addTo(dhpMapsView.mapLeaflet);

        // add reset button
        var resetControl = L.control({position: 'topright'});

        resetControl.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'reset-control leaflet-bar');
            this.update();
            return this._div;
        };
        resetControl.update = function (props) {
            this._div.innerHTML = '<a class="reset-map" ><i class="fi-refresh"></i></a>';
        };
        resetControl.addTo(dhpMapsView.mapLeaflet);
        jQuery('.reset-control').click(function(){
            dhpMapsView.resetMap();
        });
    }, // createMapControls()

        // PURPOSE: Create marker objects for map visualization; called by loadMapMarkers()
        // INPUT:   geoData = all AJAX data as JSON object: Array of ["type", ...]
        // SIDE-FX: assigns variables allMarkers, catFilter, rawAjaxData
    createDataObjects: function(geoData) 
    {
        dhpMapsView.rawAjaxData = geoData;

        var legends = [];

            // Assign data to appropriate objects
        _.each(dhpMapsView.rawAjaxData, function(dataSet) {
            switch(dataSet.type) {
            case 'filter':
                legends.push(dhpMapsView.formatTerms(dataSet));
                break;
            case 'FeatureCollection':
                dhpMapsView.allMarkers = dataSet;
                break;
            }
        });

            // First legend will be selected by default
        dhpMapsView.createLegends(legends);
        dhpMapsView.createMarkerLayer();
        dhpMapsView.buildLayerControls();   
    }, // createDataObjects()

        // PURPOSE: Called by createDataObjects() to take nested array(s) of terms and convert to flat array
        //              of items with fields: id, parent, name, icon_url
        // NOTES:   In array returned by php, parent markers have <id> field but children have <term_id>
        // TO DO:   This looks very inefficient -- redo
        // RETURNS: Object with 2 properties: terms and all
    formatTerms: function(oldTerms)
    {
        var newTerms = dhpServices.flattenTerms(oldTerms);
        var allTerms = [];

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
        dhpMapsView.markerLayer = L.geoJson(dhpMapsView.allMarkers, { 
            onEachFeature: dhpMapsView.onEachFeature,
            pointToLayer: dhpMapsView.pointToLayer,
            // style: dhpMapsView.markerStyle,
            filter: dhpMapsView.filterMapMarkers
        });
        dhpMapsView.markerLayer.addTo(dhpMapsView.mapLeaflet);
        dhpMapsView.markerLayer.options.layerName = 'Markers';

        dhpMapsView.control.addOverlay(dhpMapsView.markerLayer, 'Markers' );

        dhpMapsView.mapLayers.push(dhpMapsView.markerLayer);
    }, // createMarkerLayer()

    checkOpacity: function() {
        return dhpMapsView.markerOpacity;
    },

        // PURPOSE: Determine what color to use for marker
        // INPUT:   cats = the array of legend categories for this marker
        // TO DO:   Make more efficient: since Legend/Category terms have been flattened & viz info
        //              copied to children it should not be necessary to find parent
    getActiveTermColor: function(cats) {
        var returnColor;
            // Find which of this item's legend values match current legend selection
        var matchID = _.intersection(dhpMapsView.catFilterSelect, cats);
            // For motes with multiple values, we will need to arbitrarily select first match
        if (_.isArray(matchID)) {
            matchID = matchID[0];
        }

            // Now, look through the current legend values for which matches first overlap
            // TO DO: Search for flattened term w/ icon_url info
        var term = _.find(dhpMapsView.catFilter.terms, function(item) {
            return (item.id == matchID);
        });

            // Does this term have a parent? Get color from parent
        if (term.parent && dhpMapsView.useParent) {
                // Search through filter for parent's term entry
                // NOTE: Further inefficiency: 3rd exhaustive search!!
            var parentTerm = _.find(dhpMapsView.catFilter.terms, function(parent) {
                return (parent.id == term.parent);
            });
            returnColor = parentTerm['icon_url'];

            // No parent, get this icon's color
        } else {
            dhpMapsView.parentIcon = term['icon_url'];
            returnColor = term['icon_url'];
        }

        return returnColor;
    }, // getActiveTermColor()


        // PURPOSE: Return style of Markers
        // NOTES:   This is needed because otherwise Polygons not given any style; however, since it
        //              is also called for Circle markers, creates much redundant work
    // markerStyle: function(feature)
    // {
    //     var fColor = dhpMapsView.getActiveTermColor(feature.properties.categories);
    //     switch (feature.geometry.type) {
    //     case 'Point':
    //         return {
    //             fillColor: fColor,
    //             color: "#000",
    //             weight: 1,
    //             opacity: 1
    //         };
    //     case 'Polygon':
    //         return {
    //             fillColor: fColor,
    //             fill: true,
    //             color: "#000",
    //             weight: 1,
    //             opacity: 0.8
    //         };
    //     default:
    //         return { color: fColor };
    //     }
    // }, // markerStyle()


        // PURPOSE: Create the Leaflet feature associated with this entry
    pointToLayer: function(feature, latlng) {
            // get the string associated with Legend ID
        var fKey = dhpMapsView.getActiveTermColor(feature.properties.categories);
        switch (fKey.charAt(0)) {
        case '#':
            return L.circleMarker(latlng, {
                radius: dhpMapsView.radius,
                fillColor: fKey,
                color: "#000",
                weight: 1,
                opacity: 1,
                fillOpacity: dhpMapsView.checkOpacity
            });
        case '.':
                // See if maki-icon has already been created and if not create it
            var iName = fKey.substring(1);
            var mIcon = dhpMapsView.makiIcons[iName];
            if (mIcon == undefined || mIcon == null) {
                mIcon = L.MakiMarkers.icon({
                    icon: iName,
                    color: "#12a",
                    size: dhpMapsView.makiSize
                });
                dhpMapsView.makiIcons[iName] = mIcon;
            }
            return L.marker(latlng, { icon: mIcon, riseOnHover: true });
        case '@':
            var pngTitle = fKey.substring(1);
            var pngIcon = dhpMapsView.pngIcons[pngTitle];
            if (pngIcon == undefined || pngIcon === null) {
                throw new Error("Could not find PNG image for: "+pngTitle);
            }
            return L.marker(latlng, { icon: pngIcon, riseOnHover: true });
        default:
            throw new Error("Unsupported feature type: "+fKey);
        }
    }, // pointToLayer()


        // PURPOSE: Bind controls for each Marker
    onEachFeature: function(feature, layer)
    {
            // Hover popup only for touchscreen
        if (dhpMapsView.isTouch) {
            layer.bindPopup('<div><h1>'+feature.properties.title+
                '</h1><a class="button success" onclick="javascript:dhpMapsView.onFeatureSelect()">More</a></div>',
                {offset: L.Point(0, -10)});

                // Click is automatically handled by Leaflet popup
            layer.on({
                mouseover: dhpMapsView.hoverFeature,
                mouseout: dhpMapsView.resetHighlight
            });
        } else {
            layer.on({
                click: dhpMapsView.clickFeature
            });
        }
    }, // onEachFeature()

        // PURPOSE: Handle touch over this feature
    hoverFeature: function(e) {
        dhpMapsView.currentFeature = e.target.feature;

        e.target.openPopup();

            // This only works for geometric markers, not maki-icons, so must remove for now
        // e.target.setStyle({ // highlight the feature
        //     weight: 3,
        //     color: '#666',
        //     dashArray: '',
        //     fillOpacity: 0.6
        // });

            // Can't feature foregrounding on Internet Explorer or Opera
            // This only works for geometric markers, not maki-icons
        // if (!L.Browser.ie && !L.Browser.opera) {
        //     e.target.bringToFront();
        // }
    },

        // PURPOSE: Handle mouse(only!) selection of feature
    clickFeature: function(e) {
        dhpMapsView.currentFeature = e.target.feature;
        dhpMapsView.onFeatureSelect();
    },

        // PURPOSE: Remove the hover style
    resetHighlight: function(e) {
        dhpMapsView.markerLayer.resetStyle(e.target);
    },

        // PURPOSE: Reset map view to default state
    resetMap: function()
    {
        dhpMapsView.mapLeaflet.setView([dhpMapsView.mapEP.lat, dhpMapsView.mapEP.lon], dhpMapsView.mapEP.zoom);
    }, // resetMap()

        // PURPOSE: Determine which markers to display based on selected array
        // RETURNS: true or false, depending on if its id is in selected array
    filterMapMarkers: function(feature)
    {
        return (_.intersection(feature.properties.categories, dhpMapsView.catFilterSelect).length >= 1);
    }, // filterMapMarkers()

        // PURPOSE: Handle visual impact of change of Legend selection: selecting entirely (new Legend or selection )
    refreshMarkerLayer: function() {
        dhpMapsView.findSelectedCats();
        dhpMapsView.control.removeLayer(dhpMapsView.markerLayer);
        dhpMapsView.mapLeaflet.removeLayer(dhpMapsView.markerLayer);
            // since createMarkerLayer() is going to create new marker layer, need to remove from layer array
        dhpMapsView.mapLayers.pop();
        dhpMapsView.createMarkerLayer();
    }, // refreshMarkerLayer()

        // PURPOSE: Handle user selection of legend in navbar menu
        // INPUT:   target = element selected by user
    switchLegend: function(target)
    {
            // Unhighlight the layers button in nav bar
        jQuery('#layers-button').parent().removeClass('active');

        var newLegend = jQuery(target).text();

            // If sliders are showing, then might just need to adjust Legend display, not recalculate
        if (dhpMapsView.slidersShowing || newLegend !== dhpMapsView.currentLegend) {
            dhpMapsView.slidersShowing = false;

                // Don't display current (or any) Legend
            jQuery('.legend-div').hide();
            jQuery('.legend-div').removeClass('active-legend');

                // Display selected legend (whose ID was stored in href)
            var action = jQuery(target).attr('href');
            jQuery(action).addClass('active-legend');
            jQuery(action).show();

                // Have to do extra check in case we are just switching out layer sliders
            if (newLegend !== dhpMapsView.currentLegend) {
                    // Update the markers to show on map
                dhpMapsView.switchFilter(newLegend);
                dhpMapsView.dhpUpdateSize();

                    // Change active menu item in navbar drop-down
                jQuery('.legend-dropdown > .active').removeClass('active');
                jQuery(target).parent().addClass('active');

                dhpMapsView.currentLegend = newLegend;
            }
        }
    },  // switchLegend()

        // PURPOSE: Handle user selecting new legend category
        // INPUT:   filterName = name of legend/category selected
        // ASSUMES: rawAjaxData has been assigned, selectControl has been initialized
        // SIDE-FX: Changes catFilter
    switchFilter: function(filterName)
    {
        var filterObj = _.where(dhpMapsView.rawAjaxData, {type: "filter", name: filterName});
        dhpMapsView.catFilter = filterObj[0];
        dhpMapsView.refreshMarkerLayer();
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

        if (dhpMapsView.catFilter) {
            countTerms = Object.keys(dhpMapsView.catFilter.terms).length;
        }

        if (singleID) {
            for (i=0;i<countTerms;i++) {
                tempFilter = dhpMapsView.catFilter.terms[i];
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
                    tempFilter = dhpMapsView.catFilter.terms[i];
                    if(tempFilter.id==tempSelCat) {
                        selCatFilter[index] = tempFilter.id;
                    }
                }
            });
        }
        dhpMapsView.catFilterSelect = selCatFilter;
    }, // findSelectedCats()


        // PURPOSE: Create HTML for all of the legends for this visualization
        // INPUT:   legendList = array of legends to display; each element has field "name" and array "terms" of [id, name, icon_url ]
    createLegends: function(legendList) 
    {
        dhpServices.createLegends(legendList, 'Layer Controls');

            // Handle user selection of value name from current Legend
        jQuery('#legends div.terms .row a').click(function(event) {
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

                    // Child terms are hidden in menu -- selects them also automatically if parent is checked
                if (dhpMapsView.useParent) {
                    jQuery('.active-legend .terms .row').find('*[data-parent="'+spanName+'"]').each(function( index ) {
                        jQuery( this ).closest('.row').find('input').prop('checked',true);
                    }); 
                }
            }
                //update map
            dhpMapsView.refreshMarkerLayer();
        });

            // Handle user selection of checkbox from current Legend
        jQuery('#legends div.terms input').click(function(event) {
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
                if(dhpMapsView.useParent) {
                    jQuery('.active-legend .terms .row').find('*[data-parent="'+spanName+'"]').each(function( index ) {
                        jQuery( this ).closest('.row').find('input').prop('checked',true);
                    });
                }
            }
            dhpMapsView.refreshMarkerLayer();
        });

            // Handle selection of different Legends from navbar
        jQuery('.dhp-nav .legend-dropdown a').click(function(evt) {
            evt.preventDefault();
            dhpMapsView.switchLegend(evt.target);
        });

            // Handle selecting "Layer Sliders" button on navbar
        jQuery('#layers-button').click(function(evt) {
            evt.preventDefault();

                // Hide current Legend info
            jQuery('.legend-div').hide();
            jQuery('.legend-div').removeClass('active-legend');

                // Were sliders already showing? Make filter mote legend visible again
            if (dhpMapsView.slidersShowing) {
                    // Find the legend div that should be active now!
                var activeLegend = jQuery('.legend-title').filter(function() {
                    return (jQuery(this).text() === dhpMapsView.currentLegend);
                }).parent();

                jQuery(activeLegend).addClass('active-legend');
                jQuery(activeLegend).show();

                jQuery('#layers-button').parent().removeClass('active');

                dhpMapsView.slidersShowing = false;

                // Show sliders now
            } else {
                    // Show section of Legend with sliders
                jQuery('#layers-panel').addClass('active-legend');
                jQuery('#layers-panel').show();

                jQuery('#layers-button').parent().addClass('active');

                dhpMapsView.slidersShowing = true;
            }
        });

          // Show initial Legend selection and show it as active on the menu
        dhpMapsView.catFilter = legendList[0];
        dhpMapsView.currentLegend = legendList[0].name;
        dhpMapsView.slidersShowing = false;
        dhpMapsView.findSelectedCats();
    }, // createLegends()

        // PURPOSE: Create UI controls for opacity of each layer in Legend area
        // ASSUMES: map.layers has been initialized, settings are loaded
        //          HTML element "layers-panel" has been inserted into document
        // NOTE:    The final map layer is for Markers, so has no corresponding user settings
    buildLayerControls: function()
    {
        var layerOpacity, label;
        var layerSettings = dhpMapsView.mapEP.layers;
        _.each(dhpMapsView.mapLayers, function(thisLayer, index) {
                // Markers start out "fully on" by default
            if (index == dhpMapsView.mapLayers.length-1) {
                layerOpacity = 1;
                label = 'Markers (Circles only)';
            } else {
                layerOpacity = layerSettings[index].opacity || 1;
                label = thisLayer.options.layerName;
            }

                // Don't create checkbox or opacity slider for Blank layer
            if (thisLayer.options.layerName != 'Blank') {
                jQuery('#layers-panel').append('<div class="layer-set" id="layer'+index+'">'+
                    '<div><input type="checkbox" checked="checked"> '+
                    '<a class="value" id="'+thisLayer.options.id+'">'+label+'</a></div>'+
                    '<div><div class="layer-opacity"></div></div>'+
                    '</div>');

                jQuery('#layer'+index+' .layer-opacity').slider({
                    range: false,
                    min: 0,
                    max: 1,
                    step: 0.05,
                    values: [ layerOpacity ],
                    slide: function( event, ui ) {
                        dhpMapsView.layerOpacity(index, ui.values[0]);
                    }
                });
                    // Handle turning on and off map layer
                jQuery( '#layer'+index+' input').click(function() {
                    if(jQuery(this).is(':checked')) {
                        dhpMapsView.mapLeaflet.addLayer(thisLayer);
                    } else {
                        dhpMapsView.mapLeaflet.removeLayer(thisLayer);
                    }
                });
            }
        });
    }, // buildLayerControls()


        // PURPOSE: Callback to handle user setting of opacity slider
        // NOTES:   Opacity setting will only work for Circle (< Path) markers, not icons
        //          Because Marker layer is destroyed and rebuilt whenever Legend changes, need to
        //              pass index, not layer itself
    layerOpacity: function(index, val) {
        var layer = dhpMapsView.mapLayers[index];
        if (index == dhpMapsView.mapLayers.length-1) {
            dhpMapsView.markerOpacity = val;
            layer.setStyle( { fillOpacity: dhpMapsView.markerOpacity, opacity: dhpMapsView.markerOpacity });
        } else {
            layer.setOpacity(val);
        }
    }, // layerOpacity()

        // PURPOSE: Handle user selection of a marker on a map to bring up modal
        // INPUT:   e = event whose target is the feature selected on map
        //             HOWEVER! This also called from hover modal WITHOUT a parameter!
        // ASSUMES: currentFeature is set for reason noted above
    onFeatureSelect: function(e)
    {
        dhpServices.showMarkerModal(dhpMapsView.currentFeature);
    }, // onFeatureSelect()

        // PURPOSE: Resizes map-specific elements when browser size changes
    dhpUpdateSize: function()
    {
            // This is an Leaflet function to redraw the markers after map resize
        dhpMapsView.mapLeaflet.invalidateSize();
    } // dhpUpdateSize()
};
