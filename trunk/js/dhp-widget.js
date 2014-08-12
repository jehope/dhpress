// dhpWidget -- contains all data and functions dealing with audio & video widgets & transcriptions
// ASSUMES: Transcript modal is closed with button of class close-reveal-modal
// USES:    JavaScript libraries jQuery, Underscore, SoundCloud [optional], YouTube [optional]
// NOTES:   Use of audio & video does not require transcriptions, but transcriptions cannot exist w/o audio or video
//          Use of embedded YouTube requires a function named onYouTubeIframeAPIReady

var dhpWidget = {
    // Fields created by this object:
    //      parseTimeCode = regular expression parser for timecodes
    //      rowIndex
    //      transcriptData
    //      readyFor2nd = for handling asynchronous loading of transcripts
    //      playingNow = true if currently playing back
    //      primeAudio = for handle quirk that widget has to be playing before seek can be done
    //      playWidget = playback object itself
    //      playerType = 'youtube' | 'scloud'
    //      seekBound = true once code has been bound to seek to selected transcript section
    //      tcArray = time code array used to coordinate time stamps with transcript sections

        // PURPOSE: Initialize transcript mechanisms
    initialize: function()
    {
        dhpWidget.parseTimeCode = /(\d\d)\:(\d\d)\:(\d\d)\.(\d\d?)/;         // a more exact parsing of time
        dhpWidget.rowIndex = null;
        dhpWidget.transcriptData = [];
        dhpWidget.readyFor2nd = false;
        dhpWidget.playingNow = false;
        dhpWidget.primeAudio = true;
        dhpWidget.playWidget = null;
        dhpWidget.seekBound = false;
    }, // initialize()


        // PURPOSE: Build all HTML and initialize controls for a specific player and transcript
        // INPUT:   ajaxURL = URL to use for loading data (or null if already loaded)
        //          htmlID = jQuery selector to specify where resulting HTML should be appended
        //          transParams = object whose fields specify data about transcription:
        //              stream (URL) = widget URL stream
        //              playerType = 'youtube' | 'scloud'
        //              transcript (URL), transcript2 (URL),
        //              timecode (from-to), startTime (in milliseconds), endTime (in milliseconds)
        //              timecode = -1 if full transcript (not excerpt), transcript and transcript2 already loaded
    prepareOneTranscript: function (ajaxURL, projectID, htmlID, transParams)
    {
        var appendPos, appendSyncBtn = false;
        var fullTranscript = (transParams.timecode == -1);

            // Initialize this object's variables
        dhpWidget.transParams = transParams;

        appendPos = jQuery(htmlID);
        if (appendPos == null) {
            throw new Error("Cannot find HTML DIV at which to append transcript.");
        }
            // Create player-widget div to insert any player
        jQuery(appendPos).append('<div id="player-widget"></div>');

        switch (transParams.playerType) {
            // Sound Cloud
        case 'scloud':
            jQuery('#player-widget').append('<p class="pull-right"><iframe id="scPlayer" class="player" width="100%" height="166" src="http://w.soundcloud.com/player/?url='+
                transParams.stream+'"></iframe></p>');

                // Must set these variables after HTML appended above
            dhpWidget.playWidget = SC.Widget(document.getElementById('scPlayer'));
            dhpWidget.bindPlayerHandlers();
            break;
        case 'youtube':
            jQuery('#player-widget').append('<p class="pull-right"><iframe id="player" type="text/html" width="425" height="356" src="http://www.youtube.com/embed/'+
                transParams.stream+'?enablejsapi=1" frameborder="0"></iframe></p>');
                // wait for hook invocation to set playWidget and bind handlers
            break;
        } // playerType

            // Is there any primary transcript data?
        if (transParams.transcript && transParams.transcript!=='') {
            appendSyncBtn = true;
            if (fullTranscript) {
                dhpWidget.attachTranscript(transParams.transcript, 0);
            } else {
                dhpWidget.loadTranscriptClip(ajaxURL, projectID, transParams.transcript, transParams.timecode, 0);
            }
        }
            // Is there 2ndary transcript data? If only 2nd, treat as 1st
        if (transParams.transcript==='' && transParams.transcript2 && transParams.transcript2!=='') {
            appendSyncBtn = true;
            if (fullTranscript) {
                dhpWidget.attachTranscript(transParams.transcript2, 0);
            } else {
                dhpWidget.loadTranscriptClip(ajaxURL, projectID, transParams.transcript2, transParams.timecode, 0);
            }
        }
            // Otherwise, add 2nd to 1st
        else if (transParams.transcript!=='' && transParams.transcript2 && transParams.transcript2!=='') {
            appendSyncBtn = true;
            if (fullTranscript) {
                dhpWidget.attachTranscript(transParams.transcript2, 1);
            } else {
                dhpWidget.loadTranscriptClip(ajaxURL, projectID, transParams.transcript2, transParams.timecode, 1);
            }
        }
        if (appendSyncBtn) {
            jQuery(appendPos).append('<div style="padding-top:5px"><input type="checkbox" id="transcSyncOn" name="transcSyncOn" checked> Scroll transcript to follow playback</div><br>');
        }
    }, // prepareOneTranscript()


        // PURPOSE: Bind code to widget to handle play, seek, close, etc.
    bindPlayerHandlers: function()
    {
        var fullTranscript = dhpWidget.transParams.timecode == -1;
        var playWidget;

        switch (dhpWidget.transParams.playerType)
        {
        case 'scloud':
            playWidget = dhpWidget.playWidget;
                // Setup audio/transcript SoundCloud player after entire sound clip loaded
            playWidget.bind(SC.Widget.Events.READY, function() {
                    // Prime the audio -- must initially play (seekTo won't work until sound loaded and playing)
                playWidget.play();
                playWidget.bind(SC.Widget.Events.PLAY, function() {
                    dhpWidget.playingNow = true;
                });
                playWidget.bind(SC.Widget.Events.PAUSE, function() {
                    dhpWidget.playingNow = false;
                });

                playWidget.bind(SC.Widget.Events.PLAY_PROGRESS, function(params) {
                        // Pauses audio after it primes so seekTo will work properly
                    if (dhpWidget.primeAudio) {
                        playWidget.pause();
                        dhpWidget.primeAudio = false;
                        dhpWidget.playingNow = false;
                    }
                        // Keep within bounds if only excerpt of longer transcript
                    if (!fullTranscript) {
                        if (params.currentPosition < dhpWidget.transParams.startTime) {
                            playWidget.seekTo(dhpWidget.transParams.startTime);
                        } else if (params.currentPosition > dhpWidget.transParams.endTime) {
                            playWidget.pause();
                            dhpWidget.playingNow = false;
                        }
                    }
                    if (dhpWidget.playingNow && dhpWidget.transcriptData.length > 0) {
                        dhpWidget.hightlightTranscriptLine(params.currentPosition);
                    }
                });
                    // Can't seek within the SEEK event because it causes infinite recursion

                playWidget.bind(SC.Widget.Events.FINISH, function() {
                    dhpWidget.playingNow = false;
                });
            });

                // Silence SoundCloud if modal closed in another way
            jQuery('#markerModal').on('closed', function () {
                // var scWidget = SC.Widget(document.getElementById('scPlayer'));
                // scWidget.pause();
                playWidget.pause();
            });
            break;

        case 'youtube':
            function YTStateChange(event)
            {
                switch (event.data) {
                case YT.PlayerState.PLAYING:
                    dhpWidget.playingNow = true;
                    break;
                case YT.PlayerState.ENDED:
                case YT.PlayerState.PAUSED:
                    dhpWidget.playingNow = false;
                    break;
                case YT.PlayerState.BUFFERING:
                case YT.PlayerState.CUED:
                    break;
                }
            } // YTStateChange()

            playWidget = dhpWidget.playWidget = new YT.Player('player', {
                // height: dhpWidget.playerH,
                // width: dhpWidget.playerW,
                // videoId: dhpWidget.stream,
                events: {
                  // 'onReady': onPlayerReady,
                  'onStateChange': YTStateChange
                }
            });

                // Track current position of player
            // {
            //         // Need to convert to milliseconds
            //     var curPos = playWidget.getCurrentTime() * 1000;
            //         // TO DO: Keep within bounds of excerpt
            //     if (dhpWidget.playingNow) {
            //         dhpWidget.hightlightTranscriptLine(curPos);
            //     }
            // }

                // Silence SWFplayer if modal closed in another way
            jQuery('#markerModal').on('closed', function () {
                // var ytplayer = document.getElementById('myytplayer');
                // ytplayer.stopVideo();
                dhpWidget.playWidget.stopVideo();
            });
            break;
        } // playerType
    }, // bindPlayerHandlers()


        // PURPOSE: Bind code to handle seeking according to transcription selection
        // NOTES:   This is called by formatTranscript(), so only bound if a transcription exists
    bindTranscSeek: function()
    {
        if (!dhpWidget.seekBound) {
            dhpWidget.seekBound = true;
console.log("Binding seek function");
                // Allow user to click anywhere in player area; check if timecode, go to corresponding time
            jQuery('#player-widget').click(function(evt) {
                if (jQuery(evt.target).hasClass('type-timecode') && dhpWidget.playWidget) {
                    var seekToTime = jQuery(evt.target).closest('.type-timecode').data('timecode');

                        // seekTo doesn't work unless sound is already playing
                    if (!dhpWidget.playingNow) {
                        dhpWidget.playingNow = true;

                        switch (dhpWidget.transParams.playerType) {
                        case 'scloud':
                            dhpWidget.playWidget.play();
                            break;
                        case 'youtube':
                            dhpWidget.playWidget.playVideo();
                            break;
                        }
                    }
                    switch(dhpWidget.transParams.playerType) {
                    case 'scloud':
                        dhpWidget.playWidget.seekTo(seekToTime);
                        break;
                    case 'youtube':
                            // YouTube player takes seconds (rather than milliseconds)
                        dhpWidget.playWidget.seekTo(seekToTime/1000);
                        break;
                    }
                }
            });
        }
    }, // bindTranscSeek()

        // PURPOSE: Build all HTML and initialize controls for transcript associated with a Taxonomic Term
        // INPUT:   ajaxURL = URL to use for loading data
        //          htmlID = jQuery selector to specify where resulting HTML should be appended
        //          taxTerm = root taxonomic term (based on Project ID)
        //          transcript = end of URL for specific transcript / slug based on mote value
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
                    dhpWidget.prepareOneTranscript(null, projectID, htmlID, transParams);
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
                dhpWidget.attachTranscript(JSON.parse(data), order);
            },
            error: function(XMLHttpRequest, textStatus, errorThrown){
               alert(errorThrown);
            }
        });
    }, // loadTranscriptClip()


        // PURPOSE: Given a millisecond reading, unhighlight any previous "playhead" and highlight new one
        // NOTES:   Only scroll to that position if checkbox checked
    hightlightTranscriptLine: function (millisecond)
    {
        var match;

        _.find(dhpWidget.tcArray, function(timecode, index) {
            match = (millisecond<timecode);
            if (match) {
                if(dhpWidget.rowIndex!==index) {
                    dhpWidget.rowIndex = index;
                        // Should we synchronize audio and text transcript?
                    if (document.getElementById("transcSyncOn").checked) {
                        var topDiff = jQuery('.transcript-list div.type-timecode').eq(index).offset().top - jQuery('.transcript-list').offset().top;
                        var scrollPos = jQuery('.transcript-list').scrollTop() + topDiff;
                        jQuery('.transcript-list').animate({ scrollTop: scrollPos }, 300);
                    }
                }
                jQuery('.transcript-list div.type-timecode').removeClass('current-clip');
                jQuery('.transcript-list div.type-timecode').eq(index).addClass('current-clip');
            }
            return match;
        });
    }, // hightlightTranscriptLine()


        // PURPOSE: Convert timecode string into # of milliseconds
        // INPUT:   timecode must be in format [HH:MM:SS] or [HH:MM:SS.ss]
        // ASSUMES: timecode in correct format, parseTimeCode contains compiled RegEx
    convertToMilliSeconds: function (timecode)
    {
        var milliSecondsCode = new Number();
        var matchResults;

        matchResults = dhpWidget.parseTimeCode.exec(timecode);
        if (matchResults !== null) {
            // console.log("Parsed " + matchResults[1] + ":" + matchResults[2] + ":" + matchResults[3]);
            milliSecondsCode = (parseInt(matchResults[1])*3600 + parseInt(matchResults[2])*60 + parseFloat(matchResults[3])) * 1000;
                // The multiplier to use for last digits depends on if it is 1 or 2 digits long
            if (matchResults[4].length == 1) {
                milliSecondsCode += parseInt(matchResults[4])*100;
            } else {
                milliSecondsCode += parseInt(matchResults[4])*10;
            }
        } else {
            throw new Error("Error in transcript file: Cannot parse " + timecode + " as timecode.");
            milliSecondsCode = 0;
        }
        return milliSecondsCode;
    }, // convertToMilliSeconds()


        // PURPOSE: Clean up quicktime text, format transcript (left-side specific) and put it in a list
        // INPUT:   transcriptData = quicktime text format: timestamps on separate lines, [HH:MM:SS.m]
        // RETURNS: HTML for transcription 
    formatTranscript: function (transcriptData)
    {
        var transcript_html='';
            // split transcript text into array by line
        var splitTranscript = new String(transcriptData);
        splitTranscript = splitTranscript.trim().split(/\r\n|\r|\n/g);
        // var splitTranscript = transcriptData.trim().split(/\r\n|\r|\n/g);       // More efficient but not working!
            // empty time code array
        dhpWidget.tcArray = [];
        // console.log(splitTranscript)
        if (splitTranscript) {
            transcriptHtml = jQuery('<div class="transcript-list"/>');

            var index = 0;
            var timecode;
            var textBlock;
            var lineClass = ['','odd-line'];
            var oddEven;
            _.each(splitTranscript, function(val) {
                val = val.trim();
                oddEven = index % 2;
                    // Skip values with line breaks...basically empty items
                if (val.length>1) {
                        // Does it begin with a timecode?
                    if (val[0]==='[' && val[1]==='0') {
                        if (index>0) {
                            jQuery('.row', transcriptHtml).eq(index-1).append('<div class="type-text">'+textBlock+'</div>');
                        }
                        index++;
                        textBlock = ''; 
                        timecode = dhpWidget.convertToMilliSeconds(val);
                        transcriptHtml.append('<div class="row '+lineClass[oddEven]+'"><div class="type-timecode" data-timecode="'+timecode+'">'+val+'</div></div>');
                        dhpWidget.tcArray.push(timecode);
                    }
                    else {
                        textBlock += val;
                    }
                }
            });
        }
            // Shift array of timecodes so that entry is end-time rather than start-time of associated section
        dhpWidget.tcArray.shift();
            // Append very large number to end to ensure can't go past last item! 9 hours * 60 minutes * 60 seconds * 1000 milliseconds = 
        dhpWidget.tcArray.push(32400000);

            // Now that transcript sections are inserted, we can bind code to use them to seek in play stream
        dhpWidget.bindTranscSeek();

        return transcriptHtml;
    }, // formatTranscript()


    attachSecondTranscript: function(transcriptData)
    {
        //target $('.transcript-list')
        var splitTranscript = new String(transcriptData);
        splitTranscript = splitTranscript.trim().split(/\r\n|\r|\n/g);
        // var split_transcript = transcriptData.trim().split(/\r\n|\r|\n/g);       // More efficient but not working!

        jQuery('.transcript-list').addClass('two-column');
        var firstTranscriptHTML = jQuery('.transcript-list .type-text');
        // console.log(splitTranscript)
        var textArray = [];
        var textBlock;
        var index = 0;
        var lineClass;

        if (splitTranscript) {
            _.each(splitTranscript, function(val){
                    // Skip values with line breaks...basically empty items
                val = val.trim();
                if (val.length>1) {
                    if (val[0]==='['&&val[1]==='0') {
                        if(index>0) {
                            textArray.push(textBlock);
                        }
                        textBlock='';
                    } else {
                        textBlock += val;
                    }
                    index++;
                }
            });
        }

            // Loop thru HTML for left-side transcript and add right-side text
         _.each(textArray, function(val, index) {
            lineClass = '';
            if(jQuery(firstTranscriptHTML).eq(index).hasClass('odd-line')) {
                lineClass = 'odd-line';
            }
            jQuery(firstTranscriptHTML).eq(index).after('<div class="type-text '+lineClass+'">'+val+'</div>')
         });
    }, // attachSecondTranscript()


        // INPUT: order = 0 (left-side) or 1 (right-side)
        // NOTES: Need to buffer transcript data in transcriptData because we cannot assume
        //          when AJAX call will complete (2nd call may complete before 1st)
    attachTranscript: function(transcriptData, order)
    {
        dhpWidget.transcriptData[order] = transcriptData;

            // Don't process 2nd transcript unless 1st is loaded and attached
        if (order==1) {
            if (dhpWidget.readyFor2nd) {
                dhpWidget.attachSecondTranscript(transcriptData);
            }
        } else {
            jQuery('p.pull-right').append(dhpWidget.formatTranscript(transcriptData));
            dhpWidget.readyFor2nd = true;
                // Now, if right-side exists, attach it to left!
            if (dhpWidget.transcriptData[1]) {
                dhpWidget.attachSecondTranscript(dhpWidget.transcriptData[1]);
            }
        }
    } // attachTranscript()
}; // dhpWidget


    // Interface between embedded YouTube player and dhpWidget object
    // This is called once iFrame and API code is ready
function onYouTubeIframeAPIReady() {
    dhpWidget.bindPlayerHandlers();
}
