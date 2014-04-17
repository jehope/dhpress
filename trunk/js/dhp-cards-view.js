// DH Press Maps View -- contains all data and functions for rendering cards
// ASSUMES: A view area for the cards has been marked with HTML div as "dhp-visual"
// NOTES:   Format of Marker and Legend data is documented in dhp-project-functions.php
// USES:    JavaScript libraries jQuery, Isotope

var dhpCardsView = {

        // Contains fields: ajaxURL, projectID, cardsEP, callBacks
        //                  rawData
        //                  colorValues

        // PURPOSE: Initialize map viewing area with controls and layers
        // INPUT:   ajaxURL      = URL to WP
        //			projectID    = ID of project
        //			cardsEP      = settings for cards entry point (from project settings)
        //          callBacks    = object loaded with project-page callback functions
    initializeCards: function(ajaxURL, projectID, cardsEP, callBacks)
    {
            // Save reset data for later
        dhpCardsView.ajaxURL        = ajaxURL;
        dhpCardsView.projectID      = projectID;
        dhpCardsView.cardsEP        = cardsEP;
        dhpCardsView.callBacks      = callBacks;

        dhpCardsView.loadCards();
    }, // initializeCards()

        // PURPOSE: Resizes dhp elements when browser size changes
        // 
    updateVizSpace: function()
    {
        // jQuery(".card-container").masonry();
    }, // updateVizSpace()

        // PURPOSE: Called by createCards to determine color to use for marker
        // RETURNS: First match on color to use for icon, or else default color
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
                        return 'style="background-color:'+thisCat.icon_url+'"';
                    } else {
                        return 'style="background-color:'+dhpCardsView.cardsEP.defColor+'"';
                    }
                    // check for matches on its children
                } else {
                    if (thisCat.children) {
                        catChildren = thisCat.children;
                        for (k=0;k<catChildren.length;k++) {
                            if(catChildren[k].term_id==thisMarkerID) {
                               if(thisCat.icon_url.substring(0,1) == '#') {
                                    return 'style="background-color:'+thisCat.icon_url+'"';
                                } else {
                                    return 'style="background-color:'+dhpCardsView.cardsEP.defColor+'"';
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
        jQuery('#dhp-visual').append('<div id="card-container"></div>"');
        var cardHolder = jQuery('#card-container');

            // Find array of color values in AJAX data
        dhpCardsView.colorValues = null;
        if (dhpCardsView.cardsEP.color && dhpCardsView.cardsEP.color != '') {
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

        var theCard, contentElement, contentData, theTitle, colorStr;

            // set default
        colorStr = 'style="background-color:'+dhpCardsView.cardsEP.defColor+'"';

            // Markers are last array in data
            // TO DO: Add data attributes for filter and sort motes, etc
        _.each(dhpCardsView.rawData[dhpCardsView.rawData.length-1]['features'], function(theFeature, index) {
                // little error-check
            if (theFeature.type !== 'Feature') {
                throw new Error("Error in marker array");
            }
            theTitle = theFeature.card.title || '';

            if (dhpCardsView.colorValues) {
                colorStr = dhpCardsView.getHighestParentColor(theFeature.properties.categories);
            }

                // Create element for the card
            theCard = jQuery('<div class="card" id="cardID'+index+'" '+colorStr+'><p style="font-weight: bold">'+theTitle+'</p></div>');

                // Go through all content motes specified for each card view
                // Should we take mote type into consideration?
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
                project: dhpCardsView.projectID
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