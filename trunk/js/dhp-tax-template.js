// PURPOSE: ??
//          Loaded by dhp_tax_template() in dhp-project-functions.php
// ASSUMES: dhpData is used to pass parameters to this function via wp_localize_script()
// USES:    JavaScript libraries jQuery, Underscore, Bootstrap ...

jQuery(document).ready(function($) {

    var ajax_url = dhpData.ajax_url;
    console.log(ajax_url);
    console.log(dhpData.tax.name);
    console.log(dhpData);
    var project_id = dhpData.project_id;
    console.log(dhpData.project['motes']);
    var projectObject = JSON.parse(dhpData.project);
    var tcArray = null;

    init_interface();


    function init_interface() {
    	//getTaxObject
    	//$('#content').empty();
    	
    	$('#content').prepend('<h1>'+dhpData.tax['name']+'</h1>');
    	console.log(location.hash);
    	
    	var transcriptObject = settingsHas('entry-points','transcript');

    	if(transcriptObject){
    		console.log(transcriptObject['settings'])

            if(dhpData.tax.parent_name === 'Interviewee') {
                $('#content').prepend('<div id="transcript-div"></div>');
            loadTranscript(dhpData.project_id,dhpData.tax.slug,dhpData.tax.taxonomy);
            //loadAudio(transcriptObject['settings']['audio']);
            createMoteValue(transcriptObject['settings']['transcript']);

            }
    	}
    	//if tax view has map
    	console.log("get markers for map: "+dhpData.tax['name'])
    }

    function loadAudio(url) {
    	$('#transcript-div').prepend('<div class="info"></div><div class="av-transcript"><iframe id="ep-player" class="player" width="100%" height="166" src="http://w.soundcloud.com/player/?url='+url+'&show_artwork=true"></iframe></div>');
     	var iframeElement     = document.querySelector('.player');
        var iframeElementID   = iframeElement.id;
        var widget            = SC.Widget(iframeElement);
        var widget2           = SC.Widget(iframeElementID);
        var WIDGET_PLAYING    = false;
        var seekTimeout       = null;
        widget2.bind(SC.Widget.Events.READY, function() {
            widget2.bind(SC.Widget.Events.PLAY_PROGRESS, function(e) {
                hightlightTranscriptLine(e.currentPosition);
                if(e.currentPosition>10){
                    clearTimeout(seekTimeout);
                }
            });
            widget2.bind(SC.Widget.Events.SEEK, function() {

            });
            widget2.bind(SC.Widget.Events.FINISH, function() {
            
            });       
        });  
        $('.transcript-list').on('click', function(evt){
            var tempSeekTo = null;
            if($(evt.target).closest('.type-timecode').data('timecode')) {
                tempSeekTo = $(evt.target).closest('.type-timecode').data('timecode')
            }
            else {
                tempSeekTo = $(evt.target.previousSibling).data('timecode');
            }       
            widget2.play();
            widget2.seekTo(tempSeekTo);
            seekTimeout = setTimeout(function() {
                widget2.seekTo(tempSeekTo);
            }, 500);          
        });
    }

    function hightlightTranscriptLine(millisecond){
        var foundIndex;
        _.map(tcArray, function(val,index){
            if(millisecond>=val&&millisecond<tcArray[index+1]){
                $('.transcript-list li.type-timecode').removeClass('current-clip');
                $('.transcript-list li.type-timecode').eq(index).addClass('current-clip');
            }
        });
    } 

    function categoryColors(element,color){
        _.each($('.type-timecode'), function(val,index) {
    		var someText = $(val).html().replace(/(\r\n|\n|\r)/gm,"");
    		if(someText=='[00:00:16.19]') {
    		
    			$(val).css('background-color', '#ccc');
    		}
    	});
    }

    function buildTranscriptHtml(jsonData){
    	//formatTranscript
    	var beautiful_transcript = formatTranscript(jsonData['transcript']);

    	var audioLink = jsonData['audio'];
    	console.log(audioLink);
    	$('#transcript-div').append(beautiful_transcript);
    	loadAudio(audioLink);
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
        tcArray = [];
        if(split_transcript) {
            var $transcript_html = $('<ul class="transcript-list"/>');
            _.map(split_transcript, function(val){ 
                //skip values with line breaks...basically empty items
                if(val.length>1) {
                    if(val[0]=='['){
                        tcArray.push(convertToMilliSeconds(val.trim()));
                        $transcript_html.append('<li class="type-timecode" data-timecode="'+convertToMilliSeconds(val.trim())+'">'+val.trim()+'</li>'); 
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

    	if(dhpData.tax['parent_name']==moteFound[0]['custom-fields']) {
    		console.log('mote created')
    		console.log(moteFound[0]['delim']+dhpData.tax['name'])
    		var transcriptVal = moteFound[0]['delim']+dhpData.tax['name'];
    		loadTranscript(project_id,transcriptVal,dhpData.tax['name']);
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

    function convertToMilliSeconds(timecode) {
        var tempN = timecode.replace("[","");
        var tempM = tempN.replace("]","");
        var tempArr = tempM.split(":");

        var secondsCode = parseInt(tempArr[0])*3600 + parseInt(tempArr[1])*60 + parseFloat(tempArr[2]);
        var milliSecondsCode = secondsCode*1000;

        return milliSecondsCode;
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
                action: 'dhpGetTranscriptClip',
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

    function loadTranscript(projectID,taxName,tax){
        jQuery.ajax({
            type: 'POST',
            url: ajax_url,
            data: {
                action: 'dhpGetTranscript',
                project: projectID,
                transcript: taxName,
                tax_view: tax
            },
            success: function(data, textStatus, XMLHttpRequest){
                //console.log(JSON.parse(data));
                //createTimeline(JSON.parse(data));
                buildTranscriptHtml(JSON.parse(data));
                //$('#transcript-div').append(JSON.parse(data));
                $("#dhpress-tips").joyride({ autoStart : true});
                
            },
            error: function(XMLHttpRequest, textStatus, errorThrown){
               alert(errorThrown);
            }
        });
    }
});