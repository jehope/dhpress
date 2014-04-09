// PURPOSE: To coordinate multiple map sources
// HISTORY: File initially named keven-cdla.js, created 2009 by Kevin M. Eckhardt
//          Modifications done by Michael Newton to generalize for DH Press
// USES:    jQuery, OpenLayers
// NOTES:   I have removed MapSet code from original code, as it is not used by DH Press

(function () {

    var ns, _apis, verifyApiType, verifyMapId;


        // Initialize variables
    window.dhpCustomMaps = {};
    window.dhpCustomMaps.maps = {};

        // Create temporary shortcut for namespace
    ns = window.dhpCustomMaps.maps;

        // Create "map library" arrays where possible layers stored
    ns._maps = {};                      // Associative array, where map ID used to access rest of map data


    /****************************/
    /*    API type constants    */
    /****************************/

    ns.API_GOOGLE = 1;
    ns.API_OPENLAYERS = 2;
    ns.API_LEAFLET = 3;

    _apis = [ns.API_GOOGLE, ns.API_OPENLAYERS, ns.API_LEAFLET];

    // Google Maps can use either a short namespace prefix 'G'
    // or a long one 'google.maps.'
    ns._apiShortPrefix = true;

    // set the initial default API type
    ns._apiType = ns.API_GOOGLE;


    /*************************/
    /*    Library methods    */
    /*************************/

        // PURPOSE: Set or return the default mapping API type
        // INPUT:   api_type = maps API type constant (or null if just return current value)
    ns.defaultAPI = function (api_type) {
        if (!api_type) {
            return ns._apiType;
        }
        verifyApiType(api_type);
        ns._apiType = api_type;
        return ns._apiType;
    }; // defaultAPI()


        // PURPOSE: Ensure value is float, and convert to float if not
    function forceFloat(value)
    {
        if (typeof(value) === "number")
            return value;
        if (typeof(value) === "string")
            return parseFloat(value);
        throw "dhpCustomMaps error: parameter cannot be turned into number.";
    }; // forceFloat()


        // PURPOSE: Ensure value is integer, and convert to integer if not
    function forceInteger(value)
    {
        if (typeof(value) === "number")
            return value;
        if (typeof(value) === "string")
            return parseInt(value);
        throw "dhpCustomMaps error: parameter cannot be turned into number.";
    }; // forceInteger()


        // PURPOSE: Add map layer to current maps[] library
        // INPUT:   All parameters that comprise a map
    ns.addMap = function(mapID, title, bndNorth, bndSouth, bndEast, bndWest, centLat, centLon, minZoom, maxZoom, tileURL, desc)
    {
            // Create new empty array for storing this one entry
        var mapLibEntry          = {};
        mapLibEntry.title        = title;                   // usually a string, not number
        mapLibEntry.description  = desc;
        mapLibEntry.tile_url     = tileURL;
        mapLibEntry.min_zoom     = forceInteger(minZoom);
        mapLibEntry.max_zoom     = forceInteger(maxZoom);
        mapLibEntry.bounds       = {};
        mapLibEntry.bounds.north = forceFloat(bndNorth);
        mapLibEntry.bounds.south = forceFloat(bndSouth);
        mapLibEntry.bounds.east  = forceFloat(bndEast);
        mapLibEntry.bounds.west  = forceFloat(bndWest);
        mapLibEntry.centroid     = {};
        mapLibEntry.centroid.lat = forceFloat(centLat);
        mapLibEntry.centroid.lng = forceFloat(centLon);

        ns._maps[mapID] = mapLibEntry;
    }; // addMap()


    /********************/
    /*    Map object    */
    /********************/

        // PURPOSE: create a Map object
        // INPUT:   map_id = String.  Map ID for the requested resource
    ns.Map = function (map_id) {
        if (map_id.constructor !== String) {
            throw "dhpCustomMaps error: map_id should be a String.";
        }
        map_id = map_id.toUpperCase();
        verifyMapId(map_id);
        this.map_id = map_id; // Store the map id to access the metadata
        this.layer_obj = {};  // create storage for map layer objects
    };

    ns.Map.prototype.id = function () {
        return this.map_id;
    };

    ns.Map.prototype.title = function () {
        return ns._maps[this.map_id].title;
    };

    ns.Map.prototype.description = function () {
        return ns._maps[this.map_id].description;
    };

        // RETURNS: Bounds of map's tile set
        // INPUT:   use_api = Boolean.  If true, return a mapping API bounds object
        //              If false, return a ns.maps.Bounds object literal
        //          api_type - mapping api to use.  if not specified, default will be used.
        //              only applies if use_api is true
    ns.Map.prototype.bounds = function (use_api, api_type) {
        var GLLB, GLL, lb, thisMap;

        // if use_api is not there, or not a boolean, then default to true
        if (typeof(use_api) !== "boolean") {
            use_api = true;
        }

        thisMap = ns._maps[this.map_id];

        if (use_api) {
            // if no api specified, use the default
            if (!api_type) {
                api_type = ns._apiType;
            }

            // verify the api is valid and present
            verifyApiType(api_type, true);

            // create the bounds object
            switch (api_type) {

            case ns.API_GOOGLE:
                // use the proper constuctors based on the detected api prefix
                if (ns._apiShortPrefix) {
                    GLLB = GLatLngBounds;
                    GLL = GLatLng;
                }
                else {
                    GLLB = google.maps.LatLngBounds;
                    GLL = google.maps.LatLng;
                }
                return new GLLB(
                    new GLL(thisMap.bounds.south, thisMap.bounds.west),
                    new GLL(thisMap.bounds.north, thisMap.bounds.east)
                );

            case ns.API_OPENLAYERS:
                lb = new OpenLayers.Bounds(thisMap.bounds.west, thisMap.bounds.south,
                            thisMap.bounds.east, thisMap.bounds.north
                );
                // must transform bounds from geographic lat/lng
                // to spherical mercator for google-like tiles
                lb.transform(new OpenLayers.Projection("EPSG:4326"),
                             new OpenLayers.Projection("EPSG:900913"));
                return lb;
            
            case ns.API_LEAFLET:
                var southWest = new L.latLng(thisMap.bounds.south, thisMap.bounds.west),
                northEast = new L.latLng(thisMap.bounds.north, thisMap.bounds.east);
                lb = new L.latLngBounds(southWest, northEast);

                return lb;
            }
        }
        return thisMap.bounds;
    };

    ns.Map.prototype.centroid = function (use_api, api_type) {
        /* Returns the centroid of the map's tile set
         *
         * Args:
         *   use_api - Boolean.  If true, return a mapping API point object
         *       If false, return a cdla.maps.Point object literal
         *   api_type - mapping api to use.  if not specified, default will be used.
         *       only applies if use_api is true
         */
        var GLL, pt, thisMap;

        // if use_api is not there, or not a boolean, then default to true
        if (typeof(use_api) !== "boolean") {
            use_api = true;
        }

        thisMap = ns._maps[this.map_id];

        if (use_api) {
            // if no api specified, use the default
            if (!api_type) {
                api_type = ns._apiType;
            }

            // verify the api is valid and present
            verifyApiType(api_type, true);

            // create the point object
            switch (api_type) {

            case ns.API_GOOGLE:
                // use the proper constuctors based on the detected api prefix
                if (ns._apiShortPrefix) {
                    GLL = GLatLng;
                }
                else {
                    GLL = google.maps.LatLng;
                }
                return new GLL(thisMap.centroid.lat, thisMap.centroid.lng);

            case ns.API_OPENLAYERS:
                pt = new OpenLayers.LonLat(thisMap.centroid.lng, thisMap.centroid.lat);
                // must transform from geographic lat/lng
                // to spherical mercator for google-like tiles
                pt.transform(new OpenLayers.Projection("EPSG:4326"),
                             new OpenLayers.Projection("EPSG:900913"));
                return pt;

            case ns.API_LEAFLET:
                pt = new L.latLng(thisMap.centroid.lat, thisMap.centroid.lng);
                return pt;
            }
        }
        return thisMap.centroid;
    };

    ns.Map.prototype.minZoom = function () {
        return ns._maps[this.map_id].min_zoom;
    };

    ns.Map.prototype.maxZoom = function () {
        return ns._maps[this.map_id].max_zoom;
    };



    ns.Map.prototype.layer = function (api_type, options) {
        /*  Creates the mapping API layer object
         *
         * Args:
         *   api_type - cdla.maps api type constant
         *       If not specfied, the default will be used
         *   options - object literal containing additional layer options
         *             to pass to the API constructor
         *
         * Returns:
         *   a map layer object for the requested api type
         */

        var GCrC, GCr, GTL, GTLO, crc, tl_options, tlo_options, layer_bounds, getUrl, resolutions, zl;

        // if no api specified, use the default
        if (!api_type) {
            api_type = ns._apiType;
        }
        // verify the api is valid and present
        verifyApiType(api_type, true);

        // make sure options is an object literal
        if (!options || options.constructor !== Object) {
            options = {};
        }

        // check to see if we've already built the object
        if (this.layer_obj[api_type]) {
            return this.layer_obj[api_type];
        }

        // build the layer object
        switch (api_type) {

        case ns.API_GOOGLE:
            // use the proper constuctors based on the detected api prefix
            if (ns._apiShortPrefix) {
                GCrC = GCopyrightCollection;
                GCr = GCopyright;
                GTL = GTileLayer;
                GTLO = GTileLayerOverlay;
            }
            else {
                GCrC = google.maps.CopyrightCollection;
                GCr = google.maps.Copyright;
                GTL = google.maps.TileLayer;
                GTLO = google.maps.TileLayerOverlay;
            }

            crc = new GCrC("DH Press Map Layer");
            // crc.addCopyright(
            //     new GCr(
            //         1,
            //         this.bounds(true, api_type),
            //         ns._maps[this.map_id].min_zoom,
            //         "CDLA, UNC-Chapel Hill"
            //     )
            // );
            tl_options = {};
            tlo_options = {};
            // check user options for tilelayer options
            if (options.opacity) {
                tl_options.opacity = options.opacity;
            }
            if (options.draggingCursor) {
                tl_options.draggingCursor = options.draggingCursor;
            }
            // check user options for tilelayeroverlay options
            if (options.zPriority) {
                tlo_options.zPriority = options.zPriority;
            }
            // add needed options
            tl_options.isPng = true;
            tl_options.tileUrlTemplate = ns._maps[this.map_id].tile_url;
            this.layer_obj[api_type] = new GTLO(
                new GTL(
                    crc,
                    ns._maps[this.map_id].min_zoom,
                    ns._maps[this.map_id].max_zoom,
                    tl_options
                ),
                tlo_options
            );
            return this.layer_obj[api_type];

        case ns.API_OPENLAYERS:
            layer_bounds = this.bounds(true, api_type);
            getUrl = function (bounds) {
                /* Builds the url for the map tile showing the requested bounds */
                var res, x, y, z, url;

                // check if requested bounds is within the bounds of the tile set
                // TO DO:  Change this blank tile file to other source?
                // if (!layer_bounds.intersectsBounds(bounds)) {
                //     return "http://docsouth.unc.edu/cdlamaps/static/maps/blanktile.png";
                // }

                // calculate the google-like tile coordinates
                res = this.map.getResolution();
                x = Math.round((bounds.left - this.maxExtent.left) /
                               (res * this.tileSize.w));
                y = Math.round((this.maxExtent.top - bounds.top) /
                               (res * this.tileSize.h));
                z = this.map.getZoom();

                // replace the coordinate placeholders in the url pattern
                // with the actual values
                url = this.url;
                url = url.replace(/\{X\}/, x);
                url = url.replace(/\{Y\}/, y);
                url = url.replace(/\{Z\}/, z);
                return url;
            };
            // build the list of resolutions tiles are available for
            resolutions = [];
            for (zl = ns._maps[this.map_id].min_zoom;
                 zl <= ns._maps[this.map_id].max_zoom + 1; zl++) {
                resolutions.push(20037508.34 * 2 / 256 / Math.pow(2, zl));
            }
            options.type = 'png';
            options.getURL = getUrl;
            options.isBaseLayer = false;
            options.resolutions = resolutions;
            options.serverResolutions = resolutions.slice();
            options.numZoomLevels = null;
            options.attribution = "Layer created with DH Press";
            this.layer_obj[api_type] = new OpenLayers.Layer.TMS(
                ns._maps[this.map_id].title,
                ns._maps[this.map_id].tile_url,
                options
            );
            return this.layer_obj[api_type];

        case ns.API_LEAFLET:
            layer_bounds = this.bounds(true, api_type);

            getTileUrl = function (tilePoint) {
                // Builds the url for the map tile showing the requested bounds 
                // tilePoint.y has an incorrect value. this._tiles contains the correct numbers. 
                // Stored as keys in _tiles object, last one in returns.
                var xyKey = Object.keys(this._tiles)[Object.keys(this._tiles).length - 1]
                // stored as key in _tiles. format: X:Y. 
                // tilePoint.x seems more accurate than xySplit[0](less not found tiles)
                var xySplit = xyKey.split(':');
                // replace the coordinate placeholders in the url pattern
                // with the actual values
                url = this._url;
                url = url.replace(/\{X\}/, tilePoint.x);
                url = url.replace(/\{Y\}/, xySplit[1]);
                url = url.replace(/\{Z\}/, tilePoint.z);

                return url;
            };
                // set options
            options.type = 'png';
            options.bounds = layer_bounds;
            options.tms = true;
            options.isBaseLayer = false;
            options.layerName = ns._maps[this.map_id].title;
            options.minZoom = ns._maps[this.map_id].min_zoom;
            options.maxZoom = ns._maps[this.map_id].max_zoom;
            // options.attribution = "Layer created with DH Press";
                // create layer
            this.layer_obj[api_type] = new L.TileLayer(ns._maps[this.map_id].tile_url, options );
            this.layer_obj[api_type].getTileUrl = getTileUrl; // custom tile handler for cdla layers
            
            return this.layer_obj[api_type];
        }
    };



    /**************************/
    /*    Helper functions    */
    /**************************/

    verifyApiType = function (api_type, is_present) {
        /* determine if api_type matches a valid api type constant
         *
         * Arg:
         *   api_type - the api type to check
         *   is_present - boolean.  if true, then verify the api type can be found
         *       default value is false
         */
        var a, valid = false;

        if (typeof(is_present) !== "boolean") {
            is_present = false;
        }

        for (a in _apis) {
            if (api_type === _apis[a]) {
                valid = true;
                break;
            }
        }

        if (!valid) {
            throw "dhpCustomMaps error: Unknown API Type";
        }

        if (is_present) {
            // check for presence of the mapping API
            switch (api_type) {

            case ns.API_GOOGLE:
                // check both google maps API prefixes
                if (window.GMap2) {
                    ns._apiShortPrefix = true;
                }
                else if (window.google.maps.Map2) {
                    ns._apiShortPrefix = false;
                }
                else {
                    throw "dhpCustomMaps error: Google Maps API not found";
                }
                break;

            case ns.API_OPENLAYERS:
                if (!window.OpenLayers) {
                    throw "dhpCustomMaps error: OpenLayers API not found";
                }
                break;

            case ns.API_LEAFLET:
                if (!window.L) {
                    throw "dhpCustomMaps error: Leaflet API not found";
                }
                break;
            }
        }
    };

    verifyMapId = function (map_id) {
        /*
         * Checks to see if the map_id matches a known map in the loaded data
         * Throws an error if it is not
         */
        if (map_id.constructor !== String) {
            throw "dhpCustomMaps error: MAP_ID is not a String.";
        }

        if (!ns._maps[map_id]) {
            throw "dhpCustomMaps error: Unknown Map ID - \n\tMap '" + map_id +
                  "' has not been loaded or it does not exist.";
        }
    };

}());