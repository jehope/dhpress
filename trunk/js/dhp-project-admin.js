// PURPOSE: Handle functions for Edit Project admin page
//          This file loaded by add_dhp_project_admin_scripts() in dhp-project-functions.php
// ASSUMES: dhpDataLib is used to pass parameters to this function via wp_localize_script()
//          Hidden data in DIV ID hidden-layers for info about map layers
//          Initial project settings embedded in HTML in DIV ID project_settings by show_dhp_project_settings_box()
// USES:    Libraries jQuery, Underscore, Knockout, jQuery UI, jQuery.nestable, jquery-colorpicker
// NOTES:   Relies on some HTML data generated in show_dhp_project_settings_box() of dhp-project-functions.php
//          Data that relies on WP queries cannot be passed in via "localization" pf dhpDataLib because that
//            causes WP globals (like $post) to be overwritten

jQuery(document).ready(function($) {
    // Parameters passed via localization
  var ajax_url     = dhpDataLib.ajax_url;
  var projectID    = dhpDataLib.projectID;

    // Parameters passed via HTML elements; need to ensure encoded as arrays (not Object properties)
  var customFieldsParam = $('#custom-fields').text();
  customFieldsParam = JSON.parse(customFieldsParam);
  customFieldsParam = normalizeArray(customFieldsParam);

  var mapLayersParam = $('#map-layers').text();
  mapLayersParam = JSON.parse(mapLayersParam);
  mapLayersParam = normalizeArray(mapLayersParam);

    // Get initial project settings
  var savedSettings = JSON.parse($('#project_settings').val());

      // Constants
  var _blankSettings = { 'project-details': { 'version': 2, 'home-label': '', 'home-url': '', 'max-inactive': 0 },
        'motes': [], 'entry-points': [],
        'views': { 'post': {},
              'select': { 'view-type': [], 'content': [] },
              'transcript': { content: [] }
            }
        };

//===================================== UTILITIES ===================================

    // PURPOSE: Ensure that data is returned as array
    // NOTES:   This is necessary because of irregular JSON encoding: sometimes array is encoded as Object properties
  function normalizeArray(data) {
    if (_.isArray(data)) {
      return data;
    }
    return _.values(data);
  };

    // PURPOSE: Change empty setting string to 'disable' as default
  function disableByDefault(setting) {
    if (setting === null || setting === '' || setting === 'no-link') {
      return 'disable';
    }
    return setting;
  };

//===================================== OBJECT CLASSES ===================================

    // Class constructor for a String element in an array (such as settings.filter-data)
    // NOTES: This is necessary because KO needs to bind to an object in an observable array, rather than just
    //          a string. See the following for explanation:
    //          http://stackoverflow.com/questions/15749572/how-can-i-bind-an-editable-ko-observablearray-of-observable-strings?lq=1
    //          https://github.com/knockout/knockout/issues/708
  var ArrayString = function(theString) {
    this.name = ko.observable(theString);
  }
  ArrayString.prototype.toJSON = function() {
    return this.name;
  };

    // Class constructor for Mote
    // NOTES: Once constructed, these are only displayed, so we don't need to make them observable
  var Mote = function(name, type, customField, delim) {
    var self = this;

    self.name = name;
    self.type = type;
    self['custom-fields'] = customField;
    self.delim= delim;
  } // Mote()


    // Class constructor for Map Entry Point
    // NOTES: Since user can always change these, we need to make them observable
  var MapEntryPoint = function(epSettings) {
    var self = this;

    self.type = 'map';
    self.settings = { };
    self.settings.lat = ko.observable(epSettings.settings.lat);
    self.settings.lon = ko.observable(epSettings.settings.lon);
    self.settings.zoom = ko.observable(epSettings.settings.zoom);
    self.settings.layers = ko.observableArray();
    ko.utils.arrayForEach(normalizeArray(epSettings.settings.layers), function(theLayer) {
      self.settings.layers.push(new MapLayer(theLayer));
    });
    self.settings['marker-layer'] = ko.observable(epSettings.settings['marker-layer']);
    self.settings['filter-data'] = ko.observableArray();
    ko.utils.arrayForEach(normalizeArray(epSettings.settings['filter-data']), function(theLegend) {
      self.settings['filter-data'].push(new ArrayString(theLegend));
    });
  } // MapEntryPoint()


    // Class constructor for Entry Point
  var CardsEntryPoint = function(epSettings) {
    var self = this;

    self.type = 'cards';
    self.settings = { };
    self.settings.title = ko.observable(epSettings.settings.title);
    self.settings.color = ko.observable(epSettings.settings.color);
    self.settings.defColor = ko.observable(epSettings.settings.defColor);

    self.settings.content = ko.observableArray();
    ko.utils.arrayForEach(normalizeArray(epSettings.settings.content), function(cMote) {
      self.settings.content.push(new ArrayString(cMote));
    });

    self.settings.filterMotes = ko.observableArray();
    ko.utils.arrayForEach(normalizeArray(epSettings.settings.filterMotes), function(fMote) {
      self.settings.filterMotes.push(new ArrayString(fMote));
    });

    self.settings.sortMotes = ko.observableArray();
    ko.utils.arrayForEach(normalizeArray(epSettings.settings.sortMotes), function(sMote) {
      self.settings.sortMotes.push(new ArrayString(sMote));
    });
  } // CardsEntryPoint()

    // Create new "blank" layer to store in Map entry point
    // NOTES: opacity is the only property that needs double binding
  var MapLayer = function(theLayer) {
    var self = this;

    self.id        = theLayer.id;
    self.name      = theLayer.name;
    self.opacity   = ko.observable(theLayer.opacity).extend({ onedigit: false });
    self.mapType   = theLayer.mapType;
    self.mapTypeId = theLayer.mapTypeId;
  } // MapLayer()

    // Object to store data about Maps in map library (both base and overlay types)
  var MapOption = function(name, mapType, typeID, layerID) {
    var self = this;

    self.name    = name;
    self.mapType = mapType;
    self.typeID  = typeID;
    self.layerID = layerID;
  } // MapOption()


//=================================== MAIN OBJECT ===================================

    // PURPOSE: "Controller" Object that coordinates between Knockout and business layer
    // INPUT:   allCustomFields = array of custom fields used by Project
    //          allMapLayers = complete list of all map selections
  var ProjectSettings = function(allCustomFields, allMapLayers) {
    var self = this;

      // Need to copy into separate arrays according to Base and Overlay
    self.baseLayers = [ ];
    self.overLayers = [ ];

    ko.utils.arrayForEach(allMapLayers, function(theLayer) {
      var newLayer = new MapOption(theLayer.layerName, theLayer.layerType, theLayer.layerTypeId,
                                  theLayer.layerID);
      switch (theLayer.layerCat) {
      case 'base layer':
        self.baseLayers.push(newLayer);
        break;
      case 'overlay':
        self.overLayers.push(newLayer);
        break;
      default:
        throw new Error('Unsupported map category '+theLayer.layerCat);
        break;
      }
    });

      // PURPOSE: For debug -- spit out all of the editable data
    self.showSettings = function() {
      var currentSettings = self.bundleSettings();
      console.log("Current settings are: "+ JSON.stringify(currentSettings));
    };

      // PURPOSE: Handle user selection to save Project Settings to WP
    self.saveSettings = function() {
      var currentSettings = self.bundleSettings();
      var settingsData = JSON.stringify(settingsData);
      saveSettingsInWP(settingsData);
    };

    self.cleanSettings = function() {
      self.settingsDirty(false);
    };

      // PURPOSE: Read all of the settings and package into an object
      // RETURNS: The settings object
      // NOTES:   Need to copy some data from original settings object
    self.bundleSettings = function() {
      var projSettings = {};

      projSettings['project-details'] = {};
      projSettings['project-details'].id = savedSettings['project-details'].id;
      projSettings['project-details'].name = savedSettings['project-details'].name;
      projSettings['project-details'].version = 2;
      projSettings['project-details']['marker-custom-fields'] = allCustomFields;

      projSettings['project-details']['home-label'] = self.edHomeBtnLbl();
      projSettings['project-details']['home-url'] = self.edHomeURL();
      projSettings['project-details']['max-inactive'] = self.edInactiveTimeout();

      projSettings['motes'] = [];
      ko.utils.arrayForEach(self.allMotes(), function(theMote) {
        var savedMote = {};
        savedMote.name             = theMote.name;
        savedMote.type             = theMote.type;
        savedMote.delim            = theMote.delim;
        savedMote['custom-fields'] = theMote['custom-fields'];
        projSettings['motes'].push(savedMote);
      } );

      projSettings['entry-points'] = [];
      ko.utils.arrayForEach(self.entryPoints(), function(theEP) {
        var savedEP = {};
        savedEP.type      = theEP.type;
        savedEP.settings  = {};
        switch(theEP.type) {
        case 'map':
          savedEP.settings.lat    = theEP.settings.lat();
          savedEP.settings.lon    = theEP.settings.lon();
          savedEP.settings.zoom   = theEP.settings.zoom();
          savedEP.settings.layers = [];

          ko.utils.arrayForEach(theEP.settings.layers(), function(theLayer) {
            var savedLayer = {};

            savedLayer.opacity   = theLayer.opacity();
            savedLayer.id        = theLayer.id;

              // Copy name, mapType and mapTypeId values given ID by searching in original maplayer arrays
            ko.utils.arrayFirst(allMapLayers, function(layerItem) {
              if (theLayer.id != layerItem.layerID) {
                return false;
              }
              savedLayer.name      = layerItem.layerName;
              savedLayer.mapType   = layerItem.layerType;
              savedLayer.mapTypeId = layerItem.layerTypeId;
              return true;
            });
            savedEP.settings.layers.push(savedLayer);
          } );
          savedEP.settings['marker-layer'] = theEP.settings['marker-layer']();
          savedEP.settings['filter-data'] = [];
          ko.utils.arrayForEach(theEP.settings['filter-data'](), function(theLegend) {
            savedEP.settings['filter-data'].push(theLegend.name());
          });
          break;
        case 'cards':
          savedEP.settings.title = theEP.settings.title();
          savedEP.settings.color = theEP.settings.color();
          savedEP.settings.defColor = theEP.settings.defColor();

          savedEP.settings.content = [];
          ko.utils.arrayForEach(theEP.settings.content(), function(cMote) {
            savedEP.settings.content.push(cMote.name());
          });

          savedEP.settings.filterMotes = [];
          ko.utils.arrayForEach(theEP.settings.filterMotes(), function(fMote) {
            savedEP.settings.filterMotes.push(fMote.name());
          });

          savedEP.settings.sortMotes = [];
          ko.utils.arrayForEach(theEP.settings.sortMotes(), function(sMote) {
            savedEP.settings.sortMotes.push(sMote.name());
          });

            // Save default values for now
          savedEP.settings.width = 120;
          savedEP.settings.height = 160;
          break;
        } // switch ep type
        projSettings['entry-points'].push(savedEP);
      }); // for each EP

      projSettings.views = {};
      projSettings.views['viz-fullscreen'] = self.edVizFullScreen();
      projSettings.views['viz-width'] = self.edVizWidth();
      projSettings.views['viz-height'] = self.edVizHeight();

      projSettings.views.post = {};
      projSettings.views.post.title = self.edPostTitle();
      projSettings.views.post.content = [];
      ko.utils.arrayForEach(self.postMoteList(), function (theMote) {
        projSettings.views.post.content.push(theMote.name());
      });

      projSettings.views.select = {};
      projSettings.views.select.title = self.edSelTitle();
      projSettings.views.select.width = self.edSelWidth();
      projSettings.views.select['view-type'] = [];
      ko.utils.arrayForEach(self.widgetList(), function (theWidget) {
        projSettings.views.select['view-type'].push(theWidget.name());
      });
      projSettings.views.select.content = [];
      ko.utils.arrayForEach(self.selMoteList(), function (theMote) {
        projSettings.views.select.content.push(theMote.name());
      });

      projSettings.views.select.link = self.edSelLinkMt();
      projSettings.views.select['link-label'] = self.edSelLinkLbl();
      projSettings.views.select['link-new-tab'] = self.edSelLinkNewTab();
      projSettings.views.select.link2 = self.edSelLink2Mt();
      projSettings.views.select['link2-label'] = self.edSelLink2Lbl();
      projSettings.views.select['link2-new-tab'] = self.edSelLink2NewTab();

      projSettings.views.transcript = {};
      projSettings.views.transcript.audio = self.edTrnsAudio();
      projSettings.views.transcript.transcript = self.edTrnsTransc();
      projSettings.views.transcript.transcript2 = self.edTrnsTransc2();
      projSettings.views.transcript.timecode = self.edTrnsTime();
      projSettings.views.transcript.source = self.edTrnsSrc();
      projSettings.views.transcript.content = [];
      ko.utils.arrayForEach(self.taxMoteList(), function (theMote) {
        projSettings.views.transcript.content.push(theMote.name());
      });

      return projSettings;
    }; // bundleSettings()

//----------------------------------- Project Info ----------------------------------

    self.settingsDirty = ko.observable(false);

      // User-editable values
    self.edHomeBtnLbl = ko.observable('');
    self.edHomeURL = ko.observable('');
    self.edInactiveTimeout = ko.observable(20);

      // Methods
    self.setDetails = function(theDetails) {
      self.edHomeBtnLbl(theDetails['home-label']);
      self.edHomeURL(theDetails['home-url']);
      self.edInactiveTimeout(theDetails['max-inactive']);
    };

//-------------------------------------- Motes --------------------------------------

      // Internal Methods

      // RETURNS: Array of moteNames
      // INPUT:   typeList = array of mote types for filter, or else null (to enable all types)
    function doGetMoteNames(typeList, addDisable, addTitle, addContent) {
      var moteNameArray = [];
        // Any special cases to start the mote list?
      if (addDisable) {
        moteNameArray.push('disable');
      }
      if (addTitle) {
        moteNameArray.push('the_title');
      }
      if (addContent) {
        moteNameArray.push('the_content');
      }
      ko.utils.arrayForEach(self.allMotes(), function(theMote) {
        if (typeList == null || (typeList.indexOf(theMote.type) != -1)) {
          moteNameArray.push(theMote.name);
        }
      } );
      return moteNameArray;
    };


      // User-editable values
    self.edMoteType = ko.observable('Short Text');
    self.edMoteName = ko.observable('');
    self.edMoteCF = ko.observable();
    self.edMoteDelim = ko.observable('');

    self.optionsCF = allCustomFields;

      // Configurable data
    self.allMotes = ko.observableArray([]);

      // Computed data
    self.allMoteNames = ko.computed(function() {
      return doGetMoteNames(null);
    }, self);
    self.coordMoteNames = ko.computed(function() {
      return doGetMoteNames(['Lat/Lon Coordinates']);
    }, self);
    self.stMoteNames = ko.computed(function() {
      return doGetMoteNames(['Short Text']);
    }, self);
    self.stdMoteNames = ko.computed(function() {
      return doGetMoteNames(['Short Text'], true);
    }, self);
    self.transcMoteNames = ko.computed(function() {
      return doGetMoteNames(['Transcript'], true);
    }, self);
    self.tstMoteNames = ko.computed(function() {
      return doGetMoteNames(['Timestamp']);
    }, self);
    // self.link2MoteNames = ko.computed(function() {
    //   return doGetMoteNames(['Link To']. true);
    // }, self);
    self.imageMoteNames = ko.computed(function() {
      return doGetMoteNames(['Image'], true);
    }, self);
    self.soundMoteNames = ko.computed(function() {
      return doGetMoteNames(['SoundCloud'], true);
    }, self);
    self.anyTxtMoteNames = ko.computed(function() {
      return doGetMoteNames(['Short Text', 'Long Text'], false, true, true);
    }, self);
    self.anyTxtDMoteNames = ko.computed(function() {
      return doGetMoteNames(['Short Text', 'Long Text'], true, true, true);
    }, self);
    self.cardContentMoteNames = ko.computed(function() {
      return doGetMoteNames(['Short Text', 'Long Text', 'Image'], false, true, true);
    }, self);

      // Methods

      // PURPOSE: Create new mote definition via user interface
      // TO DO:   Add drop-down list of custom fields
    self.createMote = function() {
      if (self.edMoteName() !== '') {
          // Only add if name is unique
        var found = ko.utils.arrayFirst(self.allMotes(), function(mote) {
          return mote.name == self.edMoteName();
        });
        if (found == null) {
          self.allMotes.push(new Mote(self.edMoteName(), self.edMoteType(), self.edMoteCF(), self.edMoteDelim()));
            // reset GUI default values
          self.edMoteName('');
          self.edMoteType('Short Text');
          self.edMoteCF('');
          self.edMoteDelim('');

          self.settingsDirty(true);
        }
      }
    };

      // PURPOSE: Handle deleting a mote definition (and all references to it)
    self.delMote = function(theMote) {
      var moteName = theMote.name;

      $( "#mdl-del-mote" ).dialog({
        resizable: false, height:'auto', width: 'auto', modal: true,
        buttons: {
          'Delete': function() {

              // Remove all occurrences of mote name from everywhere in ProjectSettings
            ko.utils.arrayForEach(self.entryPoints(), function(theEP) {
              switch (theEP.type) {
              case 'map':
                if (theEP.settings['marker-layer']() == moteName) {
                  theEP.settings['marker-layer']('');
                }
                theEP.settings['filter-data'].remove(function(mote) { return mote.name() === moteName; });
                break;
              case 'cards':
                if (theEP.settings.title() == moteName) { theEP.settings.title(''); }
                if (theEP.settings.color() == moteName) { theEP.settings.color(''); }

                theEP.settings.content.remove(function(mote) { return mote.name() === moteName; });
                theEP.settings.filterMotes.remove(function(mote) { return mote.name() === moteName; });
                theEP.settings.sortMotes.remove(function(mote) { return mote.name() === moteName; });
                break;
              }
            });

            if (self.edSelTitle()  == moteName) { self.edSelTitle(''); }
            if (self.edSelLinkMt() == moteName) { self.edSelLinkMt('disable'); }
            if (self.edSelLink2Mt()== moteName) { self.edSelLink2Mt('disable'); }
            self.selMoteList.remove(function(mote) { return mote.name() === moteName; });

            if (self.edPostTitle() == moteName) { self.edPostTitle(''); }
            self.postMoteList.remove(function(mote) { return mote.name() === moteName; });

            self.taxMoteList.remove(function(mote) { return mote.name() === moteName; });

            if (self.edTrnsAudio()  == moteName)  { self.edTrnsAudio('disable'); }
            if (self.edTrnsTransc() == moteName)  { self.edTrnsTransc('disable'); }
            if (self.edTrnsTransc2() == moteName) { self.edTrnsTransc2('disable'); }
            if (self.edTrnsTime()  == moteName)   { self.edTrnsTime(''); }
            if (self.edTrnsSrc()  == moteName)    { self.edTrnsSrc('disable'); }

            self.allMotes.remove(theMote);

            deleteTerms(moteName);

            self.settingsDirty(true);
            $( this ).dialog('close');
          },
          Cancel: function() {
            $( this ).dialog('close');
          }
        }
      });
    }; // delMote()

      // PURPOSE: Create new mote definition programmatically (not via user interface)
    self.setMote = function(name, type, customField, delim) {
      self.allMotes.push(new Mote(name, type, customField, delim));
    };

      // PURPOSE: Handle user selection to edit a Mote definition
    self.editMote = function(theMote, event) {
      $('#mdl-edit-mote-title').text('Edit definition for '+theMote.name);
      $('#mdl-edit-mote #edMoteModalType').val(theMote.type);
      $('#mdl-edit-mote #edMoteModalCF').val(theMote['custom-fields']);
      $('#mdl-edit-mote #edMoteModalDelim').val(theMote.delim);

      if (theMote.type == 'Short Text') {
        $('#mdl-edit-mote #edMoteModalSTWarn').show();
      } else {
        $('#mdl-edit-mote #edMoteModalSTWarn').hide();
      }

      var newModal = $('#mdl-edit-mote');
      newModal.dialog({
          width: 350,
          height: 300,
          modal : true,
          autoOpen: false,
          buttons: [
            {
              text: 'Cancel',
              click: function() {
                $(this).dialog('close');
              }
            },
            {
              text: 'Save',
              click: function() {
                var newMote = new Mote(theMote.name, $('#mdl-edit-mote #edMoteModalType').val(),
                                      $('#mdl-edit-mote #edMoteModalCF').val(),
                                      $('#mdl-edit-mote #edMoteModalDelim').val());
                self.allMotes.remove(theMote);
                self.allMotes.push(newMote);
                self.settingsDirty(true);
                $(this).dialog('close');
              }
            }
          ]
      });
      newModal.dialog('open');
    }; // editMote()

      // PURPOSE: Handle user selection to create a category legend based on the mote
      // SIDE-FX: Hide Create and show Configure buttons
      // NOTES:   Due to using jQueryUI, need to go up extra layer in DOM hierarchy
      // TO DO
    // self.createCat = function(theMote, event) {
    //     // For now, just hide Create and show Config
    //   var createBtn;

    //   createBtn = $(event.target).parent();
    //   createBtn.addClass('hide');
    //   createBtn.parent().find('.configCat').removeClass('hide');
    // };

      // PURPOSE: Handle user selection to configure associations of legend category: color, Maki icon, or image
      // SIDE-FX: Hide Create and show Configure buttons
      // NOTES:   Need to have large fixed width to accommodate category legend data, loaded asynchronously
      //          Hierarchical sortable is from http://dbushell.com/2012/06/17/nestable-jquery-plugin/
      //          Category data is array in standard WP format (http://codex.wordpress.org/Function_Reference/get_terms#Return_Values_2)
      //            term_id   = ID of this term
      //            name      = label for this term
      //            parent    = ID of parent term, or 0
      //            count     = # times value/tag used
      //            icon_url  = visual metadata (either #number for color or http://.. for icon)
      //          Send back a subset to dhpCreateTaxTerms (adding term_order: see below)
      //          The HTML data-id attribute will contain id of category field
      //          If "As Icons" is selected, li with .maki-icon are inserted
      //          If "As Colors" is selected, .color-box div's are inserted and style="background-color" is set
      //          Do not store visual data in data- attributes since they cannot be rewritten dynamically:
      //            http://www.learningjquery.com/2011/09/using-jquerys-data-apis/
    self.configCat = function(theMote, event) {
        // Whether we seem to be using icons or colors in this legend
      var useIcons=false;

        // Remove previous legend data from modal
      $('#mdl-config-cat #category-tree .dd-list').empty();
        // Make sure wait message is visible
      $('#mdl-config-cat .wait-message').removeClass('hide');
      $('#mdl-config-cat-title').text('Legend configuration for '+theMote.name);

      var newModal = $('#mdl-config-cat');
      newModal.dialog({
          width: 500,
          height: 500,
          modal : true,
          autoOpen: false,
          buttons: [
            {
              text: 'Cancel',
              click: function() { $(this).dialog('close'); }
            },
            {
              text: 'Save',
              click: function() {
                  // Save reorganized data: only need to gather term_id, parent, term_order, icon_url
                  // Need to convert from nestable's format to flat format used by WP:
                  //    Disregard old parent field, as data- attributes not updated and user may have changed hierarchy
                var savedTree = $('#category-tree').nestable('serialize');
// console.log("Serialized Results"+JSON.stringify(savedTree));
                var flatArray = [], termOrder=0;
                ko.utils.arrayForEach(savedTree, function(treeItem) {
                  var newItem = {};
                  var domItem;
                  newItem.term_id = treeItem.id;
                  newItem.parent = 0;
                  newItem.term_order = termOrder++;
                    // Extract data from the visual div for this item
                  domItem = $('li[data-id="'+treeItem.id+'"] .viz-div');
                  newItem.icon_url = getVizData(domItem);
                    // Save this (potential) parent before doing any children
                  flatArray.push(newItem);
                    // Go through any children of this item
                  if (treeItem.children) {
                    ko.utils.arrayForEach(treeItem.children, function(child) {
                      var childItem = {};
                      childItem.term_id = child.id;
                      childItem.parent = treeItem.id;
                      childItem.term_order = termOrder++;
                        // Extract data from the visual div for this item
                      domItem = $('li[data-id="'+child.id+'"] .viz-div');
                      childItem.icon_url = getVizData(domItem);
                      flatArray.push(childItem);
                    }); // arrayForEach
                  } // if treeItem.children
                }); // arrayForEach
// console.log("WP Flat Array Results"+JSON.stringify(flatArray));

                saveLegendValuesInWP(theMote.name, flatArray);
                  // Close modal on assumption that save works
                $(this).dialog('close');
              }
            }
          ]
      });

        // RETURNS: Color in hex format
        // NOTES:   jQuery converts color values to rgb() even if given as hex
        //          DH Press display code assumes in hex format beginning with '#'
      function formatColor(colorStr) {
        if (colorStr.substring(0,1)=='#') {
          return colorStr;
        }
        if (colorStr.substring(0,3) != 'rgb') {
          alert('Color in unknown format')
          throw new Error('Color in unknown format');
        }
        var digits;

        if (colorStr.substring(0,4) == 'rgba') {
          digits = /rgba\((\d+), (\d+), (\d+), (\d+)\)/.exec(colorStr);
        } else {
          digits = /rgb\((\d+), (\d+), (\d+)\)/.exec(colorStr);
        }

        var red = parseInt(digits[1]);
        var green = parseInt(digits[2]);
        var blue = parseInt(digits[3]);

        var rgb = blue | (green << 8) | (red << 16);
        return '#' + rgb.toString(16);
      } // formatColor()

        // PURPOSE: Given a DOM element, parse its maki-icon class
        // RETURN:  Maki-icon class prefixed by '.'
      function getIconClass(domElement) {
        var cssClasses = $(domElement).attr("class");
        var nameArray = cssClasses.split(' ');
        var iconClass = '';
        ko.utils.arrayForEach(nameArray, function(name) {
          if (name !== 'maki-icon' && name !== 'selected') {
            iconClass = '.'+name;
          }
        });
        return iconClass;
      } // getIconClass

        // PURPOSE: Given a DOM element, parse its viz-data for the icon_url value
        // NOTE:    domItem is DIV of class viz-div
      function getVizData(domItem) {
          if ($(domItem).hasClass('color-box')) {
            return formatColor($(domItem).css('background-color'));
          } else if ($(domItem).hasClass('maki-icon')) {
            return getIconClass(domItem);
          } else {
            return '';
          }
            // newItem.icon_url = $(htmlItem).attr('src');    // if images are added
      } // getVizData()

          // PURPOSE: Create HTML string for visual data according to format
          // NOTES:   If setDefault, set useIcons default according to data we're parsing
      function getVizHTML(vizData, setDefault) {
          // Color patch is default
        if (vizData == null || vizData=='') {
          if (setDefault) { useIcons=false; }
          return '<div class="viz-div color-box" style="background-color: #888888"></div>';
        } else if (vizData.substring(0,1)=='#') {
          if (setDefault) { useIcons=false; }
          return '<div class="viz-div color-box" style="background-color:'+vizData+'"></div>';
        } else if (vizData.substring(0,1)== '.') {
          if (setDefault) { useIcons=true; }
            // We need to ignore the leading '.' of classname
          return '<div class="viz-div maki-icon '+vizData.substring(1)+'"></div>';

          // Need to handle no data or incorrectly formatted data -- just make it an empty div
        } else {
          return '<div class="viz-div"></div>';
        }
          // return '<img class="viz-div" src="'+vizData+'"/>';     // this will work for inserting image selections
      } // getVizHTML()

        // FUNCTION: Create default visualization data based on current setting of icons-vs-color radio buttons
        // RETURNS:  Object with properties 
      function getDefaultViz() {
        var vizObj = {};
        var vizType = $('input[name="viz-type-setting"]:checked').val();

        switch (vizType) {
        case 'icons':
          vizObj.data = '.circle';
          break;
        case 'colors':
          vizObj.data = '#888888';
          break;
        }
        vizObj.html=getVizHTML(vizObj.data, false);
        return vizObj;
      } // getDefaultViz()

        // PURPOSE: Handle user selecting Assign div
      function handleAssign(e) {
        e.stopPropagation();

          // "this" will point to select-legend div -- need to go up 2 levels to get li element
        var selLegDiv = this;
        var liElement = $(selLegDiv).parent().parent();
        var moteName = $(liElement).data('name');

          // which modal to use depends on setting of "viz-type-setting" radio button
        var useSetting = $('input[name="viz-type-setting"]:checked').val();
        if (useSetting === 'icons') {
            // Replace current viz type with icon if necessary
          var iconListDiv = $('.maki-icon:first', selLegDiv);
          if (iconListDiv.length == 0) {
            $('.viz-div:first', liElement).remove();
            $('.select-legend:first', liElement).append(getVizHTML('.circle', false)); // insert default icon
            iconListDiv = $('.maki-icon:first', selLegDiv);
          }
          var selIcon = getIconClass(iconListDiv);

          $('#mdl-select-icon-title').text('Select icon for '+moteName);
          var newModal = $('#mdl-select-icon');
          newModal.dialog({
              width: 342,
              height: 300,
              modal : true,
              autoOpen: false,
              buttons: [
                {
                  text: 'Cancel',
                  click: function() { $(this).dialog('close'); }
                },
                {
                  text: 'Save',
                  click: function() {
                      // Determine selected icon
                    selIcon = $('#mdl-select-icon #select-icon-list .selected');
                    selIcon = getIconClass(selIcon);
                      // Create new HTML indicating selection and replace old
                    $('.viz-div:first', liElement).remove();
                    $('.select-legend:first', liElement).append(getVizHTML(selIcon, false));
                    $(this).dialog('close');
                  }
                }
              ]
          });

            // Remove any previous selection, highlight current selection
          $('#mdl-select-icon #select-icon-list li').removeClass('selected');
          $('#select-icon-list '+selIcon).addClass('selected');

            // Remove any old binding for handling selection, bind this
          $('#mdl-select-icon #select-icon-list').off('click');
          $('#mdl-select-icon #select-icon-list').click(function(evt) {
              // Did user select an icon?
            targetIcon = $(evt.target).closest(".maki-icon");
                // If none found (selected outside one), abort
            if (targetIcon == null || targetIcon == undefined) {
                return;
            }
            targetIcon = $(targetIcon).get(0);
            if (targetIcon == null || targetIcon == undefined) {
                return;
            }
              // Remove selected class from previous selection, add to new one
            $('#mdl-select-icon #select-icon-list li').removeClass('selected');
            $(targetIcon).addClass('selected');
          });

          newModal.dialog('open');

        } else {
            // Replace icon with color-box if necessary
          var colorBoxDiv = $('.color-box', selLegDiv);
          if (colorBoxDiv.length == 0) {
            $('.viz-div:first', liElement).remove();
            $('.select-legend:first', liElement).append(getVizHTML(null, false));
            colorBoxDiv = $('.color-box:first', selLegDiv);
          }
          var initColor = $(colorBoxDiv).css('background-color');

            // Initialize modal
            // NOTE: A number of options cause bizarre behavior if used: modal, colorFormat ...
          var colorPickModal = $('#color-picker').colorpicker({
            inline: false,
            title: 'Choose color for '+moteName,
            // color: initColor,  // not working properly
            select: function(event, color) {
              $(colorBoxDiv).css('background-color', '#'+color.formatted);
            },
              // We need to catch close events and destroy widget so we can create again later
            close: function(event, color) {
              colorPickModal.colorpicker('destroy');
            }
          });

          colorPickModal.colorpicker('setColor', initColor);
          colorPickModal.colorpicker('open');
        }
      } // handleAssign()

      function unpackLegendData(termArray) {
          // Create data attributes for most term data in the HTML
        ko.utils.arrayForEach(termArray, function(term) {
          var termViz = getVizHTML(term.icon_url, true);
          var termElement = $('<li class="dd-item dd3-item" data-id="'+term.term_id+'" data-name="'+
                term.name+'" data-parent="'+term.parent+'"> <div class="dd-handle dd3-handle">Drag</div><div class="dd3-content">'+
                term.name+' ('+term.count+') '+'&nbsp;&nbsp;<div class="select-legend"><span class="assign">Assign</span> '+termViz+'</div></div></li>');

            // If has no parent, check to see if any items exist which are children of this parent
          if (term.parent == 0) {
              // Are there any pre-existing children that can be detached?
            var childElements = $('li[data-parent="'+term.term_id+'"]').detach();
              // Put at the end of this item (their parent)
            if (childElements.length > 0) {
                // Create new nesting for children, append saved children to it, and append to parent
              var sublist = $('<ol class="dd-list"></ol>');
              $(sublist).append(childElements);
              $(termElement).append(sublist);
            }
              // Append this item and any "rescued" children to top level of hierarchy
            $('#category-tree > .dd-list').append(termElement);

            // Term has a parent (it may or may not have been created already)
          } else {
              // Search to see if parent HTML already exists
            var parentElement = $('li[data-id="'+term.parent+'"]');
              // Append under if so
            if (parentElement.length > 0) {
                // Check to see if parent already has a nested sublist yet; create if not
              var sublist = $('.dd-list', parentElement);
              if (sublist.length == 0) {
                $(parentElement).append('<ol class="dd-list"></ol>');
              }
              $('.dd-list', parentElement).append(termElement);

              // Otherwise, just append for now to main list -- parent will arrive later
            } else {
              $('#category-tree > .dd-list').append(termElement);
            }
          }
        }); // arrayForEach

          // Bind code for all assignment buttons
        $('#category-tree .select-legend').click(handleAssign);

          // Bind code to handle adding a new term
        $('#add-new-term').click(function() {
          var newTerm;
          newTerm = $('#ed-new-term').val();
          if (newTerm != null && newTerm != '') {
              // TO DO -- Call AJAX function to WP to get newTermID
            var newTermID = 1111;
            var defaultViz = getDefaultViz();
              // Insert new item (without parent) at top of list, binding Assign code to section
            var totalElement = $('<li class="dd-item dd3-item" data-id="'+newTermID+'" data-name="'+
                newTerm+'" data-parent="0"> <div class="dd-handle dd3-handle">Drag</div><div class="dd3-content">'+
                newTerm+' (0) '+'&nbsp;&nbsp;<div class="select-legend">Assign '+defaultViz.html+'</div></div></li>');
            $('.select-legend', totalElement).click(handleAssign);
            $('#category-tree > .dd-list').prepend(totalElement);
              // Clear out new term field
            $('#ed-new-term').val('');
          }
        });

          // Bind code to reset viz data
        $('#viz-type-reset').click(function() {
            // construct new default visualization data
          var defaultViz = getDefaultViz();

          $('#category-tree .dd3-item').each( function() {
              // Remove and replace all viz-div elements (don't alter child nodes!)
            $('.viz-div:first', this).remove();
            $('.select-legend:first', this).append(defaultViz.html);
          });
        }); // click()

          // After all material inserted, activate nestable-sortable GUI
        $('#category-tree').nestable( { maxDepth: 2 } );

          // Set default for icons / color
        $('input:radio[value="icons"]').prop('checked', useIcons);
        $('input:radio[value="colors"]').prop('checked', !useIcons);

          // Remove wait message
        $('#mdl-config-cat .wait-message').addClass('hide');
      } // unpackLegendData()

        // Show the modal with wait message while loading happening
      $('#mdl-config-cat .wait-message').removeClass('hide');
      newModal.dialog('open');

        // Asynchronous AJAX load which needs to modify HTML
      getLegendValuesInWP(theMote.name, theMote['custom-fields'], theMote.delim, unpackLegendData);
    }; // configCat()


//-------------------------------------- Entry Points --------------------------------------

      // User-editable values
    self.entryPoints = ko.observableArray();

      // Methods

      // PURPOSE: Handle user selection to create new blank map entry point
    self.createMapEP = function() {
      var _blankMapEP = {
        type: 'map',
        settings: {
            lat: 0, lon: 0, zoom: 10,
            layers: [ { id: 0, name: '', opacity: 1, mapType: '', mapTypeId: '' } ],
            'marker-layer': '',
            'filter-data': [ ]
        }
      };
      self.setEP(_blankMapEP);
      self.settingsDirty(true);
    };

      // PURPOSE: Handle user selection to create new blank cards entry point
    self.createCardsEP = function() {
      var _blankCardsEP = {
        type: 'cards',
        settings: { 
          title: 'disable',
          color: 'disable',
          defColor: '#00BFFF',
          content: [],
          filterMotes: [],
          sortMotes: []
        }
      };
      self.setEP(_blankCardsEP);
      self.settingsDirty(true);
    };

      // PURPOSE: Programmatically add an entry point to the settings (not via user interface)
    self.setEP = function(theEP) {
      var newEP;
      switch (theEP.type) {
      case 'map':
        newEP = new MapEntryPoint(theEP);
        break;
      case 'cards':
        newEP = new CardsEntryPoint(theEP);
        break;
      }
      self.entryPoints.push(newEP);
    };

      // PURPOSE: Handle user selection to delete this entry point
    self.delEP = function(theEP) {
      $('#mdl-del-ep').dialog({
        resizable: false, height:160, modal: true,
        buttons: {
          'Delete': function() {
            self.entryPoints.remove(theEP);
            $(this).dialog('close');
            self.settingsDirty(true);
          },
          Cancel: function() {
            $(this).dialog('close');
          }
        }
      });
    }; // delEP()

      // PURPOSE: Direct Knockout to which template to use to display this entry point
    self.calcTemplate = function(theEP) {
      switch (theEP.type) {
      case 'map':
        return 'ep-map-template';
      case 'cards':
        return 'ep-cards-template';
      }
    };

      // PURPOSE: Handle user selection to add map overlay
    self.addLayer = function(theEP) {
      var _blankLayer = {
        id: 0, name: '', opacity: 1, mapType: 'type-DHP', mapTypeId: 0
      };
      theEP.settings.layers.push(new MapLayer(_blankLayer));
      self.settingsDirty(true);
    };

      // PURPOSE: Handle user selection to remove map overlay
    self.delLayer = function(theLayer, theEP, index) {
      theEP.settings.layers.splice(index, 1);
      self.settingsDirty(true);
    };

      // PURPOSE: Handle user selection to create new map legend
    self.addMapLegend = function(theEP) {
      theEP.settings['filter-data'].push(new ArrayString(''));
      self.settingsDirty(true);
    };

      // PURPOSE: Handle user selection to create new map legend
    self.delMapLegend = function(theLegend, theEP, index) {
      theEP.settings['filter-data'].splice(index, 1);
      self.settingsDirty(true);
    };

      // PURPOSE: Handle user selection to create new content mote in Topic Cards
    self.addCardContent =  function(theEP) {
      theEP.settings.content.push(new ArrayString(''));
      self.settingsDirty(true);
    };

      // PURPOSE: Handle user selection to create new map legend
    self.delCardContent = function(theContent, theEP, index) {
      theEP.settings.content.splice(index, 1);
      self.settingsDirty(true);
    };

      // PURPOSE: Handle user selection to create new content mote in Topic Cards
    self.addCardFilter =  function(theEP) {
      theEP.settings.filterMotes.push(new ArrayString(''));
      self.settingsDirty(true);
    };

      // PURPOSE: Handle user selection to create new map legend
    self.delCardFilter = function(theFilter, theEP, index) {
      theEP.settings.filterMotes.splice(index, 1);
      self.settingsDirty(true);
    };

      // PURPOSE: Handle user selection to create new content mote in Topic Cards
    self.addCardSort =  function(theEP) {
      theEP.settings.sortMotes.push(new ArrayString(''));
      self.settingsDirty(true);
    };

      // PURPOSE: Handle user selection to create new map legend
    self.delCardSort = function(theSort, theEP, index) {
      theEP.settings.sortMotes.splice(index, 1);
      self.settingsDirty(true);
    };


//------------------------------------------ Views -----------------------------------------

      // User-editable values
    self.edVizFullScreen = ko.observable(true);
    self.edVizWidth = ko.observable(600);
    self.edVizHeight = ko.observable(600);

    self.edSelTitle = ko.observable('');
    self.edSelWidth = ko.observable('medium');
    self.edSelLinkMt  = ko.observable('');
    self.edSelLinkLbl = ko.observable('');
    self.edSelLinkNewTab = ko.observable(true);
    self.edSelLink2Mt  = ko.observable('');
    self.edSelLink2Lbl = ko.observable('');
    self.edSelLink2NewTab = ko.observable(true);
    self.widgetList = ko.observableArray();
    self.selMoteList = ko.observableArray();

    self.edPostTitle = ko.observable('');
    self.postMoteList = ko.observableArray();

    self.taxMoteList = ko.observableArray();

    self.edTrnsAudio = ko.observable('');
    self.edTrnsTransc = ko.observable('');
    self.edTrnsTransc2 = ko.observable('');
    self.edTrnsTime = ko.observable('');
    self.edTrnsSrc = ko.observable('');

      // PURPOSE: Set all variables related to views programmatically (not from user interface)
    self.setViews = function(viewSettings) {
      self.edVizFullScreen(viewSettings['viz-fullscreen']);
      self.edVizWidth(viewSettings['viz-width']);
      self.edVizHeight(viewSettings['viz-height']);

      self.edSelTitle(viewSettings.select.title);
      self.edSelWidth(viewSettings.select.width);
      self.edSelLinkMt(disableByDefault(viewSettings.select.link));
      self.edSelLinkLbl(viewSettings.select['link-label']);
      self.edSelLinkNewTab(viewSettings.select['link-new-tab']);
      self.edSelLink2Mt(disableByDefault(viewSettings.select.link2));
      self.edSelLink2Lbl(viewSettings.select['link2-label']);
      self.edSelLink2NewTab(viewSettings.select['link2-new-tab']);
      ko.utils.arrayForEach(viewSettings.select['view-type'], function(theWidget) {
        self.widgetList.push(new ArrayString(theWidget));
      });
      ko.utils.arrayForEach(viewSettings.select.content, function(theContent) {
        self.selMoteList.push(new ArrayString(theContent));
      });

      self.edPostTitle(viewSettings.post.title);
      ko.utils.arrayForEach(viewSettings.post.content, function(theContent) {
        self.postMoteList.push(new ArrayString(theContent));
      });

      ko.utils.arrayForEach(viewSettings.transcript.content, function(theContent) {
        self.taxMoteList.push(new ArrayString(theContent));
      });

      self.edTrnsAudio(disableByDefault(viewSettings.transcript.audio));
      self.edTrnsTransc(disableByDefault(viewSettings.transcript.transcript));
      self.edTrnsTransc2(disableByDefault(viewSettings.transcript.transcript2));
      self.edTrnsTime(viewSettings.transcript.timecode);
      self.edTrnsSrc(disableByDefault(viewSettings.transcript.source));
    }; // setViews()


      // PURPOSE: Return list of possible modal links for select modal
      // NOTES:   List contains all URL types and all Text motes that appear in Map legends and Card colors
    self.getModalLinkNames = ko.computed(function() {
      var linkList = ['disable', 'marker'];

        // Only URL mote types can have values usable as links
      ko.utils.arrayForEach(self.allMotes(), function(theMote) {
        if (theMote.type === 'Link To') {
          linkList.push(theMote.name+' (Mote)');
        }
      });

        // Go through visualizations for defined Legend/Categories
        // Don't add category/legend mote unless not already there
        // NOTE: Could alternatively loop through text motes to see which have been made into categories
      ko.utils.arrayForEach(self.entryPoints(), function(theEP) {
        switch(theEP.type) {
        case 'map':
          ko.utils.arrayForEach(theEP.settings['filter-data'](), function (filterMote) {
            var moteName = filterMote.name();
              // Don't add if it already exists
            if (linkList.indexOf(moteName) == -1) {
              linkList.push(moteName);
            }
          });
          break;
        case 'cards':
          var colorName = theEP.settings.color();
          if (colorName && colorName !== '' && colorName !== 'disable') {
            if (linkList.indexOf(colorName) == -1) {
              linkList.push(colorName);
            }
          }
          break;
        }
      });

      return linkList;
    }, self); // getModalLinkNames


      // PURPOSE: Handle user selection to add widget
    self.addWidget = function() {
      var widgetSelection;

      widgetSelection = $("#selModalWidget").val();
      if (widgetSelection) {
          // Don't add if already exists
        if (ko.utils.arrayFirst(self.widgetList(), function (widget) 
                                { return widget.name() == widgetSelection}) == null) 
        {
          self.widgetList.push(new ArrayString(widgetSelection));
          self.settingsDirty(true);
        }
      }
    };

    self.delWidget = function(index) {
      self.widgetList.splice(index, 1);
      self.settingsDirty(true);
    };


      // PURPOSE: Handle user selection to add widget
    self.addSelMote = function() {
      var selection;

      selection = $("#selModalMote").val();
      if (selection) {
          // Don't add if already exists
        if (ko.utils.arrayFirst(self.selMoteList(), function (mote) 
                                { return mote.name() == selection}) == null) 
        {
          self.selMoteList.push(new ArrayString(selection));
          self.settingsDirty(true);
        }
      }
    };

    self.delSelMote = function(index) {
      self.selMoteList.splice(index, 1);
      self.settingsDirty(true);
    };


      // PURPOSE: Handle user selection to add widget
    self.addPostMote = function() {
      var selection;

      selection = $("#selPostMote").val();
      if (selection) {
          // Don't add if already exists
        if (ko.utils.arrayFirst(self.postMoteList(), function (mote) 
                                { return mote.name() == selection}) == null) 
        {
          self.postMoteList.push(new ArrayString(selection));
          self.settingsDirty(true);
        }
      }
    };

    self.delPostMote = function(index) {
      self.postMoteList.splice(index, 1);
      self.settingsDirty(true);
    };


      // PURPOSE: Handle user selection to add widget
    self.addTaxMote = function() {
      var selection;

      selection = $("#selTaxMote").val();
      if (selection) {
          // Don't add if already exists
        if (ko.utils.arrayFirst(self.taxMoteList(), function (mote) 
                                { return mote.name() == selection}) == null) 
        {
          self.taxMoteList.push(new ArrayString(selection));
          self.settingsDirty(true);
        }
      }
    };

    self.delTaxMote = function(index) {
      self.taxMoteList.splice(index, 1);
      self.settingsDirty(true);
    };

  }; // ProjectSettings


//=================================== INITIALIZAION ===================================

    // Initialize jQuery components
  $("#accordion, #subaccordion").accordion({ collapsible: true, heightStyle: 'content' });

    // Add decimal formatting extension (X.X) for observable (opacity)
  ko.extenders.onedigit = function(target) {
    //create a writeable computed observable to intercept writes to our observable
    var result = ko.computed({
        read: target,  //always return the original observables value
        write: function(newValue) {
            var current = target(),
                newValueAsNum = isNaN(newValue) ? 0 : parseFloat(+newValue),
                valueToWrite = Number(newValueAsNum).toFixed(1);
 
              // Only save if value changed
            if (valueToWrite !== current) {
                target(valueToWrite);
            } else {
                  // If the rounded value is same, but a different value was written, force a notification for the current field
                if (newValue !== current) {
                    target.notifySubscribers(valueToWrite);
                }
            }
        }
    }).extend({ notify: 'always' });
 
      // Init with current value to make sure it is rounded appropriately
    result(target());
 
      //return the new computed observable
    return result;
  }; // onedigit


    // Need to Initialize project here first so that object properties and methods visible when
    //    Knockout is activated
  var projObj = new ProjectSettings(customFieldsParam, mapLayersParam);

    // Manually load the Project Settings object from JSON string
  projObj.setDetails(savedSettings['project-details']);
  ko.utils.arrayForEach(normalizeArray(savedSettings.motes), function(theMote, index) {
    projObj.setMote(theMote.name, theMote.type, theMote['custom-fields'], theMote.delim);
  });
  ko.utils.arrayForEach(normalizeArray(savedSettings['entry-points']), function(theEP) {
    projObj.setEP(theEP);
  });
  projObj.setViews(savedSettings.views);


    // Add new functionality for jQueryUI slider
  ko.bindingHandlers.opacitySlider = {
    init: function (element, valueAccessor, allBindingsAccessor) {
      $(element).slider({min: 0, max: 1, orientation: 'horizontal', range: false, step: 0.1 });

      ko.utils.registerEventHandler(element, 'slidechange', function (event, ui) {
        var observable = valueAccessor();
        observable(ui.value);
      });
      ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
          $(element).slider('destroy');
      });
    },
    update: function (element, valueAccessor) {
      var value = ko.utils.unwrapObservable(valueAccessor());
      if (isNaN(value)) value=0;
      $(element).slider('value', value);
    }
  };
    // Add new functionality for jQueryUI button
  ko.bindingHandlers.jqButton = {
    init: function (element) {
      $(element).button();
    }
  };

    // Add new functionality for geoLocation editor
    // NOTE:   There is a CSS bug that happens if map is created initially, because jQueryUI hasn't
    //          finished adjusting all of the relative positions of div's -- so user must init map afterwards
    // ASSUMES: Specific DOM structure with classes identifying buttons
  ko.bindingHandlers.geoLoc = {
    init: function (element) {
      var thisMap;
      var thisLat, thisLon;
      var latElem, lonElem;
      var marker;

        // Bind code to create map button
      $(element).parent().find('.create-map-btn').click(function() {
        if (!thisMap) {
            // Show both the map itself and the update button
          $(element).removeClass('hide');
          $(element).parent().find('.update-map-btn').removeClass('hide');
            // Get the lat lon entered by user
          latElem = $(element).parent().find('.ed-lat-id');
          lonElem = $(element).parent().find('.ed-lon-id');
          thisLat = $(latElem).val();
          thisLon = $(lonElem).val();
          thisMap = L.map(element).setView([thisLat, thisLon], 3);

          L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          }).addTo(thisMap);
          marker = L.marker([thisLat, thisLon]).addTo(thisMap);
          // marker = L.marker([thisLat, thisLon], { draggable: true }).addTo(thisMap);

            // bind drag code for updating values
            // TO DO: This does not connect to Knockout bindings!
          // marker.on('dragend', function(ev) {
          //   var newPos = ev.target.getLatLng();
          //   $(latElem).val(newPos.lat);
          //   $(lonElem).val(newPos.lng);
          // });
        }
      });

        // Bind code to update map button
      $(element).parent().find('.update-map-btn').click(function() {
        if (thisMap) {
          thisLat = $(latElem).val();
          thisLon = $(lonElem).val();
          thisMap.panTo([thisLat, thisLon]);
          marker.setLatLng([thisLat, thisLon]);
        }
      });
    }
  };


    // Initialize use of Knockout within the inserted HTML (after bindingHandlers added)
  ko.applyBindings(projObj, document.getElementById('ko-dhp'));


  //=================================== AJAX FUNCTIONS ==================================

    // PURPOSE: Saves project settings data object
  function saveSettingsInWP(settingsData) {
    jQuery.ajax({
          type: 'POST',
          url: ajax_url,
          data: {
              action: 'dhpSaveProjectSettings',
              project: projectID,
              settings: settingsData
          },
          success: function(data, textStatus, XMLHttpRequest) {
            console.log("Settings saved successfully!");
            console.log(data);
            projObj.cleanSettings();
          },
          error: function(XMLHttpRequest, textStatus, errorThrown){
             alert(errorThrown);
          }
      });
  } // saveSettingsInWP()


    // PURPOSE: Create legend (if doesn't exist yet) and collect the array of values/terms
    // INPUT:   moteName = name of mote whose category names need to be fetched
    //          moteCF = custom field associated with mote
    //          dataDelim = character used as delimiter
    //          funcToCall = callback to invoke upon completion with mote record and data
    // RETURNS: Array with data:
    //            term_id   = ID of this term
    //            name      = label for this term
    //            parent    = ID of parent term, or 0
    //            count     = # times value/tag used
    //            icon_url  = visual metadata (either #number for color or http://.. for icon)
  function getLegendValuesInWP(moteName, moteCF, dataDelim, funcToCall) {
    jQuery.ajax({
          type: 'POST',
          url: ajax_url,
          data: {
              action: 'dhpGetLegendValues',
              project: projectID,
              delim: dataDelim,
              customField: moteCF,
              moteName: moteName
          },
          success: function(data, textStatus, XMLHttpRequest){
                // data is a JSON object
              funcToCall(JSON.parse(data));
          },
          error: function(XMLHttpRequest, textStatus, errorThrown){
             alert(errorThrown);
          }
      });
  } // getLegendValuesInWP()


    // PURPOSE: Update term structure for legend(introduces icon_url field)
    // RETURNS: Object with terms
    // INPUT:   legendName = Top level term id (legend name)
    //          taxTermsList = flat list containing data for updating terms in WP
  function saveLegendValuesInWP(legendName, taxTermsList) {
    // console.log("Create legend for treeParentID " + treeParentID + " in Project ID " + projectID);
    jQuery.ajax({
          type: 'POST',
          url: ajax_url,
          data: {
              action: 'dhpSaveLegendValues',
              mote_name: legendName,
              project: projectID,
              terms: taxTermsList
          },
          success: function(data, textStatus, XMLHttpRequest){
              // Need to add callback function??
          },
          error: function(XMLHttpRequest, textStatus, errorThrown){
             alert(errorThrown);
          }
      });
  } // saveLegendValuesInWP()


    // PURPOSE: Update a custom field using a subset of markers filtered by a custom field and value
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
          },
          error: function(XMLHttpRequest, textStatus, errorThrown){
             alert(errorThrown);
          }
      });
  } // deleteCustomField()


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
              console.log('dhpDeleteTerms completed');
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
          },
          error: function(XMLHttpRequest, textStatus, errorThrown){
             alert(errorThrown);
          }
      });
  } // dhpGetFieldValues()

    // INPUT: new_term is name of new term
    //        parent_term is name of mote
  function dhpCreateTermInTax(new_term, parent_term) {
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
              console.log("New legend term: "+data);
                // result is Object with fields 'name' and 'term_id'
              addNewTermToLegend(JSON.parse(data));
          },
          error: function(XMLHttpRequest, textStatus, errorThrown){
             alert(errorThrown);
          }
      });
  } // dhpCreateTermInTax()

});
