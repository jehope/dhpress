// PURPOSE: Handle viewing Marker content pages
//			Loaded by dhp_page_template() in dhp-project-functions.php
// ASSUMES: dhpData is used to pass parameters to this function via wp_localize_script()
//			ID of the embedded HTML element of class "post" has the ID of this Marker
//			WP Marker page content begins with div named "entrytext" (immediately after page title)
// SIDE-FX: Insert placeholder for AJAX content called "post-content"
// USES:    JavaScript libraries jQuery, Underscore, Bootstrap ...


jQuery(document).ready(function($) { 

	var ajax_url = dhpData.ajax_url;
	var dhpSettings = JSON.parse(dhpData.settings);
	//console.log(dhpSettings)
	var entry_html;
	var save_entry_content = new Object();		// Marker settings were saved in this object -- now just title

		// Initialize Marker content page
		// Get the ID of this Marker post
	var post_id = $('.post').attr('id');

		// Set Marker title, if given one
	if(dhpSettings['views']['post-view-title']) {
		save_entry_content['the_title'] = $('.post-title').html();
		$('.post-title').empty();
	}

		// Is there any initial content? Make space, but don't load it yet
	if(dhpSettings['views']['post-view-content']) {
		if(dhpSettings['views']['post-view-content'].length>0) {
				// Create placeholder for AJAX data
			$('.entrytext').wrapInner('<div class="post-content" />');
			//save_entry_content['the_content'] = $('.post-content');
				// Hide it initially
			$('.post-content').hide();
		}
	}

		// Load initial Marker data via AJAX
	loadMeta(post_id);

		// PURPOSE: Add dynamic content to Marker page from AJAX response
		// INPUT:   response = Hash of field name / value of Custom Fields read from Marker Page
	function addContentToPage(response) {

			// Title for view of Marker content Page
		var tempTitle = dhpSettings['views']['post-view-title'];

		entry_html = $('<div class="new-content"/>');
		$('.entrytext').append(entry_html);

			// default title is Marker post title
		if(tempTitle=='the_title') {
			$('.post-title').append(save_entry_content['the_title']);

			// unless overridden by settings
		} else {
				// convert from Legend name to custom field name
			var titleCF = getCField(tempTitle);
			$('.post-title').append(response[titleCF]);
		}

			// Go through each Legend and show corresponding values
		_.each(dhpSettings['views']['post-view-content'], function(legName){
				// Convert Legend name to custom field name
			var cfName = getCField(legName);
			var tempVal = response[cfName];
			console.log(response[cfName]);

				// does this work?  Why??
			var tempResponse = $("<div/>").html(tempVal);
			var tempResponseText = $("<div/>").html(tempVal).text();

				// Is the field the textual content of post?
			if (cfName=='the_content') {
				$('.post-content').show();
			}

			if (legName=='Thumbnail Right') {
				$(entry_html).append('<p class="thumb-right"><img src="'+tempResponseText+'" /></p>');
			}
			else if (legName=='Thumbnail Left') {
				$(entry_html).append('<p class="thumb-left"><img src="'+tempResponseText+'" /></p>');

				// Otherwise, just add the legend name and value to the string we are building
			} else {
				if(tempVal) {
					$(entry_html).append('<h3>'+legName+'</h3>');
					//console.log(response[cfName])
					$(entry_html).append(tempResponse);
				}
			}
		});
	}

		// PURPOSE: Convert from moteName to custom-field name
		// TO DO:   More efficient search!
	function getCField(moteName) {
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
	            addContentToPage(JSON.parse(data))
	        },
	        error: function(XMLHttpRequest, textStatus, errorThrown){
	           alert(errorThrown);
	        }
	    });
	}

});