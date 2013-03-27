/* Copyright (c) 2009 Kevin M. Eckhardt
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

(function () {

    var ns, _apis, verifyApiType, verifyMapId;

    // setup the api namespace
    if (!window.cdla) {
        window.cdla = {};
    }
    if (!window.cdla.maps) {
        window.cdla.maps = {};
    }

    // short name for the namespace
    ns = window.cdla.maps;


    /****************************/
    /*    API type constants    */
    /****************************/

    ns.API_GOOGLE = 1;
    ns.API_OPENLAYERS = 2;

    _apis = [ns.API_GOOGLE, ns.API_OPENLAYERS];

    // Google Maps can use either a short namespace prefix 'G'
    // or a long one 'google.maps.'
    ns._apiShortPrefix = true;

    // set the initial default API type
    if (!ns._apiType) {
        ns._apiType = ns.API_GOOGLE;
    }


    /*************************/
    /*    Library methods    */
    /*************************/

    ns.defaultAPI = function (api_type) {
        /* Set / return the default mapping API type
         *
         * Args:
         *   api_type - cdla.maps API type constant
         *
         * Returns:
         *   the current (or new) default api type constant
         */
        if (!api_type) {
            return ns._apiType;
        }
        verifyApiType(api_type);
        ns._apiType = api_type;
        return ns._apiType;
    };


    /********************/
    /*    Map object    */
    /********************/

    ns.Map = function (map_id) {
        /*  Constructor
         *
         * Args:
         *   map_id - String.  Map ID for the requested resource
         */
        if (map_id.constructor !== String) {
            throw "cdla.maps error: map_id should be a String.";
        }
        map_id = map_id.toUpperCase();
        verifyMapId(map_id);

        this.map_id = map_id; // Store the map id to access the metadata
        this.layer_obj = {}; // storage for map layer objects
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

    ns.Map.prototype.bounds = function (use_api, api_type) {
        /* Returns the bounds of the map's tile set
         *
         * Args:
         *   use_api - Boolean.  If true, return a mapping API bounds object
         *       If false, return a cdla.maps.Bounds object literal
         *       Default value is true
         *   api_type - mapping api to use.  if not specified, default will be used.
         *       only applies if use_api is true
         */
        var GLLB, GLL, lb;

        // if use_api is not there, or not a boolean, then default to true
        if (typeof(use_api) !== "boolean") {
            use_api = true;
        }

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
                    new GLL(ns._maps[this.map_id].bounds.south,
                                ns._maps[this.map_id].bounds.west),
                    new GLL(ns._maps[this.map_id].bounds.north,
                                ns._maps[this.map_id].bounds.east)
                );

            case ns.API_OPENLAYERS:
                lb = new OpenLayers.Bounds(ns._maps[this.map_id].bounds.west,
                    ns._maps[this.map_id].bounds.south,
                    ns._maps[this.map_id].bounds.east,
                    ns._maps[this.map_id].bounds.north
                );
                // must transform bounds from geographic lat/lng
                // to spherical mercator for google-like tiles
                lb.transform(new OpenLayers.Projection("EPSG:4326"),
                             new OpenLayers.Projection("EPSG:900913"));
                return lb;
            }
        }
        return ns._maps[this.map_id].bounds;
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
        var GLL, pt;

        // if use_api is not there, or not a boolean, then default to true
        if (typeof(use_api) !== "boolean") {
            use_api = true;
        }

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
                return new GLL(ns._maps[this.map_id].centroid.lat,
                                   ns._maps[this.map_id].centroid.lng);

            case ns.API_OPENLAYERS:
                pt = new OpenLayers.LonLat(ns._maps[this.map_id].centroid.lng,
                                       ns._maps[this.map_id].centroid.lat);
                // must transform from geographic lat/lng
                // to spherical mercator for google-like tiles
                pt.transform(new OpenLayers.Projection("EPSG:4326"),
                             new OpenLayers.Projection("EPSG:900913"));
                return pt;
            }
        }
        return ns._maps[this.map_id].centroid;
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

            crc = new GCrC("Layer created by");
            crc.addCopyright(
                new GCr(
                    1,
                    this.bounds(true, api_type),
                    ns._maps[this.map_id].min_zoom,
                    "CDLA, UNC-Chapel Hill"
                )
            );
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
                if (!layer_bounds.intersectsBounds(bounds)) {
                    return "http://docsouth.unc.edu/cdlamaps/static/maps/blanktile.png";
                }

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
            options.attribution = "Layer created by <a href='http://cdla.unc.edu'>CDLA, UNC-Chapel Hill</a>";
            this.layer_obj[api_type] = new OpenLayers.Layer.TMS(
                ns._maps[this.map_id].title,
                ns._maps[this.map_id].tile_url,
                options
            );
            return this.layer_obj[api_type];
        }
    };


    /***********************/
    /*    MapSet object    */
    /***********************/

    ns.MapSet = function (map_ids) {
        /*  Constructor
         *
         * Args:
         *   map_ids - Array<String>.  List of Map or Map Set IDs
         */
        var mid, msid;
        this.map_ids = []; // storage for map ids
        this.map_obj = {}; // storage for Map objects

        if (map_ids.constructor !== Array) {
            throw "cdla.maps error: map_ids should be an Array.";
        }

        // expand any map set ids into their component maps
        for (mid = 0; mid < map_ids.length; mid++) {
            if (map_ids[mid].constructor !== String) {
                throw "cdla.maps error: map_ids should only contain Strings.";
            }
            map_ids[mid] = map_ids[mid].toUpperCase();
            if (ns._mapsets[map_ids[mid]]) {
                for (msid = 0; msid < ns._mapsets[map_ids[mid]].maps.length; msid++) {
                    this.map_ids.push(ns._mapsets[map_ids[mid]].maps[msid]);
                }
            }
            else {
                this.map_ids.push(map_ids[mid]);
            }
        }

        // create the Map objects
        for (mid = 0; mid < this.map_ids.length; mid++) {
            this.map_obj[this.map_ids[mid]] = new ns.Map(this.map_ids[mid]);
        }
    };


    ns.MapSet.prototype.count = function () {
        return this.map_ids.length;
    };

    ns.MapSet.prototype.bounds = function (use_api, api_type) {
        /* Returns the aggregate bounds of the map tile sets
         *
         * Args:
         *   use_api - Boolean.  If true, return a mapping API bounds object
         *       If false, return a cdla.maps.Bounds object literal
         *   api_type - mapping api to use.  if not specified, default will be used.
         *       only applies if use_api is true
         */
        var GLLB, GLL, lb, mid, bounds, north = null, south = null, east = null, west = null;

        // if use_api is not there, or not a boolean, then default to true
        if (typeof(use_api) !== "boolean") {
            use_api = true;
        }

        // calculate the bounds
        for (mid = 0; mid < this.map_ids.length; mid++) {
            bounds = this.map_obj[this.map_ids[mid]].bounds(false);
            north = (north === null ? bounds.north : Math.max(north, bounds.north));
            south = (south === null ? bounds.south : Math.min(south, bounds.south));
            east = (east === null ? bounds.east : Math.max(east, bounds.east));
            west = (west === null ? bounds.west : Math.min(west, bounds.west));
        }

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
                    new GLL(south, west),
                    new GLL(north, east)
                );

            case ns.API_OPENLAYERS:
                lb = new OpenLayers.Bounds(west, south, east, north);
                // must transform bounds from geographic lat/lng
                // to spherical mercator for google-like tiles
                lb.transform(new OpenLayers.Projection("EPSG:4326"),
                             new OpenLayers.Projection("EPSG:900913"));
                return lb;
            }
        }
        return {north: north, south: south, east: east, west: west};
    };

    ns.MapSet.prototype.centroid = function (use_api, api_type) {
        /* Returns the centroid of the aggregate bounds of th map tile sets
         *
         * Args:
         *   use_api - Boolean.  If true, return a mapping API point object
         *       If false, return a cdla.maps.Point object literal
         *   api_type - mapping api to use.  if not specified, default will be used.
         *       only applies if use_api is true
         */
        var GLL, pt, bounds, lat, lng;

        // if use_api is not there, or not a boolean, then default to true
        if (typeof(use_api) !== "boolean") {
            use_api = true;
        }

        // calculate the centroid
        bounds = this.bounds(false);
        lat = (bounds.north + bounds.south) / 2;
        lng = (bounds.east + bounds.west) / 2;

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
                return new GLL(lat, lng);

            case ns.API_OPENLAYERS:
                pt = new OpenLayers.LonLat(lng, lat);
                // must transform from geographic lat/lng
                // to spherical mercator for google-like tiles
                pt.transform(new OpenLayers.Projection("EPSG:4326"),
                             new OpenLayers.Projection("EPSG:900913"));
                return pt;
            }
        }
        return {lat: lat, lng: lng};
    };

    ns.MapSet.prototype.minZoom = function () {
        var min_zoom = null, mid;

        // calculate the minimum zoom
        for (mid = 0; mid < this.map_ids.length; mid++) {
            if (min_zoom === null) {
                min_zoom = this.map_obj[this.map_ids[mid]].minZoom();
            }
            else {
                min_zoom = Math.min(min_zoom, this.map_obj[this.map_ids[mid]].minZoom());
            }
        }
        return min_zoom;
    };

    ns.MapSet.prototype.maxZoom = function () {
        var max_zoom = null, mid;

        // calculate the maximum zoom
        for (mid = 0; mid < this.map_ids.length; mid++) {
            if (max_zoom === null) {
                max_zoom = this.map_obj[this.map_ids[mid]].maxZoom();
            }
            else {
                max_zoom = Math.min(max_zoom, this.map_obj[this.map_ids[mid]].maxZoom());
            }
        }
        return max_zoom;
    };

    ns.MapSet.prototype.mapIds = function () {
        // return a copy of the map_ids array
        return this.map_ids.slice();
    };

    ns.MapSet.prototype.maps = function () {
        // return a copy of the map_objs object
        var mid, maps = {};
        for (mid = 0; mid < this.map_ids.length; mid++) {
            maps[this.map_ids[mid]] = this.map_obj[this.map_ids[mid]];
        }
        return maps;
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
            throw "cdla.maps error: Unknown API Type";
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
                    throw "cdla.maps error: Google Maps API not found";
                }
                break;

            case ns.API_OPENLAYERS:
                if (!window.OpenLayers) {
                    throw "cdla.maps error: OpenLayers API not found";
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
            throw "cdla.maps error: MAP_ID is not a String.";
        }

        if (ns._mapsets[map_id]) {
            throw "cdla.maps error: Invalid Map ID - \n\t'" + map_id + "' is a Map Set ID.";
        }

        if (!ns._maps[map_id]) {
            throw "cdla.maps error: Unknown Map ID - \n\tMap '" + map_id +
                  "' has not been loaded or it does not exist.";
        }
    };

}());