<?php
// PURPOSE: Handles DH Press custom maps (entering and editing of map data)
// NOTES:   In order for maps to be used by DH Press projects, there must be entries in the Maps Library, either
//              entered by hand or imported via CSV files
//          The following custom fields are required for all maps in the Map Library:
//              dhp_map_typeid      = unique ID for this map (String)
//              dhp_map_shortname   = a short title for map, does not need to be unique
//              dhp_map_category    = [ "base" | "overlay" ]
//              dhp_map_type        = [ "Blank" | DHP" | "WMS" | "KML" | "OSM" | "TMS" ]
//              dhp_map_url         = URL for map on map server
//              dhp_map_subdomains  = extra urls for tile server
//              dhp_map_n_bounds    = latitude of northern bounds of map/overlay
//              dhp_map_s_bounds    = latitude of southern bounds of map/overlay
//              dhp_map_e_bounds    = longitude of eastern bounds of map/overlay
//              dhp_map_w_bounds    = longitude of western bounds of map/overlay
//              dhp_map_min_zoom    = minimum zoom for map (Integer)
//              dhp_map_max_zoom    = maximum zoom for map (Integer)
//              dhp_map_cent_lat    = latitude of centroid
//              dhp_map_cent_lon    = longitude of centroid
//          The following custom fields are mostly for purposes of documenting and identifying maps:
//              dhp_map_desc
//              dhp_map_state
//              dhp_map_county
//              dhp_map_city
//              dhp_map_otherlocation
//              dhp_map_classification
//              dhp_map_year
//              dhp_map_source
//              dhp_map_creator

// The data from CDLA library copied into default DH Press library from files in the directory
//              http://docsouth.unc.edu/cdlamaps/api/mapdata/OASIS/

// Since maps are implemented with Leaflet, support for Google base maps has been removed

    // A list of all of the custom fields associated with Map post types
$dhp_map_custom_fields = array( 'dhp_map_typeid', 'dhp_map_shortname', 'dhp_map_category', 'dhp_map_type', 'dhp_map_url','dhp_map_subdomains',
                                'dhp_map_n_bounds', 'dhp_map_s_bounds', 'dhp_map_e_bounds', 'dhp_map_w_bounds',
                                'dhp_map_min_zoom', 'dhp_map_max_zoom', 'dhp_map_cent_lat', 'dhp_map_cent_lon',
                                'dhp_map_desc', 'dhp_map_state', 'dhp_map_county', 'dhp_map_city',
                                'dhp_map_otherlocation', 'dhp_map_classification', 'dhp_map_year', 'dhp_map_source', 'dhp_map_creator'
                            );


// ============================== Init Functions ============================

add_action( 'init', 'dhp_mapset_init' );

    // PURPOSE: Add new taxonomy for mapsets
function dhp_mapset_init()
{
  $labels = array(
    'name' => _x( 'Maps', 'taxonomy general name' ),
    'singular_name' => _x( 'Map', 'taxonomy singular name' ),
    'add_new' => __('Add New', 'dhp-maps'),
    'add_new_item' => __('Add New Map'),
    'edit_item' => __('Edit Map'),
    'new_item' => __('New Map'),
    'all_items' => __('Map Library'),
    'view_item' => __('View Map'),
     'search_items' => __('Search Maps'),
    'not_found' =>  __('No maps found'),
    'not_found_in_trash' => __('No maps found in Trash'), 
    'parent_item_colon' => '',
    'menu_name' => __('Map Library')
  ); 

  $args = array(
    'labels' => $labels,
    'public' => true,
    'publicly_queryable' => true,
    'show_ui' => true, 
    'show_in_menu' => 'dhp-top-level-handle', 
    'query_var' => true,
    'rewrite' => false,
    'capability_type' => 'post',
    'has_archive' => true, 
    'hierarchical' => false,
    'menu_position' => null,
    'supports' => array( 'title', 'author', 'excerpt', 'comments', 'revisions','custom-fields' )
//'supports' => array( 'title', 'editor', 'author', 'thumbnail', 'excerpt', 'comments', 'revisions','custom-fields' )
  );
  register_post_type('dhp-maps',$args);
}


