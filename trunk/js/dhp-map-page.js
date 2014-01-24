// PURPOSE: To render a single map into the div marked "dhp-visual" when looking at Map Library entries
//          Loaded by dhp_map_page_template() in dhp-map-library.php to show a Map view
// ASSUMES: That the code in dhp-map-template.php has embedded parameters into the HTML about
//            the map: post, category, etc.
//          Thus, the code assumes that only one map being shown!
// USES:    jQuery, OpenLayers, dhp-custom-maps.js
// NOTE:    Does not use dhp-maps-view.js (replaces that functionality)

// TO DO:   Pass params to custom-maps, initialize and create maps-view

jQuery(document).ready(function($) {

        // Get map parameters from the hidden input values
    var mapCategory = $('#map-category').val();
    var mapType     = $('#map-type').val();
    var mapUrl      = $('#map-url').val();

    // var postID = $('#map-post').val();

    var baseLayer;

    /* Setup map */
    var gg = new OpenLayers.Projection("EPSG:4326");
    var sm = new OpenLayers.Projection("EPSG:900913");
    var map = new OpenLayers.Map({
        div: "dhp-visual",
        projection: sm,
    	displayProjection: gg,
    	numZoomLevels: 18
    });

    /* Setup initial set of base map */
    /* Only show one when users choose to view a base map layer */

    // create Google Mercator layers
    var gphy = new OpenLayers.Layer.Google(
        "Google Physical",
        {type: google.maps.MapTypeId.TERRAIN}
    );
    var gmap = new OpenLayers.Layer.Google(
        "Google Streets", // the default
        {numZoomLevels: 20}
    );
    var ghyb = new OpenLayers.Layer.Google(
        "Google Hybrid",
        {type: google.maps.MapTypeId.HYBRID, numZoomLevels: 20}
    );
    var gsat = new OpenLayers.Layer.Google(
        "Google Satellite",
        {type: google.maps.MapTypeId.SATELLITE, numZoomLevels: 22}
    );

    var osm = new OpenLayers.Layer.OSM();
    var wms = new OpenLayers.Layer.WMS(
      "OpenLayers WMS",
      "http://vmap0.tiles.osgeo.org/wms/vmap0",
      {'layers':'basic'} 
    );

    /* Check whether the overlay is a base layer or not.     */
    /* If it is a base layer, then only load the base layer. */
    /* If it is not a base layer, load a base layer first,   */
    /* then load the overlay.                                */
    if(mapCategory == "Base Layer"){
    	baseLayer = true;

    } else {
    	baseLayer = false;
    	// add base layers
    	map.addLayers([gmap,osm,gphy,ghyb,gsat,wms]);

        switch (mapType) {
        case  "KML":
            var mylayer = new OpenLayers.Layer.Vector("KML", {
                projection: map.displayProjection,
                strategies: [new OpenLayers.Strategy.Fixed()],
                eventListeners:{
                   'loadend': function (evt) {
                        var deeds_extent = mylayer.getDataExtent();
                        map.zoomToExtent(deeds_extent);
                    }
                },
                protocol: new OpenLayers.Protocol.HTTP({
                    url: mapUrl,
                    format: new OpenLayers.Format.KML({
                        extractStyles: true,
                        extractAttributes: true
                    })
                })
            });
            map.addLayer(mylayer);
            break;

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

// console.log("MapID: "+mapID+", URL: "+mapUrl+" NB: "+mapBounds[0]+", SB: "+mapBounds[1]+", EB: "+mapBounds[2]+", WB: "+mapBounds[3]+", CLat: "+mapCentroid[0]+", CLon: "+mapCentroid[1]+", zMin: "+mapZoomMin);

            dhpCustomMaps.maps.addMap(mapID, mapShortNm, mapBounds[0], mapBounds[1], mapBounds[2], mapBounds[3],
                                        mapCentroid[0], mapCentroid[1], mapZoomMin, mapZoomMax, mapUrl, mapDesc);

                // set the default API type to OpenLayers
    		dhpCustomMaps.maps.defaultAPI(dhpCustomMaps.maps.API_OPENLAYERS);
                // create the dhpCustomMaps.maps.Map object
    		var hwymap = new dhpCustomMaps.maps.Map(mapID);

                // add this map layer to base map (array of 1 item)
    		map.addLayers([hwymap.layer()]);

                // center the map on the entire map layer
    		map.zoomToExtent(hwymap.bounds());

          	// make sure tiles are visible for the layer
    		if (map.getZoom() < hwymap.minZoom()) {
        	    map.zoomTo(hwymap.minZoom());
    		}
            break;

            // create TMS Overlay layer
    	case "TMS":
            var tmsoverlay = new OpenLayers.Layer.TMSREST(
                "Historic Map Overlay",
                    // TO DO: Replace this??
                "http://www.lib.unc.edu/dc/maptiles/Maloney/tilemapresource.xml",
                {   alpha: true,
                    isBaseLayer: false
            });
            tmsoverlay.setOpacity(0.9);

            var bounds = tmsoverlay.tmsbounds;
            map.addLayers([tmsoverlay]);
            break;
        } // switch()
    } // if ()

    map.addControl(new OpenLayers.Control.LayerSwitcher());
    map.addControl(new OpenLayers.Control.Permalink());
    map.addControl(new OpenLayers.Control.MousePosition());
});