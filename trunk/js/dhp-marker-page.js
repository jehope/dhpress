// Library loaded by dhp_page_template() in dhp-project-functions.php for viewing Marker content
// ASSUMES: dhpData is used to pass parameters to this function via wp_localize_script()
// USES:    JavaScript libraries jQuery, Underscore, Bootstrap ...


jQuery(document).ready(function($) { 

	var ajax_url = dhpData.ajax_url;
	dhpSettings = JSON.parse(dhpData.settings);
	//console.log(dhpSettings)
	var entry_html;
	var save_entry_content = new Object();


	getContent(dhpSettings['views']['post-view-content']);

	function getContent(content) {
		var post_id = $('.post').attr('id');
		loadMeta(post_id);

		if(dhpSettings['views']['post-view-title']) {
			save_entry_content['the_title'] = $('.post-title').html();
			$('.post-title').empty();
		}

		if(dhpSettings['views']['post-view-content']) {
			if(dhpSettings['views']['post-view-content'].length>0) {
				$('.entrytext').wrapInner('<div class="post-content" />');
				//save_entry_content['the_content'] = $('.post-content');
				$('.post-content').hide();
			}
			
		}
	}

	function addContentToPage(response) {
		var tempContent = dhpSettings['views']['post-view-content'];
		var tempTitle = dhpSettings['views']['post-view-title'];
		entry_html = $('<div class="new-content"/>');
		$('.entrytext').append(entry_html);

		if(tempTitle=='the_title') {
			$('.post-title').append(save_entry_content['the_title']);
		}
		else {
			var titleCF = getCField(tempTitle);
			$('.post-title').append(response[titleCF]);
		}
		

		if(tempContent) {
			_.map(tempContent, function(val,key){
				var tempCF = getCField(val);
				console.log(response[tempCF])
				var tempResponse = $("<div/>").html(response[tempCF]);
				var tempResponseText = $("<div/>").html(response[tempCF]).text();


				if (tempCF=='the_content') {
					$('.post-content').show();
					//tempResponse = $('.post-content').remove();
					
				}

				if (val=='Thumbnail Right') {
					$(entry_html).append('<p class="thumb-right"><img src="'+tempResponseText+'" /></p>');
				}
				else if (val=='Thumbnail Left') {
					$(entry_html).append('<p class="thumb-left"><img src="'+tempResponseText+'" /></p>');
				}
				else {
					if(response[tempCF]) {
						$(entry_html).append('<h3>'+val+'</h3>');
						//console.log(response[tempCF])
						$(entry_html).append(tempResponse);
					}
					
				}

			});
		}

	}

	function getCField(moteName) {
		var tempSettings = dhpSettings['motes'];
		var tempCF ='';

		_.map(tempSettings, function(val,key){
			if(val['name']==moteName) {
				tempCF = val['custom-fields'];
			}
		});
		return tempCF;
	}

	function loadMeta(postID,field_names){
	    jQuery.ajax({
	        type: 'POST',
	        url: ajax_url,
	        data: {
	            action: 'dhpGetMoteContent',
	            post: postID,
	            fields: field_names
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