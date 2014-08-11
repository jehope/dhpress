// DH Press Timeline View -- contains all data and functions for rendering timelines
// Based initially on http://bl.ocks.org/rengel-de/5603464
//      See also https://github.com/rengel-de/timeline
// ASSUMES: A view area for the timeline has been marked with HTML div as "dhp-visual"
// TO DO:   Handle case when from/to, openFrom/openTo are not provided by user by extracting
//              them from data
// USES:    JavaScript libraries D3, jQuery

// Contains fields: tlEP, callBacks
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
        //          callBacks    = object loaded with project-page callback functions
    initialize: function(ajaxURL, projectID, vizIndex, tlEP, callBacks)
    {
        dhpTimeline.tlEP        = tlEP;
        dhpTimeline.callBacks   = callBacks;

            // For now, from/to dates are required, so leave this commented
        // if (tlEP.from == null || tlEP.from == '') {
        //     dhpTimeline.fromDate = null;
        // } else {
            dhpTimeline.fromDate = dhpTimeline.parseADate(tlEP.from, true);
        // }
        // if (tlEP.to == null || tlEP.to == '') {
        //     dhpTimeline.toDate = null;
        // } else {
            dhpTimeline.toDate = dhpTimeline.parseADate(tlEP.to, true);
        // }
        // if (tlEP.openFrom == null || tlEP.openFrom == '') {
        //     dhpTimeline.openFromDate = null;
        // } else {
            dhpTimeline.openFromDate = dhpTimeline.parseADate(tlEP.openFrom, true);
        // }
        // if (tlEP.openTo == null || tlEP.openTo == '') {
        //     dhpTimeline.openToDate = null;
        // } else {
            dhpTimeline.openToDate = dhpTimeline.parseADate(tlEP.openTo, true);
        // }

            // Make calculations based on timespan

            // from and to dates are now set, can set size of instananeous event: 3% of total time period space
        dhpTimeline.instantOffset = (dhpTimeline.toDate - dhpTimeline.fromDate) * .03;

            // Prepare GUI data and components
        dhpTimeline.maxTracks   = typeof(tlEP.rows)  === 'number' ? tlEP.rows  : parseInt(tlEP.rows);
        dhpTimeline.bandHt      = typeof(tlEP.bandHt)  === 'number' ? tlEP.bandHt  : parseInt(tlEP.bandHt);
        dhpTimeline.instRad     = (dhpTimeline.bandHt / 2) -1; // pixel radius of instantaneous circle
        dhpTimeline.bandGap     = 25;           // pixels between one band and the next
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

            // Append div for timeline into visualization space
        jQuery('#dhp-visual').append('<div id="dhp-timeline"><div>');

            // Total width and height of timeline area
        dhpTimeline.tWidth     = typeof(tlEP.width)  === 'number' ? tlEP.width  : parseInt(tlEP.width);
        dhpTimeline.tHeight    = typeof(tlEP.height) === 'number' ? tlEP.height : parseInt(tlEP.height);

        dhpTimeline.labelW     = typeof(tlEP.wAxisLbl) === 'number' ? tlEP.wAxisLbl : parseInt(tlEP.wAxisLbl);

            // Create SVG and frame for graphics
        var margin = { top: 6, right: 6, bottom: 6, left: 6 };
            // Inner width and height
        dhpTimeline.iWidth = dhpTimeline.tWidth - margin.left - margin.right,
        dhpTimeline.iHeight = dhpTimeline.tHeight - margin.top - margin.bottom;

            // Threshold is used to determine at what point years, months or days should be displayed
            // It needs to be determined by proportion of screen space and label width
        dhpTimeline.threshold  = (dhpTimeline.iWidth / (dhpTimeline.labelW*6.25));

            // Create svg element for rendering
        dhpTimeline.svg = d3.select('#dhp-timeline').append("svg")
            .attr("class", "svg-container")
            .attr("id", "svg-container")
            .attr("width", dhpTimeline.tWidth)
            .attr("height", dhpTimeline.tHeight)
                // Create inset frame
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top +  ")");

            // Clip all graphics to inner area of chart
        dhpTimeline.svg.append("clipPath")
            .attr("id", "chart-area")
            .append("rect")
            .attr("width", dhpTimeline.iWidth)
            .attr("height", dhpTimeline.iHeight);

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
                callBacks.create1Legend(tlEP.color, dhpTimeline.legendTerms);

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
                callBacks.remLoadingModal();
            },
            error: function(XMLHttpRequest, textStatus, errorThrown)
            {
               alert(errorThrown);
            }
        });
    }, // initialize()


        // PURPOSE: Parse a text string as a single Date
        // INPUT:   dateString = string itself containing Date
        //          from = true if it is the from Date, false if it is the to Date
        // ASSUMES: dateString has been trimmed
        // NOTE:    month # is 0-based!!
        // TO DO:   Handle from/to bounds when missing m or d
    parseADate: function(dateString, from)
    {
        var strComponents;
        var yearBCE;
        var year, month, day;
        var date;

            // First check for negative year
        if (dateString.charAt(0) == '-') {
            yearBCE = true;
            dateString = dateString.substring(1);
        } else {
            yearBCE = false;
        }

        strComponents = dateString.split('-');
            // Year must be supplied at very least
        year = parseInt(strComponents[0]);
        if (yearBCE) {
            year = -year;
        }
            // If it's a start date, we want defaulted data to be early as possible
        switch (strComponents.length) {
        case 3:
            month = parseInt(strComponents[1]) - 1;
            day = parseInt(strComponents[2]);
            break;
        case 2:
            month = parseInt(strComponents[1]) - 1;
            if (from) {
                day = 1;
            } else {
                day = 31;
            }
            break;
        case 1:
            if (from) {
                month = 0; day = 1;
            } else {
                month = 11; day = 31;
            }
            break;
        } // switch

        if (year < 0 || year > 99) { // 'Normal' dates
            date = new Date(year, month, day);
        } else if (year == 0) { // Year 0 is '1 BC'
            date = new Date (-1, month, day);
        } else {
            // Create arbitrary year and then set the correct year
            date = new Date(year, month, day);
            date.setUTCFullYear(("0000" + year).slice(-4));
        }
        return date;
    }, // parseADate()


        // PURPOSE: Handle loading time events -- create all visuals from them
        //          Converts raw event data into usable data in events array
        // ASSUMES: dhpTimeline.rawData contains all time data
        //          fromDate/toDate is set for "open" date value to work properly
    processEvents: function()
    {
        var today = new Date();

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
            var newEvent = { };
            newEvent.index = index;

            var dates = item.date.split('/');

            dates[0] = dates[0].trim();
            if (dates[0] == 'open') {
                newEvent.start = dhpTimeline.fromDate;
            } else {
                newEvent.start = dhpTimeline.parseADate(dates[0], true);
            }

                // Is it a range of from/to?
            if (dates.length == 2) {
                newEvent.instant = false;
                dates[1] = dates[1].trim();
                if (dates[1] === 'open') {
                    newEvent.end = dhpTimeline.toDate;
                } else {
                    newEvent.end = dhpTimeline.parseADate(dates[1], false);
                }

                // Otherwise an instantaneous event
            } else {
                newEvent.instant = true;
                newEvent.end = new Date(newEvent.start.getTime() + dhpTimeline.instantOffset);
            }
                // Don't allow dates to go beyond today in future
            if (item.end > today) { item.end = today; };

            dhpTimeline.events.push(newEvent);
        });

            // Put events in order
        dhpTimeline.events.sort(compareDescending);

            // Since zoom window open must be set, so must this -- leave this for now
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
        var tracks = new Array(dhpTimeline.maxTracks);
        var trackNum;

            // Lay events out on tracks: older items end deeper
        dhpTimeline.events.forEach(function (theEvent) {
                // Find the first track where it fits
            for (trackNum = 0; trackNum < dhpTimeline.maxTracks; trackNum++) {
                    // First check to see if track has any value
                if (tracks[trackNum]) {
                    if (theEvent.end < tracks[trackNum]) {
                        break;
                    }
                    // if nothing is stored in track at all yet, this date can be stored
                } else {
                    break;
                }
            }

                // Did it run out of available tracks?
            if (trackNum == dhpTimeline.maxTracks) {
                console.log("Your tracks are full; add more.");
                theEvent.track = -1;
            } else {
                    // Record track that event "fits" into
                theEvent.track = trackNum;
                    // Record relevant time period in track -- this will append to array if at end
                tracks[trackNum] = theEvent.start;
            }
        });
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

            // Create record about band
        var band = {};
        band.id = index;
        band.l = 0;
        band.w = dhpTimeline.iWidth;

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

            // Create enclosing container for the band
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
                dhpTimeline.callBacks.showMarkerModal(eventData);
            });

            // Finish specifying data for date ranges
        var intervals = d3.select("#band" + band.id).selectAll(".interval");
            // Solid rectangle to fill interval with color
        intervals.append("rect")
            .attr("width", "100%")
            .attr("height", "100%")
            .style("fill", function(d) {
                var eventData = dhpTimeline.features[d.index];
                return dhpTimeline.callBacks.getItemColor(eventData.properties.categories, dhpTimeline.legendTerms);
            });

            // Label for interval -- only for top band
        if (index == 0) {
            intervals.append("text")
                .attr("class", "intervalLabel")
                .attr("x", 2)
                .attr("y", fontPos)
                .style("fill", function(d) {
                    var eventData = dhpTimeline.features[d.index];
                    return dhpTimeline.callBacks.getTextColor(dhpTimeline.callBacks.getItemColor(eventData.properties.categories, dhpTimeline.legendTerms));
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
                return dhpTimeline.callBacks.getItemColor(eventData.properties.categories, dhpTimeline.legendTerms);
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
    createLabels: function(index)
    {
        var band = dhpTimeline.bands[index];

            // Calculated positions
        var labelTop = band.t + band.h - dhpTimeline.labelH;
        var y = band.t + band.h + 1;

            // The data associated with Labels
        var startLabel = {
                            name: 'from',
                            x: 0,
                            left: 0,
                            anchor: 'start',
                            textDelta: 2,
                            whichDate: function(min, max) { return min; }
                        };
        var endLabel = {
                            name: 'to',
                            x: band.l + band.w,
                            left: band.l + band.w - dhpTimeline.labelW,
                            anchor: 'end',
                            textDelta: -3,
                            whichDate: function(min, max) { return max; }
                        };
        var labelDefs = [startLabel, endLabel];

            // Create graphic container for labels just below main chart space
        var bandLabels = dhpTimeline.chart.append("g")
            .attr("id", "bandLabels"+index)
            .attr("transform", "translate(0," + (band.t + band.h + 1) +  ")")
            .selectAll("#" + "bandLabels"+index)
                // Create "g" for each of the start & end labels
            .data(labelDefs)
            .enter().append("g");

            // Create containing rects for labels
        bandLabels.append("rect")
            .attr("class", "bandLabel")
            .attr("x", function(label) { return label.left; })
            .attr("width", dhpTimeline.labelW)
            .attr("height", dhpTimeline.labelH);
            // .style("opacity", 1);

            // Add textual features for labels
        var labels = bandLabels.append("text")
            .attr("class", 'bandMinMaxLabel')
            .attr("id", function(label) { return label.name; } )
            .attr("x", function(label) { return label.x+label.textDelta; } )
            .attr("y", dhpTimeline.labelH-4)
            .attr("text-anchor", function(label) { return label.anchor; });

            // Needs to know how to draw itself
        labels.redraw = function ()
        {
            var domainVals = band.xScale.domain();
            var min = domainVals[0],
                max = domainVals[1];

                // This will be called for each label in turn
                // What to print on label depends on scale of time periods
                // Have tried to use reasonable heuristic
            labels.text(function (label) {
                var timeDiff = max.getUTCFullYear() - min.getUTCFullYear();
                if (timeDiff > dhpTimeline.threshold) {
                    return label.whichDate(min,max).getUTCFullYear();
                } else {
                    timeDiff = (timeDiff*12)+(max.getMonth() - min.getMonth());
                    if (timeDiff > dhpTimeline.threshold) {
                        return dhpTimeline.months[label.whichDate(min,max).getMonth()];
                    } else {
                        return label.whichDate(min,max).getDate();
                    }
                }
            })
        }; // redraw()

            // Add to items needed to be drawn
        band.parts.push(labels);
        dhpTimeline.components.push(labels);
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
            .tickFormat(function (d) {
                var dates = band.xScale.domain();
                var timeDiff = dates[1].getFullYear() - dates[0].getFullYear();

                if (timeDiff > dhpTimeline.threshold) {
                    return d.getUTCFullYear();
                } else {
                    timeDiff = (timeDiff*12)+(dates[1].getMonth() - dates[0].getMonth());
                    if (timeDiff > dhpTimeline.threshold) {
                        return dhpTimeline.months[d.getMonth()];
                    } else {
                        return d.getDate();
                    }
                }
            } );

            // Create SVG components
        var xAxis = dhpTimeline.chart.append("g")
            .style("font-size", (dhpTimeline.labelH-6)+'px')
            .attr("class", "axis")
            .attr("transform", "translate(0," + (band.t + band.h)  + ")");

            // PURPOSE: Draw itself when called
        xAxis.redraw = function () {
            xAxis.call(axis);
        };

        band.parts.push(xAxis); // for brush.redraw
        dhpTimeline.components.push(xAxis); // for timeline.redraw
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
        var brush = d3.svg.brush()
            .x(band.xScale.range([0, band.w]))
            .extent([dhpTimeline.openFromDate, dhpTimeline.openToDate])
                // Code to bind when brush moves
            .on("brush", function() {
                var domain = brush.empty()
                    ? band.xScale.domain()
                    : brush.extent();

                    // Rescale top timeline(s) according to bottom brush
                dhpTimeline.bands[0].xScale.domain(domain);
                dhpTimeline.bands[0].redraw();
            });

            // Create SVG component and connect to controller
        var xBrush = band.g.append("svg")
            .attr("class", "brush")
            .call(brush);

            // Container is opaque rectangle with black arrow handles
        xBrush.selectAll("rect")
            .attr("y", 0)
            .attr("height", band.h);
    } // createBrush()

}; // dhpTimeline

