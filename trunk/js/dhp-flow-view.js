// DH Press Facet Flow View
// ASSUMES: A view area for the timeline has been marked with HTML div as "dhp-visual"
// USES:    JavaScript libraries jQuery, Underscore, D3, D3-parsets (DHP-modified)


var dhpFacetFlow = {

        // PURPOSE: Initialize Facet Flow viewing area with controls and layers
        // INPUT:   ajaxURL      = URL to WP
        //			projectID    = ID of project
        //          vizIndex     = index of this visualization
        //			ffEP      	 = settings for timeline entry point (from project settings)
        //          viewParams   = array of extra data about visualization
    initialize: function(ajaxURL, projectID, vizIndex, ffEP, viewParams)
    {
        dhpFacetFlow.ffEP        = ffEP;

		  // PURPOSE: Get array of discrete values as Strings from markers
		  // NOTE: 	  There are two possible ways of approaching this:
		  //			(1) Retrieve text for each mote setting, save in marker and parse text acc. to delimiter character of Mote
		  //			(2) Save only indices in properties.categories, lookup each value in Legend keys and retrieve that text
		  //		  Method 2 saves memory but is slower; Method 1 is current implementation
		function getFacetValue(dItem, dimName) {
		  var valStr = dItem.properties.content[dimName];

		  	// Find mote definition and use delimiter character
		  var moteDef = dhpServices.findMoteByName(dimName);

		  if (moteDef.delim && moteDef.delim !== '') {
			  var valArray = valStr.split(moteDef.delim);
			  for (var i=0; i<valArray.length; i++) {
			    valArray[i] = valArray[i].trim();
			  }
			  return valArray;
		  } else {
		  	return [valStr];
		  }
		} // getFacetValue()

        dhpFacetFlow.iWidth  = typeof(ffEP.width)  === 'number' ? ffEP.width  : parseInt(ffEP.width);
        dhpFacetFlow.iHeight = typeof(ffEP.height) === 'number' ? ffEP.height : parseInt(ffEP.height);

		    // Create the space where the facet flow will appear
		var vis = d3.select("#dhp-visual").append("svg")
		    .attr("width", dhpFacetFlow.iWidth)
		    .attr("height", dhpFacetFlow.iHeight);


        jQuery(document).foundation();


            // Make asynchronous call to load marker data in tree form
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
                    // Prepare the data for use
                dhpFacetFlow.rawData = JSON.parse(data);
                if (data == undefined || dhpFacetFlow.rawData == undefined ) {
                    console.log("Error with data; "+data);
                }

				var chart = d3.parsets().accessDim(getFacetValue)
										.dimensions(ffEP.motes)
										.width(dhpFacetFlow.iWidth)
										.height(dhpFacetFlow.iHeight);
				vis.datum(dhpFacetFlow.rawData[dhpFacetFlow.rawData.length-1]['features']).call(chart);

				    // Now create a select list to show the items that 
				jQuery('#dhp-visual').append('<div id="list-scroll"><div id="marker-list"></div></div>');
				jQuery('#list-scroll').width(dhpFacetFlow.iWidth);

				    // Capture clicks on list and redirect to open associated marker
				jQuery('#marker-list').click(function(evt) {
				    var targetItem, index, selectedFeature;

				        // Search up the chain to find selected card
				    targetItem = jQuery(evt.target).closest(".marker-item");
				        // If no card found (selected outside one), abort
				    if (targetItem == null || targetItem == undefined) {
				        return;
				    }
				    targetItem = jQuery(targetItem).get(0);
				    if (targetItem == null || targetItem == undefined) {
				        return;
				    }
				        // Convert cardID to index of feature in marker array
				    index = parseInt(jQuery(targetItem).data('index'));

console.log("Selected index: "+index);

				    selectedFeature = dhpFacetFlow.rawData[dhpFacetFlow.rawData.length-1]['features'][index];
				    dhpServices.showMarkerModal(selectedFeature);
				});

                dhpServices.remLoadingModal();
            },
            error: function(XMLHttpRequest, textStatus, errorThrown)
            {
               alert(errorThrown);
            }
        });

	} // initialize
};
