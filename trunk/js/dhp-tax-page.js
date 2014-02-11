// PURPOSE: Used for displaying posts based on a taxonomic term
//          (i.e., results of searching on Legend)
//          Loaded by dhp_tax_template() in dhp-project-functions.php
// ASSUMES: dhpData is used to pass parameters to this function via wp_localize_script()
//          page has DIV ID of dhp-entrytext where transaction material can be appended
// NOTES:   taxTerm.parent_name is the name of the mote; taxTerm.name is the value of the mote
// USES:    JavaScript libraries jQuery, Underscore, dhp-transcript
// TO DO:   Fetch and display mote values specified in projectSettings

jQuery(document).ready(function($) {

    var ajax_url        = dhpData.ajax_url;
    var project_id      = dhpData.project_id;
    var projectSettings = dhpData.project_settings;
    var taxTerm         = dhpData.tax;
    var isTranscript    = dhpData.isTranscript;

    // console.log("Preparing tax transcript with AJAX URL "+ajax_url+" for ProjectID " + project_id + " tax head term "+taxTerm.taxonomy+" at URL "+taxTerm.slug);
    // console.log(dhpData.project['motes']);
    // console.log("Term name: "+taxTerm.name);
    // console.log("Parent name: "+taxTerm.parent_name);
    // console.log("Is transcript: "+isTranscript);

        // Insert name of taxonomy on top of page, where A/V widget will go
	$('#content').prepend('<h1>'+taxTerm.name+'</h1><div class="dhp-transcript-content"></div>');

        // Check to see if this is a transcript taxonomy
	if (isTranscript) {
        dhpTranscript.initialize();

        // $('#content').prepend('<div id="transcript-div"></div>');
        dhpTranscript.prepareTaxTranscript(ajax_url, project_id, ".dhp-transcript-content", taxTerm.taxonomy, taxTerm.slug);
	}

        // find tallest div.row in transcript and set container max-height 40px larger. Default is max 300px
        // TO DO:  Replace _.each() with _.find()
    // function searchForMaxHeight(elements) {
    //     var maxHeight = 0;
    //     _.each(elements, function(val){ 
    //         if($(val).height()>maxHeight){
    //             maxHeight = $(val).height();
    //         }
    //     });
    //     if(maxHeight>400) {
    //         maxHeight = 400;
    //     }
    //     $('.transcript-list').css({'min-height': maxHeight+40});
    // }


        // PURPOSE: Given position in milliseconds, find and highlight tag corresponding to play position
        // ASSUMES: tcArray has been compiled, contains 1 entry at end beyond # of "playheads"
    // function hightlightTranscriptLine(millisecond){
    //     var match;
    //     _.find(tcArray, function(val, index){
    //         match = (millisecond < tcArray[index+1]);
    //         if (match) {
    //             if(rowIndex!==index) {
    //                 rowIndex      = index;
    //                 var topDiff   = $('.transcript-list div.type-timecode').eq(index).offset().top - $('.transcript-list').offset().top;
    //                 var scrollPos = $('.transcript-list').scrollTop() +topDiff;

    //                 $('.transcript-list').animate({
    //                    scrollTop: scrollPos
    //                 }, 500);
    //                 $('.transcript-list div.type-timecode').removeClass('current-clip');
    //                 $('.transcript-list div.type-timecode').eq(index).addClass('current-clip');
    //             }
    //             return match;
    //         } 
    //     });
    // }

    // function categoryColors(element,color){
    //     _.each($('.type-timecode'), function(val,index) {
    // 		var someText = $(val).html().replace(/(\r\n|\n|\r)/gm,"");
    // 		if(someText=='[00:00:16.19]') {
    // 			$(val).css('background-color', '#ccc');
    // 		}
    // 	});
    // }


});