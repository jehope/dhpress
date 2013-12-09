// PURPOSE: Handle editing fields of Marker on admin panel
//			Loaded by add_dhp_marker_admin_scripts() in dhp-marker-functions.php
// ASSUMES: dhpData is used to pass parameters to this function via wp_localize_script()
//			ID of dhp_marker_project is set to Project ID for this Marker
//			ID of this Marker post itself is set in hidden input whose ID is post_ID
//			dhp_marker_settings_meta_box is the topmost "metabox" titled "Marker Settings"
//			custom-field-editor is the HTML div class that contains edit option list & editable value
//			postcustom is the HTML div class for custom fields for Markers in this Project (titled "Custom Fields")
//
// NOTES:   AJAX works by invoking wp_ajax_ code in dhp-marker-functions.php
// USES:    jQuery, Underscore

jQuery(document).ready(function($) {

	var markerObject;
	var ajax_url = dhpDataLib.ajax_url;
	//move marker settings above content box
	//$('#dhp_marker_settings_meta_box').remove().insertBefore('#post-body-content #titlediv');
	//assign listeners and execute functions after settings box is moved(remove also removes listeners)
	
		// get embedded Project ID to which this Marker belongs
	var marker_project = $('.dhp_marker_project').attr('id');
		// Insert HTML code for option box to select which custom field to inspect/edit
	$('#dhp_marker_settings_meta_box .inside').append('<div class="custom-field-editor"><div class="left">Choose the field from the dropdown to add/edit.<select></select><br/><a class="add-update-meta button button-primary">Add/Update</a></div><div class="right"><textarea class="edit-custom-field"></textarea></div></div>');

	if(marker_project) {
			// Create custom edit fields appropriate to the Project to which this Marker belongs
		getProjectSettings(marker_project);
			// For each option under Project, select it if it indicates this project
		// _.each($('#marker_project_id option'), function(option){
		// 	if(marker_project == option.value)
		// 		$(option).prop('selected','selected');
		// });
	}

		// Reload project-specific fields if Marker is associated with a different Project
	// $('select#marker_project_id').bind('change',function(){
	// 	//console.log('here'+$('#marker_project_id option:selected').val());
	// 	getProjectSettings($('#marker_project_id option:selected').val());
	// });

		// If user clicks on Add/Update button, save field to WP DB via AJAX
	$('.add-update-meta').on('click',function() {
		var fieldName = $('.custom-field-editor option:selected').val();
		var fieldValue = $('.edit-custom-field').val();

		dhpAddUpdateMetaField(fieldName,fieldValue);
	});

	// function displayTranscript(dhpData) {
	// 	var tempTranscript = dhpData;
	// 	var timeStamp = $('.marker-fields li#time_stamp input').val(); 
	// 	if(timeStamp) {
	// 		var stamps = timeStamp.split('-');
	// 	//console.log(stamps[0]+' '+stamps[1]);
	// 	//console.log(tempTranscript.indexOf(stamps[0])+' '+tempTranscript.indexOf(stamps[1]));
	// 		var clip = tempTranscript.slice(tempTranscript.indexOf(stamps[0])-1,tempTranscript.indexOf(stamps[1])+12);
	// 		clip = parseClip(clip);
	// 		$('#dhp_marker_settings_meta_box').append(clip);
	// 	}
	// }

	// 	// Used only by displayTranscript()
	// function parseClip(data){
	// 	var tempClip = data;
	// 	var clipArray = new Array();
	// 	var htmlClip = '<ul>';
	// 	var more = true;
	// 	var i = 0;
	// 	while(more) {
	// 		i = tempClip.indexOf('[0',i);
	// 		clipArray.push(i);
	// 		i++;
	// 		if(tempClip.indexOf('[0',i) < 0) {
	// 			more = false;
	// 		}
	// 		//shut down the while loop
	// 		if(i > 20000){ more = false; }
	// 	}
		
	// 	$(clipArray).each(function(index){
	// 		htmlClip += generateClipHtml(tempClip.slice(clipArray[index],clipArray[index+1]));
	// 	})
	// 	htmlClip += '</ul>';
		
	// 	return htmlClip;
	// } // parseClip()

	// 	// Used only by parseClip
	// function generateClipHtml(clip){
	// 	var clipHtml = '';
	// 	var timecode = clip.slice(1,12);
	// 	var clipText = clip.slice(13,clip.length);
	// 	clipHtml = '<li id="'+timecode+'" >'+clipText+'</li>';
	// 	return clipHtml;
	// }

		// PURPOSE: Build the dropdown options menu	of list of custom fields for Project ("Choose the field from the dropdown...")
	function buildMarkerSettings(dhpData){
		$('.custom-field-editor select').empty();
		if(dhpData) {
			markerObject = JSON.parse(dhpData);
			//console.log('data is loaded');
			//console.log(markerObject);
			
			var custom_fields ='';
			if(markerObject['project-details']['marker-custom-fields']) {
				custom_fields = markerObject['project-details']['marker-custom-fields'];
			}
			var optionHtml;

			_.each(custom_fields, function(option){
				//console.log(option)
				optionHtml += '<option value="'+option+'">'+option+'</option>';
			});
				// Now that we have list of values, insert it into HTML
			$('.custom-field-editor select').append(optionHtml);
				//update the project_id field or create it if it is a new marker
			dhpAddUpdateMetaField('project_id',markerObject['project-details']['id']);
				// set value of edit field to Project ID
			$('.edit-custom-field').append(markerObject['project-details']['id']);

				// Bind code to display value for whatever value is selected in dropdown options
			$('.custom-field-editor select').bind('change',function(){
				displayMetaValue($('.custom-field-editor select option:selected').val());
			});
		} else {
			$('#dhp_marker_settings_meta_box .inside').append('<div>Project has no settings. Please setup on project page.</div>');
		}
	}

		// PURPOSE: Given the name of a custom field chosen in dropdown options, copy the value
		//			from the value in the Custom Fields box
		// NOTES:   The matching field will have an ID in the form "meta[fieldID][key]"; we need to extract the
		//			number from that, and use it to match the ID "meta[fieldID][value]"
	function displayMetaValue(optionName){
			// clear it out initially
		$('.edit-custom-field').empty();
			// Go through the divs in the Custom Field section and look for value there (stop at first)
		_.find($('#the-list .left input:text'),function(option){
				// Does this have the same name?
			var match = (optionName === option.value);
					// If match, copy value from Custom Field to edit box
			if(match) {
					// extract number with RegExp
				var re=/meta\[(\d+)\]\[key\]/;
				re.exec(option.id);
				var valID = 'meta[' + RegExp.$1 + '][value]';
				var element = document.getElementById(valID);
				$('.edit-custom-field').append(element.value);
			}
			return match;
		});
	}

		// PURPOSE: Look through the motes in the Object representing the current Marker
	// function findMoteToDelete(moteID){
	// 	//console.log('delete: '+moteID);
	// 	var countMotes = Object.keys(markerObject.motes).length; 
	// 	for(i=0;i<countMotes;i++) {
	// 		if(moteID==markerObject.motes[i].id) {
	// 			delete markerObject.motes[i];
	// 			//console.log('delete: '+moteID);
	// 		}
	// 	}
	// }

		// Create a HTML element name from the text
	// function createIDFromName(name){
	// 	//console.log(name);
	// 	var nameID = name.toLowerCase();
	// 		nameID = nameID.trim();
	//     	nameID = nameID.replace(" ","_");
	//     return nameID;
	// }

	// function startDate(datest) {
	// 	var dateS = new Date(datest, '0', '1' );
	// 	var curr_date = dateS.getDate();
	//     var curr_month = dateS.getMonth() + 1; //Months are zero based
	//     var curr_year = dateS.getFullYear();
	//     var dateString = curr_month+'/'+curr_date+'/'+curr_year;
	// 	return dateString;
	// }

	// function endDate(datee) {
	// 	var dateE = new Date(datee, '11', '31' );
	// 	var curr_date = dateE.getDate();
	//     var curr_month = dateE.getMonth() + 1; //Months are zero based
	//     var curr_year = dateE.getFullYear();
	//     var dateString = curr_month+'/'+curr_date+'/'+curr_year;
	// 	return dateString;
	// }

	//Add new mote for marker with options
	// function addMoteLine(){
	// 	var moteHtml = '<li id="new-mote" class="motes"><input class="new-mote" id="" type="text" value="Mote Name" /> <input class="mote-value" /><a class="delete-mote">X</a></li>';
		
	// 	$('.marker-fields').append(moteHtml);
	// 	assignIdListener($('.new-mote'));
	// }

	// function assignIdListener(obj) {
	// 	//setup before functions
	//     var typingTimer;                //timer identifier
	//     var doneTypingInterval = 1000;  //time in ms, 5 second for example

	//     //on keyup, start the countdown
	//     $(this).keyup(function(){
	//         typingTimer = setTimeout(updateMoteID, doneTypingInterval);
	//     });

	//     //on keydown, clear the countdown 
	//     $(this).keydown(function(){
	//         clearTimeout(typingTimer);
	//     });
	//     $('.delete-mote').click(function(){
	// 		deleteMoteMeta($(this).closest('li').attr('id'));
	// 		findMoteToDelete($(this).closest('li').attr('id'));
	// 		$(this).closest('li').remove();
	// 		//console.log($(this).closest('li').attr('id'));
	// 	});
	// }

	// function updateMoteID(){
	// 	$('.new-mote').closest('li').attr('id',createIDFromName($('.new-mote').val()));
	// }

	// function syncProjectMarkerFields(obj){
	// 	//loop through all fields
	// 	//spilt fields by locations,date,media and motes
	// 	var syncObject = obj;
	// 	$('ul.marker-fields li.locations').each(function(index){
			
	// 			//console.log('Locations: '+$(this).attr('id'));
	// 			//console.log(syncObject.locations[index].id);
				
	// 	});
	// 	$('ul.marker-fields li.audio').each(function(index){
	// 		if($(this).attr('id').indexOf('audio')==0) {
	// 			//console.log('Audio: '+$(this).attr('id'));
	// 		}
	// 	});
	// 	$('ul.marker-fields li.date').each(function(index){
	// 		if($(this).attr('id').indexOf('date_range')==0) {
	// 			//console.log('Date: '+$(this).attr('id'));
	// 		}
	// 	});
	// 	var countMotes = Object.keys(syncObject.motes).length; 

	// 	$('ul.marker-fields li.motes').each(function(index){
	// 		var found = false;
	// 		for(var i =0; i < countMotes; i++) {
	// 			if($(this).attr('id')==syncObject.motes[i].id) {
	// 				//console.log('found: '+syncObject.motes[index].id);
	// 				found = true;
	// 			}
	// 		}
	// 		if(found) {
	// 			//console.log('found');
	// 		}
	// 		else {
	// 			//console.log('new mote');
	// 			if($(this).find('.new-mote')){
	// 				syncObject.motes[index] = {"id": $(this).attr('id'),"name": $(this).find('.new-mote').val()};
	// 			}
	// 			else {
	// 				syncObject.motes[index] = {"id": $(this).attr('id'),"name": $(this).find('label').text()};
	// 			}
	// 		}
			
	// 	});
	// 	saveProjectSettings(syncObject);
	// }

	/*
	 * AJAX functions
	 */

	// function deleteMoteMeta(moteID){
	// 	var postID = $('.form-table').attr('id');
	// 	$.ajax({
	//             type: 'POST',
	//             url: ajax_url,
	//             dataType: 'json',
	//             data: {
	//                 action: 'dhpDeleteMoteMeta',
	//                 post_id: postID,
	//                 mote_id: moteID
	//             },
	//             success: function(data, textStatus, XMLHttpRequest){
	//                 //console.log(textStatus);
	//             },
	//             error: function(XMLHttpRequest, textStatus, errorThrown){
	//                 alert(errorThrown);
	//             }
	//     });
	// }

	function dhpAddUpdateMetaField(fieldName,fieldValue){
		var postID = $('#post_ID').val();
		//console.log(fieldName)
		//console.log(fieldValue)
		$.ajax({
	            type: 'POST',
	            url: ajax_url,
	            dataType: 'json',
	            data: {
	                action: 'dhpAddUpdateMetaField',
	                post_id: postID,
	                field_name: fieldName,
	                field_value: fieldValue
	            },
	            success: function(data, textStatus, XMLHttpRequest){
	                //console.log(textStatus);
	            },
	            error: function(XMLHttpRequest, textStatus, errorThrown){
	                alert(errorThrown);
	            }
	     });
	}

	// function saveProjectSettings(projectSettings){
	// 	var postID = $('ul.marker-fields li#marker_project input').val();
	// 	//alert(postID);
	// 	var projectData = JSON.stringify(projectSettings);
	// 	console.log(projectData);
	// 	//JSON.stringify({"layertitle":"Long Women's Movement","locations":{"0":{"id":"location0","label":"Location0","type":"latLng","display":"primary"},"1":{"id":"location1","label":"Location","type":"region","display":"text"}},"media":{"av":true,"transcript":true,"timecodes":true},"motes":{"0":{"id":"interviewee","name":"Interviewee"},"1":{"id":"concepts","name":"Concepts"},"2":{"id":"concepts","name":"Concepts "},"3":{"id":"interviewee","name":"Interviewee "},"4":{"id":"interviewer","name":"Interviewer "}},"settings":{"primary":"map","secondary":"timeline,topic"},"date":"true"});
	// 	//
	// 	$.ajax({
	//             type: 'POST',
	//             url: ajax_url,
	//             dataType: 'json',
	//             data: {
	//                 action: 'dhpUpdateProjectSettings',
	//                 project: postID,
	//                 project_settings: projectData
	//             },
	//             success: function(data, textStatus, XMLHttpRequest){
	//                 console.log(textStatus);
	//             },
	//             error: function(XMLHttpRequest, textStatus, errorThrown){
	//                 alert(errorThrown);
	//             }
	//     });
	// }

	// function saveMoteFields(postID){
	// 	var sendMotes='{';
	// 	$('ul.marker-fields .motes').each(function(index){
	// 		console.log($('ul.marker-fields .motes').length+' '+index);

	// 		var moteValue = $(this).find('.mote-value').val();
			
	// 		var moteID = $(this).find('label').text();
	// 		if(moteID=='') {
	// 			moteID = $(this).find('input').val();
	// 			console.log('new-mote');
	// 		}

	// 		sendMotes += '"'+index+'":{"id":"'+ moteID+'","value":"'+moteValue+'"}';
	// 		if(index<$('ul li.motes').length-1) {sendMotes +=',';}
	// 	});
	// 	sendMotes += '}';
	// 	var moteData = $.param(sendMotes);
	// 	$.ajax({
	//             type: 'POST',
	//             url: ajax_url,
	//             dataType: 'json',
	//             data: {
	//                 action: 'dhpAddUpdateMetaField',
	//                 post_id: postID,
	//                 motes: sendMotes
	//             },
	//             success: function(data, textStatus, XMLHttpRequest){
	//                 //$("#test-div").html('');
	//                 //$("#dhp_marker_settings_meta_box .inside").append(data);
	//                 //buildMarkerSettings(data);
	//                 console.log(textStatus);
	//             },
	//             error: function(XMLHttpRequest, textStatus, errorThrown){
	//                 alert(errorThrown);
	//             }
	//         });
	// }

	function getProjectSettings(projectID){
		$.ajax({
	            type: 'POST',
	            url: ajax_url,
	            data: {
	                action: 'dhpGetProjectSettings',
	                project: projectID,
	            },
	            success: function(data, textStatus, XMLHttpRequest){
	                //$("#test-div").html('');
	                //$("#dhp_marker_settings_meta_box .inside").append(data);
	                buildMarkerSettings(data);
	            },
	            error: function(MLHttpRequest, textStatus, errorThrown){
	                alert(errorThrown);
	            }
	    });
	}

	// function getTranscript(projectID,transcriptID){
	// 	$.ajax({
	//             type: 'POST',
	//             url: ajax_url,
	//             data: {
	//                 action: 'dhpGetTranscript',
	//                 project: projectID,
	//                 transcript: transcriptID
	//             },
	//             success: function(data, textStatus, XMLHttpRequest){
	//                 //$("#test-div").html('');
	//                 //$("#dhp_marker_settings_meta_box .inside").append(data);
	//                 displayTranscript(data);
	//             },
	//             error: function(MLHttpRequest, textStatus, errorThrown){
	//                 alert(errorThrown);
	//             }
	//     });
	// }
});