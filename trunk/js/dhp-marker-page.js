// PURPOSE: Handle viewing Marker content pages: Loaded by dhp_page_template() in dhp-project-functions.php
//			Also used for taxonomy pages, so there may be many entries 
// ASSUMES: dhpData is used to pass parameters to this function via wp_localize_script()
//			Content for each Marker marked by DIV CLASS="dhp-post" and has ID of marker
// USES:    JavaScript libraries jQuery, Underscore, Bootstrap ...


jQuery(document).ready(function($) { 

	var ajax_url = dhpData.ajax_url;
	var dhpSettings = dhpData.settings;
	//console.log(dhpSettings);

	// var save_entry_content = new Object();		// Marker settings were saved in this object -- now just title

		// Set Marker title, if given one -- This has been removed to allow using Theme defaults and Tax pages
	// if(dhpSettings['views']['post-view-title']) {
	// 	save_entry_content['the_title'] = $('.post-title').html();
	// 	$('.post-title').empty();
	// }

		// Is there any initial content? Make space, but don't load it yet
	// if(dhpSettings['views']['post-view-content']) {
	// 	if(dhpSettings['views']['post-view-content'].length>0) {
	// 			// Create placeholder for all AJAX data
	// 		// $('.dhp-entrytext').wrapInner('<div class="post-content" />');
	// 			// Hide it initially
	// 		$('.post-content').hide();
	// 	}
	// }

	// $('.post-content').hide();

		// Load Marker data for each Marker via AJAX
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
			// Title for view of Marker content Page
		// var markerTitle = dhpSettings['views']['post-view-title'];

			// Marker values to be enclosed in this new DIV
		var contentHTML = '';
		// var entry_html = $('<div class="new-content"/>');
			// Append it to DIV for this specific postID
		// $('.dhp-entrytext').append(entry_html);

			// default title is Marker post title -- REDO THIS??
		// if(markerTitle=='the_title') {
		// 	$('.post-title').append(save_entry_content['the_title']);

		// 	// unless overridden by settings
		// } else {
		// 		// convert from Legend name to custom field name
		// 	var titleCF = getCustomField(markerTitle);
		// 	$('.post-title').append(response[titleCF]);
		// }


			// Go through each Legend and show corresponding values
		_.each(dhpSettings['views']['post-view-content'], function(legName){
				// Convert Legend name to custom field name
			var cfName = getCustomField(legName);
				// Use custom field to retrieve value
			var tempVal = response[cfName];
			// console.log("CF = "+cfName+"; val = "+tempVal);
	
				// Display the normal WP page content if specified it should be shown
			// if (cfName=='the_content') {
			// 	$('.dhp-entrytext').show();
			// }

				// Special legend names to show thumbnails
			if (legName=='Thumbnail Right') {
				contentHTML += '<p class="thumb-right"><img src="'+tempVal+'" /></p>';
			} else if (legName=='Thumbnail Left') {
				contentHTML +='<p class="thumb-left"><img src="'+tempVal+'" /></p>';
				// Otherwise, just add the legend name and value to the string we are building
			} else if (tempVal) {
					contentHTML += '<h3>'+legName+'</h3><p>'+tempVal+'</p>';
			}
		});
		// console.log("contentHTML = "+contentHTML);
		$('#'+postID+' .dhp-entrytext').append(contentHTML);
		$('#'+postID).show();
	} // addContentToDiv()


		// PURPOSE: Convert from moteName to custom-field name
	function getCustomField(moteName) {
		var theMote = _.find(dhpSettings['motes'], function(theMote) {
			return moteName == theMote['name'];
		});
		return theMote['custom-fields'];
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
	            // fields: field_names
	        },
	        success: function(data, textStatus, XMLHttpRequest){
	            //console.log(JSON.parse(data));
	            addContentToDiv(postID, JSON.parse(data));
	        },
	        error: function(XMLHttpRequest, textStatus, errorThrown){
	           alert(errorThrown);
	        }
	    });
	}

});