add_action( 'admin_enqueue_scripts', 'add_dhp_map_library_scripts', 10, 1 );

    // PURPOSE: Prepare CSS and JS files for all page types in WP
    // INPUT:   $hook = name of template file being loaded
    // ASSUMES: Other WP global variables for current page are set
    // NOTES:   Custom scripts to be run on new/edit Map pages only (not view)
function add_dhp_map_library_scripts( $hook )
{
    global $post;

    if ( $hook == 'edit.php'|| $hook == 'post-new.php' || $hook == 'post.php' ) {
        if ( $post->post_type === 'dhp-maps' ) {
            wp_enqueue_script('jquery' );
            wp_enqueue_script('dhp-map-library-script', plugins_url('/js/dhp-map-library-admin.js', dirname(__FILE__) ));
        }
    }
} // add_dhp_map_library_scripts()


    // PURPOSE: Return all of the data in custom fields associated with a particular Map post
    // INPUT:   $postID = ID of the Map post
    //          $cfArray = array of names of custom fields
    // RETURNS: An associative array (hash) of values
function dhp_get_map_custom_fields($postID, $cfArray)
{
    $returnVals = array();

    foreach ($cfArray as $key) {
        $dataItem = get_post_meta($postID, $key, true);
        $returnVals[$key] = $dataItem;
    }
    return $returnVals;
} // dhp_get_map_custom_fields()


    // PURPOSE: Update the data in custom fields associated with a particular Map post from _POST[] vars
    // INPUT:   $postID = ID of the Map post
    //          $cfArray = array of names of custom fields to update
function dhp_update_map_from_post($postID, $cfArray)
{
    foreach ($cfArray as $key) {
        $dataItem = $_POST[$key];
        update_post_meta($postID, $key, $dataItem);
    }
} // dhp_update_map_from_post()


add_action('add_meta_boxes', 'add_dhp_map_settings_box');

// Add the Meta Box for map attributes
function add_dhp_map_settings_box()
{
    add_meta_box(
        'dhp_map_settings_meta_box',       // $id
        'Map Attributes',                  // title
        'show_dhp_map_settings_box',       // callback function name
        'dhp-maps',                        // post-type
        'normal',                          // $context
        'high');                           // $priority
}

    // PURPOSE: Handle creating HTML to show/edit custom fields specific to Map marker
    // ASSUMES: $post global is set to the Map post we are currently looking at
    // TO DO:   Must be more efficient means of selecting option
