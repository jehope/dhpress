// PURPOSE: Handle viewing Project content visualizations
// ASSUMES: dhpData is used to pass parameters to this function via wp_localize_script()
//          The sidebar is marked with HTML div as "secondary"
//          Section for marker modal is marked with HTML div as "markerModal"
//          An area for the map has been marked with HTML div as "dhp-visual"
// USES:    JavaScript libraries jQuery, Underscore, Bootstrap ...
// NOTES:   Format of Marker and Legend data is documented in dhp-project-functions.php
//          Format of project settings is documented in dhp-class-project.php
//          The class active-legend is added to whichever legend is currently visible and selected
// TO DO:   Generalize visualization types better (don't assume maps) -- don't pass map or layers settings
//          Seperate loading of markers from building of legends and other screen components

jQuery(document).ready(function($) {
        // Project variables
    var dhpSettings, rawAjaxData, projectID, ajaxURL;
    var allMarkers = [];    // All marker posts assoc. w/ Project; see data desc in createMarkerArray() of dhp-project-functions.php

        // Variables specific to particular visualizations
        // ===============================================

        // Map visualization variables
    var viewMap = [];
        // Contains fields: olMap, gg, sm, selectControl, hoverControl, mapMarkerLayer
        //                  catFilter = All values for currently selected Legend; see data desc in getIconsForTerms() of dhp-project-functions.php
        //                  catFilterSelect = Current selection of legend/categories; Subset of catFilter.terms


    // projectID      = $('.post').attr('id');
    ajaxURL        = dhpData.ajax_url;
    dhpSettings    = dhpData.settings;
    projectID      = dhpSettings["project-details"]["id"];

        // insert top navigational bar and controls
    $('body').prepend(Handlebars.compile($("#dhp-script-nav-bar").html()));

        // Insert Marker modal window HTML
    $('body').append(Handlebars.compile($("#dhp-script-markerModal").html()));

        // initialize fullscreen mode settings
    if(dhpSettings['views']['map-fullscreen']==true){
        $('body').addClass('fullscreen');
        $('.dhp-nav .fullscreen').addClass('active');
    }

        // handle toggling fullscreen mode
    $('.dhp-nav .fullscreen').click(function(){
        if($('body').hasClass('fullscreen')) {
            $('body').removeClass('fullscreen');
            $('.dhp-nav .fullscreen').removeClass('active');
            viewMap.olMap.updateSize();
        } else {
            $('body').addClass('fullscreen');
            $('.dhp-nav .fullscreen').addClass('active');
            viewMap.olMap.updateSize();
        }
    });

        // handle turning joyride tips on/off
    $('.dhp-nav .tips').click(function(){
        if($('.dhp-nav .tips').hasClass('active')) {
            $('.dhp-nav .tips').removeClass('active');
            $('#dhpress-tips').joyride('hide');
        } else {
            $('#dhpress-tips').joyride('restart');
            $('.dhp-nav .tips').addClass('active');
        }
    });

    $('<style type="text/css"> @media screen and (min-width: 600px) { #dhp-visual{ width:'+dhpSettings['views']['map-width']+'px; height:'+dhpSettings['views']['map-height']+'px;}} </style>').appendTo('head');

        // Map visualization?
    if (getEntryPointByType('map')) {
            // Add map elements to top nav bar
        $('.dhp-nav .nav-pills').append(Handlebars.compile($("#dhp-script-map-menus").html()));

            // Insert Legend area on right sidebar
        $('#secondary').prepend(Handlebars.compile($("#dhp-script-map-legend-head").html()));
        initializeMap();

            // Handle reset button
        $('.olControlZoom').append('<div class="reset-map"><i class="icon-white icon-refresh"></i></div>');
        $('.olControlZoom .reset-map').click(function(){
            resetMap();
        });

            // Add user tips for map
        $('body').append(Handlebars.compile($("#dhp-script-map-joyride").html()));
    }

        // Transcription views?
    if (getEntryPointByType('transcript')) {
        dhpTranscript.initialize();
    }

        // Map visualization?
    if (getEntryPointByType('map')) {
        loadMapMarkers();
    }


    // ========================= FUNCTIONS

        // RETURNS: Entry point of dhpSettings array whose type is theType
        // ASSUMES: dhpSettings loaded, in correct format
    function getEntryPointByType(theType) {
        var theEP;
        theEP = _.find(dhpSettings['entry-points'],
                        function(thisEP) { return (thisEP["type"] == theType); });
        if (theEP !== undefined && theEP !== null) {
            return theEP["settings"];
        } else {
            return null;
        }
    }

        // RETURNS: entry in the modal-ep array whose name is modalName
        // TO DO:   Put into Project object class??
    function findModalEpSettings(modalName) {
        return (_.find(dhpSettings['views']['modal-ep'],
                        function(theName) {
                            return (theName == modalName); })
                != undefined);
    }

        // PURPOSE: Bring up Loading pop-box modal dialog -- must be hidden by caller
    function createLoadingMessage()
    {
        $('body').append(Handlebars.compile($("#dhp-script-modal-loading").html()));   
        $('#loading').modal({backdrop:false});
        $('#loading').modal('show');
    } // createLoadingMessage()


        // PURPOSE: Reset center and scale of map
        // ASSUMES: gg has been initialized and is accessible; dhpSettings loaded
    function resetMap()
    {
        var mapSettings;

        mapSettings = getEntryPointByType('map');

        var lonlat = new OpenLayers.LonLat(mapSettings["lon"],mapSettings["lat"]);
        lonlat.transform(viewMap.gg, viewMap.olMap.getProjectionObject());
        viewMap.olMap.setCenter(lonlat, mapSettings["zoom"]);
    }

        // PURPOSE: Initialize map viewing area with controls and layers
        // RETURNS: Layer in which markers to be added
    function initializeMap()
    {
        var olMarkerInterface;
        var olMapTemplate;
        var mapLayers = [];
        var olStyle, olClusterStrategy;
        var mapSettings;
        var opacity;
        var newLayer;

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
                    highParentI = getHighestParentIcon(cats);
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
                    highParentI = getHighestParentColor(cats);
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

        viewMap.catFilter = new Object();

            // Initialize each map layer
        mapSettings = getEntryPointByType('map');

            // Create layers for maps as well as controls for each
        _.each(mapSettings.layers, function(theLayer, index) {
            opacity = 1;
            if(theLayer['opacity']) {
                opacity = theLayer['opacity'];
            }
            switch (theLayer['mapType']) {
            case 'type-OSM':
                newLayer = new OpenLayers.Layer.OSM();
                newLayer.setOpacity(opacity);
                break;
            case 'type-Google':
                newLayer = new OpenLayers.Layer.Google(theLayer['name'],
                                { type: theLayer['mapTypeId'], numZoomLevels: 20, opacity: opacity, animationEnabled: true});
                break;
            case 'type-CDLA':
                cdla.maps.defaultAPI(cdla.maps.API_OPENLAYERS);
                var cdlaObj = new cdla.maps.Map(theLayer['mapTypeId']);
                newLayer = cdlaObj.layer();
                newLayer.setOpacity(opacity);
                break;
            } // switch
            mapLayers.push(newLayer);
        }); // each sourceLayers

        viewMap.gg = new OpenLayers.Projection("EPSG:4326");
        viewMap.sm = new OpenLayers.Projection("EPSG:900913");

        //var osm = new OpenLayers.Layer.OSM(); 

        viewMap.olMap = new OpenLayers.Map({
            div: "dhp-visual",
            projection: viewMap.sm,
            displayProjection: viewMap.gg
        });
        viewMap.olMap.addLayers(mapLayers);

        //map.addControl(new OpenLayers.Control.LayerSwitcher());

        resetMap();

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

        viewMap.mapMarkerLayer = new OpenLayers.Layer.Vector(mapSettings['marker-layer'],{
            strategies: [olClusterStrategy],
            rendererOptions: { zIndexing: true }, 
            styleMap: new OpenLayers.StyleMap(olStyle)
        });

        viewMap.selectControl = new OpenLayers.Control.SelectFeature(viewMap.mapMarkerLayer,
            { onSelect: onOLFeatureSelect, onUnselect: onOLFeatureUnselect, hover: false });

        viewMap.hoverControl = new OpenLayers.Control.SelectFeature(viewMap.mapMarkerLayer, 
            { hover: true, highlightOnly: true, renderIntent: "temporary" });

        //mapMarkerLayer.id = "Markers";
        viewMap.olMap.addLayer(viewMap.mapMarkerLayer);
        viewMap.olMap.addControl(viewMap.hoverControl);
        viewMap.olMap.addControl(viewMap.selectControl);

        viewMap.hoverControl.activate();  
        viewMap.selectControl.activate();
    } // initializeMap()


    // function createLookup(filter){
    //     viewMap.catFilter = filter;

    //     var catFilterSelect = filter.terms;
    //     var countTerms = Object.keys(viewMap.catFilterSelect).length; 
      
    //     for(i=0;i<countTerms;i++) {
    //         var tempName = catFilterSelect[i].id;
    //         lookupParents[tempName];
    //         lookupParents[tempName] = { externalGraphic : catFilterSelect[i].icon_url };
            
    //     }
    //     //alert(JSON.stringify(lookupParents));
    //     return lookupParents;
       
    // }

        // PURPOSE: Called by olMarkerInterface to determine icon to use for marker
        // RETURNS: First match on URL to use for icon, or else ""
        // INPUT:   catValues = array of IDs (integers) associated with a feature/marker
        // ASSUMES: catFilterSelect has been loaded
        // TO DO:   Make recursive function?
    function getHighestParentIcon(catValues) {
        var countTerms = viewMap.catFilterSelect.length; 
        var countCats = catValues.length;
        var thisCat, thisCatID;
        var thisMarkerID;
        var catChildren;
        var i,j,k;

        for(i=0;i<countTerms;i++) {         // for all category values
            thisCat = viewMap.catFilterSelect[i];
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
    } // getHighestParentIcon()


        // PURPOSE: Called by olMarkerInterface to determine color to use for marker
        // RETURNS: First match on color to use for icon, or else ""
        // INPUT:   catValues = array of category IDs (integers) associated with a feature/marker
        // ASSUMES: catFilterSelect has been loaded
        // TO DO:   Make recursive function?
    function getHighestParentColor(catValues) {
        var countTerms = viewMap.catFilterSelect.length; 
        var countCats = catValues.length;
        var thisCat, thisCatID;
        var thisMarkerID;
        var catChildren;
        var i,j,k;

        for(i=0;i<countTerms;i++) {         // for all category values
            thisCat = viewMap.catFilterSelect[i];
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
    } // getHighestParentColor()


        // PURPOSE: Create HTML for all of the legends for this visualization
        // INPUT:   legendList = array of legends to display; each element has field "name" and array "terms" of [id, name, icon_url ]
    function createLegends(legendList) {
            // Custom event types bound to the document to be triggered elsewhere
        $(document).bind('order.findSelectedCats',function(){ viewMap.catFilterSelect= findSelectedCats();});
        $(document).bind('order.updateLayerFeatures',function(){ updateLayerFeatures();});

        //console.log('here'+_.size(legendList));
        var legendHtml;
        var legendWidth;
        var mapPosition = $('#dhp-visual').position();
        var mapWidth = $('#dhp-visual').width();
        var pageWidth = $('body').width();
        var pageHeight = $('body').height();
        var spaceRemaining = pageWidth-mapWidth;

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
            legendHtml = $('<div class="'+legendName+' legend-div span12 row" id="term-legend-'+legIndex+'"><h1>'+legendName+'</h1><ul class="terms"></ul></div>');
                // Create entries for all of the terms (do not represent children of terms)
            _.each(filterTerms, function(theTerm) {
                if(legendName!=theTerm.name) {
                    var firstIconChar = theTerm.icon_url.substring(0,1);
                    var icon;
                    if(firstIconChar=='#') { icon = 'background:'+theTerm.icon_url; }
                    else { icon = 'background: url(\''+theTerm.icon_url+'\') no-repeat center;'; }

                        // Only check the first 50 terms in each Legend
                    if(++countTerms>50) {
                        $('ul', legendHtml).append('<li class="compare"><input type="checkbox" ><p class="icon-legend" style="'+icon+'"></p><a class="value" data-id="'+theTerm.id+'">'+theTerm.name+'</a></li>');
                    } else {
                        $('ul', legendHtml).append('<li class="compare"><input type="checkbox" checked="checked"><p class="icon-legend" style="'+icon+'"></p><a class="value" data-id="'+theTerm.id+'">'+theTerm.name+'</a></li>');
                    }
                }
            });
            $('ul',legendHtml).prepend(Handlebars.compile($("#dhp-script-map-legend-hideshow").html()));

            $('#legends .legend-row').append(legendHtml);
                // Add Legend title to dropdown menu above
            $('.dhp-nav .dropdown-menu').append('<li><a href="#term-legend-'+legIndex+'">'+legendName+'</a></li>');
        });

            //$('#legends').css({'left':0, 'top':50,'z-index':19});
            // Handle resizing Legend (min/max)
        $('#legends').prepend('<a class="legend-resize btn pull-right" href="#" alt="mini"><i class="icon-resize-small"></i></a>');
        $('.legend-resize').hide();
        $('#legends').hover(function(){
            $('.legend-resize').fadeIn(100);
        },
        function() {
            $('.legend-resize').fadeOut(100);
        });
        $('.legend-resize').click(function(){
            if($('#legends').hasClass('mini')) {
                $('.terms .value').show();
                $('#legends').animate({width: legendWidth}, 500 );
                $('#legends').removeClass('mini');
            }
            else {
                //console.log($('#legends').width())
                legendWidth = $('#legends').width();
                $('.terms .value').hide();
                $('#legends').animate({width: 70}, 500 );
                $('#legends').addClass('mini');
            }
        });
            //$('#legends').css({
        // $('.active-legend').mousemove(function(e){
        //     var xpos = e.pageX - 250;
        //     var ypos = e.pageY + 15;
        //     //$('#child_legend-'+j+'').css({'left':xpos,'top':ypos});
        // });
            //var childrenLegendHtml = $('<div id="child_legend-'+j+'"><h3>Children Terms</h3><ul></ul></div>');
            //$('body').append(childrenLegendHtml);
            //$('#child_legend-'+j+'').css({'width':'200px','margin-left':'200px','top':'40px','position':'absolute','z-index': '2001' });

            // Handle user selection of value name from current Legend on right
        $('#legends ul.terms li a').click(function(event){
            var spanName = $(this).data('id');

                // "Hide/Show all" button
            if(spanName==='all') {
                    // Should legend values now be checked or unchecked?
                var boxState = $(this).closest('li').find('input').prop('checked');
                $('.active-legend ul li').find('input').prop('checked',!boxState);
                viewMap.catFilterSelect = findSelectedCats();
                updateLayerFeatures();
            }
                // a specific legend/category value (ID#)
            else {
                    // uncheck everything
                $('.active-legend ul input').removeAttr('checked');
                $('.active-legend ul.terms li.selected').removeClass('selected');
                    // select just this item
                $(this).closest('li').addClass('selected');
                $(this).closest('li').find('input').prop('checked',true);
                viewMap.catFilterSelect = findSelectedCats(spanName);
                updateLayerFeatures();
            }
        });
            // $('#term-legend-'+j+' ul.terms li').hover(function(){
            //     $('#child_legend-'+j+'').show();
            //     var childrenLegend = _.where(filterTerms, {name: $(this).find('a').text()})
                
            //     $(childrenLegend[0].children).each(function(){
            //         $('ul', childrenLegendHtml).append('<li>'+this+'</li>')
            //     });
            // }, 
            // function() {
            //     $('#child_legend-'+j+' ul li').remove();
            //     $('#child_legend-'+j+'').hide();
            // });

            // Handle user selection of checkbox from current Legend on right
        $('#legends ul.terms input').click(function(event){
            var spanName = $(event.target).parent().find('a').data('id');
            if( spanName==='all' && $(this).prop('checked') === true ) {
                $('.active-legend ul li').find('input').prop('checked',true);
                viewMap.catFilterSelect = findSelectedCats();
                updateLayerFeatures();
            }
            else if(spanName==='all'&& $(this).prop('checked') === false ) {
                $('.active-legend ul li').find('input').prop('checked',false);
                viewMap.catFilterSelect = findSelectedCats();
                updateLayerFeatures();
            }
            else {
                $('.active-legend ul li.check-all').find('input').prop('checked',false);                  
                viewMap.catFilterSelect = findSelectedCats();
                updateLayerFeatures();
            }
        });
        $('ul.controls li').click(function(){
            $('.active-legend ul input').attr('checked',true);           
        });

        $('#legends .legend-row').append('<div class="legend-div span12" id="layers-panel"><ul></ul></div>');
        $('.legend-div').hide();

            // Show Legend 0 by default
        $('#term-legend-0').show();
        $('#term-legend-0').addClass('active-legend');

            // Handle selection of different Legends
        $('.dhp-nav .dropdown-menu a').click(function(evt){
            evt.preventDefault();
            var action = $(this).attr('href');
            var filter = $(this).text();
            $('.legend-div').hide();
            $('.legend-div').removeClass('active-legend');
            $(action).addClass('active-legend');
            
            $(action).show();
            switchFilter(filter);
        });

            // Handle selection of Layers button on top
        $('.dhp-nav .layers a').click(function(evt){
            evt.preventDefault();
            var action = $(this).attr('href');
            var filter = $(this).text();
            $('.legend-div').hide();
            $('.legend-div').removeClass('active-legend');
            $(action).addClass('active-legend');
            
            $(action).show();
        });

        // $('.launch-timeline').click(function(){
        //     loadTimeline('4233');  
        // });
        viewMap.catFilterSelect = findSelectedCats();
    } // createLegends()


        // PURPOSE: Create UI controls for opacity of each layer in right (Legend) area
        // ASSUMES: map.layers has been initialized, settings are loaded
        //          HTML element "layers-panel" has been inserted into document
        // NOTE:    The final map layer is for Markers, so has no corresponding user settings

    function buildLayerControls() {
        var layerSettings;
        var layerOpacity;

        layerSettings = getEntryPointByType('map');
        layerSettings = layerSettings.layers;

        _.each(viewMap.olMap.layers,function(thisLayer,index){
            //console.log(layer.name)
            layerOpacity = 1;
            if(layerSettings[index]) {
                layerOpacity = layerSettings[index]['opacity'];
                if(!layerOpacity){
                    layerOpacity = 1;
                }
            }
            $('#layers-panel ul').append('<li class="layer'+index+' row-fluid"><div class="span12"><input type="checkbox" checked="checked"><a class="value" id="'+thisLayer.id+'">'+thisLayer.name+'</a></div><div class="span11"><div class="layer-opacity"></div></div></li>');

                // Create slider to control layer opacity
            $( '.layer'+index+' .layer-opacity').slider({
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
            $( '.layer'+index+' input').click(function(){
                if($(this).attr('checked')) {
                    thisLayer.setVisibility(true);
                } else {
                    thisLayer.setVisibility(false);
                }
            });
        });
    } // buildLayerControls()


        // PURPOSE: Handle user selecting new legend category
        // INPUT:   filterName = name of legend/category selected
        // ASSUMES: rawAjaxData has been assigned, selectControl has been initialized
        // SIDE-FX: Changes catFilter
    function switchFilter(filterName) {
        var filterObj = _.where(rawAjaxData, {type: "filter", name: filterName});
        viewMap.catFilter = filterObj[0];
        $(document).trigger('order.findSelectedCats').trigger('order.updateLayerFeatures');
        viewMap.selectControl.activate(); 
    }


        // PURPOSE: Update map's feature layer after user chooses a new legend acc. to values in catFilterSelect
        // ASSUMES: allMarkers contains all of the possible marker objects; catFilterSelect set to current legend selection
    function updateLayerFeatures(){
        var newFeatures = {type: "FeatureCollection", features: []};        // marker set resulting from current selection
        var allCategoryIDs = [];                                            // list of selected IDs

            // Flatten out categories (and their children) as IDs
        _.each(viewMap.catFilterSelect,function(theCategory){
            allCategoryIDs.push(theCategory.id);
            if (theCategory.children) {
                _.each(theCategory.children, function(catChild) {
                    allCategoryIDs.push(catChild['term_id']);
                });
            }
        });
            // Go through all markers and find just those which have values matching current categories
        newFeatures.features = _.filter(allMarkers.features, function(theMarker){
            if(_.intersection(theMarker.properties.categories, allCategoryIDs).length > 0) {
               return theMarker;
            }
        });
        var reader = new OpenLayers.Format.GeoJSON({
            'externalProjection': viewMap.gg,
            'internalProjection': viewMap.sm
        });

        var featureData = reader.read(newFeatures);
            // Marker layer must be the last layer on the array!
        var myLayer = viewMap.olMap.layers[viewMap.olMap.layers.length-1];
        myLayer.removeAllFeatures();
        myLayer.addFeatures(featureData);
    } // updateLayerFeatures()


        // PURPOSE: Handle user selection of a legend value, so that only markers with that value shown
        // INPUT:   singleID = ID of the Legend value to select
        // RETURNS: Array of term objects from catFilter that match current UI selection based on ID
        // TO DO:   Rewrite this to eliminate loop
        // ASSUMES: catFilter is null or contains lists of terms for current Legend/Filter
    function findSelectedCats(singleID) {
        var selCatFilter = [];
        var countTerms = 0; 
        if(viewMap.catFilter) {
            countTerms = Object.keys(viewMap.catFilter.terms).length;
        }

        if(singleID) {
            var i, tempFilter;
            for(i=0;i<countTerms;i++) {
                tempFilter = viewMap.catFilter.terms[i];
                if(tempFilter.id==singleID) {
                    selCatFilter[0] = tempFilter;
                    break;
                }
            }

            // unknown, or multiple selection from legend
        } else {
            var i, tempSelCat, tempFilter;
            $('#legends .active-legend li.compare input:checked').each(function(index){
                tempSelCat = $(this).parent().find('.value').data( 'id' );
                //console.log(tempSelCat+' :'+index)
                for(i=0;i<countTerms;i++) {
                    tempFilter = viewMap.catFilter.terms[i];
                    if(tempFilter.id==tempSelCat) {
                        selCatFilter[index] = tempFilter;
                        // console.log(tempFilter, tempSelCat);
                    }
                }
            });
        }
        return selCatFilter;
    } // findSelectedCats()


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
    function onOLFeatureSelect(feature) {
    	// if not cluster

    	//if(!feature.cluster||(feature.attributes.count==1)) {
        var selectedFeature;
        var titleAtt='';
        var builtHTML, thumbHtml='';
        var link1, link2;
        // var tagAtt;

        if (feature.cluster)
            selectedFeature = feature.cluster[0];
        else
            selectedFeature = feature;

        if(dhpSettings['views']['title']) {
            titleAtt =  selectedFeature.attributes['title'];
        }

        link1  = selectedFeature.attributes.link;
        link2  = selectedFeature.attributes.link2;
        // tagAtt = selectedFeature.attributes.categories;

            // Remove anything currently in body -- will rebuild from scratch
        $('.modal-body').empty();

            // Does feature lead to transcript window? Build transcript controls in modal
        if(findModalEpSettings('transcript')) {
            $('#markerModal').addClass('transcript');

            var transcriptSettings = {
                'audio'         : selectedFeature.attributes.audio,
                'transcript'    : selectedFeature.attributes.transcript,
                'transcript2'   : selectedFeature.attributes.transcript2,
                'timecode'      : selectedFeature.attributes.timecode,
                'startTime'     : -1,
                'endTime'       : -1
            };

            if(transcriptSettings.timecode) {
                var time_codes = transcriptSettings.timecode.split('-');
                transcriptSettings.startTime = dhpTranscript.convertToMilliSeconds(time_codes[0]);
                transcriptSettings.endTime   = dhpTranscript.convertToMilliSeconds(time_codes[1]);
            }

            dhpTranscript.prepareOneTranscript(ajaxURL, projectID, '#markerModal .modal-body', transcriptSettings);
         }

            // Create HTML for all of the data related to the Marker
         if(dhpSettings['views']['content']) {
            builtHTML = '<div><h3>Details:</h3></div>';
            _.each(selectedFeature.attributes.content,function(val) {       // Array of (hash) pairs
                 _.each(val,function(val1,key1) {
                    if(val=='Thumbnail Right') {
                        builtHTML += '<div class="thumb-right">'+val1+'</div>';
                    }
                    else if(val=='Thumbnail Left') {
                        builtHTML += '<div class="thumb-left">'+val1+'</div>';
                    }
                    else {
                        if(val1) {
                            builtHTML += '<div><i>'+key1+'</i>: '+val1+'</div>';
                        }
                    }
                });
            });
        }

		if(selectedFeature.attributes.thumb) {
			thumbHtml = '<img src="'+selectedFeature.attributes.thumb+'"/><br/>';
		}
		var li = '<b>'+titleAtt+'</b><p>';
		if(thumbHtml){
			li+= thumbHtml;
		}
        // builtHTML += li + tagAtt + ' ' + settings.audio + ' ' + settings.transcript + ' ' + settings.timecode + '</p>';
        // builtHTML += li + tagAtt + '</p>';
        builtHTML += li + '</p>';
        $('.modal-body').append(builtHTML);

            // clear previous marker links
        $('#markerModal .modal-footer .btn-success').remove();

        $('#markerModal #markerModalLabel').empty().append(titleAtt);

            // setup links
        if(link1 && link1!='no-link') {
            $('#markerModal .modal-footer').prepend('<a target="_blank" class="btn btn-success" href="'+link1+'">'+dhpSettings['views']['link-label']+'</a>');
        }
        if(link2 && link2 !='no-link') {
            $('#markerModal .modal-footer').prepend('<a target="_blank" class="btn btn-success" href="'+link2+'">'+dhpSettings['views']['link2-label']+'</a>');
        }

        $('#markerModal').modal('show');
    } // onOLFeatureSelect()


        // PURPOSE: Handle unselection of a map feature
    function onOLFeatureUnselect(feature) {
    	feature.attributes.poppedup = false;
    }


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
    function createMapMarkers(data) {
        rawAjaxData = data;
        // console.log(rawAjaxData);

        var legends = [];

            // Assign data to appropriate objects
        _.each(rawAjaxData, function(val){
            switch(val.type) {
            case 'filter':
                legends.push(val);
                break;
            case 'FeatureCollection':
                allMarkers = val;
                break;
            }
        });

            // Set current filter to the first legend by default
        viewMap.catFilter  = legends[0];
        createLegends(legends);

        buildLayerControls();

    	var reader = new OpenLayers.Format.GeoJSON({
                'externalProjection': viewMap.gg,
                'internalProjection': viewMap.sm
        });

    	var featureData = reader.read(allMarkers);
        viewMap.mapMarkerLayer.addFeatures(featureData);
    //player.pause();
    } // createMapMarkers()


        //PURPOSE: To check a map feature for coordinates
        //RETURNS: Boolean
        //TODO: Refine coordinate check
    // function checkForCoordinates(feature) {
    //     //if cordinate values length is greater than 1 return true
    //     var tempFeature = feature;
    //     var check = false;
    //     if(tempFeature.geometry) {
    //         if(tempFeature.geometry.coordinates&&tempFeature.geometry.coordinates[0]&&tempFeature.geometry.coordinates[1]) {
    //             if(tempFeature.geometry.coordinates[0].length>1&&tempFeature.geometry.coordinates[1].length>1&&tempFeature.geometry.coordinates[0]!==null,tempFeature.geometry.coordinates[1]!==null)
    //                 check = true;
    //         }
    //     }
    //     return check;
    // }

        // TO DO:  Everything; get size from EP paraemters…
    function createTimeline(data) {
        //console.log(data);
        createStoryJS({
            type:       'timeline',
            width:      '960',
            height:     '600',
            source:     'http://msc.renci.org/dev/wp-content/plugins/dhp/js/test.json',
            embed_id:   'timeline'           // ID of the DIV you want to load the timeline into
        });
    }

        // PURPOSE: Get markers associated with projectID via AJAX, insert into mLayer of map
    function loadMapMarkers()
    {
        //console.log('loading');
        //$('.modal-backdrop').css({'opacity':0.1});
        createLoadingMessage();
    	jQuery.ajax({
            type: 'POST',
            url: ajaxURL,
            data: {
                action: 'dhpGetMarkers',
                project: projectID
            },
            success: function(data, textStatus, XMLHttpRequest){
                createMapMarkers(JSON.parse(data));
                //$('#markerModal').modal({backdrop:true});
                    // Remove Loading modal
                $('#loading').modal('hide');
                    // Enable joyride help tips
                $("#dhpress-tips").joyride({'tipLocation': 'right'});
                $('.dhp-nav .tips').removeClass('active');
                $('.joyride-close-tip').click(function(){
                    $('.dhp-nav .tips').removeClass('active');
                });
                //$('#markerModal .loading-content').remove();   
            },
            error: function(XMLHttpRequest, textStatus, errorThrown){
               alert(errorThrown);
            }
        });
    } // loadMapMarkers()


    function loadTimeline(projectID){
        jQuery.ajax({
            type: 'POST',
            url: ajaxURL,
            data: {
                action: 'dhpGetTimeline',
                project: projectID
            },
            success: function(data, textStatus, XMLHttpRequest){
                //console.log(textStatus);
                createTimeline(JSON.parse(data));
            },
            error: function(XMLHttpRequest, textStatus, errorThrown){
               alert(errorThrown);
            }
        });
    }
});

