<?php 


// Hook for adding admin menus
add_action('admin_menu', 'dhp_add_pages');

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
    // Add a new submenu under Settings:
    //add_options_page(__('DH Press Settings','dhp-menu'), __('dhp Settings','dhp-menu'), 'manage_options', 'dhp_settings', 'dhp_settings_page');

    // Add a new top-level menu (ill-advised):
    add_menu_page(__('DH Press','dhp-menu'), __('DH Press','dhp-menu'), 'manage_options', 'dhp-top-level-handle', 'dhp_toplevel_page', plugins_url( 'dhpress/images/dhpress-plugin-icon16.png' ) );

    // Add a submenu to the custom top-level menu:
    //add_submenu_page('dhp-top-level-handle', __('Map Library','dhp-menu'), __('Map Library','dhp-menu'), 'manage_options', 'map-library', 'dhp_sublevel_page');

    // Add a second submenu to the custom top-level menu:
    //add_submenu_page('dhp-top-level-handle', __('Icon Library','dhp-menu'), __('Icon Library','dhp-menu'), 'manage_options', 'icon-library', 'dhp_sublevel_page2');
  
    //add_submenu_page('dhp-top-level-handle', __('Category Manager','dhp-menu'), __('Category Manager','dhp-menu'), 'manage_options', 'category-manager', 'dhp_sublevel_page3');
  
}

// mt_settings_page() displays the page content for the Test settings submenu
function dhp_settings_page() {
    echo "<h2>" . __( 'Test Settings', 'dhp-menu' ) . "</h2>";
}

// mt_tools_page() displays the page content for the Test Tools submenu
function dhp_tools_page() {
    echo "<h2>" . __( 'Test Tools', 'dhp-menu' ) . "</h2>";
}

// mt_toplevel_page() displays the page content for the custom Test Toplevel menu
function dhp_toplevel_page() {
    echo "<h2>" . __( 'Map Layer Library', 'dhp-menu' ) . "</h2>";
	 echo "<p>" . __( 'Add map ids with descriptions here', 'dhp-menu' ) . "</p>";
}

// of the custom Test Toplevel menu
function dhp_sublevel_page2() {
    echo "<h2>" . __( 'Icon Library', 'dhp-menu' ) . "</h2>";
	echo "<p>" . __( 'Display icons and add upload ability to add new icons', 'dhp-menu' ) . "</p>";
}

function dhp_sublevel_page3() {
    echo "<h2>" . __( 'Category Manager', 'dhp-menu' ) . "</h2>";
    echo "<p>" . __( 'Manage custom taxonomies', 'dhp-menu' ) . "</p>";
}


// Add project and marker to queryable types
function my_get_posts( $query ) {

	if ( is_home() && $query->is_main_query() )
		$query->set( 'post_type', array( 'post', 'page', 'project', 'diph-markers' ) );

	return $query;
}
?>