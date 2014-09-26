// DH Press Faceted Browser View -- contains all data and functions for rendering a Faceted Browser

// ASSUMES: A view area for the browser has been marked with HTML div as "dhp-visual"
// NOTES:   Format of Marker and Legend data is documented in dhp-project-functions.php
// USES:    JavaScript libraries jQuery, Underscore, D3 and dhpServices
// ASSUMES: Can only process Short Text, Long Text and Date data type motes
//			Date motes contain only single DateRange entry -- will group together by start, ignore end
// TO DO:   Should 2ndary values hierarchical Legend values in Short Text motes be shown?
//			Allow user to drag & reorder columns

var dhpBrowser = {

        // PURPOSE: Initialize card viewing area with controls and layers
        // INPUT:   ajaxURL      = URL to WP
        //			projectID    = ID of project
        //          vizIndex     = index of this visualization
        //			browserEP    = settings for browser entry point (from project settings)
    initialize: function(ajaxURL, projectID, vizIndex, browserEP)
    {
		var 	// Constants
	    facetColWidth  = 228,
	    facetLabelWidth = 220,
	    facetLabel0Height = 26,
	    facetLabelHeight = 22,
	    resizeW = 18,			// extra space for resize drag corner / scrollbars
	    resizeH = 18,
	    	// Computed variables
		width,
		height,
		facetData,      		// All compiled Facet Data
		fbSVG,          		// D3 object for top-level SVG
		constrainedSet, 		// array of indices resulting from current constraints
		rawData;


		    // FacetData = [ 
		    //      {
		    //          name: String,			// name of facet/mote
		    //          index: Integer,			// index of this facet entry
		    //          selected: Integer       // index of current selection or -1 = none
		    //          vals: [
		    //              {
		    //                  key: String,	// facet value
		    //                  index: Integer,	// index of this value entry
		    //                  indices: [ ]	// indices of all markers with this facet value
		    //              }, ...
		    //          ]
		    //      }, ...
		    //  ]
		function compileFacetData(facetNames, data)
		{
		    var fEntry, valIndex, fValues, moteRec, legTerms;
		    var result = [];

		    	// For each facet
		    facetNames.forEach(function(theFacet, fIndex) {
		        var newFacet = { name: theFacet, index: fIndex, selected: -1, vals: [] };

		        	// Gather data about this mote
		        moteRec = dhpServices.findMoteByName(theFacet);
		        legTerms = null;
		        	// If mote is Short Text, find Legend terms for it
		        if (moteRec.type === 'Short Text') {
					for (var i=0; i<(rawData.length-1); i++) {
						if (theFacet === rawData[i]['name']) {
							legTerms = rawData[i]['terms'];
							break;
						}
					}
		        }

		        	// For each data item
		        data.forEach(function(dataItem, dIndex) {
		        		// If not Short Text, must fetch values from properties.content
		        	if (legTerms) {
		            	fValues = dhpServices.getItemSTLabels(dataItem, legTerms);
		            } else {
		            		// Does mote allow for multiple values?
		            	if (moteRec.delim !== '') {
							var valStr = dataItem.properties.content[theFacet];

							fValues = valStr.split(moteRec.delim);
							for (var i=0; i<fValues.length; i++) {
						    	fValues[i] = fValues[i].trim();
							}
						} else {
							fValues = [dataItem.properties.content[theFacet]];
						}
							// Do values need to be processed acc to mote type?
						if (moteRec.type === 'Date') {
								// Only using start segment of DateRanges
							var theDate = fValues[0].split("/")[0];
							var yearPre="";

							if (theDate.charAt(0) == '-') {
					            yearPre = "-";
					            theDate = theDate.substring(1);
					        }
		        			var dateParts = theDate.split("-");
							switch (browserEP.dateGrp) {
							case 'exact':
								fValues[0] = yearPre+theDate;
								break;
							case 'month':
									// Provide default if none given
								if (dateParts.length == 1) {
									fValues[0] = yearPre+dateParts[0]+"1";
								} else {
									fValues[0] = yearPre+dateParts[0]+"-"+dateParts[1];
								}
								break;
							case 'year':
								fValues[0] = yearPre+dateParts[0];
								break;
							case 'decade':
								var yearInt = Math.floor(parseInt(yearPre+dateParts[0])/10);
								fValues[0] = String(yearInt)+'0';
								break;
							case 'century':
								var yearInt = Math.floor(parseInt(yearPre+dateParts[0])/100);
								fValues[0] = String(yearInt)+'00';
								break;
							} // switch
						} // if Date
		            } // not Short Text

		                // Locate vals[] entries for each of the values
		            fValues.forEach(function(thisVal) {
		                valIndex = newFacet.vals.findIndex(function(theVal) {
		                    return thisVal === theVal.key;
		                });
		                if (valIndex === -1) {
		                    fEntry = { key: thisVal, index: newFacet.vals.length, indices: [] };
		                    newFacet.vals.push(fEntry);
		                } else {
		                    fEntry = newFacet.vals[valIndex];
		                }
		                fEntry.indices.push(dIndex);
		            });
		        });	// for each data item

	            	// Sort facet keys, according to the type of mote
	            switch (moteRec.type) {
	            case 'Short Text':
	            case 'Long Text':
	            	newFacet.vals.sort(function(a, b) {
  						return a.key.localeCompare(b.key);
					});
	            	break;
	            case 'Date':
	            	newFacet.vals.sort(function(a, b) {
	            		var aDate = dhpServices.parseADate(a.key, true);
	            		var bDate = dhpServices.parseADate(b.key, true);
	            		return aDate > bDate ? 1 : -1;
	            	});
	            	break;
	            }
	            	// Reset index values
	            for (var i=0; i<newFacet.vals.length; i++) {
	            	newFacet.vals[i]['index'] = i;
	            }

		        result.push(newFacet);
		    }); // for each facet

		    return result;
		} // compileFacetData()


			// PURPOSE: Reset selection to all possible markers
		function resetSelectedSet()
		{
			var numMarkers = rawData[rawData.length-1]['features']['length'];

		    constrainedSet = [];
		    for (var i=0; i<numMarkers; i++) {
		    	constrainedSet.push(i);
		    }
		} // resetSelectedSet()


		    // PURPOSE: Recompute the constrained selection set based on current button selections
		function computeRestrainedSet()
		{
			resetSelectedSet();

		        // Now compute intersection of all selected items
		    facetData.forEach(function(theFacet) {
		        if (theFacet.selected !== -1) {
		            constrainedSet = _.intersection(constrainedSet, theFacet.vals[theFacet.selected]['indices']);
		        }
		    });
		} // computeRestrainedSet()


		    // PURPOSE: Recompute totals in labels and bars (transition animation)
		function updateAllValButtons()
		{
		    facetData.forEach(function(theFacet) {
		            // First update the percentage labels
		        var facetSel = fbSVG.select("#facet-"+theFacet.index).selectAll(".facet-val-perc");
		        facetSel.data(theFacet.vals)
		                .text(function(d) {
		                    var newIntersect = _.intersection(constrainedSet, d.indices);
		                    return newIntersect.length;
		                });
		            // Next update the bars
		        var facetSel = fbSVG.select("#facet-"+theFacet.index).selectAll(".facet-val-bar");
		        facetSel.data(theFacet.vals)
		                .transition()
		                .attr("width", function(d) {
		                    var newIntersect = _.intersection(constrainedSet, d.indices);
		                    if (newIntersect.length) {
		                        return (facetLabelWidth*newIntersect.length)/constrainedSet.length;
		                    } else {
		                        return 0;
		                    }
		                });
		    });
		} // updateAllValButtons()


		    // PURPOSE: Fill list-box with markers in current selection
		function populateList()
		{
			var features = rawData[rawData.length-1]['features'];
		      // Clear out display
		    jQuery('#marker-list').empty();
		      // Populate with names of items and create data index
		    constrainedSet.forEach(function(i) {
		        // Get each item referred to by index and create entry in data window
		      var item = features[i];
		      jQuery('#marker-list').append('<div class="marker-item" data-index="'+i+'">'+item.title+'</div>');
		    });
		} // populateList()


			// PURPOSE: Create SVG elements with D3
		function createSVG()
		{
			var facetSel;

			fbSVG = d3.select('#facets-frame').append("svg")
			    .attr("width", width)
			    .attr("height", height);

			    // Now create populate Facet Frames with data about facets
			var cols = fbSVG.selectAll(".facet-column")
			    .data(facetData)
			    .enter()
			        // Facet Label Grouping
			    .append("g")
			    .attr("transform", function(d) { return "translate(" + (d.index*facetColWidth) +  ", 0)"; } )
			    .attr("class", "facet-column" )
			    .attr("id", function(d) { return "facet-"+d.index; } );

			        // Create background color label
			cols.append("rect")
			    .attr("class", "facet-label" )
			    .attr("height", facetLabel0Height)
			    .attr("width", facetLabelWidth);

			        // Create actual label text
			cols.append("text")
			    .attr("class", "facet-label-text" )
			    .attr("x", 3)
			    .attr("y", facetLabel0Height-7)
			    .attr("text-anchor", "start")
			    .text(function(d) { return d.name; });

			    // Need dummy data to bind to RESET buttons
			var resetDummy=[1];

			        // Now create labels for specific values, column by column
			facetData.forEach(function(theFacet) {
			        // Create each column's RESET button
			    facetSel = fbSVG.select("#facet-"+theFacet.index).selectAll(".facet-reset")
			        .data(resetDummy)
			        .enter()
			        .append("g")
			            // RESET button initially starts out inactive
			        .attr("transform", "translate(0," + (facetLabel0Height+1) +  ")" )
			        .attr("class", "facet-reset inactive")
			        .attr("id", "reset-"+theFacet.index)
			        .attr("height", facetLabelHeight-1)
			        .on("click", function(d) {
			            if (theFacet.selected != -1) {
			                theFacet.selected = -1;
			                computeRestrainedSet();
			                updateAllValButtons();
			                    // Make all buttons in this column active
			                var btnSel = fbSVG.select("#facet-"+theFacet.index).selectAll(".facet-val")
			                    .data(theFacet.vals)
			                    .classed('inactive', false);
			                    // Make RESET button inactive
			                var resetSel = fbSVG.select("#reset-"+theFacet.index);
			                    resetSel.classed('inactive', true);
			                populateList();
			            }
			        });

			    facetSel
			        .append("rect")
			        .attr("class", "facet-reset-button")
			        .attr("height", facetLabelHeight-1)
			        .attr("width", facetLabelWidth);
			    facetSel
			        .append("text")
			        .attr("class", "facet-reset-text" )
			        .attr("x", 3)
			        .attr("y", facetLabelHeight-6)
			        .text("RESET");

			        	// Create button for each facet value
			    facetSel = fbSVG.select("#facet-"+theFacet.index).selectAll(".facet-val")
			        .data(theFacet.vals)
			        .enter()
			        .append("g")

			        	// Must move down one for RESET button
			        .attr("transform", function(d, i) { return "translate(0," + (facetLabel0Height+1+((i+1)*facetLabelHeight)) +  ")"; } )
			        .attr("class", "facet-val" )
			        .attr("id", function(d, i) { return "facet-"+theFacet.index+"-"+i; } )
			        .on("click", function(d) {
			            theFacet.selected = d.index;
			            computeRestrainedSet();
			            updateAllValButtons();
			                // Make all buttons in this column inactive, but this one
			            var btnSel = fbSVG.select("#facet-"+theFacet.index).selectAll(".facet-val")
			                .data(theFacet.vals)
			                .classed('inactive', function(thisBtn) { return d.index != thisBtn.index } );

			                // Make this row's RESET button active
			            var resetSel = fbSVG.select("#reset-"+theFacet.index);
			            resetSel.classed('inactive', false);

			            populateList();
			        });

			    facetSel
			        .append("rect")
			        .attr("class", "facet-val-button")
			        .attr("height", facetLabelHeight-1)
			        .attr("width", facetLabelWidth);

			        // Create percentage bar
			    facetSel
			        .append("rect")
			        .attr("class", "facet-val-bar")
			        .attr("height", facetLabelHeight-1)
			        .attr("width", function(d) {
			        	if (constrainedSet.length) {
			        		return (facetLabelWidth*d.indices.length)/constrainedSet.length;
			        	} else {
			        		return 0;
			        	}
			        } );

			        // Create actual label text
			    facetSel
			        .append("text")
			        .attr("class", "facet-val-text")
			        .attr("x", 3)
			        .attr("y", facetLabelHeight-6)
			        .text(function(d) { return d.key; });

			        // Create percentage text
			    facetSel
			        .append("text")
			        .attr("class", "facet-val-perc")
			        .attr("x", facetLabelWidth-3)
			        .attr("y", facetLabelHeight-6)
			        .text(function(d) { return d.indices.length; });
			});
		} // createSVG()


		    // Create frame where facet browser will go
		jQuery('#dhp-visual').append('<div id="facets-frame"></div>');
		    // Now create a select list to show selected items
		jQuery('#dhp-visual').append('<div id="list-scroll"><div id="marker-list"></div></div>');


        jQuery(document).foundation();

        	// Get AJAX data and process
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
                rawData = JSON.parse(data);

				    // compute facet data
				resetSelectedSet();
				facetData = compileFacetData(browserEP.motes, rawData[rawData.length-1]['features']);

				    // Initially all objects enabled
				populateList();

				    // Create space for facets and size DIVs according to #facets and max rows
				var maxRows = 0;
				facetData.forEach(function(theFacet) {
				    if (theFacet.vals.length > maxRows) {
				        maxRows = theFacet.vals.length;
				    }
				});
				width = ((browserEP.motes.length-1)*facetColWidth)+facetLabelWidth;

				    // Need to add an extra row for RESET button
				height = facetLabel0Height+(facetLabelHeight * ++maxRows);

				jQuery('#facets-frame').width(width+resizeW).height(height+resizeH);
				jQuery('#list-scroll').width(width);

				createSVG();

				    // Capture clicks on select list and redirect to open associated marker
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

				    selectedFeature = rawData[rawData.length-1]['features'][index];
				    dhpServices.showMarkerModal(selectedFeature);
				});

                dhpServices.remLoadingModal();
            },
            error: function(XMLHttpRequest, textStatus, errorThrown)
            {
               alert(errorThrown);
            }
        }); // jQuery.ajax
    } // initialize()
} // dhpBrowser
