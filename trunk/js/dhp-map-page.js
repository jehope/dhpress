// PURPOSE: To render a single map into the div marked "dhp-visual" when looking at Map Library entries
//          Loaded by dhp_map_page_template() in dhp-map-library.php to show a Map view
// ASSUMES: That the code in dhp-map-template.php has embedded parameters into the HTML about
//            the map: post, category, etc.
//          Thus, the code assumes that only one map being shown!
// USES:    jQuery, OpenLayers, dhp-custom-maps.js
// NOTE:    Does not use dhp-maps-view.js (replaces that functionality)

jQuery(document).ready(function($) {

        // Get map parameters from the hidden input values
    var mapCategory = $('#map-category').val();
    var mapType     = $('#map-type').val();
    var mapUrl      = $('#map-url').val();

    // var postID = $('#map-post').val();

    /* Setup map */
    var dhpMapTest = L.map('dhp-visual',{ zoomControl:true,layerControl:true });
    $('#dhp-visual').width(600).height(500);

    /* Check whether the overlay is a base layer or not.     */
    /* If it is a base layer, then only load the base layer. */
    if(mapCategory == "base layer"){
        dhpMapTest.setView([0,0], 1);
        var newLayer;

        switch (mapType) {
        case 'OSM':
            var subDomains = $('#map-subdomains').val();

            subDomains = subDomains.split('|');
            if(subDomains.length>1) {
                newLayer = new L.TileLayer(mapUrl, {
                    subdomains: subDomains,
                    maxZoom: 20,
                    opacity: 1,
                    layerName: $('#map-shortname').val()
                });
            }
            else {
                newLayer = new L.TileLayer(mapUrl, { 
                    maxZoom: 20, 
                    opacity: 1,
                    layerName: $('#map-shortname').val()
                });
            }
            break;
        }
        if (newLayer) {
            newLayer.addTo(dhpMapTest);
        }

    /* If it is not a base layer, load a base layer first,   */
    /* then load the overlay.                                */
    } else {
    	// add base layers
        /* Setup initial set of base map */
        /* Only show one when users choose to view a base map layer */

        var mpq = L.tileLayer('http://otile4.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.png',{maxZoom: 18}).addTo(dhpMapTest);;
        var osm = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom: 18}).addTo(dhpMapTest);;
        var dhpBaseLayers = {
            'MapQuest': mpq,
            'OpenStreetMap' : osm
        };    
        switch (mapType) {
        
            // create DHP custom map
    	case "DHP":
                // get hidden form parameters and pass to custom-maps; this is only map needed in Map set
            var mapID       = $('#map-typeid').val();
            var mapBounds   = $('#map-bounds').val();
            var mapZoomMin  = $('#map-zoom-min').val();
            var mapZoomMax  = $('#map-zoom-max').val();
            var mapCentroid = $('#map-centroid').val();
            var mapDesc     = $('#map-desc').val();
            var mapShortNm  = $('#map-shortname').val();

            mapBounds = mapBounds.split(",");
            mapCentroid = mapCentroid.split(",");

            dhpCustomMaps.maps.addMap(mapID, mapShortNm, mapBounds[0], mapBounds[1], mapBounds[2], mapBounds[3],
                                        mapCentroid[0], mapCentroid[1], mapZoomMin, mapZoomMax, mapUrl, mapDesc);

                // set the default API type to Leaflet
    		dhpCustomMaps.maps.defaultAPI(dhpCustomMaps.maps.API_LEAFLET);
                // create the dhpCustomMaps.maps.Map object
    		var hwymap = new dhpCustomMaps.maps.Map(mapID);
            var mapLayer = hwymap.layer();
            mapLayer.addTo(dhpMapTest);

            var overlay = {
                'Overlay': mapLayer
            };

            L.control.layers(dhpBaseLayers,overlay).addTo(dhpMapTest);

                // center the map on the entire map layer 
            dhpMapTest.fitBounds(mapLayer.options.bounds);
            break;

           
        } // switch()
    } // if ()

});