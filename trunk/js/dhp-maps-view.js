// DH Press Maps View -- contains all data and functions for rendering maps with help of dhpCustomMaps
// ASSUMES: The sidebar is marked with HTML div as "secondary"
//          An area for the map has been marked with HTML div as "dhp-visual"
//          That the custom maps "library" has already been loaded with corresponding map entries
// NOTES:   Format of Marker and Legend data is documented in dhp-project-functions.php
//          Marker data is given to OpenLayers in GeoJSON format and converted to inter
//          The class active-legend is added to whichever legend is currently visible and selected

// USES:    JavaScript libraries jQuery, Underscore, Zurb Foundation, Leaflet


var dhpMapsView = {

        // Contains fields: ajaxURL, projectID, mapEP, viewParams
        //                  callBacks = object containing callback functions to dhp-project-page

        //					rawAjaxData = raw data returned from AJAX
        //					allMarkers = All marker posts assoc. w/ Project; see data desc in createMarkerArray() of dhp-project-functions.php
        //                  catFilter = All values for currently selected Legend; see data desc in getIconsForTerms() of dhp-project-functions.php
        //                  catFilterSelect = Current selection of legend/categories; Subset of catFilter.terms

        //                  mapLayers = array of layer data to display (compiled in this code)
        //                  mapLeaflet = Leaflet map object
        //                  control = Leaflet map layer selection controller
        //                  useParent = if true (always true?), actions on parent term affect child terms

        // PURPOSE: Initialize new leaflet map, layers, and markers                         
        // INPUT:   ajaxURL      = URL to WP
        //          projectID    = ID of project
        //          mapEP        = settings for map entry point (from project settings)
        //          viewParams   = array of data about map layers (see dhpGetMapLayerData() in dhp-project-functions)
        //          callBacks    = set of callback functions back to dhp-project-page functions
    initMapInterface: function(ajaxURL, projectID, mapEP, viewParams, callBacks) {
             // Constants
        dhpMapsView.checkboxHeight         = 12; // default checkbox height

            // Save reset data for later
        dhpMapsView.ajaxURL        = ajaxURL;
        dhpMapsView.projectID      = projectID;
        dhpMapsView.mapEP          = mapEP;
        dhpMapsView.viewParams     = viewParams;
        dhpMapsView.callBacks      = callBacks;

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
        jQuery('#dhp-visual').append('<div id="dhpMap"/>');
           //create map with view
        dhpMapsView.mapLeaflet = L.map('dhpMap',{ zoomControl:false }).setView([dhpMapsView.mapEP.lat, dhpMapsView.mapEP.lon], dhpMapsView.mapEP.zoom);
        dhpMapsView.mapLeaflet.on('popupopen', function(e){
            dhpMapsView.anyPopupsOpen = true;
        });

        dhpMapsView.mapLeaflet.on('popupclose', function(e){
            // popupclose event fires on open and close(bug?)
            if(dhpMapsView.anyPopupsOpen) {
                dhpMapsView.markerLayer.resetStyle(e.popup._source);
                dhpMapsView.anyPopupsOpen = false;
            }
        });

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
        jQuery('.reset-control').on('click',function(){
            dhpMapsView.resetMap();
        });
    }, // createControls()

        // PURPOSE: Create marker objects for map visualization; called by loadMapMarkers()
        // INPUT:   data = data as JSON object: Array of ["type", ...]
        //          mLayer = map layer into which the markers inserted 
        // SIDE-FX: assigns variables allMarkers, catFilter, rawAjaxData
    createDataObjects: function(geoData) 
    {
        dhpMapsView.rawAjaxData = geoData;

        var legends = [];

            // Assign data to appropriate objects
        _.each(dhpMapsView.rawAjaxData, function(val) {
            switch(val.type) {
            case 'filter':
                legends.push(dhpMapsView.formatTerms(val));
                break;
            case 'FeatureCollection':
                dhpMapsView.allMarkers = val;
                break;
            }
        });

            // Set current filter to the first legend by default
        dhpMapsView.catFilter  = legends[0];
        dhpMapsView.createLegends(legends);

        dhpMapsView.createMarkerLayer();
        dhpMapsView.buildLayerControls();   
    }, // createDataObjects()

        // PURPOSE: Uses crispTerm to remove nesting in term array
    formatTerms: function(old_terms) 
    {
        var new_terms = old_terms;
        var termArray = [];
        var allTerms = [];

        for( var i=0, len=old_terms.terms.length; i < len; i++ ) {
            termArray.push(dhpMapsView.crispTerm(old_terms.terms[i]))
        }

        new_terms.terms = _.flatten(termArray);

            //used for speedy intersection check
        _.filter(new_terms.terms, function(term){ allTerms.push(term.id); });  
        new_terms.all = allTerms;

        return new_terms;
    }, // formatTerms()

        // PURPOSE: Creates a flattened array of terms (i.e. children terms are listed in array not nested)
    crispTerm: function(term) {
        var termGroup = [];
        if (typeof(term.icon_url) == 'undefined') {
            term.icon_url = '';
        }
        termGroup.push(term);
        if(term.children) {
            for( var i=0, len=term.children.length; i < len; i++ ) {
                 var term_icon = '';
                if(term.children[i].description) {
                    term_icon = dhpMapsView.descToIcon(term.children[i].description);
                }
                
                termGroup.push( {
                    id : term.children[i].term_id,
                    parent : term.children[i].parent,
                    icon_url : term_icon,
                    name : term.children[i].name
                });
            }
        }
        return termGroup;
    }, // crispTerm()

        // PURPOSE: get description value that contains icon_url
    descToIcon: function(val){
        var term = jQuery.parseJSON( val );
        var icon;
        if (typeof(term.icon_url) !== 'undefined') {
            icon = term.icon_url;
        }
        return icon;
    },

        // PURPOSE: Creates and draws marker layer on map. 
        //          Called whenever the terms are filtered.
    createMarkerLayer: function(){
        dhpMapsView.markerOpacity = 1;
        dhpMapsView.markerLayer = L.geoJson(dhpMapsView.allMarkers, { 
            style: dhpMapsView.style,
            onEachFeature: dhpMapsView.onEachFeature,
            pointToLayer: dhpMapsView.pointToLayer,
            filter: dhpMapsView.filterMapMarkers 
        }).addTo(dhpMapsView.mapLeaflet);
        dhpMapsView.markerLayer.options.layerName = 'Markers';
        
        dhpMapsView.control.addOverlay(dhpMapsView.markerLayer, "Markers" );

        // dhpMapsView.mapLayers.push(dhpMapsView.markerLayer);
    }, // createMarkerLayer()

        // PURPOSE: Apply the style of the marker based on category
    style: function(feature) {
        return {
           radius: 8,
            fillColor: dhpMapsView.getActiveTermColor(feature.properties.categories),
            color: "#000",
            weight: 1,
            opacity: dhpMapsView.checkOpacity,
            fillOpacity: 1
        };
    },

    checkOpacity: function() {
        return dhpMapsView.markerOpacity;
    },

        // PURPOSE: Determine what color to use for marker
    getActiveTermColor: function(cats) {
        var returnColor;
        var matchID = _.intersection(dhpMapsView.catFilterSelect, cats);
        var term = _.filter(dhpMapsView.catFilter.terms, function(item){
            if(item.id == matchID[0]) {
                return item;
            }
        });

        if (typeof(term[0]) !== 'undefined') {
            if( term[0].parent && dhpMapsView.useParent ) {
                var parentTerm = _.filter(dhpMapsView.catFilter.terms, function(parent){
                if(parent.id == term[0].parent) {
                        return parent;
                    }
                });             
                returnColor = parentTerm[0]['icon_url'];
            }
            else {
                dhpMapsView.parentIcon = term[0]['icon_url'];
                returnColor = term[0]['icon_url'];
            }
        }
        else {
            returnColor = dhpMapsView.parentIcon;
        }

        return returnColor;
    }, // getActiveTermColor()

        // PURPOSE: Need to research what pointToLayer does
    pointToLayer: function (feature, latlng) {                    
        return new L.CircleMarker(latlng, {
            radius: 8,
            fillColor: dhpMapsView.getActiveTermColor(feature.properties),
            color: "#000",
            weight: 1,
            opacity: 1,
            fillOpacity: 1.0
        });
    }, // pointToLayer()

        // Marker events
    onEachFeature: function(feature, layer)
    {
        layer.bindPopup('<div><h1>'+feature.properties.title+'</h1><a class="button success" onclick="javascript:dhpMapsView.onFeatureSelect()">More</a></div>', {offset: new L.Point(0, -10)});
        layer.on({
            mouseover: dhpMapsView.hoverHighlightFeature,
            mouseout: dhpMapsView.resetHighlight,
            click: dhpMapsView.clickHighlightFeature
        });
    }, // onEachFeature()

    hoverHighlightFeature: function(e){
        if(!dhpMapsView.isTouchSupported()) {
            dhpMapsView.highlightFeature(e);
        }
    },

        // PURPOSE: Open popup on click, if popup is open(from hover) launch feature popup
    clickHighlightFeature: function(e){
        if(!dhpMapsView.isTouchSupported()) {
            dhpMapsView.onFeatureSelect();
        }
        else {
            dhpMapsView.highlightFeature(e);   
        }
    },
        // PURPOSE: Open popup
    highlightFeature: function(e){
        var layer = e.target;
        dhpMapsView.currentFeature = layer;

        layer.openPopup();
        layer.setStyle({ // highlight the feature
            weight: 3,
            color: '#666',
            dashArray: '',
            fillOpacity: 0.6
        });

        if (!L.Browser.ie && !L.Browser.opera) {
            layer.bringToFront();
        }
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
        // RETURNS: Feature if it's id is in selected array. 
    filterMapMarkers: function(feature)
    {
        var filterTerms = dhpMapsView.catFilterSelect;
        if(_.intersection(feature.properties.categories, filterTerms).length >= 1) {
            return feature;
        }
    }, // filterMapMarkers()

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
        var action = jQuery(target).attr('href');
        var filter = jQuery(target).text();

        jQuery('.legend-div').hide();
        jQuery('.legend-div').removeClass('active-legend');
        jQuery(action).addClass('active-legend');

        jQuery(action).show();
        dhpMapsView.switchFilter(filter);
        dhpMapsView.dhpUpdateSize();
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
            legendHtml = jQuery('<div class="'+legendName+' legend-div" id="term-legend-'+legIndex+'"><div class="legend-title">'+legendName+'</div><div class="terms"></div></div>');
                // Create entries for all of the 1st-level terms (do not represent children of terms)
            _.each(filterTerms, function(theTerm) {
                if(legendName!=theTerm.name) {
                    var hasParentClass = '';
                    if(theTerm.parent) {
                        hasParentClass = 'hasParent';
                    }
                    var firstIconChar = theTerm.icon_url.substring(0,1);
                    var icon;
                    if(firstIconChar=='#') { icon = 'background:'+theTerm.icon_url; }
                    else { icon = 'background: url(\''+theTerm.icon_url+'\') no-repeat right; background-size: 50%;'; }

                    jQuery('.terms', legendHtml).append('<div class="row compare '+hasParentClass+'">'+
                          '<div class="small-4 large-2 columns" style="'+icon+'"><input type="checkbox" checked="checked"></div>'+
                          // '<div class="small-1 large-1 columns"><div class="icon-legend" style="'+icon+'"></div></div>'+
                          '<div class="small-8 large-10 columns"><a class="value" data-id="'+theTerm.id+'" data-parent="'+theTerm.parent+'">'+theTerm.name+'</a></div>'+
                        '</div>');
                }
            });
            jQuery('.terms',legendHtml).prepend(Handlebars.compile(jQuery("#dhp-script-map-legend-hideshow").html()));

            jQuery('#legends .legend-row').append(legendHtml);
                // Add Legend title to dropdown menu above
            jQuery('.dhp-nav .legend-dropdown').append('<li><a href="#term-legend-'+legIndex+'">'+legendName+'</a></li>');         
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
        jQuery('#legends div.terms .row a').on('click', function(event){
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
        jQuery('#legends div.terms input').on('click', function(event){
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

            //Set initial size of legend
        // dhpMapsView.dhpUpdateSize();

            // Handle selection of different Legends
        jQuery('.dhp-nav .legend-dropdown a').click(function(evt){
            evt.preventDefault();
            dhpMapsView.switchLegend(evt.target);
        });

            // Handle selection of Layers button on top
        jQuery('.dhp-nav .layers a').click(function(evt){
            evt.preventDefault();
            var action = jQuery(evt.target).attr('href');

            jQuery('.legend-div').hide();
            jQuery('.legend-div').removeClass('active-legend');
            jQuery(action).addClass('active-legend');
            jQuery(action).show();
        });
        
        // Show initially Legend selection
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

            // if(layerSettings[index]) {
            //     layerOpacity = layerSettings[index].opacity;
            //     if(!layerOpacity){
            //         layerOpacity = 1;
            //     }
            // }

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
            // dhpMapsView.refreshMarkerLayer();
        }
        else {
            layer.setOpacity(val.values[ 0 ]);       
        }
    }, // layerOpacity()

        // PURPOSE: Handle user selection of a marker on a map to bring up modal
        // INPUT:   feature = the feature selected on map
        // ASSUMES: Can use only first feature if a cluster of features is passed
        // SIDE-FX: Modifies DOM to create modal dialog window -- must be closed elsewhere
    onFeatureSelect: function(e)
    {
        feature = dhpMapsView.currentFeature.feature;

        var selectedFeature;

        if (feature.cluster) {
            selectedFeature = feature.cluster[0];
        } else {
            selectedFeature = feature;
        }

        dhpMapsView.callBacks.showMarkerModal(selectedFeature);
    }, // onFeatureSelect()

        // PURPOSE: Resizes map-specific elements when browser size changes
    dhpUpdateSize: function()
    {
        var newRowHeight, checkboxMargin;

            //resize legend term position for long titles
        jQuery('.active-legend .terms').css({top:jQuery('.active-legend .legend-title').height()});

            //resize legend items that are two lines and center checkbox
        jQuery('.active-legend .row').each(function(key,value){
                //height of row containing text(could be multiple lines)
            newRowHeight   = jQuery('.columns', this).eq(1).height();
                // variable to center checkbox in row
            checkboxMargin = (newRowHeight - dhpMapsView.checkboxHeight) / 2;
                // set elements in rows with new values
            jQuery('.columns', this).eq(0).height(newRowHeight);
            jQuery('.columns', this).eq(0).find('input').css({'margin-top': checkboxMargin});
        });

            // This is an Leaflet function to redraw the markers after map resize
        dhpMapsView.mapLeaflet.invalidateSize();
    }, // dhpUpdateSize()

        // RETURNS: true if touch is supported
    isTouchSupported: function () {
        var msTouchEnabled = window.navigator.msMaxTouchPoints;
        var generalTouchEnabled = "ontouchstart" in document.createElement("div");
     
            if (msTouchEnabled || generalTouchEnabled) {
                return true;
            }
        return false;
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
                project: dhpMapsView.projectID
            },
            success: function(data, textStatus, XMLHttpRequest)
            {
console.log("Returned data = "+data);
                dhpMapsView.createDataObjects(JSON.parse(data));
                    // Remove Loading modal
                dhpMapsView.callBacks.remLoadingModal();
                jQuery('.reveal-modal-bg').remove();

                    // Enable joyride help tips
                dhpMapsView.callBacks.userTipsOn();
            },
            error: function(XMLHttpRequest, textStatus, errorThrown)
            {
               alert(errorThrown);
            }
        });
    } // loadMapMarkers()

};
