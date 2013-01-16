// JavaScript Document

jQuery(document).ready(function($) {
	
	//alert('here');
	
	$('.wrap h2').after('<div id="marker-tabs"><h3>Tabs</h3></div>');
	
	
	
    var pID = jQuery('#post_ID').val();
	var urlregexp = new RegExp("'(.*)'");

	jQuery('#marker-tabs h3').click(function() {
	 formfield = jQuery('#squeeze_video_rawsrc').attr('name');
        window.send_to_editor = function (html) {
            var videourl = html.match(urlregexp)[1];
            jQuery('#squeeze_video_rawsrc').val(videourl);
            tb_remove();
        }
	 //tb_show('Test', 'media-upload.php?type=image&tab=library&TB_iframe=true');
	 //tb_show('Pick Map', 'admin.php?page=map-library&TB_iframe=0');
	 tb_show('Map Picker', 'admin-ajax.php?action=getTheContent&query_var1=valu1&query_var2=value2' ); 
	 return false;
	});


});