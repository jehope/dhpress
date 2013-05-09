jQuery(document).ready(function($) { 

var ajax_url = diphData.ajax_url;
diphSettings = JSON.parse(diphData.settings);
//console.log(diphSettings)
var entry_html;
var save_entry_content = new Object();


getContent(diphSettings['views']['post-view-content']);

function getContent(content) {
	var post_id = $('.post').attr('id');

	if(diphSettings['views']['post-view-title']) {
		save_entry_content['the_title'] = $('.post-title').html();
		$('.post-title').empty();
	}

	if(diphSettings['views']['post-view-content']) {
		save_entry_content['the_content'] = $('.entrytext').html();
		$('.entrytext').empty();
		loadMeta(post_id);
	}
}

function addContentToPage(response) {
	var tempContent = diphSettings['views']['post-view-content'];
	var tempTitle = diphSettings['views']['post-view-title'];
	entry_html = $('<div class="new-content"/>');	
	$('.entrytext').append(entry_html);

	if(tempTitle=='the_title') {
		$('.post-title').append(save_entry_content['the_title']);
	}
	else {
		var titleCF = getCField(tempTitle);		
		$('.post-title').append(response[titleCF]);
	}
	
	_.map(tempContent, function(val,key){
		var tempCF = getCField(val);
		var tempResponse = response[tempCF];

		if (tempCF=='the_content') {
			tempResponse = save_entry_content['the_content'];
		}

		if (val=='Thumbnail Right') {
			$(entry_html).append('<p class="thumb-right"><img src="'+tempResponse+'" /></p>');
		}
		else if (val=='Thumbnail Left') {
			$(entry_html).append('<p class="thumb-left"><img src="'+tempResponse+'" /></p>');
		}	
		else {
			$(entry_html).append('<h3>'+val+'</h3>');
			$(entry_html).append('<p>'+$("<div/>").html(tempResponse).text()+'</p>');
		}

	});
}

function getCField(moteName) {
	var tempSettings = diphSettings['motes'];
	var tempCF ='';

	_.map(tempSettings, function(val,key){
		if(val['name']==moteName.trim()) {
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
            action: 'diphGetMoteContent',
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