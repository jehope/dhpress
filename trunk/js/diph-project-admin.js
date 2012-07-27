// JavaScript Document

//alert('here');
jQuery(document).ready(function($) {
var style = {
    fillColor: '#000',
    fillOpacity: 0.1,
    strokeWidth: 0
};

var map = new OpenLayers.Map('map-div');
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
map.addLayers([layer, vector, world_light]);
map.addControl(new OpenLayers.Control.LayerSwitcher());
map.setCenter(
    new OpenLayers.LonLat(-78.92028, 35.89782).transform(
        new OpenLayers.Projection("EPSG:4326"),
        map.getProjectionObject()
    ), 8
);
OpenLayers.Control.Click = OpenLayers.Class(OpenLayers.Control, {                
                defaultHandlerOptions: {
                    'single': true,
                    'double': false,
                    'pixelTolerance': 0,
                    'stopSingle': false,
                    'stopDouble': false
                },

                initialize: function(options) {
                    this.handlerOptions = OpenLayers.Util.extend(
                        {}, this.defaultHandlerOptions
                    );
                    OpenLayers.Control.prototype.initialize.apply(
                        this, arguments
                    ); 
                    this.handler = new OpenLayers.Handler.Click(
                        this, {
                            'click': this.trigger
                        }, this.handlerOptions
                    );
                }, 

                trigger: function(e) {
                    var lonlat = map.getLonLatFromPixel(e.xy);
					lonlat.transform(new OpenLayers.Projection("EPSG:900913"), new OpenLayers.Projection("EPSG:4326"));
					var centerpt= map.getCenter();
					centerpt.transform(new OpenLayers.Projection("EPSG:900913"), new OpenLayers.Projection("EPSG:4326"));
                    alert("You clicked near " + lonlat.lat + " N, " +
                                              + lonlat.lon + " E Zoom: " + map.getZoom() +' Center: '+ centerpt.lat+'N, '+centerpt.lon+'E');
                }

            });
dragcontrol = new OpenLayers.Control.DragPan({'map':this.map, 'panMapDone':function(xy){
        if(this.panned) {
            var res = null;
            if (this.kinetic) {
                res = this.kinetic.end(xy);
            }
            this.map.pan(
                this.handler.last.x - xy.x,
                this.handler.last.y - xy.y,
                {dragging: !!res, animate: false}
            );
            if (res) {
                var self = this;
                this.kinetic.move(res, function(x, y, end) {
                    self.map.pan(x, y, {dragging: !end, animate: false});
                });
            }
            this.panned = false;
        }
        var centerpt= map.getCenter();
		centerpt.transform(new OpenLayers.Projection("EPSG:900913"), new OpenLayers.Projection("EPSG:4326"));
            // do whatever you want here
			$('#project_nexttext_link').val('Center: '+ centerpt.lat+'N, '+centerpt.lon+'E');
			//alert( 'Center: '+ centerpt.lat+'N, '+centerpt.lon+'E');
    }});
    dragcontrol.draw();
    map.addControl(dragcontrol);
    dragcontrol.activate();			
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

$('.diph_icon').click(function() {
	
		
		if($(this).hasClass('selected')==false){
			var imgs = $(this).find('img').attr('src');
			$('#icon-cats ul').append('<li id="'+$(this).attr('id')+'"><img src="'+ imgs + '"/><input type="text" name="" id="icons_'+$(this).attr('id')+'"/><span class="remove">X</span></li>');
			$(this).toggleClass('selected');
			assignListeners(this);
		}
		
});
loadSelectedIcons($('#project_icons').val());
function loadSelectedIcons(loadvars){
	var n = loadvars.split(',');
	
	for (i=0;i<n.length-1;i+=2){
		var imgurl = $('#'+n[i]).find('img').attr('src');
		$('#icon-cats ul').append('<li id="'+n[i]+'"><img src="'+ imgurl + '"/><input type="text" name="" id="icons_'+n[i]+'" value="'+n[i+1]+'"/><span class="remove">X</span></li>');
		var selIcon = '#diph_icon_cont #'+n[i];
		if($(selIcon).hasClass('selected')==false){
			$(selIcon).toggleClass('selected');
		}
			assignListeners($('#icon-cats ul #'+n[i]));
		}
	}
function assignListeners(theobj) {
	var remove_id = '#'+$(theobj).attr('id');
	var remove_span = '#'+$(theobj).attr('id')+' .remove';
	var remove_li = '#icon-cats '+ remove_id;
	
	//setup before functions
var typingTimer;                //timer identifier
var doneTypingInterval = 1000;  //time in ms, 5 second for example

//on keyup, start the countdown
$('#icons_'+$(theobj).attr('id')).keyup(function(){
    typingTimer = setTimeout(doneTyping, doneTypingInterval);
});

//on keydown, clear the countdown 
$('#icons_'+$(theobj).attr('id')).keydown(function(){
    clearTimeout(typingTimer);
});

//user is "finished typing," do something
function doneTyping () {
    //do something
	var icon_settings = '';
	$('#icon-cats ul li').each(function() {
		icon_settings += $(this).attr('id')+','+$(this).find('input').val()+',';
	});
	$('#project_icons').val(icon_settings);
	//alert('done typing');
}
	
	$(remove_span).click(function() {
				$(remove_id).toggleClass('selected');				
				$(remove_li).remove();
				doneTyping();
			});
}


});