function show_dhp_map_settings_box()
{
    global $post, $dhp_map_custom_fields;

        // Setup nonce
    echo '<input type="hidden" name="dhp_map_settings_box_nonce" value="'.wp_create_nonce(basename(__FILE__)).'" />';

        // Fetch all custom fields for this Map
    $mapAttributes = dhp_get_map_custom_fields($post->ID, $dhp_map_custom_fields);

    switch($mapAttributes['dhp_map_type']) {
    case 'WMS':
        $selectWMS = 'selected';
        break;
    case 'Blank':
        $selectBlank = 'selected';
        break;
    case 'KML':
        $selectKML = 'selected';
        break;
    case 'DHP':
        $selectDHP = 'selected';
        break;
    // case 'Google':
    //     $selectGoogle = 'selected';
    //     break;
    case 'OSM':
        $selectOSM = 'selected';
        break;
    case 'TMS':
        $selectTMS = 'selected';
        break;
    default:
        $selectType = 'selected';
        break;
    }

    switch ($mapAttributes['dhp_map_category']) {
    case 'base layer':
        $selectBaseLayer = 'selected';
        break;
    case 'overlay':
        $selectOverlay = 'selected';
        break;
    default:
        $selectCategory = 'selected';
        break;
    }

    echo '<table>';
    echo '<tr><td colspan=2><label>Please enter the map information below:</label></td></tr>';
    echo '<tr><td colspan=2><label>* = required attribute for DHP Maps</label></td></tr>';
    echo '<tr><td align=right>*Map ID:</td><td><input name="dhp_map_typeid" id="dhp_map_typeid" type="text" size="60" value="'.$mapAttributes['dhp_map_typeid'].'"/></td></tr>';
    echo '<tr><td align=right>*Short title:</td><td><input name="dhp_map_shortname" id="dhp_map_shortname" type="text" size="60" value="'.$mapAttributes['dhp_map_shortname'].'"/></td></tr>';
    echo '<tr><td align=right>*URL:</td><td><input name="dhp_map_url" id="dhp_map_url" type="text" size="30" value="'.$mapAttributes['dhp_map_url'].'"/></td></tr>';
    echo '<tr><td align=right>Subdomains:</td><td><input name="dhp_map_subdomains" id="dhp_map_subdomains" type="text" size="30" value="'.$mapAttributes['dhp_map_subdomains'].'"/></td></tr>';
    echo '<tr><td align=right>*Type:</td><td><select name="dhp_map_type" id="dhp_map_type"><option value="" '.$selectType.'>Please select a type</option><option value="Blank" '.$selectBlank.'>Blank</option><option value="WMS" '.$selectWMS.' disabled>WMS</option><option value="KML" '.$selectKML.' >KML</option><option value="DHP" '.$selectDHP.'>Custom DHP</option><option value="OSM" '.$selectOSM.'>OSM</option><option value="OSM" '.$selectTMS.'>TMS</option></select></td></tr>';
    echo '<tr><td align=right>*Category:</td><td><select name="dhp_map_category" id="dhp_map_category"><option value="" '.$selectCategory.'>Please select a category</option><option value="base layer" '.$selectBaseLayer.'>Base Layer</option><option value="overlay" '.$selectOverlay.' >Overlay</option></select></td></tr>';

    echo '<tr><td align=right>*North bounds:</td><td><input name="dhp_map_n_bounds" id="dhp_map_n_bounds" type="text" size="10" value="'.$mapAttributes['dhp_map_n_bounds'].'"/></td></tr>';
    echo '<tr><td align=right>*South bounds:</td><td><input name="dhp_map_s_bounds" id="dhp_map_s_bounds" type="text" size="10" value="'.$mapAttributes['dhp_map_s_bounds'].'"/></td></tr>';
    echo '<tr><td align=right>*East bounds:</td><td><input name="dhp_map_e_bounds" id="dhp_map_e_bounds" type="text" size="10" value="'.$mapAttributes['dhp_map_e_bounds'].'"/></td></tr>';
    echo '<tr><td align=right>*West bounds:</td><td><input name="dhp_map_w_bounds" id="dhp_map_w_bounds" type="text" size="10" value="'.$mapAttributes['dhp_map_w_bounds'].'"/></td></tr>';

    echo '<tr><td align=right>*Latitude of Centroid:</td><td><input name="dhp_map_cent_lat" id="dhp_map_cent_lat" type="text" size="10" value="'.$mapAttributes['dhp_map_cent_lat'].'"/></td></tr>';
    echo '<tr><td align=right>*Longitude of Centroid:</td><td><input name="dhp_map_cent_lon" id="dhp_map_cent_lon" type="text" size="10" value="'.$mapAttributes['dhp_map_cent_lon'].'"/></td></tr>';
    echo '<tr><td align=right>*Minimum Zoom:</td><td><input name="dhp_map_min_zoom" id="dhp_map_min_zoom" type="text" size="2" value="'.$mapAttributes['dhp_map_min_zoom'].'"/></td></tr>';
    echo '<tr><td align=right>*Maximum Zoom:</td><td><input name="dhp_map_max_zoom" id="dhp_map_max_zoom" type="text" size="2" value="'.$mapAttributes['dhp_map_max_zoom'].'"/></td></tr>';

    echo '<tr><td align=right>Description:</td><td><input name="dhp_map_desc" id="dhp_map_desc" type="text" size="60" value="'.$mapAttributes['dhp_map_desc'].'"/></td></tr>';
    echo '<tr><td align=right>Classification:</td><td><input name="dhp_map_classification" id="dhp_map_classification" type="text" size="30" value="'.$mapAttributes['dhp_map_classification'].'"/></td></tr>';
    echo '<tr><td align=right>State:</td><td><input name="dhp_map_state" id="dhp_map_state" type="text" size="30" value="'.$mapAttributes['dhp_map_state'].'"/></td></tr>';
    echo '<tr><td align=right>County:</td><td><input name="dhp_map_county" id="dhp_map_county" type="text" size="30" value="'.$mapAttributes['dhp_map_county'].'"/></td></tr>';
    echo '<tr><td align=right>City:</td><td><input name="dhp_map_city" id="dhp_map_city" type="text" size="30" value="'.$mapAttributes['dhp_map_city'].'"/></td></tr>';
    echo '<tr><td align=right>Year:</td><td><input name="dhp_map_year" id="dhp_map_year" type="text" size="30" value="'.$mapAttributes['dhp_map_year'].'"/></td></tr>';
    echo '<tr><td align=right>Source:</td><td><input name="dhp_map_source" id="dhp_map_source" type="text" size="30" value="'.$mapAttributes['dhp_map_source'].'"/></td></tr>';
    echo '<tr><td align=right>Creator:</td><td><input name="dhp_map_creator" id="dhp_map_creator" type="text" size="30" value="'.$mapAttributes['dhp_map_creator'].'"/></td></tr>';
    echo '</table>';
} // show_dhp_map_settings_box()


