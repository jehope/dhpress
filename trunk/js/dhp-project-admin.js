// PURPOSE: Handle functions for Edit Project admin page
//          Loaded by add_dhp_project_admin_scripts() in dhp-project-functions.php
// ASSUMES: dhpDataLib is used to pass parameters to this function via wp_localize_script()
//          WP code creates hidden data in with DIV ID hidden-layers for info about map layers
//          Initial project settings embedded in HTML in DIV ID project_settings by show_dhp_project_settings_box()
// USES:    Libraries jQuery, jQuery UI (for drag-drop), Underscore, Bootstrap ...
// NOTES:   Functions whose name begins "buildHTML..." return HTML strings
//          Currently only 1 entry-point is fully supported; in configuration of Views, HTML DIVs are IDs rather
//            than CLASSes, which may make reading parameters for multiple configurations may not work

jQuery(document).ready(function($) {

  //console.log(dhpDataLib);

  var ajax_url  = dhpDataLib.ajax_url;
  var projectID = dhpDataLib.projectID;

  var projectObj = new Object();         // Initialized in initializeProjectObj() but only updated by saveProjectSettings() when user selects Save button

    // Selection modal settings saved here
  var selModalSettings;

    // Create new empty settings
  projectObj['project-details'] = new Object();
  projectObj['entry-points'] = new Object();
  projectObj['motes'] = new Object();
  projectObj['views'] = new Object();

     // Data types supported for motes
  var dataTypes = ['Text', 'Lat/Lon Coordinates', 'Image', 'URL'];
  // var dataTypes = ['Text','Exact Date','Date Range','Lat/Lon Coordinates','File','Image'];

    // View types supported for modals
  var modalViewNames = ['transcript'];

    // Screen options tab on T-L
  $('#screen-meta-links a').click(function(){
    $('#screen-options-wrap').removeClass('hidden');
  });

    // #hidden-layers DIV (produced by dhp-project-functions.php) contains all data about map layers
  var BASE_LAYERS = $('#hidden-layers .base-layer').map(function(){
    return $(this);
  });
  var OVERLAYS = $('#hidden-layers .overlay').clone();

    //Assign listener to icons loaded by php
  $('.dhp_icon').click(function() {
  	if($(this).hasClass('selected')==false){
  		var imgs = $(this).find('img').attr('src');
  		$('#icon-cats ul').append('<li id="' + $(this).attr('id') + '"><img src="'+ imgs + '"/><input type="text" id="icons_' + $(this).attr('id') + '"/><span class="remove">X</span></li>');
  		$(this).toggleClass('selected');
  		assignListeners(this);
  	}
  });

    // Prepare Bootstrap modal popover on Publish button (called below if not saved)
  $('#publish').popover({
      title:'Project requires save',
      content:'Don\'t forget to save your project (red button on the left).',
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
    var mapCount  = countEntryPoints();
      // Only allow 1 entry point for now
    if(mapCount>=1) {
      var options = {
        animation: true, 
        placement:'right',
        title:'Entry Point limit reached',
        content:'Maximum of one entry point allowed currently.',
        trigger:'manual',
        delay: { show: 500, hide: 100 }
      }
      $('#entry-point').popover(options);
      $('#entry-point').popover('show');
      setTimeout(function () { $('#entry-point').popover('destroy'); }, 3000);

    } else {
        // Ensure that a Lat-Lon mote has been defined
      var geoMote = findMoteOfType('Lat/Lon Coordinates');
      if (geoMote === undefined) {
        var options = { 
          animation: true, 
          placement:'right',
          title:'Missing mote',
          content:'You cannot create a map until you have defined a Lat/Lon Coordinates mote.',
          trigger:'manual',
          delay: { show: 500, hide: 100 }
        }
        $('#entry-point').popover(options);
        $('#entry-point').popover('show');
        setTimeout(function () { $('#entry-point').popover('destroy'); }, 3000);

      } else {
        projectNeedsToBeSaved();
        addHTMLForEntryPoint('map',null);
        //show tab/content after loading
        $('#map'+(mapCount+1)+'-tab a').tab('show');
      }
    }
  });


    // Handle Create Entry Point > Topic Cards
  $('#add-cards').click(function() {
    var tcCount = countEntryPoints();
      // Only allow 1 entry point for now
    if(tcCount>=1) {
      var options = {
        animation: true, 
        placement:'right',
        title:'Entry Point limit reached',
        content:'Maximum of one entry point allowed currently.',
        trigger:'manual',
        delay: { show: 500, hide: 100 }
      }
      $('#entry-point').popover(options);
      $('#entry-point').popover('show');
      setTimeout(function () { $('#entry-point').popover('destroy'); }, 3000);

    } else {
        // Ensure that a Lat-Lon mote has been defined
      var textMote = findMoteOfType('Text');
      if (textMote === undefined) {
        var options = { 
          animation: true, 
          placement:'right',
          title:'Missing mote',
          content:'You cannot create topic cards until you have defined a Text mote.',
          trigger:'manual',
          delay: { show: 500, hide: 100 }
        }
        $('#entry-point').popover(options);
        $('#entry-point').popover('show');
        setTimeout(function () { $('#entry-point').popover('destroy'); }, 3000);

      } else {
        projectNeedsToBeSaved();
        addHTMLForEntryPoint('cards',null);
        //show tab/content after loading
        $('#cards'+(tcCount+1)+'-tab a').tab('show');
      }
    }
  });

    // + button on Motes tab (for creating new custom field)
  $('#create-new-custom').click(function(){
    $('#projectModal').empty();
    $('#projectModal').append(
    '<div class="modal-header">\
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
  var settings = $('#project_settings').val();
  if(settings && settings !== '') {
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
    // INPUT:   Either an entry point type, or undefined to count all specific tabs
  function countEntryPoints(type){
    var count;
    if (type) {
      count = $('#entryTabs .ep-'+type);
      count = count.length;
    } else {
      count = $('#entryTabs > li');
      count = count.length - 2;  // don't count Home and New tabs
    }
    return count;
  }

    // PURPOSE: Store updated Custom Field data list in Project Object
    // TO DO:   Update after user adds a new custom field?
  function updateCustomFieldList(cfdata){
    projectObj['project-details']['marker-custom-fields'] = _.values(JSON.parse(cfdata));
  }

    // PURPOSE: Initialize all Project settings in projectObj
    // INPUT:   settingString = String representing project settings (needs to be parsed), or null if none (new)
  function initializeProjectObj(settingString) {
    // console.log("settingString = " + settingString);

    var pSettings;

    if (settingString !== null) {
      pSettings = JSON.parse(settingString);
    } else {
      pSettings = null;
    }

      // Project settings exist, need to be read
    if (pSettings && pSettings['project-details']) {
        // Ensure project IDs match
      if (pSettings['project-details']['id'] !== projectID) {
          throw new Error("Project ID "+projectID+" sent by WP does not match ID "+pSettings['project-details']['id']+" in project settings");
      }
      projectObj['project-details']['version']        = 2;
      projectObj['project-details']['id']             = pSettings['project-details']['id'];
      projectObj['project-details']['name']           = pSettings['project-details']['name'];
      projectObj['project-details']['home-label']     = pSettings['project-details']['home-label'];
      projectObj['project-details']['home-url']       = pSettings['project-details']['home-url'];
      projectObj['project-details']['max-inactive']   = pSettings['project-details']['max-inactive'];

        // Set values in GUI
      $('#home-label').val(projectObj['project-details']['home-label']);
      $('#home-url').val(projectObj['project-details']['home-url']);
      $('#max-inactive').val(projectObj['project-details']['max-inactive']);

      dhpGetCustomFields();

      // New project -- no pre-existing settings
    } else {
      projectObj['project-details']['version'] = 2;
      projectObj['project-details']['id'] = projectID;
    }

      // "Dirty" if Project settings fields change
    $('#home-label, #home-url, #max-inactive').on('change',function(){
      projectNeedsToBeSaved();
    });

      // If user changes anything inside standard edit boxes
    $('#dhp_settings_box input').on('change',function(){
      projectNeedsToBeSaved();
    });
    $('#dhp_settings_box select').on('change',function(){
      projectNeedsToBeSaved();
    });

    if(pSettings && pSettings['motes']) {
      insertHTMLForMoteList(pSettings['motes']);
    }

    if(pSettings && pSettings['entry-points']) {
      addEntryPoints(pSettings['entry-points']);
    }

    if (pSettings && pSettings['views']) {
      projectObj['views'] = pSettings['views'];

    } else {
      projectObj['views'] = new Object();
      projectObj['views']['select'] = new Object();
      projectObj['views']['post'] = new Object();
      projectObj['views']['transcript'] = new Object();
    }
    selModalSettings = projectObj['views']['select'];

    addHTMLForViewsTab();


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


    // RETURNS: First mote found of theType
  function findMoteOfType(theType) {
    return _.find(projectObj['motes'],
                          function (theMote) { return theMote['type'] === theType; });
  } // findMoteOfType()


    // PURPOSE: Create placeholder for new mote based on UI fields
  function createNewMote() {
      // get required parameters
    var newMoteName = $('#create-mote .mote-name').val();
    var newMoteType = $('#create-mote .cf-type').val();
      // get all custom fields that make up -- could be multiple
    var newMoteCFs  = $('#create-mote .custom-fields option:selected').map(function() {
        return $(this).val();
      }).get().join();

    $('.mote-error').remove();

      // ensure sufficient required params supplied
    if (newMoteName === '')  {
      //console.log();
      $('#create-mote .mote-name').after('<span class="help-inline mote-error label label-important" >Missing name for mote</span>');

    } else if (newMoteType === '') {
      $('#create-mote .mote-name').after('<span class="help-inline mote-error label label-important" >Missing type for mote</span>');

    } else if ((newMoteCFs == null) || (newMoteCFs.length == 0) || _.contains(newMoteCFs, "--") || _.contains(newMoteCFs, "")) {
      $('#create-mote .mote-name').after('<span class="help-inline mote-error label label-important" >Missing custom field specification for mote</span>');

    } else {
      var newMoteSettings = new Object();
      newMoteSettings[0] = new Object();
      newMoteSettings[0]["name"] = newMoteName;
      newMoteSettings[0]["type"] = newMoteType;
      newMoteSettings[0]["custom-fields"] = newMoteCFs;
      newMoteSettings[0]["delim"] = $('#create-mote .delim').val();

      insertHTMLForMoteList(newMoteSettings);
      clearCreateMoteValues();
    }
  } // createNewMote()


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
  function addEntryPoints(epSettings) {
    projectObj['entry-points'] = epSettings;
    _.each(epSettings, function(theEP) {
      addHTMLForEntryPoint(theEP["type"], theEP["settings"]);
    });
  }


    // PURPOSE: Build the HTML for a single Entry Point, given its type and settings
    // INPUT:   moteType = the name of a valid entry point type: 'map', 'cards'
  function addHTMLForEntryPoint(epType, settings)
  {
    var geoMoteType = ['Lat/Lon Coordinates'], textMoteType = ['Text'], imageMoteType = ['Image'];
    var epCount  = countEntryPoints(epType) +1;

      // Is this a newly created entry point?
    if(!settings) {
      settings = new Object();

        // Create default base layer
      if (epType == 'map') {
        settings['layers'] = [];
        var defaultLayer = { 'id': 0, 'opacity': 1};
        settings['layers'].push(defaultLayer);
      }
    }

      // Create tab from top left
    $('#entryTabs').append('<li id="'+epType+epCount+'-tab"><a href="#'+epType+'-'+epCount+'" class="ep-'+epType+'" data-toggle="tab">'+epType+' '+epCount+'</a></li> ')

      // Create content area...load settings
    switch (epType) {
    case 'cards':
      tcCount = $('.legend-list li').length + 1;
      entryTabContent = '<div class="row offset1" id="tcard-title-div">\
                      	<label>Card Title</label>\
                          <select class="span4" name="tcard-title-selection" id="tcard-title-selection">\
                          <option selected="selected" value="the_title">Marker Title</option>'+
                          buildHTMLForMotes(settings['title'], false, textMoteType)+
                          '</select>\
                      </div>\
                      <div class="row offset1 legend-list" id="tcard-color-div">\
                        <label>Card Color</label>\
                          <li id="legend-'+tcCount+'">\
                          <select name="tcard-color-selection" id="tcard-color-selection">'+
                          buildHTMLForMotes(settings['color'], true, textMoteType)+
                          '</select>\
                          <button type="button" id="create-card-color-mote" class="btn-success hidden">Create Taxonomy</button>\
                          <button type="button" id="config-card-color-mote" class="btn-danger hidden">Configure Taxonomy</button>\
                          <button type="button" id="del-card-color-mote" class="btn-danger hidden">Delete Taxonomy</button>\
                          </li>\
                      </div>\
                      <div class="row offset1" id="tcard-image-div">\
                        <label>Card Image</label>\
                          <select class="span4" name="tcard-image-selection" id="tcard-image-selection">'+
                          buildHTMLForMotes(settings['image'], true, imageMoteType)+
                          '</select>\
                      </div>\
                      <div class="row offset1" id="tcard-text-div">\
                        <label>Card Text</label>\
                          <select class="span4" name="tcard-text-selection" id="tcard-text-selection">\
                          <option selected="selected" value="the_content">Post Content</option>'+
                          buildHTMLForMotes(settings['text'], true, textMoteType)+
                          '</select>\
                      </div>';
      break;
    case 'map':
      entryTabContent = '<div class="row-fluid vars">\
                      <div class="cords span5">\
                          <label>Map Center (Lat/Lon)</label>\
                          <div class="input-prepend input-append">\
                            <input class="span5" type="text" name="lat" id="lat" placeholder="Lat" value="'+blankStringIfNull(settings['lat'])+'" />\
                            <input class="span5" type="text" name="lon" id="lon" placeholder="Lon" value="'+blankStringIfNull(settings['lon'])+'" />\
                          </div>\
                          <label>Initial Zoom</label>\
                          <input type="text" name="zoom" id="zoom" placeholder="Zoom" value="'+blankStringIfNull(settings['zoom'])+'" />\
                      </div>\
                      <div class="span7 layers">\
                        <ul class="layer-list">\
                          '+loadLayers(settings['layers'])+'\
                          </ul>\
                      <button class="btn btn-success add-layer" type="button">Add Layer</button>\
                      </div>\
                  </div>\
                  <div class="row-fluid vars">\
                      <div class="span5" id="map-marker-div">\
                        <label>Marker Layer(Lat/Lon) <span class="badge badge-info"><i class="icon-question-sign icon-white"></i></span></label>\
                          <select class="span12" name="map-marker-selection" id="map-marker-selection">'+buildHTMLForMotes(settings['marker-layer'],false,geoMoteType)+
                          '</select>\
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
      break;
    }

      // First, do HTML mods and binds that all EPs have in common
    $('#entryTabContent').append('<div class="tab-pane fade in ep map" id="'+epType+'-'+epCount+'"><button type="button" class="close" >&times;</button>\<p>'+entryTabContent+'</p></div>');

      // Handle Delete button for Entry Point
    $('#'+epType+'-'+epCount+ ' .close').click(function(e){
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
    $('#'+epType+'-'+epCount+ '.ep').click(function(e){
      if($(this).find('.close').text()=='Confirm Delete') {
        $(this).find('.close').html('&times;');
      }
    });

      // Now, do things specific to certain types of Entry Points
    switch (epType) {
    case 'map':
        bindLegendEvents();

        $('.add-legend').unbind('click');
        $('.add-legend').click(function(){   
          $('.legend-list').append(buildHTMLForALegend(null, 0));
          bindLegendEvents();
          projectNeedsToBeSaved();
        });
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

          // Handle deleting layer
        $('.delete-layer').click(function(){   
          //console.log('delete')
          $(this).closest('li').remove();
        });

        $('.add-layer').unbind('click');
        $('.add-layer').click(function() {
          var layerHTML = addNewLayer();
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
        });
        break;        // map ep-type

    case 'cards':
        updateCardColorButtons();
        bindCardColorButtons();
        break;
    }
  } // addHTMLForEntryPoint()


  function bindCardColorButtons()
  {
      // Dirty project settings if any selections made
    $("#tcard-title-selection, #tcard-image-selection, #tcard-text-selection").change(projectNeedsToBeSaved);

      // Check to see if mote selected for color has been created as category or not
    $("#tcard-color-selection").change(function() {
      projectNeedsToBeSaved();
      updateCardColorButtons();
    });

      // Carry out Create or Delete button actions
    $("#create-card-color-mote").click(function() {
      var colorMoteName = $("#tcard-color-selection option:selected").val();
console.log("Create color mote "+colorMoteName);
      if (colorMoteName) {
        doCreateLegend(colorMoteName, updateCardColorButtons);
      }
    });

    $("#del-card-color-mote").click(function() {
        var colorMoteName = $("#tcard-color-selection option:selected").val();
        $('#deleteModal').remove();
        $('body').append('<!-- Modal -->\
            <div id="deleteModal" class="modal hide fade" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">\
              <div class="modal-header">\
                <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>\
                <h3 id="myModalLabel">Delete Category</h3>\
              </div>\
              <div class="modal-body">\
                <p>This will delete all values associated with the '+colorMoteName+' category.</p>\
              </div>\
              <div class="modal-footer">\
                <button class="btn" data-dismiss="modal" aria-hidden="true">Cancel</button>\
                <button class="btn btn-danger delete-confirm">Delete Category</button>\
              </div>\
            </div>');
        $('#deleteModal').modal('show');
        $('.delete-confirm').click(function(){
          $('#deleteModal .delete-confirm').text('deleting...');
          deleteTerms(colorMoteName, updateCardColorButtons);
          projectNeedsToBeSaved();
        });
    });

    $("#config-card-color-mote").click(function() {
        var colorMoteName = $("#tcard-color-selection option:selected").val();
console.log("Configure color mote "+colorMoteName);
        dhpConfigureMoteLegend(colorMoteName, false);
        updateCardColorButtons();
    });
  } // bindCardColorButtons()


    // PURPOSE: Show or hide the Create and Delete buttons for Card Color button acc. to existence of taxonomy
  function updateCardColorButtons()
  {
    var colorMote, colorMoteName;

    colorMoteName = $('#tcard-color-div option:selected').val();

      // If something selected, need to check to see if it has category/tax values
    if (colorMoteName && colorMoteName !== '') {
      colorMote = getMote(colorMoteName);
      getMoteLegendValues(colorMoteName, function(theMote, moteValues) {
          // A mote is selected but no category yet exists
        if (Object.keys(moteValues).length==0) {
          $("#create-card-color-mote").removeClass("hidden");
          $("#del-card-color-mote").addClass("hidden");
          $("#config-card-color-mote").addClass("hidden");

          // Category/Legend has been created
        } else {
          $("#create-card-color-mote").addClass("hidden");
          $("#del-card-color-mote").removeClass("hidden");
          $("#config-card-color-mote").removeClass("hidden");
        }
      });
      // If nothing selected, can neither Create nor Delete it
    } else {
      $("#create-card-color-mote").addClass("hidden");
      $("#del-card-color-mote").addClass("hidden");
      $("#config-card-color-mote").addClass("hidden");
    }
  } // updateCardColorButtons()


    // RETURNS: First entry point within parentObj of type objType
  function getEntryPointByType(epList, epType) {
    return _.find(epList, function(theEP) { return theEP.type == epType });
  }


    // PURPOSE: Creates Post section of Views tab
  function addHTMLForPostView(postView) {
    var markerTitle = blankStringIfNull(postView['title']);
    var titleMoteTypes = ['Text'];

    $('.marker-view').append('<select name="post-view-title" class="title-custom-fields save-view"><option selected="selected" value="the_title">Marker Title</option>'+buildHTMLForMotes(markerTitle, false, titleMoteTypes)+'</select>');
    $('.marker-view').append('<p>Pick the motes to display in Marker Post pages.</p><ul id="post-content-view"></ul><button class="btn btn-success add-mote-content" type="button">Add Mote</button>');

    if(postView['content']){
      var htmlStr = $('<div/>');
      _.each(postView['content'],function(val) {
        $(htmlStr).append(buildContentMotesHTML(val));
      });
      $('#post-content-view').append(htmlStr);
    }
  } // addHTMLForPostView()


    // PURPOSE: Show or hide the Create and Delete buttons for Transcript Source acc. to existence of taxonomy
  function updateTranscButtons()
  {
    var transcMote, transcMoteName;

    transcMoteName = $('#av-transcript-source option:selected').val();

      // If something selected, need to check to see if it has category/tax values
    if (transcMoteName && transcMoteName !== '') {
      transcMote = getMote(transcMoteName);
      getMoteLegendValues(transcMoteName, function(theMote, moteValues) {
          // A mote is selected but no category yet exists
        if (Object.keys(moteValues).length==0) {
          $("#create-transc-mote").removeClass("hidden");
          $("#del-transc-mote").addClass("hidden");

          // Category/Legend has been created
        } else {
          $("#create-transc-mote").addClass("hidden");
          $("#del-transc-mote").removeClass("hidden");
        }
      });

      // If nothing selected, can neither Create nor Delete it
    } else {
      $("#create-transc-mote").addClass("hidden");
      $("#del-transc-mote").addClass("hidden");
    }
  } // updateTranscButtons()


    // PURPOSE: Creates Transcript section of Views tab
    // TO DO:   Add "Create" and "Delete" buttons to Source mote
  function addHTMLForTranscView(transcView) {
    var urlMoteType = ['URL'], textMoteType = ['Text'];
    $('.transc-view').append('<p>Pick the motes to display for each taxonomy post entry.</p><ul id="transc-content-view"></ul><button class="btn btn-success add-mote-content" type="button">Add Mote</button>');
    var transHTML = '<label>Transcript Source (all excerpts must have same value for this mote)</label>\
                    <select name="av-transcript-source" id="av-transcript-source">'+buildHTMLForMotes(transcView['source'], true, textMoteType)+'</select>\
                      <button type="button" id="create-transc-mote" class="btn-success hidden">Create Taxonomy</button>\
                      <button type="button" id="del-transc-mote" class="btn-danger hidden">Delete Taxonomy</button>\
                    <label>Audio URL (setting enables or disables widget playback)</label>\
                    <select name="av-transcript-audio" id="av-transcript-audio">'+buildHTMLForMotes(transcView['audio'], true, urlMoteType)+'</select>\
                    <label>Transcript Text</label>\
                    <select name="av-transcript-txt" id="av-transcript-txt">'+buildHTMLForMotes(transcView['transcript'], true, urlMoteType)+'</select>\
                    <label>Transcript Text 2</label>\
                    <select name="av-transcript-txt2" id="av-transcript-txt2">'+buildHTMLForMotes(transcView['transcript2'], true, urlMoteType)+'</select>\
                    <label>Time Stamp(clip)</label>\
                    <select name="av-transcript-clip" id="av-transcript-clip">'+buildHTMLForMotes(transcView['timecode'], true, textMoteType)+'</select>';

    $('.transc-view').append(transHTML);

    updateTranscButtons();

    if(transcView['content']){
      var htmlStr = $('<div/>');
      _.each(transcView['content'],function(val) {
        $(htmlStr).append(buildContentMotesHTML(val));
      });
      $('#transc-content-view').append(htmlStr);
    }

      // Need to update the Create and Delete buttons acc. to source
    $("#av-transcript-source").change(function() {
      projectNeedsToBeSaved();
      updateTranscButtons();
    });
      // Just dirty project for any new setting
    $("#av-transcript-audio, #av-transcript-txt, #av-transcript-txt2, #av-transcript-clip").change(function () {
      projectNeedsToBeSaved();
    });

      // Carry out Create or Delete button actions
    $("#create-transc-mote").click(function() {
      var transcMoteName = $("#av-transcript-source option:selected").val();
console.log("Create transcription mote "+transcMoteName);
      if (transcMoteName) {
        doCreateLegend(transcMoteName, updateTranscButtons);
      }
    });

    $("#del-transc-mote").click(function() {
        var transcMoteName = $("#av-transcript-source option:selected").val();
        $('#deleteModal').remove();
        $('body').append('<!-- Modal -->\
            <div id="deleteModal" class="modal hide fade" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">\
              <div class="modal-header">\
                <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>\
                <h3 id="myModalLabel">Delete Category</h3>\
              </div>\
              <div class="modal-body">\
                <p>This will delete all values associated with the '+transcMoteName+' category.</p>\
              </div>\
              <div class="modal-footer">\
                <button class="btn" data-dismiss="modal" aria-hidden="true">Cancel</button>\
                <button class="btn btn-danger delete-confirm">Delete Category</button>\
              </div>\
            </div>');
        $('#deleteModal').modal('show');
        $('.delete-confirm').click(function(){
          $('#deleteModal .delete-confirm').text('deleting...');
          deleteTerms(transcMoteName, updateTranscButtons);
          projectNeedsToBeSaved();
        });
    });
  } // addHTMLForTranscView()


    // PURPOSE: Called to create HTML for Main View and Modal View sections of Views tab
  function addHTMLForViewsTab() {
    var textMoteType = ['Text'];
    var viewObject = projectObj['views'];

    $('.viz-width').val(viewObject['viz-width']);
    $('.viz-height').val(viewObject['viz-height']);
      //catch for old settings(map-fullscreen)
    if(viewObject['map-fullscreen']) {
      $('.viz-fullscreen').prop('checked',viewObject['map-fullscreen']);
    }
    else {
      $('.viz-fullscreen').prop('checked',viewObject['viz-fullscreen']);
    }

    addHTMLForPostView(viewObject['post']);
    addHTMLForTranscView(viewObject['transcript']);

      // Handle deleting content for either Post View or Transc View
    bindDelContentMote();

      // Adding new motes to either Post or Transcript views
    $('.add-mote-content').click(function() {
          // Need to add to HTML immediately above button!
        $(this).prev().append(buildContentMotesHTML());
        projectNeedsToBeSaved();

          // New button to bind, but must replace all (so we don't get multiple bindings and calls)
        bindDelContentMote();
    });

       // Modal view settings html
    $('#modalView .accordion-inner').append(
      '<h3>Modal Size</h3>'+'<p>'+
      '<label class="checkbox inline"><input type="radio" name="modalSize" value="tiny" />'+
      'Tiny</label>'+
      '<label class="checkbox inline"><input type="radio" name="modalSize" value="small" />'+
      'Small</label>'+
      '<label class="checkbox inline"><input type="radio" name="modalSize" value="medium" checked="checked"/>'+
      'Medium</label>'+
      '<label class="checkbox inline"><input type="radio" name="modalSize" value="large" />'+
      'Large</label>'+
      '<label class="checkbox inline"><input type="radio" name="modalSize" value="xlarge" />'+
      'X-Large</label>'+'</p>'
    );
      // if setting exists then set modal size
    if(viewObject['select']['width']) {
      _.each($('#modalView input[name=modalSize]'), function(val, key) {
        if(viewObject['select']['width']===val.value) {
          $(val).prop('checked',true);
        }       
      });
    }

      // Setup layout for "Modal View"
    $('.setup-modal-view').click(function() {
        // Cover case that settings do not exist
      var selectData = projectObj['views']['select'] || new Array();
      var title = blankStringIfNull(selectData['title']);
      var content = [];
      var linkTarget, linkTarget2, linkTargetLabel, linkTarget2Label, linkTab, link2Tab;

      if(selectData['link']) {
        linkTarget = selectData['link'];
        if(selectData['link-label']) {
          linkTargetLabel = 'value="'+selectData['link-label']+'"';
        }
        if(selectData['link-new-tab']) {
          linkTab = 'checked="checked"';
        }
      }
      if(selectData['link2']) {
        linkTarget2 = selectData['link2'];
        if(selectData['link2-label']) {
          linkTarget2Label = 'value="'+selectData['link2-label']+'"';
        }
        if(selectData['link2-new-tab']) {
          link2Tab = 'checked="checked"';
        }
      }
      $('#projectModal').empty();
      $('#projectModal').append('<div class="modal-header">\
        <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>\
        <h3 id="myModalLabel">Choose Title: <select name="custom-fields" class="title-custom-fields"><option selected="selected" value="the_title" >Marker Title</option>'+buildHTMLForMotes(title, false, textMoteType)+'</select></h3>\
      </div>\
      <div class="modal-body">\
        <p>Select widgets to display in the modal.</p>\
        <ul id="modal-views">\
        </ul><button class="btn btn-success add-modal-view" type="button">Add Widget</button>\
        <p>Select the motes to display in the modal.</p>\
        <ul id="modal-body-content">\
        </ul><button class="btn btn-success add-modal-content" type="button">Add Mote</button>\
        <p>Setup Links</p>\
        <div><label class="inline pull-left" >Link 1: <input type="text" name="link-legends-label" class="link-legends-label" placeholder="Label" '+linkTargetLabel+'/><select name="link-legends" class="link-legends">'+buildHTMLForSetupLinks(linkTarget)+'</select></label>\
        <label class="checkbox inline"><input type="checkbox" class="link-new-tab" '+linkTab+'>'+
        'Open New Tab</label></div>\
        <div><label class="inline pull-left" >Link 2: <input type="text" name="link-legends2-label" class="link-legends2-label" placeholder="Label" '+linkTarget2Label+'/><select name="link-legends2" class="link-legends2">'+buildHTMLForSetupLinks(linkTarget2)+'</select></label>\
        <label class="checkbox inline"><input type="checkbox" class="link2-new-tab" '+link2Tab+'>'+
        'Open New Tab</label></div>\
      </div>\
      <div class="modal-footer">\
        <button class="btn" data-dismiss="modal" aria-hidden="true">Cancel</button>\
        <button class="btn btn-primary" id="save-modal-view" aria-hidden="true">Confirm</button>\
      </div>');

      if(selectData['view-type']) {
        _.each(selectData['view-type'],function(val) {
          //console.log(val);
          $('#modal-views').append(buildModalView(val));
        });
        $('.delete-modal-view').unbind('click');
        $('.delete-modal-view').on('click',function(){
          $(this).parent().remove();
        });
      }

      if(selectData['content']) {
        _.each(selectData['content'],function(val) {
            // Add select modal content motes
          $('#modal-body-content').append(buildContentMotesHTML(val));
            // Must rebind code since we've created more content mote buttons
          bindDelContentMote();
        });
      }

      $('#save-modal-view').click(function(e) {
        selModalSettings = new Object;
        e.preventDefault();
        //console.log($('#projectModal .title-custom-fields option:selected').val());
        selModalSettings['title'] = $('#projectModal .title-custom-fields option:selected').val();
        selModalSettings['view-type'] = new Array();
        $('#projectModal .modal-view').each( function(i) {
          selModalSettings['view-type'].push($(this).val());
        });
        selModalSettings['content'] = new Array();
        $('#projectModal .sel-content-motes').each( function(i) {
          selModalSettings['content'].push($(this).val());
        });
        selModalSettings['link'] = $('#projectModal .link-legends option:selected').val();
        selModalSettings['link-label'] = $('#projectModal .link-legends-label').val();
        selModalSettings['link-new-tab'] = $('#projectModal .link-new-tab').prop('checked');

        selModalSettings['link2'] = $('#projectModal .link-legends2 option:selected').val();
        selModalSettings['link2-label'] = $('#projectModal .link-legends2-label').val();
        selModalSettings['link2-new-tab'] = $('#projectModal .link2-new-tab').prop('checked');

        projectObj['views']['select'] = selModalSettings;

        projectNeedsToBeSaved();
        $('#projectModal').modal('hide'); 
      });

      $('.add-modal-view').click(function(e){
        //console.log($('#projectModal .custom-fields option:selected').val());
        $('#modal-views').append(buildModalView());
        $('.delete-modal-view').on('click',function(){
          $(this).parent().remove();
        });
      });

      $('.add-modal-content').click(function(e){
        //console.log($('#projectModal .custom-fields option:selected').val());
        $('#modal-body-content').append(buildContentMotesHTML());
        bindDelContentMote();
      });
    }); // create modal

  } // addHTMLForViewsTab()


  function bindDelContentMote()
  {
      $('.del-sel-content').off('click');
      $('.del-sel-content').on('click',function() {
          $(this).parent().remove();
          projectNeedsToBeSaved();
      });
  } // bindDelContentMote()


    // INPUT:  selected = mote name which is current selection, or null
    // RETURN: string of HTML for selection of all available motes, inc. delete button
  function buildContentMotesHTML(selected) {
    var contentMote = '<li><select class="sel-content-motes">'+
            buildHTMLForMotes(selected)+
            '</select> <button class="btn btn-danger del-sel-content" type="button">-</button></li>';
    return contentMote;
  } // buildContentMotesHTML()


  function buildModalView(selected)
  {
    var modalView = '<li><select name="modal-view" class="modal-view">'+
            getModalViewSelection(selected)+
            '</select> <button class="btn btn-danger delete-modal-view" type="button">-</button></li>';
    return modalView;
  }

    // RETURNS: HTML string of dropdown options for all Entry Points defined for Project
    // ASSUMES: Can read entry points from projectObj 
  function getModalViewSelection(selected) {
    var modalSelection = '';

    _.each(modalViewNames, function(name) {
      var isSelected;
      isSelected = (selected===name) ? 'selected' : '';
      modalSelection += '<option name="'+name+'" '+isSelected+' >'+name+'</option>';
    });
    return modalSelection;
  } // getModalViewSelection()


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
  } // getEntryPoints()

    // INPUT:   layerArray = layers[] array in entry point for map settings (or null if new map)
    // ASSUMES: Data about base layers has been embedded in page in DIV called hidden-layers
  function loadLayers(layerArray)
  {
    // console.log(layerObject)
    var layerHtml = $('<ul><li><label>Base Layer</label><select name="base-layer" id="base-layer"></select></li></ul>');
    $('select', layerHtml).append($('#hidden-layers .base-layer').clone());

    // if(layerArray != null && typeof layerArray === 'object') {
      for (var i =0; i < Object.keys(layerArray).length; i++) {
          // First item is Base Layer
        if(i==0) {
          $('select option#'+layerArray[i]['id'], layerHtml).attr('selected','selected');
          $('select option#'+layerArray[i]['id'], layerHtml).attr('data-opacity',layerArray[i]['opacity']);
          $('li', layerHtml).append('<br/><div class="layer-opacity"></div><span class="slider-value">'+layerArray[i]['opacity']+'</span> Opacity</div>');
          $('li', layerHtml).append('<label>Additional Layers</label>');

          // Additional overlay layers
        } else{
          $(layerHtml).append(addNewLayer('',layerArray[i]['opacity']));
          $('li',layerHtml).eq(i).find('select option#'+layerArray[i]['id']).attr('selected','selected');
          $('select option#'+layerArray[i]['id'], layerHtml).attr('data-opacity',layerArray[i]['opacity']);
        }
      }
    // }
    return $(layerHtml).html();
  } // loadLayers()


    // RETURNS: jQuery object for default settings of a new map layer
  function addNewLayer(selected,layerOpacity){
    if(!layerOpacity) {
      layerOpacity = 1;
    }
    var layerLine = $('<li><select name="overlay"></select> <button class="btn btn-danger delete-layer" type="button">-</button><div><div class="layer-opacity"></div><span class="slider-value">'+layerOpacity+'</span> Opacity</div></li>');
    $('select',layerLine).append($('#hidden-layers option').clone());
    $('.delete-layer',layerLine).click(function(){
      $(this).closest('li').remove();
      projectNeedsToBeSaved();
    });
    return layerLine;
  }

  function getAvailableLayers() {
    //console.log($('#hidden-layers'));
    var layersA = $('#hidden-layers').clone();
    return layersA;
  }

    // PURPOSE: Show modal about creation of legend terms, invoke AJAX function
    // INPUT:   moteName
    //          updateCallBack = function to call for updating after finish, or null
  function doCreateLegend(moteName, updateCallBack) {
    var mote = getMote(moteName);
    $('#createModal').remove();
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
    dhpCreateLegendTax(mote, updateCallBack);
  } // doCreateLegend()


    // PURPOSE: Bind all event listeners for Legend buttons
  function bindLegendEvents() {
      // Create Legend buttons
    $('.create-legend').unbind('click');
    $('.create-legend').click(function() {
        var moteName = $(this).parent().find('.filter-mote option:selected').val();
        // var projectID = projectObj['project-details']['id'];
        doCreateLegend(moteName, changeToLoadBtn);
    });

      // Configure Legend buttons
    $('.load-legend').unbind('click');
    $('.load-legend').click(function() {
        var moteName = $(this).parent().find('.filter-mote option:selected').val();
        // var projectID = projectObj['project-details']['id'];
        //console.log(projectObj['motes'])
        dhpConfigureMoteLegend(moteName, true);
    });

      // Delete Legend buttons
    $('.delete-legend').unbind('click');
    $('.delete-legend').click(function() {
      var moteName = $(this).parent().find('.filter-mote option:selected').val();

      var createdYet = $(this).parent('li');
      // console.log($(createdYet).children().eq(1));
      var lineID = $(this).closest('li').attr('id');
      if($(createdYet).children().eq(1).hasClass('load-legend')) {
        $('#deleteModal').remove();
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
          deleteTerms(moteName, null);
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
  } // bindLegendEvents()


    // RETURNS: HTML string to represent legendList
  function buildHTMLForLegendList(legendList) {
      var listHtml ='';
      if(legendList) {
        for (var i =0; i < Object.keys(legendList).length; i++) {
          listHtml += buildHTMLForALegend(legendList[i],i+1);
         }
      }
    return listHtml;
  } // buildHTMLForLegendList()


    // RETURNS: HTML string to represent theLegend, which is index (1..n) in list
    // INPUT:   theLegend = null if there are no legends yet at all
    //          count = 0 if there are no legends yet at all
    // TO DO:   Change to different datatype in future?
  function buildHTMLForALegend(theLegend, count) {
    var textMoteType=['Text'];
    var legendButton = '<button class="btn btn-success load-legend" type="button">Configure</button>';
    if (count == 0) {
      theLegend = '';
      legendButton = '<button class="btn btn-inverse create-legend" type="button">Create</button><button class="btn btn-success load-legend hide" type="button">Configure</button>';
      tempcount = $('.legend-list li').length;
      count = tempcount+1;
    }
    var legendLine = '<li id="legend-'+count+'"><select name="filter-mote" class="filter-mote">'+
                          buildHTMLForMotes(theLegend,false,textMoteType)+'</select>'+
                          legendButton+' <button class="btn btn-danger delete-legend" type="button">Delete</button>\
                          </li>';
    return legendLine;
  } // buildHTMLForALegend()


    // RETURNS: HMTL string to represent option list in Setup Links dropdown options in Modal Views
    // INPUT:   selected is the current selection
    // NOTES:   Check to see which motes actually have categories created before adding as option?
    //          Accumulate legend motes from visualizations (like maps)?
  function buildHTMLForSetupLinks(selected)
  {
    // var mapObject = getEntryPointByType(projectObj['entry-points'], 'map');
    var optionHtml = '';
    if(selected=="no-link") {
      optionHtml = '<option name="no-link" value="no-link" selected="selected">No Link</option><option name="marker" value="marker" >Marker Post</option>';
    } else if (selected=="marker") {
      optionHtml = '<option name="no-link" value="no-link" >No Link</option><option name="marker" value="marker" selected="selected" >Marker Post</option>';
    } else {
      optionHtml = '<option name="no-link" value="no-link" >No Link</option><option name="marker" value="marker" >Marker Post</option>'; 
    }

      // For linking to taxonomic pages
    // _.each(mapObject['settings']['filter-data'], function(theFilter) {
    //   if(theFilter===selected) {
    //     optionHtml += '<option name="'+theFilter+'" value="'+theFilter+'" selected="selected" >'+theFilter+' (Legend)</option>';
    //   } else {
    //     optionHtml += '<option name="'+theFilter+'" value="'+theFilter+'" >'+theFilter+' (Legend)</option>';
    //   }
    // });

      // For linking to mote values
    _.each(projectObj['motes'], function(theFilter) {
      // console.log(theFilter.type)
//      if( theFilter.name+' (Mote)' === selected && theFilter.type === 'URL' ) {
//        optionHtml += '<option name="'+theFilter.name+'" value="'+theFilter.name+' (Mote)" selected="selected" >'+theFilter.name+' (Mote)</option>';
//      } else if( theFilter.type ==='URL' ) {
//        optionHtml += '<option name="'+theFilter.name+'" value="'+theFilter.name+' (Mote)" >'+theFilter.name+' (Mote)</option>';
//      }

      switch (theFilter.type) {
      case 'URL':
        if( (theFilter.name+' (Mote)') === selected) {
          optionHtml += '<option name="'+theFilter.name+'" value="'+theFilter.name+' (Mote)" selected="selected" >'+theFilter.name+' (Mote)</option>';
        } else {
          optionHtml += '<option name="'+theFilter.name+'" value="'+theFilter.name+' (Mote)" >'+theFilter.name+' (Mote)</option>';
        }
        break;
      default:
        if(theFilter.name===selected) {
          optionHtml += '<option name="'+theFilter.name+'" value="'+theFilter+'" selected="selected" >'+theFilter.name+' (Legend)</option>';
        } else {
          optionHtml += '<option name="'+theFilter.name+'" value="'+theFilter+'" >'+theFilter.name+' (Legend)</option>';
        }
        break;
      }
    });
    return optionHtml;
  } // buildHTMLForSetupLinks()


    // RETURNS: mote Object associated with Project whose name is moteName
    // ASSUMES: Can use projectObj data
  function getMote(moteName) {
    return _.find(projectObj['motes'], function(thisMote) { return thisMote['name'] == moteName; });
  }

    // RETURNS: HTML string of dropdown options for motes defined by project of a specific type
    // INPUT:   selected is the current selection (name of mote), if any
    //          canBeNone is true if user can select no mote at all
    //          moteTypes is the array of allowable types, or undefined for any type
    // ASSUMES: Can use projectObj data
  function buildHTMLForMotes(selected, canBeNone, moteTypes) {
    var moteOptions, selectedTxt;

    if (canBeNone) {
      moteOptions = '<option value="">(none)</option>';
    } else {
      moteOptions = '';
    }

      // Go through all of the Project's defined motes, find matches on type
    _.each(projectObj['motes'], function(theMote) {
      selectedTxt = (theMote['name'] == selected) ? 'selected="selected"' : '';
        // Check to see if mote type appears in array
      if(!moteTypes || (_.indexOf(moteTypes, theMote['type']) != -1)) {
        moteOptions += '<option value="'+theMote['name']+'" '+selectedTxt+'>'+theMote['name']+'</option>';
      }
    });

    return moteOptions;
  } // buildHTMLForMotes()


  function blankStringIfNull(value) {
    if(!value) {
      return '';
    } else {
      return value;
    }
  } // blankStringIfNull()


    // PURPOSE: Insert HTML for moteList (corresponding to "motes" of project settings) and preloads the data
  function insertHTMLForMoteList(moteList) {
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
                        <div class="control-group">\
                          <select name="cf-type" class="cf-type">\
                             '+buildHTMLForDataTypes(moteList[i]['type'])+'\
                          </select><span class="help-inline">data type</span>\
                        </div>\
                        <div class="control-group">\
                            '+buildHTMLForCustomFields(moteList[i]['custom-fields'])+'\
                          <span class="help-inline">custom field</span>\
                          <label class="checkbox inline">\
                            <input type="checkbox" id="pickMultiple" value="multiple"> Multiple\
                          </label>\
                        </div>\
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
          // If mote really deleted, we need to update all settings and menus
        if($(this).text()=='Confirm Delete') {
          $('body').trigger('motes-changed');
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
    $('#save-btn').addClass('btn-danger');
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
  function buildHTMLForCustomFields(selected) {
    if(!selected) { selected = '';}
    var trimSelected = selected.split(',');

    cflistString = $('#create-mote').find('.custom-fields option').map(function() {
      return $(this).val();
    }).get().join();
    cflist = cflistString.split(',');

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
  } // buildHTMLForCustomFields()


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
    // projectObj['project-details']['id'] = $('#dhp-projectid').val();
    projectObj['project-details']['id']           = projectID;
  	projectObj['project-details']['name']         = $('#titlediv #title').val();
    projectObj['project-details']['version']      = 2;
    projectObj['project-details']['home-label']   = $('#home-label').val();
    projectObj['project-details']['home-url']     = $('#home-url').val();
    projectObj['project-details']['max-inactive'] = $('#max-inactive').val();

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
  	$('#entry-point .ep').each(function(index) {
  		var type = $(this).attr('id').split('-');
      projectObj['entry-points'][index] = new Object();
      projectObj['entry-points'][index]["type"] = type[0];
      projectObj['entry-points'][index]["settings"] = new Object();

  		switch(type[0]) {
      case 'map':
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

       	projectObj['entry-points'][index]["settings"]['marker-layer'] = $(this).find('#map-marker-selection').val();
        //legends
        projectObj['entry-points'][index]["settings"]['filter-data'] = new Object();
        $('.legend-list li option:selected').each(function(index2) {
          projectObj['entry-points'][index]["settings"]['filter-data'][index2] = $(this).val(); 
        });
        break;

      case 'cards':
        projectObj['entry-points'][index]["settings"]['title'] = $(this).find('#tcard-title-selection').val();
        projectObj['entry-points'][index]["settings"]['color'] = $(this).find('#tcard-color-selection').val();
        projectObj['entry-points'][index]["settings"]['image'] = $(this).find('#tcard-image-selection').val();
        projectObj['entry-points'][index]["settings"]['text']  = $(this).find('#tcard-text-selection').val();
        break;
      }
  	});

    projectObj['views'] = new Object();

    projectObj['views']['viz-fullscreen'] = $('.viz-fullscreen').prop('checked');
    projectObj['views']['viz-width']      = $('.viz-width').val();
    projectObj['views']['viz-height']     = $('.viz-height').val();

    projectObj['views']['post'] = new Object();
    projectObj['views']['post']['title']  = $('.post-view-title').val();
    var markerPostContent = [];
    $('#post-content-view li').each(function(index, theElement){
        markerPostContent.push($(theElement).find('option:selected').val());
    });
    projectObj['views']['post']['content'] = markerPostContent;

      // Settings for select Modal have already been saved, are no longer available on GUI
    projectObj['views']['select'] = selModalSettings;

    projectObj['views']['transcript'] = new Object();
    projectObj['views']['transcript']['audio'] = $('#av-transcript-audio').val();
    projectObj['views']['transcript']['transcript'] = $('#av-transcript-txt').val();
    projectObj['views']['transcript']['transcript2'] = $('#av-transcript-txt2').val();
    projectObj['views']['transcript']['timecode'] = $('#av-transcript-clip').val();
    projectObj['views']['transcript']['source'] = $('#av-transcript-source').val();
    var transcContent = [];
    $('#transc-content-view li').each(function(index, theElement){
        transcContent.push($(theElement).find('option:selected').val());
    });
    projectObj['views']['transcript']['content'] = transcContent;

    // save new modal view size
    projectObj['views']['select']['width'] = $('input[name=modalSize]:checked', '#modalView').val()

      // Save the project_settings as a string in the field
  	$('#project_settings').val(JSON.stringify(projectObj));
      // And send out to WP
  	updateProjectSettings();
  } // saveProjectSettings()


  function addNewTermToLegend(termData){
    var termName = termData['name'];
    var termID = termData['term_id'];
    $('.cat-list .ui-sortable')
      .prepend('<li id="'+termID+'" class="mjs-nestedSortable-leaf"><div><span class="disclose"><span></span></span><span class="term-name">'+termName+'</span><span class="term-count"> </span><span class="term-icon">Pick Visual</span></div></li>');
  }

    // PURPOSE: Create new modal to configure legend
    // INPUT:   title = name of mote (unused!)
    //          data = JSON Object of all of the unique values of the Mote
    //          allowIcons = true if enable selection of icons; false if colors only
  function createConfigureLegendModal(title,data,allowIcons) {
    $('#taxModal .modal-body').empty();
  	$('#taxModal .modal-body').append(buildHTMLForLegendValues(data));
    $('#taxModal .modal-body').append('<div class="icons-color">');
    if (allowIcons) {
      $('#taxModal .modal-body').append('<a class="use-icons">Icons</a> | ');
      $('#taxModal .modal-body .icons-color').append($('.icons').clone());
    }
    $('#taxModal .modal-body').append('<a class="use-colors">Colors</a></div>');

    $('#taxModal .modal-footer').empty();
    $('#taxModal .modal-footer').append('<a class="save-array btn btn-danger pull-right">Save</a>');
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
  		$(this).empty().text('Pick Visual ->');
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

  	// console.log(JSON.stringify(treeObject));
  	createTaxTerms(treeParent, JSON.stringify(treeObject));	
  } // saveArrayTree()


    // PURPOSE: Create HTML for nested sortable list of Legend values w/icon or color (for Configure Legend modal)
    // INPUT:   taxTermString = JSON string for taxonomic term
    // RETURNS: jQuery HTML object for Legend values
    // TO DO:   Make more efficient with _.each()
  function buildHTMLForLegendValues(taxTermString) {
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
  			if(termObj[i].icon_url!='undefined'&&termObj[i].icon_url!=''&&termObj[i].icon_url!=null) {
  				//console.log('before:'+obj[i].icon_url+'after');
          if(termObj[i].icon_url.substring(0,1)=='#') {
            $('li#'+termObj[i].term_id+' div', result).append('<span class="term-icon">'+termObj[i].icon_url+'</span>');
          } else {
  				  $('li#'+termObj[i].term_id+' div', result).append('<span class="term-icon"><img src="'+termObj[i].icon_url+'" height="20px" /></span>');
          }
  			} else {
  				$('li#'+termObj[i].term_id+' div', result).append('<span class="term-icon">Pick Visual</span>');
          //$('li#'+obj[i].term_id+' div', result).append('<span class="term-color">Pick Color</span>');
  			}
  		}
  	}
    return result;
  } // buildHTMLForLegendValues()


    // INPUT:   optionArrayAsJSON = JSON object containing array of items
    // RETURNS: HTML text representing all of the options in optionArrayAsJSON
  function buildHTMLForOptionList(optionArrayAsJSON) {
    var tempOptionArray = JSON.parse(optionArrayAsJSON);
    var tempHtml = null;
    _.each(tempOptionArray, function(val,key){
        // console.log(val)
        tempHtml += '<option value="'+val+'" >'+val+'</option>';
    });
    return tempHtml;
  } // buildHTMLForOptionList()


    // PURPOSE: Change button next to Legend from Create to Configure
  function changeToLoadBtn() {
    $('.create-legend').remove();
    $('.load-legend').removeClass('hide');
    saveProjectListeners();
  }

  //=================================== AJAX functions ==================================

    // PURPOSE: Saves project settings data object
  function updateProjectSettings() {
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
  } // updateProjectSettings()


    // PURPOSE: Create terms for new legend
    // RETURNS: Object with terms
    // INPUT:   mote = record for mote
    //          updateCallBack = function to call after completion, or null
  function dhpCreateLegendTax(mote, updateCallBack) {
    // console.log("Create legend for mote " + mote + " for project " + projectID);
    jQuery.ajax({
          type: 'POST',
          url: ajax_url,
          data: {
              action: 'dhpCreateLegendTax',
              project: projectID,
              mote: mote
          },
          success: function(data, textStatus, XMLHttpRequest){
              $('#createModal').modal('hide');
              if (updateCallBack) {
                updateCallBack();
              }
          },
          error: function(XMLHttpRequest, textStatus, errorThrown){
             alert(errorThrown);
          }
      });
  } // dhpCreateLegendTax()


    // PURPOSE: Get the array of values/terms for moteName
    // INPUT:   moteName = name of mote whose category names need to be fetched
    //          funcToCall = closure to invoke upon completion with mote record and data
  function getMoteLegendValues(moteName, funcToCall) {
    var mote = getMote(moteName);

    jQuery.ajax({
          type: 'POST',
          url: ajax_url,
          data: {
              action: 'dhpGetMoteValues',
              project: projectID,
              associate: false,
              mote: mote
          },
          success: function(data, textStatus, XMLHttpRequest){
                // data is a JSON object
              funcToCall(mote, JSON.parse(data));
          },
          error: function(XMLHttpRequest, textStatus, errorThrown){
             alert(errorThrown);
          }
      });
  } // getMoteLegendValues()


    // PURPOSE: Get term object for legend editor and open modal
    // RETURNS: Object with terms
    // INPUT:   moteName
    //          allowIcons = true if icons can be associated with Mote values, false if color only
  function dhpConfigureMoteLegend(moteName, allowIcons) {
    var mote = getMote(moteName);
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
              associate: true,
              mote: mote
          },
          success: function(data, textStatus, XMLHttpRequest){
              createConfigureLegendModal(mote['name'], data, allowIcons);
          },
          error: function(XMLHttpRequest, textStatus, errorThrown){
             alert(errorThrown);
          }
      });
  } // dhpConfigureMoteLegend()


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
  } // createTaxTerms()

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
  } // updateCustomFieldFilter()


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
  } // replaceCustomFieldFilter()


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
  } // createCustomField()


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
  } // findReplaceCustomField()


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
  } // deleteCustomField()


  function deleteTerms(termName, updateCallback) {
    jQuery.ajax({
          type: 'POST',
          url: ajax_url,
          data: {
              action: 'dhpDeleteTerms',
              project: projectID,
              term_name: termName
          },
          success: function(data, textStatus, XMLHttpRequest){
              $('#deleteModal').modal('hide');
              if (updateCallback) {
                updateCallback();
              }
          },
          error: function(XMLHttpRequest, textStatus, errorThrown){
             alert(errorThrown);
          }
      });
  } // deleteTerms()


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
  } // dhpGetCustomFields()


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
              $('.filter-field-values').empty().append(buildHTMLForOptionList(data));
          },
          error: function(XMLHttpRequest, textStatus, errorThrown){
             alert(errorThrown);
          }
      });
  } // dhpGetFieldValues()


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
  } // dhpCreateTermInTax()

});
