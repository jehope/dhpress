<?php 


// Hook for adding admin menus
add_action('admin_menu', 'dhp_add_pages');

include_once( dirname(__FILE__) . '/dhp-class-project.php' );

include_once( dirname(__FILE__) . '/dhp-project-functions.php' );

include_once( dirname(__FILE__) . '/dhp-marker-functions.php' );

require_once( dirname(__FILE__) . '/dhp-map-library.php' );


//plugins used
require_once( dirname(__FILE__) . '/../lib/category-checklist-tree/category-checklist-tree.php' );

// require_once( dirname(__FILE__) . '/../lib/taxonomy-metadata/taxonomy-metadata.php' );

require_once( dirname(__FILE__) . '/../lib/term-menu-order/term-menu-order.php' );

require_once( dirname(__FILE__) . '/../lib/csv-importer/csv_importer.php' );

// register_activation_hook( dirname(__FILE__) . '/../lib/taxonomy-metadata/taxonomy-metadata.php', array( 'Taxonomy_Metadata', 'activate' ) );

// action function for above hook
function dhp_add_pages() {
    // Add a new top-level menu -- This is hooked into the custom post type (Projects, Markers, Maps)
    add_menu_page(__('DH Press','dhp-menu'), __('DH Press','dhp-menu'), 'manage_options', 'dhp-top-level-handle', 'dhp_toplevel_page', plugins_url( 'dhpress/images/dhpress-plugin-icon16.png' ) );
}

// mt_toplevel_page() displays the page content for the custom Test Toplevel menu
// This is never actually called; it is replaced by logic elsewhere
function dhp_toplevel_page() {
}


// Add project and marker to queryable types
function my_get_posts( $query ) {

	if ( is_home() && $query->is_main_query() )
		$query->set( 'post_type', array( 'post', 'page', 'project', 'diph-markers' ) );

	return $query;
}
?>