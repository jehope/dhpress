// JavaScript Document

var map, map2, projectID, mObject, lookupParents,markerObject,catFilter;
//jQuery noconfilct wrapper fires when page has loaded
jQuery(document).ready(function($) {

// (function($){
//   var ListView = Backbone.View.extend({
//     el: $('body'), // el attaches to existing element
//     // `events`: Where DOM events are bound to View methods. Backbone doesn't have a separate controller to handle such bindings; it all happens in a View.
//     events: {
//       'click button#add': 'addItem'
//     },
//     initialize: function(){
//       _.bindAll(this, 'render', 'addItem'); // every function that uses 'this' as the current object should be in here
      
//       this.counter = 0; // total number of items added thus far
//       this.render();
//     },
//     // `render()` now introduces a button to add a new list item.
//     render: function(){
//       $('#map_div2').append("<button id='add'>Add list item</button>");
//       $('#map_div2').append("<ul></ul>");
//     },
//     // `addItem()`: Custom function called via `click` event above.
//     addItem: function(){
//       this.counter++;
//       $('ul', '#map_div2').append("<li>hello world"+this.counter+"</li>");
//     }
//   });

//   var listView = new ListView();      
// })(jQuery);


var gg = new OpenLayers.Projection("EPSG:4326");
var sm = new OpenLayers.Projection("EPSG:900913");

markerObject = new Object();
lookupParents = new Object();
catFilter = new Object();
//projectID $()
var streets = new OpenLayers.Layer.XYZ(
    "MapBox Streets",
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
     var osm = new OpenLayers.Layer.OSM();      
map = new OpenLayers.Map({
    div: "map_div",
    projection: sm,
	displayProjection: gg,
    layers: [osm],
    
    center: [],
    zoom: 6
});

var context = {
                
    getIcon: function(feature) {
        var cats;
        if(feature.cluster) {
            cats = feature.cluster[0].attributes.categories;
        }
        else {    
            cats = feature.attributes["categories"];
        }
        var highParentI ='';
        if(cats) {
            highParentI = getHighestParentIcon(cats);
        }
        return highParentI;
    },
    getLabel: function(feature) {
        if(feature.cluster.length>1) {
            return feature.cluster.length;
        }
        else {
            return '';
        }
    }
};

var template = {
    fillColor: "#8aeeef",
    strokeColor: "#32a8a9",
    pointRadius: 20, // using context.getSize(feature)
    width:20,
    externalGraphic: "${getIcon}", //context.getIcon(feature)
     graphicZIndex: 1
     ,
    label:"${getLabel}"
};
            
var style = new OpenLayers.Style(template, {context: context});
strategy = new OpenLayers.Strategy.Cluster();
strategy.distance = 1;
mObject = new OpenLayers.Layer.Vector('Markers',{
    strategies: [strategy],
    rendererOptions: { zIndexing: true }, 
    styleMap: new OpenLayers.StyleMap(style)
});    

var lonlat = new OpenLayers.LonLat(-88.52349,38.03501);
lonlat.transform(gg, map.getProjectionObject());

map.setCenter(lonlat, 5);
           
selectControl = new OpenLayers.Control.SelectFeature(mObject,
    { onSelect: onFeatureSelect, onUnselect: onFeatureUnselect, hover: false });

hoverControl = new OpenLayers.Control.SelectFeature(mObject, 
    { hover: true, highlightOnly: true, renderIntent: "temporary" });

loadMarkers('4233',mObject);   

mObject.id = "Markers";       
map.addLayer(mObject);
map.addControl(hoverControl);
map.addControl(selectControl);
 
hoverControl.activate();  
selectControl.activate(); 


//geocodeAddress('310 Meredith St');
function createLookup(filter){
    catFilter = filter;

    var lookupData = filter.terms;
    var countTerms = Object.keys(lookupData).length; 
  
    for(i=0;i<countTerms;i++) {
        var tempName = lookupData[i].name;
        lookupParents[tempName];
        lookupParents[tempName] = { externalGraphic : lookupData[i].icon_url };
        
    }
    //alert(JSON.stringify(lookupParents));
    return lookupParents;
   
}
/*  Filter logic
 *  
 */
function getHighestParentIcon(categories) {

    var lookupData = findSelectedCats();

    var countTerms = Object.keys(lookupData).length; 
    var countCats = categories.length;
    for(i=0;i<countTerms;i++) {

        for(j=0;j<countCats;j++) {

            var tempName = lookupData[i].name;
            if (tempName==categories[j]) {
               
                return lookupData[i].icon_url;
            }
            else {
                //for each child cat
                var tempChildren = lookupData[i].children;
                var tempChildCount = tempChildren.length;
                for (k=0;k<tempChildCount;k++) {
                    if(tempChildren[k]==categories[j]) {
                        //alert('fired');
                        return lookupData[i].icon_url;
                    }
                    //alert( categories[j] );
                }
            }
       }
        
    }

}
function getHighestParentDisplay(categories) {
    var lookupData = catFilter.terms;
    var countTerms = Object.keys(lookupData).length; 
    var countCats = categories.length;
    for(i=0;i<countTerms;i++) {

        for(j=0;j<countCats;j++) {

            var tempName = lookupData[i].name;
            if (tempName==categories[j]) {              
                return true;
            }
            else {
                //for each child cat
                var tempChildren = lookupData[i].children;
                var tempChildCount = tempChildren.length;
                for (k=0;k<tempChildCount;k++) {
                    if(tempChildren[k]==categories[j]) {
                        return 'none';
                    }
                }
            }
        }        
    }
}
/*  Create filter control legend
 *
 */
function createLegend(object) {
    var filterTerms = object.terms;
    var countTerms = Object.keys(filterTerms).length; 
    var legendHtml;
    legendHtml = $('<div id="term-legend"><ul class="terms"></ul></div>');
    for(i=0;i<countTerms;i++) {
        if(i>14) {
        $('ul', legendHtml).append('<li><input type="checkbox" ><img src="'+filterTerms[i].icon_url+'" /> <a class="value">'+filterTerms[i].name+'</a></li>');
        }
        else {
          $('ul', legendHtml).append('<li><input type="checkbox" checked="checked"><img src="'+filterTerms[i].icon_url+'" /> <a class="value">'+filterTerms[i].name+'</a></li>');
          
        }
    }
    $(legendHtml).append('<ul class="controls"><li><input type="checkbox" ><a class="value">All</a></li><ul>');
        
    $('#main').prepend(legendHtml);
    var mapPosition = $('#map_div').position();
    var mapWidth = $('#map_div').width();
    var pageWidth = $('body').width();
    var spaceRemaining = pageWidth-mapWidth;

    var rightDiv = mapPosition.left + 50;
    var topDiv = mapPosition.top + 10;

    $('#term-legend').css({'left':rightDiv, 'top':topDiv,'z-index':1998,'background':'#fff','padding':'10px'});

    $('#term-legend').mousemove(function(e){
        var xpos = e.pageX - 250;
        var ypos = e.pageY + 15;
        $('#child_legend').css({'left':xpos,'top':ypos});
    });
    var childrenLegendHtml = $('<div id="child_legend"><h3>Children Terms</h3><ul></ul></div>');
    $('body').append(childrenLegendHtml);
    $('#child_legend').css({'width':'200px','margin-left':'200px','top':'40px','position':'absolute','z-index': '2001' });
    $('#term-legend ul.terms li a').click(function(event){
        var spanName = $(this).text();
        $('#term-legend ul input').removeAttr('checked');
        $('#term-legend ul.terms li.selected').removeClass('selected');
        $(this).closest('li').addClass('selected');
        $(this).closest('li').find('input').attr('checked',true);
        var tempO = findSelectedCats(spanName); 
        //console.log('single object '+tempO)
        //console.log(tempO)
        updateLayerFeatures(tempO);
    });
    $('#term-legend ul.terms li').hover(function(){
        $('#child_legend').show();
        var childrenLegend = _.where(filterTerms, {name: $(this).find('a').text()})
        
        $(childrenLegend[0].children).each(function(){
            $('ul', childrenLegendHtml).append('<li>'+this+'</li>')
        });
    }, 
    function() {
        $('#child_legend ul li').remove();
        $('#child_legend').hide();
    });
    $('#term-legend ul.terms input').click(function(){
        var tempO = findSelectedCats(); 
        console.log(tempO)       
        updateLayerFeatures(tempO);
    });
    $('#term-legend ul.controls li').click(function(){
        $('#term-legend ul input').attr('checked',true);
        $('#term-legend ul.terms li').css({'background': 'none'});
        var tempO = findSelectedCats(); 
        console.log(tempO)       
        updateLayerFeatures(tempO);
        
    });
    $('.launch-timeline').click(function(){
        loadTimeline('4233');  
    });
}

function updateLayerFeatures(catObject){

    //find all features with cat
    //var feats = _.where(markerObject, function(){ return _.contains(list, value)});
    var countTerms = Object.keys(catObject).length; 
    var newFeatures = {type: "FeatureCollection", features: []};
    console.log(countTerms+' co'+catObject[0].name)
    var childCatObject = [];
    for (var i = 0, len = countTerms; i < len; i++) {
        childCatObject.push(catObject[i].name);
        console.log(catObject[i].name)
        for (var j = 0, len2 = catObject[i].children.length; j < len2; j++) {
            childCatObject.push(catObject[i].children[j]);
        }
    }

    newFeatures.features = _(markerObject.features).select(function(feature){ 
        if(_.intersection(feature.properties.categories,childCatObject).length > 0) {
           return feature;
        }
    });

    var reader = new OpenLayers.Format.GeoJSON({
        'externalProjection': gg,
        'internalProjection': sm
    });

    var featureData = reader.read(newFeatures);
    var  myLayer = map.getLayer('Markers');
    
    myLayer.removeAllFeatures();
    myLayer.addFeatures(featureData);
}

function findSelectedCats(single) {

    var selCatFilter = new Object();
    var countTerms = Object.keys(catFilter.terms).length; 
    if(!single) {
        $('#term-legend ul.terms input:checked').each(function(index){
            var tempSelCat = $(this).parent().find('.value').text();
            for(i=0;i<countTerms;i++) {
                if(catFilter.terms[i].name==tempSelCat) {
                    selCatFilter[index] = catFilter.terms[i];
                }
            }
        });
    }
    else {
        var tempSelCat = single;
        for(i=0;i<countTerms;i++) {
            if(catFilter.terms[i].name==tempSelCat) {
                console.log(catFilter.terms[i].name+' : '+tempSelCat)
                selCatFilter[0] = catFilter.terms[i];
            }
        }
    }

    return selCatFilter;
}

function geocodeAddress(addy){
	//http://maps.google.com/maps/api/geocode/json?address=Pizzeria+Da+Vittorio,+Rome&sensor=false
	jQuery.ajax({
        type: 'POST',
        url: 'http://maps.google.com/maps/api/geocode/json?address=Pizzeria+Da+Vittorio,+Rome&sensor=false',
        dataType:'jsonp',
        data: {
            address: addy
        },
        success: function(data, textStatus, XMLHttpRequest){
            //console.log('geocode: '+textStatus);
            //console.log(data);
            //

        },
        error: function(XMLHttpRequest, textStatus, errorThrown){
           alert(errorThrown);
        }
    });
}

function onFeatureSelect(feature) {
	// if not cluster

	if(!feature.cluster||(feature.attributes.count==1)) {
        
        if(feature.cluster){selectedFeature = feature.cluster[0]}
        else {selectedFeature = feature;}
		 var pageLink = selectedFeature.attributes.link;
		 var titleAtt =  selectedFeature.attributes.title;
		 var tagAtt =  selectedFeature.attributes.categories;
		 var thumb;
		 if(selectedFeature.attributes.thumb){
			 thumb = selectedFeature.attributes.thumb;
			 var thumbHtml = '<img src="'+thumb+'"/><br/>';
			 }
		 var li = '<b>'+titleAtt+'</b>';
		 //for(var attr in selectedFeature.attributes){
         //   li += "<li><div style='width:25%;float:left'>" + attr + "</div><div style='width:75%;float:right'>" 
         //   + selectedFeature.attributes[attr] + "</div></li>";
        //	}
		li += '<p>';
		if(thumbHtml){
			li+= thumbHtml;
		}
		
		li += tagAtt+'</p><a href="'+pageLink+'" class="thickbox" target="_blank">More Info</a>';
		 //alert("clicked "+description+" "+thesecats);
		$('#map_marker').empty();
		$('#map_marker').append('<div style="font-size:.8em"><ul>'+li+'</ul></div>');
		tb_show(titleAtt, '#TB_inline?height=280&width=400&inlineId=map_marker' );
        $("#TB_closeWindowButton, #TB_overlay").click(function() {
    		selectControl.unselect(feature);
		});
		 
		}
		else
    {
       // fetch the cluster's latlon and set the map center to it and call zoomin function
       // which takes you to a one level zoom in and I hope this solves your purpose :) 
       if(zoomCluster()) {
            map.setCenter(feature.geometry.getBounds().getCenterLonLat());
            map.zoomIn();
        }
        else {
            selectedFeature = feature.cluster[0];
        
         var pageLink = selectedFeature.attributes.link;
         var titleAtt =  selectedFeature.attributes.title;
         var tagAtt =  selectedFeature.attributes.categories;
         var thumb;
         if(selectedFeature.attributes.thumb){
             thumb = selectedFeature.attributes.thumb;
             var thumbHtml = '<img src="'+thumb+'"/><br/>';
             }
         var li = '<b>'+titleAtt+'</b>';
         //for(var attr in selectedFeature.attributes){
         //   li += "<li><div style='width:25%;float:left'>" + attr + "</div><div style='width:75%;float:right'>" 
         //   + selectedFeature.attributes[attr] + "</div></li>";
        //  }
        li += '<p>';
        if(thumbHtml){
            li+= thumbHtml;
        }
        
        li += tagAtt+'</p><a href="'+pageLink+'" class="thickbox" target="_blank">More Info</a>';
         //alert("clicked "+description+" "+thesecats);
        $('#map_marker').empty();
        $('#map_marker').append('<div style="font-size:.8em"><ul>'+li+'</ul></div>');
        tb_show(titleAtt, '#TB_inline?height=280&width=400&inlineId=map_marker' );
        $("#TB_closeWindowButton, #TB_overlay").click(function() {
            selectControl.unselect(feature);
        });
        }
    }
}    
function onFeatureUnselect(feature) {
	feature.attributes.poppedup = false;
} 

function zoomCluster(){
    var displayedFeatures = [];
    var lay = map.layers[1];
    for (var i=0, len=lay.features.length; i<len; i++) {
        var featC = lay.features[i];
        if (featC.onScreen()) {
            displayedFeatures.push(featC);
        }
    }
    console.log(displayedFeatures.length);
    if(displayedFeatures.length<2) {
        console.log('only on left');
        return false;
    }
    else {
        return true;
    }
}
//use STYLE to show different icons      
 
function createMarkers(data,mLayer) {

    //split the filter and feature object
    var dataObject = $.parseJSON(data);

    catFilter  = dataObject[0];
    createLegend(catFilter);
    markerObject = dataObject[1];
    var featureObject = dataObject[1];
   
	var reader = new OpenLayers.Format.GeoJSON({
            'externalProjection': gg,
            'internalProjection': sm
    });

	var featureData = reader.read(featureObject);
    var  myLayer = mLayer;
    myLayer.addFeatures(featureData);

}
function createTimeline(data) {
    //console.log(data);
    createStoryJS({
        type:       'timeline',
        width:      '960',
        height:     '600',
        source:     'http://msc.renci.org/dev/wp-content/plugins/diph/js/test.json',
        embed_id:   'timeline'           // ID of the DIV you want to load the timeline into
    });
}

function loadMarkers(projectID,mLayer){
	jQuery.ajax({
        type: 'POST',
        url: 'http://msc.renci.org/dev/wp-admin/admin-ajax.php',
        data: {
            action: 'diphGetMarkers',
            project: projectID
        },
        success: function(data, textStatus, XMLHttpRequest){
            //console.log(textStatus);
            createMarkers(JSON.parse(data),mLayer);
            //

        },
        error: function(XMLHttpRequest, textStatus, errorThrown){
           alert(errorThrown);
        }
    });
}

function loadTimeline(projectID){
    jQuery.ajax({
        type: 'POST',
        url: 'http://msc.renci.org/dev/wp-admin/admin-ajax.php',
        data: {
            action: 'diphGetTimeline',
            project: projectID
        },
        success: function(data, textStatus, XMLHttpRequest){
            //console.log(textStatus);
            createTimeline(JSON.parse(data));
            //

        },
        error: function(XMLHttpRequest, textStatus, errorThrown){
           alert(errorThrown);
        }
    });
}
});