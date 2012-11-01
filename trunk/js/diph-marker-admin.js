// JavaScript Document

jQuery(document).ready(function($) {
	
	//alert('here');
	
	if($('#marker_project option:selected').val()!=0){
		console.log($('#marker_project option:selected').text());
		}

	$('#marker_project').change(function(){
		console.log($('#marker_project option:selected').val());
		getProjectSettings($('#marker_project option:selected').val());
	});

});

function getProjectSettings(projectID){
	jQuery.ajax({
            type: 'POST',
            url: 'http://msc.renci.org/dev/wp-admin/admin-ajax.php',
            data: {
                action: 'diphGetProjectSettings',
                project: projectID,
            },
            success: function(data, textStatus, XMLHttpRequest){
                //jQuery("#test-div").html('');
                //jQuery("#diph_marker_settings_meta_box .inside").append(data);
                buildMarkerSettings(data);
            },
            error: function(MLHttpRequest, textStatus, errorThrown){
                alert(errorThrown);
            }
        });
}

function buildMarkerSettings(diphData){
	var markerObject = eval(diphData);
	var moteHtml = '<ul class="motes" id="'+jQuery('#diph_marker_settings_meta_box .form-table').attr('id')+'">';
	var count = 0;
	for (var k in markerObject.motes) {        

		moteHtml += '<li class="'+markerObject.motes[count].id+'">'+markerObject.motes[count].name+' <input type="text" value=""></li>';
		console.log(markerObject.motes[count].id);
		++count; 
	}
	moteHtml += '</ul>'
	console.log(moteHtml);
	
	console.log(markerObject.motes);
	jQuery('#diph_marker_settings_meta_box .inside').append(moteHtml);
	jQuery('#diph_marker_settings_meta_box .inside').append('<h3 class="save-motes">Save</h3>');
	jQuery('.save-motes').click(function(){
		saveMoteFields(jQuery('#diph_marker_settings_meta_box .form-table').attr('id'));
	})
}
function saveMoteFields(postID){
	var sendMotes='{';
	jQuery('ul.motes li').each(function(){
		sendMotes += 'id:'+ jQuery(this).attr('class')+',value:'+jQuery(this).find('input').val()+',';
	});
	sendMotes += '}';
	jQuery.ajax({
            type: 'POST',
            url: 'http://msc.renci.org/dev/wp-admin/admin-ajax.php',
            data: {
                action: 'diphAddUpdateMetaField',
                post_id: postID,
                motes: sendMotes
            },
            success: function(data, textStatus, XMLHttpRequest){
                //jQuery("#test-div").html('');
                //jQuery("#diph_marker_settings_meta_box .inside").append(data);
                //buildMarkerSettings(data);
                console.log('success');
            },
            error: function(MLHttpRequest, textStatus, errorThrown){
                alert(errorThrown);
            }
        });
}
