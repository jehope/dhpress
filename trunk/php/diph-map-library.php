<?php
// Add new taxonomy for mapsets
function diph_mapset_init() {
  $labels = array(
    'name' => _x( 'Maps', 'taxonomy general name' ),
    'singular_name' => _x( 'Map', 'taxonomy singular name' ),
    'add_new' => __('Add New', 'diph-maps'),
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
    'show_in_menu' => 'diph-top-level-handle', 
    'query_var' => true,
    'rewrite' => false,
    'capability_type' => 'post',
    'has_archive' => true, 
    'hierarchical' => true,
    'menu_position' => null,
    'supports' => array( 'title', 'editor', 'author', 'thumbnail', 'excerpt', 'comments', 'revisions','custom-fields' )
  ); 
  register_post_type('diph-maps',$args);
}
add_action( 'init', 'diph_mapset_init' );


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

  register_taxonomy('mapset','diph-maps',array(
    'hierarchical' => true,
    'labels' => $labels,
    'show_ui' => true,
    'update_count_callback' => '_update_post_term_count',
    'query_var' => true,
    'rewrite' => array( 'slug' => 'mapsets' ),
  ));
	
}
add_action( 'init', 'mapset_init' );


// Custom scripts to be run on Project new/edit pages only
function add_diph_map_library_scripts( $hook ) {

    global $post;

    if ( $hook == 'edit.php'|| $hook == 'post-new.php' || $hook == 'post.php' ) {
        if ( 'diph-maps' === $post->post_type ) {     
			//wp_register_style( 'ol-style', plugins_url('/js/OpenLayers/theme/default/style.css',  dirname(__FILE__) ));
			wp_enqueue_style( 'ol-map', plugins_url('/css/ol-map.css',  dirname(__FILE__) ));
			wp_enqueue_script(  'jquery' );
             //wp_enqueue_script(  'open-layers', plugins_url('/js/OpenLayers/OpenLayers.js', dirname(__FILE__) ));
			 wp_enqueue_script(  'diph-map-library-script', plugins_url('/js/diph-map-library-admin.js', dirname(__FILE__) ));
			 wp_enqueue_style('thickbox');
			wp_enqueue_script('thickbox');
        }
    }
}
add_action( 'admin_enqueue_scripts', 'add_diph_map_library_scripts', 10, 1 );

// Set template to be used for Project type
function diph_map_page_template( $page_template )
{
	
	$post_type = get_query_var('post_type');
    if ( $post_type == 'diph-maps' ) {
        $page_template = dirname( __FILE__ ) . '/diph-map-template.php';
    }
    return $page_template;
}
add_filter( 'single_template', 'diph_map_page_template' );
?>