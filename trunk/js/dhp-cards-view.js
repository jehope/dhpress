// DH Press Maps View -- contains all data and functions for rendering cards
// ASSUMES: A view area for the cards has been marked with HTML div as "dhp-visual"
// NOTES:   Format of Marker and Legend data is documented in dhp-project-functions.php
// USES:    JavaScript libraries jQuery, Isotope

var dhpCardsView = {

        // Contains fields: ajaxURL, projectID, vizIndex, cardsEP, callBacks
        //                  rawData
        //                  colorValues   = array of { id, icon_url }
        //                  allFields     = array of names of all sort and filter motes, for data- attributes
        //                  currentSort   = name of mote currently used for sorting
        //                  currentFilter = name of mote currently used for filtering

        // PURPOSE: Initialize card viewing area with controls and layers
        // INPUT:   ajaxURL      = URL to WP
        //			projectID    = ID of project
        //			cardsEP      = settings for cards entry point (from project settings)
        //          callBacks    = object loaded with project-page callback functions
    initializeCards: function(ajaxURL, projectID, vizIndex, cardsEP, callBacks)
    {
        var menuHTML, active;

            // Save reset data for later
        dhpCardsView.ajaxURL        = ajaxURL;
        dhpCardsView.projectID      = projectID;
        dhpCardsView.vizIndex       = vizIndex;
        dhpCardsView.cardsEP        = cardsEP;
        dhpCardsView.callBacks      = callBacks;

        dhpCardsView.currentSort    = '';
        dhpCardsView.currentFilter  = '';

        dhpCardsView.allFields      = [];

            // Add Sort By controls
        if (cardsEP.sortMotes.length > 0) {
            jQuery('.top-bar-section .left').append(Handlebars.compile(jQuery("#dhp-script-cards-sort").html()));
            _.each(cardsEP.sortMotes, function(theMote, index) {
                dhpCardsView.allFields.push(theMote);
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
                        // TO DO: Call Isotope
                }
            });
        } // if sortMotes

            // Add Filter By controls
        if (cardsEP.filterMotes.length > 0) {
            jQuery('.top-bar-section .left').append(Handlebars.compile(jQuery("#dhp-script-cards-filter-menu").html()));
            _.each(cardsEP.filterMotes, function(theMote, index) {
                dhpCardsView.allFields.push(theMote);
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
                }
            });

            jQuery('.top-bar-section .left').append(Handlebars.compile(jQuery("#dhp-script-cards-filter-input").html()));

            jQuery('#dhp-filter-button').click(function() {
                var filterText;
                filterText = jQuery('#dhp-filter-input').val();
                if (filterText.length) {
                    // TO DO: Invoke Isotope
                }
            });
        } // if filterMotes


        jQuery(document).foundation();

            // Ensure all fields unique -- this is needed for creating cards
        dhpCardsView.allFields = _.uniq(dhpCardsView.allFields);

        dhpCardsView.loadCards();
    }, // initializeCards()



        // PURPOSE: Resizes dhp elements when browser size changes
        // 
    updateVizSpace: function()
    {
        jQuery("#card-container").isotope();
    }, // updateVizSpace()

        // PURPOSE: Called by createCards to determine color to use for marker
        // RETURNS: String of first match on color to use for icon, or else default color
        // INPUT:   featureVals = array of category IDs (integers) associated with a feature/marker
        // ASSUMES: colorValues has been loaded
    getHighestParentColor: function(featureVals)
    {
        var countTerms = dhpCardsView.colorValues.length; 
        var countCats = featureVals.length;
        var thisCat, thisCatID;
        var thisMarkerID;
        var catChildren;
        var i,j,k;

            // If no color motes or if marker has no category values, return default
        if (countTerms==0 || countCats==0) {
            return 'style="background-color:'+dhpCardsView.cardsEP.defColor+'"';
        }

        for(i=0;i<countTerms;i++) {         // for all category values
            thisCat = dhpCardsView.colorValues[i];
            thisCatID = thisCat.id;

            for(j=0;j<countCats;j++) {      // for all marker values
                // legend categories
                thisMarkerID = featureVals[j];
                    // have we matched this element?
                if (thisCatID===thisMarkerID) {
                    if(thisCat.icon_url.substring(0,1) == '#') {
                        return thisCat.icon_url;
                    } else {
                        return dhpCardsView.cardsEP.defColor;
                    }
                    // check for matches on its children
                } else {
                    if (thisCat.children) {
                        catChildren = thisCat.children;
                        for (k=0;k<catChildren.length;k++) {
                            if(catChildren[k].term_id==thisMarkerID) {
                               if(thisCat.icon_url.substring(0,1) == '#') {
                                    return thisCat.icon_url;
                                } else {
                                    return dhpCardsView.cardsEP.defColor;
                                }
                            }
                        }
                    }
                }
           }
        }
    }, // getHighestParentColor()


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
        dhpCardsView.callBacks.showMarkerModal(selectedFeature);
    },

        // PURPOSE: Create marker objects for map visualization; called by loadMapMarkers()
        // ASSUMES: rawdata assigned to JSON object (as outlined in createMarkerArray() in dhp-project-functions.php)
    createCards: function()
    {
        jQuery('#dhp-visual').append('<div id="card-container"></div>');
        var cardHolder = jQuery('#card-container');

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

        var theCard, contentElement, contentData, theTitle, colorStr, classStr;

            // set default
        colorStr = dhpCardsView.cardsEP.defColor;

            // get class for these cards
        classStr='';
        if (dhpCardsView.cardsEP.width != 'auto') {
            classStr = dhpCardsView.cardsEP.width+' ';
        }
        if (dhpCardsView.cardsEP.height != 'auto') {
            classStr += dhpCardsView.cardsEP.height;
        }

            // Markers are last array in data
            // TO DO: Add data attributes for filter and sort motes, etc
        _.each(dhpCardsView.rawData[dhpCardsView.rawData.length-1]['features'], function(theFeature, index) {
                // little error-check
            if (theFeature.type !== 'Feature') {
                throw new Error("Error in marker array");
            }

                // If there is no data specifically about card, data will not be sent
            if (theFeature.card && theFeature.card.title && theFeature.card.title != 'disable') {
                theTitle = theFeature.card.title;
            } else {
                theTitle = null;
            }

            if (dhpCardsView.colorValues) {
                colorStr = dhpCardsView.getHighestParentColor(theFeature.properties.categories);
            }

                // Create element for the card
            theCard = jQuery('<div class="card '+classStr+'" id="cardID'+index+'" style="background-color:'+colorStr+'"></div');
            if (theTitle) {
                jQuery(theCard).append('<p style="font-weight: bold">'+theTitle+'</p></div>');
            }

                // Go through all content motes specified for each card view
            _.each(dhpCardsView.cardsEP.content, function(moteName) {
                if (moteName && moteName != '') {
                    contentData = theFeature.properties.content[moteName];
                    if (contentData) {
                        contentElement = jQuery('<p>'+contentData+'</p>');
                        jQuery(theCard).append(contentElement);
                    }
                }
            });
            jQuery(cardHolder).append(theCard);
        }); // _.each()

            // Initialize Isotope
        cardHolder.isotope(
            { itemSelector: '.card'
            } );

            // Bind click code to the whole container... we'll search for specific card
        jQuery(cardHolder).click(dhpCardsView.selectCard);
    }, // createCards()


        // PURPOSE: Get markers associated with projectID via AJAX, insert into HTML
    loadCards: function()
    {
        // console.log('loading');
    	jQuery.ajax({
            type: 'POST',
            url: dhpCardsView.ajaxURL,
            data: {
                action: 'dhpGetMarkers',
                project: dhpCardsView.projectID,
                index: dhpCardsView.vizIndex
            },
            success: function(data, textStatus, XMLHttpRequest)
            {
                dhpCardsView.rawData = JSON.parse(data);
                dhpCardsView.createCards();
                dhpCardsView.callBacks.remLoadingModal();
                // dhpCardsView.callBacks.userTipsOn();
            },
            error: function(XMLHttpRequest, textStatus, errorThrown)
            {
               alert(errorThrown);
            }
        });
    } // loadCards()

};