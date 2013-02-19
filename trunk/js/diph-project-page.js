// JavaScript Document

var map, map2, projectID, mObject, lookupParents,markerObject,catFilter,player,clipPosition,dataObject;
//jQuery noconfilct wrapper fires when page has loaded
jQuery(document).ready(function($) {

var projectID = $('.post').attr('id')

$('#map_marker').append('<div class="info"></div><div class="av-transcript"></div>');
//$('#map_marker .av-transcript').append('<audio id="av-player" src="http://msc.renci.org/dev/wp-content/uploads/2013/02/03-Submarines.mp3" type="audio/mp3" controls="controls"></audio>');
//player = new MediaElementPlayer('#av-player', {enablePluginDebug: true, mode:'shim',features: ['playpause','progress','current','duration','volume']});
var videoHasPlayed = false;


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
    getColor: function(feature) {
        var cats;
        if(feature.cluster) {
            cats = feature.cluster[0].attributes.categories;
        }
        else {    
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
        }
        else {
            return '';
        }
    }
};

var template = {
    fillColor: "${getColor}",
    strokeColor: "#32a8a9",
    pointRadius: 10, // using context.getSize(feature)
    width:20,
    externalGraphic: "${getIcon}", //context.getIcon(feature)
    graphicZIndex: 1
    // ,
    // label:"${getLabel}"
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

loadMarkers(projectID,mObject);   

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
                if(lookupData[i].icon_url.substring(0,1) == 'h') {
                    return lookupData[i].icon_url;
                }
                else {
                    return '';
                }
            }
            else {
                //for each child cat
                var tempChildren = lookupData[i].children;
                var tempChildCount = tempChildren.length;
                for (k=0;k<tempChildCount;k++) {
                    if(tempChildren[k]==categories[j]) {
                       if(lookupData[i].icon_url.substring(0,1) == 'h') {
                            return lookupData[i].icon_url;
                        }
                        else {
                            return '';
                        }
                    }
                }
            }
       }
        
    }

}
function getHighestParentColor(categories) {

    var lookupData = findSelectedCats();

    var countTerms = Object.keys(lookupData).length; 
    var countCats = categories.length;
    for(i=0;i<countTerms;i++) {

        for(j=0;j<countCats;j++) {

            var tempName = lookupData[i].name;
            if (tempName==categories[j]) {
                if(lookupData[i].icon_url.substring(0,1) == '#') {
                    return lookupData[i].icon_url;
                }
                else {
                    return '';
                }
            }
            else {
                //for each child cat
                var tempChildren = lookupData[i].children;
                var tempChildCount = tempChildren.length;
                for (k=0;k<tempChildCount;k++) {
                    if(tempChildren[k]==categories[j]) {
                       if(lookupData[i].icon_url.substring(0,1) == '#') {
                            return lookupData[i].icon_url;
                        }
                        else {
                            return '';
                        }
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
    //console.log('here'+_.size(object));
var legendHtml;
var mapPosition = $('#map_div').position();
    var mapWidth = $('#map_div').width();
    var pageWidth = $('body').width();
    var pageHeight = $('body').height();
    var spaceRemaining = pageWidth-mapWidth;

    var rightDiv = mapPosition.left + 50;
    var topDiv = mapPosition.top + 40;
    
    $('#main').prepend('<div id="legends"><div class="nav"></div></div>');

    for (j=0;j<Object.keys(object).length;j++) {
       
        var filterTerms = object[j].terms;
        var legendName = object[j].name;
        var countTerms = Object.keys(filterTerms).length; 
        
        legendHtml = $('<div class="'+legendName+' legend-div" id="term-legend-'+j+'"><ul class="terms"></ul></div>');
        for(i=0;i<countTerms;i++) {
            if(legendName!=filterTerms[i].name) {
                if(i>14) {
                $('ul', legendHtml).append('<li><input type="checkbox" ><img src="'+filterTerms[i].icon_url+'" /> <a class="value">'+filterTerms[i].name+'</a></li>');
                }
                else {
                  $('ul', legendHtml).append('<li><input type="checkbox" checked="checked"><img src="'+filterTerms[i].icon_url+'" /> <a class="value">'+filterTerms[i].name+'</a></li>');
                  
                }
            }
        }
        $(legendHtml).append('<ul class="controls"><li><input type="checkbox" ><a class="value">All</a></li><ul>');
       

        $('#legends').append(legendHtml);
        $('#legends .nav').append('<a href="#term-legend-'+j+'">'+legendName+'</a>');

        $('#legends').css({'left':rightDiv, 'top':topDiv,'z-index':1998,'padding':'10px'});

        $('#term-legend-'+j+'').mousemove(function(e){
            var xpos = e.pageX - 250;
            var ypos = e.pageY + 15;
            $('#child_legend-'+j+'').css({'left':xpos,'top':ypos});
        });
        var childrenLegendHtml = $('<div id="child_legend-'+j+'"><h3>Children Terms</h3><ul></ul></div>');
        //$('body').append(childrenLegendHtml);
        $('#child_legend-'+j+'').css({'width':'200px','margin-left':'200px','top':'40px','position':'absolute','z-index': '2001' });
        $('#term-legend-'+j+' ul.terms li a').click(function(event){
            var spanName = $(this).text();
            console.log(spanName);
            $('#term-legend-'+j+' ul input').removeAttr('checked');
            $('#term-legend-'+j+' ul.terms li.selected').removeClass('selected');
            $(this).closest('li').addClass('selected');
            $(this).closest('li').find('input').attr('checked',true);
            var tempO = findSelectedCats(spanName); 
            //console.log('single object '+tempO)
            console.log(tempO)
            updateLayerFeatures(tempO);
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
        $('#term-legend-'+j+' ul.terms input').click(function(){
            var tempO = findSelectedCats(); 
            console.log(tempO)       
            updateLayerFeatures(tempO);
        });
        $('#term-legend-'+j+' ul.controls li').click(function(){
            $('#term-legend-'+j+' ul input').attr('checked',true);
            $('#term-legend-'+j+' ul.terms li').css({'background': 'none'});
            var tempO = findSelectedCats(); 
            console.log(tempO)       
            updateLayerFeatures(tempO);
            
        });
    }
    $('.legend-div').hide();
    $('#term-legend-0').show();
    $('.nav a').click(function(){
        var action = $(this).attr('href');
        var filter = $(this).text();
        $('.legend-div').hide();
        switchFilter(filter);
        $(action).show();
    });
    $('.launch-timeline').click(function(){
        loadTimeline('4233');  
    });
}
function switchFilter(filterName) {
    console.log(filterName);
    for(i=0;i<Object.keys(dataObject).length;i++) {
        if(dataObject[i].type =='filter'&&dataObject[i].name ==filterName) {
            catFilter= dataObject[i];
        }
        
    }
}
function updateLayerFeatures(catObject){

    //find all features with cat
    //var feats = _.where(markerObject, function(){ return _.contains(list, value)});
    var countTerms = Object.keys(catObject).length; 
    var newFeatures = {type: "FeatureCollection", features: []};
    var childCatObject = [];
    for (var i = 0, len = countTerms; i < len; i++) {
        childCatObject.push(catObject[i].name);
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
        $('#legends ul.terms input:checked').each(function(index){
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
                selCatFilter[0] = catFilter.terms[i];
            }
        }
    }

    return selCatFilter;
}
function convertToSeconds(timecode) {
    var tempN = timecode.replace("[","");
    var tempM = tempN.replace("]","");
    var tempArr = tempM.split(":");
    //console.log(parseInt(tempArr[2]));
    var secondsCode = parseInt(tempArr[0])*360 + parseInt(tempArr[1])*60 + parseFloat(tempArr[2]);
    return secondsCode;
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

	//if(!feature.cluster||(feature.attributes.count==1)) {
        
        if(feature.cluster){selectedFeature = feature.cluster[0]}
        else {selectedFeature = feature;}

		 var pageLink = selectedFeature.attributes.link;
		 var titleAtt =  selectedFeature.attributes.title;
		 var tagAtt =  selectedFeature.attributes.categories;
         var audio =  selectedFeature.attributes.audio;
         var transcript =  selectedFeature.attributes.transcript;
         var timecode =  selectedFeature.attributes.timecode;
         var time_codes = timecode.split('-');
         clipPosition = time_codes[0];
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
		
		li += tagAtt+' '+audio+' '+transcript+' '+timecode+'</p><a href="'+pageLink+'" class="thickbox" target="_blank">More Info</a>';
		 //alert("clicked "+description+" "+thesecats);
		$('#map_marker .info').empty();
		$('#map_marker .info').append('<div style="font-size:.8em"><ul>'+li+'</ul></div>');
        //$('#av-transcript').get(0).setSrc(audio);
        //player.pause();
		
        console.log(timecode)
        if(timecode) { 
            var startTime = convertToSeconds(time_codes[0]);
            var endTime = convertToSeconds(time_codes[1]);
            loadTranscriptClip(projectID,transcript,timecode);

             $('#map_marker .av-transcript').append('File sizes are too large to load on page. Link to page to listen to audio.');

        }
        //var player = new MediaElementPlayer('#av-player', {enablePluginDebug: true, mode:'shim',features: ['playpause','progress','current','duration','volume']});
        //$('#map_marker .av-transcript').append('<audio id="av-player" src="'+audio+'#t='+startTime+','+endTime+'" type="audio/mp3" controls="controls"></audio>');
       
        // player.setSrc(audio+'#t=50,100');
        // player.load();
        // player.media.addEventListener('loadeddata', function(){
            
        //     console.log('audio loaded '+player.src);
            
        //     player.play();   
        //        //player.media.setCurrentTime(clipPosition);
        //         //hasPlayed = true;
        //         //player.media.setCurrentTime(startTime);
        //         player.pause();   
                
        // });
        // player.media.addEventListener('play', function(){

        //     //player.pause();
        //     //console.log('play');
        //     //console.log(player.media.currentTime);
        //     //player.media.setCurrentTime(startTime);
        //     //player.media.currentTime = 200;
        //     //player.media.setCurrentTime(200);
        // }, false);
        // player.media.addEventListener('progress', function(){

        //     //player.pause();
        //     //console.log('playing');
        //     //console.log(player.media.currentTime);

        //     if(player.media.currentTime > endTime) {
        //         player.pause();

                
        //     }
        //     //player.media.setCurrentTime(startTime);
        //     //player.media.currentTime = 200;
        //     //player.media.setCurrentTime(200);
        // }, false);


        //player.pause();
        //console.log(time_codes[0]);
        //player.setCurrentTime(clipPosition);
        //player.play();
        //player.setCurrentTime(time_codes[0]);
        //player.media.currentTime = time_codes[0];
        
        // player.media.addEventListener('playing', function(){
        //     console.log('playing');
        //     this.pause();
        //     this.currentTime = 10;
        //     this.setCurrentTime(time_codes[0]);
        //     this.play();
                
        // });
        //player.setCurrentTime(time_codes[0]);
        //player.play();

        tb_show(titleAtt, '#TB_inline?height=480&width=400&inlineId=map_marker' );

        //build function to load transcript clip and load media player
        

        $("#TB_closeWindowButton, #TB_overlay").click(function() {
    		selectControl.unselect(feature);
            //player.pause();
            //player.setSrc('');
            //player.remove();
		});
		 
	//	}
		// else
  //   {
  //      // fetch the cluster's latlon and set the map center to it and call zoomin function
  //      // which takes you to a one level zoom in and I hope this solves your purpose :) 
  //      if(zoomCluster()) {
  //           map.setCenter(feature.geometry.getBounds().getCenterLonLat());
  //           map.zoomIn();
  //       }
  //       else {
  //           selectedFeature = feature.cluster[0];
        
  //        var pageLink = selectedFeature.attributes.link;
  //        var titleAtt =  selectedFeature.attributes.title;
  //        var tagAtt =  selectedFeature.attributes.categories;
  //        var thumb;
  //        if(selectedFeature.attributes.thumb){
  //            thumb = selectedFeature.attributes.thumb;
  //            var thumbHtml = '<img src="'+thumb+'"/><br/>';
  //            }
  //        var li = '<b>'+titleAtt+'</b>';
  //        //for(var attr in selectedFeature.attributes){
  //        //   li += "<li><div style='width:25%;float:left'>" + attr + "</div><div style='width:75%;float:right'>" 
  //        //   + selectedFeature.attributes[attr] + "</div></li>";
  //       //  }
  //       li += '<p>';
  //       if(thumbHtml){
  //           li+= thumbHtml;
  //       }
        
  //       li += tagAtt+'</p><a href="'+pageLink+'" class="thickbox" target="_blank">More Info</a>';
  //        //alert("clicked "+description+" "+thesecats);
  //       $('#map_marker .info').empty();
  //       $('#map_marker .info').append('<div style="font-size:.8em"><ul>'+li+'</ul></div>');
  //       $('#map_marker .info').append('<audio id="player2" src="'++'" type="audio/mp3" controls="controls"></audio>';
  //       tb_show(titleAtt, '#TB_inline?height=280&width=400&inlineId=map_marker' );
  //       $("#TB_closeWindowButton, #TB_overlay").click(function() {
  //           selectControl.unselect(feature);
  //       });
  //       }
  //   }
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
    //Object.keys(lookupData).length; 
    dataObject = $.parseJSON(data);
    console.log(Object.keys(dataObject).length);
    var featureObject;
    var legends = new Object();
    for(i=0;i<Object.keys(dataObject).length;i++) {
        if(dataObject[i].type =='filter') {
            legends[i] = (dataObject[i]);
        }
        if(dataObject[i].type =='FeatureCollection') {
            featureObject = dataObject[i];
            markerObject = dataObject[i];
        }
    }
    catFilter  = legends[0];//dataObject[0];
    console.log(markerObject);
    createLegend(legends);
    //markerObject = dataObject[2];
    //var featureObject = dataObject[2];
   
	var reader = new OpenLayers.Format.GeoJSON({
            'externalProjection': gg,
            'internalProjection': sm
    });

	var featureData = reader.read(featureObject);
    var  myLayer = mLayer;
    myLayer.addFeatures(featureData);




//player.pause();

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
function loadTranscriptClip(projectID,transcriptName,clip){
    jQuery.ajax({
        type: 'POST',
        url: 'http://msc.renci.org/dev/wp-admin/admin-ajax.php',
        data: {
            action: 'diphGetTranscript',
            project: projectID,
            transcript: transcriptName,
            timecode: clip
        },
        success: function(data, textStatus, XMLHttpRequest){
            console.log(JSON.parse(data));
            //createTimeline(JSON.parse(data));
            //

        },
        error: function(XMLHttpRequest, textStatus, errorThrown){
           alert(errorThrown);
        }
    });
}
});