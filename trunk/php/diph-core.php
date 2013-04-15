<?php 


// Hook for adding admin menus
add_action('admin_menu', 'diph_add_pages');

include_once( dirname(__FILE__) . '/diph-project-functions.php' );

include_once( dirname(__FILE__) . '/diph-marker-functions.php' );

require_once( dirname(__FILE__) . '/diph-map-library.php' );


//plugins used
require_once( dirname(__FILE__) . '/../lib/category-checklist-tree/category-checklist-tree.php' );

// action function for above hook
function diph_add_pages() {
    // Add a new submenu under Settings:
    //add_options_page(__('DH Press Settings','diph-menu'), __('diPH Settings','diph-menu'), 'manage_options', 'diph_settings', 'diph_settings_page');

    // Add a new top-level menu (ill-advised):
    add_menu_page(__('DH Press','diph-menu'), __('DH Press','diph-menu'), 'manage_options', 'diph-top-level-handle', 'diph_toplevel_page' );

    // Add a submenu to the custom top-level menu:
    //add_submenu_page('diph-top-level-handle', __('Map Library','diph-menu'), __('Map Library','diph-menu'), 'manage_options', 'map-library', 'diph_sublevel_page');

    // Add a second submenu to the custom top-level menu:
    //add_submenu_page('diph-top-level-handle', __('Icon Library','diph-menu'), __('Icon Library','diph-menu'), 'manage_options', 'icon-library', 'diph_sublevel_page2');
  
    //add_submenu_page('diph-top-level-handle', __('Category Manager','diph-menu'), __('Category Manager','diph-menu'), 'manage_options', 'category-manager', 'diph_sublevel_page3');
  
}

// mt_settings_page() displays the page content for the Test settings submenu
function diph_settings_page() {
    echo "<h2>" . __( 'Test Settings', 'diph-menu' ) . "</h2>";
}

// mt_tools_page() displays the page content for the Test Tools submenu
function diph_tools_page() {
    echo "<h2>" . __( 'Test Tools', 'diph-menu' ) . "</h2>";
}

// mt_toplevel_page() displays the page content for the custom Test Toplevel menu
function diph_toplevel_page() {
    echo "<h2>" . __( 'Map Layer Library', 'diph-menu' ) . "</h2>";
	 echo "<p>" . __( 'Add map ids with descriptions here', 'diph-menu' ) . "</p>";
}



// mt_sublevel_page2() displays the page content for the second submenu
// of the custom Test Toplevel menu
function diph_sublevel_page2() {
    echo "<h2>" . __( 'Icon Library', 'diph-menu' ) . "</h2>";
	echo "<p>" . __( 'Display icons and add upload ability to add new icons', 'diph-menu' ) . "</p>";
}

function diph_sublevel_page3() {
    echo "<h2>" . __( 'Category Manager', 'diph-menu' ) . "</h2>";
    echo "<p>" . __( 'Manage custom taxonomies', 'diph-menu' ) . "</p>";
    echo '<p><a href="http://msc.renci.org/dev/wp-admin/edit-tags.php?taxonomy=diph_tax_long-womens-movement" >Long Womens Movement</a></p>';

}


// Add project and marker to queryable types
function my_get_posts( $query ) {

	if ( is_home() && $query->is_main_query() )
		$query->set( 'post_type', array( 'post', 'page', 'project', 'diph-markers' ) );

	return $query;
}
?>