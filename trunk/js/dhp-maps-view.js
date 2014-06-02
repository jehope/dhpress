// DH Press Maps View -- contains all data and functions for rendering maps with help of dhpCustomMaps
// ASSUMES: The sidebar is marked with HTML div as "secondary"
//          An area for the map has been marked with HTML div as "dhp-visual"
//          That the custom maps "library" has already been loaded with corresponding map entries
// NOTES:   Format of Marker and Legend data (GeoJSON) is documented in dhp-project-functions.php
//          Once size of Marker array increases, may need to make filter more efficient
//          The class active-legend is added to whichever legend is currently visible and selected

// USES:    JavaScript libraries jQuery, Underscore, Zurb Foundation, Leaflet


var dhpMapsView = {

        // Contains fields: ajaxURL, projectID, mapEP, viewParams, vizIndex
        //                  callBacks = object containing callback functions to dhp-project-page

        //					rawAjaxData = raw data returned from AJAX
        //					allMarkers = All marker posts assoc. w/ Project; see data desc in createMarkerArray() of dhp-project-functions.php

        //                  currentLegend = name of current legend/filter mote
        //                  slidersShowing = true if Legend currently shows Layer sliders
        //                  catFilter = All values for currently selected Legend; see data desc in getIconsForTerms() of dhp-project-functions.php
        //                  catFilterSelect = Current selection of legend/categories; Subset of catFilter.terms

        //                  markerOpacity = opacity of marker layer (for all markers)
        //                  radius = radius of geometric markers
        //                  makiSize = "s" | "m" | "l"
        //                  makiIcons = array of maki icons

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
        //          callBacks    = set of callback functions back to dhp-project-page functions
    initMapInterface: function(ajaxURL, projectID, vizIndex, mapEP, viewParams, callBacks) {
             // Constants
        dhpMapsView.checkboxHeight = 12; // default checkbox height

            // Save reset data for later
        dhpMapsView.ajaxURL        = ajaxURL;
        dhpMapsView.projectID      = projectID;
        dhpMapsView.vizIndex       = vizIndex;
        dhpMapsView.mapEP          = mapEP;
        dhpMapsView.viewParams     = viewParams;
        dhpMapsView.callBacks      = callBacks;

        dhpMapsView.isTouch        = dhpMapsView.isTouchDevice();

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
        dhpMapsView.makiIcons      = [];    // array of Maki-icons to be used by markers

        dhpMapsView.mapLayers      = [];
            // expand to show/hide child terms and use their colors
        dhpMapsView.useParent = true;

        dhpMapsView.initializeMap2();

        dhpMapsView.createLayers();
        dhpMapsView.loadMapMarkers();
        dhpMapsView.createControls();
    }, // initMapInterface()

        // PURPOSE: Initialize map viewing area with controls
    initializeMap2: function()
    {
        dhpMapsView.anyPopupsOpen = false;

            // Add map elements to nav bar
        jQuery('.dhp-nav .top-bar-section .left').append(Handlebars.compile(jQuery("#dhp-script-map-menus").html()));

            // Insert Legend area -- Joe had "after" but menu off map above if not "append"
        jQuery('#dhp-visual').append(Handlebars.compile(jQuery("#dhp-script-map-legend-head").html()));

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
                    newLayer = new L.TileLayer(layerDef.dhp_map_url, {
                        subdomains: subDomains,
                        attribution: layerDef.dhp_map_source,
                        maxZoom: 20,
                        opacity: opacity,
                        layerName: layerDef.dhp_map_shortname,
                        layerType: layerDef.dhp_map_category
                    });
                }
                else {
                    newLayer = new L.TileLayer(layerDef.dhp_map_url, { 
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
        dhpMapsView.control = new L.control.layers().addTo(dhpMapsView.mapLeaflet);
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
    createControls: function() {
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
    }, // createControls()

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
        dhpMapsView.markerLayer = L.geoJson(dhpMapsView.allMarkers, { 
            onEachFeature: dhpMapsView.onEachFeature,
            pointToLayer: dhpMapsView.pointToLayer,
            filter: dhpMapsView.filterMapMarkers 
        }).addTo(dhpMapsView.mapLeaflet);
        dhpMapsView.markerLayer.options.layerName = 'Markers';

        dhpMapsView.control.addOverlay(dhpMapsView.markerLayer, 'Markers' );

        // dhpMapsView.mapLayers.push(dhpMapsView.markerLayer);
    }, // createMarkerLayer()

    checkOpacity: function() {
        return dhpMapsView.markerOpacity;
    },

        // PURPOSE: Determine what color to use for marker
        // INPUT:   cats = the array of legend categories for this marker
        // TO DO:   Make more efficient -- goes through 2 to 3 exhaustive searches each marker
    getActiveTermColor: function(cats) {
        var returnColor;
            // Find which of this item's legend values match current legend selection
        var matchID = _.intersection(dhpMapsView.catFilterSelect, cats);
            // For motes with multiple values, we will need to arbitrarily select first match
        if (_.isArray(matchID)) {
            matchID = matchID[0];
        }

            // Now, look through the current legend values for which matches first overlap
            // TO DO: Make this more efficient: the search is done (exhaustively) twice here!
        var term = _.find(dhpMapsView.catFilter.terms, function(item) {
            return (item.id == matchID);
        });

            // Does this term have a parent? Get color from parent
        if(term.parent && dhpMapsView.useParent) {
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

        // PURPOSE: Create the Leaflet feature associated with this entry
    pointToLayer: function(feature, latlng) {
        var fColor = dhpMapsView.getActiveTermColor(feature.properties.categories);
        var fType = fColor.substring(0,1);
        switch (fType) {
        case '#':
            return new L.CircleMarker(latlng, {
                radius: dhpMapsView.radius,
                fillColor: fColor,
                color: "#000",
                weight: 1,
                opacity: 1,
                fillOpacity: dhpMapsView.checkOpacity
            });
        case '.':
                // See if maki-icon has already been created and if not create it
            var iName = fColor.substring(1);
            var mIcon = dhpMapsView.makiIcons[iName];
            if (mIcon == undefined || mIcon == null) {
                mIcon = L.MakiMarkers.icon({
                    icon: iName,
                    color: "#12a",
                    size: dhpMapsView.makiSize
                });
                dhpMapsView.makiIcons[iName] = mIcon;
            }
            return new L.marker(latlng, { icon: mIcon });
        default:
            throw new Error("Unsupported feature type: "+fColor);
        }
    }, // pointToLayer()

        // PURPOSE: Bind controls for each Marker
    onEachFeature: function(feature, layer)
    {
            // Hover popup only for touchscreen
        if (dhpMapsView.isTouch) {
            layer.bindPopup('<div><h1>'+feature.properties.title+
                '</h1><a class="button success" onclick="javascript:dhpMapsView.onFeatureSelect()">More</a></div>',
                {offset: new L.Point(0, -10)});

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

        // PURPOSE: Determine which markers to display based on selected array.
        // RETURNS: Feature if its id is in selected array
    filterMapMarkers: function(feature)
    {
        var filterTerms = dhpMapsView.catFilterSelect;
        if(_.intersection(feature.properties.categories, filterTerms).length >= 1) {
            return feature;
        }
    }, // filterMapMarkers()

        // PURPOSE: Handle visual impact of change of Legend selection
    refreshMarkerLayer: function() {
        dhpMapsView.findSelectedCats();
        dhpMapsView.control.removeLayer(dhpMapsView.markerLayer);
        dhpMapsView.mapLeaflet.removeLayer(dhpMapsView.markerLayer);
        dhpMapsView.createMarkerLayer();
    }, // refreshMarkerLayer()

        // PURPOSE: Change legend and redraw elements
        // INPUT:   target = element selected by user
    switchLegend: function(target)
    {
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

            if (newLegend !== dhpMapsView.currentLegend) {
                    // Update the markers to show on map
                dhpMapsView.switchFilter(newLegend);
                dhpMapsView.dhpUpdateSize();

                    // Change active menu item
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

        if(dhpMapsView.catFilter) {
            countTerms = Object.keys(dhpMapsView.catFilter.terms).length;
        }

        if(singleID) {
            for(i=0;i<countTerms;i++) {
                tempFilter = dhpMapsView.catFilter.terms[i];
                if(tempFilter.id==singleID) {
                    selCatFilter[0] = tempFilter.id;
                    break;
                }
            }
            // unknown, or multiple selection from legend
        } else {
            jQuery('#legends .active-legend .compare input:checked').each(function(index){
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
        dhpMapsView.checkboxHeight = jQuery('#legends').find('input:checkbox').height();

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
                if(dhpMapsView.useParent) {
                    jQuery('.active-legend .terms .row').find('*[data-parent="'+spanName+'"]').each(function( index ) {
                        jQuery( this ).closest('.row').find('input').prop('checked',true);
                    }); 
                }
            }
                //update map
            dhpMapsView.refreshMarkerLayer();
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
                if(dhpMapsView.useParent) {
                    jQuery('.active-legend .terms .row').find('*[data-parent="'+spanName+'"]').each(function( index ) {
                        jQuery( this ).closest('.row').find('input').prop('checked',true);
                    });
                }
            }
            dhpMapsView.refreshMarkerLayer();
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
        dhpMapsView.slidersShowing = false;
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
        var layerOpacity;
        var layerSettings = dhpMapsView.mapEP.layers;
        _.each(dhpMapsView.mapLayers, function(thisLayer,index) {
            layerOpacity = layerSettings[index].opacity || 1;

                // Don't create checkbox or opacity slider for Blank layer
            if (thisLayer.options.layerName != 'Blank') {
                jQuery('#layers-panel').append('<div class="layer'+index+'">'+
                    '<div class="row"><div class="columns small-12 large-12"><input type="checkbox" checked="checked"> '+
                    '<a class="value" id="'+thisLayer.options.id+'">'+thisLayer.options.layerName+'</a></div></div>'+
                    '<div class="row"><div class="columns small-12 large-12"><div class="layer-opacity"></div></div></div>'+
                    '</div>');

                jQuery('.layer'+index+' .layer-opacity').slider({
                    range: false,
                    min: 0,
                    max: 1,
                    step: 0.05,
                    values: [ layerOpacity ],
                    slide: function( event, ui ) {
                        dhpMapsView.layerOpacity(thisLayer, ui);
                    }
                });
                    // Handle turning on and off map layer
                jQuery( '.layer'+index+' input').click(function() {
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
    layerOpacity: function(layer, val) {
        if (layer.options.layerName=='Markers') {
            dhpMapsView.markerOpacity = val.values[ 0 ];
        }
        else {
            layer.setOpacity(val.values[ 0 ]);       
        }
    }, // layerOpacity()

        // PURPOSE: Handle user selection of a marker on a map to bring up modal
        // INPUT:   e = event whose target is the feature selected on map
        //             HOWEVER! This also called from hover modal WITHOUT a parameter!
        // ASSUMES: currentFeature is set for reason noted above
    onFeatureSelect: function(e)
    {
        dhpMapsView.callBacks.showMarkerModal(dhpMapsView.currentFeature);
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
            checkboxMargin = (newRowHeight - dhpMapsView.checkboxHeight) / 2;
                // set elements in rows with new values
            jQuery('.columns', this).eq(0).height(newRowHeight);
            jQuery('.columns', this).eq(0).find('input').css({'margin-top': checkboxMargin});
        });

            // TO DO: Resize layer opacity DIVs??

            // This is an Leaflet function to redraw the markers after map resize
        dhpMapsView.mapLeaflet.invalidateSize();
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
    loadMapMarkers: function()
    {
        // console.log('loading');
        //$('.modal-backdrop').css({'opacity':0.1});
    	jQuery.ajax({
            type: 'POST',
            url: dhpMapsView.ajaxURL,
            data: {
                action: 'dhpGetMarkers',
                project: dhpMapsView.projectID,
                index: dhpMapsView.vizIndex
            },
            success: function(data, textStatus, XMLHttpRequest)
            {
                dhpMapsView.createDataObjects(JSON.parse(data));
                    // Remove Loading modal
                dhpMapsView.callBacks.remLoadingModal();
                jQuery('.reveal-modal-bg').remove();
            },
            error: function(XMLHttpRequest, textStatus, errorThrown)
            {
               alert(errorThrown);
            }
        });
    } // loadMapMarkers()

};
