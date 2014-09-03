// dhpWidget -- contains all data and functions dealing with audio & video widgets & transcriptions
// ASSUMES: Transcript modal is closed with button of class close-reveal-modal
// USES:    JavaScript libraries jQuery, Underscore, SoundCloud [optional], YouTube [optional]
//          Also relies upon dhpServices methods
// NOTES:   Use of audio & video does not require transcriptions, but transcriptions cannot exist w/o audio or video
//          Use of embedded YouTube requires a function named onYouTubeIframeAPIReady -- provided in dhp-project-page.js

var dhpWidget = {
    // Fields created by this object:
    //      rowIndex        = index of row currently playing and highlighted
    //      transcriptData
    //      tcArray         = time code array used to coordinate time stamps with transcript sections

    //      wParams         = parameters describing operation of widget
    //      readyFor2nd     = for handling asynchronous loading of transcripts
    //      playingNow      = true if currently playing back
    //      primeAudio      = to handle quirk that widget has to be playing before seek can be done
    //      playWidget      = playback object itself

    //      seekBound       = true once code has been bound to seek to selected transcript section
    //      closeBound      = true once code has been bound to handle closure of select modal
    //      ytAPILoaded     = true once YouTube API is loaded (only done once)

        // PURPOSE: Initialize transcript mechanisms
        // INPUT:   wParams = object whose fields specify data about transcription:
        //              stream (URL) = widget URL stream
        //              playerType = 'youtube' | 'scloud'
        //              transcript (URL), transcript2 (URL),
        //              timecode (from-to), startTime (in milliseconds), endTime (in milliseconds)
        //              timecode = -1 if full transcript (not excerpt), transcript and transcript2 already loaded
        // NOTES:   This is called each time a new widget will be displayed
    initialize: function(wParams)
    {
        dhpWidget.rowIndex       = null;
        dhpWidget.transcriptData = [];
        dhpWidget.readyFor2nd    = false;
        dhpWidget.playingNow     = false;
        dhpWidget.primeAudio     = true;
        dhpWidget.playWidget     = null;
        dhpWidget.wParams        = wParams;
        dhpWidget.seekBound      = false;
        dhpWidget.playTimer      = null;

            // We only want to bind this code once
        if (typeof(dhpWidget.closeBound) === 'undefined') {
            dhpWidget.closeBound = true;

            jQuery('#markerModal').on('closed', function () {
                switch(dhpWidget.wParams.playerType) {
                case 'scloud':
                        // Silence SoundCloud if modal closed in another way
                    dhpWidget.playWidget.pause();
                    break;
                case 'youtube':
                        // Silence YouTube player if modal closed in another way
                    dhpWidget.playWidget.stopVideo();
                    if (dhpWidget.playTimer) {
                        window.clearInterval(dhpWidget.playTimer);
                    }
                    break;
                }
            });
        }
    }, // initialize()


        // PURPOSE: Build all HTML and initialize controls for a specific player and transcript
        // INPUT:   ajaxURL = URL to use for loading data (or null if already loaded)
        //          htmlID = jQuery selector to specify where resulting HTML should be appended
    prepareOneTranscript: function (ajaxURL, projectID, htmlID)
    {
        var appendPos, appendSyncBtn = false;
        var fullTranscript = (dhpWidget.wParams.timecode == -1);

        appendPos = jQuery(htmlID);
        if (appendPos == null) {
            throw new Error("Cannot find HTML DIV at which to append transcript.");
        }
            // Create player-widget div to insert any player
        jQuery(appendPos).append('<div id="player-widget"></div>');

        switch (dhpWidget.wParams.playerType) {
            // Sound Cloud
        case 'scloud':
            jQuery('#player-widget').append('<p class="pull-right"><iframe id="scWidget" class="player" width="100%" height="166" src="http://w.soundcloud.com/player/?url='+
                dhpWidget.wParams.stream+'"></iframe></p>');

                // Must set these variables after HTML appended above
            dhpWidget.playWidget = SC.Widget(document.getElementById('scWidget'));
            dhpWidget.bindPlayerHandlers();
            break;
        case 'youtube':
            jQuery('#player-widget').append('<div id="ytWidget" style="margin: 3px"></div><p class="pull-right"></p>');

                // YouTube API is only loaded once
            if (typeof(dhpWidget.ytAPILoaded) === 'undefined') {
                dhpWidget.ytAPILoaded = true;
                    // Create a script DIV that will cause API to be loaded
                var tag = document.createElement('script');
                tag.src = "https://www.youtube.com/iframe_api";
                var firstScriptTag = document.getElementsByTagName('script')[0];
                firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
                    // wait for hook invocation to set playWidget and bind handlers
            } else {
                dhpWidget.bindPlayerHandlers();
            }
            break;
        } // playerType

            // Is there any primary transcript data?
        if (dhpWidget.wParams.transcript && dhpWidget.wParams.transcript!=='') {
            appendSyncBtn = true;
            if (fullTranscript) {
                dhpWidget.attachTranscript(dhpWidget.wParams.transcript, 0);
            } else {
                dhpWidget.loadTranscriptClip(ajaxURL, projectID, dhpWidget.wParams.transcript, dhpWidget.wParams.timecode, 0);
            }
        }
            // Is there 2ndary transcript data? If only 2nd, treat as 1st
        if (dhpWidget.wParams.transcript==='' && dhpWidget.wParams.transcript2 && dhpWidget.wParams.transcript2!=='') {
            appendSyncBtn = true;
            if (fullTranscript) {
                dhpWidget.attachTranscript(dhpWidget.wParams.transcript2, 0);
            } else {
                dhpWidget.loadTranscriptClip(ajaxURL, projectID, dhpWidget.wParams.transcript2, dhpWidget.wParams.timecode, 0);
            }
        }
            // Otherwise, add 2nd to 1st
        else if (dhpWidget.wParams.transcript!=='' && dhpWidget.wParams.transcript2 && dhpWidget.wParams.transcript2!=='') {
            appendSyncBtn = true;
            if (fullTranscript) {
                dhpWidget.attachTranscript(dhpWidget.wParams.transcript2, 1);
            } else {
                dhpWidget.loadTranscriptClip(ajaxURL, projectID, dhpWidget.wParams.transcript2, dhpWidget.wParams.timecode, 1);
            }
        }

        if (appendSyncBtn) {
            jQuery(appendPos).append('<div style="padding-top:5px"><input type="checkbox" id="transcSyncOn" name="transcSyncOn" checked> Scroll transcript to follow playback</div><br>');
        }
    }, // prepareOneTranscript()


        // PURPOSE: Bind code to widget to handle play, seek, close, etc.
    bindPlayerHandlers: function()
    {
        var playWidget;

        switch (dhpWidget.wParams.playerType)
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
                    if (dhpWidget.wParams.timecode != -1) {
                        if (params.currentPosition < dhpWidget.wParams.startTime) {
                            playWidget.seekTo(dhpWidget.wParams.startTime);
                        } else if (params.currentPosition > dhpWidget.wParams.endTime) {
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
            break;

        case 'youtube':
            function ytStateChange(event)
            {
                var curPos;

                switch (event.data) {
                case 1: // YT.PlayerState.PLAYING
                    dhpWidget.playingNow = true;
                    if (dhpWidget.playTimer == null) {
                            // YouTube playback heartbeat
                        dhpWidget.playTimer = setInterval(function() {
                                // Need to convert to milliseconds
                            curPos = playWidget.getCurrentTime() * 1000;
                                // Keep within bounds of excerpt is done automatically by cue function
                                // If there is a transcript, highlight current section
                            if (dhpWidget.playingNow && dhpWidget.transcriptData.length > 0) {
                                dhpWidget.hightlightTranscriptLine(curPos);
                            }
                        }, 300);    // .3 second heartbeat
                    }
                    break;
                case 0: // YT.PlayerState.ENDED
                case 2: // YT.PlayerState.PAUSED
                    dhpWidget.playingNow = false;
                    window.clearInterval(dhpWidget.playTimer);
                    dhpWidget.playTimer = null;
                    break;
                case 3: // YT.PlayerState.BUFFERING
                case 5: // YT.PlayerState.CUED
                    dhpWidget.playingNow = false;
                    break;
                } // switch event
            } // ytStateChange()

            playWidget = dhpWidget.playWidget = new YT.Player('ytWidget', {
                videoId: dhpWidget.wParams.stream,
                events: {
                    onError: function(event) { console.log("YouTube Error: "+event.data); },
                    onStateChange: ytStateChange,
                    onReady: function() {
                            // If this is to play an excerpt, specify time bounds now (in seconds)
                        if (dhpWidget.wParams.timecode != -1) {
                            dhpWidget.playWidget.cueVideoById(
                                {   videoId: dhpWidget.wParams.stream,
                                    startSeconds: (dhpWidget.wParams.startTime/1000),
                                    endSeconds: (dhpWidget.wParams.endTime/1000)
                                });
                        }
                    }
                }
            });
            break;
        } // switch playerType
    }, // bindPlayerHandlers()


        // PURPOSE: Bind code to handle seeking according to transcription selection
        // NOTES:   This is called by formatTranscript(), so only bound if a transcription exists
    bindTranscSeek: function()
    {
            // We have to bind to this code anew for each building of modal
        if (!dhpWidget.seekBound) {
            dhpWidget.seekBound = true;

                // Allow user to click anywhere in player area; check if timecode, go to corresponding time
            jQuery('#player-widget').click(function(evt) {
                if (jQuery(evt.target).hasClass('type-timecode') && dhpWidget.playWidget) {
                    var seekToTime = jQuery(evt.target).closest('.type-timecode').data('timecode');

                        // seekTo doesn't work unless sound is already playing
                    switch(dhpWidget.wParams.playerType) {
                    case 'scloud':
                        if (!dhpWidget.playingNow) {
                            dhpWidget.playingNow = true;
                            dhpWidget.playWidget.play();
                        }
                        dhpWidget.playWidget.seekTo(seekToTime);
                        break;
                    case 'youtube':
                        if (!dhpWidget.playingNow) {
                            dhpWidget.playingNow = true;
                            dhpWidget.playWidget.playVideo();
                        }
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
        // TO DO:   Currently, as SoundCloud and YouTube are the only playback widgets, the presence of
        //              an audio or video feature from dhpGetTaxTranscript() indicates which of these two
        //              to use. If other options become available, distinguishing widgets will become harder.
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
                if (data != null && data !== '') {
                    var results = JSON.parse(data);
                    var wParams = {
                        stream: null,
                        playerType: null,
                        transcript: results.transcript,
                        transcript2: results.transcript2,
                        timecode: -1,
                        startTime: -1,
                        endTime: -1
                    };
                    if (results.audio && results.audio !== '') {
                        wParams.stream = results.audio;
                        wParams.playerType = 'scloud';
                    } else if (results.video && results.video !== '') {
                        wParams.stream = results.video;
                        wParams.playerType = 'youtube';
                    }
                    if (wParams.playerType) {
                        dhpWidget.initialize(wParams);
                        dhpWidget.prepareOneTranscript(null, projectID, htmlID);
                    }
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
                if (dhpWidget.rowIndex != index) {
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
                        timecode = dhpServices.tcToMilliSeconds(val);
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
            if (jQuery(firstTranscriptHTML).eq(index).hasClass('odd-line')) {
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
            jQuery('#player-widget p.pull-right').append(dhpWidget.formatTranscript(transcriptData));
            dhpWidget.readyFor2nd = true;
                // Now, if right-side exists, attach it to left!
            if (dhpWidget.transcriptData[1]) {
                dhpWidget.attachSecondTranscript(dhpWidget.transcriptData[1]);
            }
        }
    } // attachTranscript()
}; // dhpWidget

