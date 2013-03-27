jQuery(document).ready(function($) {

var ajax_url = diphData.ajax_url;
console.log(ajax_url);
console.log(diphData.tax);
console.log(diphData.project);
var project_id = diphData.project_id;
console.log(diphData.project['motes']);
var projectObject = JSON.parse(diphData.project);

//Load views for tax page
var tax_view = {"title":"motename","content":{ "0" : { "mote":"motename"} },"sidebar":{ "0" : { "mote":"motename"} },"footer":"motename"};

init_interface();

console.log(tax_view);


function init_interface() {

	//$('#content').empty();
	$('#content').prepend('<p> List Transcript and Audio</p><div id="transcript-div"></div>');
	$('#content').prepend('<h1>'+diphData.tax['name']+'</h1>');
	console.log(location.hash);
	
	var transcriptObject = settingsHas('entry-points','transcript');

	if(transcriptObject){
		console.log(transcriptObject['settings']['transcript'])
		//loadAudio(transcriptObject['settings']['audio']);
		createMoteValue(transcriptObject['settings']['transcript']);
	}
	//if tax view has map
	console.log("get markers for map: "+diphData.tax['name'])

loadAudio();
}

function loadAudio() {
$('#transcript-div').prepend('<div class="info"></div><div class="av-transcript"></div>');
$('#transcript-div .av-transcript').append('<audio id="av-player" src="http://msc.renci.org/dev/wp-content/uploads/2013/02/03-Submarines.mp3" type="audio/mp3" controls="controls"></audio>');
player = new MediaElementPlayer('#av-player', {enablePluginDebug: false, mode:'shim',features: ['playpause','progress','current','duration','volume']});

	// var player = new MediaElementPlayer('#av-player', {enablePluginDebug: true, mode:'shim',features: ['playpause','progress','current','duration','volume']});
 //    $('#map_marker .av-transcript').append('<audio id="av-player" src="'+audio+'#t='+startTime+','+endTime+'" type="audio/mp3" controls="controls"></audio>');
       
}

function categoryColors(element,color){
_.each($('.type-timecode'), function(val,index) {
		//categoryColors(this,'#ccc');
		//console.log($(val).text())
		var someText = $(val).html().replace(/(\r\n|\n|\r)/gm,"");
		if(someText=='[00:00:16.19]') {
		
			$(val).css('background-color', '#ccc');
		}
	});
}

function buildTranscriptHtml(jsonData){
	//build list
	var re1='\n';	// Square Braces 1
	var split_transcript = jsonData.split('\n',50);
	var sp1 = _.compact(split_transcript);
	var removeTHatCrap = _.uniq(sp1);

	
	var $transcript_html = $('<ul id="object1"/>');
	//$html.append();
	
	if(removeTHatCrap[2].length<=1) {
		removeTHatCrap.splice(2,1);//removes the "" that underscore compact should remove.
	}
	_.map(removeTHatCrap, function(val){ 
		//console.log(val.length); 
		if(val[0]=='['){
			$transcript_html.append('<li class="type-timecode">'+val+'</li>'); 
		}
		else {
			$transcript_html.append('<li class="type-text">'+val+'</li>'); 
		}
		
	});
	console.log(removeTHatCrap);
	$('#transcript-div').append($transcript_html);
	
	categoryColors();
}

function createMoteValue(moteName){
	var motes = _.flatten(projectObject['motes'], true);
	//console.log(_.flatten(motes, true) )
	var moteFound = _.where(motes, {name: moteName});

	if(diphData.tax['parent_name']==moteFound[0]['custom-fields']) {
		console.log(moteFound[0]['delim']+diphData.tax['name'])
		var transcriptVal = moteFound[0]['delim']+diphData.tax['name'];
		loadTranscript(project_id,transcriptVal);
	}


}
function convertToSeconds(timecode) {
	var tempN = timecode.replace("[","");
	var tempM = tempN.replace("]","");
	var tempArr = tempM.split(":");
	//console.log(parseInt(tempArr[2]));
	var secondsCode = parseInt(tempArr[0])*360 + parseInt(tempArr[1])*60 + parseFloat(tempArr[2]);
	return secondsCode;
}

function settingsHas(settingArea,typeName) {
	var settings = projectObject;
	var hasIt = _.where(settings[settingArea], {type: typeName});
	return hasIt[0];
	//console.log(hasIt)
}
function loadTranscriptClip(projectID,transcriptName,clip){
    jQuery.ajax({
        type: 'POST',
        url: ajax_url,
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
function loadTranscript(projectID,transcriptName){
    jQuery.ajax({
        type: 'POST',
        url: ajax_url,
        data: {
            action: 'diphGetTranscript',
            project: projectID,
            transcript: transcriptName
        },
        success: function(data, textStatus, XMLHttpRequest){
            //console.log(JSON.parse(data));
            //createTimeline(JSON.parse(data));
            buildTranscriptHtml(JSON.parse(data));
            //$('#transcript-div').append(JSON.parse(data));

        },
        error: function(XMLHttpRequest, textStatus, errorThrown){
           alert(errorThrown);
        }
    });
}
});