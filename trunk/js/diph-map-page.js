// JavaScript Document

//jQuery noconfilct wrapper fires when page has loaded
jQuery(document).ready(function($) {

/* Get map information from the post */
var postID = $('post').attr('id')
var mapCategory = $('category').text();
var mapType = $('type').text();

var mapUrl = $('url').text();
var mapCDLAid = $('cdlaid').text();

var baseLayer;

/* Setup map */
var gg = new OpenLayers.Projection("EPSG:4326");
var sm = new OpenLayers.Projection("EPSG:900913");
var map = new OpenLayers.Map({
    div: "map_div",
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
	
}else{
	baseLayer = false;
	// add base layers
	map.addLayers([gmap,osm,gphy,ghyb,gsat,wms]);

	if(mapType == "KML"){
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
	}else if(mapType == "CDLA"){
		/*code to access cdla maps*/
        // set the default API type to OpenLayers
		cdla.maps.defaultAPI(cdla.maps.API_OPENLAYERS);
        // create the cdla.maps.Map object
		var hwymap = new cdla.maps.Map(mapCDLAid);
        
      	// add the map layer
		map.addLayers([hwymap.layer()]);
        
      	// center the map on the entire map layer
		map.zoomToExtent(hwymap.bounds());
        
      	// make sure tiles are visible for the layer
		if (map.getZoom() < hwymap.minZoom()) {
    	    map.zoomTo(hwymap.minZoom());
		}
	}
}

map.addControl(new OpenLayers.Control.LayerSwitcher());
map.addControl(new OpenLayers.Control.Permalink());
map.addControl(new OpenLayers.Control.MousePosition());
});