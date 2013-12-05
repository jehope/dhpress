<?php
/**
     * Registers and handles diPH Map Library functions
     *
     * @package diPH Toolkit
     * @author diPH Team
     * @link http://dhpress.org/download/
     */
     
global $cdlamapid;

// ============================== Init Functions ============================

add_action( 'init', 'dhp_mapset_init' );

// dhp_mapset_init()
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

    // Add new taxonomy, NOT hierarchical
// function mapset_init()
// {
//   $labels = array(
//     'name' => _x( 'Mapsets', 'taxonomy general name' ),
//     'singular_name' => _x( 'Mapset', 'taxonomy singular name' ),
//     'all_items' => __( 'All Mapsets' ),
//     'parent_item' => null,
//     'parent_item_colon' => null,
//     'edit_item' => __( 'Edit Mapset' ), 
//     'update_item' => __( 'Update Mapset' ),
//     'add_new_item' => __( 'Add New Mapset' ),
//     'new_item_name' => __( 'New Mapset Name' ),
//     'add_or_remove_items' => __( 'Add or remove mapsets' ),
//     'menu_name' => __( 'Mapsets' ),
//   ); 

//   register_taxonomy('mapset','dhp-maps',array(
//     'hierarchical' => true,
//     'labels' => $labels,
//     'show_ui' => true,
//     'update_count_callback' => '_update_post_term_count',
//     'query_var' => true,
//     'rewrite' => array( 'slug' => 'mapsets' ),
//   ));
    
// }
//add_action( 'init', 'mapset_init' );


add_action( 'admin_enqueue_scripts', 'add_dhp_map_library_scripts', 10, 1 );

// add_dhp_map_library_scripts( $hook )
// Custom scripts to be run on Project new/edit pages only
// PURPOSE: Prepare CSS and JS files for all page types in WP
// INPUT:   $hook = name of template file being loaded
// ASSUMES: Other WP global variables for current page are set

function add_dhp_map_library_scripts( $hook )
{
    global $post;

    if ( $hook == 'edit.php'|| $hook == 'post-new.php' || $hook == 'post.php' ) {
        if ( 'dhp-maps' === $post->post_type ) {     
            //wp_register_style( 'ol-style', plugins_url('/js/OpenLayers/theme/default/style.css',  dirname(__FILE__) ));
            wp_enqueue_style( 'ol-map', plugins_url('/css/ol-map.css',  dirname(__FILE__) ));
            wp_enqueue_script(  'jquery' );
             //wp_enqueue_script(  'open-layers', plugins_url('/js/OpenLayers/OpenLayers.js', dirname(__FILE__) ));
             wp_enqueue_script(  'dhp-map-library-script', plugins_url('/js/dhp-map-library-admin.js', dirname(__FILE__) ));
             wp_enqueue_style('thickbox');
            wp_enqueue_script('thickbox');
        }
    }
} // dd_dhp_map_library_scripts()


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

// show_dhp_map_settings_box()
// PURPOSE: Handle creating HTML to show/edit custom fields specific to Map marker
// ASSUMES: $post global is set to the Map post we are currently looking at
// TO DO:   Must be more efficient means of selecting option