add_action('save_post', 'save_dhp_map_settings');  

    // PURPOSE: Save values from UI edit boxes into Map post
    // INPUT:   $post_id = ID of Map marker
function save_dhp_map_settings($post_id)
{
    global $dhp_map_custom_fields;

    // verify nonce
    if (!wp_verify_nonce($_POST['dhp_map_settings_box_nonce'], basename(__FILE__)))
        return $post_id;
    // check autosave
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE)
        return $post_id;
    // check permissions
    if ('page' == $_POST['post_type']) {
        if (!current_user_can('edit_page', $post_id))
            return $post_id;
        } elseif (!current_user_can('edit_post', $post_id)) {
            return $post_id;
    }

    dhp_update_map_from_post($post_id, $dhp_map_custom_fields);
} // save_dhp_map_settings()


add_filter( 'single_template', 'dhp_map_page_template' );

// PURPOSE: Handle setting template to be used for Map type
// INPUT:   $page_template = default name of template file
// RETURNS: Modified name of template file
// ASSUMES: map template will pass Map post custom fields to JavaScript

function dhp_map_page_template( $page_template )
{
    global $post;

    $dhpMapID = get_post_meta($post->ID, 'dhp_map_typeid',true);
    $post_type = get_query_var('post_type');

    if ( $post_type == 'dhp-maps' ) {
        $page_template = dirname( __FILE__ ) . '/dhp-map-template.php';

        wp_enqueue_style('dhp-project-css', plugins_url('/css/dhp-project.css',  dirname(__FILE__)), '', DHP_PLUGIN_VERSION );
        wp_enqueue_style('dhp-map-css', plugins_url('/css/dhp-map.css',  dirname(__FILE__)), '', DHP_PLUGIN_VERSION );
        wp_enqueue_style('leaflet-css', plugins_url('/lib/leaflet-0.7.3/leaflet.css',  dirname(__FILE__)), '', DHP_PLUGIN_VERSION );

        wp_enqueue_script('jquery');
        wp_enqueue_script('underscore');

        wp_enqueue_script('dhp-google-map-script', 'http'. ( is_ssl() ? 's' : '' ) .'://maps.google.com/maps/api/js?v=3&amp;sensor=false');

        wp_enqueue_script('leaflet', plugins_url('/lib/leaflet-0.7.3/leaflet.js', dirname(__FILE__)));
        wp_enqueue_script('dhp-maps-view', plugins_url('/js/dhp-maps-view.js', dirname(__FILE__)), 'leaflet', DHP_PLUGIN_VERSION);
        wp_enqueue_script('dhp-custom-maps', plugins_url('/js/dhp-custom-maps.js', dirname(__FILE__)), 'leaflet', DHP_PLUGIN_VERSION);
        wp_enqueue_script('dhp-public-map-script', plugins_url('/js/dhp-map-page.js', dirname(__FILE__)), array('leaflet', 'dhp-custom-maps' ), DHP_PLUGIN_VERSION);
    }
    return $page_template;
} // dhp_map_page_template()


// PURPOSE: Create HTML code to create Drop-down list of Map-types to filter lists of Maps in admin Panel
// INPUT:   $_GET['post_type'] = custom post type
// SIDE-FX: Outputs HTML text for drop-down list

add_action( 'restrict_manage_posts', 'dhp_maps_filter_restrict_manage_posts' );

