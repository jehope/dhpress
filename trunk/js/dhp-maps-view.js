// DH Press Maps View -- contains all data and functions for rendering maps with help of dhpCustomMaps
// ASSUMES: The sidebar is marked with HTML div as "secondary"
//          An area for the map has been marked with HTML div as "dhp-visual"
//          That the custom maps "library" has already been loaded with corresponding map entries
// NOTES:   Format of Marker and Legend data is documented in dhp-project-functions.php
//          The class active-legend is added to whichever legend is currently visible and selected

// USES:    JavaScript libraries jQuery, Underscore, Bootstrap ...


var dhpMapsView = {

        // Contains fields: olMap, gg, sm, selectControl, hoverControl, mapMarkerLayer
        //					ajaxURL, projectID, mapEP, transcriptEP, viewParams
        //					rawAjaxData
        //					allMarkers = All marker posts assoc. w/ Project; see data desc in createMarkerArray() of dhp-project-functions.php
        //                  catFilter = All values for currently selected Legend; see data desc in getIconsForTerms() of dhp-project-functions.php
        //                  catFilterSelect = Current selection of legend/categories; Subset of catFilter.terms


        // PURPOSE: Initialize map viewing area with controls and layers
        // INPUT:   ajaxURL      = URL to WP
        //			projectID    = ID of project
        //			mapEP        = settings for map entry point (from project settings)
        //			transcriptEP = settings for transcript entry point (from project settings)
        //			viewParams   = settings for view (from project settings)
    initializeMap: function(ajaxURL, projectID, mapEP, transcriptEP, viewParams)
    {
        var olMarkerInterface;
        var olMapTemplate;
        var mapLayers = [];
        var olStyle, olClusterStrategy;
        var mapSettings;
        var opacity;
        var newLayer;

        	// Save reset data for later
        dhpMapsView.ajaxURL 	= ajaxURL;
        dhpMapsView.projectID 	= projectID;
        dhpMapsView.mapEP		= mapEP;
        dhpMapsView.transcriptEP= transcriptEP;
        dhpMapsView.viewParams 	= viewParams;

            //Update map size if browser is resized
        jQuery(window).resize(function() { dhpMapsView.updateSize(); });

            // Interface for OpenLayers to determine visual features of a map marker
        olMarkerInterface = {
            getIcon: function(feature) {
                var cats;
                if(feature.cluster) {
                    cats = feature.cluster[0].attributes.categories;
                } else {    
                    cats = feature.attributes["categories"];
                }
                var highParentI ='';
                if(cats) {
                    highParentI = dhpMapsView.getHighestParentIcon(cats);
                }
                if(!highParentI){
                    return '';
                } else {
                    return highParentI;
                }
            },
            getColor: function(feature) {
                var cats;
                if(feature.cluster) {
                    cats = feature.cluster[0].attributes.categories;
                } else {    
                    cats = feature.attributes["categories"];
                }
                var highParentI ='';
                if(cats) {
                    highParentI = dhpMapsView.getHighestParentColor(cats);
                }
                return highParentI;
            },
            getLabel: function(feature) {
                if(feature.cluster.length>1) {
                    return feature.cluster.length;
                } else {
                    return '';
                }
            }
        };

        dhpMapsView.catFilter = new Object();

            // Create layers for maps as well as controls for each
        _.each(mapEP.layers, function(theLayer, index) {

            opacity = 1;
            if(theLayer['opacity']) {
                opacity = theLayer['opacity'];
            }
            switch (theLayer['mapType']) {
            case 'type-OSM':
                var thisLayer = dhpData.vizParams.layerData[index];
                var arrayOSM = thisLayer.dhp_map_url.split(',');
                if(arrayOSM.length>1) {
                    newLayer = new OpenLayers.Layer.OSM(thisLayer.dhp_map_shortname,arrayOSM);
                }
                else {
                    newLayer = new OpenLayers.Layer.OSM();
                }
                // new OpenLayers.Layer.OSM("MapQuest-OSM Tiles", arrayOSM);
                newLayer.setOpacity(opacity);
                break;
            case 'type-Google':
                newLayer = new OpenLayers.Layer.Google(theLayer['name'],
                                { type: theLayer['mapTypeId'], numZoomLevels: 20, opacity: opacity, animationEnabled: true});
                break;
            case 'type-DHP':
                dhpCustomMaps.maps.defaultAPI(dhpCustomMaps.maps.API_OPENLAYERS);
                var dhpObj = new dhpCustomMaps.maps.Map(theLayer['mapTypeId']);
                newLayer = dhpObj.layer();
                newLayer.setOpacity(opacity);
                break;
            } // switch
            mapLayers.push(newLayer);
        }); // each sourceLayers

        dhpMapsView.gg = new OpenLayers.Projection("EPSG:4326");
        dhpMapsView.sm = new OpenLayers.Projection("EPSG:900913");

        OpenLayers.Util.onImageLoadErrorColor = "transparent";   
        // OpenLayers.Util.onImageLoadError = function() {
        //      this.src = '';
        // };

        dhpMapsView.olMap = new OpenLayers.Map({
            div: "dhp-visual",
            projection: dhpMapsView.sm,
            displayProjection: dhpMapsView.gg
        });
        dhpMapsView.olMap.addLayers(mapLayers);

        //map.addControl(new OpenLayers.Control.LayerSwitcher());

        dhpMapsView.resetMap();

        olMapTemplate = {
            fillColor: "${getColor}",
            strokeColor: "#333333",
            pointRadius: 10, // using olMarkerInterface.getSize(feature)
            width:20,
            externalGraphic: "${getIcon}", //olMarkerInterface.getIcon(feature)
            graphicZIndex: 1
            // label:"${getLabel}"
        };

        olStyle = new OpenLayers.Style(olMapTemplate, {context: olMarkerInterface});
        olClusterStrategy = new OpenLayers.Strategy.Cluster();
        olClusterStrategy.distance = 1;

        dhpMapsView.mapMarkerLayer = new OpenLayers.Layer.Vector(mapEP["marker-layer"], {
            strategies: [olClusterStrategy],
            rendererOptions: { zIndexing: true }, 
            styleMap: new OpenLayers.StyleMap(olStyle)
        });

        dhpMapsView.selectControl = new OpenLayers.Control.SelectFeature(dhpMapsView.mapMarkerLayer,
            { onSelect: dhpMapsView.onOLFeatureSelect, hover: false });

        dhpMapsView.hoverControl  = new OpenLayers.Control.SelectFeature(dhpMapsView.mapMarkerLayer, 
            { hover: true, highlightOnly: true, renderIntent: "temporary" });

        //mapMarkerLayer.id = "Markers";
        dhpMapsView.olMap.addLayer(dhpMapsView.mapMarkerLayer);
        dhpMapsView.olMap.addControl(dhpMapsView.hoverControl);
        dhpMapsView.olMap.addControl(dhpMapsView.selectControl);

        dhpMapsView.hoverControl.activate();  
        dhpMapsView.selectControl.activate();

            // Setup reset button and add foundation icons for zoom in/out
        jQuery('.olControlZoom').append('<a class="reset-map olButton"><i class="fi-refresh"></i></a');
        jQuery('.olControlZoomIn').empty().addClass('fi-plus');
        jQuery('.olControlZoomOut').empty().addClass('fi-minus');
        jQuery('.olControlZoom .reset-map').on('touchend',function(){
            dhpMapsView.resetMap();
        });
        jQuery('.olControlZoom .reset-map').on('click',function(){
            dhpMapsView.resetMap();
        });

        dhpMapsView.updateSize();
        dhpMapsView.loadMapMarkers();
    }, // initializeMap()

        // PURPOSE: Reset center and scale of map
        // ASSUMES: gg has been initialized and is accessible; dhpSettings loaded
    resetMap: function()
    {
        var lonlat = new OpenLayers.LonLat(dhpMapsView.mapEP.lon, dhpMapsView.mapEP.lat);
        lonlat.transform(dhpMapsView.gg, dhpMapsView.olMap.getProjectionObject());
        dhpMapsView.olMap.setCenter(lonlat, dhpMapsView.mapEP.zoom);
    }, // resetMap()


    updateSize: function()
    {   
        //set body height to viewport so user can't scroll map
        if(jQuery('body').hasClass('fullscreen')){
                //New WordPress has a mobile admin bar with larger height
            if(jQuery('body').hasClass('logged-in') && jQuery(window).width() > 782) {
                jQuery('body').height(jQuery(window).height()-32);
            }
            else if (jQuery('body').hasClass('logged-in') && jQuery(window).width() < 783) {
                jQuery('body').height(jQuery(window).height()-46);
            }
                //Non logged in users
            else {
                jQuery('body').height(jQuery(window).height());
            }
        }
            //resize legend items that are two lines and center checkbox
        var newHeight,checkMargin;
        jQuery('.row').each(function(key,value){
            newHeight   = jQuery('.columns', this).eq(1).height();
            if(newHeight < 35) { newHeight = 35; }
            checkMargin = (newHeight - 10) / 2;
            jQuery('.columns', this).eq(0).height(newHeight);
            jQuery('.columns', this).eq(0).find('input').css({'margin-top': checkMargin});
        });

		dhpMapsView.olMap.updateSize();
    },

        // PURPOSE: Called by olMarkerInterface to determine icon to use for marker
        // RETURNS: First match on URL to use for icon, or else ""
        // INPUT:   catValues = array of IDs (integers) associated with a feature/marker
        // ASSUMES: catFilterSelect has been loaded
        // TO DO:   Make recursive function?
    getHighestParentIcon: function(catValues)
    {
        var countTerms = dhpMapsView.catFilterSelect.length; 
        var countCats = catValues.length;
        var thisCat, thisCatID;
        var thisMarkerID;
        var catChildren;
        var i,j,k;

        for(i=0;i<countTerms;i++) {         // for all category values
            thisCat = dhpMapsView.catFilterSelect[i];
            thisCatID = thisCat.id;

            for(j=0;j<countCats;j++) {      // for all marker values
                thisMarkerID = catValues[j];

                    // Have we matched this item itself?
                if (thisCatID==thisMarkerID) {
                        // Confirm that it looks like a URL (http://...)
                    if(thisCat.icon_url.substring(0,1) == 'h') {
                        return thisCat.icon_url;
                    } else {
                        return '';
                    }
                }
                    // Check for matches amongst its children
                else {
                    catChildren = thisCat.children;
                    for (k=0;k<catChildren.length;k++) {
                        if(catChildren[k].term_id==thisMarkerID) {
                           if(thisCat.icon_url.substring(0,1) == 'h') {
                                return thisCat.icon_url;
                            }
                            else {
                                return '';
                            }
                        }
                    }
                }
           }
        }
    }, // getHighestParentIcon()


        // PURPOSE: Called by olMarkerInterface to determine color to use for marker
        // RETURNS: First match on color to use for icon, or else ""
        // INPUT:   catValues = array of category IDs (integers) associated with a feature/marker
        // ASSUMES: catFilterSelect has been loaded
        // TO DO:   Make recursive function?
    getHighestParentColor: function(catValues)
    {
        var countTerms = dhpMapsView.catFilterSelect.length; 
        var countCats = catValues.length;
        var thisCat, thisCatID;
        var thisMarkerID;
        var catChildren;
        var i,j,k;

        for(i=0;i<countTerms;i++) {         // for all category values
            thisCat = dhpMapsView.catFilterSelect[i];
            thisCatID = thisCat.id;

            for(j=0;j<countCats;j++) {      // for all marker values
                // legend categories
                thisMarkerID = catValues[j];

                    // have we matched this element?
                if (thisCatID===thisMarkerID) {
                    if(thisCat.icon_url.substring(0,1) == '#') {
                        return thisCat.icon_url;
                    } else {
                        return '';
                    }
                    // check for matches on its children
                } else {
                    catChildren = thisCat.children;
                    for (k=0;k<catChildren.length;k++) {
                        if(catChildren[k].term_id==thisMarkerID) {
                           if(thisCat.icon_url.substring(0,1) == '#') {
                                return thisCat.icon_url;
                            } else {
                                return '';
                            }
                        }
                    }
                }
           }
        }
    }, // getHighestParentColor()


        // PURPOSE: Create HTML for all of the legends for this visualization
        // INPUT:   legendList = array of legends to display; each element has field "name" and array "terms" of [id, name, icon_url ]
    createLegends: function(legendList)
    {
            // Custom event types bound to the document to be triggered elsewhere
        jQuery(document).bind('order.findSelectedCats',function(){ dhpMapsView.catFilterSelect= dhpMapsView.findSelectedCats();});
        jQuery(document).bind('order.updateLayerFeatures',function(){ dhpMapsView.updateLayerFeatures();});

        //console.log('here'+_.size(legendList));
        var legendHtml;
        var legendHeight;
        var mapPosition		= jQuery('#dhp-visual').position();
        var mapWidth 		= jQuery('#dhp-visual').width();
        var pageWidth 		= jQuery('body').width();
        var pageHeight 		= jQuery('body').height();
        var spaceRemaining 	= pageWidth-mapWidth;

        var rightDiv = mapPosition.left + 50;
        var topDiv = mapPosition.top + 40;

            // Create new Legend with bootstrap collapse
        // var newLegendsHtml = $('<div class="new-legends"/>');
        // _.each(legendList, function(val,index) {
        //     $(newLegendsHtml).append('<div class="legend-'+index+'" />');
        //     $('.legend-'+index, newLegendsHtml).append('<h3>'+val.name+'</h3>');
        //     $('.legend-'+index, newLegendsHtml).append('<div class="accordion" id="accordion-'+index+'" />');
        //     //console.log('Legend Name: '+val.name)
        //     //console.log(val)
        //         // Go through all terms in this category and its children (if any)
        //     _.each(val.terms, function(val2,index2) {
        //         if(val.name!=val2.name) {
        //             // console.log('Term: '+val2.name)
        //             var firstIconChar = val2.icon_url.substring(0,1);
        //             var icon;
        //                 // Is it an icon or color?
        //             if(firstIconChar=='#') { icon = 'background:'+val2.icon_url+';'; }
        //             else { icon = 'background: url(\''+val2.icon_url+'\') no-repeat center;'; }

        //             var tempLink = $('<div/>');
        //             $(tempLink).append('<a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion-'+index+'" href="#term-'+index+index2+'">'+val2.name+'</a>');

        //             var tempGroup = $('<div/>');
        //             $(tempGroup).append('<div class="accordion-heading"><input type="checkbox" checked="checked"><p class="icon-legend" style="'+icon+' display: inline-block; width: 15px; height: 15px; margin-top: 10px;"></p>'+$(tempLink).html()+'</div>');
                    
        //             // Any child terms ?
        //             if(val2.children.length>0) {
        //                 $(tempGroup).append('<div id="term-'+index+index2+'" class="accordion-body collapse"><div class="accordion-inner" /></div>');
        //                 _.each(val2.children, function(val3,index3) {
        //                     // console.log('Children Terms: '+val3)
        //                     $('.accordion-inner', tempGroup).append(val3+'<br/>');
        //                 });
        //             }
        //             $('#accordion-'+index, newLegendsHtml).append('<div class="accordion-group">'+$(tempGroup).html()+'</div>')
        //         }
        //     });
        // });
        //$('#legends').append(newLegendsHtml)

            // Build Legend controls on the right (category toggles) for each legend value and insert Legend name into dropdown above
        _.each(legendList, function(theLegend, legIndex) {
            var filterTerms = theLegend.terms;
            var legendName = theLegend.name;
            var countTerms = 0;

                // "Root" DIV for this particular Legend
            legendHtml = jQuery('<div class="'+legendName+' legend-div" id="term-legend-'+legIndex+'"><div class="legend-title">'+legendName+'</div><div class="terms"></div></div>');
                // Create entries for all of the terms (do not represent children of terms)
            _.each(filterTerms, function(theTerm) {
                if(legendName!=theTerm.name) {
                    var firstIconChar = theTerm.icon_url.substring(0,1);
                    var icon;
                    if(firstIconChar=='#') { icon = 'background:'+theTerm.icon_url; }
                    else { icon = 'background: url(\''+theTerm.icon_url+'\') no-repeat right; background-size: 50%;'; }

                    jQuery('.terms', legendHtml).append('<div class="row compare">'+
                          '<div class="small-4 large-2 columns" style="'+icon+'"><input type="checkbox" checked="checked"></div>'+
                          // '<div class="small-1 large-1 columns"><div class="icon-legend" style="'+icon+'"></div></div>'+
                          '<div class="small-8 large-10 columns"><a class="value" data-id="'+theTerm.id+'">'+theTerm.name+'</a></div>'+
                        '</div>');
                }
            });
            jQuery('.terms',legendHtml).prepend(Handlebars.compile(jQuery("#dhp-script-map-legend-hideshow").html()));

            jQuery('#legends .legend-row').append(legendHtml);
                // Add Legend title to dropdown menu above
            jQuery('.dhp-nav .legend-dropdown').append('<li><a href="#term-legend-'+legIndex+'">'+legendName+'</a></li>');         
        });

            //Initialize new foundation elements
        jQuery(document).foundation();
            //configure marker modal
        jQuery('#markerModal').foundation('reveal', {
            animation: 'fadeAndPop',
            animation_speed: 250,
            close_on_background_click: true,
            close_on_esc: true,
            dismiss_modal_class: 'close-marker',
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
        if(jQuery('body').hasClass('isMobile')) {
            jQuery('body').on('touchend', function(evt) {
                if(jQuery(evt.target).hasClass('reveal-modal-bg')) {
                    jQuery('#markerModal').foundation('reveal', 'close');
                }            
            });
        }
            // On modal close unselect features
        jQuery(document).on('closed', '#markerModal', function () {
            dhpMapsView.onOLFeatureUnselect();
        });

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

            // Handle user selection of value name from current Legend on right
        jQuery('#legends div.terms .row a').on('click', function(event){
            var spanName = jQuery(this).data('id');
                // "Hide/Show all" button
            if(spanName==='all') {
                    // Should legend values now be checked or unchecked?
                var boxState = jQuery(this).closest('.row').find('input').prop('checked');
                jQuery('.active-legend .terms .row').find('input').prop('checked',!boxState);
                dhpMapsView.catFilterSelect = dhpMapsView.findSelectedCats();
                dhpMapsView.updateLayerFeatures();
            }
                // a specific legend/category value (ID#)
            else {
                    // uncheck everything
                jQuery('.active-legend .terms input').removeAttr('checked');
                jQuery('.active-legend .terms .row.selected').removeClass('selected');
                    // select just this item
                jQuery(this).closest('.row').addClass('selected');
                jQuery(this).closest('.row').find('input').prop('checked',true);
                dhpMapsView.catFilterSelect = dhpMapsView.findSelectedCats(spanName);
                dhpMapsView.updateLayerFeatures();
            }
        });

            // Handle user selection of checkbox from current Legend on right
        jQuery('#legends div.terms input').on('click', function(event){
            var spanName = jQuery(event.target).parent().find('a').data('id');
            if( spanName==='all' && jQuery(this).prop('checked') === true ) {
                jQuery('.active-legend .terms .row').find('input').prop('checked',true);
                dhpMapsView.catFilterSelect = dhpMapsView.findSelectedCats();
                dhpMapsView.updateLayerFeatures();
            }
            else if(spanName==='all' && jQuery(this).prop('checked') === false ) {
                jQuery('.active-legend .terms .row').find('input').prop('checked',false);
                dhpMapsView.catFilterSelect = dhpMapsView.findSelectedCats();
                dhpMapsView.updateLayerFeatures();
            }
            else {
                jQuery('.active-legend .terms .check-all').find('input').prop('checked',false);                  
                dhpMapsView.catFilterSelect = dhpMapsView.findSelectedCats();
                dhpMapsView.updateLayerFeatures();
            }
        });
            // Add Layers to legends
        jQuery('#legends .legend-row').append('<div class="legend-div" id="layers-panel"><div class="legend-title">Layer Controls</div></div>');
        jQuery('.legend-div').hide();

            // Show Legend 0 by default
        jQuery('#term-legend-0').show();
        jQuery('#term-legend-0').addClass('active-legend');

            // Handle selection of different Legends
        jQuery('.dhp-nav .legend-dropdown a').on('click', function(evt){
            evt.preventDefault();
            var action = jQuery(this).attr('href');
            var filter = jQuery(this).text();
            jQuery('.legend-div').hide();
            jQuery('.legend-div').removeClass('active-legend');
            jQuery(action).addClass('active-legend');

            jQuery(action).show();
            dhpMapsView.switchFilter(filter);
        });

            // Handle selection of Layers button on top
        jQuery('.dhp-nav .layers a').on('click', function(evt){
            evt.preventDefault();
            var action = jQuery(this).attr('href');
            var filter = jQuery(this).text();
            jQuery('.legend-div').hide();
            jQuery('.legend-div').removeClass('active-legend');
            jQuery(action).addClass('active-legend');

            jQuery(action).show();
        });

        // $('.launch-timeline').on('click', function(){
        //     loadTimeline('4233');  
        // });
        dhpMapsView.catFilterSelect = dhpMapsView.findSelectedCats();
    }, // createLegends()


        // PURPOSE: Create UI controls for opacity of each layer in right (Legend) area
        // ASSUMES: map.layers has been initialized, settings are loaded
        //          HTML element "layers-panel" has been inserted into document
        // NOTE:    The final map layer is for Markers, so has no corresponding user settings

    buildLayerControls: function()
    {
        var layerOpacity;
        var layerSettings = dhpMapsView.mapEP.layers;

        _.each(dhpMapsView.olMap.layers,function(thisLayer,index){
            //console.log(layer.name)
            layerOpacity = 1;
            if(layerSettings[index]) {
                layerOpacity = layerSettings[index]['opacity'];
                if(!layerOpacity){
                    layerOpacity = 1;
                }
            }
            jQuery('#layers-panel').append('<div class="layer'+index+'">'+
                '<div class="row"><div class="columns small-12 large-12"><input type="checkbox" checked="checked"> '+
                '<a class="value" id="'+thisLayer.id+'">'+thisLayer.name+'</a></div></div>'+
                '<div class="row"><div class="columns small-12 large-12"><div class="layer-opacity"></div></div></div>'+
                '</div>');

                // Create slider to control layer opacity
            jQuery('.layer'+index+' .layer-opacity').slider({
                range: false,
                min: 0,
                max: 1,
                step:.05,
                values: [ layerOpacity ],
                slide: function( event, ui ) {
                  thisLayer.setOpacity(ui.values[ 0 ]);                
                }
            });
                // Handle turning on and off map layer
            jQuery( '.layer'+index+' input').on('click', function(){
                if(jQuery(this).attr('checked')) {
                    thisLayer.setVisibility(true);
                } else {
                    thisLayer.setVisibility(false);
                }
            });
        });
    }, // buildLayerControls()

        // PURPOSE: Handle user selecting new legend category
        // INPUT:   filterName = name of legend/category selected
        // ASSUMES: rawAjaxData has been assigned, selectControl has been initialized
        // SIDE-FX: Changes catFilter
    switchFilter: function(filterName)
    {
        var filterObj = _.where(dhpMapsView.rawAjaxData, {type: "filter", name: filterName});
        dhpMapsView.catFilter = filterObj[0];
        jQuery(document).trigger('order.findSelectedCats').trigger('order.updateLayerFeatures');
        dhpMapsView.selectControl.activate(); 
    },

        // PURPOSE: Update map's feature layer after user chooses a new legend acc. to values in catFilterSelect
        // ASSUMES: allMarkers contains all of the possible marker objects
        //			catFilterSelect set to current legend selection
        //			Marker layer is last layer in dhpMapsView.olMap.layers array
    updateLayerFeatures: function()
    {
        var newFeatures = {type: "FeatureCollection", features: []};        // marker set resulting from current selection
        var allCategoryIDs = [];                                            // list of selected IDs

            // Flatten out categories (and their children) as IDs
        _.each(dhpMapsView.catFilterSelect,function(theCategory){
            allCategoryIDs.push(theCategory.id);
            if (theCategory.children) {
                _.each(theCategory.children, function(catChild) {
                    allCategoryIDs.push(catChild['term_id']);
                });
            }
        });
            // Go through all markers and find just those which have values matching current categories
        newFeatures.features = _.filter(dhpMapsView.allMarkers.features, function(theMarker){
            if(_.intersection(theMarker.properties.categories, allCategoryIDs).length > 0) {
               return theMarker;
            }
        });
        var reader = new OpenLayers.Format.GeoJSON({
            'externalProjection': dhpMapsView.gg,
            'internalProjection': dhpMapsView.sm
        });

        var featureData = reader.read(newFeatures);
            // Marker layer must be the last layer in the array!
        var myLayer = dhpMapsView.olMap.layers[dhpMapsView.olMap.layers.length-1];
        myLayer.removeAllFeatures();
        myLayer.addFeatures(featureData);
    }, // updateLayerFeatures()


        // PURPOSE: Handle user selection of a legend value, so that only markers with that value shown
        // INPUT:   singleID = ID of the Legend value to select
        // RETURNS: Array of term objects from catFilter that match current UI selection based on ID
        // TO DO:   Rewrite this to eliminate loop
        // ASSUMES: catFilter is null or contains lists of terms for current Legend/Filter
    findSelectedCats: function(singleID)
    {
        var selCatFilter = [];
        var countTerms = 0;

        if(dhpMapsView.catFilter) {
            countTerms = Object.keys(dhpMapsView.catFilter.terms).length;
        }

        if(singleID) {
            var i, tempFilter;
            for(i=0;i<countTerms;i++) {
                tempFilter = dhpMapsView.catFilter.terms[i];
                if(tempFilter.id==singleID) {
                    selCatFilter[0] = tempFilter;
                    break;
                }
            }
            // unknown, or multiple selection from legend
        } else {
            var i, tempSelCat, tempFilter;
            jQuery('#legends .active-legend .compare input:checked').each(function(index){
                tempSelCat = jQuery(this).closest('.row').find('.columns .value').data( 'id' );
                for(i=0;i<countTerms;i++) {
                    tempFilter = dhpMapsView.catFilter.terms[i];
                    if(tempFilter.id==tempSelCat) {
                        selCatFilter[index] = tempFilter;
                        // console.log(tempFilter, tempSelCat);
                    }
                }
            });
        }
        return selCatFilter;
    }, // findSelectedCats()


    // function geocodeAddress(addy){
    // 	//http://maps.google.com/maps/api/geocode/json?address=Pizzeria+Da+Vittorio,+Rome&sensor=false
    // 	jQuery.ajax({
    //         type: 'POST',
    //         url: 'http://maps.google.com/maps/api/geocode/json?address=Pizzeria+Da+Vittorio,+Rome&sensor=false',
    //         dataType:'jsonp',
    //         data: {
    //             address: addy
    //         },
    //         success: function(data, textStatus, XMLHttpRequest){
    //             //console.log('geocode: '+textStatus);
    //             //console.log(data);
    //             //

    //         },
    //         error: function(XMLHttpRequest, textStatus, errorThrown){
    //            alert(errorThrown);
    //         }
    //     });
    // }

        // PURPOSE: Handle user selection of a marker on a map to bring up modal
        // INPUT:   feature = the feature selected on map
        // ASSUMES: Can use only first feature if a cluster of features is passed
        // SIDE-FX: Modifies DOM to create modal dialog window
        // TO DO:   Show category values for Marker by using them as indices into filters??
    onOLFeatureSelect: function(feature)
    {
        var selectedFeature;
        var titleAtt='';
        var builtHTML;
        var link1, link2;
        // var tagAtt;

        if (feature.cluster)
            selectedFeature = feature.cluster[0];
        else
            selectedFeature = feature;

        if(dhpMapsView.viewParams['post-view-title']) {
            titleAtt =  selectedFeature.attributes['title'];
        }

        link1  = selectedFeature.attributes.link;
        link2  = selectedFeature.attributes.link2;
        // tagAtt = selectedFeature.attributes.categories;

            // Remove anything currently in body -- will rebuild from scratch
        jQuery('.modal-body').empty();

            // Does feature lead to transcript window? Build transcript controls in modal
        if(dhpMapsView.transcriptEP) {
            jQuery('#markerModal').addClass('transcript');

            var transcriptSettings = {
                'audio'         : selectedFeature.attributes.audio,
                'transcript'    : selectedFeature.attributes.transcript,
                'transcript2'   : selectedFeature.attributes.transcript2,
                'timecode'      : selectedFeature.attributes.timecode,
                'startTime'     : -1,
                'endTime'       : -1
            };

            if (transcriptSettings.timecode) {
                var time_codes = transcriptSettings.timecode.split('-');
                transcriptSettings.startTime = dhpTranscript.convertToMilliSeconds(time_codes[0]);
                transcriptSettings.endTime   = dhpTranscript.convertToMilliSeconds(time_codes[1]);
            }

            dhpTranscript.prepareOneTranscript(dhpMapsView.ajaxURL, dhpMapsView.projectID, '#markerModal .modal-body', transcriptSettings);
         }

            // Create HTML for all of the data related to the Marker
         if (dhpMapsView.viewParams['content']) {
            builtHTML = '<div><h3>Details:</h3></div>';
            _.each(selectedFeature.attributes.content,function(val) {       // Array of (hash) pairs
                 _.each(val,function(val1, key1) {

                    if (key1==='Thumbnail Right') {
                        builtHTML += '<div class="thumb-right">'+val1+'</div>';
                    }
                    else if (key1==='Thumbnail Left') {
                        builtHTML += '<div class="thumb-left">'+val1+'</div>';
                    }
                    else {
                        if (val1) {
                            builtHTML += '<div><i>'+key1+'</i>: '+val1+'</div>';
                        }
                    }
                });
            });
        }

	
        jQuery('.modal-body').append(builtHTML);

            // clear previous marker links
        jQuery('#markerModal .reveal-modal-footer .marker-link').remove();
            // Change title
        jQuery('#markerModal #markerModalLabel').empty().append(titleAtt);

            // setup links
        if (link1 && link1!='no-link') {
            jQuery('#markerModal .reveal-modal-footer .button-group').prepend('<li><a target="_blank" class="button success marker-link" href="'+link1+'">'+dhpMapsView.viewParams['link-label']+'</a></li>');
        }
        if (link2 && link2 !='no-link') {
            jQuery('#markerModal .reveal-modal-footer .button-group').prepend('<li><a target="_blank" class="button success marker-link" href="'+link2+'">'+dhpMapsView.viewParams['link2-label']+'</a></li>');
        }   
            //Open modal
        jQuery('#markerModal').foundation('reveal', 'open');
        
    }, // onOLFeatureSelect()


        // PURPOSE: Handle unselection of a map feature
    onOLFeatureUnselect: function()
    {
        dhpMapsView.selectControl.unselectAll();
    },


    // function zoomCluster(){
    //     var displayedFeatures = [];
    //     var lay = olMap.layers[1];
    //     for (var i=0, len=lay.features.length; i<len; i++) {
    //         var featC = lay.features[i];
    //         if (featC.onScreen()) {
    //             displayedFeatures.push(featC);
    //         }
    //     }
    //     //console.log(displayedFeatures.length);
    //     if(displayedFeatures.length<2) {
    //         //console.log('only on left');
    //         return false;
    //     }
    //     else {
    //         return true;
    //     }
    // }
    //use STYLE to show different icons

        // PURPOSE: Create marker objects for map visualization; called by loadMapMarkers()
        // INPUT:   data = data as JSON object: Array of ["type", ...]
        //          mLayer = map layer into which the markers inserted 
        // SIDE-FX: assigns variables allMarkers, catFilter, rawAjaxData
        // TO DO:   Generalize visualization types; should createLegends() be called elsewhere?
    createMapMarkers: function(data)
    {
        dhpMapsView.rawAjaxData = data;
        // console.log(rawAjaxData);

        var legends = [];

            // Assign data to appropriate objects
        _.each(dhpMapsView.rawAjaxData, function(val) {
            switch(val.type) {
            case 'filter':
                legends.push(val);
                break;
            case 'FeatureCollection':
                dhpMapsView.allMarkers = val;
                break;
            }
        });

            // Set current filter to the first legend by default
        dhpMapsView.catFilter  = legends[0];
        dhpMapsView.createLegends(legends);
        dhpMapsView.buildLayerControls();

    	var reader = new OpenLayers.Format.GeoJSON({
                'externalProjection': dhpMapsView.gg,
                'internalProjection': dhpMapsView.sm
        });

    	var featureData = reader.read(dhpMapsView.allMarkers);
        dhpMapsView.mapMarkerLayer.addFeatures(featureData);
    }, // createMapMarkers()


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
                dhpMapsView.createMapMarkers(JSON.parse(data));
                //$('#markerModal').modal({backdrop:true});
                    // Remove Loading modal
                jQuery('#loading').foundation('reveal', 'close');
                jQuery('.reveal-modal-bg').remove();
                // jQuery('.reveal-modal-bg').css({'display':'none'});

                    // Enable joyride help tips
                jQuery("#dhpress-tips").joyride({'tipLocation': 'right'});
                jQuery('.dhp-nav .tips').removeClass('active');
                jQuery('.joyride-close-tip').on('click', function() {
                    jQuery('.dhp-nav .tips').removeClass('active');
                });
                //$('#markerModal .loading-content').remove();   
            },
            error: function(XMLHttpRequest, textStatus, errorThrown)
            {
               alert(errorThrown);
            }
        });
    } // loadMapMarkers()

};