function show_dhp_map_settings_box()
{
    global $post;

    // Setup nonce
    echo '<input type="hidden" name="dhp_map_settings_box_nonce" value="'.wp_create_nonce(basename(__FILE__)).'" />';
    $dhp_map_desc = get_post_meta($post->ID, 'dhp_map_desc',true);
    $dhp_map_typeid = get_post_meta($post->ID, 'dhp_map_typeid',true);
    
    $dhp_map_url = get_post_meta($post->ID, 'dhp_map_url',true);  
    $dhp_map_type = get_post_meta($post->ID, 'dhp_map_type',true);
    if($dhp_map_type == 'WMS'){
        $selectWMS = 'selected';
    }else if($dhp_map_type == 'KML'){
        $selectKML = 'selected';
    }else if($dhp_map_type == 'CDLA'){
        $selectCDLA = 'selected';
    }else if($dhp_map_type == 'Google'){
        $selectGoogle = 'selected';
    }else if($dhp_map_type == 'OSM'){
        $selectOSM = 'selected';
    }
    else if($dhp_map_type == 'TMS'){
        $selectTMS = 'selected';
    }
    else{
        $selectType = 'selected';
    }
    $dhp_map_category = get_post_meta($post->ID, 'dhp_map_category',true);
    if($dhp_map_category == 'base layer'){
        $selectBaseLayer = 'selected';
    }else if($dhp_map_category == 'overlay'){
        $selectOverlay = 'selected';
    }else{
        $selectCategory = 'selected';
    }

        // Fetch all custom fields for this Map
    $dhp_map_source = get_post_meta($post->ID, 'dhp_map_source',true);
    $dhp_map_creator = get_post_meta($post->ID, 'dhp_map_creator',true);
    $dhp_map_classification = get_post_meta( $post->ID, 'dhp_map_classification', true );
    $dhp_map_state = get_post_meta( $post->ID, 'dhp_map_state', true );
    $dhp_map_county = get_post_meta( $post->ID, 'dhp_map_county', true );
    $dhp_map_city = get_post_meta( $post->ID, 'dhp_map_city', true );
    $dhp_map_year = get_post_meta( $post->ID, 'dhp_map_year', true );
    
    echo '<table>';
    echo '<tr><td colspan=2><label>Please enter the map information below:</label></td></tr>';
    echo '<tr><td colspan=2><label>* means required attribute for CDLA Maps</label></td></tr>';
    echo '<tr><td align=right>Description:</td><td><input name="dhp_map_desc" id="dhp_map_desc" type="text" size="60" value="'.$dhp_map_desc.'"/></td></tr>';
    echo '<tr><td align=right>*Map TypeID:</td><td><input name="dhp_map_typeid" id="dhp_map_typeid" type="text" size="60" value="'.$dhp_map_typeid.'"/></td></tr>';
    echo '<tr><td align=right>URL:</td><td><input name="dhp_map_url" id="dhp_map_url" type="text" size="30" value="'.$dhp_map_url.'"/></td></tr>';
    echo '<tr><td align=right>*Type:</td><td><select name="dhp_map_type" id="dhp_map_type"><option value="" '.$selectType.'>Please select a type</option><option value="WMS" '.$selectWMS.' disabled>WMS</option><option value="KML"  '.$selectKML.' >KML</option><option value="CDLA"  '.$selectCDLA.'>CDLA</option><option value="OSM"  '.$selectOSM.'>OSM</option><option value="OSM"  '.$selectTMS.'>TMS</option><option value="Google"  '.$selectGoogle.'>Google</option></select></td></tr>';
    echo '<tr><td align=right>*Category:</td><td><select name="dhp_map_category" id="dhp_map_category"><option value="" '.$selectCategory.'>Please select a category</option><option value="base layer" '.$selectBaseLayer.'>Base Layer</option><option value="overlay" '.$selectOverlay.' >Overlay</option></select></td></tr>';
    echo '<tr><td align=right>Classification:</td><td><input name="dhp_map_classification" id="dhp_map_classification" type="text" size="30" value="'.$dhp_map_classification.'"/></td></tr>';
    echo '<tr><td align=right>State:</td><td><input name="dhp_map_state" id="dhp_map_state" type="text" size="30" value="'.$dhp_map_state.'"/></td></tr>';
    echo '<tr><td align=right>County:</td><td><input name="dhp_map_county" id="dhp_map_county" type="text" size="30" value="'.$dhp_map_county.'"/></td></tr>';
    echo '<tr><td align=right>City:</td><td><input name="dhp_map_city" id="dhp_map_city" type="text" size="30" value="'.$dhp_map_city.'"/></td></tr>';
    echo '<tr><td align=right>Year:</td><td><input name="dhp_map_year" id="dhp_map_year" type="text" size="30" value="'.$dhp_map_year.'"/></td></tr>';
    echo '<tr><td align=right>Source:</td><td><input name="dhp_map_source" id="dhp_map_source" type="text" size="30" value="'.$dhp_map_source.'"/></td></tr>';
    echo '<tr><td align=right>Creator:</td><td><input name="dhp_map_creator" id="dhp_map_creator" type="text" size="30" value="'.$dhp_map_creator.'"/></td></tr>';
    echo '</table>';
} // show_dhp_map_settings_box()


add_action('save_post', 'save_dhp_map_settings');  

// save_dhp_map_settings($post_id)
// PURPOSE: Handle saving values from UI edit boxes into Map post
// INPUT:   $post_id = ID of Map marker

function save_dhp_map_settings($post_id)
{    
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
    
    update_post_meta($post_id, 'dhp_map_desc',$_POST['dhp_map_desc']);
    update_post_meta($post_id, 'dhp_map_typeid',$_POST['dhp_map_typeid']);
    update_post_meta($post_id, 'dhp_map_url',$_POST['dhp_map_url']);
    update_post_meta($post_id, 'dhp_map_type',$_POST['dhp_map_type']);
    update_post_meta($post_id, 'dhp_map_category',$_POST['dhp_map_category']);
    update_post_meta($post_id, 'dhp_map_source',$_POST['dhp_map_source']);
    update_post_meta($post_id, 'dhp_map_creator',$_POST['dhp_map_creator']);
} // save_dhp_map_settings()


