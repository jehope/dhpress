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
    	var rawData, legendData, chart, vis;

        dhpFacetFlow.ffEP        = ffEP;

		  // PURPOSE: Get array of discrete values as Strings from marker
		  // RETURNS: An array of values (as text) for dataItem for the facet moteName
		function getFacetValue(dataItem, moteName) {
			var i, legend;
			for (var i=0; i<(rawData.length-1); i++) {
				legend = rawData[i];
				if (moteName === legend.name) {
					return dhpServices.getItemSTLabels(dataItem, legend.terms);
				}
			}
			return [""];
		} // getFacetValue()


        dhpFacetFlow.iWidth  = typeof(ffEP.width)  === 'number' ? ffEP.width  : parseInt(ffEP.width);
        dhpFacetFlow.iHeight = typeof(ffEP.height) === 'number' ? ffEP.height : parseInt(ffEP.height);

		    // Create the space where the facet flow will appear
		vis = d3.select("#dhp-visual").append("svg")
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
                    // The first N-1 array entries will be Legends
                    // Element N will be marker data
                rawData = JSON.parse(data);
                if (data == undefined || rawData == undefined ) {
                    console.log("Error with data; "+data);
                }

				chart = d3.parsets().accessDim(getFacetValue)
										.dimensions(ffEP.motes)
										.width(dhpFacetFlow.iWidth)
										.height(dhpFacetFlow.iHeight);
				vis.datum(rawData[rawData.length-1]['features']).call(chart);

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
				        // Convert to index of feature in marker array
				    index = parseInt(jQuery(targetItem).data('index'));

				    selectedFeature = rawData[rawData.length-1]['features'][index];
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
