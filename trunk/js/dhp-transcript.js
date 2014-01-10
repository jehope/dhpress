/** DHPressTranscript -- contains all data and functions
 **/

var dhpTranscript = {
        // Fields created by this object:
    // tcArray, rowIndex, transcriptData, parseTimeCode


        // PURPOSE: Initialize transcript mechanisms
    initialize: function()
    {
        this.parseTimeCode = /(\d+)\:(\d+)\:([\d\.]+)/;         // a very generous definition of timecode!
    }, // initialize()


        // PURPOSE: Build all HTML and initialize controls for a specific transcript associated with a Marker
        // INPUT:   ajaxURL = URL to use for loading data (or null if already loaded)
        //          htmlID = jQuery selector to specify where resulting HTML should be appended
        //          transParams = object whose fields specify data about transcription:
        //              audio, transcript, transcript2, timecode, startTime, endTime
        //              timecode = -1 if full transcript (not excerpt), transcript and transcript2 already loaded
    prepareOneTranscript: function (ajaxURL, projectID, htmlID, transParams)
    {
        var appendPos;
        var WIDGET_PLAYING   = false;
        var fullTranscript   = (transParams.timecode == -1);

        console.log("Preparing transcript: Audio = "+transParams.audio);

            // Initialize this object's variables
        dhpTranscript.rowIndex = null;
        dhpTranscript.transcriptData = [];

        appendPos = jQuery(htmlID);
        if (appendPos == null) {
            throw new Error("Cannot find HTML DIV at which to append transcript.");
        }
        appendPos.append('<div class="transcript-ep"><p class="pull-right"><iframe id="ep-player" class="player" width="100%" height="166" src="http://w.soundcloud.com/player/?url='+transParams.audio+'&show_artwork=true"></iframe></p></div>');

            // Is there any primary transcript data?
        if(transParams.transcript && transParams.transcript!=='none') {
            if (fullTranscript) {
                dhpTranscript.attachTranscript(transParams.transcript, 0);
            } else {
                dhpTranscript.loadTranscriptClip(ajaxURL, projectID, transParams.transcript, transParams.timecode, 0);
            }
        }
            // Is there 2ndary transcript data? If only 2nd, treat as 1st
        if(transParams.transcript==='none' && transParams.transcript2 && transParams.transcript2!=='none') {
            if (fullTranscript) {
                dhpTranscript.attachTranscript(transParams.transcript2, 0);
            } else {
                dhpTranscript.loadTranscriptClip(ajaxURL, projectID, transParams.transcript2, transParams.timecode, 0);
            }
        }
            // Otherwise, add 2nd to 1st
        else if(transParams.transcript!=='none' && transParams.transcript2 && transParams.transcript2!=='none') {
            if (fullTranscript) {
                dhpTranscript.attachTranscript(transParams.transcript2, 1);
            } else {
                dhpTranscript.loadTranscriptClip(ajaxURL, projectID, transParams.transcript2, transParams.timecode, 1);
            }
        }

            // Must wait to set these variables after HTML appended above
        var iframeElement    = document.querySelector('.player');
        var soundCloudWidget = SC.Widget(iframeElement.id);

            // Setup audio/transcript SoundClod player
        soundCloudWidget.bind(SC.Widget.Events.READY, function() {
              // load new widget
            // soundCloudWidget.play();         // Don't invoke immediate play as data may not be loaded yet
            soundCloudWidget.bind(SC.Widget.Events.PLAY, function() {
                WIDGET_PLAYING = true;
            });
            soundCloudWidget.bind(SC.Widget.Events.PAUSE, function() {
                WIDGET_PLAYING = false;
            });
            soundCloudWidget.bind(SC.Widget.Events.PLAY_PROGRESS, function(e) {
                    // Keep within bounds if only excerpt of longer transcript
                if ((!fullTranscript) && (e.currentPosition < transParams.startTime)) {
                    soundCloudWidget.pause();
                    soundCloudWidget.seekTo(transParams.startTime);
                }
                if ((!fullTranscript) && (e.currentPosition > transParams.endTime)) {
                    soundCloudWidget.pause();
                }
                dhpTranscript.hightlightTranscriptLine(e.currentPosition);
            });
            soundCloudWidget.bind(SC.Widget.Events.SEEK, function() {});
            soundCloudWidget.bind(SC.Widget.Events.FINISH, function() {});
        });

            // Allow user to click on a timecode to go to it
        jQuery('.transcript-ep').on('click', function(evt) {
            var tempSeekTo = null;
            if(jQuery(evt.target).hasClass('type-timecode')) {
                tempSeekTo = jQuery(evt.target).closest('.type-timecode').data('timecode');
                soundCloudWidget.seekTo(tempSeekTo);
                if(!WIDGET_PLAYING) {
                    soundCloudWidget.play();
                }
            }
        });

        jQuery(htmlID).on('hidden', function () {
            if(WIDGET_PLAYING) {
                var tempWidget = SC.Widget(iframeElementID);
                tempWidget.pause();
            }
        });
    }, // prepareOneTranscript()


        // PURPOSE: Build all HTML and initialize controls for transcript associated with a Taxonomic Term
        // INPUT:   ajaxURL = URL to use for loading data
        //          htmlID = jQuery selector to specify where resulting HTML should be appended
        //          taxTerm = head taxonomic term
        //          transcript = end of URL for specific transcript
    prepareTaxTranscript: function (ajaxURL, projectID, htmlID, taxTerm, transcript)
    {
        jQuery.ajax({
            type: 'POST',
            url: ajaxURL,
            data: {
                action: 'dhpGetTaxTranscript',
                project: projectID,
                transcript: transcript,
                tax_term: taxTerm
            },
            success: function(data, textStatus, XMLHttpRequest){
                console.log("Tax transcript = "+data);
                if (data != null) {
                    var results = JSON.parse(data);
                    var transParams = {
                        'audio'         : results.audio,
                        'transcript'    : results.transcript,
                        'transcript2'   : results.transcript2,
                        'timecode'      : -1,
                        'startTime'     : -1,
                        'endTime'       : -1
                    };
                    dhpTranscript.prepareOneTranscript(null, projectID, htmlID, transParams);
                }
            },
            error: function(XMLHttpRequest, textStatus, errorThrown){
               alert(errorThrown);
            }
        });
    }, // prepareTaxTranscript()


// ==================== INTERNAL FUNCTIONS (only used by the functions above) ==============

    loadTranscriptClip: function(ajaxURL, projectID, transcriptName, clip, order)
    {
        jQuery.ajax({
            type: 'POST',
            url: ajaxURL,
            data: {
                action: 'dhpGetTranscriptClip',
                project: projectID,
                transcript: transcriptName,
                timecode: clip
            },
            success: function(data, textStatus, XMLHttpRequest){
                //console.log(JSON.parse(data));
                dhpTranscript.attachTranscript(JSON.parse(data), order);
            },
            error: function(XMLHttpRequest, textStatus, errorThrown){
               alert(errorThrown);
            }
        });
    }, // loadTranscriptClip()


        // PURPOSE: Given a millisecond reading, unhighlight any previous "playhead" and highlight new one
    hightlightTranscriptLine: function (millisecond)
    {
        var match;

        _.find(dhpTranscript.tcArray, function(timecode, index){
            match = (millisecond<timecode);
            if (match) {
                if(dhpTranscript.rowIndex!==index) {
                    dhpTranscript.rowIndex = index;
                    var topDiff = jQuery('.transcript-list div.type-timecode').eq(index).offset().top - jQuery('.transcript-list').offset().top;
                    var scrollPos = jQuery('.transcript-list').scrollTop() + topDiff;
                    jQuery('.transcript-list').animate({
                       scrollTop: scrollPos
                    }, 500);
                }
                jQuery('.transcript-list div.type-timecode').removeClass('current-clip');
                jQuery('.transcript-list div.type-timecode').eq(index).addClass('current-clip');
            }
            return match;
        });
        //$('.type-timecode').attr('data-timecode');
    }, // hightlightTranscriptLine()


        // PURPOSE: Convert timecode string into # of milliseconds
        // INPUT:   timecode must be in format [HH:MM:SS] or [HH:MM:SS.ss]
        // ASSUMES: timecode in correct format, parseTimeCode contains compiled RegEx
    convertToMilliSeconds: function (timecode)
    {
        var milliSecondsCode = new Number();
        var matchResults;

        matchResults = dhpTranscript.parseTimeCode.exec(timecode);
        if (matchResults !== null) {
            // console.log("Parsed " + matchResults[1] + ":" + matchResults[2] + ":" + matchResults[3]);
            milliSecondsCode = (parseInt(matchResults[1])*3600 + parseInt(matchResults[2])*60 + parseFloat(matchResults[3])) * 1000;
        } else {
            throw new Error("Error in transcript file: Cannot parse " + timecode + " as timecode.");
            milliSecondsCode = 0;
        }
        return milliSecondsCode;
    }, // convertToMilliSeconds()


        // PURPOSE: Clean up quicktime text, format transcript (left-side specific) and put it in a list
        // INPUT:   transcriptData = quicktime text format
        // RETURNS: HTML for transcription 
    formatTranscript: function (transcriptData)
    {
        var transcript_html='';
            // split transcript text into array by line
        var split_transcript = new String(transcriptData);
        split_transcript = split_transcript.trim().split(/\r\n|\r|\n/g);
        // var split_transcript = transcriptData.trim().split(/\r\n|\r|\n/g);       // More efficient but not working!

            // empty time code array
        dhpTranscript.tcArray = [];
        // console.log(split_transcript)
        if(split_transcript) {
            transcript_html = jQuery('<div class="transcript-list"/>');

            var index = 0;
            var timecode;
            var textBlock;
            var lineClass = ['','odd-line'];
            var oddEven;
            _.each(split_transcript, function(val) {
                val = val.trim();
                oddEven = index % 2;
                    // Skip values with line breaks...basically empty items
                if(val.length>1) {
                        // Does it begin with a timecode?
                    if(val[0]==='['&&val[1]==='0'){
                        if(index>0) {
                            jQuery('.row', transcript_html).eq(index-1).append('<div class="type-text">'+textBlock+'</div>');
                        }
                        index++;
                        textBlock = ''; 
                        timecode = dhpTranscript.convertToMilliSeconds(val);
                        transcript_html.append('<div class="row '+lineClass[oddEven]+'"><div class="type-timecode" data-timecode="'+timecode+'">'+val+'</div></div>');
                        dhpTranscript.tcArray.push(timecode);
                    }
                    else {
                        textBlock += val;                       
                    }                   
                }
            });
        }
            // Shift array of timecodes so that entry is end-time rather than start-time of associated section
        dhpTranscript.tcArray.shift();
            // Append very large number to end to ensure can't go past last item! 9 hours * 60 minutes * 60 seconds * 1000 milliseconds = 
        dhpTranscript.tcArray.push(32400000);
        return transcript_html;
    }, // formatTranscript()


    attachSecondTranscript: function(transcriptData)
    {
        //target $('.transcript-list')
        var split_transcript = new String(transcriptData);
        split_transcript = split_transcript.trim().split(/\r\n|\r|\n/g);
        // var split_transcript = transcriptData.trim().split(/\r\n|\r|\n/g);       // More efficient but not working!

        jQuery('.transcript-list').addClass('two-column');
        var first_transcriptHTML = jQuery('.transcript-list .type-text');
        // console.log(split_transcript)
        var textArray = [];
        var textBlock;
        var index = 0;
        var lineClass;

        if(split_transcript) {
            _.each(split_transcript, function(val){
                    // Skip values with line breaks...basically empty items
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

            // Loop thru HTML for left-side transcript and add right-side text
         _.each(textArray, function(val, index) {
            lineClass = '';
            if(jQuery(first_transcriptHTML).eq(index).hasClass('odd-line')) {
                lineClass = 'odd-line';
            }
            jQuery(first_transcriptHTML).eq(index).after('<div class="type-text '+lineClass+'">'+val+'</div>')
         });
    }, // attachSecondTranscript()


        // INPUT: order = 0 (left-side) or 1 (right-side)
        // NOTES: Need to buffer transcript data in transcriptData because we cannot assume
        //          when AJAX call will complete (2nd call may complete before 1st)
    attachTranscript: function(transcriptData, order)
    {
        dhpTranscript.transcriptData[order] = transcriptData;

            // Don't process 2nd transcript unless 1st is loaded and attached
        if(order==1) {
            if(dhpTranscript.transcriptData[0]) {
                dhpTranscript.attachSecondTranscript(dhpTranscript.transcriptData);
            }
        }
        else {
            jQuery('.transcript-ep p').append(dhpTranscript.formatTranscript(dhpTranscript.transcriptData));
                // Now, if right-side exists, attach it to left!
            if(dhpTranscript.transcriptData[1]) {
                dhpTranscript.attachSecondTranscript(dhpTranscript.transcriptData[1]);
            }
        }
    } // attachTranscript()

};
