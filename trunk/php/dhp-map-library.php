<?php
/**
     * Registers and handles diPH Map Library functions
     *
     * @package diPH Toolkit
     * @author diPH Team
     * @link http://dhpress.org/download/
     */
     
// Add new taxonomy for mapsets
global $cdlamapid;
function dhp_mapset_init() {
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
add_action( 'init', 'dhp_mapset_init' );


function mapset_init() {
    // Add new taxonomy, NOT hierarchical (like tags)
  $labels = array(
    'name' => _x( 'Mapsets', 'taxonomy general name' ),
    'singular_name' => _x( 'Mapset', 'taxonomy singular name' ),
    'all_items' => __( 'All Mapsets' ),
    'parent_item' => null,
    'parent_item_colon' => null,
    'edit_item' => __( 'Edit Mapset' ), 
    'update_item' => __( 'Update Mapset' ),
    'add_new_item' => __( 'Add New Mapset' ),
    'new_item_name' => __( 'New Mapset Name' ),
    'add_or_remove_items' => __( 'Add or remove mapsets' ),
    'menu_name' => __( 'Mapsets' ),
  ); 

  register_taxonomy('mapset','dhp-maps',array(
    'hierarchical' => true,
    'labels' => $labels,
    'show_ui' => true,
    'update_count_callback' => '_update_post_term_count',
    'query_var' => true,
    'rewrite' => array( 'slug' => 'mapsets' ),
  ));
    
}
//add_action( 'init', 'mapset_init' );


// Custom scripts to be run on Project new/edit pages only
function add_dhp_map_library_scripts( $hook ) {

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
}
add_action( 'admin_enqueue_scripts', 'add_dhp_map_library_scripts', 10, 1 );

// Add the Meta Box for map attributes
function add_dhp_map_settings_box() {
    add_meta_box(
        'dhp_map_settings_meta_box',       // $id
        'Map Attributes',                       // $title
        'show_dhp_map_settings_box',       // $callback
        'dhp-maps',                        // $page
        'normal',                               // $context
        'high');                                // $priority
}
add_action('add_meta_boxes', 'add_dhp_map_settings_box');


// Callback function for dhp_map_settings_box
function show_dhp_map_settings_box() {
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
}

// Save the Data
function save_dhp_map_settings($post_id) {
    
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
    
}
add_action('save_post', 'save_dhp_map_settings');  


// Set template to be used for Map type
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
}
add_filter( 'single_template', 'dhp_map_page_template' );


//code for managing dhp-maps admin panel

function dhp_maps_filter_restrict_manage_posts(){
    $type = 'dhp-maps';
    if (isset($_GET['post_type'])) {
        $type = $_GET['post_type'];
    }
 
    //only add filter to post type you want
    if ('dhp-maps' == $type){
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
}
add_action( 'restrict_manage_posts', 'dhp_maps_filter_restrict_manage_posts' );

function dhp_maps_filter( $query ){
    global $pagenow;
    $type = 'dhp-maps';
    if (isset($_GET['post_type'])) {
        $type = $_GET['post_type'];
    }
    if ( 'dhp-maps' == $type && is_admin() && $pagenow=='edit.php' && isset($_GET['dhp_map_type']) && $_GET['dhp_map_type'] != '') {
        $query->query_vars['meta_key'] = 'dhp_map_type';
        $query->query_vars['meta_value'] = $_GET['dhp_map_type'];
    }
}
add_filter( 'parse_query', 'dhp_maps_filter' );

function add_dhp_maps_columns($defaults) {
    global $post;
    $post_type = get_query_var('post_type');
    if ( $post_type != 'dhp-maps' )
        return $defaults;
    unset($defaults['author']);
    unset($defaults['comments']);
    unset($defaults['date']);
    
    $defaults['types'] = __('Type');
    $defaults['category'] = __('Category');
    $defaults['classification'] = __('Classification');
    $defaults['state'] = __('State');
    $defaults['county'] = __('County');
    $defaults['city'] = __('City');
    $defaults['year'] = __('Year');
    $defaults['date'] = __('Date');
    
    return $defaults;
}
add_filter('manage_posts_columns', 'add_dhp_maps_columns');

function dhp_maps_custom_column($name, $post_id) {
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
}
add_action('manage_posts_custom_column', 'dhp_maps_custom_column', 10, 2);

?>