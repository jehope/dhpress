<?php
// Add new taxonomy for mapsets
function diph_mapset_init() {
  $labels = array(
    'name' => _x( 'Mapsets', 'taxonomy general name' ),
    'singular_name' => _x( 'Mapset', 'taxonomy singular name' ),
    'search_items' =>  __( 'Search Mapsets' ),
    'popular_items' => __( 'Popular Mapsets' ),
    'all_items' => __( 'All Mapsets' ),
    'parent_item' => null,
    'parent_item_colon' => null,
    'edit_item' => __( 'Edit Mapset' ), 
    'update_item' => __( 'Update Mapset' ),
    'add_new_item' => __( 'Add New Mapset' ),
    'new_item_name' => __( 'New Mapset Name' ),
    'separate_items_with_commas' => __( 'Separate mapsets with commas' ),
    'add_or_remove_items' => __( 'Add or remove mapsets' ),
    'choose_from_most_used' => __( 'Choose from the most used mapsets' ),
    'menu_name' => __( 'Mapsets' ),
  ); 

  register_taxonomy(
	'mapset',	// name of new taxonomy
	'post',	// post_type to register it with (NEED TO CHANGE THIS!!!!!!!!!!!)
	array(
    'hierarchical' => false,
    'labels' => $labels,
    'public' => true,
	'show_in_nav_menus' => false,
	'show_ui' => false,
	/*If you want to ensure that your custom taxonomy behaves like a tag, 
	you must add the option 'update_count_callback' => '_update_post_term_count'. 
	Not doing so will result in multiple comma-separated items added at once being 
	saved as a single value, not as separate values. This can cause undue stress 
	when using get_the_term_list and other term display functions. */
    'update_count_callback' => '_update_post_term_count', 
    'query_var' => true,
    'rewrite' => array( 'slug' => 'mapset' ),
  ));
}
add_action( 'init', 'diph_mapset_init' );

// Get id, name, description, and url of maps in table wp_diph_maps
function diph_get_maps() {
	global $wpdb;

	$maps_array = $wpdb->get_results( $wpdb->prepare( "
		SELECT id, map_name, map_desc, map_url 
		FROM $wpdb->diph_maps
		")
		);
		
	return $maps_array;
}

// This is what displays on the map library page under the diPH Toolkit 
function diph_sublevel_page( $active_tab ) {
	//if user has clicked on a tab
	if( isset( $_GET[ 'tab' ] ) ) {
			$active_tab = $_GET[ 'tab' ];
		}
	//if user has not clicked on a tab, take them to map library tab
	else {
		$active_tab = 'map_lib';
	}
	
	echo '<div class = "wrap">';
	echo '<div id = "icon-themes" class = "icon32"></div>';
	echo "<h2>" . __( 'Map Layer Library', 'diph-menu' ) . "</h2>";
/*	echo "<p>" . __( 'Add map IDs with descriptions here', 'diph-menu' ) . "</p>";
	echo "<p>" . __( 'Map ids should show up in dropdown on edit project pages', 'diph-menu' ) . "</p>";
	echo "<p>" . __( 'Projects should show up in dropdown on edit marker pages', 'diph-menu' ) . "</p>";
*/	
	settings_errors();
	?>
	
	<!-- DISPLAY "MAP LIBRARY" AND "MANAGE MAPSETS" TABS -->
	<h2 class = "nav-tab-wrapper">
		<a href = "admin.php?page=map-library&tab=map_lib" class = "nav-tab <?php echo $active_tab == 'map_lib' ? 'nav-tab-active' : ''; ?>" >Map Library</a>
		<a href = "edit-tags.php?taxonomy=mapset&tab=mapset" class = "nav-tab <?php echo $active_tab == 'mapset' ? 'nav-tab-active' : ''; ?>" >Manage Mapsets</a>
	</h2>
	<form method = "post" action = "options.php">
		<?php 
			if ( $active_tab == 'map_lib' ) {   
				$maps_array = diph_get_maps();
			
				echo '<br />
					<table border="1">
						<tr>
							<th>Map ID</th>
							<th>Map Name</th>
							<th>Map Description</th>
							<th>Map URL</th>
						</tr>';
							
				foreach( $maps_array as $map ) {
					echo '
						<tr>
							<td>' . $map->id . '</td>
							<td>' . $map->map_name . '</td>
							<td>' . $map->map_desc . '</td>
							<td>' . $map->map_url . '</td>
						</tr>';
					}
					
				echo '</table>';
			} //end if active_tab == map_lib
			
			elseif ( $active_tab == 'mapset' ) {
				echo 'this is the mapset admin tab';
			}
		?>
	</form>
	</div> <!-- wrap -->
	<?php
} // end diph_sublevel_page

// make sure correct TL menu is highlighted (this highlights and expands the diPH Toolkit TL menu.  It does not actually highlight the map library <li>.)
function diph_mapset_menu_correction( $top_level_menu ) {
	global $current_screen;
	$taxonomy = $current_screen->taxonomy;
	if ( $taxonomy == 'mapset' )
		$top_level_menu = 'diph-top-level-handle';
	return $top_level_menu;
}
add_action( 'parent_file', 'diph_mapset_menu_correction' );

function diph_admin_menu_scripts() {
	$screen = get_current_screen();
	// This should only apply to edit-tags.php?taxonomy=mapset
	if ( $screen->taxonomy == 'mapset' ) { 
		wp_deregister_script( 'jquery' );
		wp_register_script('jquery', "http://code.jquery.com/jquery-1.7.2.min.js");
		wp_enqueue_script('jquery');
		// diph_menu_highlighting is a jQuery script to replicate the look of the Map Library tab (/wp-admin/admin.php?page=map-library) on edit-tags.php?taxonomy=mapset
		wp_register_script('diph_menu_highlighting', plugins_url( 'js/diph-menu-highlighting.js', dirname( __FILE__ )));
		wp_enqueue_script('diph_menu_highlighting');
	}
}
add_action( 'wp_print_scripts', 'diph_admin_menu_scripts'); 
?>