function dhp_maps_filter_restrict_manage_posts()
{
    $type = 'posts';
    if (isset($_GET['post_type'])) {
        $type = $_GET['post_type'];
    }
 
    //only add filter to post type you want
    if ('dhp-maps' == $type)
    {
        //change this to the list of values you want to show
        //in 'label' => 'value' format
        $values = array(
                        'DHP' => 'DHP',
                        'KML' => 'KML',
                        'Blank' => 'Blank'
                        // 'Google' => 'Google'
        );
        ?>
        <select name="dhp_map_type">
        <option value=""><?php _e('Filter By Map Type', 'acs'); ?></option>
        <?php
            $current_v = isset($_GET['dhp_map_type'])? $_GET['dhp_map_type']:'';
            foreach ($values as $label => $value) {
                printf
                    (
                        '<option value="%s"%s>%s</option>',
                        $value,
                        $value == $current_v? ' selected="selected"':'',
                        $label
                    );
                }
        ?>
        </select>
        <?php
    }
} // dhp_maps_filter_restrict_manage_posts()


add_filter( 'parse_query', 'dhp_maps_filter' );

// PURPOSE: Modify the query string (used to show list in Maps admin panel) according to UI selection
// INPUT:   $query = the array describing the query for Markers to display in panel
//          $_GET['post_type'] = post type of posts being displayed in admin panel
//          $_GET['dhp_map_type'] = ID of Project selected in option button
// ASSUMES: $pagenow global is set to file name of current page-wide template file

function dhp_maps_filter( $query )
{
    global $pagenow;

    $type = 'posts';
    if (isset($_GET['post_type'])) {
        $type = $_GET['post_type'];
    }
    if ( $type == 'dhp-maps' && is_admin() && $pagenow=='edit.php' && isset($_GET['dhp_map_type']) && $_GET['dhp_map_type'] != '') {
        $query->query_vars['meta_key'] = 'dhp_map_type';
        $query->query_vars['meta_value'] = $_GET['dhp_map_type'];
    }
} // dhp_maps_filter()


add_filter('manage_posts_columns', 'add_dhp_maps_columns');

// PURPOSE: Handle modifying array of columns to show when listing Maps in admin panel
// INPUT:   $defaults = hash/array of field names and labels for the columns to display
// RETURNS: Hash/array of column names with new columns added, some removed

function add_dhp_maps_columns($defaults)
{
    $post_type = get_query_var('post_type');
    if ( $post_type != 'dhp-maps' )
        return $defaults;

        // Remove unused columns
    unset($defaults['author']);
    unset($defaults['comments']);
    unset($defaults['date']);

        // Add special ones for Maps
    $defaults['types'] = __('Type');
    $defaults['category'] = __('Category');
    $defaults['classification'] = __('Classification');
    $defaults['state'] = __('State');
    $defaults['county'] = __('County');
    $defaults['city'] = __('City');
    $defaults['year'] = __('Year');
    $defaults['date'] = __('Date');

    return $defaults;
} // add_dhp_maps_columns()

    // columns to show in WP admin panel when looking at Map Library: name of column => name of custom field
$dhp_admin_map_cols = array("types"         => "dhp_map_type",          "category"   => "dhp_map_category",
                            "classification"=> "dhp_map_classification","state"      => "dhp_map_state",
                            "county"        => "dhp_map_county",        "city"       => "dhp_map_city",
                            "year"          => "dhp_map_year"
                         );

add_action('manage_posts_custom_column', 'dhp_maps_custom_column', 10, 2);

// PURPOSE: Output text to display custom column value for Map in admin panel
// INPUT:   $name = name key for column (name of field)
//          $post_id = ID of Map post
// SIDE-FX: Outputs the name of name of project or category
// TO DO:   Would be much simpler and more efficient if key for column was custom post name and could use for
//              get_post_meta call

function dhp_maps_custom_column($name, $post_id)
{
    global $post, $dhp_admin_map_cols;

    $post_type = get_query_var('post_type');
    if ( $post_type == 'dhp-maps' ) {

        $customField = $dhp_admin_map_cols[$name];
        $cfData      = get_post_meta( $post_id, $customField, true );
        echo $cfData;
    }
} // dhp_maps_custom_column()

?>
