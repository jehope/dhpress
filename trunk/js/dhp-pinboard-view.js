// DH Press Pinboard View
// ASSUMES: Visualization area is marked with HTML div as "dhp-visual"
// NOTES:   Format of Marker and Legend data (GeoJSON) is documented in dhp-project-functions.php
//          The class active-legend is added to whichever legend is currently visible and selected

// USES:    JavaScript libraries jQuery, Underscore, Snap svg


var dhpPinboardView = {

        // Contains fields: ajaxURL, projectID, pinboardEP, viewParams, vizIndex

        //					rawAjaxData = raw data returned from AJAX
        //					allMarkers = All marker posts assoc. w/ Project; see data desc in createMarkerArray() of dhp-project-functions.php
        //                          Points to features array

        //                  filters = array of all reformatted(flattend) Legend/Filter data
        //                  curLgdName = name of current legend/filter
        //                  curLgdFilter = pointer to current legend/filter array

        //                  iWidth, iHeight = actual pixel width and height of image
        //                  viewL, viewT, viewW, viewH = current viewport into background image
        //                  viewScale = current zoom scale % (100=fullsize)
        //                  zoomStep = % of zoom or reduce for each step

        //                  useParent = if true (always true!), actions on parent term affect child terms
        //                  currentFeature = map feature currently highlighted or selected (with modal)

        //                  radius = radius of geometric markers
        //                  iconSize = "s" | "m" | "l"
        //                  icons (Object with properties that are SNAP path defs)
        //                      ballon, magGlass, thumbtack

        //                  loadedLayers = Snap group element for loaded SVG overlay layers
        //                  layerBtnsOn = TRUE if the layer buttons are currently showing on Legend menu

        //                  playState = current state of playback (one of STATE_)
        //                  scriptEvents = Array of {start:Number, to:Number, actions: [string] }
        //                  playIndex = current index of script instruction
        //                  playLastIndex = the index of the last script set played
        //                  vidPlayer = YouTube object used for animation (none by default)

        //                  playIntervMS = Millisecond interval: 1/10 second
        //                  playTimer = the interval timer for playback
        //                  playTimeMS = Current time in playback from beginning
        //                  lastTimeMS = Millisecond time from last "heartbeat"

        //                  animLayers = SVG layer containing animation elements

        // PURPOSE: Initialize new leaflet map, layers, and markers                         
        // INPUT:   ajaxURL      = URL to WP
        //          projectID    = ID of project
        //          mapEP        = settings for map entry point (from project settings)
        //          viewParams   = array of extra data about visualization
    initialize: function(ajaxURL, projectID, vizIndex, pinboardEP, viewParams) {
             // GUI Constants
        dhpPinboardView.controlHeight   = 49;  // max(navButtonHeight[30], LegendHeight[45]) + 4

            // Save visualization data for later
        dhpPinboardView.pinboardEP     = pinboardEP;
        dhpPinboardView.viewParams     = viewParams;

            // Expand to show/hide child terms and use their colors
        dhpPinboardView.useParent = true;
        dhpPinboardView.layerBtnsOn = false;

            // ensure that EP parameters are integers, not strings
        dhpPinboardView.iWidth  = typeof(pinboardEP.width)  === 'number' ? pinboardEP.width  : parseInt(pinboardEP.width);
        dhpPinboardView.iHeight = typeof(pinboardEP.height) === 'number' ? pinboardEP.height : parseInt(pinboardEP.height);

            // set view/scroll window parameters

            // viewBox coordinates -- start out 1-1 actual pixel view
        dhpPinboardView.viewL=0;
        dhpPinboardView.viewT=0;
        dhpPinboardView.viewW=dhpPinboardView.iWidth;
        dhpPinboardView.viewH=dhpPinboardView.iHeight;
        dhpPinboardView.viewScale=100;
        dhpPinboardView.zoomStep=10;

            // Add pinboard elements to nav bar
        jQuery('.dhp-nav .top-bar-section .left').append(Handlebars.compile(jQuery("#dhp-script-pin-menus").html()));

            // Create control div for Legend and image navigation buttons
        jQuery("#dhp-visual").append('<div id="dhp-controls"></div>');

            // Create placeholder for Legend menu
        jQuery('#dhp-controls').append(Handlebars.compile(jQuery("#dhp-script-legend-head").html()));

            // Create buttons for navigating & zooming background image
        jQuery('#dhp-controls').append('<div id="dhp-pin-controls"><div class="pin-fndn-icon"><i class="fi-arrow-left" id="pin-left"></i> <i class="fi-arrow-right" id="pin-right"></i> <i class="fi-arrow-down" id="pin-down"></i> <i class="fi-arrow-up" id="pin-up"></i> <i class="fi-arrows-in" id="pin-reduce"></i> <i class="fi-arrows-out" id="pin-zoom"></i> <i class="fi-x-circle" id="pin-refresh"></i> </div></div>');
        jQuery("#pin-refresh").click(dhpPinboardView.resetView);
        jQuery("#pin-zoom").click(dhpPinboardView.zoomIn);
        jQuery("#pin-reduce").click(dhpPinboardView.zoomOut);
        jQuery("#pin-left").click(dhpPinboardView.goLeft);
        jQuery("#pin-right").click(dhpPinboardView.goRight);
        jQuery("#pin-up").click(dhpPinboardView.goUp);
        jQuery("#pin-down").click(dhpPinboardView.goDown);

            // Initialize Snap and create "paper" palette
        dhpPinboardView.svgRoot = document.createElementNS("http://www.w3.org/2000/svg", "svg");

        jQuery(dhpPinboardView.svgRoot).width(dhpPinboardView.iWidth+2).height(dhpPinboardView.iHeight+2);

            // Create container for SVG and insert the "paper"
        jQuery("#dhp-visual").append('<div id="svg-container"></div>');
        jQuery("#svg-container").append(dhpPinboardView.svgRoot);
        dhpPinboardView.paper = Snap(dhpPinboardView.svgRoot);

            // Create background image
        dhpPinboardView.paper.image(pinboardEP.imageURL, 0, 0, dhpPinboardView.iWidth, dhpPinboardView.iHeight);

        var pathBallon = "M8,0C4.687,0,2,2.687,2,6c0,3.854,4.321,8.663,5,9.398C7.281,15.703,7.516,16,8,16s0.719-0.297,1-0.602  C9.679,14.663,14,9.854,14,6C14,2.687,11.313,0,8,0z M8,10c-2.209,0-4-1.791-4-4s1.791-4,4-4s4,1.791,4,4S10.209,10,8,10z M8,4  C6.896,4,6,4.896,6,6s0.896,2,2,2s2-0.896,2-2S9.104,4,8,4z";
        var pathMagGlass = "M15.7,14.3l-3.105-3.105C13.473,10.024,14,8.576,14,7c0-3.866-3.134-7-7-7S0,3.134,0,7s3.134,7,7,7  c1.576,0,3.024-0.527,4.194-1.405L14.3,15.7c0.184,0.184,0.38,0.3,0.7,0.3c0.553,0,1-0.447,1-1C16,14.781,15.946,14.546,15.7,14.3z   M2,7c0-2.762,2.238-5,5-5s5,2.238,5,5s-2.238,5-5,5S2,9.762,2,7z";
        var pathThumbtack = "M16.729,4.271c-0.389-0.391-1.021-0.393-1.414-0.004c-0.104,0.104-0.176,0.227-0.225,0.355  c-0.832,1.736-1.748,2.715-2.904,3.293C10.889,8.555,9.4,9,7,9C6.87,9,6.74,9.025,6.618,9.076C6.373,9.178,6.179,9.373,6.077,9.617  c-0.101,0.244-0.101,0.52,0,0.764c0.051,0.123,0.124,0.234,0.217,0.326l3.243,3.243L5,20l6.05-4.537l3.242,3.242  c0.092,0.094,0.203,0.166,0.326,0.217C14.74,18.973,14.87,19,15,19s0.26-0.027,0.382-0.078c0.245-0.102,0.44-0.295,0.541-0.541  C15.974,18.26,16,18.129,16,18c0-2.4,0.444-3.889,1.083-5.166c0.577-1.156,1.556-2.072,3.293-2.904  c0.129-0.049,0.251-0.121,0.354-0.225c0.389-0.393,0.387-1.025-0.004-1.414L16.729,4.271z";

            // Prepare marker usage and icons
        dhpPinboardView.iconSize       = pinboardEP.size;
        switch (pinboardEP.size) {
        case "s":
            dhpPinboardView.radius     = 4;
            dhpPinboardView.diamondPts = [ [0,-4], [4,0], [0,4], [-4,0] ];
            break;
        case "m":
            dhpPinboardView.radius     = 8;
            dhpPinboardView.diamondPts = [ [0,-9], [9,0], [0,9], [-9,0] ];
            break;
        case "l":
            dhpPinboardView.radius     = 12;
            dhpPinboardView.diamondPts = [ [0,-12], [12,0], [0,12], [-12,0] ];
            break;
        }
            // Prepare object for icon definitions
        dhpPinboardView.icons = { };
            // Create each one as path and move to definitions section of SVG
        dhpPinboardView.icons.ballon = dhpPinboardView.paper.path(pathBallon);
        dhpPinboardView.icons.ballon.toDefs();
        dhpPinboardView.icons.magGlass = dhpPinboardView.paper.path(pathMagGlass);
        dhpPinboardView.icons.magGlass.toDefs();
        dhpPinboardView.icons.thumbtack = dhpPinboardView.paper.path(pathThumbtack);
        dhpPinboardView.icons.thumbtack.toDefs();

            // Initialize animation variables
        dhpPinboardView.STATE_LOADING = 0;
        dhpPinboardView.STATE_PLAYING = 1;
        dhpPinboardView.STATE_PAUSED = 2;
        dhpPinboardView.STATE_END = 3;

        dhpPinboardView.playState=dhpPinboardView.STATE_END;
        dhpPinboardView.scriptEvents=[];
        dhpPinboardView.playIndex=0;
        dhpPinboardView.playLastIndex=-1;
        dhpPinboardView.vidPlayer=null;

        dhpPinboardView.playIntervMS=150;
        dhpPinboardView.playTimer=null;
        dhpPinboardView.playTimeMS=0;
        dhpPinboardView.lastTimeMS=0;

        dhpPinboardView.animLayers=null;

            // Create SVG overlay layers --
            // Must be loaded recursively (due to asynchronous calls) to ensure correct order
        var loadArray = pinboardEP.layers || [];
        dhpPinboardView.loadedLayers = dhpPinboardView.paper.group();

        function loadMarkers()
        {
            jQuery.ajax({
                type: 'POST',
                url: ajaxURL,
                data: {
                    action: 'dhpGetMarkers',
                    project: projectID,
                    index: vizIndex
                },
                success: function(data, textStatus, XMLHttpRequest)
                {
                    dhpPinboardView.createDataObjects(JSON.parse(data));
                        // Remove Loading modal
                    dhpServices.remLoadingModal();
                    jQuery('.reveal-modal-bg').remove();
                },
                error: function(XMLHttpRequest, textStatus, errorThrown)
                {
                   alert(errorThrown);
                }
            });
        } // loadMarkers()

            // NOTES: Must be a recursive function in order for layers to load in set order
        function loadHandler(lIndex)
        {
                // All SVG layer files have been loaded
            if (lIndex >= loadArray.length) {
                    // If there is an SVG animation layer, load that next
                if (pinboardEP.animSVG !== '') {
                        // Create group where layers will be placed
                    dhpPinboardView.animLayers = dhpPinboardView.paper.group();
                    Snap.load(pinboardEP.animSVG, function(thisLayer) {
                            // Add this svg data to the document
                        dhpPinboardView.animLayers.append(thisLayer);
                        dhpPinboardView.animOffAll();
                        loadMarkers();
                    });

                } else {
                    loadMarkers();
                }

                // Load the next SVG layer from file
            } else {
                var layerInfo = loadArray[lIndex];
                    // After layer loaded, add it to SVG and request next layer
                Snap.load(layerInfo.file, function(thisLayer) {
                        // Must attach an ID to it so that it can be turned on and off
                    var g = thisLayer.select("g");
                    g.attr( { id: 'oLayer'+lIndex } );
                    dhpPinboardView.loadedLayers.append(g);
                    loadHandler(lIndex+1);
                }); // load()
            } // else
        } // loadHandler()

            // Initiate the loading of SVG layer files
        loadHandler(0);

            // Is there an animation script?
        if (viewParams.animscript) {
                // Add animation controls buttons
            jQuery('#dhp-pin-controls .pin-fndn-icon').append('&nbsp;  <i class="fi-play-circle" id="dhp-ani-play"></i> <i class="fi-stop" id="dhp-ani-stop"></i> <i class="fi-pause" id="dhp-ani-pause"></i> &nbsp;');

                // Parse script: First split transcript text into array by line
            var splitTranscript = new String(viewParams.animscript);
            splitTranscript = splitTranscript.trim().split(/\r\n|\r|\n/g);
            // var splitTranscript = transcriptData.trim().split(/\r\n|\r|\n/g);       // More efficient but not working!

            if (splitTranscript) {
                var index = 0;
                var lastStamp=0;

                _.each(splitTranscript, function(val) {
                        // Get cleaned version of line
                    val = val.trim();
                    switch (val.charAt(0)) {
                        // If it is a timecode, parse and save it for later
                    case '[':
                        lastStamp = dhpServices.tcToMilliSeconds(val);
                        break;
                        // If it is an instruction, save it with timecode
                    case '-':
                    case '+':
                    case '*':
                        var thisEvent = {};
                        thisEvent.start = lastStamp;
                        thisEvent.end = -1; // Just a placeholder
                        thisEvent.actions = val;
                        dhpPinboardView.scriptEvents.push(thisEvent);
                        break;
                    default:
                        throw new Error("Can't parse line: "+val);
                        break;
                    } // switch()
                });
            }
                // Retroactively reset end fields
            for (var i=0; i<dhpPinboardView.scriptEvents.length; i++) {
                if (i != dhpPinboardView.scriptEvents.length-1) {
                    dhpPinboardView.scriptEvents[i]['end'] = dhpPinboardView.scriptEvents[i+1]['start'];
                }
            }

                // Load YouTube video used by animation, if any
                // Don't need to wait for video if not available
            if (pinboardEP.ytvcode !== '') {
                dhpPinboardView.playState = dhpPinboardView.STATE_LOADING;

                    /// Create DIV where invisible YouTube player will be inserted
                jQuery('#dhp-visual').append('<div id="ytplayer"></div>');

                    // Create a script DIV that will cause API to be loaded
                var tag = document.createElement('script');
                tag.src = "https://www.youtube.com/iframe_api";
                var firstScriptTag = document.getElementsByTagName('script')[0];
                firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            }

                // Set initial state of the animation buttons
            dhpPinboardView.updatePlayButtons();

            jQuery('#dhp-ani-play').click(dhpPinboardView.hitBtnPlay);
            jQuery('#dhp-ani-stop').click(dhpPinboardView.hitBtnStop);
            jQuery('#dhp-ani-pause').click(dhpPinboardView.hitBtnPause);
        } // if anim.script
    }, // initPinboard()


        // PURPOSE: Resizes pinboard-specific elements initially and when browser size changes
    dhpUpdateSize: function()
    {
            // Width of svg-container is same as visual space
        jQuery('#svg-container').width(jQuery('#dhp-visual').width()-2);
            // Height of svg-container will be total viz space minus height of navbar, margins, border & scroll bar itself
        var svgHeight = jQuery('#dhp-visual').height() - (dhpPinboardView.controlHeight+5);
        jQuery('#svg-container').height(svgHeight);
    }, // dhpUpdateSize()


        // PURPOSE: Reset background image to initial 1-1 setting
    resetView: function() {
        dhpPinboardView.viewL=0;
        dhpPinboardView.viewT=0;
        dhpPinboardView.viewW=dhpPinboardView.iWidth;
        dhpPinboardView.viewH=dhpPinboardView.iHeight;
        dhpPinboardView.viewScale=100;
        dhpPinboardView.recalcViewBox();
    }, // resetView()


    zoomIn: function() {
        var centX, centY, newW, newH;
            // Allow a maximum of 5x zoom
        if (dhpPinboardView.viewScale > 20) {
                // To zoom in, we need to substract % of pix shown!
            dhpPinboardView.viewScale -= dhpPinboardView.zoomStep;
                // Compute current width, height and center point
            centX = dhpPinboardView.viewL + (dhpPinboardView.viewW / 2);
            centY = dhpPinboardView.viewT + (dhpPinboardView.viewH / 2);
                // calculate new width and height according to new zoom
            newW = ((dhpPinboardView.iWidth  * dhpPinboardView.viewScale) / 100);
            newH = ((dhpPinboardView.iHeight * dhpPinboardView.viewScale) / 100);
                // calculate new viewBox coords
            dhpPinboardView.viewL = centX - (newW / 2);
            dhpPinboardView.viewW = newW;
            dhpPinboardView.viewT = centY - (newH / 2);
            dhpPinboardView.viewH = newH;
            dhpPinboardView.recalcViewBox();
        }
    }, // zoomIn()


    zoomOut: function() {
        var centX, centY, newW, newH;
            // Allow a maximum of 1.5x zoom
        if (dhpPinboardView.viewScale < 150) {
                // To zoom out, we need to add % of pix shown!
            dhpPinboardView.viewScale += dhpPinboardView.zoomStep;
                // Compute current width, height and center point
            centX = dhpPinboardView.viewL + (dhpPinboardView.viewW / 2);
            centY = dhpPinboardView.viewT + (dhpPinboardView.viewH / 2);
                // calculate new width and height according to new zoom
            newW = ((dhpPinboardView.iWidth  * dhpPinboardView.viewScale) / 100);
            newH = ((dhpPinboardView.iHeight * dhpPinboardView.viewScale) / 100);
                // calculate new viewBox coords
            dhpPinboardView.viewL = centX - (newW / 2);
            dhpPinboardView.viewW = newW;
            dhpPinboardView.viewT = centY - (newH / 2);
            dhpPinboardView.viewH = newH;
            dhpPinboardView.recalcViewBox();
        }
    }, // zoomOut()


    goLeft: function() {
        var stepX;
        stepX = (dhpPinboardView.iWidth * dhpPinboardView.zoomStep) / 100;
            // calculate new viewBox coords
        dhpPinboardView.viewL += stepX;
        dhpPinboardView.recalcViewBox();
    }, // goLeft()


    goRight: function() {
        var stepX;
        stepX = (dhpPinboardView.iWidth * dhpPinboardView.zoomStep) / 100;
            // calculate new viewBox coords
        dhpPinboardView.viewL -= stepX;
        dhpPinboardView.recalcViewBox();
    }, // goRight()


    goUp: function() {
        var stepY;
        stepY = (dhpPinboardView.iHeight * dhpPinboardView.zoomStep) / 100;
            // calculate new viewBox coords
        dhpPinboardView.viewT += stepY;
        dhpPinboardView.recalcViewBox();
    }, // goUp()


    goDown: function() {
        var stepY;
        stepY = (dhpPinboardView.iHeight * dhpPinboardView.zoomStep) / 100;
            // calculate new viewBox coords
        dhpPinboardView.viewT -= stepY;
        dhpPinboardView.recalcViewBox();
    }, // goDown()


        // PURPOSE: Set new viewBox given current coordinates
    recalcViewBox: function() {
            // reset viewBox with new settings (top, left, width, height)
        var newSettings = dhpPinboardView.viewL.toString()+" "+dhpPinboardView.viewT.toString()+" "+
                            dhpPinboardView.viewW.toString()+" "+dhpPinboardView.viewH.toString();
        dhpPinboardView.svgRoot.setAttribute("viewBox", newSettings);
    }, // recalcViewBox()


        // PURPOSE: Execute the command in animation playData (a scriptEvent object)
    execCmd: function(playData)
    {
        var cmds, theSVG;

        cmds = playData.actions.split(',');
        _.each(cmds, function(theCmd) {
            switch(theCmd.charAt(0)) {
            case '+':
                theSVG = dhpPinboardView.animLayers.select(theCmd.substring(1));
                theSVG.removeClass('hide');
                break;
            case '-':
                theSVG = dhpPinboardView.animLayers.select(theCmd.substring(1));
                theSVG.addClass('hide');
                break;
            case '*':
                dhpPinboardView.hitBtnStop();
                break;
            } // switch
        });
    }, // execCmd()


        // PURPOSE: This code is the "heartbeat" of the animation interval timer
        // NOTES:   Assumed that only runs after video is loaded, if it is available at all
    intervalCode: function()
    {
        var playData = dhpPinboardView.scriptEvents[dhpPinboardView.playIndex];

            // If we are coordinating with a YT video, we need to read time from YouTube itself
        if (dhpPinboardView.vidPlayer) {
            dhpPinboardView.playTimeMS = dhpPinboardView.vidPlayer.getCurrentTime() * 1000;
        } else {
            dhpPinboardView.playTimeMS += (Date.now() - dhpPinboardView.lastTimeMS);
        }

            // We have entered new event period not played yet??
        if (dhpPinboardView.playTimeMS >= playData.start && dhpPinboardView.playIndex > dhpPinboardView.playLastIndex) {
            dhpPinboardView.execCmd(playData);
            dhpPinboardView.playLastIndex = dhpPinboardView.playIndex;
        }

            // Do we also need to catch up to next?
        while (dhpPinboardView.playState == dhpPinboardView.STATE_PLAYING && dhpPinboardView.playTimeMS >= playData.end) {
            playData = dhpPinboardView.scriptEvents[++dhpPinboardView.playIndex];
            dhpPinboardView.execCmd(playData);
            dhpPinboardView.playLastIndex = dhpPinboardView.playIndex;
        }

            // Update when we were last running to now
        if (!dhpPinboardView.vidPlayer) {
            dhpPinboardView.lastTimeMS = Date.now();
        }
    }, // intervalCode()


        // PURPOSE: Make each section invisible
    animOffAll: function()
    {
        var allGroupings = dhpPinboardView.animLayers.selectAll('.dhp-anim-group');
        _.each(allGroupings, function(theGrouping, index) {
            if (!theGrouping.hasClass('hide')) {
                theGrouping.addClass('hide');
            }
        });
    }, // animOffAll()


        // PURPOSE: Handle user click on Play button
    hitBtnPlay: function()
    {
            // If currently paused, then resume
        if (dhpPinboardView.playState == dhpPinboardView.STATE_PAUSED)
        {
            dhpPinboardView.lastTimeMS = Date.now();
            dhpPinboardView.playState = dhpPinboardView.STATE_PLAYING;
            dhpPinboardView.updatePlayButtons();
            if (dhpPinboardView.vidPlayer) {
                dhpPinboardView.vidPlayer.playVideo();
            }
            dhpPinboardView.playTimer = setInterval(dhpPinboardView.intervalCode, dhpPinboardView.playIntervMS);

            // If currently in "end" state, then restart from beginning
        } else if (dhpPinboardView.playState == dhpPinboardView.STATE_END)
        {
            dhpPinboardView.playTimeMS = 0;
            dhpPinboardView.playIndex = 0;
            dhpPinboardView.playState = dhpPinboardView.STATE_PLAYING;
            dhpPinboardView.playLastIndex = -1;         // Indicate that nothing has been played
            dhpPinboardView.updatePlayButtons();
            dhpPinboardView.lastTimeMS = Date.now();

            if (dhpPinboardView.vidPlayer) {
                dhpPinboardView.vidPlayer.playVideo();
                dhpPinboardView.vidPlayer.seekTo(0);
            }
                // Don't wait until heartbeat to start, in case of 0 time event
            dhpPinboardView.intervalCode();

            dhpPinboardView.playTimer = setInterval(dhpPinboardView.intervalCode, dhpPinboardView.playIntervMS);
        }
            // Otherwise ignore it
    }, // hitBtnPlay()


        // PURPOSE: Handle user click on Pause button
    hitBtnPause: function()
    {
            // If currently playing, then pause
        if (dhpPinboardView.playState == dhpPinboardView.STATE_PLAYING)
        {
            window.clearInterval(dhpPinboardView.playTimer);
            if (dhpPinboardView.vidPlayer) {
                dhpPinboardView.vidPlayer.pauseVideo();
            }
            dhpPinboardView.playState = dhpPinboardView.STATE_PAUSED;
            dhpPinboardView.updatePlayButtons();
        }
    }, // hitBtnPause()


        // PURPOSE: Handle user click on Stop button
    hitBtnStop: function()
    {
            // If currently playing or paused, then stop
        if (dhpPinboardView.playState == dhpPinboardView.STATE_PLAYING || dhpPinboardView.playState == dhpPinboardView.STATE_PAUSED)
        {
            window.clearInterval(dhpPinboardView.playTimer);
            dhpPinboardView.playTimeMS = dhpPinboardView.lastTimeMS = dhpPinboardView.playIndex = 0;
            dhpPinboardView.animOffAll();
            if (dhpPinboardView.vidPlayer) {
                dhpPinboardView.vidPlayer.seekTo(0);
                dhpPinboardView.vidPlayer.stopVideo();
            }
            dhpPinboardView.playState = dhpPinboardView.STATE_END;
            dhpPinboardView.updatePlayButtons();
        }
    }, // hitBtnStop()


        // PURPOSE: Change color of buttons to indicate state
        // NOTES:   CSS colors: ready=#D00000, inactive=#A8A8A8 
    updatePlayButtons: function()
    {
        switch (dhpPinboardView.playState) {
            // Disable everything
        case dhpPinboardView.STATE_LOADING:
            jQuery('#dhp-ani-play').css('color', '#A8A8A8');
            jQuery('#dhp-ani-stop').css('color', '#A8A8A8');
            jQuery('#dhp-ani-pause').css('color', '#A8A8A8');
            // jQuery('#dhp-ani-previous').css('color', '#A8A8A8');
            // jQuery('#dhp-ani-next').css('color', '#A8A8A8');
            break;
            // Disable play, enable rest
        case dhpPinboardView.STATE_PLAYING:
            jQuery('#dhp-ani-play').css('color', '#A8A8A8');
            jQuery('#dhp-ani-stop').css('color', '#D00000');
            jQuery('#dhp-ani-pause').css('color', '#D00000');
            // jQuery('#dhp-ani-previous').css('color', '#A8A8A8');
            // jQuery('#dhp-ani-next').css('color', '#A8A8A8');
            break;
            // Disable pause, enable rest
        case dhpPinboardView.STATE_PAUSED:
            jQuery('#dhp-ani-play').css('color', '#D00000');
            jQuery('#dhp-ani-stop').css('color', '#D00000');
            jQuery('#dhp-ani-pause').css('color', '#A8A8A8');
            // jQuery('#dhp-ani-previous').css('color', '#D00000');
            // jQuery('#dhp-ani-next').css('color', '#D00000');
            break;
            // Disablbe stop and pause, enable rest
        case dhpPinboardView.STATE_END:
            jQuery('#dhp-ani-play').css('color', '#D00000');
            jQuery('#dhp-ani-stop').css('color', '#A8A8A8');
            jQuery('#dhp-ani-pause').css('color', '#A8A8A8');
            // jQuery('#dhp-ani-previous').css('color', '#A8A8A8');
            // jQuery('#dhp-ani-next').css('color', '#A8A8A8');
            break;
        } // switch
    }, // updatePlayButtons()


        // PURPOSE: Handle message that YouTube video state has changed
    vidStateChange: function(event)
    {
        switch(event.data) {
        case -1:                // Video doing init load
            break;
        case 0:                 // Video ended -- force end
            dhpPinboardView.hitBtnStop();
            break;
        case 1:                 // Video playing
            break;
        case 2:                 // Video paused
            break;
        case 3:                 // Video buffering
            break;
        case 5:                 // Video cued (ready to play)
            dhpPinboardView.playState = dhpPinboardView.STATE_END;
            dhpPinboardView.updatePlayButtons();
            break;
        }
    }, // vidStateChange()


        // PURPOSE: Called once YouTube API is loaded and ready
    onYouTubeAPIReady: function()
    {
        dhpPinboardView.vidPlayer = new YT.Player('ytplayer', {
            height: '1',
            width: '1',
            videoId: dhpPinboardView.pinboardEP.ytvcode,
            events: {
                onStateChange: dhpPinboardView.vidStateChange,
                onReady: function() {
                    dhpPinboardView.playState=dhpPinboardView.STATE_END;
                    dhpPinboardView.updatePlayButtons();
                },
                onError: function(event) { console.log("YouTube Error: "+event.data)}
            }
        });
    }, // onYouTubeIframeAPIReady()


        // PURPOSE: Create marker objects for pinboard visualization; called by loadMapMarkers()
        // INPUT:   geoData = all AJAX data as JSON object: Array of ["type", ...]
        // SIDE-FX: assigns variables rawAjaxData, allMarkers, filters
    createDataObjects: function(geoData) 
    {
        dhpPinboardView.rawAjaxData = geoData;

        dhpPinboardView.filters = [];

            // Assign data to appropriate objects
        _.each(dhpPinboardView.rawAjaxData, function(dataSet) {
            switch(dataSet.type) {
            case 'filter':
                dhpPinboardView.filters.push(dhpServices.flattenTerms(dataSet));
                break;
            case 'FeatureCollection':
                dhpPinboardView.allMarkers = dataSet.features;
                break;
            }
        });

            // filters will now consist of array of objects with .name and .terms properties
            // each .terms property is an array of flattened legend key arrays

            // First legend will be selected by default
        dhpPinboardView.createLegends();
        dhpPinboardView.createLayerButtons();
        dhpPinboardView.createSVG();

        // dhpPinboardView.dhpUpdateSize();
    }, // createDataObjects()


        // RETURNS: An array of indices to the markers belonging to the given category
        // NOTES:   Must return 1st-level terms and all 2nd-level children
    getMarkersOfCategory: function(theCategory)
    {
        var catIndices=[], found;

            // Go through all of the markers
        _.each(dhpPinboardView.allMarkers, function(theMarker, index) {
                // For each marker, see if it is marked with this category
            found= _.find(theMarker.properties.categories, function(theCat) {
                return theCat == theCategory;
            });
            if (found) {
                catIndices.push(index);
            }
        });
        return catIndices;
    }, // getMarkersOfCategory()


        // PURPOSE: Create SVG data to represent markers on image
        // NOTES:   Need to create nested <g> groups to correspond to Legend heads and values
        //          Then we can show or hide various Legends by setting attributes
        //          Legend heads will have class .lgd-head and id #lgd-id+ID#
        //          Legend values will have class .lgd-val and id #lgd-id+ID#
        // ASSUMES: 2nd-level Legend value gets checked or unchecked by 1st-level parent, so that
        //              Markers can retain their distinctive 2nd-level IDs
        //          Legend head is the first term that appears in each Legend/Filter array
    createSVG: function()
    {
        var legendName, lgdHeadGroup, lgdHeadVal, markerIndices, theMarker, shape;

        _.each(dhpPinboardView.filters, function(theLegend, legIndex) {
            legendName = theLegend.name;

                // Create grouping for Legend head
            lgdHeadGroup = dhpPinboardView.paper.group();
                // Create entries for all of the 1st-level terms
            _.each(theLegend.terms, function(theTerm) {
                if (legendName === theTerm.name) {
                        // Can't set the attributes for Legend head until we get to its term entry
                        // Only first legend is visible initially, so set class accordingly
                    var lgdAtts = { id: 'lgd-id'+theTerm.id,
                                    stroke: "#000",
                                    strokeWidth: 1
                                  };
                    if (legIndex == 0) {
                        lgdAtts.class = 'lgd-head';
                    } else {
                        lgdAtts.class = 'lgd-head hide';
                    }
                    lgdHeadGroup.attr(lgdAtts);
                } else {
                        // Create grouping for Legend value
                        // Set color for all items of this value
                    lgdHeadVal = lgdHeadGroup.group();
                    var isPNG=false;
                        // If Legend value is PNG image, locate its details
                    if (theTerm.icon_url.charAt(0) === '@') {
                        isPNG=true;
                        var pngTitle = theTerm.icon_url.substring(1);
                        var pngItem = _.find(pngData, function(thePNG) { return thePNG.title === pngTitle; } );
                        lgdHeadVal.attr( { class: 'lgd-val',
                                            id: 'lgd-id'+theTerm.id
                                        } );
                    } else {
                        lgdHeadVal.attr( { class: 'lgd-val',
                                            id: 'lgd-id'+theTerm.id,
                                            fill: theTerm.icon_url
                                        } );
                    }
                        // Get list of all markers marked with this Legend value
                    markerIndices = dhpPinboardView.getMarkersOfCategory(theTerm.id);
                        // Create each marker in this group
                    _.each(markerIndices, function(mIndex) {
                        theMarker = dhpPinboardView.allMarkers[mIndex];
                        if (isPNG) {
                            shape = dhpPinboardView.paper.image(pngItem.url, theMarker.geometry.coordinates[0]-(pngItem.w/2),
                                        theMarker.geometry.coordinates[1]-pngItem.h, pngItem.w, pngItem.h);
                        } else {
                            switch(dhpPinboardView.pinboardEP.icon) {
                            case 'circle':
                                shape = dhpPinboardView.paper.circle(theMarker.geometry.coordinates[0],
                                                                    theMarker.geometry.coordinates[1],
                                                                    dhpPinboardView.radius);
                                break;
                            case 'diamond':
                                shape = dhpPinboardView.paper.polygon(dhpPinboardView.diamondPts);
                                shape.transform("t" + theMarker.geometry.coordinates[0] + "," + theMarker.geometry.coordinates[1]);
                                break;
                            case 'tack':
                                shape = dhpPinboardView.icons.thumbtack.use();
                                shape.transform("t" + theMarker.geometry.coordinates[0] + "," + theMarker.geometry.coordinates[1]);
                                break;
                            case 'ballon':
                                shape = dhpPinboardView.icons.ballon.use();
                                shape.transform("t" + theMarker.geometry.coordinates[0] + "," + theMarker.geometry.coordinates[1]);
                                break;
                            case 'mag':
                                shape = dhpPinboardView.icons.magGlass.use();
                                shape.transform("t" + theMarker.geometry.coordinates[0] + "," + theMarker.geometry.coordinates[1]);
                                break;
                            } // switch
                        }
                        shape.node.id = mIndex;
                        shape.data("i", mIndex);
                            // Clicking shape must invoke select modal (if no animation showing)
                        shape.click(function() {
                            if (dhpPinboardView.playState == dhpPinboardView.STATE_END) {
                                    // Get index to marker
                                var index = parseInt(this.data("i"));
                                var clicked = dhpPinboardView.allMarkers[index];
                                dhpServices.showMarkerModal(clicked);
                            }
                        });
                        lgdHeadVal.add(shape);
                    }); // each marker
                } // if
            }); // each Legend value
            lgdHeadGroup.add(lgdHeadVal);
        }); // each Legend Head
    }, // createSVG()


        // PURPOSE: Handle user selection of legend in navbar menu
        // INPUT:   target = element selected by user
    switchLegend: function(target)
    {
            // Unhighlight the layers button in nav bar
        jQuery('#layers-button').parent().removeClass('active');

        var newLgdName = jQuery(target).text();

        if (dhpPinboardView.layerBtnsOn  || newLgdName !== dhpPinboardView.curLgdName) {
            dhpPinboardView.layerBtnsOn = false;

                // Don't display current (or any) Legend in main Legend key
            jQuery('.legend-div').hide();
            jQuery('.legend-div').removeClass('active-legend');

                // Display selected legend (whose ID was stored in href) in main Legend key
            var action = jQuery(target).attr('href');
            jQuery(action).addClass('active-legend');
            jQuery(action).show();

                // Have to do extra check in case we are just switching out layer buttons
            if (newLgdName !== dhpPinboardView.curLgdName) {
                    // Change active menu item in top menu
                jQuery('.legend-dropdown > .active').removeClass('active');
                jQuery(target).parent().addClass('active');

                    // Update the markers to show on pinboard
                dhpPinboardView.switchFilter(newLgdName);
                dhpPinboardView.dhpUpdateSize();
            }
        }
    }, // switchLegend()


        // PURPOSE: Handle data implications of new Legend/Category
        // INPUT:   filterName = name of legend/category selected
        // ASSUMES: rawAjaxData has been assigned, selectControl has been initialized
        // SIDE-FX: Sets curLgdName, curLgdFilter; modifies svg class settings
    switchFilter: function(filterName)
    {
            // Reset current Legend/Filter variables
        dhpPinboardView.curLgdName = filterName;
        dhpPinboardView.curLgdFilter = _.find(dhpPinboardView.filters, function(theFilter) {
            return theFilter.name == filterName;
        });

        var term0 = dhpPinboardView.curLgdFilter.terms[0];

            // Add "hide" to class of all Legend heads in SVG
        var allGroupings = dhpPinboardView.paper.selectAll('.lgd-head');
        _.each(allGroupings, function(theGrouping, index) {
            if (!theGrouping.hasClass('hide')) {
                theGrouping.addClass('hide');
            }
        });

            // Remove "hide" for this Legend head in SVG
        var thisGroup = dhpPinboardView.paper.select('#lgd-id'+term0.id);
        if (thisGroup) {
            thisGroup.removeClass('hide');
        } else {
            throw new Error("Bug in Legend head handling: Legend Head ID not found in SVG");
        }
    }, // switchFilter()


        // PURPOSE: Handle user changing Legend keys in current Legend -- show current marker selection
        // ASSUMES: All Legends but current has "hide" in class
    refreshMarkerLayer: function()
    {
        var grpsToHide, lgdID, grpsToShow;

            // Hide all Legend values in current Legend by default
        grpsToHide = dhpPinboardView.paper.selectAll('#lgd-id'+dhpPinboardView.curLgdFilter.terms[0].id+' .lgd-val');
        _.each(grpsToHide, function(theGrouping, index) {
            if (!theGrouping.hasClass('hide')) {
                theGrouping.addClass('hide');
            }
        });

            // Go through all checked Legend values and remove hide from class of all assoc. markers
        jQuery('#legends .active-legend .compare input:checked').each(function(index) {
            lgdID = jQuery(this).closest('.row').find('.columns .value').data('id');
            grpsToShow = dhpPinboardView.paper.selectAll('#lgd-id'+lgdID);
            _.each(grpsToShow, function(theGrouping, index) {
                    theGrouping.removeClass('hide');
            });
        });
    }, // refreshMarkerLayer()


        // PURPOSE: Create HTML for all of the legends for this visualization
    createLegends: function() 
    {
        dhpServices.createLegends(dhpPinboardView.filters, 'Layer Buttons');

            // Handle user selection of value name from current Legend
        jQuery('#legends div.terms .row a').click(function(event) {
            var spanName = jQuery(this).data('id');

                // "Hide/Show all" button
            if (spanName==='all') {
                    // Should legend values now be checked or unchecked?
                var boxState = jQuery(this).closest('.row').find('input').prop('checked');
                jQuery('.active-legend .terms .row').find('input').prop('checked',!boxState);
            }
                // a specific legend/category value (ID#)
            else {
                    // uncheck everything
                jQuery('.active-legend .terms input').prop('checked', false);
                jQuery('.active-legend .terms .row.selected').removeClass('selected');
                    // select just this item
                jQuery(this).closest('.row').addClass('selected');
                jQuery(this).closest('.row').find('input').prop('checked', true);

                    // Child terms are hidden in menu -- selects them also automatically if parent is checked
                if (dhpPinboardView.useParent) {
                    jQuery('.active-legend .terms .row').find('*[data-parent="'+spanName+'"]').each(function( index ) {
                        jQuery( this ).closest('.row').find('input').prop('checked',true);
                    }); 
                }
            }
                //update pinboard
            dhpPinboardView.refreshMarkerLayer();
        });

            // Handle user selection of checkbox from current Legend
        jQuery('#legends div.terms input').click(function(event) {
            var checkAll = jQuery(this).closest('.row').hasClass('check-all');
            var boxState = jQuery(this).prop('checked');
            var spanName = jQuery(this).closest('.row').find('a').data('id');
                // "Hide/Show all" checkbox
            if (checkAll) {
                jQuery('.active-legend .terms .row').find('input').prop('checked',boxState);
            }
                // toggle individual terms
            else {
                jQuery('.active-legend .terms .check-all').find('input').prop('checked',false);
                
                    //child terms are now hidden in legend. This selects them if parent is checked
                if (dhpPinboardView.useParent) {
                    jQuery('.active-legend .terms .row').find('*[data-parent="'+spanName+'"]').each(function( index ) {
                        jQuery( this ).closest('.row').find('input').prop('checked',true);
                    });
                }
            }
            dhpPinboardView.refreshMarkerLayer();
        });

            // Handle selection of different Legends from navbar
        jQuery('.dhp-nav .legend-dropdown a').click(function(evt) {
            evt.preventDefault();
            dhpPinboardView.switchLegend(evt.target);
        });

            // Set defaults without calling switchfilter()
        dhpPinboardView.curLgdFilter = dhpPinboardView.filters[0];
        dhpPinboardView.curLgdName = dhpPinboardView.curLgdFilter.name;
    }, // createLegends()


        // PURPOSE: Create button to turn on/off each SVG overlay layer in Legend area
        // ASSUMES: createLegends() has already been called to create other legends
    createLayerButtons: function()
    {
            // If there are no layers, hide button and don't do anything else
        if (dhpPinboardView.pinboardEP.layers.length == 0) {
            jQuery('#layers-button').hide();
            return;
        }

        var layerSettings = dhpPinboardView.pinboardEP.layers;
        _.each(layerSettings, function(thisLayer, index) {
            jQuery('#layers-panel').append('<div class="layer-set" id="oLayerCtrl'+index+'">'+
                '<input type="checkbox" checked="checked"> '+
                '<a class="value" id="oLayerCtrlA'+index+'">'+thisLayer.label+'</a></div>');
                // Handle turning on and off pinboard svg overlay layer
            jQuery('#oLayerCtrl'+index+' input').click(function() {
                svgLayer = dhpPinboardView.paper.select('#oLayer'+index);
                    // Ensure layer visible
                if(jQuery(this).is(':checked')) {
                    svgLayer.removeClass('hide');
                    // Ensure layer invisible
                } else {
                    if (!svgLayer.hasClass('hide')) {
                        svgLayer.addClass('hide');
                    }
                }
            });
        });

            // Handle selecting "Layer Buttons" button on navbar
        jQuery('#layers-button').click(function(evt) {
            evt.preventDefault();

                // Hide current Legend info
            jQuery('.legend-div').hide();
            jQuery('.legend-div').removeClass('active-legend');

                // Were sliders already showing? Make filter mote legend visible again
            if (dhpPinboardView.layerBtnsOn) {
                    // Find the legend div that should be active now!
                var activeLegend = jQuery('.legend-title').filter(function() {
                    return (jQuery(this).text() === dhpPinboardView.curLgdName);
                }).parent();

                jQuery(activeLegend).addClass('active-legend');
                jQuery(activeLegend).show();

                jQuery('#layers-button').parent().removeClass('active');

                dhpPinboardView.layerBtnsOn = false;

                // Show buttons now
            } else {
                    // Show section of Legend with sliders
                jQuery('#layers-panel').addClass('active-legend');
                jQuery('#layers-panel').show();

                jQuery('#layers-button').parent().addClass('active');

                dhpPinboardView.layerBtnsOn = true;
            }
        });
    } // createLayerButtons()
};
