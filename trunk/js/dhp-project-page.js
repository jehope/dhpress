// PURPOSE: Handle viewing Project content visualizations
// ASSUMES: dhpData is used to pass parameters to this function via wp_localize_script()
//          Some other parameters passed by being embedded in HTML: .post.id
// USES:    JavaScript libraries jQuery, Underscore, Bootstrap ...
// NOTES:   Legends data is in the format: Array [ name, terms: Array [ name, id, icon_url, children: Array [ name ] ] ]
//          If icon_url starts with #, it is a color in hex; otherwise a URL
//          The class active-legend is added to whichever legend is currently visible and selected
// TO DO:   Generalize visualization types better (don't assume maps)
//          Change computation of tcArray so that it contains the endtime of the clip rather than
//              beginning -- this will speed up search in hightlightTranscriptLine()

jQuery(document).ready(function($) {
        // Project variables
    var projectID, ajax_url, rawAjaxData, dhpSettings;
    var catFilter;          // Contains all values for currently selected Legend; field "terms" is array of objects, each having name, id and children (array of same)
    var catFilterSelect;     // Array indicating current selection of Legend values; each object has fields: name, id, icon_url, and children (array of term_id)
    var allMarkers;         // All possible marker posts assoc. w/ Project; field "features" is an array of objects which contain field "categories" which is array of IDs

        // Map visualization variables 
    var map, dhpMap, gg, sm, olMarkerInterface, selectControl, hoverControl;

        // A/V player variables
    var tcArray, player, clipPosition, videoHasPlayed, rowIndex;

        // dead variables
    // var lookupParents;

    projectID = $('.post').attr('id');

    videoHasPlayed = false;
    ajax_url = dhpData.ajax_url;
    dhpSettings = JSON.parse(dhpData.settings);

    // lookupParents = new Object();
    allMarkers = [];
    catFilter = new Object();

    dhpMap = dhpData.map;

    $('#map_marker').append('<div class="info"></div><div class="av-transcript"></div>');

        // insert navigational controls
    $('#secondary').prepend('<div id="legends" class="span4"><div class="legend-row row-fluid"></div></div>');
    $('body').prepend('<div class="dhp-nav nav-fixed-top navbar"><div class="navbar-inner"><ul class="nav nav-pills ">\
          <li class="dropdown">\
            <a class="dropdown-toggle" data-toggle="dropdown" href="#"><i class="icon-list"></i>  Legends<b class="caret"></b></a>\
            <ul class="dropdown-menu">\
                  <!-- links -->\
            </ul>\
          </li>\
          <li class="layers"><a href="#layers-panel"><i class="icon-tasks"></i> Layers </a></li>\
          <li class="fullscreen" ><a href="#"><i class="icon-fullscreen"></i> Fullscreen map </a></li>\
          <li class="tips active" ><a href="#"><i class="icon-info-sign"></i> Tips </a></li>\
        </ul></div>');

        // initialize fullscreen mode settings
    if(dhpSettings['views']['map-fullscreen']==true){
        $('body').addClass('fullscreen');
        $('.dhp-nav .fullscreen').addClass('active');
    }

    $('<style type="text/css"> @media screen and (min-width: 600px) { #map_div{ width:'+dhpSettings['views']['map-width']+'px; height:'+dhpSettings['views']['map-height']+'px;}} </style>').appendTo('head');

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

    initializeMap();

        // Handle reset button
    $('.olControlZoom').append('<div class="reset-map"><i class="icon-white icon-refresh"></i></div>');
    $('.olControlZoom .reset-map').click(function(){
        resetMap(dhpMap['lon'],dhpMap['lat'],dhpMap['zoom']);
    });
        // handle toggling fullscreen mode
    $('.dhp-nav .fullscreen').click(function(){
        if($('body').hasClass('fullscreen')) {
            $('body').removeClass('fullscreen');
            $('.dhp-nav .fullscreen').removeClass('active');
            map.updateSize();
        } else {
            $('body').addClass('fullscreen');
            $('.dhp-nav .fullscreen').addClass('active');
            map.updateSize();
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

        // PURPOSE: Reset center and scale of map
        // ASSUMES: gg has been initialized and is accessible
    function resetMap(lon, lat, zoomL) {
        var lonlat = new OpenLayers.LonLat(lon,lat);
        lonlat.transform(gg, map.getProjectionObject());
        map.setCenter(lonlat, zoomL);
    }

        // PURPOSE: Initialize map layers, map controls, etc.
    function initializeMap()
    {
        var layerCount;
        var olMapTemplate;
        var dhp_layers = [];
        var olStyle, olClusterStrategy;
        var mapMarkerLayer;

        // layerCount = Object.keys(dhpData.layers).length;
        // for(i=0;i<layerCount;i++) {

        _.each(dhpData.layers, function(theLayer) {
            var tempLayer;
            var tempOpacity = 1;
            if(theLayer['opacity']) {
                tempOpacity = theLayer['opacity'];
            }
            switch (theLayer['mapType']) {
            case 'type-OSM':
                tempLayer = new OpenLayers.Layer.OSM();
                tempLayer.setOpacity(tempOpacity);
                dhp_layers.push(tempLayer);
                break;
            case 'type-Google':
                tempLayer = new OpenLayers.Layer.Google(theLayer['name'],
                                { type: theLayer['mapTypeId'], numZoomLevels: 20, opacity: tempOpacity});
                dhp_layers.push(tempLayer);
                break;
            case 'type-CDLA':
                cdla.maps.defaultAPI(cdla.maps.API_OPENLAYERS);
                var cdlaObj = new cdla.maps.Map(theLayer['mapTypeId']);
                tempLayer = cdlaObj.layer();
                tempLayer.setOpacity(tempOpacity);
                dhp_layers.push(tempLayer);
                break;
            }
        });

        gg = new OpenLayers.Projection("EPSG:4326");
        sm = new OpenLayers.Projection("EPSG:900913");

        //var osm = new OpenLayers.Layer.OSM(); 

        map = new OpenLayers.Map({
            div: "map_div",
            projection: sm,
            displayProjection: gg
            
        });
        map.addLayers(dhp_layers);
        //load layers here

        //map.addControl(new OpenLayers.Control.LayerSwitcher());

        resetMap(dhpMap['lon'],dhpMap['lat'],dhpMap['zoom']);

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

        mapMarkerLayer = new OpenLayers.Layer.Vector(dhpMap['marker-layer'],{
            strategies: [olClusterStrategy],
            rendererOptions: { zIndexing: true }, 
            styleMap: new OpenLayers.StyleMap(olStyle)
        });

        selectControl = new OpenLayers.Control.SelectFeature(mapMarkerLayer,
            { onSelect: onOLFeatureSelect, onUnselect: onOLFeatureUnselect, hover: false });

        hoverControl = new OpenLayers.Control.SelectFeature(mapMarkerLayer, 
            { hover: true, highlightOnly: true, renderIntent: "temporary" });

        loadMapMarkers(projectID,mapMarkerLayer);

        //mapMarkerLayer.id = "Markers";
        map.addLayer(mapMarkerLayer);
        map.addControl(hoverControl);
        map.addControl(selectControl);

        hoverControl.activate();  
        selectControl.activate();
    } // initializeMap()


    // function createLookup(filter){
    //     catFilter = filter;

    //     var catFilterSelect = filter.terms;
    //     var countTerms = Object.keys(catFilterSelect).length; 
      
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
        // INPUT:   markerValues = one or more values associated with a feature/marker
        // ASSUMES: catFilterSelect has been loaded
        // TO DO:   Make recursive function?
    function getHighestParentIcon(markerValues) {
        var countTerms = Object.keys(catFilterSelect).length; 
        var countCats = markerValues.length;

        for(i=0;i<countTerms;i++) {         // for all category values
            var thisCatID = catFilterSelect[i].id;

            for(j=0;j<countCats;j++) {      // for all marker values
                var thisMarkerValue = markerValues[j];

                    // Have we matched this item itself?
                if (thisCatID==thisMarkerValue) {
                        // Confirm that it looks like a URL (http://...)
                    if(catFilterSelect[i].icon_url.substring(0,1) == 'h') {
                        return catFilterSelect[i].icon_url;
                    } else {
                        return '';
                    }
                }
                    // Check for matches amongst its children
                else {
                    var tempChildren = catFilterSelect[i].children;
                    var tempChildCount = tempChildren.length;
                    for (k=0;k<tempChildCount;k++) {
                        if(tempChildren[k].term_id==thisMarkerValue) {
                           if(catFilterSelect[i].icon_url.substring(0,1) == 'h') {
                                return catFilterSelect[i].icon_url;
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
        // INPUT:   markerValues = one or more values associated with a feature/marker
        // ASSUMES: catFilterSelect has been loaded
        // TO DO:   Make recursive function
    function getHighestParentColor(markerValues) {
        var countTerms = Object.keys(catFilterSelect).length; 

        //current marker values
        var countCats =  Object.keys(markerValues).length; 

        for(i=0;i<countTerms;i++) {         // for all category values
            var thisCatID = catFilterSelect[i].id;

            for(j=0;j<countCats;j++) {      // for all marker values
                // legend categories
                var thisMarkerValue = markerValues[j];

                    // have we matched this element?
                if (thisCatID===thisMarkerValue) {
                    if(catFilterSelect[i].icon_url.substring(0,1) == '#') {
                        return catFilterSelect[i].icon_url;
                    } else {
                        return '';
                    }

                    // check for matches on its children
                } else {
                    var tempChildCount = Object.keys(catFilterSelect[i].children).length;
                    if(tempChildCount>0) {
                        var tempChildren = catFilterSelect[i].children;

                        for (k=0;k<tempChildCount;k++) {
                            if(tempChildren[k].term_id==thisMarkerValue) {
                               if(catFilterSelect[i].icon_url.substring(0,1) == '#') {
                                    return catFilterSelect[i].icon_url;
                                } else {
                                    return '';
                                }
                            }
                        }
                    }
                }
           }
        }
    } // getHighestParentColor()


    // function getHighestParentDisplay(categories) {
    //     var catFilterSelect = catFilter.terms;
    //     var countTerms = Object.keys(catFilterSelect).length; 
    //     var countCats = categories.length;

    //     for(i=0;i<countTerms;i++) {
    //         for(j=0;j<countCats;j++) {
    //             var tempName = catFilterSelect[i].id;
    //             if (tempName==categories[j]) {              
    //                 return true;
    //             } else {
    //                 //for each child cat
    //                 var tempChildren = catFilterSelect[i].children;
    //                 var tempChildCount = tempChildren.length;
    //                 for (k=0;k<tempChildCount;k++) {
    //                     if(tempChildren[k]==categories[j]) {
    //                         return 'none';
    //                     }
    //                 }
    //             }
    //         }        
    //     }
    // }

        // PURPOSE: Create HTML for all of the legends for this visualization
        // INPUT:   legendList = array of legends to display; each element has field "name" and array "terms" of [id, name, icon_url ]
    function createLegends(legendList) {
            // Custom event types bound to the document to be triggered elsewhere
        $(document).bind('order.findSelectedCats',function(){ catFilterSelect= findSelectedCats();});
        $(document).bind('order.updateLayerFeatures',function(){ updateLayerFeatures();});

        //console.log('here'+_.size(legendList));
        var legendHtml;
        var legendWidth;
        var mapPosition = $('#map_div').position();
        var mapWidth = $('#map_div').width();
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

                // Create for all of the terms (do not represent children of terms)
            legendHtml = $('<div class="'+legendName+' legend-div span12 row" id="term-legend-'+legIndex+'"><h1>'+legendName+'</h1><ul class="terms"></ul></div>');
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
            $('ul',legendHtml).prepend('<li class="check-all"><input type="checkbox" checked="checked"><a class="value" data-id="all">Hide/Show All</a></li>');

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
                catFilterSelect = findSelectedCats();
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
                catFilterSelect = findSelectedCats(spanName);
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
                catFilterSelect = findSelectedCats();
                updateLayerFeatures();
            }
            else if(spanName==='all'&& $(this).prop('checked') === false ) {
                $('.active-legend ul li').find('input').prop('checked',false);
                catFilterSelect = findSelectedCats();
                updateLayerFeatures();
            }
            else {
                $('.active-legend ul li.check-all').find('input').prop('checked',false);                  
                catFilterSelect = findSelectedCats();
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
        catFilterSelect = findSelectedCats();

        buildLayerControls(map.layers);
    } // createLegends()


        // PURPOSE: Create UI controls for opacity of each layer; called by createLegends
        // ASSUMES: map has been initialized

    function buildLayerControls() {
        //console.log(map.layers);
        _.each(map.layers,function(thisLayer,index){
            //console.log(layer.name)
            if(index>=0) {
                var layerOpacity = 1;
                if(dhpData.layers[index]) {
                    layerOpacity = dhpData.layers[index]['opacity'];
                    if(!layerOpacity){
                        layerOpacity = 1;
                    }
                }
                $('#layers-panel ul').append('<li class="layer'+index+' row-fluid"><div class="span12"><input type="checkbox" checked="checked"><a class="value" id="'+thisLayer.id+'">'+thisLayer.name+'</a></div><div class="span11"><div class="layer-opacity"></div></div></li>');

                //slider for layer opacity
                $( '.layer'+index+' .layer-opacity').slider({
                    range: false,
                    min: 0,
                    max: 1,
                    step:.05,
                    values: [ layerOpacity ],
                    slide: function( event, ui ) {    
                      map.layers[index].setOpacity(ui.values[ 0 ]);                
                    }
                });
                //click
                $( '.layer'+index+' input').click(function(){
                    if($(this).attr('checked')) {
                        //console.log('check')
                        map.layers[index].setVisibility(true);
                    } else {
                    //console.log('uncheck')
                        map.layers[index].setVisibility(false);
                    }
                });

            }
        });
    } // buildLayerControls()


        // PURPOSE: Handle user selecting new legend category
        // INPUT:   filterName = name of legend/category selected
        // ASSUMES: rawAjaxData has been assigned, selectControl has been initialized
        // SIDE-FX: Changes catFilter
    function switchFilter(filterName) {
        var filterObj = _.where(rawAjaxData, {type: "filter", name: filterName});
        catFilter = filterObj[0];
        $(document).trigger('order.findSelectedCats').trigger('order.updateLayerFeatures');
        selectControl.activate(); 
    }

        // PURPOSE: Update map's feature layer after user chooses a new legend acc. to values in catFilterSelect
        // ASSUMES: allMarkers contains all of the possible marker objects; catFilterSelect set to current legend selection
    function updateLayerFeatures(){
        //find all features with cat
        //catFilterSelect = findSelectedCats(); 
        //categoryTree = catFilterSelect;
        var newFeatures = {type: "FeatureCollection", features: []};        // marker set resulting from current selection
        var allCategoryIDs = [];                                            // list of selected IDs
            // Flatten out categories (and their children) as IDs
        _.each(catFilterSelect,function(theCategory){
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
            'externalProjection': gg,
            'internalProjection': sm
        });

        var featureData = reader.read(newFeatures);
        //marker layer should be the last layer on the map(length-1)
        var myLayer = map.layers[map.layers.length-1];
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
        if(catFilter) {
            countTerms = Object.keys(catFilter.terms).length;
        }

        if(singleID) {
            var i, tempFilter;
            for(i=0;i<countTerms;i++) {
                tempFilter = catFilter.terms[i];
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
                    tempFilter = catFilter.terms[i];
                    if(tempFilter.id==tempSelCat) {
                        selCatFilter[index] = tempFilter;
                        // console.log(tempFilter, tempSelCat);
                    }
                }
            });
        }
        return selCatFilter;
    } // findSelectedCats()

        // PURPOSE: Convert timecode string into # of milliseconds
        // INPUT:   timecode in format [HH:MM:SS], SS can be in floating point format SS.ss
        // TO DO:   Use RegEx to parse
    function convertToMilliSeconds(timecode) {
        var tempN = timecode.replace("[","");
        var tempM = tempN.replace("]","");
        var tempArr = tempM.split(":");

        var secondsCode = parseInt(tempArr[0])*3600 + parseInt(tempArr[1])*60 + parseFloat(tempArr[2]);
        var milliSecondsCode = secondsCode*1000;

        return milliSecondsCode;
    }

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
        // INPUT:   feature = the feature selected on map ?? format??
        // ASSUMES: Can use only first feature if a cluster of features is passed
        // SIDE-FX: Modifies DOM for modal dialog window
        // TO DO:   Put code to create modal in another function, as it will be called by other
        //              visualization types
    function onOLFeatureSelect(feature) {
    	// if not cluster

    	//if(!feature.cluster||(feature.attributes.count==1)) {
        var tempModalHtml;
        var selectedFeature;

        if (feature.cluster)
            selectedFeature = feature.cluster[0];
        else
            selectedFeature = feature;

        // console.log(dhpSettings)
        tempModalHtml = $('<div><ul/></div>');

		 var link1 = selectedFeature.attributes.link;
         var link2 = selectedFeature.attributes.link2;
		 var titleAtt;
         var tagAtt =  selectedFeature.attributes.categories;
         var audio =  selectedFeature.attributes.audio;
         var transcript =  selectedFeature.attributes.transcript;
         var transcript2 =  selectedFeature.attributes.transcript2; ///change php to send transcript2 link
         var timecode =  selectedFeature.attributes.timecode;
         var time_codes = null; 

         if(dhpSettings['views']['title']) {
            titleAtt =  selectedFeature.attributes['title'];
         }

         //need to check for transcript here. TODO: check for 2nd transcript and load next to first without timestamps(should match first transcript)
         if(findModalEpSettings('transcript')) {
            time_codes = timecode.split('-');
            clipPosition = time_codes[0];
            var thumb;

             if(timecode) { 
                var startTime = convertToMilliSeconds(time_codes[0]);
                var endTime = convertToMilliSeconds(time_codes[1]);

            }
            $('#markerModal').addClass('transcript');
            _.each(dhpSettings['views']['modal-ep'],function(val,key) {
                rawAjaxData['transcriptData'] = [];
                loadTranscriptClip(projectID,transcript,timecode,1);
                if(transcript2&&transcript2!=='none') {
                    loadTranscriptClip(projectID,transcript2,timecode,2);
                }    
                $('ul', tempModalHtml).append('<li class="transcript-ep"><p class="pull-right"><iframe id="ep-player" class="player" width="100%" height="166" src="http://w.soundcloud.com/player/?url='+audio+'&show_artwork=true"></iframe></p></li>');
            });
         }
         if(dhpSettings['views']['content']) {
            $('ul', tempModalHtml).append('<li><h3>Details:</h3></li>');
            _.each(selectedFeature.attributes.content,function(val,key) {
                 _.each(val,function(val1,key1) {
                    if(val=='Thumbnail Right') {
                        $('ul', tempModalHtml).append('<li class="thumb-right">'+$("<div/>").html(val1).text()+'</li>');
                    }
                    else if(val=='Thumbnail Left') {
                        $('ul', tempModalHtml).append('<li class="thumb-left">'+$("<div/>").html(val1).text()+'</li>');
                    }
                    else {
                        if(val1) {
                            $('ul', tempModalHtml).append('<li>'+key1+': '+$("<div/>").html(val1).html()+'</li>');                       
                        }
                    }
                });
            });
        }

		if(selectedFeature.attributes.thumb){
			thumb = selectedFeature.attributes.thumb;
			var thumbHtml = '<img src="'+thumb+'"/><br/>';
		}
		var li = '<b>'+titleAtt+'</b>';

		li += '<p>';
		if(thumbHtml){
			li+= thumbHtml;
		}

		li += tagAtt+' '+audio+' '+transcript+' '+timecode+'</p>';

            // clear previous marker links
        $('#markerModal .modal-footer .btn-success').remove();

        $('#markerModal #markerModalLabel').empty().append(titleAtt);
        $('#markerModal .modal-body').empty().append(tempModalHtml);          
        
            // setup links
        if(link1!='no-link') {
            $('#markerModal .modal-footer').prepend('<a target="_blank" class="btn btn-success" href="'+link1+'">'+dhpSettings['views']['link-label']+'</a>');
        }
        if(link2!='no-link') {
            $('#markerModal .modal-footer').prepend('<a target="_blank" class="btn btn-success" href="'+link2+'">'+dhpSettings['views']['link2-label']+'</a>');
        }

        $('#markerModal').modal('show');

            // Setup audio/transcript player
        if(findModalEpSettings('transcript')) {
            //build function to load transcript clip and load media player
            var iframeElement   = document.querySelector('.player');
            var soundUrl = '';
            var iframeElementID = iframeElement.id;
            //var widget         = SC.Widget(iframeElement);
            var widget2         = SC.Widget(iframeElementID);
            var WIDGET_PLAYING = false;
            widget2.bind(SC.Widget.Events.READY, function() {
                  // load new widget
                widget2.play();
                
                widget2.bind(SC.Widget.Events.PLAY, function() {
                    WIDGET_PLAYING = true;             
                });
                widget2.bind(SC.Widget.Events.PAUSE, function() {
                    WIDGET_PLAYING = false;
                });
                widget2.bind(SC.Widget.Events.PLAY_PROGRESS, function(e) {
                    if(e.currentPosition<startTime){
                        widget2.pause();
                        widget2.seekTo(startTime);
                    }
                    if(e.currentPosition>endTime){
                        widget2.pause();
                    }
                    hightlightTranscriptLine(e.currentPosition);
                });
                widget2.bind(SC.Widget.Events.SEEK, function() {});
                widget2.bind(SC.Widget.Events.FINISH, function() {});
            });
                // Allow user to click on a timecode to go to it
            $('.transcript-ep').on('click', function(evt){
                var tempSeekTo = null;
                if($(evt.target).hasClass('type-timecode')) {
                    tempSeekTo = $(evt.target).closest('.type-timecode').data('timecode');
                    widget2.seekTo(tempSeekTo);
                    if(!WIDGET_PLAYING) {
                        widget2.play();
                    }
                }
            });

            $('#markerModal').on('hidden', function () {            
                if(WIDGET_PLAYING) {
                    var tempWidget = SC.Widget(iframeElementID);
                    tempWidget.pause();
                }
            });
        }//end audio/transcript player
    } // onOLFeatureSelect()

        // RETURNS: entry in the modal-ep array whose name is modalName
        // TO DO:   Put into Project object class
    function findModalEpSettings(modalName) {
        return (_.find(dhpSettings['views']['modal-ep'],
                        function(theName) { return (theName == modalName); }) != undefined);
        //console.log(dhpSettings['views']['modal-ep'])
        // var isFound = false;

        // if(dhpSettings['views']['modal-ep']) {
        //     _.each(dhpSettings['views']['modal-ep'],function(val,key) {
        //         if(val===modalName) {
        //             isFound = true;
        //         }
        //     });
        // }
        // return isFound;
    }

        // PURPOSE: Given a millisecond reading, unhighlight any previous "playhead" and highlight new one
        // TO DO:   Change tcArray entry to end of timestamp
    function hightlightTranscriptLine(millisecond){
        var match;
        _.find(tcArray, function(val,index){
            match = (millisecond>=val&&millisecond<tcArray[index+1]);
            if (match) {
                if(rowIndex!==index) {
                    rowIndex = index;
                    var topDiff = $('.transcript-list div.type-timecode').eq(index).offset().top - $('.transcript-list').offset().top;
                    var scrollPos = $('.transcript-list').scrollTop() +topDiff;
                    $('.transcript-list').animate({
                       scrollTop: scrollPos
                    }, 500);
                }
                $('.transcript-list div.type-timecode').removeClass('current-clip');
                $('.transcript-list div.type-timecode').eq(index).addClass('current-clip');
            }
            return match;
        });
        //$('.type-timecode').attr('data-timecode');
    }

        // PURPOSE: Handle unselection of a map feature
    function onOLFeatureUnselect(feature) {
    	feature.attributes.poppedup = false;
    }

    // function splitTranscript(transcriptData) {
    //     var transcriptArray = transcriptData.split('[');
    //     // console.log(transcriptArray)
    // }

    /**
     * [formatTranscript: cleans up quicktime text, formats transcript and puts it in a list]
     * @author  joeehope
     * @version version
     * @param   {string} dirty_transcript [quicktime text format]
     * @return  {html}  $transcript_html  [html unordered list]
     */
        // TO DO: Use RegEx to parse timestamps; change tcArray entry to end of timestamp (shift left?)
    function formatTranscript(dirty_transcript) {
        var transcript_html='';
        // split into array by line
        var split_transcript = dirty_transcript.trim().split(/\r\n|\r|\n/g);
        tcArray = [];
        // console.log(split_transcript)
        if(split_transcript) {
            transcript_html = $('<div class="transcript-list"/>');

            var index = 0;
            _.each(split_transcript, function(val){ 
                val = val.trim();
                var lineClass = '';
                var oddEven = index % 4;
                if(oddEven==0||oddEven==1) {
                    lineClass = 'odd-line';
                }
                //skip values with line breaks...basically empty items
                if(val.length>1) {       
                    var row = parseInt(index / 2);
                    if(val[0]=='['){            
                        transcript_html.append('<div class="row"></div>');
                        tcArray.push(convertToMilliSeconds(val));
                        $('.row',transcript_html).eq(row).append('<div class="type-timecode '+lineClass+'" data-timecode="'+convertToMilliSeconds(val)+'">'+val+'</div>'); 
                    }
                    else {
                        $('.row',transcript_html).eq(row).append('<div class="type-text '+lineClass+'">'+val+'</div>'); 
                    }
                    index++;
                }
            });
        }
        return transcript_html;
    }

    function attachSecondTranscript(transcriptData){
        //target $('.transcript-list')
        var split_transcript = transcriptData.split(/\r\n|\r|\n/g);
         $('.transcript-list').addClass('two-column');
        var first_transcriptHTML = $('.transcript-list .type-text');
        // console.log(split_transcript)
        var textArray = [];
        if(split_transcript) {
            _.each(split_transcript, function(val,index){ 
                //skip values with line breaks...basically empty items
                if(val.length>1) {
                    if(val[0]=='['){
                    }
                    else {
                        textArray.push(val);
                        // $transcript_html.append('<li class="type-text">'+val+'</li>'); 
                    }
                }       
            });
        }
        //loop thru original transcript and add second lines
         _.each(textArray, function(val,index){
            var lineClass = '';
            if($(first_transcriptHTML).eq(index).hasClass('odd-line')) {
                lineClass = 'odd-line';
            }
            $(first_transcriptHTML).eq(index).after('<div class="type-text '+lineClass+'">'+val+'</div>')
         });
    }

    function attachTranscript(transcriptData,order){
        //hold second transcript until first is loaded and attached. 
        if(order==2) {
            rawAjaxData['transcriptData'][1] = transcriptData;
            if(rawAjaxData['transcriptData'][0]) {
                attachSecondTranscript(transcriptData);
            }
        }
        else {
            rawAjaxData['transcriptData'][0] = transcriptData;
            $('.transcript-ep p').append(formatTranscript(transcriptData));
            if(rawAjaxData['transcriptData'][1]) {
                attachSecondTranscript(rawAjaxData['transcriptData'][1]);
            }
        }
    }

    // function zoomCluster(){
    //     var displayedFeatures = [];
    //     var lay = map.layers[1];
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
        // SIDE-FX: allMarkers will be assigned to the map markers
        // TO DO:   Generalize visualization types
    function createMapMarkers(data,mLayer) {
        rawAjaxData = data;
        // console.log(rawAjaxData);

        var featureObject;
        var legends = [];

            //split the filter and feature object
        _.each(rawAjaxData, function(val,index){
            if(val.type =='filter') {
                legends.push(val);
                // var countTerms = Object.keys(legends[i].terms).length; 
                // for(k=0;k<countTerms;k++) {
                //     legends[i].terms[k].name = _.unescape(legends[i].terms[k].name);
                //     var tempChildCount = Object.keys(legends[i].terms[k].children).length
                //     for(j=0;j<tempChildCount;j++) {
                //         legends[i].terms[k].children[j] = _.unescape(legends[i].terms[k].children[j]);
                //     }
                // }
            } else if(val.type =='FeatureCollection') {
                featureObject = val;
                allMarkers = val;
            }
        });
        // for(i=0;i<Object.keys(rawAjaxData).length;i++) {
        //     if(rawAjaxData[i].type =='filter') {
        //         legends[i] = (rawAjaxData[i]);
        //         var countTerms = Object.keys(legends[i].terms).length; 
        //         for(k=0;k<countTerms;k++) {
        //             legends[i].terms[k].name = _.unescape(legends[i].terms[k].name);
        //             var tempChildCount = Object.keys(legends[i].terms[k].children).length
        //             for(j=0;j<tempChildCount;j++) {
        //                 legends[i].terms[k].children[j] = _.unescape(legends[i].terms[k].children[j]);
        //             }
        //         }
        //     }
        //     if(rawAjaxData[i].type =='FeatureCollection') {
        //         featureObject = rawAjaxData[i];
        //         allMarkers = rawAjaxData[i];
        //     }
        //}

        catFilter  = legends[0];        //rawAjaxData[0];
        createLegends(legends);
        //allMarkers = rawAjaxData[2];
        //var featureObject = rawAjaxData[2];

    	var reader = new OpenLayers.Format.GeoJSON({
                'externalProjection': gg,
                'internalProjection': sm
        });

    	var featureData = reader.read(featureObject);

        var  myLayer = mLayer;
        myLayer.addFeatures(featureData);
    //player.pause();
    } // createMapMarkers()


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
    function loadMapMarkers(projectID,mLayer){
        //console.log('loading');
            // Initially bring up Loading pop-box modal dialog -- hide after Ajax returns
        $('body').append('<div id="loading" class="modal hide fade">\
            <div class="modal-body">\
            <div class="loading-content" style="font-size:56px; ">\
            <i class="icon-spinner icon-spin"> </i> loading </div>\
            </div>\
            </div>');   
        $('#loading').modal({backdrop:false});
        $('#loading').modal('show');
        //$('.modal-backdrop').css({'opacity':0.1});
    	jQuery.ajax({
            type: 'POST',
            url: ajax_url,
            data: {
                action: 'dhpGetMarkers',
                project: projectID
            },
            success: function(data, textStatus, XMLHttpRequest){
                createMapMarkers(JSON.parse(data),mLayer);
                //$('#markerModal').modal({backdrop:true});
                    // Remove Loading modal
                $('#loading').modal('hide');
                    // Enable joyride help tips
                $("#dhpress-tips").joyride({'tipLocation': 'right', autoStart : true,});
                $('.joyride-close-tip').click(function(){
                    $('.dhp-nav .tips').removeClass('active');
                });
                //$('#markerModal .loading-content').remove();   
            },
            error: function(XMLHttpRequest, textStatus, errorThrown){
               alert(errorThrown);
            }
        });
    }

    function loadTimeline(projectID){
        jQuery.ajax({
            type: 'POST',
            url: ajax_url,
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

    function loadTranscriptClip(projectID,transcriptName,clip,order){
        jQuery.ajax({
            type: 'POST',
            url: ajax_url,
            data: {
                action: 'dhpGetTranscriptClip',
                project: projectID,
                transcript: transcriptName,
                timecode: clip
            },
            success: function(data, textStatus, XMLHttpRequest){
                //console.log(JSON.parse(data));
                attachTranscript(JSON.parse(data),order);
            },
            error: function(XMLHttpRequest, textStatus, errorThrown){
               alert(errorThrown);
            }
        });
    }
});