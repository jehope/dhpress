<?php 

// Hook for adding admin menus
add_action('admin_menu', 'dhp_add_pages');

require_once( dirname(__FILE__) . '/dhp-class-project.php' );

require_once( dirname(__FILE__) . '/dhp-project-functions.php' );

require_once( dirname(__FILE__) . '/dhp-marker-functions.php' );

require_once( dirname(__FILE__) . '/dhp-map-library.php' );

// Settings for site wide activity monitor and redirect
require_once( dirname(__FILE__) . '/dhp-class-settings.php' );
// Shortcode for dual map display
require_once( dirname(__FILE__) . '/dhp-class-shortcodes.php' );

//plugins used
require_once( dirname(__FILE__) . '/../lib/category-checklist-tree/category-checklist-tree.php' );

require_once( dirname(__FILE__) . '/../lib/term-menu-order/term-menu-order.php' );

require_once( dirname(__FILE__) . '/../lib/csv-importer/csv_importer.php' );

// action function for above hook
function dhp_add_pages() {
    // Add a new top-level menu -- This is hooked into the custom post type (Projects, Markers, Maps)
    add_menu_page( __('DH Press','dhp-menu'), __('DH Press','dhp-menu'), 'manage_options', 'dhp-top-level-handle', null, plugins_url('/images/dhpress-plugin-icon16.png', dirname(__FILE__)) );
}

?>