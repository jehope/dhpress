//jQuery noconfilct wrapper fires when page has loaded
jQuery(document).ready(function($) {
    
var projectObj = new Object();
var postID = $('input#post_ID').val();


function pickCenterZoom(){
//setup map to pick center and zoom

var gg = new OpenLayers.Projection("EPSG:4326");
var sm = new OpenLayers.Projection("EPSG:900913");
var osm = new OpenLayers.Layer.OSM();      
//var map = new OpenLayers.Map('set_map');
var map = new OpenLayers.Map({
    div: "map_canvas",
    projection: sm,
    displayProjection: gg,
    layers: [osm]
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

loadSelectedIcons();


$('#add-map').click(function(){

            var mapCount  = countEntries('map') +1;
            if(mapCount==3) {
              var options = { animation: true, 
                              placement:'right',
                              title:'Map limit reached',
                              content:'Maximum of two maps are allowed currently.',
                              trigger:'manual',
                              delay: { show: 500, hide: 100 }
                            }
              $('#map2-tab').popover(options)
              $('#map2-tab').popover('show')
               $('#map2-tab a').tab('show')
              setTimeout(function () {
                $('#map2-tab').popover('hide')
              }, 3000)
            }
            else {
              epsettings = ''
              buildEntryHtml('map',epsettings)
              //show tab/content after loading
              $('#map'+mapCount+'-tab a').tab('show');
            }      
          })
          $('#add-timeline').click(function(){
            var timelineCount  = countEntries('timeline') +1;
            if(timelineCount==2) {
              var options = { animation: true, 
                              placement:'right',
                              title:'Timeline limit reached',
                              content:'Maximum of one timeline are allowed currently.',
                              trigger:'manual',
                              delay: { show: 500, hide: 100 }
                            }
              $('#timeline1-tab').popover(options)
              $('#timeline1-tab').popover('show')
              $('#timeline1-tab a').tab('show');
              setTimeout(function () {
                $('#timeline1-tab').popover('hide')
              }, 3000)
            }
            else {
              epsettings = ''
              buildEntryHtml('timeline',epsettings)
                   //show tab/content after loading
              $('#timeline'+timelineCount+'-tab a').tab('show');
            }    
          })
          function countEntries(type){
            var count = $('#entryTabs .ep-'+type)
            console.log(count.length)
            return count.length;
          }
          var testJson = {
                            "project-details": {
                              "name": "Long Women's Movement",
                              "id": "4233"
                            },
                            "entry-points": {
                                "0": {
                                  "type": "map",
                                  "settings": {
                                      "lat": "38.03501",
                                      "lon": "-88.52349",
                                      "zoom": "5",
                                      "base-layer": "baselayerID",
                                      "marker-layer": "Location Data"
                                    }
                                },
                                "1": {
                                  "type": "timeline",
                                  "settings": {
                                    "start-date": "02/02/2012",
                                    "end-date": "01/14/2013",
                                    "timeline-data": "Event Dates"
                                  }
                                }
                            },
                            "motes": {
                              "0": {
                                "name":"Location Data",
                                "type": "Lat/Lon Coordinates",
                                "custom-fields": "lat,lon",
                                "delim": ""
                              },
                              "1": {
                                "name": "Alternate Locations",
                                "type": "Lat/Lon Coordinates",
                                "custom-fields": "alt_location",
                                "delim": ","
                              },
                              "2": {
                                "name": "Event Dates",
                                "type": "Date Range",
                                "custom-fields": "date_range",
                                "delim": ""
                              }
                            },
                            "shared-motes": {
                              "0": {
                                "name": "Transcripts",
                                "custom-fields": "Interviewee",
                                "shared-control": {
                                  "0": { 
                                    "custom-field-value": "Helen Lewis",
                                    "shared-field": "helen_lewis_transcript"
                                  },
                                  "1" : {
                                    "custom-field-value": "Susan Ambler",
                                    "shared-field": "susan_ambler_transcript"
                                  }
                                } 
                              }
                            }
                        }
          console.log($('#project_settings').val())
          if($('#project_settings').val()) {
          	loadSettings(JSON.parse($('#project_settings').val()))
          }
          else {
          	projectObj['project-details'] = new Object();
          	projectObj['entry-points'] = new Object();
          	projectObj['motes'] = new Object();
          	projectObj['shared-motes'] = new Object();
          	loadSettings(projectObj)
          	saveProjectSettings()
          }
          

          function loadSettings(data) {
          	//if new project
          	projectObj['project-details'] = new Object();
          	projectObj['project-details']['id'] = data['project-details']['id'];
			projectObj['project-details']['name'] = data['project-details']['name'];

            //create handelers to load data in order. Entry points and shared motes are dependent on motes.
            $('body').bind('load-motes', function(e) {
            	if(data['motes']) {
            		projectObj['motes'] = new Object();
              		buildMotes(data['motes'])
              	}
              return;
            });
            $('body').bind('load-entry-points', function(e) {
              if(data['entry-points']) {
              	buildEntryPoints(data['entry-points'])
              }
              return;
            });
            $('body').bind('load-shared-motes', function(e) {
              if(data['shared-motes']) {
              	buildSharedMotes(data['shared-motes'])
              }
              return;
            });
            
            //fire in order
            $('body').trigger('load-motes');
            $('body').trigger('load-entry-points');
            $('body').trigger('load-shared-motes');
            //$('#create-mote .custom-fields').replaceWith(customFieldOption());
            $('#create-mote #create-btn').click(function() {
              createNewMote()
            })

            $('#create-mote #pickMultiple').click(function(){
              if($('#create-mote #pickMultiple').is(':checked')) { 
                $('#create-mote .custom-fields').attr('multiple','multiple');
              }
              else {
                $('#create-mote .custom-fields').removeAttr('multiple');
              } 
            })
          }
          function createNewMote() {
            //console.log($('#create-mote #mote-name').val())
            var newMoteSettings = new Object();
            newMoteSettings[0] = new Object();
            newMoteSettings[0]["name"] = $('#create-mote .mote-name').val()
            newMoteSettings[0]["type"] = $('#create-mote .cf-type').val()
            
            newMoteSettings[0]["custom-fields"] = $('#create-mote .custom-fields option:selected').map(function() {
                  return $(this).val();
              }).get().join();
            newMoteSettings[0]["delim"] = $('#create-mote .delim').val()
            buildMotes(newMoteSettings)
            clearCreateValues()
            
          }
          function countMotes(){
            var count = $('.accordion-group')
            console.log(count.length)
            return count.length;
          }
          function clearCreateValues() {
            $('#create-mote .mote-name').val('')
            $('#create-mote .delim').val('')
            //$('#create-mote .custom-fields option').eq(0).attr('selected','selected')
          }
          //builds the html for the entry points and preloads the data
          function buildEntryPoints(epObject){
            for (var i =0; i < Object.keys(epObject).length; i++) {
              //console.log(epObject[i]["type"])
              
              if(epObject[i]["type"]=="map") {
                console.log("oh yeah itsa map")
              }
              if(epObject[i]["type"]=="timeline") {
                console.log("timeline...no way")
              }
              buildEntryHtml(epObject[i]["type"],epObject[i]["settings"])
            }

              //Object.keys(epObject).length
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

            if(type=='map') {
              

              entryTabContent = '<div class="row-fluid vars">\
                    <div class="cords span6">\
                        <label>Map Center (Lat/Lon)</label>\
                        <div class="input-prepend input-append">\
                          <input class="span2" type="text" name="lat" id="lat" placeholder="Lat" value="'+createIfEmpty(settings['lat'])+'" />\
                          <input class="span2" type="text" name="lon" id="lon" placeholder="Lon" value="'+createIfEmpty(settings['lon'])+'" />\
                          <a href="#myModal" role="button" class="load-map btn" data-toggle="modal">\
                            <i class="icon-screenshot"></i>\
                          </a>\
                        </div>\
                        <label>Initial Zoom</label>\
                        <input type="text" name="zoom" id="zoom" placeholder="Zoom" value="'+createIfEmpty(settings['zoom'])+'" />\
                    </div>\
                    <div class="span6 layers">\
                        <label>Base Layer</label>\
                        <select name="base-layer" id="base-layer">\
                         <option>Default Base Layer</option>\
                        </select>\
                        <select name="overlay" id="overlay">\
                         <option>No overlays available</option>\
                        </select>\
                    </div>\
                </div>\
                <div class="row-fluid vars">\
                    <div class="span6">\
                    	<label>Marker Layer</label>\
                        <select name="marker-layer" id="marker-layer">'+getLoadedMotes(settings['marker-layer'])+'\
                        </select>\
                    </div>\
                    <div class="span6">\
                    	<label>Icon Data</label>\
                        <select name="filter-mote" id="filter-mote">'+getLoadedMotes(settings['filter-data'])+'\
                        </select>\
                        <button class="btn btn-inverse load-legend" type="button">Create Legend</button>\
                    </div>\
                </div>';
            }

            $('#entryTabContent').append('<div class="tab-pane fade in ep" id="'+type+'-'+epCount+'"><button type="button" class="close" >&times;</button>\<p>'+entryTabContent+'</p></div>');

            $('#'+type+'-'+epCount+ ' .close').click(function(e){
                e.stopPropagation();
                e.preventDefault();
                if($(this).text()=='Delete') {
                  	$('#entryTabs .active').remove()
                    $(this).closest('.ep').remove()
                }
                else {
                    $(this).text('Delete')
                }
            })
            $('#'+type+'-'+epCount+ '.ep').click(function(e){
                if($(this).find('.close').text()=='Delete') {
                    $(this).find('.close').html('&times;')
                }
            })
            $('.load-map ').click(function() {
  console.log("fire load map");
    pickCenterZoom();
  });
            $('.load-legend').click(function() {
    			var moteName = $(this).parent().find('#filter-mote option:selected').val();
    			var customName = getMoteCustomField(moteName);
    			var projectID = projectObj['project-details']['id'];
    			diphGetMoteValues(customName,moteName,projectID,true);
    		});

          }
          function getMoteCustomField(findMote) {
          	for (var i =0; i < Object.keys(projectObj['motes']).length; i++) {
          		if(projectObj['motes'][i]['name']==findMote) {
          			return projectObj['motes'][i]['custom-fields']
          		}
          	}
          }
          function getLoadedMotes(selected) {
            var moteOptions = ''
            //if(!selected){ moteOptions += '<option>No Motes Defined</option>'}
            $('#motes .accordion-group .mote-name').each(function() {
              if($(this).val()==selected) {
                moteOptions += '<option value="'+$(this).val()+'" selected="selected">'+$(this).val()+'</option>'
              }
              else {
                 moteOptions += '<option value="'+$(this).val()+'" >'+$(this).val()+'</option>'
              }
               
            })
            return moteOptions;
          }


          function createIfEmpty(value) {
            if(!value) {
              return ''
            }
            else 
              return value
          }
          //builds the html for the motes and preloads the data
          function buildMotes(moteObject){
            var moteCount = countMotes()

            for (var i =0; i < Object.keys(moteObject).length; i++) {
              console.log('html for '+moteObject[i]['name'])
            console.log((moteCount+i))
            projectObj['motes'][(moteCount+i)] = new Object();
            projectObj['motes'][(moteCount+i)]['name'] = moteObject[i]['name']
			projectObj['motes'][(moteCount+i)]['custom-fields'] = moteObject[i]['custom-fields']
			projectObj['motes'][(moteCount+i)]['type'] = moteObject[i]['type']
			projectObj['motes'][(moteCount+i)]['delim'] = moteObject[i]['delim']

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
                        '+customFieldOption(moteObject[i]['custom-fields'])+'\
                      <span class="help-inline">custom field</span>\
                      <select name="cf-type" class="cf-type">\
                         '+dataTypeOption(moteObject[i]['type'])+'\
                      </select><span class="help-inline">data type</span>\
                      <p>\
                      <input class="span4 delim" type="text" name="delim" placeholder="Delimiter" value="'+moteObject[i]['delim']+'"/>\
                      <span class="help-inline">If multiple text indicate the delimiter</span>\
                      </p>\
                      </div>\
                      </div>\
                    </div>\
                  </div>\
                </div>';

                $('#mote-list').append(moteContent)
                $('#group'+(moteCount+i)+' .accordion-toggle .close').click(function(e){
                  e.stopPropagation();
                  e.preventDefault();
                  if($(this).text()=='Delete') {
                    $(this).closest('.accordion-group').remove()
                  }
                  else {
                    $(this).text('Delete')
                  }
                })
                $('#group'+(moteCount+i)+' .accordion-toggle').click(function(e){
                  if($(this).find('.close').text()=='Delete') {
                    $(this).find('.close').html('&times;')
                  }
                })
            }
          }
          //this function has to do some extra work
          //loads in values from a defined custom field from all markers
          //associates the custom values with project custom fields

          function buildSharedMotes(sharedMoteObject){
            for (var i =0; i < Object.keys(sharedMoteObject).length; i++) {
              console.log('shared html for '+sharedMoteObject[i]['name'])

            }
          }
          function dataTypeOption(selected){
            dataTypes = ['Text','Multiple Text','HTML','Exact Date','Date Range',
            'Lat/Lon Coordinates','File']
            dataTypeHTML =''

            for (var i =0; i < Object.keys(dataTypes).length; i++) {
              console.log(selected)
              if(dataTypes[i]==selected) {
                dataTypeHTML += '<option value="'+dataTypes[i]+'" selected="selected">'+dataTypes[i]+'</option>'
              }
              else {
                dataTypeHTML += '<option value="'+dataTypes[i]+'">'+dataTypes[i]+'</option>'
              }
            }
            return dataTypeHTML
          }
          //create select list of custom fields for motes
          function customFieldOption(selected){
            if(!selected){ selected = ''}
            var trimSelected = selected.split(',')
        	cflistString = $('#create-mote').find('.custom-fields option').map(function() {
                  return $(this).val();
              }).get().join();
        	cflist = cflistString.split(',')
            //cflist = ['Audio Url','lat','lon','alt_location','date_range','Interviewee']

            if (trimSelected.length>1) {
              cflistHtml = '<select name="custom-fields" class="custom-fields" multiple="multiple">'
              for (var i =0; i < Object.keys(cflist).length; i++) {
                selectedTag = ''
                for (var j =0; j < Object.keys(trimSelected).length; j++) {                 
                  if(trimSelected[j]==cflist[i]) { selectedTag = 'selected="selected"'} 
                }
                cflistHtml += '<option value="'+cflist[i]+'" '+selectedTag+'>'+cflist[i]+'</option>';
              }
              cflistHtml += '</select>'
            }
            else {
              cflistHtml = '<select name="custom-fields" class="custom-fields">'
              for (var i =0; i < Object.keys(cflist).length; i++) {
                if(selected==cflist[i]) { selectedTag = 'selected="selected"'} else { selectedTag = ''}
                cflistHtml += '<option value="'+cflist[i]+'" '+selectedTag+'>'+cflist[i]+'</option>';
              }
              cflistHtml += '</select>'
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
    
    $('.make-tax').unbind('click');
    $('.make-tax').click(function() {
    	var moteName = jQuery(this).parent('li').find('input').val();
    	var projectID = jQuery('#post_ID').val();
    	diphGetMoteValues(moteName,projectID,false);
    	$(this).next('.legend').show();
		$(this).replaceWith('<span class="loaded">Loaded</span>');
		

    });
    $('.legend').unbind('click');
    $('.legend').click(function() {
    	var moteName = jQuery(this).parent('li').find('input').val();
    	var projectID = jQuery('#post_ID').val();
    	diphGetMoteValues(moteName,projectID,true);
    	
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
$('#save-btn').on('click', function(){
	// var btn = $(this)
	// 	btn.button();
 //        btn.button('loading')
 //        setTimeout(function () {
 //          btn.button('reset')
 //        }, 3000)
	saveProjectSettings()
    
});



function saveProjectSettings()	{
	console.log($('#diph-projectid').val())
	projectObj['project-details'] = {"name": $('#titlediv #title').val(),"id":$('#diph-projectid').val()}
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
			projectObj['entry-points'][index]["settings"]['lat'] = $(this).find('#lat').val()
        	projectObj['entry-points'][index]["settings"]['lon'] = $(this).find('#lon').val()
        	projectObj['entry-points'][index]["settings"]['zoom'] = $(this).find('#zoom').val()
        	projectObj['entry-points'][index]["settings"]['base-layer'] = $(this).find('#base-layer').val()
        	projectObj['entry-points'][index]["settings"]['marker-layer'] = $(this).find('#marker-layer').val()
        	projectObj['entry-points'][index]["settings"]['filter-data'] = $(this).find('#filter-mote').val()
        }
        if(type[0]=='timeline') {
			projectObj['entry-points'][index] = new Object();
			projectObj['entry-points'][index]["type"] = type[0]
        	projectObj['entry-points'][index]["settings"] = new Object();

        	projectObj['entry-points'][index]["settings"]['start-date'] = $(this).find('#start-date').val()
        	projectObj['entry-points'][index]["settings"]['end-date'] = $(this).find('#end-date').val()
        	projectObj['entry-points'][index]["settings"]['timeline-data'] = $(this).find('#timeline-mote').val()
        }
	})


	

	//save object for real
	$('#project_settings').val(JSON.stringify(projectObj));
	updateProjectSettings();
}


function createLegend(data){
	
	//$('#filter_legend_builder').append(data);
	//$('#filter_legend_builder').append($('.icons'));
	tb_show('Create Legend', '#TB_inline?&inlineId=filter_legend_builder' );
	$('#TB_ajaxContent').append('<a class="save-array button-primary">Save</a>');
	resizeTB();
	
	$('#TB_ajaxContent').append(diphCatObject(data));

	$('#TB_ajaxContent').append($('.icons').clone());
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
	$('.term-icon').click(function(e){
		console.log($(this).parents('li').attr('id'));
		//$('.mjs-nestedSortable-expanded').toggleClass('mjs-nestedSortable-collapsed');
		$(this).empty().text('Choose icon ->');
		var termID = $(this).parents('li').attr('id');
		$('#TB_ajaxContent .icons a').click(function(){
			var icon_url = $(this).find('img').attr('src');
			var img = $(this).find('img').clone();
			$(img).css({'height':'20px','margin-top': '-3px'});
			console.log(termID+' '+icon_url);
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
	console.log(lis.length);
	var i = 0;
	var treeParent = $('.cat-list h2').attr('id');

	$(lis).each(function(index){
		var tempParent = $(this).parents('li').attr('id');
		if(!tempParent){tempParent = '';}
		var tempName = $(this).children().find('.term-name').eq(0).text();
		var tempCount = $(this).children().find('.term-count').eq(0).text();
		var tempIcon = $(this).children().find('.term-icon img').eq(0).attr('src');
		if (!tempIcon) { 
			console.log('fire'); 
			//tempIcon = $(this).parentsUntil( $("ol.sortable"), "li" ).find('.term-icon img').eq(0).attr('src'); 
			console.log(tempIcon);
		}
		if(i<1) { termTree +='{'; }
		else { termTree +=',{';}
		termTree +='"term_id":"'+this.id+'","name":"'+tempName+'","term_order":"'+i+'","parent":"'+tempParent+'","count":"'+tempCount+'","icon_url":"'+tempIcon+'"}';
		i++;
	});
	termTree += ']';
	console.log(termTree);
	createTaxTerms(treeParent,postID,termTree);	
}


function diphCatObject(data){
	var catObject = JSON.parse(data);
	var htmlObj = show_props(catObject);
	
	return htmlObj;
}
function show_props(obj) {
	var htmlStart = '';
    var result = $('<div class="cat-list"><ol class="sortable"></ol></div>');

    var countTerms = Object.keys(obj).length; 
	for(i=0;i<countTerms;i++) {
		if(obj[i].parent==0) {
			
			$(result).prepend('<h2 id="'+obj[i].term_id+'">'+obj[i].name+'</h2>');
			console.log('title');
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
				console.log('before:'+obj[i].icon_url+'after');
				$('li#'+obj[i].term_id+' div', result).append('<span class="term-icon"><img src="'+obj[i].icon_url+'" height="20px" /></span>');
			}
			else {
				$('li#'+obj[i].term_id+' div', result).append('<span class="term-icon">Pick Icon</span>');
			}
		}
	}
    
    
    return result;
}
function moteTerms(moteName) {

} 
//AJAX functions
function updateProjectSettings(){
	projectID = postID;
	var settingsData = $('#project_settings').val();
	jQuery.ajax({
        type: 'POST',
        url: 'http://msc.renci.org/dev/wp-admin/admin-ajax.php',
        data: {
            action: 'diphSaveProjectSettings',          
            project: projectID,
            settings: settingsData
        },
        success: function(data, textStatus, XMLHttpRequest){
            console.log(textStatus);
            console.log(data);
        
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
        url: 'http://msc.renci.org/dev/wp-admin/admin-ajax.php',
        data: {
            action: 'diphCreateTaxTerms',
            mote_name: treeParentID,
            project: projectID,
            terms: termData
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
function diphGetMoteValues(customName,moteName,projectID,loadLegend) {
	console.log(moteName);
	jQuery.ajax({
        type: 'POST',
        url: 'http://msc.renci.org/dev/wp-admin/admin-ajax.php',
        data: {
            action: 'diphGetMoteValues',
            project: projectID,
            custom_name: customName,
            mote_name: moteName
        },
        success: function(data, textStatus, XMLHttpRequest){
            console.log(textStatus);
            //console.log(JSON.parse(data));
            moteTerms(moteName);
            if(loadLegend && data) { createLegend(data); }
            //

        },
        error: function(XMLHttpRequest, textStatus, errorThrown){
           alert(errorThrown);
        }
    });
}	
});