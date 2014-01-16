// PURPOSE: Handle viewing Project content visualizations
// ASSUMES: dhpData is used to pass parameters to this function via wp_localize_script()
//          The sidebar is marked with HTML div as "secondary"
//          Section for marker modal is marked with HTML div as "markerModal"
//          An area for the map has been marked with HTML div as "dhp-visual"
// USES:    JavaScript libraries jQuery, Underscore, Bootstrap ...
// NOTES:   Format of Marker and Legend data is documented in dhp-project-functions.php
//          Format of project settings is documented in dhp-class-project.php
//          The class active-legend is added to whichever legend is currently visible and selected
// TO DO:   Generalize visualization types better (don't assume maps) -- don't pass map or layers settings
//          Seperate loading of markers from building of legends and other screen components ??

jQuery(document).ready(function($) {
        // Project variables
    var dhpSettings, projectID, ajaxURL;


    // projectID      = $('.post').attr('id');
    ajaxURL        = dhpData.ajax_url;
    dhpSettings    = dhpData.settings;
    projectID      = dhpSettings["project-details"]["id"];

        // insert top navigational bar and controls
    $('body').prepend(Handlebars.compile($("#dhp-script-nav-bar").html()));

        // Insert Marker modal window HTML
    $('body').append(Handlebars.compile($("#dhp-script-markerModal").html()));

        // initialize fullscreen mode settings
    if(dhpSettings['views']['map-fullscreen']==true){
        $('body').addClass('fullscreen');
        $('.dhp-nav .fullscreen').addClass('active');
    }

        // handle toggling fullscreen mode
    $('.dhp-nav .fullscreen').click(function(){
        if($('body').hasClass('fullscreen')) {
            $('body').removeClass('fullscreen');
            $('.dhp-nav .fullscreen').removeClass('active');
            dhpMaps.updateSize();
        } else {
            $('body').addClass('fullscreen');
            $('.dhp-nav .fullscreen').addClass('active');
            dhpMaps.updateSize();
        }
    });

        // handle turning joyride tips on/off
    $('.dhp-nav .tips').click(function(){
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
    var transEP = (findModalEpSettings('transcript')) ? getEntryPointByType('transcript') : null;

    if (mapEP) {
            // Add map elements to top nav bar
        $('.dhp-nav .nav-pills').append(Handlebars.compile($("#dhp-script-map-menus").html()));

            // Insert Legend area on right sidebar
        $('#secondary').prepend(Handlebars.compile($("#dhp-script-map-legend-head").html()));

        dhpMaps.initializeMap(ajaxURL, projectID, mapEP, transEP, dhpSettings['views']);

            // Handle reset button
        $('.olControlZoom').append('<a class="reset-map olButton"><i class="icon-white icon-refresh"></i></a');
        $('.olControlZoom .reset-map').click(function(){
            dhpMaps.resetMap();
        });

            // Add user tips for map
        $('body').append(Handlebars.compile($("#dhp-script-map-joyride").html()));
    }

        // Transcription views?
    if (transEP) {
        dhpTranscript.initialize();
    }

        // Map visualization?
    if (mapEP) {
        createLoadingMessage();
        dhpMaps.loadMapMarkers();
    }


    // ========================= FUNCTIONS

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

        // RETURNS: entry in the modal-ep array whose name is modalName
        // TO DO:   Put into Project object class??
    function findModalEpSettings(modalName) {
        return (_.find(dhpSettings['views']['modal-ep'],
                        function(theName) {
                            return (theName == modalName); })
                != undefined);
    }

        // PURPOSE: Bring up Loading pop-box modal dialog -- must be hidden by caller
    function createLoadingMessage()
    {
        $('body').append(Handlebars.compile($("#dhp-script-modal-loading").html()));   
        $('#loading').modal({backdrop:false});
        $('#loading').modal('show');
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

