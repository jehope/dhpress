// PURPOSE: Used for displaying posts based on a taxonomic term
//          (i.e., results of searching on Legend)
//          Loaded by dhp_tax_template() in dhp-project-functions.php
// ASSUMES: dhpData is used to pass parameters to this function via wp_localize_script()
//              These parameters are: ajax_url, project_id, project_settings
// USES:    JavaScript libraries jQuery, Underscore, Bootstrap, OpenLayers, CDLA maps, SoundCloud
// TO DO:   Should we not hardcode Interviewee as special taxonomic name??

jQuery(document).ready(function($) {

    var ajax_url = dhpData.ajax_url;
    // console.log(ajax_url);
    // console.log(dhpData.tax.name);
    // console.log(dhpData);
    var project_id = dhpData.project_id;
    // console.log(dhpData.project['motes']);
    var projectSettings = JSON.parse(dhpData.project_settings);

        // Time-Code array -- stores series of timecodes in milliseconds, computed by formatTranscript()
    var tcArray = null;
        // Holds index of current row in transcript being played by audio
    var rowIndex = null;

    init_interface();


    function init_interface() {
    	//getTaxObject
    	//$('#content').empty();

            // Insert name of taxonomy on page
    	$('#content').prepend('<h1>'+dhpData.tax['name']+'</h1>');
    	// console.log(location.hash);

    	var transcriptObject = settingsHas('entry-points','transcript');

    	if(transcriptObject){
    		// console.log(transcriptObject['settings']);

            if(dhpData.tax.parent_name === 'Interviewee') {
                $('#content').prepend('<div id="transcript-div"></div>');
                loadTranscript(dhpData.project_id,dhpData.tax.slug,dhpData.tax.taxonomy);
                //loadAudio(transcriptObject['settings']['audio']);
                createMoteValue(transcriptObject['settings']['transcript']);
            }
    	}
    	//if tax view has map
    	// console.log("get markers for map: "+dhpData.tax['name'])
    }

        // PURPOSE: Load audio for transcription and HTML elements
        //          Connect timer (for advancing timecode "playhead") and event handling (for seeking to timecodes)
    function loadAudio(url) {
    	$('#transcript-div').prepend('<div class="info"></div><div class="av-transcript"><iframe id="ep-player" class="player" width="100%" height="166" src="http://w.soundcloud.com/player/?url='+url+'&show_artwork=true"></iframe></div>');
        var iframeElement    = document.querySelector('.player');
        var iframeElementID  = iframeElement.id;
        var soundCloudWidget = SC.Widget(iframeElementID);
        var WIDGET_PLAYING   = false;
        var seekTimeout      = null;

        soundCloudWidget.bind(SC.Widget.Events.READY, function() {
            soundCloudWidget.play();

            soundCloudWidget.bind(SC.Widget.Events.PLAY, function() {
                    WIDGET_PLAYING = true;             
                });
            soundCloudWidget.bind(SC.Widget.Events.PAUSE, function() {
                WIDGET_PLAYING = false;
            });
                // Move playhead along as play happens
            soundCloudWidget.bind(SC.Widget.Events.PLAY_PROGRESS, function(e) {             
                if(e.currentPosition<500){
                    soundCloudWidget.pause();
                }
                hightlightTranscriptLine(e.currentPosition);
            });
            soundCloudWidget.bind(SC.Widget.Events.SEEK, function() {

            });
            soundCloudWidget.bind(SC.Widget.Events.FINISH, function() {
            
            });       
        });
            // Allow user to click on a timecode to go to it
        $('.transcript-list').on('click', function(evt){
            var tempSeekTo = null;
            if($(evt.target).hasClass('type-timecode')) {
                tempSeekTo = $(evt.target).closest('.type-timecode').data('timecode');
                soundCloudWidget.seekTo(tempSeekTo);
                if(!WIDGET_PLAYING) {
                    soundCloudWidget.play();
                }
            }     
        });
    }

        // PURPOSE: Given position in milliseconds, find and highlight tag corresponding to play position
        // ASSUMES: tcArray has been compiled, contains 1 entry at end beyond # of "playheads"
    function hightlightTranscriptLine(millisecond){
        var match;
        _.find(tcArray, function(val, index){
            match = (millisecond >= val && millisecond < tcArray[index+1]);
            if (match) {
                if(rowIndex!==index) {
                    rowIndex      = index;
                    var topDiff   = $('.transcript-list div.type-timecode').eq(index).offset().top - $('.transcript-list').offset().top;
                    var scrollPos = $('.transcript-list').scrollTop() +topDiff;
                    
                    $('.transcript-list').animate({
                       scrollTop: scrollPos
                    }, 500);
                    $('.transcript-list div.type-timecode').removeClass('current-clip');
                    $('.transcript-list div.type-timecode').eq(index).addClass('current-clip');
                }
                
            }
        });
    }

    
    // find tallest div.row in transcript and set container max-height 40px larger. Default is max 300px
    function searchForMaxHeight(elements) {
        var maxHeight = 0;
        _.each(elements, function(val){ 
            if($(val).height()>maxHeight){
                maxHeight = $(val).height();
            }
        });
        $('.transcript-list').css({'max-height': maxHeight+40});
    }
    // function categoryColors(element,color){
    //     _.each($('.type-timecode'), function(val,index) {
    // 		var someText = $(val).html().replace(/(\r\n|\n|\r)/gm,"");
    // 		if(someText=='[00:00:16.19]') {
    // 			$(val).css('background-color', '#ccc');
    // 		}
    // 	});
    // }

        // PURPOSE: Handle AJAX return for audio -- append HTML for transcript and playheads and handle events
    function buildTranscriptHtml(jsonData){
    	//formatTranscript
    	var beautiful_transcript = formatTranscript(jsonData['transcript']);

    	var audioLink = jsonData['audio'];
    	console.log(audioLink);
    	$('#transcript-div').append(beautiful_transcript);
        searchForMaxHeight($('.transcript-list .row'));
    	loadAudio(audioLink);

        if(jsonData['transcript2'] && jsonData['transcript2']!=='none') {
           attachSecondTranscript(jsonData['transcript2']);
        }
    }

        // PURPOSE: Take a QuickTime text format transcription and turn into list
        // INPUT:   dirty_transcript = long text string
        // RETURNS: HTML string for timecode heads and text itself
        // TO DO:   Does this handle dual-language??
    function formatTranscript(dirty_transcript) {
        // split into array by line
        var transcript_html='';
        // split into array by line
        var split_transcript = dirty_transcript.trim().split(/\r\n|\r|\n/g);
        tcArray = [];
        // console.log(split_transcript)
        if(split_transcript) {
            transcript_html = $('<div class="transcript-list"/>');

            var index = 0;
            var textBlock;
            var lineClass = ['','odd-line'];
            _.each(split_transcript, function(val){
                val = val.trim();
                var oddEven = index % 2; 
                //skip values with line breaks...basically empty items
                if(val.length>1) {       
                    
                    if(val[0]==='['&&val[1]==='0'){                  
                        if(index>0) {
                            $('.row', transcript_html).eq(index-1).append('<div class="type-text">'+textBlock+'</div>');
                        }
                        index++;
                        textBlock = ''; 
                        transcript_html.append('<div class="row '+lineClass[oddEven]+'"><div class="type-timecode" data-timecode="'+convertToMilliSeconds(val)+'">'+val+'</div></div>');
                        tcArray.push(convertToMilliSeconds(val));
                    }
                    else {
                        textBlock += val;                       
                    }                   
                }
            });
        }
        return transcript_html;
    }

    function attachSecondTranscript(transcriptData){
        //target $('.transcript-list')
        var split_transcript = transcriptData.trim().split(/\r\n|\r|\n/g);
         $('.transcript-list').addClass('two-column');
        var first_transcriptHTML = $('.transcript-list .type-text');
        // console.log(split_transcript)
        var textArray = [];
        var textBlock;
        var index = 0;
        if(split_transcript) {
            _.each(split_transcript, function(val){
                //skip values with line breaks...basically empty items
                val = val.trim();
                if(val.length>1) {
                    if(val[0]==='['&&val[1]==='0'){
                        if(index>0) {
                            textArray.push(textBlock);
                        }
                        textBlock='';
                    }
                    else {
                        textBlock += val;
                    }
                    index++;
                }
            });
        }
        //loop thru original transcript and add second lines
         _.each(textArray, function(val,index){
            var lineClass = '';
            if($(first_transcriptHTML).eq(index).hasClass('odd-line')) {
                lineClass = 'odd-line';
            }
            $(first_transcriptHTML).eq(index).after('<div class="type-text '+lineClass+'">'+val+'</div>')
         });
    }


        // PURPOSE: ??
    function createMoteValue(moteName){
    	var motes = _.flatten(projectSettings['motes'], true);
    	//console.log(_.flatten(motes, true) )
    	var moteFound = _.where(motes, {name: moteName});

    	if(dhpData.tax['parent_name']==moteFound[0]['custom-fields']) {
    		console.log('mote created');
    		console.log(moteFound[0]['delim']+dhpData.tax['name']);
    		var transcriptVal = moteFound[0]['delim']+dhpData.tax['name'];
    		loadTranscript(project_id,transcriptVal,dhpData.tax['name']);
    	}
    }

        // RETURNS: timecode as # of seconds
    function convertToSeconds(timecode) {
    	var tempN = timecode.replace("[","");
    	var tempM = tempN.replace("]","");
    	var tempArr = tempM.split(":");
    	//console.log(parseInt(tempArr[2]));
    	var secondsCode = parseInt(tempArr[0])*360 + parseInt(tempArr[1])*60 + parseFloat(tempArr[2]);
    	return secondsCode;
    }

        // RETURNS: timecode as # of milliseconds
    function convertToMilliSeconds(timecode) {
        var tempN = timecode.replace("[","");
        var tempM = tempN.replace("]","");
        var tempArr = tempM.split(":");

        var secondsCode = parseInt(tempArr[0])*3600 + parseInt(tempArr[1])*60 + parseFloat(tempArr[2]);
        var milliSecondsCode = secondsCode*1000;

        return milliSecondsCode;
    }

    function settingsHas(settingArea,typeName) {
    	var settings = projectSettings;
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
                $("#dhpress-tips").joyride({ });
                
            },
            error: function(XMLHttpRequest, textStatus, errorThrown){
               alert(errorThrown);
            }
        });
    }
});