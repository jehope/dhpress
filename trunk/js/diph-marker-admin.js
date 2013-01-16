// JavaScript Document

jQuery(document).ready(function($) {
	

	var markerObject;
	
	//move marker settings above content box
	$('#diph_marker_settings_meta_box').remove().insertBefore('#post-body-content #titlediv');
	//assign listeners and execute functions after settings box is moved(remove also removes listeners)
	if($('#marker_project_id option:selected').val()!=0){
		console.log($('#marker_project_id option:selected').text());
		getProjectSettings($('#marker_project_id option:selected').val());
	}

	$('select#marker_project_id').bind('change',function(){
		console.log('here'+$('#marker_project_id option:selected').val());
		getProjectSettings($('#marker_project_id option:selected').val());
	});
	

function displayTranscript(diphData) {
	
	var tempTranscript = diphData;
	var timeStamp = $('.marker-fields li#time_stamp input').val(); 
	if(timeStamp) {
		var stamps = timeStamp.split('-');
	//console.log(stamps[0]+' '+stamps[1]);
	//console.log(tempTranscript.indexOf(stamps[0])+' '+tempTranscript.indexOf(stamps[1]));
		var clip = tempTranscript.slice(tempTranscript.indexOf(stamps[0])-1,tempTranscript.indexOf(stamps[1])+12);
		clip = parseClip(clip);
		$('#diph_marker_settings_meta_box').append(clip);
	}
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
	
	$(clipArray).each(function(index){
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
	console.log('data is loaded');
	var moteHtml = '';
	var countMotes = Object.keys(markerObject.motes).length; 

	for(var i =0; i < countMotes; i++) {
		var found = false;
		$('ul.marker-fields li.motes').each(function(index){
			if($(this).attr('id')==markerObject.motes[i].id) {
				//console.log('found: '+markerObject.motes[i].id);
				found = true;
			}
			//$(this).after('<a class="delete-mote">X</a>');
		});
		if(found) { 
			//console.log('found');
			//$(this).after('<a class="delete-mote">X</a>');
			//$('ul.marker-fields li.motes input').after('<a class="delete-mote">X</a>');

		}
		else {
			//console.log('new mote');
			moteHtml += '<li id="'+markerObject.motes[i].id+'" class="motes" ><label>'+markerObject.motes[i].name+'</label> <input class="mote-value" value=""><a class="delete-mote">X</a></li>';	
		}
		
	}

	
	var count2 = 0;
	for (var k in markerObject.locations) {
		var exists = $('.marker-fields li#'+markerObject.locations[count2].id);  
		//console.log('e: '+exists.length+' '+markerObject.locations[count2].id);
		if(exists.length==0) {
		moteHtml += '<li id="'+markerObject.locations[count2].id+'"><label>'+markerObject.locations[count2].label+'</label> <input type="text" value=""></li>';
		}
		else {
			$(exists).append('<span>'+markerObject.locations[count2].type+'</span> <span>'+markerObject.locations[count2].display+'</span>');
		}
		
		++count2; 
	}
	if(markerObject.date && markerObject.date=='true') {

		var dateModel = $('.marker-fields li#date_range input').val();
		//console.log(dateModel);
		var approx = '';
		if(dateModel&&dateModel.indexOf('-')>-1){
			var dateArray = dateModel.split('-');
			var dateStart = startDate(dateArray[0]);
			var dateEnd = endDate(dateArray[1]);

		}
		if(dateModel&&dateModel.indexOf('~')>-1){
			var dateArray = dateModel.split('~');
			var dateStart = startDate(dateArray[0]);
			var dateEnd = endDate(dateArray[1]);
			approx = 'Approximate';
		}


		$('.marker-fields li#date_range').append(dateStart+' '+dateEnd+' '+approx);
	}
	if(markerObject.media) {
		if(markerObject.media.av){
			var exists = $('.marker-fields li#audio_url');
		}
	}

	$('#diph_marker_settings_meta_box .marker-fields').append(moteHtml);
	$('#diph_marker_settings_meta_box .inside').append('<a class="add-mote button-primary">Add Mote</a>');
	$('#diph_marker_settings_meta_box .inside').append('<a class="save-motes button-primary">Save</a>');
	$('.add-mote').click(function(){
		addMoteLine();
	});
	$('.save-motes').click(function(){
		saveMoteFields($('#diph_marker_settings_meta_box .form-table').attr('id'));
		syncProjectMarkerFields(markerObject);
	});
		
	$('.delete-mote').click(function(){
		console.log('this'+$(this).find('label').text());
		var dID = $(this).closest('li').attr('id');
		console.log('that'+$('#'+dID).find('label').text());
		deleteMoteMeta($('#'+dID).find('label').text());
		findMoteToDelete(dID);
		$(this).closest('li').remove();
		

	});
	var interviewee = 'transcript_'+createIDFromName($('.marker-fields li#interviewee input').val());
	getTranscript('4233',interviewee);
}
else {
	$('#diph_marker_settings_meta_box .inside').append('<div>Project has no settings. Please setup on project page.</div>');
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
	
	$('.marker-fields').append(moteHtml);
	assignIdListener($('.new-mote'));
}
function assignIdListener(obj) {
	//setup before functions
    var typingTimer;                //timer identifier
    var doneTypingInterval = 1000;  //time in ms, 5 second for example

    //on keyup, start the countdown
    $(this).keyup(function(){
        typingTimer = setTimeout(updateMoteID, doneTypingInterval);
    });

    //on keydown, clear the countdown 
    $(this).keydown(function(){
        clearTimeout(typingTimer);
    });
    $('.delete-mote').click(function(){
		deleteMoteMeta($(this).closest('li').attr('id'));
		findMoteToDelete($(this).closest('li').attr('id'));
		$(this).closest('li').remove();
		console.log($(this).closest('li').attr('id'));
	});
}
function updateMoteID(){

	$('.new-mote').closest('li').attr('id',createIDFromName($('.new-mote').val()));
}
function syncProjectMarkerFields(obj){
	//loop through all fields
	//spilt fields by locations,date,media and motes
	var syncObject = obj;
	$('ul.marker-fields li.locations').each(function(index){
		
			//console.log('Locations: '+$(this).attr('id'));
			//console.log(syncObject.locations[index].id);
			
	});
	$('ul.marker-fields li.audio').each(function(index){
		if($(this).attr('id').indexOf('audio')==0) {
			//console.log('Audio: '+$(this).attr('id'));
		}
	});
	$('ul.marker-fields li.date').each(function(index){
		if($(this).attr('id').indexOf('date_range')==0) {
			//console.log('Date: '+$(this).attr('id'));
		}
	});
	var countMotes = Object.keys(syncObject.motes).length; 

	$('ul.marker-fields li.motes').each(function(index){
		var found = false;
		for(var i =0; i < countMotes; i++) {
			if($(this).attr('id')==syncObject.motes[i].id) {
				//console.log('found: '+syncObject.motes[index].id);
				found = true;
			}
		}
		if(found) {
			//console.log('found');
		}
		else {
			//console.log('new mote');
			if($(this).find('.new-mote')){
				syncObject.motes[index] = {"id": $(this).attr('id'),"name": $(this).find('.new-mote').val()};
			}
			else {
				syncObject.motes[index] = {"id": $(this).attr('id'),"name": $(this).find('label').text()};
			}
		}
		
	});
	saveProjectSettings(syncObject);
}
/*
 * AJAX functions
 */

function deleteMoteMeta(moteID){
	var postID = $('.form-table').attr('id');
	$.ajax({
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
	
	var postID = $('ul.marker-fields li#marker_project input').val();
	//alert(postID);
	var projectData = JSON.stringify(projectSettings);
	console.log(projectData);
	//JSON.stringify({"layertitle":"Long Women's Movement","locations":{"0":{"id":"location0","label":"Location0","type":"latLng","display":"primary"},"1":{"id":"location1","label":"Location","type":"region","display":"text"}},"media":{"av":true,"transcript":true,"timecodes":true},"motes":{"0":{"id":"interviewee","name":"Interviewee"},"1":{"id":"concepts","name":"Concepts"},"2":{"id":"concepts","name":"Concepts "},"3":{"id":"interviewee","name":"Interviewee "},"4":{"id":"interviewer","name":"Interviewer "}},"settings":{"primary":"map","secondary":"timeline,topic"},"date":"true"});
	//
	$.ajax({
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
	$('ul.marker-fields .motes').each(function(index){
		console.log($('ul.marker-fields .motes').length+' '+index);

		var moteValue = $(this).find('.mote-value').val();
		
		var moteID = $(this).find('label').text();
		if(moteID=='') {
			moteID = $(this).find('input').val();
			console.log('new-mote');
		}

		sendMotes += '"'+index+'":{"id":"'+ moteID+'","value":"'+moteValue+'"}';
		if(index<$('ul li.motes').length-1) {sendMotes +=',';}
	});
	sendMotes += '}';
	var moteData = $.param(sendMotes);
	$.ajax({
            type: 'POST',
            url: 'http://msc.renci.org/dev/wp-admin/admin-ajax.php',
            dataType: 'json',
            data: {
                action: 'diphAddUpdateMetaField',
                post_id: postID,
                motes: sendMotes
            },
            success: function(data, textStatus, XMLHttpRequest){
                //$("#test-div").html('');
                //$("#diph_marker_settings_meta_box .inside").append(data);
                //buildMarkerSettings(data);
                console.log(textStatus);
            },
            error: function(XMLHttpRequest, textStatus, errorThrown){
                alert(errorThrown);
            }
        });
}
function getProjectSettings(projectID){
	$.ajax({
            type: 'POST',
            url: 'http://msc.renci.org/dev/wp-admin/admin-ajax.php',
            data: {
                action: 'diphGetProjectSettings',
                project: projectID,
            },
            success: function(data, textStatus, XMLHttpRequest){
                //$("#test-div").html('');
                //$("#diph_marker_settings_meta_box .inside").append(data);
                buildMarkerSettings(data);
            },
            error: function(MLHttpRequest, textStatus, errorThrown){
                alert(errorThrown);
            }
        });
}
function getTranscript(projectID,transcriptID){
	$.ajax({
            type: 'POST',
            url: 'http://msc.renci.org/dev/wp-admin/admin-ajax.php',
            data: {
                action: 'diphGetTranscript',
                project: projectID,
                transcript: transcriptID
            },
            success: function(data, textStatus, XMLHttpRequest){
                //$("#test-div").html('');
                //$("#diph_marker_settings_meta_box .inside").append(data);
                displayTranscript(data);
            },
            error: function(MLHttpRequest, textStatus, errorThrown){
                alert(errorThrown);
            }
        });
}
});