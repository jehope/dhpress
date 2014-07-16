// PURPOSE: Handle viewing Project content visualizations
// ASSUMES: dhpData is used to pass parameters to this function via wp_localize_script()
//          vizParams.layerData = array with all data needed for dhp-custom-maps
//          vizParams.current = index of current visualization in entry points
//          vizParams.menu = array of labels of visualizations
//          Section for marker modal is marked with HTML div as "markerModal"
// USES:    JavaScript libraries jQuery, Underscore, (Zurb) Foundation ...
// NOTES:   Format of project settings is documented in dhp-class-project.php

jQuery(document).ready(function($) {
        // Project variables
    var dhpSettings,            // all project settings
        projectID,
        ajaxURL,
        vizIndex;               // index of current visualization

        // modal and GUI support
    var modalSize;
    var browserMobile = (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase()));
        // For reaching functions in this file used by various visualization modules
    var callBacks;
        // Visualization-specific callbacks
    var updateVizSpace;

    if(browserMobile) {
        $('body').addClass('isMobile');
    }

    ajaxURL        = dhpData.ajax_url;
    dhpSettings    = dhpData.settings;
    projectID      = dhpSettings.general.id;

    vizIndex       = dhpData.vizParams.current;

    jQuery(document).foundation();

        // Create callback object so that visualization modules can access functions in this file
    callBacks = {
        remLoadingModal: removeLoadingMessage,
        showMarkerModal: showMarkerModal
    };

        //Add project nav bar
    createNavBar();

        // Insert Marker modal window HTML
    $('body').append(Handlebars.compile($("#dhp-script-markerModal").html()));
        // Set modal width
    modalSize      = dhpSettings.views.select.width;
    if(modalSize) {
        jQuery('#markerModal').addClass(modalSize);
    }

        // Did user provide visualization size params?
    var sizeStr = '';
    if (dhpSettings.views.miniWidth && dhpSettings.views.miniWidth != '') {
        sizeStr = 'width:'+ String(dhpSettings.views.miniWidth)+'px; ';
    }
    if (dhpSettings.views.miniHeight && dhpSettings.views.miniHeight != '') {
        sizeStr += 'height:'+ String(dhpSettings.views.miniHeight)+'px';
    }
    if (sizeStr !== '') {
        $('<style type="text/css"> @media screen and (min-width: 600px) { #dhp-visual { '+
            sizeStr+' }} </style>').appendTo('head');
    }

        // initialize fullscreen mode settings
    if(dhpSettings.views.fullscreen) {
        $('body, html').addClass('fullscreen');
        $('.dhp-nav .fullscreen').addClass('active');
    }

        // Constants regarding GUI items
    var wpAdminBarWidth        = 783; // Width at which the admin bar changes to mobile version
    var wpAdminBarHeight       = 32;  // Default admin bar height
    var wpMobileAdminBarHeight = 46;  // Mobile admin bar height
    var wpAdminBarVisible      = jQuery('body').hasClass('admin-bar'); // check if WP admin bar is present

    jQuery(window).resize( windowResized );

        //configure marker modal for future selection
    jQuery('#markerModal').foundation('reveal', {
        animation: 'fadeAndPop',
        animation_speed: 250,
        close_on_background_click: true,
        close_on_esc: true,
        dismiss_modal_class: 'close-select-modal',
        bg_class: 'reveal-modal-bg',
        bg : jQuery('reveal-modal-bg'),
        css : {
            open : {
                'opacity': 0,
                'visibility': 'visible',
                'display' : 'block'
            },
            close : {
                'opacity': 1,
                'visibility': 'hidden',
                'display': 'none'
            }
        }
    });

        // Attach reveal bg listener for mobile devices(iPad bug)
    if (jQuery('body').hasClass('isMobile')) {
        jQuery('body').on('touchend', function(evt) {
            if(jQuery(evt.target).hasClass('reveal-modal-bg')) {
                jQuery('#markerModal').foundation('reveal', 'close');
            }            
        });
    }

        // Don't know why this is needed -- but Select Modal Close button won't work without it
    $('#markerModal a.close-select-modal').click(function() {
      $('#markerModal').foundation('reveal', 'close');
    });

    createLoadingMessage();

        // Get the settings for current visualization
    var thisEP = dhpSettings.eps[vizIndex];
    switch (thisEP.type) {
    case 'map':
            // vizParams.layerData must have array of DHP custom map layers to add to "library" -- not base maps (??)
        _.each(dhpData.vizParams.layerData, function(theLayer) {
            dhpCustomMaps.maps.addMap(theLayer.dhp_map_typeid, theLayer.dhp_map_shortname,
                                    theLayer.dhp_map_n_bounds, theLayer.dhp_map_s_bounds,
                                    theLayer.dhp_map_e_bounds, theLayer.dhp_map_w_bounds, 
                                    theLayer.dhp_map_cent_lat, theLayer.dhp_map_cent_lon,
                                    theLayer.dhp_map_min_zoom, theLayer.dhp_map_max_zoom,
                                    theLayer.dhp_map_url,      null );
        });

            // all custom maps must have already been loaded into run-time "library"
        dhpMapsView.initialize(ajaxURL, projectID, vizIndex, thisEP.settings, dhpData.vizParams, callBacks);

        updateVizSpace = dhpMapsView.dhpUpdateSize;
        break;

    case 'cards':
        dhpCardsView.initialize(ajaxURL, projectID, vizIndex, thisEP.settings, dhpSettings.motes, callBacks);

        updateVizSpace = dhpCardsView.dhpUpdateSize;
        break;

    case 'pinboard':
        dhpPinboardView.initialize(ajaxURL, projectID, vizIndex, thisEP.settings, dhpData.vizParams, callBacks);

        updateVizSpace = dhpPinboardView.dhpUpdateSize;
        break;
    }

        // Transcription widget
    if (modalViewHas("transcript")) {
        dhpTranscript.initialize();
    }

    // ========================= FUNCTIONS


    function windowResized()
    {
        var windowWidth, windowHeight;

            //reset body height to viewport so user can't scroll visualization area
        if (jQuery('body').hasClass('fullscreen')) {
                // get new dimensions of browser
            windowWidth  = jQuery(window).width();
            windowHeight = jQuery(window).height();

                // Override modal class size to/from medium if window size is under/over certain sizes
            if (windowWidth<800) {
                jQuery('#markerModal').removeClass('medium');
                jQuery('#markerModal').addClass(modalSize);
            }
            else if (modalSize==='tiny' && windowWidth >= 800 && windowWidth < 1200) {
                jQuery('#markerModal').removeClass('tiny');
                jQuery('#markerModal').addClass('medium');
            }
            else if (modalSize==='small' && windowWidth >= 800 && windowWidth < 1200) {
                jQuery('#markerModal').removeClass('small');
                jQuery('#markerModal').addClass('medium');
            }
            else {
                jQuery('#markerModal').removeClass('medium');
                jQuery('#markerModal').addClass(modalSize);
            }

                // New WordPress has a mobile admin bar with larger height(displays below 783px width)
            if (wpAdminBarVisible && windowWidth >= wpAdminBarWidth ) {
                jQuery('body').height(windowHeight - wpAdminBarHeight);
            }
                // Non mobile admin bar height
            else if (wpAdminBarVisible && windowWidth < wpAdminBarWidth ) {
                jQuery('body').height(windowHeight - wpMobileAdminBarHeight);
                    // ?? Joe added this later -- remove?
                // jQuery('#dhp-visual').height(windowHeight - wpMobileAdminBarHeight);
            }
                //Non logged in users
            else {
                jQuery('body').height(windowHeight);
            }
                // Force visual space to take full room
            // jQuery('#dhp-visual').css({ 'height': jQuery('body').height() - wpMobileAdminBarHeight, 'top' : wpMobileAdminBarHeight });
        }

            // Do whatever needed for specific visualization
        if (updateVizSpace) {
            updateVizSpace();
        }
    } // windowResized()


    function createNavBar()
    {
        var homeBtnLabel = dhpSettings.general.homeLabel;
        var homeBtnURL   = dhpSettings.general.homeURL;

            // Detect appropriate theme location to attach nav bar(header or body)
            // insert top navigational bar and controls
        if($('header.site-header')) {
            $('header.site-header').append(Handlebars.compile($('#dhp-script-nav-bar').html()));
        }
        else {
            $('#content').prepend(Handlebars.compile($('#dhp-script-nav-bar').html()));
        }
            // If Home button defined, insert it
        if ((homeBtnLabel !== null) && (homeBtnLabel !== '') && (homeBtnURL !== null) && (homeBtnURL !== '')) {
            var homeBtnHTML = '<li ><a href="'+ homeBtnURL +'"><i class="fi-home"></i> ' + homeBtnLabel + ' </a></li>';
            $('.top-bar-section .right').prepend(homeBtnHTML);
        }

            // Create drop-down menu for visualizations
            // Place at start (left end) of right side (??)
        if (dhpData.vizParams.menu.length > 1) {
                // Insert slot into nav-bar
            $('.top-bar-section .right').prepend(Handlebars.compile($('#dhp-script-epviz-menu').html()));

                // Matches viz parameter in URL
            var vizPattern = /viz=\d+/;
                // Get URL of current location, ensure it is a string
            var baseURL = String(window.location);
                // remove any trailing # in case we need to append query var
            if (baseURL.substr(-1,1) == '#') {
                baseURL = baseURL.substring(0, baseURL.length-1);
            }
                // get query string
            var queryStr = window.location.search;
                // if no query string at all, need to add initial query character and viz param
            if (queryStr.length < 2) {
                baseURL += '?viz=0'

                // Check to see if the query string lacks viz param
            } else if (!queryStr.match(vizPattern)) {
                baseURL += '&viz=0'
            }

                // Split off the query params -- may need to include "project=X" in any URL
            var menuHTML, active, linkStr;
            _.each(dhpData.vizParams.menu, function(mItem, index) {
                    // Don't need to create menu for this current visualization, and select shouldn't do anything
                if (vizIndex == index) {
                    active = ' class="active"';
                    linkStr = '<a href="#">'+mItem+'</a>';
                } else {
                    active = '';
                    linkStr = '<a href="'+baseURL.replace(vizPattern, 'viz='+index)+'">'+mItem+'</a>';
                }
                menuHTML = '<li'+active+'>'+linkStr+'</li>';
                $('.dropdown.epviz-dropdown').append(menuHTML);
            });
        }

            // Get name of Project and put on Nav Bar
        var projName = $('.entry-title').text();
        if (projName && projName.length) {
            $('.dhp-nav .title-area .name h1 a').text(projName);
        }

            // handle toggling fullscreen mode
        $('.dhp-nav .fullscreen').click(function(){
            if($('body').hasClass('fullscreen')) {
                $('body, html').removeClass('fullscreen');
                $('.dhp-nav .fullscreen').removeClass('active');
            } else {
                $('body, html').addClass('fullscreen');
                $('.dhp-nav .fullscreen').addClass('active');
            }
            windowResized();
        });

            // If tipsModal exists, create link to open it
        var helpText = $('#tipModal .modal-body').text();
        if (helpText !== undefined && helpText.length > 1) {
            $('.dhp-nav .top-bar-section .right').append('<li><a href="#" class="tips" data-reveal-id="tipModal" data-reveal><i class="fi-info"></i>Tips</a></li>');
                // Don't know why this is needed -- but Select Modal Close button won't work without it
            $('#tipModal .close-tip').click(function() {
              $('#tipModal').foundation('reveal', 'close');
            });
        }
    } // createNavBar()


        // RETURNS: true if the Select Modal has a widget whose name is modalName
    function modalViewHas(modalName) {
        return (_.find(dhpSettings.views.select.widgets,
                        function(theName) { return (theName == modalName); }) != undefined);
    }

        // PURPOSE: Bring up Loading pop-box modal dialog
    function createLoadingMessage()
    {
        $('body').append(Handlebars.compile($("#dhp-script-modal-loading").html()));  
        // FIX: Error in Foundation Reveal needs the following. 
        // Link: http://foundation.zurb.com/forum/posts/375-foundation-5-reveal-options-not-working
        $('#loading').foundation('reveal', {
            animation: 'fadeAndPop',
            animation_speed: 250,
            close_on_background_click: false,
            close_on_esc: false,
            dismiss_modal_class: 'close-reveal-modal',
            bg_class: 'loading-reveal-modal-bg',
            bg : $('.loading-reveal-modal-bg'),
            css : {
                open : {
                    'opacity': 0,
                    'visibility': 'visible',
                    'display' : 'block'
                },
                close : {
                    'opacity': 1,
                    'visibility': 'hidden',
                    'display': 'none'
                }
            }
        });
        // $('#loading').modal({backdrop:false});
        // $('#loading').modal('show');
        $('#loading').foundation('reveal', 'open');
        // $('.loading-reveal-modal-bg').remove();
    } // createLoadingMessage()


        // PURPOSE: Remove the Loading pop-up modal dialog
    function removeLoadingMessage()
    {
            // Remove Loading modal
        $('#loading').foundation('reveal', 'close');
    } // removeLoadingMessage()


        // PURPOSE: Fill out and show modal for marker
        // INPUT:   feature = the feature selected to show (in same format as generated by createMarkerArray())
        // SIDE-FX: Modifies DOM to create modal dialog window
    function showMarkerModal(feature)
    {
        var selectParams = dhpSettings.views.select;
        var titleAtt='';
        var builtHTML;
        var link1, link2, link1Target, link2Target;

        if(selectParams.title) {
            titleAtt =  feature.properties.title;
        }

        link1  = feature.properties.link;
        link2  = feature.properties.link2;
            // Open in new tab?
        if(selectParams.linkNewTab) {
            link1Target = 'target="_blank"';
        }
        if(selectParams.link2NewTab) {
            link2Target = 'target="_blank"';
        }

            // Remove anything currently in body -- will rebuild from scratch
        jQuery('#markerModal .modal-body').empty();

            // Should Select Modal show transcript?
        if (modalViewHas("transcript"))
        {
            jQuery('#markerModal').addClass('transcript');

            var transcriptSettings = {
                'audio'         : feature.properties.audio,
                'transcript'    : feature.properties.transcript,
                'transcript2'   : feature.properties.transcript2,
                'timecode'      : feature.properties.timecode,
                'startTime'     : -1,
                'endTime'       : -1
            };

            if (transcriptSettings.timecode) {
                var time_codes = transcriptSettings.timecode.split('-');
                transcriptSettings.startTime = dhpTranscript.convertToMilliSeconds(time_codes[0]);
                transcriptSettings.endTime   = dhpTranscript.convertToMilliSeconds(time_codes[1]);
            }

            dhpTranscript.prepareOneTranscript(ajaxURL, projectID, '#markerModal .modal-body', transcriptSettings);
         }

            // Create HTML for all of the data related to the Marker
         if (selectParams.content) {
            builtHTML = '<div><h3>Details:</h3></div>';
                // Go through each of the motes specified to be shown in select modal
            _.each(selectParams.content, function(cMote) {
                var mVal = feature.properties.content[cMote];
                if (mVal) {
                    if (cMote==='Thumbnail Right') {
                        builtHTML += '<div class="thumb-right">'+mVal+'</div>';
                    } else if (cMote==='Thumbnail Left') {
                        builtHTML += '<div class="thumb-left">'+mVal+'</div>';
                    } else if (cMote == 'the_content') {
                        builtHTML += '<div>'+mVal+'</div>';
                    } else {
                        builtHTML += '<div><span class="key-title">'+cMote+'</span>: '+mVal+'</div>';
                    }
                }
            }); // _.each()
        }

        jQuery('#markerModal .modal-body').append(builtHTML);

            // clear previous marker links
        jQuery('#markerModal .reveal-modal-footer .marker-link').remove();
            // Change title
        jQuery('#markerModal #markerModalLabel').empty().append(titleAtt);

            // setup links
        if (link1 && link1!='disable') {
            jQuery('#markerModal .reveal-modal-footer .button-group').prepend('<li><a '+link1Target+
                ' class="button success marker-link" href="'+link1+'">'+selectParams.linkLabel+'</a></li>');
        }
        if (link2 && link2 !='disable') {
            jQuery('#markerModal .reveal-modal-footer .button-group').prepend('<li><a '+link2Target+
                ' class="button success marker-link" href="'+link2+'">'+selectParams.link2Label+'</a></li>');
        }
            //Open modal
        jQuery('#markerModal').foundation('reveal', 'open');
    } // showMarkerModal()
});
