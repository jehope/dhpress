<?php 


// Hook for adding admin menus
add_action('admin_menu', 'diph_add_pages');

// action function for above hook
function diph_add_pages() {
    // Add a new submenu under Settings:
    add_options_page(__('diPH Settings','menu-test'), __('diPH Settings','menu-test'), 'manage_options', 'diph_settings', 'diph_settings_page');

    // Add a new top-level menu (ill-advised):
    add_menu_page(__('diPH Toolkit','menu-test'), __('diPH Toolkit','menu-test'), 'manage_options', 'diph-top-level-handle', 'diph_toplevel_page' );

    // Add a submenu to the custom top-level menu:
    add_submenu_page('diph-top-level-handle', __('Map Library','menu-test'), __('Map Library','menu-test'), 'manage_options', 'sub-page', 'diph_sublevel_page');

    // Add a second submenu to the custom top-level menu:
    add_submenu_page('diph-top-level-handle', __('Test Sublevel 2','menu-test'), __('Test Sublevel 2','menu-test'), 'manage_options', 'sub-page2', 'diph_sublevel_page2');
   
}

// mt_settings_page() displays the page content for the Test settings submenu
function diph_settings_page() {
    echo "<h2>" . __( 'Test Settings', 'menu-test' ) . "</h2>";
}

// mt_tools_page() displays the page content for the Test Tools submenu
function diph_tools_page() {
    echo "<h2>" . __( 'Test Tools', 'menu-test' ) . "</h2>";
}

// mt_toplevel_page() displays the page content for the custom Test Toplevel menu
function diph_toplevel_page() {
    echo "<h2>" . __( 'Map Layer Library', 'menu-test' ) . "</h2>";
	 echo "<p>" . __( 'Add map ids with descriptions here', 'menu-test' ) . "</p>";
}

// mt_sublevel_page() displays the page content for the first submenu
// of the custom Test Toplevel menu
function diph_sublevel_page() {
    echo "<h2>" . __( 'Map Layer Library', 'menu-test' ) . "</h2>";
	 echo "<p>" . __( 'Add map ids with descriptions here', 'menu-test' ) . "</p>";
	 echo "<p>" . __( 'Map ids should show up in dropdown on edit project pages', 'menu-test' ) . "</p>";
	 echo "<p>" . __( 'Projects should show up in dropdown on edit marker pages', 'menu-test' ) . "</p>";
}

// mt_sublevel_page2() displays the page content for the second submenu
// of the custom Test Toplevel menu
function diph_sublevel_page2() {
    echo "<h2>" . __( 'Test Sublevel2', 'menu-test' ) . "</h2>";
}


function diph_project_init() {
  $labels = array(
    'name' => _x('Projects', 'post type general name'),
    'singular_name' => _x('Project', 'post type singular name'),
    'add_new' => _x('Add New', 'project'),
    'add_new_item' => __('Add New Project'),
    'edit_item' => __('Edit Project'),
    'new_item' => __('New Project'),
    'all_items' => __('All Projects'),
    'view_item' => __('View Project'),
     'search_items' => __('Search Projects'),
    'not_found' =>  __('No projects found'),
    'not_found_in_trash' => __('No projects found in Trash'), 
    'parent_item_colon' => '',
    'menu_name' => __('Projects')

  );
  $args = array(
    'labels' => $labels,
    'public' => true,
    'publicly_queryable' => true,
    'show_ui' => true, 
    'show_in_menu' => 'diph-top-level-handle', 
    'query_var' => true,
    'rewrite' => array('slug' => 'projects','with_front' => FALSE),
    'capability_type' => 'page',
    'has_archive' => true, 
    'hierarchical' => true,
    'menu_position' => null,
    'supports' => array( 'title', 'editor', 'author', 'thumbnail', 'excerpt', 'comments' )
  ); 
  register_post_type('project',$args);
}
add_action( 'init', 'diph_project_init' );
function diph_marker_init() {
  $labels = array(
    'name' => _x('Markers', 'post type general name'),
    'singular_name' => _x('Marker', 'post type singular name'),
    'add_new' => _x('Add New', 'diph-markers'),
    'add_new_item' => __('Add New Marker'),
    'edit_item' => __('Edit Marker'),
    'new_item' => __('New Marker'),
    'all_items' => __('All Markers'),
    'view_item' => __('View Marker'),
     'search_items' => __('Search Markers'),
    'not_found' =>  __('No markers found'),
    'not_found_in_trash' => __('No markers found in Trash'), 
    'parent_item_colon' => '',
    'menu_name' => __('Markers')
  );
  $args = array(
    'labels' => $labels,
    'public' => true,
    'publicly_queryable' => true,
    'show_ui' => true, 
    'show_in_menu' => 'diph-top-level-handle', 
    'query_var' => true,
    'rewrite' => true,
    'capability_type' => 'post',
    'has_archive' => true, 
    'hierarchical' => true,
    'menu_position' => null,
    'supports' => array( 'title', 'editor', 'author', 'thumbnail', 'excerpt', 'comments' )
  ); 
  register_post_type('diph-markers',$args);
}
add_action( 'init', 'diph_marker_init' );

add_filter( 'single_template', 'diph_page_template' );
function diph_page_template( $page_template )
{
	
	$post_type = get_query_var('post_type');
    if ( $post_type == 'project' ) {
        $page_template = dirname( __FILE__ ) . '/diph-project-template.php';
    }
    return $page_template;
}
add_filter( 'pre_get_posts', 'my_get_posts' );

function my_get_posts( $query ) {

	if ( is_home() && $query->is_main_query() )
		$query->set( 'post_type', array( 'post', 'page', 'project' ) );

	return $query;
}
?>