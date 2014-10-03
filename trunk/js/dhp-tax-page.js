// PURPOSE: Used for displaying posts based on a taxonomic term
//          (i.e., results of searching on Legend)
//          Loaded by dhp_tax_template() in dhp-project-functions.php
// ASSUMES: dhpData is used to pass parameters to this function via wp_localize_script()
//          page has DIV ID of dhp-entrytext where transaction material can be appended
// NOTES:   taxTerm.parent_name is the name of the mote; taxTerm.name is the value of the mote
// USES:    JavaScript libraries jQuery, Underscore, dhpServices, dhpWidget

jQuery(document).ready(function($) {

    var ajax_url        = dhpData.ajax_url;
    var project_id      = dhpData.project_id;
    var dhpSettings     = dhpData.project_settings;
    var taxTerm         = dhpData.tax;
    var isTranscript    = dhpData.isTranscript;

        // Insert name of taxonomy on top of page, where A/V widget will go
	$('#content').prepend('<h1>'+taxTerm.name+'</h1><div class="dhp-transcript-content"></div>');

    dhpServices.initialize(ajax_url, project_id, dhpSettings);

        // Check to see if this is a transcript taxonomy
	if (isTranscript) {
        dhpWidget.initialize();

        dhpWidget.prepareTaxTranscript(ajax_url, project_id, ".dhp-transcript-content", taxTerm.taxonomy, taxTerm.slug);
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
    function addContentToDiv(postID, markerData) {
            // Marker values to be enclosed in this new DIV
        var contentHTML = '';

            // Go through each Legend and show corresponding values
        _.each(dhpSettings.views.transcript.content, function(legName) {
            contentHTML += dhpServices.moteValToHTML(markerData, legName);
        });
        // console.log("contentHTML = "+contentHTML);
        $('#'+postID+' .dhp-entrytext').append(contentHTML);
        $('#'+postID).show();
    } // addContentToDiv()


        // PURPOSE: Update Marker content page to show all of Marker's custom fields
        // INPUT:   postID = ID for this Marker post
    function loadMeta(postID)
    {
        jQuery.ajax({
            type: 'POST',
            url: ajax_url,
            data: {
                action: 'dhpGetTaxContent',
                marker_id: postID,
                proj_id: project_id
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
});