// JavaScript Document
// NOT CURRENTLY USED

function initFirstMap() {

    var style = {
        fillColor: '#000',
        fillOpacity: 0.1,
        strokeWidth: 0
    };

    //Build map and layers
    var map = new OpenLayers.Map('map-div');
    var map2 = new OpenLayers.Map('map-div2');
    var layer = new OpenLayers.Layer.OSM( "Simple OSM Map");
    var vector = new OpenLayers.Layer.Vector('vector');
    var world_light = new OpenLayers.Layer.XYZ(
        "World Light",
        [
        "http://a.tiles.mapbox.com/v3/mapbox.mapbox-streets/${z}/${x}/${y}.png",
        "http://b.tiles.mapbox.com/v3/mapbox.mapbox-streets/${z}/${x}/${y}.png",
        "http://c.tiles.mapbox.com/v3/mapbox.mapbox-streets/${z}/${x}/${y}.png",
        "http://d.tiles.mapbox.com/v3/mapbox.mapbox-streets/${z}/${x}/${y}.png"
        ], {
        attribution: "Tiles &copy; <a href='http://mapbox.com/'>MapBox</a> | " + 
            "Data &copy; <a href='http://www.openstreetmap.org/'>OpenStreetMap</a> " +
            "and contributors, CC-BY-SA",
        sphericalMercator: true,
        wrapDateLine: true,
        transitionEffect: "resize",
        buffer: 1,
        numZoomLevels: 17
        }
    );
    
    var world_light2 = world_light.clone();
    map.addLayers([world_light,vector]);

    map2.addLayers([world_light2]);
    map.addControl(new OpenLayers.Control.LayerSwitcher());
    map.setCenter(
        new OpenLayers.LonLat(-78.92028, 35.89782).transform(
            new OpenLayers.Projection("EPSG:4326"),
            map.getProjectionObject()
        ), 8
    );

    map2.setCenter(
        new OpenLayers.LonLat(-78.92028, 35.89782).transform(
            new OpenLayers.Projection("EPSG:4326"),
            map.getProjectionObject()
        ), 8
    );

    //click event listener--using this to test for variables need to set initial map view
    OpenLayers.Control.Click = OpenLayers.Class(OpenLayers.Control, {                
        defaultHandlerOptions: {
            'single': true,
            'double': false,
            'pixelTolerance': 0,
            'stopSingle': false,
            'stopDouble': false
        },
        initialize: function(options) {
            this.handlerOptions = OpenLayers.Util.extend( {}, this.defaultHandlerOptions );
            OpenLayers.Control.prototype.initialize.apply( this, arguments ); 
            this.handler = new OpenLayers.Handler.Click( this, { 'click': this.trigger }, this.handlerOptions );
        }, 
        trigger: function(e) {
            var lonlat = map.getLonLatFromPixel(e.xy);
			lonlat.transform(new OpenLayers.Projection("EPSG:900913"), new OpenLayers.Projection("EPSG:4326"));
			var centerpt= map.getCenter();
			centerpt.transform(new OpenLayers.Projection("EPSG:900913"), new OpenLayers.Projection("EPSG:4326"));
            alert("You clicked near " + lonlat.lat + " N, " + lonlat.lon + " E Zoom: " + map.getZoom() +' Center: '+ centerpt.lat+'N, '+centerpt.lon+'E');
        }
    });

	
    //Geolocation point and control		
    var pulsate = function(feature) {
        var point = feature.geometry.getCentroid(),
            bounds = feature.geometry.getBounds(),
            radius = Math.abs((bounds.right - bounds.left)/2),
            count = 0,
            grow = 'up';

        var resize = function(){
            if (count>16) {
                clearInterval(window.resizeInterval);
            }
            var interval = radius * 0.03;
            var ratio = interval/radius;
            switch(count) {
                case 4:
                case 12:
                    grow = 'down'; break;
                case 8:
                    grow = 'up'; break;
            }
            if (grow!=='up') {
                ratio = - Math.abs(ratio);
            }
            feature.geometry.resize(1+ratio, point);
            vector.drawFeature(feature);
            count++;
        };
        window.resizeInterval = window.setInterval(resize, 50, point, radius);
    };

    var geolocate = new OpenLayers.Control.Geolocate({
        bind: false,
        geolocationOptions: {
            enableHighAccuracy: false,
            maximumAge: 0,
            timeout: 7000
        }
    });
    map.addControl(geolocate);
    var firstGeolocation = true;

    geolocate.events.register("locationupdated",geolocate,function(e) {
        vector.removeAllFeatures();
        var circle = new OpenLayers.Feature.Vector(
            OpenLayers.Geometry.Polygon.createRegularPolygon(
                new OpenLayers.Geometry.Point(e.point.x, e.point.y),
                e.position.coords.accuracy/2,
                40,
                0
            ),
            {},
            style
        );
    
        vector.addFeatures([
            new OpenLayers.Feature.Vector(
                e.point,
                {},
                {
                    graphicName: 'cross',
                    strokeColor: '#f00',
                    strokeWidth: 2,
                    fillOpacity: 0,
                    pointRadius: 10
                }
            ),
            circle
        ]);
        if (firstGeolocation) {
            map.zoomToExtent(vector.getDataExtent());
            pulsate(circle);
            firstGeolocation = false;
            this.bind = true;
        }
    });

    geolocate.events.register("locationfailed",this,function() {
        OpenLayers.Console.log('Location detection failed');
    });

    var click = new OpenLayers.Control.Click();
    map.addControl(click);
    click.activate();
	
    $('#locate').click(function(event) {
        event.preventDefault();
        vector.removeAllFeatures();
        geolocate.deactivate();
    
        geolocate.watch = false;
        firstGeolocation = true;
        geolocate.activate();
    });
    //geolocate.activate();
}