add_filter( 'single_template', 'dhp_map_page_template' );

// dhp_map_page_template( $page_template )
// PURPOSE: Handle setting template to be used for Map type
// INPUT:   $page_template = default name of template file
// RETURNS: Modified name of template file
// ASSUMES: $post global is set to current page post to display

function dhp_map_page_template( $page_template )
{
    global $post;
    
    $cdlamapid = get_post_meta($post->ID, 'dhp_map_typeid',true);
    $post_type = get_query_var('post_type');
    if ( $post_type == 'dhp-maps' ) {
        $page_template = dirname( __FILE__ ) . '/dhp-map-template.php';

        wp_register_script(
                'cdlaMaps',
                'http://docsouth.unc.edu/cdlamaps/api/OASIS',
                array( 'open-layers' ),
                false,
                true
            );  
        
        wp_enqueue_style( 'ol-map', plugins_url('/css/ol-map.css',  dirname(__FILE__) ));
            
        wp_enqueue_script('jquery');
        wp_enqueue_script('backbone');
        wp_enqueue_script('underscore');

        wp_enqueue_script( 'open-layers', plugins_url('/js/OpenLayers/OpenLayers.js', dirname(__FILE__) ));
        //wp_enqueue_script( 'dhp-public-map-script', plugins_url('/js/dhp-map-page.js', dirname(__FILE__) ));
        wp_enqueue_script( 'dhp-public-map-script', plugins_url('/js/dhp-map-page.js', dirname(__FILE__) ));
        wp_enqueue_script( 'cdlaMaps' );
        wp_enqueue_script( 'dhp-google-map-script', 'http'. ( is_ssl() ? 's' : '' ) .'://maps.google.com/maps/api/js?v=3&amp;sensor=false');
        //$dhp_map_cdlaid = get_post_meta($post->ID, 'dhp_map_cdlaid',true);

        wp_enqueue_script( 'cdla-map-script', 'http://docsouth.unc.edu/cdlamaps/api/mapdata/OASIS/'.$cdlamapid);
        wp_enqueue_style('thickbox');
        wp_enqueue_script('thickbox');
    }
    return $page_template;
} // dhp_map_page_template()


// dhp_maps_filter_restrict_manage_posts()
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
                        'CDLA' => 'CDLA',
                        'KML' => 'KML',
                        'Google' => 'Google'
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

// dhp_maps_filter($query)
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
    if ( 'dhp-maps' == $type && is_admin() && $pagenow=='edit.php' && isset($_GET['dhp_map_type']) && $_GET['dhp_map_type'] != '') {
        $query->query_vars['meta_key'] = 'dhp_map_type';
        $query->query_vars['meta_value'] = $_GET['dhp_map_type'];
    }
} // dhp_maps_filter()


add_filter('manage_posts_columns', 'add_dhp_maps_columns');

// add_dhp_maps_columns($defaults)
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


add_action('manage_posts_custom_column', 'dhp_maps_custom_column', 10, 2);

// dhp_maps_custom_column($name, $post_id)
// PURPOSE: Output text to display custom column value for Map in admin panel
// INPUT:   $name = name key for column (name of field)
//          $post_id = ID of Map post
// SIDE-FX: Outputs the name of name of project or category
// TO DO:   Would be much simpler and more efficient if key for column was custom post name and could use for
//              get_post_meta call

function dhp_maps_custom_column($name, $post_id)
{
    global $post;

    $post_type = get_query_var('post_type');
    if ( $post_type == 'dhp-maps' ){
        $meta_type = get_post_meta( $post_id, 'dhp_map_type', true );
        $meta_category = get_post_meta( $post_id, 'dhp_map_category', true );
        $meta_classification = get_post_meta( $post_id, 'dhp_map_classification', true );
        $meta_state = get_post_meta( $post_id, 'dhp_map_state', true );
        $meta_county = get_post_meta( $post_id, 'dhp_map_county', true );
        $meta_city = get_post_meta( $post_id, 'dhp_map_city', true );
        $meta_year = get_post_meta( $post_id, 'dhp_map_year', true );
        switch ($name)
        {
            case 'types':
                echo $meta_type;
                break;
            case 'category':
                echo $meta_category;
                break;
            case 'classification':
                echo $meta_classification;
                break;
            case 'state':
                echo $meta_state;
                break;
            case 'county':
                echo $meta_county;
                break;
            case 'city':
                echo $meta_city;
                break;
            case 'year':
                echo $meta_year;
                break;
        }
    }
} // dhp_maps_custom_column()

?>