// PURPOSE: Handle viewing Marker content pages: Loaded by dhp_page_template() in dhp-project-functions.php
//			Also used for taxonomy pages, so there may be many entries 
// ASSUMES: dhpData is used to pass parameters to this function via wp_localize_script()
//			Title for page marked by DIV CLASS="entry-title" or "post-title"
//			Content for each set of data marked by DIV CLASS="dhp-post" and has ID of marker
// USES:    JavaScript libraries jQuery, Underscore, dhpServices


jQuery(document).ready(function($) { 
	var ajax_url = dhpData.ajax_url;
	var dhpSettings = dhpData.settings;
	var projID = dhpData.proj_id;

	var markerTitle = dhpSettings.views.post.title;
	var titleDOM=null;

		// If assigned Marker title, figure out what DIV to insert it into
	if (markerTitle !== '' && markerTitle !== 'disable' && markerTitle !== 'the_title') {
		if ($('.post-title').length) {
			titleDOM = $('.post-title');
		} else if ($('.entry-title').length) {
			titleDOM = $('.entry-title');
		}
	}

	dhpServices.initialize(ajax_url, projID, dhpSettings);

		// Load specified mote data for each Marker via AJAX
	$('.dhp-post').each(function() {
			postID = $(this).attr('id');
			$(this).hide();					// hide it until loaded by AJAX
			loadMeta(postID);
	});

		// PURPOSE: Add dynamic content to Marker page from AJAX response
		// INPUT:   postID = ID of the Marker (also ID of DIV of CLASS "dhp-post")
		//			response = Hash of field name / value of Custom Fields read from Marker Page
	function addContentToDiv(postID, markerData) {
			// Title for view of Marker content Page??
		if (titleDOM && markerTitle) {
			var moteVal;

			moteVal = markerData.properties.content[markerTitle];
			if (moteVal) {
				$(titleDOM).empty();
				$(titleDOM).text(moteVal);
			}
		}

			// Marker values to be enclosed in this new DIV
		var contentHTML = '';

			// Go through each Legend and show corresponding values
		_.each(dhpSettings.views.post.content, function(legName) {
			contentHTML += dhpServices.moteValToHTML(markerData, legName);
		});

		$('#'+postID+' .dhp-entrytext').append(contentHTML);
		$('#'+postID).show();
	} // addContentToDiv()

		// PURPOSE: Update Marker content page to show all of Marker's custom fields
		// INPUT:   postID = ID for this Marker post
	function loadMeta(postID){
	    jQuery.ajax({
	        type: 'POST',
	        url: ajax_url,
	        data: {
	            action: 'dhpGetPostContent',
	            marker_id: postID,
	            proj_id: projID
	        },
	        success: function(data, textStatus, XMLHttpRequest){
	            addContentToDiv(postID, JSON.parse(data));
	        },
	        error: function(XMLHttpRequest, textStatus, errorThrown){
	           alert(errorThrown);
	        }
	    });
	}

});