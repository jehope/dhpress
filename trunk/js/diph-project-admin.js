//jQuery noconfilct wrapper fires when page has loaded
jQuery(document).ready(function($) {

var ajax_url = diphDataLib.ajax_url;
var projectObj = new Object();
var postID = $('input#post_ID').val();
//console.log(diphDataLib);
var tempProjectObj;
$('#screen-meta-links a').click(function(){
  $('#screen-options-wrap').removeClass('hidden');
});
//console.log(diphDataLib.ajax_url);

//$('#hidden-layers').show();
var BASE_LAYERS = $('#hidden-layers .base-layer').map(function(){
  return $(this);
});
var OVERLAYS = $('#hidden-layers option').clone();
//console.log(BASE_LAYERS);

function pickCenterZoom(){
  //setup map to pick center and zoom

  var gg = new OpenLayers.Projection("EPSG:4326");
  var sm = new OpenLayers.Projection("EPSG:900913");
  var osm = new OpenLayers.Layer.OSM();      
  //var map = new OpenLayers.Map('set_map');
  var map = new OpenLayers.Map({
      div: "map_canvas",
      projection: sm,
      displayProjection: gg
  });
  var lonlat = new OpenLayers.LonLat(-88.52349,38.03501);
  lonlat.transform(gg, map.getProjectionObject());
  map.addLayers([osm]);
  map.setCenter(lonlat, 5);
}
//Assign listener to icons loaded by php
$('.diph_icon').click(function() {
	if($(this).hasClass('selected')==false){
		var imgs = $(this).find('img').attr('src');
		$('#icon-cats ul').append('<li id="' + $(this).attr('id') + '"><img src="'+ imgs + '"/><input type="text" id="icons_' + $(this).attr('id') + '"/><span class="remove">X</span></li>');
		$(this).toggleClass('selected');
		assignListeners(this);
	}		
});
$(window).resize(function() {
	resizeTB();
 });
$('#publish').popover({
    title:'Project requires save',
    content:'Don\'t forget to save your project(red button on the left).',
    placement:'left',
    trigger: 'manual'
  });
    
$('#publish').on('click', function(e){
  if($('#save-btn').hasClass('btn-danger')){
    //console.log('real quick')
    $('#publish').popover('show');
    e.preventDefault();
  }
});

loadSelectedIcons();


$('#add-map').click(function(){

  var mapCount  = countEntries('map') +1;
  if(mapCount==3) {
    var options = { 
      animation: true, 
      placement:'right',
      title:'Map limit reached',
      content:'Maximum of two maps are allowed currently.',
      trigger:'manual',
      delay: { show: 500, hide: 100 }
    }
    $('#map2-tab').popover(options);
    $('#map2-tab').popover('show');
    $('#map2-tab a').tab('show');
    setTimeout(function () {
      $('#map2-tab').popover('hide');
    }, 3000);
  }
  else {
    saveProjectAlert();
    epsettings = '';
    buildEntryHtml('map',epsettings);
    //show tab/content after loading
    $('#map'+mapCount+'-tab a').tab('show');

  }      
});

$('#add-timeline').click(function(){
  var timelineCount  = countEntries('timeline') +1;
  if(timelineCount==2) {
    var options = { 
      animation: true, 
      placement:'right',
      title:'Timeline limit reached',
      content:'Maximum of one timeline are allowed currently.',
      trigger:'manual',
      delay: { show: 500, hide: 100 }
    }
    $('#timeline1-tab').popover(options);
    $('#timeline1-tab').popover('show');
    $('#timeline1-tab a').tab('show');
    setTimeout(function () {
      $('#timeline1-tab').popover('hide');
    }, 3000);
  }
  else {
    saveProjectAlert();
    epsettings = '';
    buildEntryHtml('timeline',epsettings);
    //show tab/content after loading
    $('#timeline'+timelineCount+'-tab a').tab('show');
  }    
});

$('#add-transcript').click(function(){

  var transcriptCount  = countEntries('transcript') +1;
  if(transcriptCount==2) {
    var options = { 
      animation: true, 
      placement:'right',
      title:'transcript limit reached',
      content:'Maximum of one transcript are allowed currently.',
      trigger:'manual',
      delay: { show: 500, hide: 100 }
    }
    $('#transcript1-tab').popover(options);
    $('#transcript1-tab').popover('show');
    $('#transcript1-tab a').tab('show');
    setTimeout(function () {
      $('#transcript1-tab').popover('hide');
    }, 3000);
  }
  else {
    saveProjectAlert();
    epsettings = '';
    buildEntryHtml('transcript',epsettings);
    //show tab/content after loading
    $('#transcript'+transcriptCount+'-tab a').tab('show');
  }    
});

//add

$('#create-new-custom').click(function(){
  $('#projectModal').empty();
  $('#projectModal').append('<div class="modal-header">\
    <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>\
    <h3 id="myModalLabel">New Custom Field</h3>\
  </div>\
  <div class="modal-body">\
    <p>Enter custom field name and default value.</p>\
    <input class="span4 new-custom-field-name" type="text" name="new-custom-field-name" placeholder="Name" />\
    <input class="span4 new-custom-field-value" type="text" name="new-custom-field-value" placeholder="Value" />\
  </div>\
  <div class="modal-footer">\
    <button class="btn" data-dismiss="modal" aria-hidden="true">Close</button>\
    <button class="btn btn-primary" id="create-custom-field" aria-hidden="true">Create</button>\
  </div>');
  $('#create-custom-field').click(function(e){
  e.preventDefault();
  var tempNewCFname = $('#projectModal .new-custom-field-name').val();
  var tempNewCFvalue = $('#projectModal .new-custom-field-value').val();
  if(tempNewCFname&&tempNewCFvalue) {
    //console.log('name and value exist.')
    $('#create-custom-field').text('creating...');
    createCustomField(postID,tempNewCFname,tempNewCFvalue);
  }
  else {
    $('#projectModal .modal-body .alert-error').remove();
    $('#projectModal .modal-body').append('<div class="alert alert-error"><p>Name and Value must not be empty to create a new field.</p></div>');
  }
  
});
  //$('#projectModal .modal-body .alert-error').remove();
});
$('#search-replace-btn').click(function(){
  $('#projectModal').empty();
  $('#projectModal').append('<div class="modal-header">\
    <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>\
    <h3 id="myModalLabel">Find and Replace</h3>\
  </div>\
  <div class="modal-body">\
    <p>Find and replace a value in all custom fields.</p>\
    <select name="custom-fields" class="custom-fields"></select>\
    <input class="span4 find-custom-field-value" type="text" name="new-custom-field-name" placeholder="Find" />\
    <input class="span4 replace-custom-field-value" type="text" name="new-custom-field-value" placeholder="Replace" />\
  </div>\
  <div class="modal-footer">\
    <button class="btn" data-dismiss="modal" aria-hidden="true">Close</button>\
    <button class="btn btn-primary" id="find-custom-field" aria-hidden="true">Find & Replace</button>\
  </div>');
  $('#projectModal .custom-fields').append($('#create-mote select.custom-fields').clone().html());

  $('.find-custom-field-value').on('focus',function(e){
    $('#projectModal .modal-body').append('<div class="alert alert-error"><p>Warning! This action can not be undone.</p></div>');
  });
 
  $('#find-custom-field').click(function(e){
  e.preventDefault();
  var tempFindCFvalue = $('#projectModal .find-custom-field-value').val();
  var tempReplaceCFvalue = $('#projectModal .replace-custom-field-value').val();
  var tempCFName = $('#projectModal .custom-fields option:selected').val();
  if(tempFindCFvalue) {
    //console.log(tempFindCFvalue)
    //console.log($('#projectModal .custom-fields option:selected').val())
  
    findReplaceCustomField(postID,tempCFName,tempFindCFvalue,tempReplaceCFvalue);

    //$('#projectModal').modal('hide');
  }
  else {
    $('#projectModal .modal-body .alert-error').remove();
    $('#projectModal .modal-body').append('<div class="alert alert-error"><p>Need a value to search for.</p></div>');
  }
  
});
  //$('#projectModal .modal-body .alert-error').remove();
});
$('#delete-cf-btn').click(function(){
  $('#projectModal').empty();
  $('#projectModal').append('<div class="modal-header">\
    <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>\
    <h3 id="myModalLabel">Delete Custom Field</h3>\
  </div>\
  <div class="modal-body">\
    <p>Delete custom fields in all associated markers.</p>\
    <select name="custom-fields" class="custom-fields"></select>\
  </div>\
  <div class="modal-footer">\
    <button class="btn" data-dismiss="modal" aria-hidden="true">Cancel</button>\
    <button class="btn btn-primary" id="delete-custom-field" aria-hidden="true">Delete</button>\
  </div>');
  $('#projectModal .custom-fields').append($('#create-mote select.custom-fields').clone().html());
  $('#projectModal .custom-fields').on('change',function(){
    //console.log($('#projectModal .custom-fields option:selected').val())
    $('#projectModal .modal-body').append('<div class="alert alert-error"><p>Warning! Can not undo this action.</p></div>');
  });
  
  $('#delete-custom-field').click(function(e){
    e.preventDefault();
    //console.log($('#projectModal .custom-fields option:selected').val());
    var tempNewCFname = $('#projectModal .custom-fields option:selected').val();
     $('#delete-custom-field').text('deleting...');
    deleteCustomField(postID,tempNewCFname);
  });

});

function countEntries(type){
  var count = $('#entryTabs .ep-'+type);
  //console.log(count.length);
  return count.length;
}

//console.log($('#project_settings').val());

if($('#project_settings').val()) {
  loadSettings(JSON.parse($('#project_settings').val()));
}
else {
  projectObj['project-details'] = new Object();
  projectObj['entry-points'] = new Object();
  projectObj['motes'] = new Object();
  projectObj['views'] = new Object();

  loadSettings(projectObj);
  saveProjectSettings();
}
function updateCustomFieldList(cfdata){
  var cfarray = [];
  _.map(JSON.parse(cfdata), function(cfname){
    cfarray.push(cfname);
    
  });
  //console.log(cfarray);
  projectObj['project-details']['marker-custom-fields'] = cfarray;
}          
function loadSettings(data) {
  $('#motes #create-mote .cf-type').change(function(){
      if($(this).find("option:selected").text()=='Dynamic Data Field'){
        //console.log($(this).find("option:selected").text());
      }
      else {

      }
    });
  //if new project
  projectObj['project-details'] = new Object();
  if(data.hasOwnProperty('project-details')) {
    projectObj['project-details']['id'] = data['project-details']['id'];
    projectObj['project-details']['name'] = data['project-details']['name'];
    diphGetCustomFields(projectObj['project-details']['id']);
  }
  
  
  //create handelers to load data in order. Entry points and shared motes are dependent on motes.
  $('body').bind('load-motes', function(e) {
    if(data['motes']) {
      projectObj['motes'] = new Object();
      buildMotes(data['motes']);
    }
    return;
  });
  $('body').bind('load-entry-points', function(e) {
    if(data['entry-points']) {
      buildEntryPoints(data['entry-points']);
    }
    return;
  });
  $('body').bind('load-shared-motes', function(e) {
    if(data['shared-motes']) {
      buildSharedMotes(data['shared-motes']);
    }
    return;
  });
  $('body').bind('load-views', function(e) {
    //console.log(data['views']);
    projectObj['views'] = data['views'];
      buildViews(data['views']);
      
    return;
  });
  $('body').bind('add-save-alert', function(e) {
    $('#diph_settings_box input').on('change',function(){
      saveProjectAlert();
    });
    $('#diph_settings_box select').on('change',function(){
      saveProjectAlert();
    });
    return;
  });
  //fire in order
  $('body').trigger('load-motes');
  $('body').trigger('load-entry-points');
  $('body').trigger('load-shared-motes');
  $('body').trigger('load-views');
  $('body').trigger('add-save-alert');
  //$('#create-mote .custom-fields').replaceWith(customFieldOption());
  $('#create-mote #create-btn').click(function() {
    createNewMote();
  });
  $('#create-mote #pickMultiple').click(function(){
    if($('#create-mote #pickMultiple').is(':checked')) { 
      $('#create-mote .custom-fields').attr('multiple','multiple');
    }
    else {
      $('#create-mote .custom-fields').removeAttr('multiple');
    } 
  });
  
}

function createNewMote() {
  //console.log($('#create-mote #mote-name').val())
  if($('#create-mote .mote-name').val()) {
    var newMoteSettings = new Object();
  newMoteSettings[0] = new Object();
  newMoteSettings[0]["name"] = $('#create-mote .mote-name').val();
  newMoteSettings[0]["type"] = $('#create-mote .cf-type').val();
  newMoteSettings[0]["custom-fields"] = $('#create-mote .custom-fields option:selected').map(function() {
    return $(this).val();
  }).get().join();
  newMoteSettings[0]["delim"] = $('#create-mote .delim').val();
  $('.mote-error').remove();
  buildMotes(newMoteSettings);
  clearCreateValues();
  }
  else {
    $('#create-mote .mote-name').after('<span class="help-inline mote-error label label-important" >Name is required</span>');
  }
}
function countMotes(){
  var count = $('.accordion-group');
  //console.log(count.length);
  return count.length;
  }
function clearCreateValues() {
  $('#create-mote .mote-name').val('');
  $('#create-mote .delim').val('');
  //$('#create-mote .custom-fields option').eq(0).attr('selected','selected');
}
//builds the html for the entry points and preloads the data
function buildEntryPoints(epObject){
  projectObj['entry-points'] = epObject;
  for (var i =0; i < Object.keys(epObject).length; i++) {
  //console.log(epObject[i]["type"])
    if(epObject[i]["type"]=="map") {
      //console.log("oh yeah itsa map")
    }
    if(epObject[i]["type"]=="timeline") {
      //console.log("timeline...no way")
    }
    buildEntryHtml(epObject[i]["type"],epObject[i]["settings"])
  }
}
function buildEntryHtml(type,settings){
  var epCount  = countEntries(type) +1;
  if(!settings) {
    settings = new Object();
  } 
  //create tab
  $('#entryTabs').append('<li id="'+type+epCount+'-tab"><a href="#'+type+'-'+epCount+'" class="ep-'+type+'" data-toggle="tab">'+type+' '+epCount+'</a></li> ')
  //create content area...load settings
  if(type=='timeline') {
  //settings['start-date'] = '01/01/2012'
    entryTabContent = '<div class="input-prepend input-append">\
                          <input class="span4" type="text" name="start-date" id="start-date" placeholder="Start Date" value="'+createIfEmpty(settings['start-date'])+'" />\
                          <span>-</span>\
                          <input class="span4" type="text" name="end-date" id="end-date" placeholder="End Date" value="'+createIfEmpty(settings['end-date'])+'" />\
                          </div>\
                          <label>Timeline Data</label>\
                        <select name="timeline-mote" id="timeline-mote">'+getLoadedMotes(settings['timeline-data'])+'\
                        </select>';
  }
  if(type=='transcript') {
    //settings['start-date'] = '01/01/2012';
    //need audio, transcript, timecode
    entryTabContent = '<label>Audio URL</label>\
                        <select name="av-transcript-audio" id="av-transcript-audio">'+getLoadedMotes(settings['audio'])+'\
                        </select>\
                        <label>Transcript</label>\
                        <select name="av-transcript-txt" id="av-transcript-txt">'+getLoadedMotes(settings['transcript'])+'\
                        </select>\
                          <label>Time Stamp(clip)</label>\
                        <select name="av-transcript-clip" id="av-transcript-clip">'+getLoadedMotes(settings['timecode'])+'\
                        </select>';
  }
  if(type=='map') {
    entryTabContent = '<div class="row-fluid vars">\
                    <div class="cords span5">\
                        <label>Map Center (Lat/Lon)</label>\
                        <div class="input-prepend input-append">\
                          <input class="span5" type="text" name="lat" id="lat" placeholder="Lat" value="'+createIfEmpty(settings['lat'])+'" />\
                          <input class="span5" type="text" name="lon" id="lon" placeholder="Lon" value="'+createIfEmpty(settings['lon'])+'" />\
                          <a href="#projectModal" role="button" class="load-map btn" data-toggle="modal">\
                            <i class="icon-screenshot"></i>\
                          </a>\
                        </div>\
                        <label>Initial Zoom</label>\
                        <input type="text" name="zoom" id="zoom" placeholder="Zoom" value="'+createIfEmpty(settings['zoom'])+'" />\
                    </div>\
                    <div class="span7 layers">\
                      <ul class="layer-list">\
                        '+loadLayers(settings['layers'])+'\
                        </ul>\
                    <button class="btn btn-success add-layer" type="button">Add</button>\
                    </div>\
                </div>\
                <div class="row-fluid vars">\
                    <div class="span5">\
                    	<label>Marker Layer(Lat/Lon) <span class="badge badge-info"><i class="icon-question-sign icon-white"></i></span></label>\
                        <select class="span12" name="marker-layer" id="marker-layer">'+getLoadedMotes(settings['marker-layer'])+'\
                        </select>\
                    </div>\
                    <div class="span7">\
                    	<label>Legends</label>\
                        <ul class="legend-list">\
                        '+loadLegendList(settings['filter-data'])+'\
                        </ul>\
                        <button class="btn btn-success add-legend" type="button">Add</button>\
                    </div>\
                </div>';
  }
  $('#entryTabContent').append('<div class="tab-pane fade in ep map" id="'+type+'-'+epCount+'"><button type="button" class="close" >&times;</button>\<p>'+entryTabContent+'</p></div>');

  $( '.layer-opacity' ).slider({
    range: false,
    min: 0,
    max: 1,
    step:.05,
    values: [ 1 ],
    slide: function( event, ui ) {            
      
      //$(this).parent('li').find('select option:selected').attr('data-opacity', ui.values[ 0 ]);
      $(this).parents('li').find('select option:selected').attr('data-opacity', ui.values[ 0 ]);
      $(this).next('.slider-value').text( "" + ui.values[ 0 ] );
    }
  });

  $('#'+type+'-'+epCount+ ' .close').click(function(e){
    e.stopPropagation();
    e.preventDefault();

    if($(this).text()=='Confirm Delete') {
      saveProjectAlert();
      $('#entryTabs .active').remove();
      $(this).closest('.ep').remove();
    }
    else {
      $(this).text('Confirm Delete');
    }
  });
  $('#'+type+'-'+epCount+ '.ep').click(function(e){
    if($(this).find('.close').text()=='Confirm Delete') {
      $(this).find('.close').html('&times;');
    }
  });
  $('.delete-layer').click(function(){   
    //console.log('delete')
    $(this).closest('li').remove();
    //assignLegendListeners();
  });
  $('.load-map').click(function(){
    $('#projectModal').empty();
    $('#projectModal').append('<div class="modal-header">\
      <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>\
      <h3 id="myModalLabel">Map Setup</h3>\
    </div>\
    <div class="modal-body">\
      <p>Zoom and drag to set your map\'s initial position.</p>\
      <div id="map_canvas"></div>\
    </div>\
    <div class="modal-footer">\
      <button class="btn" data-dismiss="modal" aria-hidden="true">Close</button>\
      <button class="btn btn-primary">Save changes</button>\
    </div>');
  });
  
assignLegendListeners();
  $('.add-legend').unbind('click');
  $('.add-legend').click(function(){   
    $('.legend-list').append(addLegend());
    assignLegendListeners();
    saveProjectAlert();
  });
  $('.add-layer').unbind('click');
  $('.add-layer').click(function(){   
    $('.layer-list').append(addNewLayer());
    saveProjectAlert();
    //assignLegendListeners();
  });

  
}
function getChildObjectByType(parentObj,objType) {
  for (var i =0; i < Object.keys(parentObj).length; i++) {
      if(parentObj[i].type == objType) {
        return parentObj[i];
      }
        
    }
}
function addMarkerView(viewObject) {
  var markerTitle = '';
  var markerContent ='';
  if(viewObject['post-view-title']) {
    markerTitle = viewObject['post-view-title'];
  }
  
  $('.marker-view').append('<select name="post-view-title" class="title-custom-fields save-view"><option selected="selected" value="the_title" >Marker Title</option>'+getLoadedMotes(markerTitle)+'</select>');
  $('.marker-view').append('<p>Pick the motes to display in single page view.</p><ul id="post-content-view"></ul><button class="btn btn-success add-mote-content" type="button">Add</button>');

  if(viewObject['post-view-content']){
    var tempVar = $('<div/>');
    _.map(viewObject['post-view-content'],function(val,key){
      $(tempVar).append(addContentMotes(val));
    });
    $('#post-content-view').append(tempVar);
  }
  $('.delete-content-mote').unbind('click');
      $('.delete-content-mote').on('click',function(){
        $(this).parent('li').remove();
         saveProjectAlert();
      });
  $('.add-mote-content').click(function(e){
      //console.log($('#projectModal .custom-fields option:selected').val());
      $('#post-content-view').append(addContentMotes());
      saveProjectAlert();
      $('.delete-content-mote').unbind('click');
      $('.delete-content-mote').on('click',function(){
        $(this).parent('li').remove();
      });
    });
}
function buildViews(viewObject){
  if(!viewObject) {
    viewObject = new Object();
  } 
  //console.log(projectObj);

  //setup layout for main view
  var mapView,legendView;
  mapView = viewObject;
  
  _.map(mapView,function(val,key) {
    $('.'+key).val(val);
    if(viewObject['map-fullscreen']) {
      $('.'+key).attr('checked','checked');
    }
  });
  if(viewObject['title']) {
    legendView = viewObject['legend'];
  }

  addMarkerView(viewObject);

  //Setup layout for frontend modals
  $('.setup-modal-view').click(function(){
    var title = '';

    var content = [];
    var linkTarget;
    if(viewObject['title']) {
      title = viewObject['title'];
    }
    if(viewObject['link']) {
      linkTarget = viewObject['link'];
    }
    $('#projectModal').empty();
    $('#projectModal').append('<div class="modal-header">\
      <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>\
      <h3 id="myModalLabel">Choose Title: <select name="custom-fields" class="title-custom-fields"><option selected="selected" value="the_title" >Marker Title</option>'+getLoadedMotes(title)+'</select></h3>\
    </div>\
    <div class="modal-body">\
      <p>Pick the motes to display in the modal.</p>\
      <ul id="modal-body-content">\
      </ul><button class="btn btn-success add-modal-content" type="button">Add</button>\
    </div>\
    <div class="modal-footer">\
      <span class="pull-left" >Link to page: <select name="link-legends" class="link-legends">'+legendOptions(linkTarget)+'</select></span>\
      <button class="btn" data-dismiss="modal" aria-hidden="true">Cancel</button>\
      <button class="btn btn-primary" id="save-modal-view" aria-hidden="true">Confirm</button>\
    </div>');
    //$('#projectModal .title-custom-fields').append($('#create-mote select.custom-fields').clone().html());
    //$('#projectModal .title-custom-fields').prepend('<option name="the_title" value="the_title">Marker Title</option>');
    if(viewObject['content']) {
      //each
      _.map(viewObject['content'],function(val,index) {
        //console.log(val);
        $('#modal-body-content').append(addContentMotes(val));
      });
      $('.delete-content-mote').unbind('click');
      $('.delete-content-mote').on('click',function(){
        $(this).parent('li').remove();
      });

      //title = viewObject['title'];
    }

    //load view settings
    
    
    $('#projectModal .title-custom-fields').on('change',function(){
      $('#projectModal .title-custom-fields option:selected').each( function() {
          //console.log($(this).val()); 
      });
      
      //$('#projectModal .modal-body').append('<div class="alert alert-error"><p>Warning! Can not undo this action.</p></div>');
    });
    
    $('#save-modal-view').click(function(e){
      e.preventDefault();
      //console.log($('#projectModal .title-custom-fields option:selected').val());
      viewObject['title'] = $('#projectModal .title-custom-fields option:selected').val();
      viewObject['content'] = new Object();
      $('#projectModal .content-motes option:selected').each( function(index) {
        
        viewObject['content'][index] = $(this).val();
          //console.log($(this).val()); 
      });
      //console.log($('#projectModal .link-legends option:selected').val());
      viewObject['link'] = $('#projectModal .link-legends option:selected').val();
      // $('#save-modal-view').text('saving...');

       //console.log(viewObject);
      projectObj['views'] = viewObject;
      saveProjectAlert();
      $('#projectModal').modal('hide'); 
    });
    $('.add-modal-content').click(function(e){
      //console.log($('#projectModal .custom-fields option:selected').val());
      $('#modal-body-content').append(addContentMotes());
      
    });
    
  });  

}
function addContentMotes(selected) {
  var contentMote = '<li><select name="content-motes" class="content-motes">\
  '+getLoadedMotes(selected)+'</select> <button class="btn btn-danger delete-content-mote" type="button">-</button></li>';

  return contentMote;
}
function loadLayers(layerObject){
  var layerHtml = $('<ul><li><label>Base Layer</label><select name="base-layer" id="base-layer"></select><label>Additional Layers</label></li></ul>');
  $('select', layerHtml).append($('#hidden-layers .base-layer').clone());

  if(layerObject != null && typeof layerObject === 'object') {
    //console.log('layers'+Object.keys(layerObject).length);
    //"layers": {"0":{"id":"5675","name":"OpenStreetMap"},"1":{"id":"5672","name":"Test Map 2"}}
    for (var i =0; i < Object.keys(layerObject).length; i++) {
      if(i==0) {
        $('select option#'+layerObject[i]['id'], layerHtml).attr('selected','selected');
      }
      else{
        //console.log('second layer')
        $(layerHtml).append(addNewLayer('',layerObject[i]['opacity']));
        $('li',layerHtml).eq(i).find('select option#'+layerObject[i]['id']).attr('selected','selected');
        $('li',layerHtml).eq(i).find('select option#'+layerObject[i]['id']).attr('data-opacity',layerObject[i]['opacity']);
      }        
    }
  }      
  return $(layerHtml).html();
}
function addNewLayer(selected,layerOpacity){
  var layerLine = $('<li><select name="overlay"></select> <button class="btn btn-danger delete-layer" type="button">-</button><div><div class="layer-opacity"></div><span class="slider-value">'+layerOpacity+'</span> Opacity</div></li>');
  $('select',layerLine).append($('#hidden-layers option').clone());
  $('.delete-layer',layerLine).click(function(){   
    $(this).closest('li').remove();
    //assignLegendListeners();
    saveProjectAlert();
  });
  return layerLine;
}
function getAvailableLayers(){
  //console.log($('#hidden-layers'));
  var layersA = $('#hidden-layers').clone();
  return layersA;
}
function assignLegendListeners(){
$('.load-legend').unbind('click');
  $('.load-legend').click(function() {
      var moteName = $(this).parent().find('#filter-mote option:selected').val();
      var mote = getMote(moteName);
      var projectID = projectObj['project-details']['id'];
      //console.log(projectObj['motes'])
      diphGetMoteValues(mote,projectID,true);
  });
  $('.delete-legend').unbind('click');
  $('.delete-legend').click(function() {
    var moteName = $(this).parent().find('#filter-mote option:selected').val();
    var lineID = $(this).closest('li').attr('id');
    $('body').append('<!-- Modal -->\
        <div id="deleteModal" class="modal hide fade" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">\
          <div class="modal-header">\
            <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>\
            <h3 id="myModalLabel">Delete Legend</h3>\
          </div>\
          <div class="modal-body">\
            <p>This will delete all terms and icons associated with the '+moteName+' legend.</p>\
          </div>\
          <div class="modal-footer">\
            <button class="btn" data-dismiss="modal" aria-hidden="true">Cancel</button>\
            <button class="btn btn-primary delete-confirm">Delete Legend</button>\
          </div>\
        </div>');
    $('#deleteModal').modal('show');
    $('.delete-confirm').click(function(){
      //console.log('delete '+moteName+' now delete terms and children');
      $('#deleteModal .delete-confirm').text('deleting...');
      deleteTerms(postID,moteName);
      $('#'+lineID).remove();
      //$('#deleteModal').modal('hide');
    })
    $('#deleteModal').on('hidden', function () {
      saveProjectAlert();
      $('#deleteModal').remove();
    })
  });  
}
function loadLegendList(legendObject) {
  
    var listHtml ='';
    if(legendObject) {
      for (var i =0; i < Object.keys(legendObject).length; i++) {
        listHtml += addLegend(legendObject[i],i+1);
       }
     }
    else { listHtml += addLegend(); } 
  return listHtml;

}
function addLegend(selected, count){
  if(selected=='') {
    selected = '';
  }
  if(!count && $('.legend-list li').last().attr('id')) {
    tempcount = $('.legend-list li').last().attr('id').split('-');
    count = parseInt(tempcount[1])+1;
    //console.log('3legend count '+tempcount[1]);
  }
  //console.log('legend count '+count);
  var legendLine = '<li id="legend-'+count+'"><select name="filter-mote" id="filter-mote">'+getLoadedMotes(selected)+'</select>\
                        <button class="btn btn-inverse load-legend" type="button">Create Legend</button> <button class="btn btn-danger delete-legend" type="button">Delete</button>\
                        </li>';
  
  return legendLine;
}
function legendOptions(selected){
  var mapObject = getChildObjectByType(projectObj['entry-points'], 'map');
  //console.log(mapObject);

  var optionHtml = '';
  if(selected=="no-link") {
    optionHtml = '<option name="no-link" value="no-link" selected="selected">No Link</option><option name="marker" value="marker" >Marker Post</option>';
  }
  else if (selected=="marker") {
    optionHtml = '<option name="no-link" value="no-link" >No Link</option><option name="marker" value="marker" selected="selected" >Marker Post</option>';
  }
  for (var i =0; i < Object.keys(mapObject['settings']['filter-data']).length; i++) {
    if(mapObject['settings']['filter-data'][i]==selected){
      optionHtml += '<option name="'+mapObject['settings']['filter-data'][i]+'" value="'+mapObject['settings']['filter-data'][i]+'" selected="selected" >'+mapObject['settings']['filter-data'][i]+'</option>';
    }
    else {
      optionHtml += '<option name="'+mapObject['settings']['filter-data'][i]+'" value="'+mapObject['settings']['filter-data'][i]+'" >'+mapObject['settings']['filter-data'][i]+'</option>';
    }
  }
  return optionHtml;
}
function getMote(findMote) {
  //console.log(findMote);
  for (var i =0; i < Object.keys(projectObj['motes']).length; i++) {
    if(projectObj['motes'][i]['name']==findMote) {
      return projectObj['motes'][i];
    }
  }
}
function getLoadedMotes(selected) {
  var moteOptions = '';
  //if(!selected){ moteOptions += '<option>No Motes Defined</option>'}
  $('#motes .accordion-group .mote-name').each(function() {
    if($(this).val()==selected) {
      moteOptions += '<option value="'+$(this).val()+'" selected="selected">'+$(this).val()+'</option>';
    }
    else {
      moteOptions += '<option value="'+$(this).val()+'" >'+$(this).val()+'</option>';
    }
  });
  return moteOptions;
}
function createIfEmpty(value) {
  if(!value) {
    return '';
  }
  else {
    return value;
  }
}
//builds the html for the motes and preloads the data
function buildMotes(moteObject){
  var moteCount = countMotes();
  for (var i =0; i < Object.keys(moteObject).length; i++) {
    //console.log('html for '+moteObject[i]['name']);
    //console.log(i);
    projectObj['motes'][i] = new Object();
    projectObj['motes'][i]['name'] = moteObject[i]['name'];
    projectObj['motes'][i]['custom-fields'] = moteObject[i]['custom-fields'];
    projectObj['motes'][i]['type'] = moteObject[i]['type'];
    projectObj['motes'][i]['delim'] = moteObject[i]['delim'];
    moteContent = '<div class="accordion-group" id="group'+(moteCount+i)+'">\
                  <div class="accordion-heading">\
                    <a class="accordion-toggle" data-toggle="collapse" data-parent="#mote-list" href="#collapseMote'+(moteCount+i)+'">\
                      <button type="button" class="close" >&times;</button>\
                      '+moteObject[i]['name']+'\
                    </a>\
                  </div>\
                  <div id="collapseMote'+(moteCount+i)+'" class="accordion-body collapse">\
                    <div class="accordion-inner">\
                     <div class="row-fluid vars">\
                    	<div class="span4">\
                     	<input class="mote-name span12" type="text" placeholder="Mote Name" value="'+moteObject[i]['name']+'" />\
                     	</div>\
                     	<div class="span8 layers">\
                      <select name="cf-type" class="cf-type">\
                         '+dataTypeOption(moteObject[i]['type'])+'\
                      </select><span class="help-inline">data type</span>\
                        '+customFieldOption(moteObject[i]['custom-fields'])+'\
                      <span class="help-inline">custom field</span>\
                      <label class="checkbox inline">\
                        <input type="checkbox" id="pickMultiple" value="multiple"> Multiple\
                      </label>\
                      <p>\
                      <input class="span4 delim" type="text" name="delim" placeholder="Delimiter" value="'+moteObject[i]['delim']+'"/>\
                      <span class="help-inline">If multiple text indicate the delimiter</span>\
                      </p>\
                      </div>\
                      </div>\
                    </div>\
                  </div>\
                </div>';
    $('#mote-list').prepend(moteContent);
    $('#group'+(moteCount+i)+' .cf-type').change(function(){
      //console.log($(this).find("option:selected").text());
    });
    $('#group'+(moteCount+i)+' .accordion-toggle .close').click(function(e){
      e.stopPropagation();
      e.preventDefault();
      if($(this).text()=='Confirm Delete') {
        $(this).closest('.accordion-group').remove();
      }
      else {
        $(this).text('Confirm Delete');
      }
    })
    $('#group'+(moteCount+i)+' .accordion-toggle').click(function(e){
      if($(this).find('.close').text()=='Confirm Delete') {
        $(this).find('.close').html('&times;');
      }
    });
    $('#mote-list #pickMultiple').unbind('click');
    $('#mote-list #pickMultiple').click(function(){
    if($('#mote-list #pickMultiple').is(':checked')) { 
      $('#mote-list .custom-fields').attr('multiple','multiple');
    }
    else {
      $('#mote-list .custom-fields').removeAttr('multiple');
    } 
  });
  }
}
/**
 * [saveProjectAlert adds popover below save button if project needs to be saved. Changes color to red.]
 * @return {[type]}
 */
function saveProjectAlert(){
  //$('#save-btn').after()
  $('#save-btn').addClass('btn-danger');
  //console.log('save alert');
  //$('#wpbody-content').css('overflow','visible'); 
  //$('#save-btn').popover({title:'Project requires save',content:'Don\'t forget to save your project',placement:'bottom'});
  //$('#save-btn').popover('show');
}


function buildSharedMotes(sharedMoteObject){
  $('#shared .cf-type').change(function(){
    //console.log($("select option:selected").text());
  });
  for (var i =0; i < Object.keys(sharedMoteObject).length; i++) {
    //console.log('shared html for '+sharedMoteObject[i]['name']);
  }
}
function dataTypeOption(selected){
  dataTypes = ['Text','HTML','Exact Date','Date Range','Lat/Lon Coordinates','File','Image','Dynamic Data Field'];
  dataTypeHTML ='';
  for (var i =0; i < Object.keys(dataTypes).length; i++) {
    //console.log(selected);
    if(dataTypes[i]==selected) {
      dataTypeHTML += '<option value="'+dataTypes[i]+'" selected="selected">'+dataTypes[i]+'</option>';
    }
    else {
      dataTypeHTML += '<option value="'+dataTypes[i]+'">'+dataTypes[i]+'</option>';
    }
  }
  return dataTypeHTML;
}
//create select list of custom fields for motes
function customFieldOption(selected){
  if(!selected){ selected = '';}
  var trimSelected = selected.split(',');
  cflistString = $('#create-mote').find('.custom-fields option').map(function() {
    return $(this).val();
  }).get().join();
  cflist = cflistString.split(',');
  //cflist = ['Audio Url','lat','lon','alt_location','date_range','Interviewee']
  if (trimSelected.length>1) {
    cflistHtml = '<select name="custom-fields" class="custom-fields" multiple="multiple">'
    for (var i =0; i < Object.keys(cflist).length; i++) {
      selectedTag = ''
      for (var j =0; j < Object.keys(trimSelected).length; j++) {                 
        if(trimSelected[j]==cflist[i]) { selectedTag = 'selected="selected"';} 
      }
      cflistHtml += '<option value="'+cflist[i]+'" '+selectedTag+'>'+cflist[i]+'</option>';
    }
    cflistHtml += '</select>';
  }
  else {
    cflistHtml = '<select name="custom-fields" class="custom-fields">';
    for (var i =0; i < Object.keys(cflist).length; i++) {
      if(selected==cflist[i]) { selectedTag = 'selected="selected"'} else { selectedTag = ''}
        cflistHtml += '<option value="'+cflist[i]+'" '+selectedTag+'>'+cflist[i]+'</option>';
      }
      cflistHtml += '</select>';
    }
  return cflistHtml;
}
//create select list of project custom fields for motes(dynamic data type)
function customFieldDynamicOption(selected){
  if(!selected){ selected = '';}
  var trimSelected = selected.split(',');
  cflistString = $('#shared #create-mote').find('.custom-fields option').map(function() {
    return $(this).val();
  }).get().join();
  cflist = cflistString.split(',');
  //cflist = ['Audio Url','lat','lon','alt_location','date_range','Interviewee']
  if (trimSelected.length>1) {
    cflistHtml = '<select name="custom-fields" class="custom-fields" multiple="multiple">'
    for (var i =0; i < Object.keys(cflist).length; i++) {
      selectedTag = ''
      for (var j =0; j < Object.keys(trimSelected).length; j++) {                 
        if(trimSelected[j]==cflist[i]) { selectedTag = 'selected="selected"';} 
      }
      cflistHtml += '<option value="'+cflist[i]+'" '+selectedTag+'>'+cflist[i]+'</option>';
    }
    cflistHtml += '</select>';
  }
  else {
    cflistHtml = '<select name="custom-fields" class="custom-fields">';
    for (var i =0; i < Object.keys(cflist).length; i++) {
      if(selected==cflist[i]) { selectedTag = 'selected="selected"'} else { selectedTag = ''}
        cflistHtml += '<option value="'+cflist[i]+'" '+selectedTag+'>'+cflist[i]+'</option>';
      }
      cflistHtml += '</select>';
    }
  return cflistHtml;
}       
//Load icons that are stored in custom field
function loadSelectedIcons(){

	$('#diph_icons_box .inside').append('<div class="misc-pub-section"><span >Add more icons</span><a class="diph-icon-upload button-primary">Upload</a></div>');
	$('.diph-icon-upload').click(function(){
		tb_show('','media-upload.php?post_id='+ postID +'&type=image&TB_iframe=1&width=640&height=520');
	});
}
function popupIcons(){
    
    tb_show('Hayti Intro', '#TB_inline?height=350&width=400&inlineId=diph_icons_box' );
    //$('#TB_window').css({'width':300});
}

//Applies typing listeners to the new mote fields
function diphAssignMoteListeners(theobj) {
	var mote_id = '#'+$(theobj).attr('id');
	var remove_span = '#'+$(theobj).attr('id')+' .delete-mote';
	var remove_li = mote_id;
	//console.log(mote_id);
	//setup before functions
    var typingTimerMote;                //timer identifier
    var moteTypingInterval = 3000;  //time in ms, 5 second for example

    //on keyup, start the countdown
    $($(theobj).find('input')).keyup(function(){
    	//console.log('typing');

        typingTimerMote = setTimeout(doneTypingMote, moteTypingInterval);
    });

    //on keydown, clear the countdown 
    $($(theobj).find('input')).keydown(function(){
        clearTimeout(typingTimerMote);
    });
	
	$('.delete-mote').unbind('click');
    $('.delete-mote').click(function() {
    	//console.log('remove');
        //$(mote_id).toggleClass('selected');	
        deleteMoteLine($(this).closest('li').attr('id'));
		$(this).closest('li').remove();

		doneTypingMote();
    });
    
    $('.make-tax').unbind('click');
    $('.make-tax').click(function() {
    	var moteName = jQuery(this).parent('li').find('input').val();
    	var projectID = jQuery('#post_ID').val();
    	//diphGetMoteValues(moteName,projectID,false);
    	$(this).next('.legend').show();
		$(this).replaceWith('<span class="loaded">Loaded</span>');
		

    });
    $('.legend').unbind('click');
    $('.legend').click(function() {
    	var moteName = jQuery(this).parent('li').find('input').val();
    	var projectID = jQuery('#post_ID').val();
    	//diphGetMoteValues(moteName,projectID,true);
    	
    });
            
}

//user is "finished typing," do something
function doneTypingMote() {

    $('.motes').each(function() {
    	//$(this).attr('id')
    	var moteOID = $(this).attr('id');
    	var moteName = $(this).find('input').val();
    	var moteID = moteName.toLowerCase();
    	moteID = moteID.trim();
    	//console.log(moteID+'done');
    	moteID = moteID.replace(" ","_");
    	projectObj.motes[moteOID] = {"id": moteID,"name": moteName};
   	
    });
    saveProjectEntry();
    createMarkerSettings();
    saveProjectSettings();
    //console.log(metaID);
}


// $('.add-layer').click(function(){
//     addMoteLine();
//    createMarkerSettings();
// 	saveProjectSettings();

// });
$('#save-btn').on('click', function(){
  $('#publish').removeClass('button-primary-disabled');
    $('#publishing-action .spinner').hide();
  $('#save-btn').removeClass('btn-danger');
  $('#publish').popover('hide');
	saveProjectSettings();
  
});



function saveProjectSettings()	{
	//console.log($('#diph-projectid').val())
	projectObj['project-details']['name'] = $('#titlediv #title').val();
  projectObj['project-details']['id'] = $('#diph-projectid').val();
  //console.log(projectObj['project-details']['marker-custom-fields'])
	//MOTES - clear old values...add fresh
	projectObj['motes'] = new Object();
	$('#mote-list .accordion-group').each(function(index){
		projectObj['motes'][index] = new Object();
		projectObj['motes'][index]["name"] = $(this).find('.mote-name').val()
        projectObj['motes'][index]["type"] = $(this).find('.cf-type').val()
        projectObj['motes'][index]["custom-fields"] = $(this).find('.custom-fields option:selected').map(function() {
                  return $(this).val();
              }).get().join();
        projectObj['motes'][index]["delim"] = $(this).find('.delim').val()
	})

	//ENTRY POINTS - clear old values...add fresh
	projectObj['entry-points'] = new Object();
	$('#entry-point .ep').each(function(index){
		var type = $(this).attr('id').split('-')
		if(type[0]=='map') {
			projectObj['entry-points'][index] = new Object();
			projectObj['entry-points'][index]["type"] = type[0]
     	projectObj['entry-points'][index]["settings"] = new Object();
			//settings
			projectObj['entry-points'][index]["settings"]['lat'] = $(this).find('#lat').val();
     	projectObj['entry-points'][index]["settings"]['lon'] = $(this).find('#lon').val();
     	projectObj['entry-points'][index]["settings"]['zoom'] = $(this).find('#zoom').val();
      //layers
      projectObj['entry-points'][index]["settings"]['layers'] = new Object();
      $('.layer-list li option:selected').map(function(ind2) {
        projectObj['entry-points'][index]["settings"]['layers'][ind2] = new Object();
        projectObj['entry-points'][index]["settings"]['layers'][ind2]['id'] = $(this).attr('id'); 
        //console.log($(this).find('.slider-value').text()); 
        projectObj['entry-points'][index]["settings"]['layers'][ind2]['opacity'] = $(this).attr('data-opacity'); 
        projectObj['entry-points'][index]["settings"]['layers'][ind2]['name'] = $(this).text(); 
        projectObj['entry-points'][index]["settings"]['layers'][ind2]['mapType'] = $(this).attr('data-mapType'); 
        projectObj['entry-points'][index]["settings"]['layers'][ind2]['mapTypeId'] = $(this).val(); 

        //console.log($(this).attr('data-mapType'));
          //$("div[class^='apple-']")
      
      }).get().join();

     	projectObj['entry-points'][index]["settings"]['marker-layer'] = $(this).find('#marker-layer').val();
      //legends
      projectObj['entry-points'][index]["settings"]['filter-data'] = new Object();
      $('.legend-list li option:selected').map(function(index2) {
        projectObj['entry-points'][index]["settings"]['filter-data'][index2] = $(this).val(); 
      }).get().join();
     	
    }
    if(type[0]=='timeline') {
			projectObj['entry-points'][index] = new Object();
			projectObj['entry-points'][index]["type"] = type[0];
     	projectObj['entry-points'][index]["settings"] = new Object();
     	projectObj['entry-points'][index]["settings"]['start-date'] = $(this).find('#start-date').val();
     	projectObj['entry-points'][index]["settings"]['end-date'] = $(this).find('#end-date').val();
     	projectObj['entry-points'][index]["settings"]['timeline-data'] = $(this).find('#timeline-mote').val();
    }
    if(type[0]=='transcript') {
      projectObj['entry-points'][index] = new Object();
      projectObj['entry-points'][index]["type"] = type[0];
      projectObj['entry-points'][index]["settings"] = new Object();
      projectObj['entry-points'][index]["settings"]['audio'] = $(this).find('#av-transcript-audio').val();
      projectObj['entry-points'][index]["settings"]['transcript'] = $(this).find('#av-transcript-txt').val();
      projectObj['entry-points'][index]["settings"]['timecode'] = $(this).find('#av-transcript-clip').val();
    }
	});
    if(!projectObj['views']) {
      projectObj['views'] = new Object();
    }
   var tempMarkerContent = [];
    _.map($('#post-content-view li'), function(val,key){
      tempMarkerContent.push($(val).find('option:selected').val());
    });
    projectObj['views']['post-view-content'] = tempMarkerContent;
  _.map($('.save-view'),function(val,index) {
    projectObj['views'][$(val).attr('name')] = val.value;
        console.log(val);
        //if(val.type=='')
        if(val.type=="checkbox"&&val.checked) {
        //   console.log(val); 
           projectObj['views'][$(val).attr('name')] = true;
        }
        if(val.type=="checkbox"&&!val.checked) {
        //   console.log(val); 
           projectObj['views'][$(val).attr('name')] = false;
        }
        // if(val.type=="text"&&val.value) {
        //   projectObj['views'][$(val).attr('name')] = val.value;
        // }
        // if(val.type=="select-one") {
        //   console.log(val.value);
        //   projectObj['views'][$(val).attr('name')] = val.value;
        // }
        //$('#modal-body-content').append(addContentMotes(val));
  });
	
  //console.log(projectObj);
	//save object for real
	$('#project_settings').val(JSON.stringify(projectObj));
	updateProjectSettings();
}


function createLegend(title,data){
	//console.log('fire how many times?');
	//$('#filter_legend_builder').append(data);
	//$('#filter_legend_builder').append($('.icons'));
	tb_show('Create Legend', '#TB_inline?&inlineId=filter_legend_builder' );
	
	resizeTB();
	$('#TB_ajaxContent').append(diphCatObject(data));
	
  $('#TB_ajaxContent').append('<div class="icons-color"><a class="use-icons">Icons</a> | <a class="use-colors">Colors</a></div>');
	$('#TB_ajaxContent .icons-color').append($('.icons').clone());
  $('#TB_ajaxContent').append('<a class="save-array button-primary">Save</a>');
	$('ol.sortable').nestedSortable({
            forcePlaceholderSize: true,
			handle: 'div',
			helper:	'clone',
			items: 'li',
			opacity: .6,
			placeholder: 'placeholder',
			revert: 250,
			tabSize: 25,
			tolerance: 'pointer',
			toleranceElement: '> div',
			maxLevels: 3,

			isTree: true,
			expandOnHover: 700,
			startCollapsed: true
        });
	$('.disclose').on('click', function() {
			$(this).closest('li').toggleClass('mjs-nestedSortable-collapsed').toggleClass('mjs-nestedSortable-expanded');
			resizeTB();
		})
	$('.save-array').click(function(){
		saveArrayTree();
		
	});
  $('.use-colors').click(function(e){

    
    $('.term-icon').unbind('click');
    $('.term-icon').each(function() {
      if($(this).text().substring(0,1)!='#') {
        $(this).empty();
        var tempColor = '#00bf5f';
      }
      else {
        var tempColor = $(this).text();
      }
      
      $(this).jPicker(
        { window: { expandable: true,liveUpdate: false },
        color:
          {
            
            active: new $.jPicker.Color({ hex: tempColor })
          },
        position:
          {
            x: 'screenCenter', // acceptable values "left", "center", "right",
                         // "screenCenter", or relative px value
            y: '300px', // acceptable values "top", "bottom", "center", or relative px
                // value
          }
      },
        function(color, context)
        {
          var all = color.val('all');
          //console.log('Color chosen - hex: ' + (all && '#' + all.hex || 'none') +
            //' - alpha: ' + (all && all.a + '%' || 'none'));
          $(this).css(
            {
              backgroundColor: all && '#' + all.hex || 'transparent'
            }).text('#'+all.hex); // prevent IE from throwing exception if hex is empty
        }
        );
    });
  });
	$('.term-icon').click(function(e){
		//console.log($(this).parents('li').attr('id'));
		//$('.mjs-nestedSortable-expanded').toggleClass('mjs-nestedSortable-collapsed');
		$(this).empty().text('Choose icon ->');
		var termID = $(this).parents('li').attr('id');
		$('#TB_ajaxContent .icons a').click(function(){
			var icon_url = $(this).find('img').attr('src');
			var img = $(this).find('img').clone();
			$(img).css({'height':'20px','margin-top': '-3px'});
			//console.log(termID+' '+icon_url);
			$('.cat-list li#'+termID+' .term-icon').empty().append(img);
			$('#TB_ajaxContent .icons a').unbind('click');
		});
	});
	

}
function resizeTB() {
	if($('#TB_ajaxContent').length>0) {
		
		var div = document.getElementById('TB_ajaxContent');
		var hasVerticalScrollbar = div.scrollHeight>div.clientHeight;
		var boxWidth = $('#TB_window').width() -30;
		var boxHeight = $('#TB_window').height() -42;
		if(hasVerticalScrollbar) {
			$('.cat-list').width('385px');
		}
		else {
			$('.cat-list').width('400px');
		}
		
		$('#TB_ajaxContent').css({'width': boxWidth,'height':boxHeight});
	}
}
function saveArrayTree(){
	//var arraied = $('ol.sortable').nestedSortable('toHierarchy');
	//arraied = dump(arraied);
	//console.log(arraied);
	var termTree = '[';
	//var myArray = jQuery.makeArray($('ol.sortable'));
	//console.log(JSON.stringify(myArray));
	var lis= $('ol.sortable').find('li');
	//console.log(lis.length);
	var i = 0;
	var treeParent = $('.cat-list h2').attr('id');

	$(lis).each(function(index){
		var tempParent = $(this).parents('li').attr('id');
		if(!tempParent){tempParent = '';}
		var tempName = $(this).children().find('.term-name').eq(0).text();
		var tempCount = $(this).children().find('.term-count').eq(0).text();
		var tempIcon = $(this).children().find('.term-icon img').eq(0).attr('src');
		if (!tempIcon) { 
			//console.log('fire'); 
			//tempIcon = $(this).parentsUntil( $("ol.sortable"), "li" ).find('.term-icon img').eq(0).attr('src'); 
      tempIcon = $(this).children().find('.term-icon').eq(0).text();
			//console.log(tempIcon);
		}

		if(i<1) { termTree +='{'; }
		else { termTree +=',{';}

		termTree +='"term_id":"'+this.id+'","name":"'+tempName+'","term_order":"'+i+'","parent":"'+tempParent+'","count":"'+tempCount+'","icon_url":"'+tempIcon+'"}';
		i++;
	});
	termTree += ']';
	//console.log(termTree);
	createTaxTerms(treeParent,postID,termTree);	
}


function diphCatObject(data){
	var catObject = JSON.parse(data);
	var htmlObj = show_props(catObject);
	//console.log('diphcat');
	return htmlObj;
}
function show_props(obj) {
	var htmlStart = '';
    var result = $('<div class="cat-list"><ol class="sortable"></ol></div>');

    var countTerms = Object.keys(obj).length; 
	for(i=0;i<countTerms;i++) {
		if(obj[i].parent==0) {
			
			$(result).prepend('<h2 id="'+obj[i].term_id+'">'+obj[i].name+'</h2><p class="default-marker">Pick default icon or color. <i class="icon-picture pick-default pull-right"></i></p>');
			//console.log('title');
		}
		else if($('ol.sortable li#'+obj[i].parent, result).length>0) {
			
			$('ol.sortable li#'+obj[i].parent, result).append('<ol><li id="'+obj[i].term_id+'"><div></div></li></ol>');
			$('li#'+obj[i].term_id+' div', result).append('<span class="disclose"><span></span></span>');
			$('li#'+obj[i].term_id+' div', result).append('<span class="term-name '+obj[i].parent+'">'+ obj[i].name + '</span>');		
			$('li#'+obj[i].term_id+' div', result).append('<span class="term-count"> ' + obj[i].count + '</span>');

	
		}
		else {

			//img.click(myClickHandler);

			$('ol.sortable', result).append('<li id="'+obj[i].term_id+'"><div></div></li>');
			$('li#'+obj[i].term_id+' div', result).append('<span class="disclose"><span></span></span>');
			$('li#'+obj[i].term_id+' div', result).append('<span class="term-name">'+ obj[i].name + '</span>');		
			$('li#'+obj[i].term_id+' div', result).append('<span class="term-count"> ' + obj[i].count + '</span>');
			if(obj[i].icon_url!='undefined'&&obj[i].icon_url!='') {
				//console.log('before:'+obj[i].icon_url+'after');
        if(obj[i].icon_url.substring(0,1)=='#') {
          $('li#'+obj[i].term_id+' div', result).append('<span class="term-icon">'+obj[i].icon_url+'</span>');
        }
        else {
				  $('li#'+obj[i].term_id+' div', result).append('<span class="term-icon"><img src="'+obj[i].icon_url+'" height="20px" /></span>');
        }
			}
			else {
				$('li#'+obj[i].term_id+' div', result).append('<span class="term-icon">Pick Icon</span>');
        //$('li#'+obj[i].term_id+' div', result).append('<span class="term-color">Pick Color</span>');
			}
		}
	}
    
    
    return result;
}

//AJAX functions
function updateProjectSettings(){
	projectID = postID;
	var settingsData = $('#project_settings').val();
	jQuery.ajax({
        type: 'POST',
        url: ajax_url,
        data: {
            action: 'diphSaveProjectSettings',          
            project: projectID,
            settings: settingsData
        },
        success: function(data, textStatus, XMLHttpRequest){
            //console.log(textStatus);
            //console.log(data);
        
        },
        error: function(XMLHttpRequest, textStatus, errorThrown){
           alert(errorThrown);
        }
    });
}
function createTaxTerms(treeParentID,projectID,taxTerms) {
	var termData = taxTerms;
	jQuery.ajax({
        type: 'POST',
        url: ajax_url,
        data: {
            action: 'diphCreateTaxTerms',
            mote_name: treeParentID,
            project: projectID,
            terms: termData
        },
        success: function(data, textStatus, XMLHttpRequest){
            //console.log(textStatus);
            //console.log(JSON.parse(data));
            
            //

        },
        error: function(XMLHttpRequest, textStatus, errorThrown){
           alert(errorThrown);
        }
    });
}	
function createCustomField(projectID,fieldName,fieldValue) { 
  jQuery.ajax({
        type: 'POST',
        url: ajax_url,
        data: {
            action: 'diphAddCustomField',
            project: projectID,
            field_name: fieldName,
            field_value: fieldValue
        },
        success: function(data, textStatus, XMLHttpRequest){
            //console.log(textStatus); 
            $('#projectModal').modal('hide');           
        },
        error: function(XMLHttpRequest, textStatus, errorThrown){
           alert(errorThrown);
        }
    });
}
function findReplaceCustomField(projectID,tempFindCF,tempFindCFvalue,tempReplaceCFvalue){
  jQuery.ajax({
        type: 'POST',
        url: ajax_url,
        data: {
            action: 'diphFindReplaceCustomField',
            project: projectID,
            field_name: tempFindCF,
            find_value: tempFindCFvalue,
            replace_value: tempReplaceCFvalue
        },
        success: function(data, textStatus, XMLHttpRequest){
            //console.log(textStatus); 
            $('#projectModal').modal('hide');           
        },
        error: function(XMLHttpRequest, textStatus, errorThrown){
           alert(errorThrown);
        }
    });
}
function deleteCustomField(projectID,deleteField) { 
  jQuery.ajax({
        type: 'POST',
        url: ajax_url,
        data: {
            action: 'diphDeleteCustomField',
            project: projectID,
            field_name: deleteField
        },
        success: function(data, textStatus, XMLHttpRequest){
            //console.log(textStatus); 
            $('#projectModal').modal('hide');           
        },
        error: function(XMLHttpRequest, textStatus, errorThrown){
           alert(errorThrown);
        }
    });
}
 
function deleteTerms(projectID,termName) { 
  jQuery.ajax({
        type: 'POST',
        url: ajax_url,
        data: {
            action: 'diphDeleteTerms',
            project: projectID,
            term_name: termName
        },
        success: function(data, textStatus, XMLHttpRequest){
            //console.log(textStatus);
            $('#deleteModal').modal('hide');            
        },
        error: function(XMLHttpRequest, textStatus, errorThrown){
           alert(errorThrown);
        }
    });
} 
function diphGetCustomFields(projectID) {
  jQuery.ajax({
        type: 'POST',
        url: ajax_url,
        data: {
            action: 'diphGetCustomFields',
            project: projectID
        },
        success: function(data, textStatus, XMLHttpRequest){
            //console.log(data);
            updateCustomFieldList(data);
        },
        error: function(XMLHttpRequest, textStatus, errorThrown){
           alert(errorThrown);
        }
    });

}
function diphGetMoteValues(mote,projectID,loadLegend) {
	//console.log(moteName);

	jQuery.ajax({
        type: 'POST',
        url: ajax_url,
        data: {
            action: 'diphGetMoteValues',
            project: projectID,
            mote_name: mote
        },
        success: function(data, textStatus, XMLHttpRequest){
            //console.log(textStatus);
            //console.log(JSON.parse(data));
            
            if(loadLegend && data) { 
              createLegend(mote['name'],data); 
            }
            //

        },
        error: function(XMLHttpRequest, textStatus, errorThrown){
           alert(errorThrown);
        }
    });
}	
});