// DH Press Maps View -- contains all data and functions for rendering cards
// ASSUMES: A view area for the cards has been marked with HTML div as "dhp-visual"
// NOTES:   Format of Marker and Legend data is documented in dhp-project-functions.php
// USES:    JavaScript libraries jQuery, Isotope, Underscore
// TO DO:   Support filter & sort on hierarchical Legend values in Short Text motes!
//          When numeric motes supported, sort will need to convert strings to integers
//          Could possibly speed up filter of Short Text mote types, given that category values
//              come with each Marker

var dhpCardsView = {

        // Contains fields: cardsEP
        //                  rawData
        //                  colorValues   = array of { id, icon_url }
        //                  defTextColor  = default text color
        //                  allMotes      = array (unique sorted) of all data and content mote names
        //                  allDataMotes  = array of all sort and filter mote names
        //                  dataAttrs     = array of motes names whose data is only stored in attributes
        //                  currentSort   = name of mote currently used for sorting
        //                  currentFilter = name of mote currently used for filtering
        //                  curFilterVal  = current filter value (specific to mote type)

        // PURPOSE: Initialize card viewing area with controls and layers
        // INPUT:   ajaxURL      = URL to WP
        //			projectID    = ID of project
        //          vizIndex     = index of this visualization
        //			cardsEP      = settings for cards entry point (from project settings)
    initialize: function(ajaxURL, projectID, vizIndex, cardsEP)
    {
        var menuHTML, active;

            // Save reset data for later
        dhpCardsView.cardsEP        = cardsEP;

        dhpCardsView.currentSort    = null;
        dhpCardsView.currentFilter  = null;

        dhpCardsView.allDataMotes   = [];
        dhpCardsView.dataAttrs      = [];


            // Change background color if user has provided one
        if (dhpCardsView.cardsEP.bckGrd && dhpCardsView.cardsEP.bckGrd !== '') {
            jQuery('#dhp-visual').attr('style','background-color:'+dhpCardsView.cardsEP.bckGrd);
        }

        jQuery('#dhp-visual').prepend(Handlebars.compile(jQuery("#dhp-script-legend-head").html()));

            // Create nav bar menus --------------------

            // Add Sort By controls
        if (cardsEP.sortMotes.length > 0) {
            jQuery('.top-bar-section .left').append(Handlebars.compile(jQuery("#dhp-script-cards-sort").html()));
            _.each(cardsEP.sortMotes, function(theMote, index) {
                dhpCardsView.allDataMotes.push(theMote);
                if (index == 0) {
                    dhpCardsView.currentSort = theMote;
                    active = ' class="active"';
                } else {
                    active = '';
                }
                menuHTML = '<li'+active+'><a href="#">'+theMote+'</a></li>';
                jQuery('#dhp-cards-sort').append(menuHTML);
            });
                // Handle selection of a sort mote
            jQuery('#dhp-cards-sort').click(function(e) {
                    // Find out which one selected
                var newSortMenu = jQuery(e.target);
                var newSortMote = jQuery(newSortMenu).text();
                if (newSortMote != dhpCardsView.currentSort) {
                        // Remove whatever was active previously
                    jQuery('#dhp-cards-sort > .active').removeClass('active');
                    jQuery(newSortMenu).parent().addClass('active');
                    dhpCardsView.currentSort = newSortMote;
                    jQuery('#card-container').isotope( { sortBy: newSortMote } );
                }
            });
        } // if sortMotes

            // Add Filter By controls
        if (cardsEP.filterMotes.length > 0) {
            jQuery('.top-bar-section .left').append(Handlebars.compile(jQuery("#dhp-script-cards-filter-menu").html()));
            _.each(cardsEP.filterMotes, function(theMote, index) {
                dhpCardsView.allDataMotes.push(theMote);
                if (index == 0) {
                    dhpCardsView.currentFilter = theMote;
                    active = ' class="active"';
                } else {
                    active = '';
                }
                menuHTML = '<li'+active+'><a href="#">'+theMote+'</a></li>';
                jQuery('#dhp-cards-filter-menu').append(menuHTML);
            });

                // Handle selection of a filter mote
            jQuery('#dhp-cards-filter-menu').click(function(e) {
                    // Find out which one selected
                var newFilterMenu = jQuery(e.target);
                var newFilterMote = jQuery(newFilterMenu).text();
                if (newFilterMote != dhpCardsView.currentFilter) {
                        // Remove whatever was active previously
                    jQuery('#dhp-cards-filter-menu > .active').removeClass('active');
                    jQuery(newFilterMenu).parent().addClass('active');
                    dhpCardsView.currentFilter = newFilterMote;
                        // reset filter
                    dhpCardsView.resetFilter();
                }
            });

                // Bind code to handle filter actions
            jQuery('#dhp-filter-set').click(dhpCardsView.setFilter);
            jQuery('#dhp-filter-reset').click(dhpCardsView.resetFilter);

                // Insert Marker modal window HTML
            jQuery('body').append(Handlebars.compile(jQuery('#dhp-script-filterModal').html()));

                // Must bind handlers to modals just once -- here

                // Don't know why this is needed -- but Select Modal Close button won't work without it
            jQuery('#filterModal a.close-select-modal').click(function() {
              jQuery('#filterModal').foundation('reveal', 'close');
              if (jQuery(this).text() === 'Apply') {
                dhpCardsView.doFilter(dhpServices.findMoteByName(dhpCardsView.currentFilter));
              }
            });

                // Insert Filter Error modal HTML
            jQuery('body').append(Handlebars.compile(jQuery('#dhp-script-fltrErrorModal').html()));

            jQuery('#filterErrModal a.close-select-modal').click(function() {
                jQuery('#filterErrModal').foundation('reveal', 'close');
            });
        } // if filterMotes


        jQuery(document).foundation();

            // Ensure all fields unique -- this is needed for creating cards
        dhpCardsView.allDataMotes = _.uniq(dhpCardsView.allDataMotes);
        dhpCardsView.allDataMotes = _.sortBy(dhpCardsView.allDataMotes, function(moteName) { return moteName; });
            // Create complete list of content and data fields, unique and sorted
        dhpCardsView.allMotes     = _.union(dhpCardsView.allDataMotes, cardsEP.content);
        dhpCardsView.allMotes     = _.sortBy(dhpCardsView.allMotes, function(moteName) { return moteName; });

            // What motes are in allDataMotes[] but not in cardsEP.content?
            // Will need to add data attributes for these
        dhpCardsView.dataAttrs     = _.difference(dhpCardsView.allDataMotes, dhpCardsView.cardsEP.content);
        dhpCardsView.dataAttrs     = _.sortBy(dhpCardsView.dataAttrs, function(moteName) { return moteName; });

        jQuery.ajax({
            type: 'POST',
            url: ajaxURL,
            data: {
                action: 'dhpGetMarkers',
                project: projectID,
                index: vizIndex
            },
            success: function(data, textStatus, XMLHttpRequest)
            {
                dhpCardsView.rawData = JSON.parse(data);
                dhpCardsView.createCards();
                dhpServices.remLoadingModal();

                jQuery("#card-container").isotope();
            },
            error: function(XMLHttpRequest, textStatus, errorThrown)
            {
               alert(errorThrown);
            }
        });
     }, // initialize()


        // PURPOSE: Find the category array corresponding to moteName
        // RETURNS: The category array, or null
    findFilterByMoteName: function(moteName) {
        var result = _.find(dhpCardsView.rawData, function(theArray) {
                // Last array is markers -- if we got here, it doesn't exist
            return (theArray.type === 'filter' && theArray.name === moteName);
        });
        return result;
    }, // findFilterByMoteName()


        // PURPOSE: Reset filter criteria to allow all cards to pass
    resetFilter: function()
    {
        dhpCardsView.curFilterVal = null;
        jQuery('#card-container').isotope({
          filter: function() {
            return true;
          }
        });
    }, // resetFilter()


        // PURPOSE: Prepare modal for filter options -- set defaults from previous selection
        //              If Long Text type, user must enter text pattern
        //              If Short Text type, user can enter text pattern or choose value
        // TO DO:   Handle different mote types
        //              If Number, user can enter min and max values
    setFilter: function()
    {
            // Reset modal title
        jQuery('#filterModal #filterModalLabel').text('Filter options for '+dhpCardsView.currentFilter);

            // Clear out modal body contents
        jQuery('#filterModal .modal-body').empty();

            // Insert material into modal body depending on type of mote
            // Use last selection as default
        var moteDef = dhpServices.findMoteByName(dhpCardsView.currentFilter);

        switch (moteDef.type) {
        case 'Long Text':
                // Insert Long Text-specific HTML into filter modal
            jQuery('#filterModal .modal-body').append(Handlebars.compile(jQuery('#dhp-script-filter-ltext').html()));
                // Give current filter value (if any) as default
            jQuery('#filter-text-input').val(dhpCardsView.curFilterVal || '');
            break;
        case 'Short Text':
                // Insert Short Text-specific HTML into filter modal
            jQuery('#filterModal .modal-body').append(Handlebars.compile(jQuery('#dhp-script-filter-stext').html()));
                // create the set of choices from category filter
            var filterMote = dhpCardsView.findFilterByMoteName(dhpCardsView.currentFilter);
            if (filterMote) {
                _.each(filterMote.terms, function(theTerm) {
                        // Skip the entry for the Legend itself
                    if (theTerm.name != dhpCardsView.currentFilter) {
                        jQuery('#filterModal .modal-body #st-filter-vals').append('<div class="st-filter-value"><input type="checkbox" value="'
                            +theTerm.id+'" name="'+theTerm.name+'">'+theTerm.name+'</div>');
                    }
                });
            }
                // if previously set, use last selection as default
            if (dhpCardsView.curFilterVal) {
                jQuery('input:radio[name=filter-type]')[dhpCardsView.curFilterVal.index].checked = true;
                    // 1 == Text pattern
                if (dhpCardsView.curFilterVal.index == 1) {
                    jQuery('#filter-text-input').val(dhpCardsView.curFilterVal.text || '');
                } else {
                    _.each(dhpCardsView.curFilterVal.values, function(valueName) {
                        jQuery(".st-filter-value input[name='"+valueName+"']").prop('checked', true);
                    });
                }

                // or else start afresh with text pattern as default
            } else {
                jQuery('input:radio[name=filter-type]')[0].checked = true;
            }
            break;
        case 'Date':
                // Insert Date-specific HTML into modal
            jQuery('#filterModal .modal-body').append(Handlebars.compile(jQuery('#dhp-script-filter-dates').html()));
                // if previously set, use last selection as default
            if (dhpCardsView.curFilterVal) {
                jQuery('#filter-date1Y-input').val(dhpCardsView.curFilterVal.date1Y);
                jQuery('#filter-date1M-input').val(dhpCardsView.curFilterVal.date1M);
                jQuery('#filter-date1D-input').val(dhpCardsView.curFilterVal.date1D);
                jQuery('input:radio[name=date1Order][value="'+dhpCardsView.curFilterVal.date1Order+'"]').prop('checked', true);
                jQuery("#dateAnd").prop('checked', dhpCardsView.curFilterVal.and);
                jQuery('#filter-date2Y-input').val(dhpCardsView.curFilterVal.date2Y);
                jQuery('#filter-date2M-input').val(dhpCardsView.curFilterVal.date2M);
                jQuery('#filter-date2D-input').val(dhpCardsView.curFilterVal.date2D);
            }
            break;
        default:
            alert('There is currently no way to use a filter of type '+moteDef.type);
            break;
        }

        jQuery('#filterModal').foundation('reveal', 'open');
    }, // setFilter()


        // PURPOSE: Handle doing filter by reading user text entry in form
    doTextFilter: function()
    {
        var filterText;
        filterText = jQuery('#filter-text-input').val();
            // Only apply if they've entered something, otherwise reset filter (allow all)
        if (filterText.length) {
                // Create regular expression from filter string
            var regExp = new RegExp(filterText, "i");
            var className = '.datamote'+_.indexOf(dhpCardsView.allMotes, dhpCardsView.currentFilter, true);
            var text;

                // Get the text for each item and check against regular expression
            jQuery('#card-container').isotope({
              filter: function() {
                text = jQuery(this).find(className).text();
                return regExp.test(text);
              }
            });
        } else {
            dhpCardsView.resetFilter();
        }
    }, // doTextFilter()


        // PURPOSE: Attempt filtering by date -- check values first
    doDateFilter: function()
    {
        var date1Y, date1M, date1D, date1;
        var date2Y, date2M, date2D, date2=null;

        function popUpErrModal(str)
        {
                // Reset modal title
            jQuery('#filterErrModal #errorModalLabel').text('Date Filter Error');

                // Clear out modal body contents
            jQuery('#filterErrModal .modal-body').empty();
            jQuery('#filterErrModal .modal-body').append('<p>'+str+'</p>');

            jQuery('#filterErrModal').foundation('reveal', 'open');
        } // popUpErrModal

            // PURPOSE: Utility function to make sure text is valid number; displays error modal if problem
            // RETURNS: number if no problem with format, null if error, or '' if no value
        function getNumber(val, req, min, max, numType)
        {
            var num;

                // Has no value been supplied? Check if it is required
            if (val === '') {
                if (req) {
                    popUpErrModal('The value for '+numType+' is required but you left it blank.');
                    return null;
                }
                return '';
            }
            if (typeof(val) === 'number') {
                num = val;
            } else {
                num = parseInt(val, 10);
            }
            if (isNaN(num)) {
                popUpErrModal('The value you entered for '+numType+' is not a valid number.');
                return null;
            }
            if (min && num < min) {
                popUpErrModal('The value you entered for '+numType+' is too small.');
                return null;
            }
            if (max && num > max) {
                popUpErrModal('The value you entered for '+numType+' is too large.');
                return null;
            }
            return num;
        } // getNumber()

            // Abort if there are any errors with first date
        if ((date1Y=getNumber(dhpCardsView.curFilterVal.date1Y, true, null, null, 'the first Date year')) == null ||
            (date1M=getNumber(dhpCardsView.curFilterVal.date1M, false, 1, 12, 'the first Date month')) == null ||
            (date1D=getNumber(dhpCardsView.curFilterVal.date1D, false, 1, 31, 'the first Date day')) == null)
        {
            return;
        }

            // determine how to construct the Date -- how to handle missing values depends on whether
            //  order is "before" or "after"
        if (date1M === '') {
            if (dhpCardsView.curFilterVal.date1Order == 'before')
            {
                date1M = 12; date1D = 31;
            } else {
                date1M = 1; date1D = 1;
            }
        } else if (date1D === '') {
            if (dhpCardsView.curFilterVal.date1Order == 'before')
            {
                date1D = 31;
            } else {
                date1D = 1;
            }
        }

        date1 = dhpServices.createDate3Nums(date1Y, date1M-1, date1D);

            // Only check second date if checked
        if (dhpCardsView.curFilterVal.and)
        {
            if ((date2Y=getNumber(dhpCardsView.curFilterVal.date2Y, true, null, null, 'the second Date year')) == null ||
                (date2M=getNumber(dhpCardsView.curFilterVal.date2M, false, 1, 12, 'the second Date month')) == null ||
                (date2D=getNumber(dhpCardsView.curFilterVal.date2D, false, 1, 31, 'the second Date day')) == null)
            {
                return;
            }
            if (date2M == '') {
                date2M = 12; date2D = 31;
            } else if (date2D === '') {
                date2D = 31;
            }
            date2 = dhpServices.createDate3Nums(date2Y, date2M-1, date2D);
        } // if and

            // Date parameters are now computed -- just need to do the calculations!
        var className = '.datamote'+_.indexOf(dhpCardsView.allMotes, dhpCardsView.currentFilter, true);
        var text, dateSegs, evStart, evEnd;

            // Get the text for each item and check against date range
            // NOTE: "open" is essentially infinite in one direction, so is always before or after any date
        jQuery('#card-container').isotope({
          filter: function() {
            text = jQuery(this).find(className).text();

            dateSegs = text.split('/');

            dateSegs[0] = dateSegs[0].trim();
            if (dateSegs.length == 2) {
                if (dateSegs[0] !== 'open') {
                    evStart = dhpServices.parseADate(dateSegs[0], true);
                }
                dateSegs[1] = dateSegs[1].trim();
                if (dateSegs[1] !== 'open') {
                    evEnd = dhpServices.parseADate(dateSegs[1], false);
                }
            } else {
                evStart = dhpServices.parseADate(dateSegs[0], true);
                evEnd = dhpServices.parseADate(dateSegs[0], false);
            }

                // Is there a min and max?
            if (date2) {
                    // as "open" can never be bound, it will always fail
                if (dateSegs[0] === 'open' || dateSegs[1] === 'open') {
                    return false;
                }
                return (date1 <= evStart) && (evEnd <= date2);

                // Only min or max -- "open" always fails these
            } else {
                if (dhpCardsView.curFilterVal.date1Order === 'before') {
                    if (dateSegs[1] === 'open') {
                        return false;
                    }
                    return evEnd <= date1;
                } else {
                    if (dateSegs[0] === 'open') {
                        return false;
                    }
                    return date1 <= evStart;
                }
            }
          }
        });

    }, // doDateFilter()


        // PURPOSE: User has provided filter params and hit "Apply," now we must read params & do filter
        // INPUT:   moteDef is the mote used for filtering
    doFilter: function(moteDef)
    {
        switch(moteDef.type) {
        case 'Short Text':
            dhpCardsView.curFilterVal = { };
                // get user selection
            var filterType = jQuery('input:radio[name=filter-type]:checked').val();
            if (filterType === 'text') {
                dhpCardsView.curFilterVal.index = 1;
                dhpCardsView.curFilterVal.text = jQuery('#filter-text-input').val();
                dhpCardsView.doTextFilter();
            } else {
                var regTexts = [];

                dhpCardsView.curFilterVal.index = 0;
                dhpCardsView.curFilterVal.values = [];
                    // Gather the values chosen
                jQuery('#st-filter-vals input:checked').each(function(index, item) {
                    var oneItem = jQuery(item).attr('name');
                        // We have to store plain text values separate from Reg Exp strings because former
                        //  used to remember selection for later, while latter need to ensure exact match
                    dhpCardsView.curFilterVal.values.push(oneItem);
                    regTexts.push('^'+oneItem+'$');
                });

                if (regTexts.length) {
                        // A match on any of the values will qualify a card
                        // TO DO: If hierarchical filter categories are to be supported, will need
                        //      to deal with parent values here
                    var filterText = regTexts.join('|');
                    var regExp = new RegExp(filterText, "i");
                    var className = '.datamote'+_.indexOf(dhpCardsView.allMotes, dhpCardsView.currentFilter, true);
                    var text;

                        // Get the text for each item and check against regular expression
                    jQuery('#card-container').isotope({
                      filter: function() {
                        text = jQuery(this).find(className).text();
                        return regExp.test(text);
                      }
                    });
                }
            }
            break;
        case 'Long Text':
            dhpCardsView.curFilterVal = jQuery('#filter-text-input').val();
            dhpCardsView.doTextFilter();
            break;
        case 'Date':
            dhpCardsView.curFilterVal = { };
            dhpCardsView.curFilterVal.date1Y = jQuery('#filter-date1Y-input').val();
            dhpCardsView.curFilterVal.date1M = jQuery('#filter-date1M-input').val();
            dhpCardsView.curFilterVal.date1D = jQuery('#filter-date1D-input').val();
            dhpCardsView.curFilterVal.date1Order = jQuery('input:radio[name=date1Order]:checked').val();
            dhpCardsView.curFilterVal.and = jQuery("#dateAnd").is(':checked');
            dhpCardsView.curFilterVal.date2Y = jQuery('#filter-date2Y-input').val();
            dhpCardsView.curFilterVal.date2M = jQuery('#filter-date2M-input').val();
            dhpCardsView.curFilterVal.date2D = jQuery('#filter-date2D-input').val();

            dhpCardsView.doDateFilter();
            break;
        }
    }, // doFilter()


        // PURPOSE: Resizes dhp elements when browser size changes
    dhpUpdateSize: function()
    {
        jQuery("#card-container").isotope();
    }, // dhpUpdateSize()


        // PURPOSE: To determine color to use for marker
        // INPUT:   featureVals = array of category IDs (integers) associated with a feature/marker
        // RETURNS: Partial string to set color and background color (w/o closing ")
        // NOTES:   Will use first match on color to use for icon, or else default color
        // SIDEFX:  Caches textColor in text field of Legend, which builds first time encountered
    getItemColor: function(featureVals)
    {
            // If no color motes or if marker has no category values, return default
        if (dhpCardsView.colorValues.length == 0 || featureVals.length == 0) {
            return dhpCardsView.cardsEP.defColor+'; color:'+dhpCardsView.defTextColor;
        }

        var colors = dhpServices.getItemColors(featureVals, dhpCardsView.colorValues);
        if (colors) {
            return colors[0]+'; color:'+colors[1];
        } else {
            return dhpCardsView.cardsEP.defColor+'; color:'+dhpCardsView.defTextColor;
        }
    }, // getItemColor()


        // PURPOSE: Handle selection in "card space"
    selectCard: function(evt)
    {
        var targetCard, index, selectedFeature;

            // Search up the chain to find selected card
        targetCard = jQuery(evt.target).closest(".card");
            // If no card found (selected outside one), abort
        if (targetCard == null || targetCard == undefined) {
            return;
        }
        targetCard = jQuery(targetCard).get(0);
        if (targetCard == null || targetCard == undefined) {
            return;
        }
            // Convert cardID to index of feature in marker array
        index = parseInt(targetCard.id.substring(6));

            // Use ID of card to find index of item in array
        selectedFeature = dhpCardsView.rawData[dhpCardsView.rawData.length-1]['features'][index];

            // Open modal for feature
        dhpServices.showMarkerModal(selectedFeature);
    }, // selectCard()


        // PURPOSE: Create marker objects for map visualization; called by loadMapMarkers()
        // ASSUMES: rawdata assigned to JSON object (as outlined in createMarkerArray() in dhp-project-functions.php)
    createCards: function()
    {
            // Set dhpCardsView.colorValues to array of color values in AJAX data
        dhpCardsView.colorValues = null;
        if (dhpCardsView.cardsEP.color && dhpCardsView.cardsEP.color != '' && dhpCardsView.cardsEP.color != 'disable') {
            _.find(dhpCardsView.rawData, function(theArray, index) {
                    // Last array is markers -- if we got here, it doesn't exist
                if (index == (dhpCardsView.rawData.length-1)) {
                    dhpCardsView.colorValues = null;
                    return false;
                }
                if (theArray.type !== 'filter') {
                    throw new Error("Error in filter array at "+index);
                }
                if (theArray.name === dhpCardsView.cardsEP.color) {
                    dhpCardsView.colorValues = theArray.terms;
                    return true;
                }
                return false;
            });
        }

            // Create Legend for colors (if colors exist)
        if (dhpCardsView.colorValues.length > 1) {
            dhpServices.create1Legend(dhpCardsView.cardsEP.color, dhpCardsView.colorValues);
        } // if colorValues

            // Create cards --------------------
        var theCard, contentElement, contentData, theTitle, colorStr, classStr, moteIndex, label;

        jQuery('#dhp-visual').append('<div id="card-container"></div>');
        var cardHolder = jQuery('#card-container');

            // set default background and text colors
        var match = dhpCardsView.cardsEP.defColor.match(/^#([0-9a-f]{6})$/i);
        if (match) {
            defTextColor = dhpServices.getTextColor(dhpCardsView.cardsEP.defColor);
            colorStr = dhpCardsView.cardsEP.defColor+'; color:'+defTextColor;
        } else {
            colorStr = dhpCardsView.cardsEP.defColor+'; color:#000000';
            defTextColor = '#000000';
        }

            // get class for these cards
        classStr='';
        if (dhpCardsView.cardsEP.width != 'auto') {
            classStr = dhpCardsView.cardsEP.width+' ';
        }
        if (dhpCardsView.cardsEP.height != 'auto') {
            classStr += dhpCardsView.cardsEP.height;
        }

            // Markers are last array in data
        _.each(dhpCardsView.rawData[dhpCardsView.rawData.length-1]['features'], function(theFeature, index) {
                // If there is no data specifically about card, data will not be sent
            if (dhpCardsView.cardsEP.titleOn && theFeature.title && theFeature.title !== 'disable') {
                theTitle = theFeature.title;
            } else {
                theTitle = null;
            }

            if (dhpCardsView.colorValues) {
                colorStr = dhpCardsView.getItemColor(theFeature.properties.categories);
            }

                // Create container element for the card
            theCard = jQuery('<div class="card '+classStr+'" id="cardID'+index+'" style="background-color:' + colorStr +'"></div');
            if (theTitle) {
                jQuery(theCard).append('<p style="font-weight: bold">'+theTitle+'</p></div>');
            }

                // Add class IDs to all data; mote names can be irregular, so class IDs must be index

                // Go through all content motes specified for each card view
            _.each(dhpCardsView.cardsEP.content, function(moteName) {
                    // get the index into allDataMotes for this content mote
                moteIndex = _.indexOf(dhpCardsView.allMotes, moteName, true);
                contentData = theFeature.properties.content[moteName];
                if (contentData) {
                    label = (moteName === 'Thumbnail Left' || moteName === 'Thumbnail Right') ?
                                '' : '<i>'+moteName+'</i>: ';
                    contentElement = jQuery('<p class="datamote'+moteIndex+'">'+label+contentData+'</p>');
                    jQuery(theCard).append(contentElement);
                }
            });
                // Now add invisible data
            _.each(dhpCardsView.dataAttrs, function(moteName) {
                    // get the index into allDataMotes for this content mote
                moteIndex = _.indexOf(dhpCardsView.allMotes, moteName, true);
                contentData = theFeature.properties.content[moteName];
                if (contentData) {
                    contentElement = jQuery('<div class="datamote'+moteIndex+'" style="display: none">'+contentData+'</div>');
                    jQuery(theCard).append(contentElement);
                }
            });

            jQuery(cardHolder).append(theCard);
        }); // _.each()

        var sortObj, moteIDs = [], moteDef;

        if (dhpCardsView.cardsEP.sortMotes.length > 0) {
                // Create Object that describes sort options for Isotope by
                //   associating names of sort motes with the class names that mark the data
                // Only Short Text and Long Text can be treated as plain text objects --
                //  must parse Date, Number, etc.
            _.each(dhpCardsView.cardsEP.sortMotes, function(moteName) {
                moteDef = dhpServices.findMoteByName(moteName);
                moteIndex = _.indexOf(dhpCardsView.allMotes, moteName, true);

                switch (moteDef.type) {
                case 'Short Text':
                case 'Long Text':
                        // Create a curried function which has the mote index and does case-insensitive comparison
                    moteIDs.push((function(index) {
                        return function(itemElem) {
                            return jQuery(itemElem).find('.datamote'+index).text().toLowerCase();
                        } } )(moteIndex) );
                    break;
                case 'Date':
                    var today = new Date(), dateStr, thisEvent;

                        // Create a curried function which has the mote index and returns Date (from)
                    moteIDs.push((function(index) {
                        return function(itemElem) {
                            dateStr = jQuery(itemElem).find('.datamote'+index).text();
                            thisEvent = dhpServices.eventFromDateStr(dateStr, today, today);
                            return thisEvent.start;
                        } } )(moteIndex) );
                    break;
                } // switch mote type
            });
            sortObj = _.object(dhpCardsView.cardsEP.sortMotes, moteIDs);

                // Initialize Isotope
            cardHolder.isotope(
                { itemSelector: '.card',
                  getSortData: sortObj
                } );
        } else {
                // Initialize Isotope
            cardHolder.isotope(
                { itemSelector: '.card' }
            );

        }

        if (dhpCardsView.currentSort) {
            cardHolder.isotope( { sortBy: dhpCardsView.currentSort } );
        }

            // Bind click code to the whole container... we'll search for specific card
        jQuery(cardHolder).click(dhpCardsView.selectCard);
    } // createCards()
};