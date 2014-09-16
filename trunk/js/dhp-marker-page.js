// PURPOSE: Handle viewing Marker content pages: Loaded by dhp_page_template() in dhp-project-functions.php
//			Also used for taxonomy pages, so there may be many entries 
// ASSUMES: dhpData is used to pass parameters to this function via wp_localize_script()
//			Title for page marked by DIV CLASS="entry-title" or "post-title"
//			Content for each set of data marked by DIV CLASS="dhp-post" and has ID of marker
// USES:    JavaScript libraries jQuery, Underscore, ...


jQuery(document).ready(function($) { 

	var ajax_url = dhpData.ajax_url;
	var dhpSettings = dhpData.settings;
	var markerTitle = dhpSettings.views.post.title;
	var titleDOM=null;

		// If assigned Marker title, figure out what DIV to insert it into
	if(markerTitle !== '' && markerTitle !== 'disable' && markerTitle !== 'the_title') {
		if ($('.post-title').length) {
			titleDOM = $('.post-title');
		} else if ($('.entry-title').length) {
			titleDOM = $('.entry-title');
		}
	}

		// Load specified mote data for each Marker via AJAX
	$('.dhp-post').each(function() {
			postID = $(this).attr('id');
			$(this).hide();					// hide it until loaded by AJAX
			loadMeta(postID);
		}
	);

		// PURPOSE: Add dynamic content to Marker page from AJAX response
		// INPUT:   postID = ID of the Marker (also ID of DIV of CLASS "dhp-post")
		//			response = Hash of field name / value of Custom Fields read from Marker Page
	function addContentToDiv(postID, response) {
		var moteVal;

			// Title for view of Marker content Page??
		if (titleDOM && markerTitle) {
			moteVal = response[getCustomField(markerTitle)];
			if (moteVal) {
				$(titleDOM).empty();
				$(titleDOM).text(moteVal);
			}
		}

			// Marker values to be enclosed in this new DIV
		var contentHTML = '';

			// Go through each Legend and show corresponding values
		_.each(dhpSettings.views.post.content, function(legName) {
				// Convert Legend name to custom field name
			var cfName = getCustomField(legName);
			if (cfName) {
					// Use custom field to retrieve value
				moteVal = response[cfName];
				if (moteVal) {
						// Special legend names to show thumbnails
					if (legName=='Thumbnail Right') {
						contentHTML += '<p class="thumb-right"><img src="'+moteVal+'" /></p>';
					} else if (legName=='Thumbnail Left') {
						contentHTML +='<p class="thumb-left"><img src="'+moteVal+'" /></p>';
						// Otherwise, just add the legend name and value to the string we are building
					} else if (moteVal) {
						contentHTML += '<h3>'+legName+'</h3><p>'+moteVal+'</p>';
					}
				}
			}
		});

		$('#'+postID+' .dhp-entrytext').append(contentHTML);
		$('#'+postID).show();
	} // addContentToDiv()


		// PURPOSE: Convert from moteName to custom-field name
	function getCustomField(moteName) {
		var theMote = _.find(dhpSettings.motes, function(thisMote) {
			return (moteName == thisMote.name);
		});
        if (theMote) {
            return theMote.cf;
        } else {
            return null;
        }
	}

		// PURPOSE: Update Marker content page to show all of Marker's custom fields
		// INPUT:   postID = ID for this Marker post
	function loadMeta(postID){
	    jQuery.ajax({
	        type: 'POST',
	        url: ajax_url,
	        data: {
	            action: 'dhpGetMoteContent',
	            post: postID
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