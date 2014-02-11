// PURPOSE: Handle viewing Project content visualizations
// ASSUMES: dhpData is used to pass parameters to this function via wp_localize_script()
//          viewParams['layerData'] = array with all data needed for this visualization by dhp-custom-maps
//          The sidebar is marked with HTML div as "secondary"
//          Section for marker modal is marked with HTML div as "markerModal"
// USES:    JavaScript libraries jQuery, Underscore, Bootstrap ...
// NOTES:   Format of project settings is documented in dhp-class-project.php
// TO DO:   Seperate loading of markers from building of legends and other screen components ??

jQuery(document).ready(function($) {
        // Project variables
    var dhpSettings, projectID, ajaxURL, viewParams;
        // Inactivity timeout
    var userActivity = false, minutesInactive = 0, activeMonitorID, maxMinutesInactive;
    var browserMobile = (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase()));

    if(browserMobile) {
        $('body').addClass('isMobile');
    }
    // projectID      = $('.post').attr('id');
    ajaxURL        = dhpData.ajax_url;
    vizParams      = dhpData.vizParams;
    dhpSettings    = dhpData.settings;
    projectID      = dhpSettings["project-details"]["id"];
    jQuery(document).foundation();

    //Add project nav bar
    createNavBar();
    
        // Insert Marker modal window HTML
    $('body').append(Handlebars.compile($("#dhp-script-markerModal").html()));
        // Set modal size
    if(dhpSettings['views']['modal-size']) {
        jQuery('#markerModal').addClass(dhpSettings['views']['modal-size']);
    }
        // initialize fullscreen mode settings
    if(dhpSettings['views']['map-fullscreen']==true){
        $('body').addClass('fullscreen');
        $('.dhp-nav .fullscreen').addClass('active');
    }
    $('.dhp-nav .title-area .name h1 a').text($('.entry-title').text());
        // handle toggling fullscreen mode
    $('.dhp-nav .fullscreen').on('click', function(){
        if($('body').hasClass('fullscreen')) {
            $('body').removeClass('fullscreen');
            $('.dhp-nav .fullscreen').removeClass('active');
            dhpMapsView.dhpUpdateSize();
        } else {
            $('body').addClass('fullscreen');
            $('.dhp-nav .fullscreen').addClass('active');
            dhpMapsView.dhpUpdateSize();
        }
    });

        // handle turning joyride tips on/off
    $('.dhp-nav .tips').on('click', function(){
        if($('.dhp-nav .tips').hasClass('active')) {
            $('.dhp-nav .tips').removeClass('active');
            $('#dhpress-tips').joyride('hide');
        } else {
            $('#dhpress-tips').joyride('restart');
            $('.dhp-nav .tips').addClass('active');
        }
    });

    $('<style type="text/css"> @media screen and (min-width: 600px) { #dhp-visual{ width:'+dhpSettings['views']['map-width']+'px; height:'+dhpSettings['views']['map-height']+'px;}} </style>').appendTo('head');

        // Map visualization?
    var mapEP   = getEntryPointByType('map');
    if (mapEP) {
            // vizParams.layerData must have array of DHP custom map layers to add to "library" -- not base maps (??)
        _.each(vizParams.layerData, function(theLayer) {
            dhpCustomMaps.maps.addMap(theLayer.dhp_map_typeid, theLayer.dhp_map_shortname,
                                    theLayer.dhp_map_n_bounds, theLayer.dhp_map_s_bounds,
                                    theLayer.dhp_map_e_bounds, theLayer.dhp_map_w_bounds, 
                                    theLayer.dhp_map_cent_lat, theLayer.dhp_map_cent_lon,
                                    theLayer.dhp_map_min_zoom, theLayer.dhp_map_max_zoom,
                                    theLayer.dhp_map_url,      null );
        });

            // Add map elements to top nav bar
        $('.dhp-nav .top-bar-section .left').append(Handlebars.compile($("#dhp-script-map-menus").html()));

            // Insert Legend area on right sidebar
        $('#dhp-visual').after(Handlebars.compile($("#dhp-script-map-legend-head").html()));

            // all custom maps must have already been loaded into run-time "library"
        dhpMapsView.initializeMap(ajaxURL, projectID, mapEP, dhpSettings['views']);

            // Add user tips for map
        $('body').append(Handlebars.compile($("#dhp-script-map-joyride").html()));

        createLoadingMessage();
    }

        // Transcription views?
    if (modalViewHas("transcript")) {
        dhpTranscript.initialize();
    }

        // Monitor user activity, only if setting given
    maxMinutesInactive = dhpSettings["project-details"]["max-inactive"];
    if ((maxMinutesInactive !== null) && (maxMinutesInactive !== '') && (maxMinutesInactive !== '0') && (maxMinutesInactive !== 0)) {
        if (typeof(maxMinutesInactive) === "string") {
            maxMinutesInactive = parseFloat(maxMinutesInactive);
        }
        document.onclick = function() {
            userActivity = true;
        };
        document.onmousemove = function() {
            userActivity = true;
        };
        document.onkeypress = function() {
            userActivity = true;
        };
        activeMonitorID = window.setInterval(monitorActivity, 60000);    // 1000 milliseconds = 1 sec * 60 sec = 1 minute
    }

    // ========================= FUNCTIONS

        // PURPOSE: Called once a minute to see if user has done anything in that interval
    function monitorActivity()
    {
            // Either increase or rest minutesInactive, based on user activity in last minute
        if (userActivity) {
            minutesInactive = 0;
        } else {
            minutesInactive++;
        }
        userActivity = false;
        if (minutesInactive >= maxMinutesInactive) {
            document.location.href = dhpSettings["project-details"]["home-url"];
        }
    } // monitorActivity()

    function createNavBar()
    {
        var homeBtnLabel = dhpSettings["project-details"]["home-label"];
        var homeBtnURL   = dhpSettings["project-details"]["home-url"];

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

    } // createNavBar()


        // RETURNS: Entry point of dhpSettings array whose type is theType
        // ASSUMES: dhpSettings loaded, in correct format
    function getEntryPointByType(theType) {
        var theEP;
        theEP = _.find(dhpSettings['entry-points'],
                        function(thisEP) { return (thisEP["type"] == theType); });
        if (theEP !== undefined && theEP !== null) {
            return theEP["settings"];
        } else {
            return null;
        }
    }

        // RETURNS: true if there is a modal entry point defined whose name is modalName
    function modalViewHas(modalName) {
        return (_.find(dhpSettings['views']['select']['view-type'],
                        function(theName) {
                            return (theName == modalName); })
                != undefined);
    }

        // PURPOSE: Bring up Loading pop-box modal dialog -- must be hidden by caller
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


    // function createLookup(filter){
    //     viewMap.catFilter = filter;

    //     var catFilterSelect = filter.terms;
    //     var countTerms = Object.keys(viewMap.catFilterSelect).length; 
      
    //     for(i=0;i<countTerms;i++) {
    //         var tempName = catFilterSelect[i].id;
    //         lookupParents[tempName];
    //         lookupParents[tempName] = { externalGraphic : catFilterSelect[i].icon_url };
            
    //     }
    //     //alert(JSON.stringify(lookupParents));
    //     return lookupParents;
       
    // }

        //PURPOSE: To check a map feature for coordinates
        //RETURNS: Boolean
        //TODO: Refine coordinate check
    // function checkForCoordinates(feature) {
    //     //if cordinate values length is greater than 1 return true
    //     var tempFeature = feature;
    //     var check = false;
    //     if(tempFeature.geometry) {
    //         if(tempFeature.geometry.coordinates&&tempFeature.geometry.coordinates[0]&&tempFeature.geometry.coordinates[1]) {
    //             if(tempFeature.geometry.coordinates[0].length>1&&tempFeature.geometry.coordinates[1].length>1&&tempFeature.geometry.coordinates[0]!==null,tempFeature.geometry.coordinates[1]!==null)
    //                 check = true;
    //         }
    //     }
    //     return check;
    // }

    //     // TO DO:  Everything; get size from EP parameters…
    // function createTimeline(data) {
    //     //console.log(data);
    //     createStoryJS({
    //         type:       'timeline',
    //         width:      '960',
    //         height:     '600',
    //         source:     'http://msc.renci.org/dev/wp-content/plugins/dhp/js/test.json',
    //         embed_id:   'timeline'           // ID of the DIV you want to load the timeline into
    //     });
    // }

    // function loadTimeline(projectID){
    //     jQuery.ajax({
    //         type: 'POST',
    //         url: ajaxURL,
    //         data: {
    //             action: 'dhpGetTimeline',
    //             project: projectID
    //         },
    //         success: function(data, textStatus, XMLHttpRequest){
    //             //console.log(textStatus);
    //             createTimeline(JSON.parse(data));
    //         },
    //         error: function(XMLHttpRequest, textStatus, errorThrown){
    //            alert(errorThrown);
    //         }
    //     });
    // }

});

