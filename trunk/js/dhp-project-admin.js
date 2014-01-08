// PURPOSE: Handle functions for Edit Project admin page
//          Loaded by add_dhp_project_admin_scripts() in dhp-project-functions.php
// ASSUMES: dhpDataLib is used to pass parameters to this function via wp_localize_script()
//          WP edit code creates HTML DIV whose ID #project_settings which will contain that 
// USES:    JavaScript libraries jQuery, jQuery UI (for drag-drop), Underscore, Bootstrap ...
// TO DO:   Creates too many global variables -- put these within scope of this JS function

jQuery(document).ready(function($) {

  //console.log(dhpDataLib);

  var ajax_url  = dhpDataLib.ajax_url;
  var projectID = dhpDataLib.projectID;

  var projectObj = new Object();         // Initialized in initializeProjectObj() but only updated by saveProjectSettings() when user selects Save button
    // Create new empty settings
  projectObj['project-details'] = new Object();
  projectObj['entry-points'] = new Object();
  projectObj['motes'] = new Object();
  projectObj['views'] = new Object();

     // Data types supported for motes
  var dataTypes = ['Text','Exact Date','Date Range','Lat/Lon Coordinates','File','Image'];

    // Screen options tab on T-L
  $('#screen-meta-links a').click(function(){
    $('#screen-options-wrap').removeClass('hidden');
  });
  // console.log("testing dev");

  //$('#hidden-layers').show();

    // Collect list of matching HTML elements where base layers to go
  var BASE_LAYERS = $('#hidden-layers .base-layer').map(function(){
    return $(this);
  });
  var OVERLAYS = $('#hidden-layers option').clone();
  //console.log(BASE_LAYERS);

    //Assign listener to icons loaded by php
  $('.dhp_icon').click(function() {
  	if($(this).hasClass('selected')==false){
  		var imgs = $(this).find('img').attr('src');
  		$('#icon-cats ul').append('<li id="' + $(this).attr('id') + '"><img src="'+ imgs + '"/><input type="text" id="icons_' + $(this).attr('id') + '"/><span class="remove">X</span></li>');
  		$(this).toggleClass('selected');
  		assignListeners(this);
  	}
  });
  // $(window).resize(function() {
  // 	resizeTB();
  //  });

    // Prepare Bootstrap modal popover on Publish button (called below if not saved)
  $('#publish').popover({
      title:'Project requires save',
      content:'Don\'t forget to save your project(red button on the left).',
      placement:'left',
      trigger: 'manual'
    });

    // Check to see if changes have been made without Saving project
  $('#publish').click(function(e){
    if($('#save-btn').hasClass('btn-danger')){
        // Don't allow Publish w/o Save
      $('#publish').popover('show');
      e.preventDefault();
    }
  });

  loadSelectedIcons();


    // Handle Create Entry Point > Map
  $('#add-map').click(function(){
    var mapCount  = countEntryPoints('map') +1;
      // Maximum of 3 maps allowed
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
      setTimeout(function () { $('#map2-tab').popover('hide'); }, 3000);

    } else {
      projectNeedsToBeSaved();
      epsettings = '';
      buildHTMLForEntryPoint('map',epsettings);
      //show tab/content after loading
      $('#map'+mapCount+'-tab a').tab('show');
    }
  });

    // Handle Create Entry Point > Timeline
  // $('#add-timeline').click(function(){
  //   var timelineCount  = countEntryPoints('timeline') +1;
  //   if(timelineCount==2) {
  //     var options = { 
  //       animation: true, 
  //       placement:'right',
  //       title:'Timeline limit reached',
  //       content:'Maximum of one timeline are allowed currently.',
  //       trigger:'manual',
  //       delay: { show: 500, hide: 100 }
  //     }
  //     $('#timeline1-tab').popover(options);
  //     $('#timeline1-tab').popover('show');
  //     $('#timeline1-tab a').tab('show');
  //     setTimeout(function () {
  //       $('#timeline1-tab').popover('hide');
  //     }, 3000);
  //   } else {
  //     projectNeedsToBeSaved();
  //     epsettings = '';
  //     buildHTMLForEntryPoint('timeline',epsettings);
  //     //show tab/content after loading
  //     $('#timeline'+timelineCount+'-tab a').tab('show');
  //   }    
  // });

    // Handle Create Entry Point > A/V Transcript
  $('#add-transcript').click(function(){
    var transcriptCount  = countEntryPoints('transcript') +1;
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
    } else {
      projectNeedsToBeSaved();
      epsettings = '';
      buildHTMLForEntryPoint('transcript',epsettings);
      //show tab/content after loading
      $('#transcript'+transcriptCount+'-tab a').tab('show');
    }    
  });

    // + button on Motes tab (for creating new custom field)
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
        createCustomField(tempNewCFname,tempNewCFvalue);
      } else {
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
      <input class="span4 find-custom-field-value" type="text" name="new-custom-field-name" placeholder="Find" /><input type="checkbox" class="filter-replace-all"> Replace all\
      <input class="span4 replace-custom-field-value" type="text" name="new-custom-field-value" placeholder="Replace" />\
      <p>Filter by: <input type="checkbox" class="filter-active"></p>\
      <select name="filter-fields" class="filter-fields"></select>\
      <select name="filter-field-values" class="filter-field-values"></select>\
    </div>\
    <div class="modal-footer">\
      <button class="btn" data-dismiss="modal" aria-hidden="true">Close</button>\
      <button class="btn btn-primary" id="find-custom-field" aria-hidden="true">Find & Replace</button>\
    </div>');
    $('#projectModal .custom-fields').append($('#create-mote select.custom-fields').clone().html());
    
    $('#projectModal .filter-fields').append($('#create-mote select.custom-fields').clone().html());

    $('.filter-fields').on('change',function(e){
      var tempFindValues = $('.filter-fields option:selected').val();
      console.log(tempFindValues)
      dhpGetFieldValues(tempFindValues);
    });

    $('.find-custom-field-value').on('focus',function(e){
      $('.undone-warning').remove();
      $('#projectModal .modal-body').append('<div class="alert alert-error undone-warning"><p>Warning! This action can not be undone.</p></div>');
    });

    $('#find-custom-field').click(function(e){
      e.preventDefault();
      var tempFindCFvalue = $('#projectModal .find-custom-field-value').val();
      var tempReplaceCFvalue = $('#projectModal .replace-custom-field-value').val();
      var tempCFName = $('#projectModal .custom-fields option:selected').val();
      var tempFilter = $('#projectModal .filter-fields option:selected').val();
      var tempFilterValue = $('#projectModal .filter-field-values option:selected').val();
      var filterTrue = $('#projectModal .filter-active').prop('checked');
      var replaceAll = $('#projectModal .filter-replace-all').prop('checked');
      // console.log("is it "+filterTrue)


      if(tempFindCFvalue&&!filterTrue) {
        // console.log('just find all');
        findReplaceCustomField(tempCFName,tempFindCFvalue,tempReplaceCFvalue);
      } else if(tempFindCFvalue&&tempFilterValue&&filterTrue){
        // console.log('find by filter');
        updateCustomFieldFilter(tempCFName,tempFindCFvalue,tempReplaceCFvalue,tempFilter,tempFilterValue);
      } else {
        if(replaceAll) {
          replaceCustomFieldFilter(tempCFName,tempReplaceCFvalue,tempFilter,tempFilterValue);
        } else {
          $('#projectModal .modal-body .alert-error').remove();
          $('#projectModal .modal-body').append('<div class="alert alert-error"><p>Need a value to search for.</p></div>');
        }
      }
    });
    //$('#projectModal .modal-body .alert-error').remove();
  }); // #search-replace-btn.click

    // Handle Trash Can icon (Delete Mote in all Markers)
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

      // Handle confirm delete button in popup
    $('#delete-custom-field').click(function(e){
      e.preventDefault();
      //console.log($('#projectModal .custom-fields option:selected').val());
      var tempNewCFname = $('#projectModal .custom-fields option:selected').val();
       $('#delete-custom-field').text('deleting...');
      deleteCustomField(tempNewCFname);
    });
  });

  //console.log($('#project_settings').val());

    // Parse Project settings
  var settings = $('#project_settings').text();
  if(settings) {
    initializeProjectObj(settings);

    // Or else create empty settings for new Project
  } else {
    initializeProjectObj(null);
    saveProjectSettings();
  }

  $('#save-btn').click(function(){
    saveProjectListeners();
  });


  //  =============  Utility Functions ============================

    // RETURNS: Number of Entry Points that the user has defined
  function countEntryPoints(type){
    var count = $('#entryTabs .ep-'+type);
    //console.log(count.length);
    return count.length;
  }

    // PURPOSE: Store updated Custom Field data list in Project Object
    // TO DO:   Update after user adds a new custom field?
  function updateCustomFieldList(cfdata){
    projectObj['project-details']['marker-custom-fields'] = _.values(JSON.parse(cfdata));
  }

    // PURPOSE: Initialize all Project settings in projectObj
    // INPUT:   settingString = String representing project settings (needs to be parsed), or null if none
  function initializeProjectObj(settingString) {
    // $('#motes #create-mote .cf-type').change(function(){
    //     if($(this).find("option:selected").text()=='Dynamic Data Field'){
    //       //console.log($(this).find("option:selected").text());
    //     } else {

    //     }
    //   });
    // console.log("settingString = " + settingString);

    var pSettings;

    if (settingString !== null) {
      pSettings = JSON.parse(settingString);
    } else {
      pSettings = null;
    }

    if (pSettings && pSettings['project-details']) {
        // Ensure project IDs match
      if (pSettings['project-details']['id'] !== projectID) {
          throw new Error("Project ID "+projectID+" sent by WP does not match ID "+pSettings['project-details']['id']+" in project settings");
      }
      projectObj['project-details']['id'] = pSettings['project-details']['id'];
      projectObj['project-details']['name'] = pSettings['project-details']['name'];
      dhpGetCustomFields();
    } else {
      projectObj['project-details']['id'] = projectID;
    }

      // Create handlers to load data in order. Entry points are dependent on motes.
    $('body').bind('load-motes', function(e) {
      if(pSettings && pSettings['motes']) {
        insertHTMLForMoteList(pSettings['motes']);
      }
    });
    $('body').bind('load-entry-points', function(e) {
      if(pSettings && pSettings['entry-points']) {
        buildEntryPoints(pSettings['entry-points']);
      }
    });

    // $('body').bind('load-shared-motes', function(e) {
    //   if(pSettings['shared-motes']) {
    //     buildSharedMotes(pSettings['shared-motes']);
    //   }
    //   return;
    // });
    $('body').bind('load-views', function(e) {
      //console.log(data['views']);
      if (pSettings && pSettings['views']) {
        projectObj['views'] = pSettings['views'];
      }
      builtHTMLForViewsTab(projectObj['views']);
      return;
    });
    $('body').bind('add-save-alert', function(e) {
      $('#dhp_settings_box input').on('change',function(){
        projectNeedsToBeSaved();
      });
      $('#dhp_settings_box select').on('change',function(){
        projectNeedsToBeSaved();
      });
      return;
    });

    //fire in order, according to dependencies
    $('body').trigger('load-motes');
    $('body').trigger('load-entry-points');
    // $('body').trigger('load-shared-motes');
    $('body').trigger('load-views');
    $('body').trigger('add-save-alert');

    //$('#create-mote .custom-fields').replaceWith(buildHTMLForCustomFields());
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
  } // initializeProjectObj()


    // PURPOSE: Create placeholder for new mote based on UI fields
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

      insertHTMLForMoteList(newMoteSettings);
      clearCreateMoteValues();

      // Don't allow unless mote is given a name
    } else {
      $('#create-mote .mote-name').after('<span class="help-inline mote-error label label-important" >Name is required</span>');
    }
  }


  function countMotes(){
    var count = $('.accordion-group');
    //console.log(count.length);
    return count.length;
  }


    // PURPOSE: Clear out name and delim fields after new mote created
  function clearCreateMoteValues() {
    $('#create-mote .mote-name').val('');
    $('#create-mote .delim').val('');
    //$('#create-mote .custom-fields option').eq(0).attr('selected','selected');
  }


    // PURPOSE: Save array of entry points, builds the html for them and preload the data
  function buildEntryPoints(entryPoints) {
    projectObj['entry-points'] = entryPoints;
    _.each(entryPoints, function(theEP) {
      buildHTMLForEntryPoint(theEP["type"], theEP["settings"]);
    });
    // for (var i =0; i < Object.keys(entryPoints).length; i++) {
    // //console.log(epObject[i]["type"])
    //   if(entryPoints[i]["type"]=="map") {
    //     //console.log("oh yeah itsa map")
    //   }
    //   if(entryPoints[i]["type"]=="timeline") {
    //     //console.log("timeline...no way")
    //   }
    //   buildHTMLForEntryPoint(entryPoints[i]["type"],entryPoints[i]["settings"])
    // }
  }


    // PURPOSE: Build the HTML for a single Entry Point, given its type and settings
    // INPUT:   type = the name of a valid entry point type: 'map', 'transcript'
  function buildHTMLForEntryPoint(type, settings){
    var epCount  = countEntryPoints(type) +1;
    if(!settings) {
      settings = new Object();
    }
      // Create tab from top left
    $('#entryTabs').append('<li id="'+type+epCount+'-tab"><a href="#'+type+'-'+epCount+'" class="ep-'+type+'" data-toggle="tab">'+type+' '+epCount+'</a></li> ')

      // Create content area...load settings
    switch (type) {
    // case "timeline":
    //     //settings['start-date'] = '01/01/2012'
    //     entryTabContent = '<div class="input-prepend input-append">\
    //                           <input class="span4" type="text" name="start-date" id="start-date" placeholder="Start Date" value="'+createIfEmpty(settings['start-date'])+'" />\
    //                           <span>-</span>\
    //                           <input class="span4" type="text" name="end-date" id="end-date" placeholder="End Date" value="'+createIfEmpty(settings['end-date'])+'" />\
    //                           </div>\
    //                           <label>Timeline Data</label>\
    //                         <select name="timeline-mote" id="timeline-mote">'+buildHTMLForMotes(settings['timeline-data'])+'\
    //                         </select>';
    //   break;
    case 'transcript':
      //settings['start-date'] = '01/01/2012';
      //need audio, transcript, timecode
      entryTabContent = '<label>Audio URL</label>\
                          <select name="av-transcript-audio" id="av-transcript-audio">'+buildHTMLForMotes(settings['audio'])+'\
                          </select>\
                          <label>Transcript</label>\
                          <select name="av-transcript-txt" id="av-transcript-txt">'+buildHTMLForMotes(settings['transcript'])+'\
                          </select>\
                          <label>Transcript 2</label>\
                          <select name="av-transcript-txt2" id="av-transcript-txt2">'+buildHTMLForMotes(settings['transcript2'])+'\
                          </select>\
                            <label>Time Stamp(clip)</label>\
                          <select name="av-transcript-clip" id="av-transcript-clip">'+buildHTMLForMotes(settings['timecode'])+'\
                          </select>';
      break;
    case 'map':
      entryTabContent = '<div class="row-fluid vars">\
                      <div class="cords span5">\
                          <label>Map Center (Lat/Lon)</label>\
                          <div class="input-prepend input-append">\
                            <input class="span5" type="text" name="lat" id="lat" placeholder="Lat" value="'+createIfEmpty(settings['lat'])+'" />\
                            <input class="span5" type="text" name="lon" id="lon" placeholder="Lon" value="'+createIfEmpty(settings['lon'])+'" />\
                          </div>\
                          <label>Initial Zoom</label>\
                          <input type="text" name="zoom" id="zoom" placeholder="Zoom" value="'+createIfEmpty(settings['zoom'])+'" />\
                      </div>\
                      <div class="span7 layers">\
                        <ul class="layer-list">\
                          '+loadLayers(settings['layers'])+'\
                          </ul>\
                      <button class="btn btn-success add-layer" type="button">Add Layer</button>\
                      </div>\
                  </div>\
                  <div class="row-fluid vars">\
                      <div class="span5">\
                      	<label>Marker Layer(Lat/Lon) <span class="badge badge-info"><i class="icon-question-sign icon-white"></i></span></label>\
                          <select class="span12" name="marker-layer" id="marker-layer">'+buildHTMLForMotes(settings['marker-layer'],'Lat/Lon Coordinates')+'\
                          </select>\
                      </div>\
                      <div class="span7">\
                      	<label>Legends</label>\
                          <ul class="legend-list">\
                          '+buildHTMLForLegendList(settings['filter-data'])+'\
                          </ul>\
                          <button class="btn btn-success add-legend" type="button">Add Legend</button>\
                      </div>\
                  </div>';
          break;
    }

    $('#entryTabContent').append('<div class="tab-pane fade in ep map" id="'+type+'-'+epCount+'"><button type="button" class="close" >&times;</button>\<p>'+entryTabContent+'</p></div>');

    //set sliders
    _.each($('.layer-list li'), function(layer) {
      var tempOpacity = 1;
      if($(layer).find('select option:selected').attr('data-opacity')) {
        tempOpacity = $(layer).find('select option:selected').attr('data-opacity');
      }
      $(layer).find('.layer-opacity').slider({
          range: false,
          min: 0,
          max: 1,
          step:.05,
          values: [ tempOpacity ],
          slide: function( event, ui ) {            
            $(this).parents('li').find('select option:selected').attr('data-opacity', ui.values[ 0 ]);
            $(this).next('.slider-value').text( "" + ui.values[ 0 ] );
          }
        }); 
    });


      // Handle Delete button for Entry Point
    $('#'+type+'-'+epCount+ ' .close').click(function(e){
      e.stopPropagation();
      e.preventDefault();

        // 2nd stage -- user has confirmed
      if($(this).text()=='Confirm Delete') {
        projectNeedsToBeSaved();
        $('#entryTabs .active').remove();
        $(this).closest('.ep').remove();
        // 1st stage -- ask user to confirm
      } else {
        $(this).text('Confirm Delete');
      }
    });

      // Handle clicking elsewhere in Entry Point tab area to cancel delete
    $('#'+type+'-'+epCount+ '.ep').click(function(e){
      if($(this).find('.close').text()=='Confirm Delete') {
        $(this).find('.close').html('&times;');
      }
    });

      // Handle deleting layer
    $('.delete-layer').click(function(){   
      //console.log('delete')
      $(this).closest('li').remove();
      //bindLegendEventsInEPTab();
    });

      // Handle button for loading map -- doesn't seem to be used any longer
    // $('.load-map').click(function(){
    //   $('#projectModal').empty();
    //   $('#projectModal').append('<div class="modal-header">\
    //     <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>\
    //     <h3 id="myModalLabel">Map Setup</h3>\
    //   </div>\
    //   <div class="modal-body">\
    //     <p>Zoom and drag to set your map\'s initial position.</p>\
    //     <div id="map_canvas"></div>\
    //   </div>\
    //   <div class="modal-footer">\
    //     <button class="btn" data-dismiss="modal" aria-hidden="true">Close</button>\
    //     <button class="btn btn-primary">Save changes</button>\
    //   </div>');
    // });

    bindLegendEventsInEPTab();

    $('.add-legend').unbind('click');
    $('.add-legend').click(function(){   
      $('.legend-list').append(buildHTMLForALegend(null, 0));
      bindLegendEventsInEPTab();
      projectNeedsToBeSaved();
    });
    $('.add-layer').unbind('click');
    $('.add-layer').click(function(){  
      var layerHTML = addNewLayer() 
      $('.layer-list').append(layerHTML);
        // Create a slider to control opacity
      $(layerHTML).find('.layer-opacity').slider({
        range: false,
        min: 0,
        max: 1,
        step:.05,
        values: [ 1 ],
        slide: function( event, ui ) {            
          $(this).parents('li').find('select option:selected').attr('data-opacity', ui.values[ 0 ]);
          $(this).next('.slider-value').text( "" + ui.values[ 0 ] );
        }
      });
      projectNeedsToBeSaved();
      //bindLegendEventsInEPTab();
    });    
  } // buildHTMLForEntryPoint()

    // RETURNS: First entry point within parentObj of type objType
  function getEntryPointByType(epList,epType) {
    return _.find(epList, function(theEP) { return theEP.type == epType });
  }

    // PURPOSE: Creates Post View section of Views tab
    // INPUT:   JSON object representing "views" portion of project settings (could be empty if new)
  function builtHTMLForPostView(viewObject) {
    var markerTitle = '';
    var markerContent ='';
    if(viewObject['post-view-title']) {
      markerTitle = viewObject['post-view-title'];
    }
    
    $('.marker-view').append('<select name="post-view-title" class="title-custom-fields save-view"><option selected="selected" value="the_title" >Marker Title</option>'+buildHTMLForMotes(markerTitle)+'</select>');
    $('.marker-view').append('<p>Pick the motes to display in single page view.</p><ul id="post-content-view"></ul><button class="btn btn-success add-mote-content" type="button">Add</button>');

    if(viewObject['post-view-content']){
      var tempVar = $('<div/>');
      _.each(viewObject['post-view-content'],function(val){
        $(tempVar).append(addContentMotes(val));
      });
      $('#post-content-view').append(tempVar);
    }
    $('.delete-content-mote').unbind('click');
    $('.delete-content-mote').on('click',function(){
          $(this).parent('li').remove();
           projectNeedsToBeSaved();
    });
    $('.add-mote-content').click(function(e){
        //console.log($('#projectModal .custom-fields option:selected').val());
        $('#post-content-view').append(addContentMotes());
        projectNeedsToBeSaved();
        $('.delete-content-mote').unbind('click');
        $('.delete-content-mote').on('click',function(){
          $(this).parent('li').remove();
        });
      });
  } // builtHTMLForPostView()

    // INPUT:   theView = object containing parameters corresponding to "views" portion of project settings
  // function updateViewObjectFormat(theView) {
  //   var newViewObject = new Object();

  //   console.log('//start viewObject update');

  //   _.each(theView, function(val,key){
  //     console.log(key + ' : '+ val)
  //     if(val instanceof Object == true ) {
  //       console.log(val)
  //     }
  //   });
  //   console.log('//new viewObject format')

  //   newViewObject['projectPage'] = new Object();
  //   newViewObject['projectPage'][0] = new Object();
  //   newViewObject['projectPage'][0].type = 'map';
  //   newViewObject['projectPage'][0].width = theView['map-width'];
  //   newViewObject['projectPage'][0].height = theView['map-height'];
  //   newViewObject['projectPage'][0].fullscreen = theView['map-fullscreen'];
  //   // newViewObject['projectPage'][0].legend = theView['legend-pos'];

  //   newViewObject['popupModals'] = new Object();
  //   newViewObject['popupModals']['title'] = theView['title'];
  //   newViewObject['popupModals']['ep'] = theView['modal-ep'];
  //   newViewObject['popupModals']['motes'] = theView['content'];
  //   newViewObject['popupModals']['links'] = new Object();
  //   newViewObject['popupModals']['links'][0] = new Object();
  //   newViewObject['popupModals']['links'][1] = new Object();
  //   newViewObject['popupModals']['links'][0].link = theView['link'];
  //   newViewObject['popupModals']['links'][0].title = theView['link-label'];;
  //   newViewObject['popupModals']['links'][1].link = theView['link2'];
  //   newViewObject['popupModals']['links'][1].title = theView['link2-label'];;

  //   newViewObject['markerPage'] = new Object();
  //   newViewObject['markerPage'].title = theView['post-view-title'];
  //   newViewObject['markerPage'].motes = theView['post-view-content'];

  //   console.log(newViewObject);
  //   console.log('//end viewObject update')
  // }

    // PURPOSE: Called to create HTML for Main View and Modal View sections of Views tab
    // INPUT:   viewObject = JSON object representing "views" portion of project settings
  function builtHTMLForViewsTab(viewObject){
    if(!viewObject) {
      viewObject = new Object();
    } 
    //console.log(projectObj);

    //setup layout for main view
    var mapView,legendView;
    mapView = viewObject;

      // set HTML values for each UI component that matches
    _.each(mapView,function(val,key) {
      $('.'+key).val(val);
      if(viewObject['map-fullscreen']) {
        $('.'+key).attr('checked','checked');
      }
    });

    builtHTMLForPostView(viewObject);

    // updateViewObjectFormat(viewObject);

    // Setup layout for frontend modals
    $('.setup-modal-view').click(function(){
      var title = '';
      console.log(viewObject);

      var content = [];
      var linkTarget,linkTarget2,linkTargetLabel,linkTarget2Label;
      if(viewObject['title']) {
        title = viewObject['title'];
      }
      if(viewObject['link']) {
        linkTarget = viewObject['link'];
        if(viewObject['link-label']) {
          linkTargetLabel = 'value="'+viewObject['link-label']+'"';
        }
      }
      if(viewObject['link2']) {
        linkTarget2 = viewObject['link2'];
        if(viewObject['link2-label']) {
          linkTarget2Label = 'value="'+viewObject['link2-label']+'"';
        }
      }
      $('#projectModal').empty();
      $('#projectModal').append('<div class="modal-header">\
        <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>\
        <h3 id="myModalLabel">Choose Title: <select name="custom-fields" class="title-custom-fields"><option selected="selected" value="the_title" >Marker Title</option>'+buildHTMLForMotes(title)+'</select></h3>\
      </div>\
      <div class="modal-body">\
        <p>Pick the entry points to display in the modal.</p>\
        <ul id="modal-body-ep">\
        </ul><button class="btn btn-success add-modal-ep" type="button">Add Entry Point</button>\
        <p>Pick the motes to display in the modal.</p>\
        <ul id="modal-body-content">\
        </ul><button class="btn btn-success add-modal-content" type="button">Add Mote</button>\
        <p>Setup Links</p>\
        <span class="pull-left" >Link 1: <input type="text" name="link-legends-label" class="link-legends-label" placeholder="Label" '+linkTargetLabel+'/><select name="link-legends" class="link-legends">'+buildHTMLForSetupLinks(linkTarget)+'</select></span>\
        <span class="pull-left" >Link 2: <input type="text" name="link-legends2-label" class="link-legends2-label" placeholder="Label" '+linkTarget2Label+'/><select name="link-legends2" class="link-legends2">'+buildHTMLForSetupLinks(linkTarget2)+'</select></span>\
      </div>\
      <div class="modal-footer">\
        <button class="btn" data-dismiss="modal" aria-hidden="true">Cancel</button>\
        <button class="btn btn-primary" id="save-modal-view" aria-hidden="true">Confirm</button>\
      </div>');
      //$('#projectModal .title-custom-fields').append($('#create-mote select.custom-fields').clone().html());
      //$('#projectModal .title-custom-fields').prepend('<option name="the_title" value="the_title">Marker Title</option>');
      if(viewObject['content']) {
        //each
        _.each(viewObject['content'],function(val,index) {
          //console.log(val);
          $('#modal-body-content').append(addContentMotes(val));
        });
        $('.delete-content-mote').unbind('click');
        $('.delete-content-mote').on('click',function(){
          $(this).parent('li').remove();
        });
        //title = viewObject['title'];
      }
      if(viewObject['modal-ep']) {
        //each
        _.each(viewObject['modal-ep'],function(val,index) {
          //console.log(val);
          $('#modal-body-ep').append(addEntryPoint(val));
        });
        $('.delete-ep-view').unbind('click');
        $('.delete-ep-view').on('click',function(){
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
        viewObject['modal-ep'] = new Object();
        $('#projectModal .content-ep option:selected').each( function(index) {
          viewObject['modal-ep'][index] = $(this).val();
        });
        viewObject['content'] = new Object();
        $('#projectModal .content-motes option:selected').each( function(index) {
          viewObject['content'][index] = $(this).val();
        });
        viewObject['link'] = $('#projectModal .link-legends option:selected').val();
        viewObject['link-label'] = $('#projectModal .link-legends-label').val();
        viewObject['link2'] = $('#projectModal .link-legends2 option:selected').val();
        viewObject['link2-label'] = $('#projectModal .link-legends2-label').val();
        // $('#save-modal-view').text('saving...');

         //console.log(viewObject);
        projectObj['views'] = viewObject;
        projectNeedsToBeSaved();
        $('#projectModal').modal('hide'); 
      });

      $('.add-modal-content').click(function(e){
        //console.log($('#projectModal .custom-fields option:selected').val());
        $('#modal-body-content').append(addContentMotes());
      });

      $('.add-modal-ep').click(function(e){
        //console.log($('#projectModal .custom-fields option:selected').val());
        $('#modal-body-ep').append(addEntryPoint());
        $('.delete-ep-view').on('click',function(){
          $(this).parent('li').remove();
        });
      });
    });
  } // builtHTMLForViewsTab()

  function addContentMotes(selected) {
    var contentMote = '<li><select name="content-motes" class="content-motes">\
    '+buildHTMLForMotes(selected)+'</select> <button class="btn btn-danger delete-content-mote" type="button">-</button></li>';

    return contentMote;
  }

  function addEntryPoint(selected) {
    var contentEP = '<li><select name="content-ep" class="content-ep">\
    '+getEntryPoints(selected)+'</select> <button class="btn btn-danger delete-ep-view" type="button">-</button></li>';

    return contentEP;
  }

    // RETURNS: HTML string of dropdown options for all Entry Points defined for Project
    // ASSUMES: Can read entry points from projectObj 
  function getEntryPoints(selected) {
    // console.log(projectObj['entry-points']);
    var epItems = '';

    _.each(projectObj['entry-points'], function(val,key){
      var isSelected = '';
      if(selected==val['type']) { isSelected = 'selected'; }
      epItems += '<option name="'+val['type']+'" '+isSelected+' >'+val['type']+'</option>';
    });
    return epItems;
  }

  function loadLayers(layerObject){
    // console.log(layerObject)
    var layerHtml = $('<ul><li><label>Base Layer</label><select name="base-layer" id="base-layer"></select></li></ul>');
    $('select', layerHtml).append($('#hidden-layers .base-layer').clone());

    if(layerObject != null && typeof layerObject === 'object') {
      //console.log('layers'+Object.keys(layerObject).length);
      //"layers": {"0":{"id":"5675","name":"OpenStreetMap"},"1":{"id":"5672","name":"Test Map 2"}}
      for (var i =0; i < Object.keys(layerObject).length; i++) {
        if(i==0) {
          $('select option#'+layerObject[i]['id'], layerHtml).attr('selected','selected');
          $('select option#'+layerObject[i]['id'], layerHtml).attr('data-opacity',layerObject[i]['opacity']);
          $('li', layerHtml).append('<br/><div class="layer-opacity"></div><span class="slider-value">'+layerObject[i]['opacity']+'</span> Opacity</div>');
          $('li', layerHtml).append('<label>Additional Layers</label>');
        }
        else{
          //console.log('second layer')
          $(layerHtml).append(addNewLayer('',layerObject[i]['opacity']));
          $('li',layerHtml).eq(i).find('select option#'+layerObject[i]['id']).attr('selected','selected');
          $('select option#'+layerObject[i]['id'], layerHtml).attr('data-opacity',layerObject[i]['opacity']);
        }
        
      }
    }      
    return $(layerHtml).html();
  }

  function addNewLayer(selected,layerOpacity){
    if(!layerOpacity) {
      layerOpacity = 1;
    }
    var layerLine = $('<li><select name="overlay"></select> <button class="btn btn-danger delete-layer" type="button">-</button><div><div class="layer-opacity"></div><span class="slider-value">'+layerOpacity+'</span> Opacity</div></li>');
    $('select',layerLine).append($('#hidden-layers option').clone());
    $('.delete-layer',layerLine).click(function(){   
      $(this).closest('li').remove();
      //bindLegendEventsInEPTab();
      projectNeedsToBeSaved();
    });
    return layerLine;
  }

  function getAvailableLayers(){
    //console.log($('#hidden-layers'));
    var layersA = $('#hidden-layers').clone();
    return layersA;
  }

    // PURPOSE: Bind all event listeners for Legend buttons on Entry Points tab (with EP selected)
  function bindLegendEventsInEPTab(){
      // Create Legend buttons
    $('.create-legend').unbind('click');
    $('.create-legend').click(function() {
        var moteName = $(this).parent().find('#filter-mote option:selected').val();
        var mote = getMote(moteName);
        // var projectID = projectObj['project-details']['id'];
    // console.log("Creating mote " + moteName + " for Project "+ projectID);

        $('body').append('<!-- Modal -->\
          <div id="createModal" class="modal hide fade" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">\
            <div class="modal-header">\
              <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>\
              <h3 id="myModalLabel">Creating Legend</h3>\
            </div>\
            <div class="modal-body">\
              <p>Creating terms associated with the '+moteName+' legend.</p>\
            </div>\
            <div class="modal-footer">\
            </div>\
          </div>');
        $('#createModal').modal('show');
        //console.log(projectObj['motes'])
        dhpCreateLegendTax(mote,true);
    });

      // Configure Legend buttons
    $('.load-legend').unbind('click');
    $('.load-legend').click(function() {
        var moteName = $(this).parent().find('#filter-mote option:selected').val();
        var mote = getMote(moteName);
        // var projectID = projectObj['project-details']['id'];
        //console.log(projectObj['motes'])
        dhpGetMoteValues(mote);
    });

      // Delete Legend buttons
    $('.delete-legend').unbind('click');
    $('.delete-legend').click(function() {
      var moteName = $(this).parent().find('#filter-mote option:selected').val();
      var createdYet = $(this).parent('li');
      // console.log($(createdYet).children().eq(1));
      var lineID = $(this).closest('li').attr('id');
      if($(createdYet).children().eq(1).hasClass('load-legend')) {
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
                <button class="btn btn-danger delete-confirm">Delete Legend</button>\
              </div>\
            </div>');
        $('#deleteModal').modal('show');
        $('.delete-confirm').click(function(){
          //console.log('delete '+moteName+' now delete terms and children');
          $('#deleteModal .delete-confirm').text('deleting...');
          deleteTerms(moteName);
          $('#'+lineID).remove();
          projectNeedsToBeSaved();
        });
      } else {
        $('#'+lineID).remove();
      }

      $('#deleteModal').on('hidden', function () {     
        $('#deleteModal').remove();
      })
    });  
  } // bindLegendEventsInEPTab()

    // RETURNS: HTML string to represent legendList
  function buildHTMLForLegendList(legendList) {
      var listHtml ='';
      if(legendList) {
        for (var i =0; i < Object.keys(legendList).length; i++) {
          listHtml += buildHTMLForALegend(legendList[i],i+1);
         }
       } else {
        listHtml += buildHTMLForALegend(null, 0); 
      } 
    return listHtml;
  }

    // RETURNS: HTML string to represent theLegend, which is index (1..n) in list
    // INPUT:   theLegend = null if there are no legends yet at all
    //          count = 0 if there are no legends yet at all
  function buildHTMLForALegend(theLegend, count){
    var legendButton = '<button class="btn btn-success load-legend" type="button">Configure</button>';
    if (count == 0) {
      theLegend = '';
      legendButton = '<button class="btn btn-inverse create-legend" type="button">Create</button><button class="btn btn-success load-legend hide" type="button">Configure</button>';
      tempcount = $('.legend-list li').length;
      console.log(tempcount);
      count = tempcount+1;
      //console.log('3legend count '+tempcount[1]);
    }
    //console.log('legend count '+count);
    // console.log(theLegend);
    var legendLine = '<li id="legend-'+count+'"><select name="filter-mote" id="filter-mote">'+buildHTMLForMotes(theLegend,'Text')+'</select>'+
                          legendButton+' <button class="btn btn-danger delete-legend" type="button">Delete</button>\
                          </li>';
    return legendLine;
  }

    // RETURNS: HMTL string to represent option list in Setup Links dropdown options in Modal Views
    // INPUT:   selected is the current selection
    // ASSUMES: That user has configured a Map for the Project
    // TO DO:   Don't require a map!! Rename function

  function buildHTMLForSetupLinks(selected){
    //console.log(mapObject);
    var mapObject = getEntryPointByType(projectObj['entry-points'], 'map');
    var optionHtml = '';
    if(selected=="no-link") {
      optionHtml = '<option name="no-link" value="no-link" selected="selected">No Link</option><option name="marker" value="marker" >Marker Post</option>';
    } else if (selected=="marker") {
      optionHtml = '<option name="no-link" value="no-link" >No Link</option><option name="marker" value="marker" selected="selected" >Marker Post</option>';
    } else {
      optionHtml = '<option name="no-link" value="no-link" >No Link</option><option name="marker" value="marker" >Marker Post</option>'; 
    }

      // For linking to taxonomic pages
    _.each(mapObject['settings']['filter-data'], function(theFilter) {
// console.log("Filter: " + theFilter);
      if(theFilter==selected) {
        optionHtml += '<option name="'+theFilter+'" value="'+theFilter+'" selected="selected" >'+theFilter+'</option>';
      } else {
        optionHtml += '<option name="'+theFilter+'" value="'+theFilter+'" >'+theFilter+'</option>';
      }
    });
    return optionHtml;
  }

    // RETURNS: mote Object associated with Project whose name is moteName
    // ASSUMES: Can use projectObj data
  function getMote(moteName) {
    return _.find(projectObj['motes'], function(thisMote) { return thisMote['name'] == moteName; });
  }

    // RETURNS: HTML string of dropdown options for motes defined by project of a specific type
    // INPUT:   selected is the current selection (name of mote), if any
    //          moteType is the datatype of mote to list, or undefined for any type
    // ASSUMES: Can use projectObj data
  function buildHTMLForMotes(selected, moteType) {
    //console.log(projectObj['motes']);
    var moteOptions = '', selectedTxt;

      // Go through all of the Project's defined motes, find matches on type
    _.each(projectObj['motes'], function(theMote) {
      selectedTxt = (theMote['name'] == selected) ? 'selected="selected"' : '';
      if(!moteType||theMote['type']==moteType)
        moteOptions += '<option value="'+theMote['name']+'" '+selectedTxt+'>'+theMote['name']+'</option>';
    });

    return moteOptions;
  } // buildHTMLForMotes()


  function createIfEmpty(value) {
    if(!value) {
      return '';
    } else {
      return value;
    }
  }

    // PURPOSE: Insert HTML for moteList (corresponding to "motes" of project settings) and preloads the data
  function insertHTMLForMoteList(moteList){
    var moteCount = countMotes();
    for (var i =0; i < Object.keys(moteList).length; i++) {
      //console.log('html for '+moteObject[i]['name']);
      //console.log(i);
      projectObj['motes'][i] = new Object();
      projectObj['motes'][i]['name'] = moteList[i]['name'];
      projectObj['motes'][i]['custom-fields'] = moteList[i]['custom-fields'];
      projectObj['motes'][i]['type'] = moteList[i]['type'];
      projectObj['motes'][i]['delim'] = moteList[i]['delim'];
      moteContent = '<div class="accordion-group" id="group'+(moteCount+i)+'">\
                    <div class="accordion-heading">\
                      <a class="accordion-toggle" data-toggle="collapse" data-parent="#mote-list" href="#collapseMote'+(moteCount+i)+'">\
                        <button type="button" class="close" >&times;</button>\
                        '+moteList[i]['name']+'\
                      </a>\
                    </div>\
                    <div id="collapseMote'+(moteCount+i)+'" class="accordion-body collapse">\
                      <div class="accordion-inner">\
                       <div class="row-fluid vars">\
                      	<div class="span4">\
                       	<input class="mote-name span12" type="text" placeholder="Mote Name" value="'+moteList[i]['name']+'" />\
                       	</div>\
                       	<div class="span8 layers">\
                        <select name="cf-type" class="cf-type">\
                           '+buildHTMLForDataTypes(moteList[i]['type'])+'\
                        </select><span class="help-inline">data type</span>\
                          '+buildHTMLForCustomFields(moteList[i]['custom-fields'])+'\
                        <span class="help-inline">custom field</span>\
                        <label class="checkbox inline">\
                          <input type="checkbox" id="pickMultiple" value="multiple"> Multiple\
                        </label>\
                        <p>\
                        <input class="span4 delim" type="text" name="delim" placeholder="Delimiter" value="'+moteList[i]['delim']+'"/>\
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
        // Handle selection of X in top right
      $('#group'+(moteCount+i)+' .accordion-toggle .close').click(function(e){
        e.stopPropagation();
        e.preventDefault();
        if($(this).text()=='Confirm Delete') {
          $(this).closest('.accordion-group').remove();
        } else {
          $(this).text('Confirm Delete');
        }
      });

        // If user selects mote title, cancel the "Confirm Delete" state
      $('#group'+(moteCount+i)+' .accordion-toggle').click(function(e){
        if($(this).find('.close').text()=='Confirm Delete') {
          $(this).find('.close').html('&times;');
        }
      });
      $('#mote-list #pickMultiple').unbind('click');
      $('#mote-list #pickMultiple').click(function(){
        if($('#mote-list #pickMultiple').is(':checked')) { 
          $('#mote-list .custom-fields').attr('multiple','multiple');
        } else {
          $('#mote-list .custom-fields').removeAttr('multiple');
        } 
      });
    }
  } // insertHTMLForMoteList()

    // PURPOSE: Change Save button to red since project_settings has changed
  function projectNeedsToBeSaved(){
    //$('#save-btn').after()
    $('#save-btn').addClass('btn-danger');
    //console.log('save alert');
    //$('#wpbody-content').css('overflow','visible'); 
    //$('#save-btn').popover({title:'Project requires save',content:'Don\'t forget to save your project',placement:'bottom'});
    //$('#save-btn').popover('show');
  }

    // RETURNS: HTML string to represent possible data types
    // INPUT:   selection is the current selection
  function buildHTMLForDataTypes(selection){
    var dataTypeHTML ='';
    _.each(dataTypes, function(theDataType) {
      dataTypeHTML += '<option value="'+theDataType+'"';
      if(theDataType==selection)
         dataTypeHTML += ' selected="selected"';
      dataTypeHTML += '>'+theDataType+'</option>';
    });
    return dataTypeHTML;
  } // buildHTMLForDataTypes()


  // PURPOSE: Create select list of custom fields for motes
  // RETURNS: HTML string for all of the Custom Fields (for this Project)
  // INPUT:   selected is current selection (single name or list of them)
  // ASSUMES: List of these fields is embedded in HTML under create-mote ID as .custom0-fields options
  function buildHTMLForCustomFields(selected){
    if(!selected) { selected = '';}
    var trimSelected = selected.split(',');

    cflistString = $('#create-mote').find('.custom-fields option').map(function() {
      return $(this).val();
    }).get().join();
    cflist = cflistString.split(',');
    //cflist = ['Audio Url','lat','lon','alt_location','date_range','Interviewee']

      // is there a multiple selection?
    if (trimSelected.length>1) {
      cflistHtml = '<select name="custom-fields" class="custom-fields" multiple="multiple">'
      for (var i =0; i < Object.keys(cflist).length; i++) {
        selectedTag = '';
        for (var j =0; j < Object.keys(trimSelected).length; j++) {                 
          if(trimSelected[j]==cflist[i]) { selectedTag = 'selected="selected"';} 
        }
        cflistHtml += '<option value="'+cflist[i]+'" '+selectedTag+'>'+cflist[i]+'</option>';
      }
      cflistHtml += '</select>';

    } else {
      cflistHtml = '<select name="custom-fields" class="custom-fields">';
      for (var i =0; i < Object.keys(cflist).length; i++) {
        if(selected==cflist[i]) { selectedTag = 'selected="selected"' } else { selectedTag = ''}
          cflistHtml += '<option value="'+cflist[i]+'" '+selectedTag+'>'+cflist[i]+'</option>';
        }
        cflistHtml += '</select>';
      }
    return cflistHtml;
  }

  //create select list of project custom fields for motes(dynamic data type)
  // function customFieldDynamicOption(selected){
  //   if(!selected){ selected = '';}
  //   var trimSelected = selected.split(',');
  //   cflistString = $('#shared #create-mote').find('.custom-fields option').map(function() {
  //     return $(this).val();
  //   }).get().join();
  //   cflist = cflistString.split(',');
  //   //cflist = ['Audio Url','lat','lon','alt_location','date_range','Interviewee']
  //   if (trimSelected.length>1) {
  //     cflistHtml = '<select name="custom-fields" class="custom-fields" multiple="multiple">'
  //     for (var i =0; i < Object.keys(cflist).length; i++) {
  //       selectedTag = ''
  //       for (var j =0; j < Object.keys(trimSelected).length; j++) {                 
  //         if(trimSelected[j]==cflist[i]) { selectedTag = 'selected="selected"';} 
  //       }
  //       cflistHtml += '<option value="'+cflist[i]+'" '+selectedTag+'>'+cflist[i]+'</option>';
  //     }
  //     cflistHtml += '</select>';
  //   } else {
  //     cflistHtml = '<select name="custom-fields" class="custom-fields">';
  //     for (var i =0; i < Object.keys(cflist).length; i++) {
  //       if(selected==cflist[i]) { selectedTag = 'selected="selected"'} else { selectedTag = ''}
  //         cflistHtml += '<option value="'+cflist[i]+'" '+selectedTag+'>'+cflist[i]+'</option>';
  //       }
  //       cflistHtml += '</select>';
  //     }
  //   return cflistHtml;
  // } 

    // PURPOSE: Load icons that are stored in custom field
  function loadSelectedIcons(){
  	$('#dhp_icons_box .inside').append('<div class="misc-pub-section"><span >Add more icons</span><a class="dhp-icon-upload button-primary">Upload</a></div>');
  	$('.dhp-icon-upload').click(function(){
  		tb_show('','media-upload.php?post_id='+ projectID +'&type=image&TB_iframe=1&width=640&height=520');
  	});
  }

  // function popupIcons(){
  //     tb_show('Hayti Intro', '#TB_inline?height=350&width=400&inlineId=dhp_icons_box' );
  //     //$('#TB_window').css({'width':300});
  // }

  //Applies typing listeners to the new mote fields
  // function dhpAssignMoteListeners(theobj) {
  // 	var mote_id = '#'+$(theobj).attr('id');
  // 	var remove_span = '#'+$(theobj).attr('id')+' .delete-mote';
  // 	var remove_li = mote_id;
  // 	//console.log(mote_id);
  // 	//setup before functions
  //     var typingTimerMote;                //timer identifier
  //     var moteTypingInterval = 3000;  //time in ms, 5 second for example

  //     //on keyup, start the countdown
  //     $($(theobj).find('input')).keyup(function(){
  //     	//console.log('typing');

  //         typingTimerMote = setTimeout(doneTypingMote, moteTypingInterval);
  //     });

  //     //on keydown, clear the countdown 
  //     $($(theobj).find('input')).keydown(function(){
  //         clearTimeout(typingTimerMote);
  //     });
  	
  // 	$('.delete-mote').unbind('click');
  //     $('.delete-mote').click(function() {
  //     	//console.log('remove');
  //         //$(mote_id).toggleClass('selected');	
  //         deleteMoteLine($(this).closest('li').attr('id'));
  // 		$(this).closest('li').remove();

  // 		doneTypingMote();
  //     });
      
  //     $('.make-tax').unbind('click');
  //     $('.make-tax').click(function() {
  //     	var moteName = jQuery(this).parent('li').find('input').val();
  //     	var projectID = jQuery('#post_ID').val();
  //     	//dhpGetMoteValues(moteName,false);
  //     	$(this).next('.legend').show();
  // 		$(this).replaceWith('<span class="loaded">Loaded</span>');
  		

  //     });
  //     $('.legend').unbind('click');
  //     $('.legend').click(function() {
  //     	var moteName = jQuery(this).parent('li').find('input').val();
  //     	var projectID = jQuery('#post_ID').val();
  //     	//dhpGetMoteValues(moteName,true);
      	
  //     });
              
  // }

  //user is "finished typing," do something
  // function doneTypingMote() {

  //     $('.motes').each(function() {
  //     	//$(this).attr('id')
  //     	var moteOID = $(this).attr('id');
  //     	var moteName = $(this).find('input').val();
  //     	var moteID = moteName.toLowerCase();
  //     	moteID = moteID.trim();
  //     	//console.log(moteID+'done');
  //     	moteID = moteID.replace(" ","_");
  //     	projectObj.motes[moteOID] = {"id": moteID,"name": moteName};
     	
  //     });
  //     saveProjectEntry();
  //     createMarkerSettings();
  //     saveProjectSettings();
  //     //console.log(metaID);
  // }


  // $('.add-layer').click(function(){
  //     addMoteLine();
  //    createMarkerSettings();
  // 	saveProjectSettings();

  // });

    // PURPOSE: User has selected Save button -- update UI and save configuration data
  function saveProjectListeners() {
    $('#publish').removeClass('button-primary-disabled');
    $('#publishing-action .spinner').hide();
    $('#save-btn').removeClass('btn-danger');
    $('#publish').popover('hide');
    saveProjectSettings();
  }

    // PURPOSE: Read UI settings into projectObj and save those into WP DB
    // TO DO:   Make more efficient by minimizing use of indices
  function saveProjectSettings()	{
  	// console.log($('#dhp-projectid').val());
  	projectObj['project-details']['name'] = $('#titlediv #title').val();
    // projectObj['project-details']['id'] = $('#dhp-projectid').val();
    projectObj['project-details']['id'] = projectID;
    //console.log(projectObj['project-details']['marker-custom-fields'])
  	//MOTES - clear old values...add fresh
  	projectObj['motes'] = new Object();
  	$('#mote-list .accordion-group').each(function(index){
      newMote = new Object();
  		newMote["name"] = $(this).find('.mote-name').val();
      newMote["type"] = $(this).find('.cf-type').val();
      newMote["custom-fields"] = $(this).find('.custom-fields option:selected').map(function() {
                    return $(this).val();
        }).get().join();
      newMote["delim"] = $(this).find('.delim').val();
      projectObj['motes'][index] = newMote;
  	});

  	  //ENTRY POINTS - clear old values...add fresh
  	projectObj['entry-points'] = new Object();
      // ID attribute is constructed as type-
  	$('#entry-point .ep').each(function(index){
  		var type = $(this).attr('id').split('-')
  		if(type[0]=='map') {
  			projectObj['entry-points'][index] = new Object();
  			projectObj['entry-points'][index]["type"] = type[0];
       	projectObj['entry-points'][index]["settings"] = new Object();
  			//settings
  			projectObj['entry-points'][index]["settings"]['lat'] = $(this).find('#lat').val();
       	projectObj['entry-points'][index]["settings"]['lon'] = $(this).find('#lon').val();
       	projectObj['entry-points'][index]["settings"]['zoom'] = $(this).find('#zoom').val();
        //layers
        projectObj['entry-points'][index]["settings"]['layers'] = new Object();
        $('.layer-list li option:selected').each(function(ind2) {
          projectObj['entry-points'][index]["settings"]['layers'][ind2] = new Object();
          projectObj['entry-points'][index]["settings"]['layers'][ind2]['id'] = $(this).attr('id'); 
          // console.log($(this).attr('data-opacity')); 
          projectObj['entry-points'][index]["settings"]['layers'][ind2]['opacity'] = $(this).attr('data-opacity'); 
          projectObj['entry-points'][index]["settings"]['layers'][ind2]['name'] = $(this).text(); 
          projectObj['entry-points'][index]["settings"]['layers'][ind2]['mapType'] = $(this).attr('data-mapType'); 
          projectObj['entry-points'][index]["settings"]['layers'][ind2]['mapTypeId'] = $(this).val();
          //console.log($(this).attr('data-mapType'));
            //$("div[class^='apple-']")
        });

       	projectObj['entry-points'][index]["settings"]['marker-layer'] = $(this).find('#marker-layer').val();
        //legends
        projectObj['entry-points'][index]["settings"]['filter-data'] = new Object();
        $('.legend-list li option:selected').each(function(index2) {
          projectObj['entry-points'][index]["settings"]['filter-data'][index2] = $(this).val(); 
        });
      }
     //  if(type[0]=='timeline') {
  			// projectObj['entry-points'][index] = new Object();
  			// projectObj['entry-points'][index]["type"] = type[0];
     //   	projectObj['entry-points'][index]["settings"] = new Object();
     //   	projectObj['entry-points'][index]["settings"]['start-date'] = $(this).find('#start-date').val();
     //   	projectObj['entry-points'][index]["settings"]['end-date'] = $(this).find('#end-date').val();
     //   	projectObj['entry-points'][index]["settings"]['timeline-data'] = $(this).find('#timeline-mote').val();
     //  }
      if(type[0]=='transcript') {
        projectObj['entry-points'][index] = new Object();
        projectObj['entry-points'][index]["type"] = type[0];
        projectObj['entry-points'][index]["settings"] = new Object();
        projectObj['entry-points'][index]["settings"]['audio'] = $(this).find('#av-transcript-audio').val();
        projectObj['entry-points'][index]["settings"]['transcript'] = $(this).find('#av-transcript-txt').val();
        projectObj['entry-points'][index]["settings"]['transcript2'] = $(this).find('#av-transcript-txt2').val();
        
        projectObj['entry-points'][index]["settings"]['timecode'] = $(this).find('#av-transcript-clip').val();
      }
  	});
    if(!projectObj['views']) {
        projectObj['views'] = new Object();
    }
    var tempMarkerContent = [];

    $('#post-content-view li').each(function(index, theElement){
        tempMarkerContent.push($(theElement).find('option:selected').val());
    });
    projectObj['views']['post-view-content'] = tempMarkerContent;

    $('.save-view').each(function(index, theElement) {
      projectObj['views'][$(theElement).attr('name')] = theElement.value;
          //console.log(val);
          //if(val.type=='')
          if(theElement.type=="checkbox"&&theElement.checked) {
          //   console.log(val); 
             projectObj['views'][$(theElement).attr('name')] = true;
          }
          if(theElement.type=="checkbox"&&!theElement.checked) {
          //   console.log(val); 
             projectObj['views'][$(theElement).attr('name')] = false;
          }
    });

    //console.log(projectObj);

      // Save the project_settings as a string in the field
  	$('#project_settings').val(JSON.stringify(projectObj));
      // And send out to WP
  	updateProjectSettings();
  } // saveProjectSettings()


  function addNewTermToLegend(termData){
    var termName = termData['name'];
    var termID = termData['term_id'];
    $('.cat-list .ui-sortable')
      .prepend('<li id="'+termID+'" class="mjs-nestedSortable-leaf"><div><span class="disclose"><span></span></span><span class="term-name">'+termName+'</span><span class="term-count"> </span><span class="term-icon">Pick Icon</span></div></li>');
  }

    // PURPOSE: Create new modal to configure legend
    // INPUT:   title = name of mote (unused!)
    //          data = JSON Object of all of the unique values of the Mote
  function createConfigureLegendModal(title,data){
    $('#taxModal .modal-body').empty();
  	$('#taxModal .modal-body').append(builtHTMLForLegendValues(data));
  	
    $('#taxModal .modal-body').append('<div class="icons-color"><a class="use-icons">Icons</a> | <a class="use-colors">Colors</a></div>');
  	$('#taxModal .modal-body .icons-color').append($('.icons').clone());
    $('#taxModal .modal-footer').empty();
    $('#taxModal .modal-footer').append('<a class="save-array btn btn-danger">Save</a>');
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
  		});
  	$('.save-array').click(function(){
  		saveArrayTree();
      $('.save-array').html('saving...');
  		
  	});
    $('.add-term').click(function(){
      var newTerm = $('.new-term-name').val();
      var parentTerm = $('.cat-list').find('h2').text();

      if(newTerm) {
        dhpCreateTermInTax(newTerm,parentTerm);
      }
    });

      // If user selects "Colors" in Legend configure modal
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
            color: { active: new $.jPicker.Color({ hex: tempColor }) },
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
        ); // jPicker
      }); // each
    }); // click

      // If user selects "Icons" in Legend configure modal
  	$('.term-icon').click(function(e){
  		//console.log($(this).parents('li').attr('id'));
  		//$('.mjs-nestedSortable-expanded').toggleClass('mjs-nestedSortable-collapsed');
  		$(this).empty().text('Choose icon ->');
  		var termID = $(this).parents('li').attr('id');
  		$('#taxModal .modal-body .icons a').click(function(){
  			var icon_url = $(this).find('img').attr('src');
  			var img = $(this).find('img').clone();
  			$(img).css({'height':'20px','margin-top': '-3px'});
  			//console.log(termID+' '+icon_url);
  			$('.cat-list li#'+termID+' .term-icon').empty().append(img);
  			$('#taxModal .modal-body .icons a').unbind('click');
  		});
  	});
  } // createConfigureLegendModal()

  // function resizeTB() {
  // 	if($('#taxModal .modal-body').length>0) {
  		
  // 		var div = document.getElementById('TB_ajaxContent');
  // 		var hasVerticalScrollbar = div.scrollHeight>div.clientHeight;
  // 		var boxWidth = $('#TB_window').width() -30;
  // 		var boxHeight = $('#TB_window').height() -42;
  // 		if(hasVerticalScrollbar) {
  // 			$('.cat-list').width('385px');
  // 		}
  // 		else {
  // 			$('.cat-list').width('400px');
  // 		}
  		
  // 		$('#taxModal .modal-body').css({'width': boxWidth,'height':boxHeight});
  // 	}
  // }

    // PURPOSE: Save the taxonomy edited by user (in Legend setup modal)
    // NOTES:   The user changes are stored in the HTML itself and read from there to WP
    // ASSUMES: Taxonomy can be uniquely located in HTML markup as "ol.sortable"
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
    var treeObject = [];
      // Create a JSON string to represent category terms in format usable by WP
  	$(lis).each(function(index){
      var tempTermObject = new Object();

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

      tempTermObject['term_id'] = this.id;
      tempTermObject['name'] = tempName;
      tempTermObject['term_order'] = i;
      tempTermObject['parent'] = tempParent;
      tempTermObject['count'] = tempCount;
      tempTermObject['icon_url'] = tempIcon;
      // tempTermObject['count'] = tempCount;
  		// termTree +='"term_id":"'+this.id+'","name":"'+tempName+'","term_order":"'+i+'","parent":"'+tempParent+'","count":"'+tempCount+'","icon_url":"'+tempIcon+'"}';
  		treeObject.push(tempTermObject);
      i++;
      
  	});
  	
  	console.log(JSON.stringify(treeObject));
  	createTaxTerms(treeParent,JSON.stringify(treeObject));	
  } // saveArrayTree()


    // PURPOSE: Create HTML for nested sortable list of Legend values w/icon or color (for Configure Legend modal)
    // INPUT:   taxTermString = JSON string for taxonomic term
    // RETURNS: jQuery HTML object for Legend values
    // TO DO:   Make more efficient with _.each()
  function builtHTMLForLegendValues(taxTermString) {
    var termObj = JSON.parse(taxTermString);
  	var htmlStart = '';

    var result = $('<div class="cat-list"><ol class="sortable"></ol></div>');
    var countTerms = 0;
    // console.log(obj);

    if(termObj) {
      countTerms = Object.keys(termObj).length; 
    } 
	  for(i=0;i<countTerms;i++) {
  		if(termObj[i].parent==0) {
  			
  			$(result).prepend('<h2 id="'+termObj[i].term_id+'">'+termObj[i].name+'</h2><button class="btn btn-success add-term" type="button">Add Term</button><input class="new-term-name" type="text" /><p class="default-marker">Pick default icon or color. <i class="icon-picture pick-default pull-right"></i></p>');
  			//console.log('title');
  		} else if($('ol.sortable li#'+termObj[i].parent, result).length>0) {
  			$('ol.sortable li#'+termObj[i].parent, result).append('<ol><li id="'+termObj[i].term_id+'"><div></div></li></ol>');
  			$('li#'+termObj[i].term_id+' div', result).append('<span class="disclose"><span></span></span>');
  			$('li#'+termObj[i].term_id+' div', result).append('<span class="term-name '+termObj[i].parent+'">'+ termObj[i].name + '</span>');		
  			$('li#'+termObj[i].term_id+' div', result).append('<span class="term-count"> ' + termObj[i].count + '</span>');
  	
  		} else {
  			$('ol.sortable', result).append('<li id="'+termObj[i].term_id+'"><div></div></li>');
  			$('li#'+termObj[i].term_id+' div', result).append('<span class="disclose"><span></span></span>');
  			$('li#'+termObj[i].term_id+' div', result).append('<span class="term-name">'+ termObj[i].name + '</span>');		
  			$('li#'+termObj[i].term_id+' div', result).append('<span class="term-count"> ' + termObj[i].count + '</span>');
  			if(termObj[i].icon_url!='undefined'&&termObj[i].icon_url!='') {
  				//console.log('before:'+obj[i].icon_url+'after');
          if(termObj[i].icon_url.substring(0,1)=='#') {
            $('li#'+termObj[i].term_id+' div', result).append('<span class="term-icon">'+termObj[i].icon_url+'</span>');
          } else {
  				  $('li#'+termObj[i].term_id+' div', result).append('<span class="term-icon"><img src="'+termObj[i].icon_url+'" height="20px" /></span>');
          }
  			} else {
  				$('li#'+termObj[i].term_id+' div', result).append('<span class="term-icon">Pick Icon</span>');
          //$('li#'+obj[i].term_id+' div', result).append('<span class="term-color">Pick Color</span>');
  			}
  		}
  	}
    return result;
  } // show_props()


    // INPUT:   optionArrayAsJSON = JSON object containing array of items
    // RETURNS: HTML text representing all of the options in optionArrayAsJSON
  function builtHTMLForOptionList(optionArrayAsJSON) {
    var tempOptionArray = JSON.parse(optionArrayAsJSON);
    var tempHtml = null;
    _.each(tempOptionArray, function(val,key){
        // console.log(val)
        tempHtml += '<option value="'+val+'" >'+val+'</option>';
    });
    return tempHtml;
  }

    // PURPOSE: Change button next to Legend from Create to Configure
  function changeToLoadBtn() {
    $('.create-legend').remove();
    $('.load-legend').removeClass('hide');
    saveProjectListeners();
  }

  //=================================== AJAX functions ==================================

    // PURPOSE: Saves project settings data object
    // RETURNS: Saved date
    
  function updateProjectSettings(){
    // console.log("Updating settings for project " + projectID);
  	var settingsData = $('#project_settings').val();
  	jQuery.ajax({
          type: 'POST',
          url: ajax_url,
          data: {
              action: 'dhpSaveProjectSettings',          
              project: projectID,
              settings: settingsData
          },
          success: function(data, textStatus, XMLHttpRequest){
              console.log(data);         
          },
          error: function(XMLHttpRequest, textStatus, errorThrown){
             alert(errorThrown);
          }
      });
  }
    // PURPOSE: Create terms for new legend
    // RETURNS: Object with terms
    // INPUT:   treeParentID = Top level term id(legend name)
    //          taxTerms = termObject to be created in wordpress
  function dhpCreateLegendTax(mote,loadLegend) {
    // console.log("Create legend for mote " + mote + " for project " + projectID);
    jQuery.ajax({
          type: 'POST',
          url: ajax_url,
          data: {
              action: 'dhpCreateLegendTax',
              project: projectID,
              mote_name: mote
          },
          success: function(data, textStatus, XMLHttpRequest){
              $('#createModal').modal('hide');
              changeToLoadBtn();
          },
          error: function(XMLHttpRequest, textStatus, errorThrown){
             alert(errorThrown);
          }
      });
  }

    // PURPOSE: Get term object for legend editor and open modal
    // RETURNS: Object with terms
    // INPUT:   mote = Top level term id(legend name)
  function dhpGetMoteValues(mote) {
    // console.log("Getting mote values for project " + projectID);
      //create modal here to hold users attention. Data will be rendered on response
    $('#taxModal').remove();
    $('body').append('<!-- Modal -->\
          <div id="taxModal" class="modal hide fade" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">\
            <div class="modal-header">\
              <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>\
              <h3 id="myModalLabel">Legend Configure</h3>\
            </div>\
            <div class="modal-body">\
            </div>\
            <div class="modal-footer">\
            </div>\
          </div>');
    $('#taxModal').modal('show');

    jQuery.ajax({
          type: 'POST',
          url: ajax_url,
          data: {
              action: 'dhpGetMoteValues',
              project: projectID,
              mote_name: mote
          },
          success: function(data, textStatus, XMLHttpRequest){
              createConfigureLegendModal(mote['name'],data); 
          },
          error: function(XMLHttpRequest, textStatus, errorThrown){
             alert(errorThrown);
          }
      });
  } 

    // PURPOSE: Update term structure for legend(introduces icon_url field)
    // RETURNS: Object with terms
    // INPUT:   treeParentID = Top level term id (legend name)
    //          taxTerms = termObject to update terms in wordpress(introduces icon_url)

  function createTaxTerms(treeParentID,taxTerms) {
    // console.log("Create legend for treeParentID " + treeParentID + " in Project ID " + projectID);
    var termData = taxTerms;
    jQuery.ajax({
          type: 'POST',
          url: ajax_url,
          data: {
              action: 'dhpCreateTaxTerms',
              mote_name: treeParentID,
              project: projectID,
              terms: termData
          },
          success: function(data, textStatus, XMLHttpRequest){
              $('#taxModal').modal('hide');
          },
          error: function(XMLHttpRequest, textStatus, errorThrown){
             alert(errorThrown);
          }
      });
  } 

  /**
   * [createCustomFieldFilter create a custom field using a subset of markers filtered by a custom field and value]
   * @param  {[text]} fieldName   [new custom field name]
   * @param  {[text]} fieldValue  [new custom field value]
   * @param  {[text]} filterKey   [custom field to filter on]
   * @param  {[text]} filterValue [custom field value to filter on]
   */
  // function createCustomFieldFilter(fieldName,fieldValue,filterKey,filterValue){
  //   jQuery.ajax({
  //     type: 'POST',
  //     url: ajax_url,
  //     data: {
  //         action: 'dhpCreateCustomFieldFilter',
  //         project: projectID,
  //         field_name: fieldName,
  //         field_value: fieldValue,
  //         filter_key: filterKey,
  //         filter_value: filterValue
  //     },
  //     success: function(data, textStatus, XMLHttpRequest){
  //         //console.log(textStatus); 
  //         $('#projectModal').modal('hide');
  //     },
  //     error: function(XMLHttpRequest, textStatus, errorThrown){
  //        alert(errorThrown);
  //     }
  //   });

  // }
  /**
   * [updateCustomFieldFilter update a custom field using a subset of markers filtered by a custom field and value]
   * @param  {[text]} fieldName    [custom field name]
   * @param  {[text]} currentValue [custom field current value]
   * @param  {[text]} newValue     [custom field new value]
   * @param  {[text]} filterKey    [custom field to filter on]
   * @param  {[text]} filterValue  [custom field value to filter on]
   */
  function updateCustomFieldFilter(fieldName,currentValue,newValue,filterKey,filterValue){
    jQuery.ajax({
      type: 'POST',
      url: ajax_url,
      data: {
          action: 'dhpUpdateCustomFieldFilter',
          project: projectID,
          field_name: fieldName,
          current_value: currentValue,
          new_value: newValue,
          filter_key: filterKey,
          filter_value: filterValue
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

  function replaceCustomFieldFilter(fieldName,newValue,filterKey,filterValue){
    jQuery.ajax({
      type: 'POST',
      url: ajax_url,
      data: {
          action: 'dhpReplaceCustomFieldFilter',
          project: projectID,
          field_name: fieldName,
          new_value: newValue,
          filter_key: filterKey,
          filter_value: filterValue
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

  function createCustomField(fieldName,fieldValue) { 
    jQuery.ajax({
          type: 'POST',
          url: ajax_url,
          data: {
              action: 'dhpAddCustomField',
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

  function findReplaceCustomField(tempFindCF,tempFindCFvalue,tempReplaceCFvalue){
    jQuery.ajax({
          type: 'POST',
          url: ajax_url,
          data: {
              action: 'dhpFindReplaceCustomField',
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

  function deleteCustomField(deleteField) { 
    jQuery.ajax({
          type: 'POST',
          url: ajax_url,
          data: {
              action: 'dhpDeleteCustomField',
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

  function deleteTerms(termName) {
    jQuery.ajax({
          type: 'POST',
          url: ajax_url,
          data: {
              action: 'dhpDeleteTerms',
              project: projectID,
              term_name: termName
          },
          success: function(data, textStatus, XMLHttpRequest){
              console.log('dhpDeleteTerms');
              $('#deleteModal').modal('hide');            
          },
          error: function(XMLHttpRequest, textStatus, errorThrown){
             alert(errorThrown);
          }
      });
  }

  function dhpGetCustomFields() {
    jQuery.ajax({
          type: 'POST',
          url: ajax_url,
          data: {
              action: 'dhpGetCustomFields',
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

  function dhpGetFieldValues(fieldName){
    jQuery.ajax({
          type: 'POST',
          url: ajax_url,
          data: {
              action: 'dhpGetFieldValues',
              project: projectID,
              field_name: fieldName
          },
          success: function(data, textStatus, XMLHttpRequest){
              console.log(data);
              $('.filter-field-values').empty().append(builtHTMLForOptionList(data));
          },
          error: function(XMLHttpRequest, textStatus, errorThrown){
             alert(errorThrown);
          }
      });
  }

  function dhpCreateTermInTax(new_term, parent_term) {
  // console.log(parent_term);
    jQuery.ajax({
          type: 'POST',
          url: ajax_url,
          data: {
              action: 'dhpCreateTermInTax',
              project: projectID,
              term_name: new_term,
              parent_term_name: parent_term
          },
          success: function(data, textStatus, XMLHttpRequest){
              //console.log(textStatus);
              //console.log(JSON.parse(data));
              //$('#createModal').modal('hide');
              console.log(JSON.parse(data));
              addNewTermToLegend(JSON.parse(data));
          },
          error: function(XMLHttpRequest, textStatus, errorThrown){
             alert(errorThrown);
          }
      });
  }
  
});
