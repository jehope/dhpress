// PURPOSE: Used for displaying posts based on a taxonomic term
//          (i.e., results of searching on Legend)
//          Loaded by dhp_tax_template() in dhp-project-functions.php
// ASSUMES: dhpData is used to pass parameters to this function via wp_localize_script()
//          page has DIV ID of dhp-entrytext where transaction material can be appended
// NOTES:   taxTerm.parent_name is the name of the mote; taxTerm.name is the value of the mote
// USES:    JavaScript libraries jQuery, Underscore, dhp-transcript

jQuery(document).ready(function($) {

    var ajax_url        = dhpData.ajax_url;
    var project_id      = dhpData.project_id;
    var dhpSettings     = dhpData.project_settings;
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

        dhpTranscript.prepareTaxTranscript(ajax_url, project_id, ".dhp-transcript-content", taxTerm.taxonomy, taxTerm.slug);
	}


        // Load specified mote data for each Marker via AJAX
    $('.dhp-post').each(function() {
            postID = $(this).attr('id');
            $(this).hide();                 // hide it until loaded by AJAX
            loadMeta(postID);
        }
    );

        // PURPOSE: Add dynamic content to Marker page from AJAX response
        // INPUT:   postID = ID of the Marker (also ID of DIV of CLASS "dhp-post")
        //          response = Hash of field name / value of Custom Fields read from Marker Page
    function addContentToDiv(postID, response) {
            // Title for view of Marker content Page
        // var markerTitle = dhpSettings['views']['post-view-title'];

            // Marker values to be enclosed in this new DIV
        var contentHTML = '';

            // default title is Marker post title -- REDO THIS??
        // if(markerTitle=='the_title') {
        //  $('.post-title').append(save_entry_content['the_title']);

        //  // unless overridden by settings
        // } else {
        //      // convert from Legend name to custom field name
        //  var titleCF = getCustomField(markerTitle);
        //  $('.post-title').append(response[titleCF]);
        // }

            // Go through each Legend and show corresponding values
        _.each(dhpSettings.views.transcript.content, function(legName) {
                // Convert Legend name to custom field name
            var cfName = getCustomField(legName);
            if (cfName) {
                    // Use custom field to retrieve value
                var tempVal = response[cfName];
                if (tempVal) {
                        // Special legend names to show thumbnails
                    if (legName=='Thumbnail Right') {
                        contentHTML += '<p class="thumb-right"><img src="'+tempVal+'" /></p>';
                    } else if (legName=='Thumbnail Left') {
                        contentHTML +='<p class="thumb-left"><img src="'+tempVal+'" /></p>';
                        // Otherwise, just add the legend name and value to the string we are building
                    } else if (tempVal) {
                        contentHTML += '<h3>'+legName+'</h3><p>'+tempVal+'</p>';
                    }
                }
            }
        });
        // console.log("contentHTML = "+contentHTML);
        $('#'+postID+' .dhp-entrytext').append(contentHTML);
        $('#'+postID).show();
    } // addContentToDiv()


        // PURPOSE: Convert from moteName to custom-field name
    function getCustomField(moteName)
    {
        var theMote = _.find(dhpSettings.motes, function(thisMote) {
            return moteName == thisMote.name;
        });
        if (theMote) {
            return theMote.cf;
        } else {
            return null;
        }
    } // getCustomField()


        // PURPOSE: Update Marker content page to show all of Marker's custom fields
        // INPUT:   postID = ID for this Marker post
    function loadMeta(postID)
    {
        jQuery.ajax({
            type: 'POST',
            url: ajax_url,
            data: {
                action: 'dhpGetMoteContent',
                post: postID
                // fields: field_names
            },
            success: function(data, textStatus, XMLHttpRequest) {
                //console.log(JSON.parse(data));
                addContentToDiv(postID, JSON.parse(data));
            },
            error: function(XMLHttpRequest, textStatus, errorThrown) {
               alert(errorThrown);
            }
        });
    } // loadMeta()

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