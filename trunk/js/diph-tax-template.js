jQuery(document).ready(function($) {

var ajax_url = diphData.ajax_url;
console.log(ajax_url);
console.log(diphData.tax);
console.log(diphData.project);
var project_id = diphData.project_id;
console.log(diphData.project['motes']);
var projectObject = JSON.parse(diphData.project);


init_interface();


function init_interface() {

	//getTaxObject


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


}

function loadAudio(url) {
$('#transcript-div').prepend('<div class="info"></div><div class="av-transcript"></div>');
$('#transcript-div .av-transcript').append('<audio id="av-player" src="'+url+'" type="audio/mp3" controls="controls"></audio>');
player = new MediaElementPlayer('#av-player', {enablePluginDebug: false, mode:'shim',features: ['playpause','progress','current','duration','volume']});
//player.setSrc(url);
//player.load();
        player.media.addEventListener('loadeddata', function(){
            
            console.log('audio loaded ');
            
            player.play();   
               //player.media.setCurrentTime(clipPosition);
                //hasPlayed = true;
                //player.media.setCurrentTime(startTime);
                player.pause();   
                
        });
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
	console.log(jsonData);

	//formatTranscript
	var beautiful_transcript = formatTranscript(jsonData['transcript']);

	var audioLink = jsonData['feed']['features'][0]['properties']['audio'];
	console.log(audioLink);
	$('#transcript-div').append(beautiful_transcript);
	loadAudio(audioLink);
	categoryColors();
}

/**
 * [formatTranscript: cleans up quicktime text format transcript and puts it in a list]
 * @author  joeehope
 * @version version
 * @param   {string} dirty_transcript [quicktime text format]
 * @return  {html}  $transcript_html  [html unordered list]
 */
function formatTranscript(dirty_transcript) {
	// split into array by line
	var split_transcript = dirty_transcript.split('\n');
	if(split_transcript) {
		var $transcript_html = $('<ul class="transcript-list"/>');
		_.map(split_transcript, function(val){ 
			//skip values with line breaks...basically empty items
			if(val.length>1) {
				if(val[0]=='['){
					$transcript_html.append('<li class="type-timecode">'+val.trim()+'</li>'); 
				}
				else {
					$transcript_html.append('<li class="type-text">'+val+'</li>'); 
				}
			}		
		});
	}	
	return $transcript_html;
}

function createMoteValue(moteName){
	var motes = _.flatten(projectObject['motes'], true);
	//console.log(_.flatten(motes, true) )
	var moteFound = _.where(motes, {name: moteName});

	if(diphData.tax['parent_name']==moteFound[0]['custom-fields']) {
		console.log(moteFound[0]['delim']+diphData.tax['name'])
		var transcriptVal = moteFound[0]['delim']+diphData.tax['name'];
		loadTranscript(project_id,transcriptVal,diphData.tax['name']);
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
function loadTranscript(projectID,transcriptName,tax){
    jQuery.ajax({
        type: 'POST',
        url: ajax_url,
        data: {
            action: 'diphGetTranscript',
            project: projectID,
            transcript: transcriptName,
            tax_view: tax
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