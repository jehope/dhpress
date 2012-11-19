// JavaScript Document

jQuery(document).ready(function($) {
	
	//alert('here');
	var markerObject;
	if($('#marker_project option:selected').val()!=0){
		//console.log($('#marker_project option:selected').text());
		getProjectSettings($('#marker_project option:selected').val());
		}

	$('#marker_project').change(function(){
		//console.log($('#marker_project option:selected').val());
		getProjectSettings($('#marker_project option:selected').val());
	});

	$('#diph_marker_settings_meta_box').remove().insertBefore('#post-body-content #titlediv');

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
function getTranscript(projectID,transcriptID){
	jQuery.ajax({
            type: 'POST',
            url: 'http://msc.renci.org/dev/wp-admin/admin-ajax.php',
            data: {
                action: 'diphGetTranscript',
                project: projectID,
                transcript: transcriptID
            },
            success: function(data, textStatus, XMLHttpRequest){
                //jQuery("#test-div").html('');
                //jQuery("#diph_marker_settings_meta_box .inside").append(data);
                displayTranscript(data);
            },
            error: function(MLHttpRequest, textStatus, errorThrown){
                alert(errorThrown);
            }
        });
}
function displayTranscript(diphData) {
	
	var tempTranscript = diphData;
	var timeStamp = jQuery('.marker-fields li#time_stamp input').val(); 
	var stamps = timeStamp.split('-');
	//console.log(stamps[0]+' '+stamps[1]);
	//console.log(tempTranscript.indexOf(stamps[0])+' '+tempTranscript.indexOf(stamps[1]));
	var clip = tempTranscript.slice(tempTranscript.indexOf(stamps[0])-1,tempTranscript.indexOf(stamps[1])+12);
	clip = parseClip(clip);
	jQuery('#diph_marker_settings_meta_box').append(clip);
}
function parseClip(data){
	var tempClip = data;
	var clipArray = new Array();
	var htmlClip = '<ul>';
	var more = true;
	var i = 0;
	while(more) {
		i = tempClip.indexOf('[0',i);
		clipArray.push(i);
		i++;
		if(tempClip.indexOf('[0',i) < 0) {
			more = false;
		}
		//shut down the while loop
		if(i > 20000){ more = false; }
	}
	
	jQuery(clipArray).each(function(index){
		htmlClip += generateClipHtml(tempClip.slice(clipArray[index],clipArray[index+1]));
	})
	htmlClip += '</ul>';
	
	return htmlClip;

}
function generateClipHtml(clip){
	var clipHtml = '';
	var timecode = clip.slice(1,12);
	var clipText = clip.slice(13,clip.length);
	clipHtml = '<li id="'+timecode+'" >'+clipText+'</li>';
	return clipHtml;
}
function buildMarkerSettings(diphData){
	if(diphData) {
	markerObject = JSON.parse(diphData);
	var moteHtml = '';
	var countMotes = Object.keys(markerObject.motes).length; 

	for(var i =0; i < countMotes; i++) {
		var found = false;
		jQuery('ul.marker-fields li.motes').each(function(index){
			if(jQuery(this).attr('id')==markerObject.motes[i].id) {
				//console.log('found: '+markerObject.motes[i].id);
				found = true;
			}
			//jQuery(this).after('<a class="delete-mote">X</a>');
		});
		if(found) { 
			//console.log('found');
			//jQuery(this).after('<a class="delete-mote">X</a>');
			//jQuery('ul.marker-fields li.motes input').after('<a class="delete-mote">X</a>');

		}
		else {
			//console.log('new mote');
			moteHtml += '<li id="'+markerObject.motes[i].id+'" class="motes" ><label>'+markerObject.motes[i].name+'</label> <input class="mote-value" value=""><a class="delete-mote">X</a></li>';	
		}
		
	}

	
	var count2 = 0;
	for (var k in markerObject.locations) {
		var exists = jQuery('.marker-fields li#'+markerObject.locations[count2].id);  
		//console.log('e: '+exists.length+' '+markerObject.locations[count2].id);
		if(exists.length==0) {
		moteHtml += '<li class="motes" id="'+markerObject.locations[count2].id+'"><label>'+markerObject.locations[count2].label+'</label> <input type="text" value=""></li>';
		}
		else {
			jQuery(exists).append('<span>'+markerObject.locations[count2].type+'</span> <span>'+markerObject.locations[count2].display+'</span>');
		}
		
		++count2; 
	}
	if(markerObject.date && markerObject.date=='true') {

		var dateModel = jQuery('.marker-fields li#date_range input').val();
		//console.log(dateModel);
		var approx = '';
		if(dateModel.indexOf('-')>-1){
			var dateArray = dateModel.split('-');
			var dateStart = startDate(dateArray[0]);
			var dateEnd = endDate(dateArray[1]);

		}
		if(dateModel.indexOf('~')>-1){
			var dateArray = dateModel.split('~');
			var dateStart = startDate(dateArray[0]);
			var dateEnd = endDate(dateArray[1]);
			approx = 'Approximate';
		}


		jQuery('.marker-fields li#date_range').append(dateStart+' '+dateEnd+' '+approx);
	}
	if(markerObject.media) {
		if(markerObject.media.av){
			var exists = jQuery('.marker-fields li#audio_url');
		}
	}

	jQuery('#diph_marker_settings_meta_box .marker-fields').append(moteHtml);
	jQuery('#diph_marker_settings_meta_box .inside').append('<a class="add-mote button-primary">Add Mote</a>');
	jQuery('#diph_marker_settings_meta_box .inside').append('<a class="save-motes button-primary">Save</a>');
	jQuery('.add-mote').click(function(){
		addMoteLine();
	});
	jQuery('.save-motes').click(function(){
		saveMoteFields(jQuery('#diph_marker_settings_meta_box .form-table').attr('id'));
		syncProjectMarkerFields(markerObject);
	});
		
	jQuery('.delete-mote').click(function(){
		console.log('this'+jQuery(this).find('label').text());
		var dID = jQuery(this).closest('li').attr('id');
		console.log('that'+jQuery('#'+dID).find('label').text());
		deleteMoteMeta(jQuery('#'+dID).find('label').text());
		findMoteToDelete(dID);
		jQuery(this).closest('li').remove();
		

	});
	var interviewee = 'transcript_'+createIDFromName(jQuery('.marker-fields li#interviewee input').val());
	getTranscript('4233',interviewee);
}
else {
	jQuery('#diph_marker_settings_meta_box .inside').append('<div>Project has no settings. Please setup on project page.</div>');
}
}
function findMoteToDelete(moteID){
	console.log('delete: '+moteID);
	var countMotes = Object.keys(markerObject.motes).length; 
	for(i=0;i<countMotes;i++) {
		if(moteID==markerObject.motes[i].id) {
			delete markerObject.motes[i];
			console.log('delete: '+moteID);
		}
	}
	
}
function createIDFromName(name){
	//console.log(name);
	var nameID = name.toLowerCase();
		nameID = nameID.trim();
    	nameID = nameID.replace(" ","_");
    
    return nameID;
}	
function startDate(datest) {
	var dateS = new Date(datest, '0', '1' );
	var curr_date = dateS.getDate();
    var curr_month = dateS.getMonth() + 1; //Months are zero based
    var curr_year = dateS.getFullYear();
    var dateString = curr_month+'/'+curr_date+'/'+curr_year;
	return dateString;
}
function endDate(datee) {
	var dateE = new Date(datee, '11', '31' );
	var curr_date = dateE.getDate();
    var curr_month = dateE.getMonth() + 1; //Months are zero based
    var curr_year = dateE.getFullYear();
    var dateString = curr_month+'/'+curr_date+'/'+curr_year;
	return dateString;
}
//Add new mote for marker with options
function addMoteLine(){
	
	
	var moteHtml = '<li id="new-mote" class="motes"><input class="new-mote" id="" type="text" value="Mote Name" /> <input class="mote-value" /><a class="delete-mote">X</a></li>';
	
	jQuery('.marker-fields').append(moteHtml);
	assignIdListener(jQuery('.new-mote'));
}
function assignIdListener(obj) {
	//setup before functions
    var typingTimer;                //timer identifier
    var doneTypingInterval = 1000;  //time in ms, 5 second for example

    //on keyup, start the countdown
    jQuery(this).keyup(function(){
        typingTimer = setTimeout(updateMoteID, doneTypingInterval);
    });

    //on keydown, clear the countdown 
    jQuery(this).keydown(function(){
        clearTimeout(typingTimer);
    });
    jQuery('.delete-mote').click(function(){
		deleteMoteMeta(jQuery(this).closest('li').attr('id'));
		findMoteToDelete(jQuery(this).closest('li').attr('id'));
		jQuery(this).closest('li').remove();
		console.log(jQuery(this).closest('li').attr('id'));
	});
}
function updateMoteID(){

	jQuery('.new-mote').closest('li').attr('id',createIDFromName(jQuery('.new-mote').val()));
}
function syncProjectMarkerFields(obj){
	//loop through all fields
	//spilt fields by locations,date,media and motes
	var syncObject = obj;
	jQuery('ul.marker-fields li.locations').each(function(index){
		
			//console.log('Locations: '+jQuery(this).attr('id'));
			//console.log(syncObject.locations[index].id);
			
	});
	jQuery('ul.marker-fields li.audio').each(function(index){
		if(jQuery(this).attr('id').indexOf('audio')==0) {
			//console.log('Audio: '+jQuery(this).attr('id'));
		}
	});
	jQuery('ul.marker-fields li.date').each(function(index){
		if(jQuery(this).attr('id').indexOf('date_range')==0) {
			//console.log('Date: '+jQuery(this).attr('id'));
		}
	});
	var countMotes = Object.keys(syncObject.motes).length; 

	jQuery('ul.marker-fields li.motes').each(function(index){
		var found = false;
		for(var i =0; i < countMotes; i++) {
			if(jQuery(this).attr('id')==syncObject.motes[i].id) {
				//console.log('found: '+syncObject.motes[index].id);
				found = true;
			}
		}
		if(found) {
			//console.log('found');
		}
		else {
			//console.log('new mote');
			if(jQuery(this).find('.new-mote')){
				syncObject.motes[index] = {"id": jQuery(this).attr('id'),"name": jQuery(this).find('.new-mote').val()};
			}
			else {
				syncObject.motes[index] = {"id": jQuery(this).attr('id'),"name": jQuery(this).find('label').text()};
			}
		}
		
	});
	saveProjectSettings(syncObject);
}
function deleteMoteMeta(moteID){
	var postID = jQuery('.form-table').attr('id');
	jQuery.ajax({
            type: 'POST',
            url: 'http://msc.renci.org/dev/wp-admin/admin-ajax.php',
            dataType: 'json',
            data: {
                action: 'diphDeleteMoteMeta',
                post_id: postID,
                mote_id: moteID
            },
            success: function(data, textStatus, XMLHttpRequest){
                console.log(textStatus);
            },
            error: function(XMLHttpRequest, textStatus, errorThrown){
                alert(errorThrown);
            }
        });
}
function saveProjectSettings(projectSettings){
	
	var postID = jQuery('ul.marker-fields li#marker_project input').val();
	//alert(postID);
	var projectData = JSON.stringify(projectSettings);
	console.log(projectData);
	//JSON.stringify({"layertitle":"Long Women's Movement","locations":{"0":{"id":"location0","label":"Location0","type":"latLng","display":"primary"},"1":{"id":"location1","label":"Location","type":"region","display":"text"}},"media":{"av":true,"transcript":true,"timecodes":true},"motes":{"0":{"id":"interviewee","name":"Interviewee"},"1":{"id":"concepts","name":"Concepts"},"2":{"id":"concepts","name":"Concepts "},"3":{"id":"interviewee","name":"Interviewee "},"4":{"id":"interviewer","name":"Interviewer "}},"settings":{"primary":"map","secondary":"timeline,topic"},"date":"true"});
	//
	jQuery.ajax({
            type: 'POST',
            url: 'http://msc.renci.org/dev/wp-admin/admin-ajax.php',
            dataType: 'json',
            data: {
                action: 'diphUpdateProjectSettings',
                project: postID,
                project_settings: projectData
            },
            success: function(data, textStatus, XMLHttpRequest){
                console.log(textStatus);
            },
            error: function(XMLHttpRequest, textStatus, errorThrown){
                alert(errorThrown);
            }
        });
}
function saveMoteFields(postID){
	var sendMotes='{';
	jQuery('ul.marker-fields .motes').each(function(index){
		console.log(jQuery('ul.marker-fields .motes').length+' '+index);

		var moteValue = jQuery(this).find('.mote-value').val();
		
		var moteID = jQuery(this).find('label').text();
		if(moteID=='') {
			moteID = jQuery(this).find('input').val();
			console.log('new-mote');
		}

		sendMotes += '"'+index+'":{"id":"'+ moteID+'","value":"'+moteValue+'"}';
		if(index<jQuery('ul li.motes').length-1) {sendMotes +=',';}
	});
	sendMotes += '}';
	var moteData = jQuery.param(sendMotes);
	jQuery.ajax({
            type: 'POST',
            url: 'http://msc.renci.org/dev/wp-admin/admin-ajax.php',
            dataType: 'json',
            data: {
                action: 'diphAddUpdateMetaField',
                post_id: postID,
                motes: sendMotes
            },
            success: function(data, textStatus, XMLHttpRequest){
                //jQuery("#test-div").html('');
                //jQuery("#diph_marker_settings_meta_box .inside").append(data);
                //buildMarkerSettings(data);
                console.log(textStatus);
            },
            error: function(XMLHttpRequest, textStatus, errorThrown){
                alert(errorThrown);
            }
        });
}
