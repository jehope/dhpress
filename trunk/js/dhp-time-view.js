// DH Press Timeline View -- contains all data and functions for rendering timelines
// Based initially on http://bl.ocks.org/rengel-de/5603464
//      See also https://github.com/rengel-de/timeline
// ASSUMES: A view area for the timeline has been marked with HTML div as "dhp-visual"
// TO DO:   Handle case when from/to, openFrom/openTo are not provided by user by extracting
//              them from data. This is complicated by other calculations based on these dates.
// USES:    JavaScript libraries D3, jQuery

// Contains fields: tlEP
//                  rawData = raw time marker data
//                  colorValues = Legend filter
//                  features = FeatureCollection array

//                  events = array { start[Date], end[Date], instant[Boolean], track[Integer], index[Integer] }
//                  bands = array for each view of events: [0] = zoom view, [1] = entire timeline

//                  fromDate, toDate = total time frame
//                  openFromDate, openToDate = time frame in zoom window
//                  instantOffset = amount of time added to start date for display purposes (proportional)

var dhpTimeline = {

        // PURPOSE: Initialize timeline viewing area with controls and layers
        // INPUT:   ajaxURL      = URL to WP
        //			projectID    = ID of project
        //          vizIndex     = index of this visualization
        //			tlEP      	 = settings for timeline entry point (from project settings)
    initialize: function(ajaxURL, projectID, vizIndex, tlEP)
    {
        dhpTimeline.tlEP        = tlEP;

        dhpTimeline.fromDate = dhpServices.parseADate(tlEP.from, true);
        dhpTimeline.toDate = dhpServices.parseADate(tlEP.to, true);
        dhpTimeline.openFromDate = dhpServices.parseADate(tlEP.openFrom, true);
        dhpTimeline.openToDate = dhpServices.parseADate(tlEP.openTo, true);

            // Make calculations based on timespan

            // from and to dates are now set, can set size of instananeous event: 3% of total time period space
        dhpTimeline.instantOffset = (dhpTimeline.toDate - dhpTimeline.fromDate) * .03;

            // Prepare GUI data and components
        dhpTimeline.controlHeight= 49;  // LegendHeight[45] + 4
        dhpTimeline.bandHt      = typeof(tlEP.bandHt)  === 'number' ? tlEP.bandHt  : parseInt(tlEP.bandHt);
        dhpTimeline.instRad     = (dhpTimeline.bandHt / 2) -1; // pixel radius of instantaneous circle
        dhpTimeline.bandGap     = 37;           // pixels between one band and the next
        dhpTimeline.trackGap    = 1;            // pixels between one track and another
        dhpTimeline.labelH      = 16;           // pixel height of axis labels (font = labelH-3)
        dhpTimeline.bands       = new Array(2);
        dhpTimeline.components  = [];   // All the components of the timeline for redrawing

        dhpTimeline.months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            // Create control div for Legend Key
        jQuery("#dhp-visual").append('<div id="dhp-controls"></div>');

            // Create placeholder for Legend menu
        jQuery('#dhp-controls').append(Handlebars.compile(jQuery("#dhp-script-legend-head").html()));

        jQuery(document).foundation();

            // Create SVG and frame for graphics
            // svgMargin is for space inside of dhp-timeline occupied by #svg-container
        dhpTimeline.svgMargin = { top: 6, right: 22, bottom: 6, left: 6 };
            // chartMargin is for space inside of #svg-container occupied by timeline chart
        dhpTimeline.chartMargin = { top: 4, right: 9, bottom: 4, left: 4 };
        var widths = dhpTimeline.getWidths();

            // Append div for timeline into visualization space
        jQuery('#dhp-visual').append('<div id="dhp-timeline"><div>');
        jQuery('#dhp-timeline').width(widths[0]);

        dhpTimeline.labelW     = typeof(tlEP.wAxisLbl) === 'number' ? tlEP.wAxisLbl : parseInt(tlEP.wAxisLbl);

            // Threshold is used to determine at what point years, months or days should be displayed
            // It needs to be determined by proportion of screen space and label width
        dhpTimeline.threshold  = (widths[2] / (dhpTimeline.labelW*6.25));

            // Create svg element for rendering
        dhpTimeline.svg = d3.select('#dhp-timeline').append("svg")
            .attr("class", "svg-container")
            .attr("id", "svg-container")
            .attr("width", widths[1])
                // Create inset frame
            .append("g")
            .attr("transform", "translate(" + dhpTimeline.svgMargin.left + "," + dhpTimeline.svgMargin.top +  ")");

            // Clip all graphics to inner area of chart
        dhpTimeline.svg.append("clipPath")
            .attr("id", "chart-area")
            .append("rect")
            .attr("width", widths[2]);

            // Insert chart inside of clipping area
        dhpTimeline.chart = dhpTimeline.svg.append("g")
                .attr("class", "chart")
                .attr("clip-path", "url(#chart-area)" );

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
                dhpTimeline.rawData = JSON.parse(data);

                    // First deal with Legend
                dhpTimeline.legendTerms = dhpTimeline.rawData[0];
                dhpTimeline.legendTerms = dhpTimeline.legendTerms.terms;
                dhpServices.create1Legend(tlEP.color, dhpTimeline.legendTerms);

                    // Now handle the actual events and create timeline
                dhpTimeline.processEvents();
                dhpTimeline.createBand(0);
                dhpTimeline.createBand(1);
                dhpTimeline.createXAxis(0);
                dhpTimeline.createXAxis(1);
                dhpTimeline.createLabels(0);
                dhpTimeline.createLabels(1);
                dhpTimeline.createBrush();

                dhpTimeline.components.forEach(function (component) {
                    component.redraw();
                });
                dhpServices.remLoadingModal();
            },
            error: function(XMLHttpRequest, textStatus, errorThrown)
            {
               alert(errorThrown);
            }
        });
    }, // initialize()


        // RETURNS: Pixel width available for the various containers:
        //              0 = total width (#dhp-timeline), 1 = svg-container, 2 = inner chart
        // NOTES:   Must account for margins of outer #dhp-timeline (inc. scrollbar)
        //              as well as margins of inner container
    getWidths: function()
    {
        var widths = [];
        var svgWidth;

        var curWidth = jQuery('#dhp-visual').width();
            // Total width of window
        widths.push(curWidth);
            // Width of svg-container
        svgWidth = curWidth-(dhpTimeline.svgMargin.left + dhpTimeline.svgMargin.right);
        widths.push(svgWidth);
            // Width of chart itself
        widths.push(svgWidth-(dhpTimeline.chartMargin.left + dhpTimeline.chartMargin.right));

        return widths;
    }, // getWidths()


        // PURPOSE: Resizes timeline-specific elements initially and when browser size changes
    dhpUpdateSize: function()
    {
            // Height of timeline chart itself will not change, but container will (enable scroll bars)
            // Height = total viz space minus height of navbar, margins, border & scroll bar itself
        var newHeight = jQuery('#dhp-visual').height() - (dhpTimeline.controlHeight+10);
        jQuery('#dhp-timeline').height(newHeight);

            // Expand width of containers for visual space
        var newWidths = dhpTimeline.getWidths();

        jQuery('#dhp-timeline').width(newWidths[0]);
        jQuery('#svg-container').width(newWidths[1]);

        dhpTimeline.threshold  = (newWidths[2] / (dhpTimeline.labelW*6.25));

            // Clip all graphics to inner area of chart
        d3.select("#chart-area rect").attr("width", newWidths[2]);

            // Now update each band
        _.each(dhpTimeline.bands, function(theBand, index) {
            theBand.w = newWidths[2];
            theBand.g.select(".band").attr("width", newWidths[2]);
            theBand.xScale.range([0, newWidths[2]]);

                // Need to update position of end labels (rect and text)
            var toLabel = theBand.labels[1];
            var txtLeft = toLabel.x()+toLabel.textDelta;
            theBand.labelSVGs.select('#rect-to-'+index).attr("x", toLabel.left() );
            theBand.labelSVGs.select('#txt-to-'+index).attr("x", txtLeft);
            if (index == 0) {
                theBand.labelSVGs.select('#m-txt-to-'+index).attr("x", txtLeft);
            }
        });

            // Now redraw everything!
        dhpTimeline.components.forEach(function(component) {
            component.redraw();
        });

            // Update brush by reinstating its extent
        var extent = dhpTimeline.brush.extent();
        d3.select('.brush').call(dhpTimeline.brush.extent(extent));
    }, // dhpUpdateSize()


        // PURPOSE: Handle loading time events -- create all visuals from them
        //          Converts raw event data into usable data in events array
        // ASSUMES: dhpTimeline.rawData contains all time data
        //          fromDate/toDate is set for "open" date value to work properly
    processEvents: function()
    {
            // PURPOSE: Define how to compare dates
            // ASSUMES: All elements have start and end fields
        function compareDescending(item1, item2) {
            var result = item1.start - item2.start;
                // later first
            if (result < 0) { return 1; }
            if (result > 0) { return -1; }
                // shorter time period first (if equal start)
            result = item2.end - item1.end;
            if (result < 0) { return 1; }
            if (result > 0) { return -1; }
            return 0;
        } // compareDescending()

            // The event data will always be last array of raw data
        var eventData = dhpTimeline.rawData[dhpTimeline.rawData.length-1];
        eventData = eventData.features;
        dhpTimeline.features = eventData;

        dhpTimeline.events = [];

            // Process Event info
        eventData.forEach(function(item, index) {
            var newEvent = dhpServices.eventFromDateStr(item.date);
            newEvent.index = index;

                // If an instantaneous event, need to create "placeholder" endpoint
            if (newEvent.instant) {
                newEvent.end = new Date(newEvent.start.getTime() + dhpTimeline.instantOffset);
            }

            dhpTimeline.events.push(newEvent);
        });

            // Put events in order
        dhpTimeline.events.sort(compareDescending);

            // Since zoom window open dates must be configured, must leave this for now
        //     // If no end date given in EP, get it from data
        // if (dhpTimeline.fromDate == null) {
        //     var firstDate = dhpTimeline.events[dhpTimeline.events.length-1];
        //     dhpTimeline.fromDate = new Date(firstDate.start.getUTCFullYear(),
        //                                     firstDate.start.getMonth(),
        //                                     firstDate.start.getDate());
        // }
        //     // If no start date given in EP, get it from data
        // if (dhpTimeline.toDate == null) {
        //     var lastDate = dhpTimeline.events[0];
        //     dhpTimeline.toDate = new Date(lastDate.end.getUTCFullYear(),
        //                                   lastDate.end.getMonth(),
        //                                   lastDate.end.getDate());
        // }
        //      // Would need to add a calculation of instantOffset

            // Won't need to keep this array
        var tracks = [];
        var trackNum;

            // Lay events out on tracks: older items end deeper
        dhpTimeline.events.forEach(function (theEvent) {
                // Find the first track where it fits
            for (trackNum = 0; trackNum < tracks.length; trackNum++) {
                    // First check to see if track has any value
                if (theEvent.end < tracks[trackNum]) {
                    break;
                }
            }
                // Record track that event "fits" into -- this will append to array if at end
            theEvent.track = trackNum;
                // Record relevant time period in track -- this will append to array if at end
            tracks[trackNum] = theEvent.start;
        });
            // need to know # tracks required
        dhpTimeline.maxTracks = tracks.length;
    }, // processEvents()


        // PURPOSE: Create one of the timeline bands
        // INPUT:   index = 0: zoom on top, 1: macro on bottom
        // ASSUMES: item is one pixel shorter than track; bottom macro tracks 2 pixels (1 color, 1 gap)
        // NOTES:   trackHeight = total pixel height of a track, inc padding
        //          itemHeight = pixel height used by visible components in track
    createBand: function(index)
    {
            // Band specific parameters for instantaneous events
        var instCX, instCY, instR, instLabelX;
        var widths;

            // Create record about band
        var band = {};
        band.id = index;
        band.l = 0;

        widths = dhpTimeline.getWidths();
        band.w = widths[2];

            // Top zoom band?
        if (index == 0) {
            band.t = 0;
            instCX = instCY = instR = dhpTimeline.instRad;
            instLabelX = (dhpTimeline.instRad*2)+3

                // 1 pixel space between bands
            band.h = dhpTimeline.maxTracks * (dhpTimeline.bandHt + dhpTimeline.trackGap);
            band.trackHeight = dhpTimeline.bandHt;
            band.itemHeight = dhpTimeline.bandHt-1;

            // Bottom macro view?
        } else {
            band.trackHeight = 3;
            band.itemHeight = 2;
            instCX = instCY = 1;
            instR = 1;

            band.t = (dhpTimeline.maxTracks * (dhpTimeline.bandHt + dhpTimeline.trackGap)) + dhpTimeline.bandGap;
            band.h = (dhpTimeline.maxTracks * band.trackHeight) + 2;
        }

        band.parts = [];

        band.xScale = d3.time.scale();
        if (index == 0) {
            band.xScale.domain([dhpTimeline.openFromDate, dhpTimeline.openToDate]);
        } else {
            band.xScale.domain([dhpTimeline.fromDate, dhpTimeline.toDate]);
        }
        band.xScale.range([0, band.w]);

            // Define the y-pos based on track #
        band.yScale = function (track) {
            return track * band.trackHeight;
        };

            // Create a div for this band
        band.g = dhpTimeline.chart.append("g")
            .attr("id", "band"+band.id)
            .attr("transform", "translate(0," + band.t +  ")");

            // Only top band will have text labels -- compute relative size and position
        var fontSize, fontPos;
        if (index == 0) {
            fontSize = '' + (band.itemHeight*.75) +'px';
            fontPos = band.itemHeight*.80;
        }

            // Create enclosing container for the entire band
        band.g.append("rect")
            .attr("class", "band")
            .attr("width", band.w)
            .attr("height", band.h);

            // Create svg's for all of the time events in the band with appropriate height and class
            //  -- will finish specifying data for each below
        var items = band.g.selectAll("g")
            .data(dhpTimeline.events)
            .enter().append("svg")
            .attr("y", function (d) { return band.yScale(d.track); })
            .attr("height", band.itemHeight)
            .attr("class", function (d) { return d.instant ? "part instant" : "part interval"; })
            .on("click", function(d) {
                var eventData = dhpTimeline.features[d.index];
                dhpServices.showMarkerModal(eventData);
            });

            // Finish specifying data for date ranges
        var intervals = d3.select("#band" + band.id).selectAll(".interval");
            // Solid rectangle to fill interval with color
        intervals.append("rect")
            .attr("width", "100%")
            .attr("height", "100%")
            .style("fill", function(d) {
                var eventData = dhpTimeline.features[d.index];
                return dhpServices.getItemSTColor(eventData.properties.categories, dhpTimeline.legendTerms);
            });

            // Label for interval -- only for top band
        if (index == 0) {
            intervals.append("text")
                .attr("class", "intervalLabel")
                .attr("x", 2)
                .attr("y", fontPos)
                .style("fill", function(d) {
                    var eventData = dhpTimeline.features[d.index];
                    var colors = dhpServices.getItemSTColors(eventData.properties.categories, dhpTimeline.legendTerms);
                    return colors[1];
                })
                .style("font-size", fontSize)
                .text(function (d) {
                    var feature = dhpTimeline.features[d.index];
                    return feature.title;
                });
        }

            // Finish specifying data for instantaneous events
        var instants = d3.select("#band" + band.id).selectAll(".instant");
            // Create circle for these
        instants.append("circle")
            .attr("cx", instCX)
            .attr("cy", instCY)
            .attr("r", instR)
            .style("fill", function(d) {
                var eventData = dhpTimeline.features[d.index];
                return dhpServices.getItemSTColor(eventData.properties.categories, dhpTimeline.legendTerms);
            });

            // Labels only on top zoom frame
        if (index == 0) {
                // Create label
            instants.append("text")
                .attr("class", "instantLabel")
                .attr("x", instLabelX)
                .attr("y", fontPos)
                .style("font-size", fontSize)
                .style("fill", '#000')
                .text(function (d) {
                    var feature = dhpTimeline.features[d.index];
                    return feature.title;
                });

            // If we've just created the lower band, we can now fix the vertical height of entire chart
        } else {
            var totalHt = band.t + band.h + dhpTimeline.labelH + 20;

                // Set total height of chart container
            d3.select('#svg-container').attr("height", totalHt);
                // And of clipping area
            d3.select("#chart-area rect").attr("height", totalHt);
        }

            // Item needs to know how to draw itself (will be called)
            // Recalibrate position on graph given new scale ratios
        band.redraw = function () {
            items
                .attr("x", function (d) { return band.xScale(d.start);})
                .attr("width", function (d) {
                    return band.xScale(d.end) - band.xScale(d.start); });
            band.parts.forEach(function(part) { part.redraw(); })
        }; // redraw()

            // Save all band data
        dhpTimeline.bands[index] = band;
        dhpTimeline.components.push(band);
    }, // createBand()


        // PURPOSE: Create text labels for min & max ranges of x-axes
        // NOTES:   The values to display will depend on the scale of difference between fromDate and toDate
        //          The labels for zoom band are twice the height than macro band, as may need two readings
    createLabels: function(index)
    {
        var band = dhpTimeline.bands[index];

            // Calculated positions
        var labelTop = band.t + band.h - dhpTimeline.labelH;
        var y = band.t + band.h;
        var labelH;

        if (index == 0) {
            labelH = dhpTimeline.labelH*2;
        } else {
            labelH = dhpTimeline.labelH;
        }

            // The data associated with Labels
        var startLabel = {
                            name: 'from-',
                            x: function() { return 0; },
                            left: function() { return 0; },
                            anchor: 'start',
                            textDelta: 2,
                            whichDate: function(min, max) { return min; }
                        };
        var endLabel = {
                            name: 'to-',
                            x: function() { return band.l + band.w; },
                            left: function() { return band.l + band.w - dhpTimeline.labelW; },
                            anchor: 'end',
                            textDelta: -3,
                            whichDate: function(min, max) { return max; }
                        };
        var labelDefs = [startLabel, endLabel];

            // Create graphic container for labels just below main chart space
            // These only specify vertical dimension -- essentially take entire width
        var bandLabelSVGs = dhpTimeline.chart.append("g")
            .attr("id", "bandLabels"+index)
            .attr("transform", "translate(0," + (band.t + band.h + 1) +  ")")
            .selectAll("#" + "bandLabels"+index)
                // Create "g" for each of the start & end labels
            .data(labelDefs)
            .enter().append("g");

            // Create containing rects for labels
        bandLabelSVGs.append("rect")
            .attr("class", "bandLabel")
            .attr("id", function(label) { return "rect-"+label.name+index; } )
            .attr("x", function(label) { return label.left(); })
            .attr("width", dhpTimeline.labelW)
            .attr("height", labelH);
            // .style("opacity", 1);

            // Add textual features for labels
        var yLabels = bandLabelSVGs.append("text")
            .attr("class", 'bandMinMaxLabel')
            .attr("id", function(label) { return "txt-"+label.name+index; } )
            .attr("x", function(label) { return label.x()+label.textDelta; } )
            .attr("y", dhpTimeline.labelH-4)
            .attr("text-anchor", function(label) { return label.anchor; });

            // Needs to know how to draw itself
        yLabels.redraw = function ()
        {
            var domainVals = band.xScale.domain();
            var min = domainVals[0],
                max = domainVals[1];

                // This will be called for each label in turn
            yLabels.text(function (label) {
                return label.whichDate(min,max).getUTCFullYear();
            })
        }; // redraw()

            // Add initial labels to components needed to be drawn
        band.parts.push(yLabels);
        dhpTimeline.components.push(yLabels);

        if (index == 0) {
                // If creating zoom band, need to add text features for months
            var mLabels = bandLabelSVGs.append("text")
                .attr("class", 'bandMinMaxLabel')
                .attr("id", function(label) { return 'm-txt-'+label.name+index; } )
                .attr("x", function(label) { return label.x()+label.textDelta; } )
                .attr("y", labelH-4)
                .attr("text-anchor", function(label) { return label.anchor; });

                // Needs to know how to draw itself
            mLabels.redraw = function ()
            {
                var domainVals = band.xScale.domain();
                var min = domainVals[0],
                    max = domainVals[1];

                mLabels.text(function (label) {
                    var timeDiff = max.getUTCFullYear() - min.getUTCFullYear();
                    if (timeDiff > dhpTimeline.threshold) {
                        return '';
                    } else {
                        return dhpTimeline.months[label.whichDate(min,max).getMonth()];
                    }
                })
            }; // redraw()

                // Add additional labels to components needed to be drawn
            band.parts.push(mLabels);
            dhpTimeline.components.push(mLabels);
        } // if zoom

            // Need to store these labels in the band for redrawing on resize
        band.labels = labelDefs;
        band.labelSVGs = bandLabelSVGs;
    }, // createLabels()


        // PURPOSE: Create axis for the band
    createXAxis: function (index)
    {
        var band = dhpTimeline.bands[index];

            // Create the D3 object for axis
        var axis = d3.svg.axis()
            .scale(band.xScale)
            .orient("bottom")
            .tickSize(6, 0)
                // For now, let D3 determine what label to show -- below is alternative DIY logic
                // This version (below) *does* look better for dates < 1000 CE
            // .tickFormat(function (d) {
            //     var dates = band.xScale.domain();
            //     var timeDiff = dates[1].getFullYear() - dates[0].getFullYear();
            //         // What to print on label depends on scale of time periods
            //         // Have tried to use reasonable heuristic
            //     if (timeDiff > dhpTimeline.threshold) {
            //         return d.getUTCFullYear();
            //     } else {
            //         timeDiff = (timeDiff*12)+(dates[1].getMonth() - dates[0].getMonth());
            //         if (timeDiff > dhpTimeline.threshold) {
            //             return dhpTimeline.months[d.getMonth()];
            //         } else {
            //             return d.getDate();
            //         }
            //     }
            // } )
            ;

            // Create SVG components
        var axisSVG = dhpTimeline.chart.append("g")
            .style("font-size", (dhpTimeline.labelH-6)+'px')
            .attr("class", "axis")
            .attr("transform", "translate(0," + (band.t + band.h)  + ")");

            // PURPOSE: Draw itself when called
        axisSVG.redraw = function () {
            axisSVG.call(axis);
        };

        band.parts.push(axisSVG); // for brush.redraw
        dhpTimeline.components.push(axisSVG); // for timeline.redraw
    }, // createXAxis()


        // PURPOSE Create control on bottom band for changing range that affects top band
    createBrush: function()
    {
        var band = dhpTimeline.bands[1];

            // This calculation is not well supported by current JS Date
        // var openTime = dhpTimeline.fromDate.getTime();
        // var timeSpan = dhpTimeline.toDate - dhpTimeline.fromDate;

        //     // If no zoom range provided, set to 20% of total in the middle
        // if (dhpTimeline.openFromDate == null) {
        //     // dhpTimeline.openFromDate = dhpTimeline.fromDate + (timeSpan/2) - (timeSpan*.1);
        //     dhpTimeline.openFromDate = new Date(openTime + (timeSpan*.4));
        // }
        // if (dhpTimeline.openToDate == null) {
        //     // dhpTimeline.openToDate = dhpTimeline.toDate - (timeSpan/2) + (timeSpan*.1);
        //     dhpTimeline.openToDate = new Date(openTime + (timeSpan*.6));
        // }

            // Create logical controller
        dhpTimeline.brush = d3.svg.brush()
            .x(band.xScale.range([0, band.w]))
                // Start with default zoom position
            .extent([dhpTimeline.openFromDate, dhpTimeline.openToDate])
                // Code to bind when brush moves
            .on('brush', function() {
                var extent0 = dhpTimeline.brush.extent(); // "original" default value
                var extent1;                  // new recomputed value

                  // if dragging, preserve the width of the extent, rounding by days
                if (d3.event.mode === "move") {
                    var d0 = d3.time.day.round(extent0[0]),
                        d1 = d3.time.day.offset(d0, Math.round((extent0[1] - extent0[0]) / 864e5));
                    extent1 = [d0, d1];

                    // otherwise, if new position, round both dates
                } else {
                    extent1 = extent0.map(d3.time.day.round);

                        // if empty when rounded, create minimal sized lens -- at least 1 day long
                    if (extent1[0] >= extent1[1]) {
                        extent1[0] = d3.time.day.floor(extent0[0]);
                        extent1[1] = d3.time.day.ceil( d3.time.day.offset(extent1[0], Math.round(dhpTimeline.instantOffset / 864e5) ) );
                    }
                }

                    // "this" will actually point to the brushSVG object
                    // Replaces SVG data to correspond to new brush params
                d3.select(this).call(dhpTimeline.brush.extent(extent1));

                    // Rescale top timeline(s) according to bottom brush
                dhpTimeline.bands[0].xScale.domain(extent1);
                dhpTimeline.bands[0].redraw();
            });

            // Create SVG component and connect to controller
        dhpTimeline.brushSVG = band.g.append("svg")
            .attr("class", "brush")
            .call(dhpTimeline.brush);

            // Container is opaque rectangle
        dhpTimeline.brushSVG.selectAll("rect")
            .attr("y", 0)
            .attr("height", band.h-1);
    } // createBrush()

}; // dhpTimeline

