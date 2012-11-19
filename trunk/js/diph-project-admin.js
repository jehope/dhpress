// JavaScript Document


//jQuery noconfilct wrapper fires when page has loaded
jQuery(document).ready(function($) {

    

var projectObj = new Object();


//Assign listener to icons loaded by php
$('.diph_icon').click(function() {
	if($(this).hasClass('selected')==false){
		var imgs = $(this).find('img').attr('src');
		$('#icon-cats ul').append('<li id="' + $(this).attr('id') + '"><img src="'+ imgs + '"/><input type="text" id="icons_' + $(this).attr('id') + '"/><span class="remove">X</span></li>');
		$(this).toggleClass('selected');
		assignListeners(this);
	}		
});


loadSelectedIcons($('#project_icons').val());

$('#normal-sortables').prepend('<div id="diph_entry_points" class="postbox "><div class="handlediv" title="Click to toggle"><br /></div><h3 class="hndle"><span>Project Entry Points</span></h3><div class="inside entry-point"></div><div class="inside marker-attrs"></div></div>');

var entryHtml = '<h4>Choose the primary and any secondary entry points for the project.</h4>' + 
    '<div class="primary-entry">Choose Primary' + 
    '<ul><li><input type="radio" name="primary" value="map" /> Map</li>'+
    '<li><input type="radio" name="primary" value="timeline" /> Timeline</li>'+
    '<li><input type="radio" name="primary" value="topic" /> Topic Cards</li>'+
    '<li><input type="radio" name="primary" value="transcript" /> A/V Transcript</li></ul></div>';
    
entryHtml += '<div class="secondary-entry">Choose Secondary(s)'+
    '<ul><li><input type="checkbox" name="secondary" value="map" /> Map</li>'+
    '<li><input type="checkbox" name="secondary" value="timeline" /> Timeline</li>'+
    '<li><input type="checkbox" name="secondary" value="topic" /> Topic Cards</li>'+
    '<li><input type="checkbox" name="secondary" value="transcript" /> A/V Transcript</li></ul></div>';
    
entryHtml += '<div class="setup-entry"></div><div class="setup-sentry"></div>';

var defaultMarkerAttributes = '<h4>Define Marker Attributes:</h4><ul id="diph_attrs">'+
	'<li><span class="col1">Marker Layer Name: </span><input id="layer-name" type="text" /></li>'+
	'<li class="locations" id="location0"><span class="col1">Location 1: </span><input type="text" />'+locationTypeOptions()+'</li>'+
	'<li class="sep locations" id="location1"><span class="col1">Location 2: </span><input type="text"/>'+locationTypeOptions('address','alternate')+'</li>'+
	
	'<li class="sep"><span class="col1">Date/Time</span><input id="use-datetime" class="col2" type="checkbox" name="use" value="datetime" /></li>'+
	'<li ><span class="col1">Audio/Video</span><input id="media-url" class="col2" type="checkbox"  /> (media url)</li>'+
	'<li><span class="col1">Transcript</span><input id="transcript-url" class="col2" type="checkbox"  /> (transcript url)</li>'+
	'<li class="sep"><span class="col1">Timecodes</span><input id="timecodes" class="col2" type="checkbox" /></li>'+
	'<li class="extra-motes"><span class="add-layer">Add</span></li>'+
	'</ul>';

$('.entry-point').append(entryHtml);
$('.marker-attrs').append(defaultMarkerAttributes);


loadProjectSettings($('#project_settings').val());

$('#layer-name').val($('#title').val());
projectObj.layertitle = $('#title').val();
projectObj.locations = new Object();
projectObj.media = new Object();
projectObj.motes = new Object();



//Load icons that are stored in custom field
function loadSelectedIcons(loadvars){
	var n = loadvars.split(',');
	
	for (i=0;i<n.length-1;i+=3){
		var imgurl = $('#'+n[i]).find('img').attr('src');
		$('#icon-cats ul').append('<li id="'+n[i]+'"><img src="'+ imgurl +
		 '"/><input type="text" name="" id="icons_'+ n[i] +
		 '" value="'+n[i+1]+'"/><span class="remove">X</span></li>');
		
		var selIcon = '#diph_icon_cont #'+n[i];
		if($(selIcon).hasClass('selected')==false){
			$(selIcon).toggleClass('selected');
		}
		assignListeners($('#icon-cats ul #'+n[i]));
	}
	
}
function popupIcons(){
    
    tb_show('Hayti Intro', '#TB_inline?height=350&width=400&inlineId=diph_icons_box' );
    //$('#TB_window').css({'width':300});
}
//load the json that is stored in the #project_settings custom field
function loadProjectSettings(projectObject) {
	console.log(projectObject);
    if(projectObject) {
        var myObject = JSON.parse(projectObject);
        if(myObject.settings&&myObject.settings.primary) {
            $(".primary-entry input[value='"+myObject.settings.primary+"']").attr("checked", "true");
            $(".secondary-entry input[value='"+ myObject.settings.primary +"']").attr({"checked": "true","disabled":"true"}).parent().append('<span class="indy"> <strong>Primary entry</strong></span>');
        
            var second = myObject.settings.secondary.split(',');
            $(second).each(function(index){
                $(".secondary-entry input[value='"+ second[index] +"']").attr("checked", "true");
            });
        }
        else {
            $('.entry-point .secondary-entry input').attr('disabled', 'true');
        } 

        if(myObject.locations) {  
        	
        	var count = Object.keys(myObject.locations).length; 
			
			for (var ik = 0; ik < count; ik++)  {
				console.log(count+' '+ik+' '+myObject.locations[ik].label);
				$('#'+myObject.locations[ik].id).find('input').val(myObject.locations[ik].label);
				$('#'+myObject.locations[ik].id+' #location-type').val(myObject.locations[ik].type);
				$('#'+myObject.locations[ik].id+' #location-display').val(myObject.locations[ik].display);
				
			}	
			
        }
        if(myObject.motes) {  
        	
        	var moteCount = Object.keys(myObject.motes).length; 
			
			for (var i = 0; i < moteCount; i++)  {
				addMoteLine(myObject.motes[i].id,myObject.motes[i].name);				
			}	
			
        }
        if(myObject.date) {  
        	console.log('date');
     		$('#use-datetime').attr('checked','checked');
			
        }
        if(myObject.media) {  
        	
     		if(myObject.media.av) {
     			$('#media-url').prop('checked','checked');
    	//projectObj.media.av = true;
   			 }
    		if(myObject.media.transcript) {
    			
    			$('#transcript-url').prop('checked','checked');
   			}
   			if(myObject.media.timecodes) {
    			$('#timecodes').prop('checked','checked');
    		}
			
        }
    }
}
//locations:0:{label:"text",type:"latLng,address,region", display:"primary,alternate,text"}
function locationTypeOptions(selType,selDisplay){
	var locHtml = '<select id="location-type">';
	var locType = {latLng:"Lat,Lng",address:"Address",region:"Region"};
	var disType = {primary:"Primary",alternate:"Alternate",text:"Text"};
	$.each(locType, function(t,n){
		locHtml += '<option value="'+t+'"';
		if(t==selType) { locHtml += 'selected'; }
		locHtml += '>'+n+'</option>';

	})
	locHtml += '</select>';

	locHtml += '<select id="location-display">';
	$.each(disType, function(d,l){
		locHtml += '<option value="'+d+'"';
		if(d==selDisplay) { locHtml += 'selected'; }
		locHtml += '>'+l+'</option>';

	})
	locHtml += '</select>';
	return locHtml;

}
//Applies typing listeners to the new mote fields
function diphAssignMoteListeners(theobj) {
	var mote_id = '#'+$(theobj).attr('id');
	var remove_span = '#'+$(theobj).attr('id')+' .delete-mote';
	var remove_li = mote_id;
	console.log(mote_id);
	//setup before functions
    var typingTimerMote;                //timer identifier
    var moteTypingInterval = 3000;  //time in ms, 5 second for example

    //on keyup, start the countdown
    $($(theobj).find('input')).keyup(function(){
    	console.log('typing');

        typingTimerMote = setTimeout(doneTypingMote, moteTypingInterval);
    });

    //on keydown, clear the countdown 
    $($(theobj).find('input')).keydown(function(){
        clearTimeout(typingTimerMote);
    });
	
	$('.delete-mote').unbind('click');
    $('.delete-mote').click(function() {
    	console.log('remove');
        //$(mote_id).toggleClass('selected');	
        deleteMoteLine($(this).closest('li').attr('id'));
		$(this).closest('li').remove();

		doneTypingMote();
    });
    $('.legend').unbind('click');
    $('.legend').click(function() {
    	var moteName = jQuery(this).parent('li').find('input').val();
    	var projectID = jQuery('#post_ID').val();
    	diphGetMoteValues(moteName,projectID);
    	
    });
            
}

function assignListeners(theobj) {
	var remove_id = '#'+$(theobj).attr('id');
	var remove_span = '#'+$(theobj).attr('id')+' .remove';
	var remove_li = '#icon-cats '+ remove_id;
	
	//setup before functions
    var typingTimer;                //timer identifier
    var doneTypingInterval = 1000;  //time in ms, 5 second for example

    //on keyup, start the countdown
    $('#icons_'+$(theobj).attr('id')).keyup(function(){
        typingTimer = setTimeout(doneTyping, doneTypingInterval);
    });

    //on keydown, clear the countdown 
    $('#icons_'+$(theobj).attr('id')).keydown(function(){
        clearTimeout(typingTimer);
    });
	
    $(remove_span).click(function() {
        $(remove_id).toggleClass('selected');				
		$(remove_li).remove();
		doneTyping();
    });
            
}

//user is "finished typing," do something
function doneTyping() {
    //do something
    var icon_settings = '';
    $('#icon-cats ul li').each(function() {
	    icon_settings += $(this).attr('id')+','+$(this).find('input').val()+','+$(this).find('img').attr('src')+',';
    });
    $('#project_icons').val(icon_settings);
    saveProjectSettings();
    
    //alert('done typing');
}

function doneTypingMote() {
    //do something
    //var icon_settings = '';
    $('.motes').each(function() {
    	//$(this).attr('id')
    	var moteOID = $(this).attr('id');
    	var moteName = $(this).find('input').val();
    	var moteID = moteName.toLowerCase();
    	moteID = moteID.trim();
    	console.log(moteID+'done');
    	moteID = moteID.replace(" ","_");
    	projectObj.motes[moteOID] = {"id": moteID,"name": moteName};

    	
    });
    saveProjectEntry();
    createMarkerSettings();
    saveProjectSettings();
    //console.log(metaID);
}


$('.add-layer').click(function(){
    addMoteLine();
    createMarkerSettings();
	saveProjectSettings();

});
//latlng, 
function createMarkerSettings(){
 
 	$('#diph_attrs .locations').each(function(index){
 		projectObj.locations[index] = new Object();
 		projectObj.locations[index].id = $(this).attr('id');
 		projectObj.locations[index].label = $(this).find('input').val();
 		projectObj.locations[index].type = $(this).find('#location-type option:selected').val();
 		projectObj.locations[index].display = $(this).find('#location-display option:selected').val();
 		console.log($(this).attr('id'));
 		//console.log($(this).find('location-type').val());
 	});
    
    if($('#use-datetime').prop('checked')) {
    	 projectObj.date = "true";
    }

    if($('#media-url').prop('checked')) {
    	projectObj.media.av = true;
    }
    if($('#transcript-url').prop('checked')) {
    	projectObj.media.transcript = true;
    }
    if($('#timecodes').prop('checked')) {
    	projectObj.media.timecodes = true;
    }

}
function addThemes(themeID,themeName,themeType,tDate){
   projectObj.themes[themeID] = {"name": themeName,"type":themeType, "date":tDate};
}

//Add new mote for project with options
function addMoteLine(moteID,moteName){
	var tempMoteCount = $('.motes').length;
	
	if(!moteName) { moteName = '';}
	var moteHtml = '<li id="'+tempMoteCount+'" class="motes">Mote Name<br/><input id="" type="text" value="'+moteName+'" /><a class="delete-mote">X</a><input type="checkbox" name="'+moteName+'" >Use in filter <a class="legend">Create Legend</a></li>';
	
	$('.extra-motes').before(moteHtml);
	diphAssignMoteListeners($('.motes'));
}
function saveMoteLine(moteID, moteName) {
	projectObj.motes.moteID = moteName;
}
function deleteMoteLine(delMote){
	console.log(delMote);
	delete projectObj.motes[delMote];
}
$('.entry-point .primary-entry li').click(function() {
	//alert($(this).find('input').val());
	
	disableJustSelected($(this).find('input').val());
	$('.entry-point .secondary-entry').fadeIn();
});
	
$('.entry-point li').click(function(e) {
	var selArr ="";
	//alert($('.entry-point input').find(":selected").val());
	if($(e.target).closest('input[type="checkbox"]').length > 0){
                //Chechbox clicked
    }
    else {        	
	    $(this).find('input:radio').attr('checked', 'true');
		var $checkbox = $(this).find(':checkbox').not(':disabled');
        $checkbox.attr('checked', !$checkbox.attr('checked'));
    }
	$('.secondary-entry input:checked').not(':disabled').each(function () {
		if(selArr=='') { selArr += this.value; }
		else { selArr += ','+this.value; }	
	});
		
	var primaryE = $('.primary-entry input:checked').val();
	loadPrimaryEntry(primaryE);
	//loadProjectObject(primaryE,selArr);
	createMarkerSettings();
	doneTypingMote();
} );

function saveProjectEntry(){
	var secondaryE ='';
	$('.secondary-entry input:checked').not(':disabled').each(function () {
		if(secondaryE=='') { secondaryE += this.value; }
		else { secondaryE += ','+this.value; }	
	});
		
	var primaryE = $('.primary-entry input:checked').val();
	//alert('show '+ selArr);	
	loadProjectObject(primaryE,secondaryE);
}

function loadProjectObject(prim,second) {
    projectObj.settings = new Object();
    projectObj.settings.primary = prim;
    projectObj.settings.secondary = second;
    //$('.setup-entry').append(JSON.stringify(projectObj));
}

function loadPrimaryEntry(pEntry) {
	$('.setup-entry').empty();
	
	if(pEntry == 'map') {
		$('.setup-entry').append('<div><h4>Primary Entry Point: Map</h4><p>Map Settings</p></div>');
		
		if($('#map-divs').find('#map-div').length>0) { }
		else {
			//$('#map-divs').append('<div id="map-div"></div>');
			//initFirstMap();
		}
	}
	if(pEntry == 'timeline') {
		$('.setup-entry').append('<div><h4>Primary Entry Point: Timeline</h4><p>Timeline Settings</p></div>');
	}
	if(pEntry == 'transcript') {
		$('.setup-entry').append('<div><h4>Primary Entry Point: A/V Transcript</h4><p>Transcript Settings</p></div>');
	}
	if(pEntry == 'topic') {
		$('.setup-entry').append('<div><h4>Primary Entry Point: Topic Cards</h4><p>Topic Settings</p></div>');
	}
	//$('.setup-entry').append(pEntry);
}

function disableJustSelected(token) {
	//alert(token);
	$('.entry-point .secondary-entry input').each(function(index) {		
		if(this.value==token) {
			//alert(token+" "+this.value);
			$(this).attr('checked', 'true');
			$(this).attr('disabled', 'true');
			if($(this).parent().find('span').hasClass('indy')){}
			else {
			$(this).parent().append('<span class="indy"> <strong>Primary entry</strong></span>');
			}
		}
		else {
			$(this).removeAttr('disabled');
			//$(this).removeAttr('checked');
			if($(this).parent().find('span').hasClass('indy')){
				$(this).parent().find('span').remove('.indy');
				}			
		}
	});
}

function saveProjectSettings()	{
	$('#project_settings').val(JSON.stringify(projectObj));
}

//AJAX functions
function diphGetMoteValues(moteName,projectID) {

	jQuery.ajax({
        type: 'POST',
        url: 'http://msc.renci.org/dev/wp-admin/admin-ajax.php',
        data: {
            action: 'diphGetMoteValues',
            project: projectID,
            mote_name: moteName
        },
        success: function(data, textStatus, XMLHttpRequest){
            console.log(textStatus);
            console.log(JSON.parse(data));
            //

        },
        error: function(XMLHttpRequest, textStatus, errorThrown){
           alert(errorThrown);
        }
    });
}	
});