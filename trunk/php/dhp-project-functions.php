<?php 

/**
	 * Registers and handles DHPress Project functions
	 *
	 * @package DHPress Toolkit
	 * @author DHPress Team
	 * @link http://dhpress.org/download/
	 */


// ================== Global Constants and Variables ===================

define( 'DHP_HTML_ADMIN_EDIT',  'dhp-html-admin-edit.txt' );
define( 'DHP_SCRIPT_PROJ_VIEW',  'dhp-script-proj-view.txt' );
define( 'DHP_SCRIPT_MAP_VIEW',   'dhp-script-map-view.txt' );
define( 'DHP_SCRIPT_CARDS_VIEW',   'dhp-script-cards-view.txt' );
define( 'DHP_SCRIPT_PINBOARD_VIEW',   'dhp-script-pin-view.txt' );

// define( 'DHP_SCRIPT_TREE_VIEW',   'dhp-script-tree-view.txt' );   // currently unneeded
// define( 'DHP_SCRIPT_TIME_VIEW',   'dhp-script-time-view.txt' );   // currently unneeded
// define( 'DHP_SCRIPT_FLOW_VIEW',   'dhp-script-flow-view.txt' );   // currently unneeded
// define( 'DHP_SCRIPT_BROWSER_VIEW',   'dhp-script-browser-view.txt' );   // currently unneeded

// define( 'DHP_SCRIPT_TAX_TRANS',  'dhp-script-tax-trans.txt' );	// currently unneeded
// define( 'DHP_SCRIPT_TRANS_VIEW', 'dhp-script-trans-view.txt' );   // currently unneeded


// ================== Initialize Plug-in ==================

// PURPOSE: To create custom post type for Projects in WP
// NOTES:   Called by both dhp_project_init() and dhp_project_activate()

function dhp_register_project_cpt()
{
  $labels = array(
    'name' => _x('Projects', 'post type general name'),
    'singular_name' => _x('Project', 'post type singular name'),
    'add_new' => _x('Add New', 'project'),
    'add_new_item' => __('Add New Project'),
    'edit_item' => __('Edit Project'),
    'new_item' => __('New Project'),
    'all_items' => __('Projects'),
    'view_item' => __('View Project'),
    'search_items' => __('Search Projects'),
    'not_found' =>  __('No projects found'),
    'not_found_in_trash' => __('No projects found in Trash'), 
    'parent_item_colon' => '',
    'menu_name' => __('Projects'),
    'menu_icon' => plugins_url( 'dhpress/images/dhpress-plugin-icon.png' )  // Icon Path
  );
  $args = array(
    'labels' => $labels,
    'public' => true,
    'publicly_queryable' => true,
    'show_ui' => true, 
    'show_in_menu' => 'dhp-top-level-handle', 
    'query_var' => true,
    'rewrite' => array('slug' => 'dhp-projects','with_front' => FALSE),
    'capability_type' => 'page',
    'has_archive' => true,
    /* if we want to subclass project types in future (i.e., Entry Points), will need to set 'hierarchical' => true */
    'hierarchical' => false,
    'menu_position' => null,
    /* if hierarchical, then may want to add 'page-attributes' to supports */
    'supports' => array( 'title', 'thumbnail', 'revisions', 'custom-fields' )
  ); 
  register_post_type('dhp-project',$args);
} // dhp_register_project_cpt()


// init action called to initialize a plug-in
add_action( 'init', 'dhp_project_init' );

// NOTES:   This is called by dhp_project_activate(), which only expects it to register CPT
function dhp_project_init()
{
	dhp_register_project_cpt();

  		// Are there any 'project' custom post types from 2.5.4 or earlier -- if so, change CPT

		// If no version # in DB, definitely old version of DH Press whose data needs checking
	if (get_option('dhp_plugin_version') === false) {
		$args = array('post_type' => 'project', 'posts_per_page' => -1);
		$loop = new WP_Query( $args );
		while ( $loop->have_posts() ) : $loop->the_post();
			$proj_id = get_the_ID();

				// Only does this change if CPT has associated metadata
    		$proj_set = get_post_meta($proj_id, 'project_settings', true);
			if(!empty($proj_set)) {
				$update_params = array( 'ID' => $proj_id, 'post_type' => 'dhp-project');
				wp_update_post($update_params);
			}
		endwhile;
		wp_reset_query();
	}
		// store version # in options
	update_option('dhp_plugin_version', DHP_PLUGIN_VERSION);
} // dhp_project_init


// add support for theme-specific feature
if ( function_exists( 'add_theme_support' ) ) {
		// enable use of thumbnails
	add_theme_support( 'post-thumbnails' );
		// default Post Thumbnail dimensions
	set_post_thumbnail_size( 32, 37 ); 
}


register_activation_hook( __FILE__, 'dhp_project_activate');

// PURPOSE: Ensure that custom post types have been registered before we flush rewrite rules
//			See http://solislab.com/blog/plugin-activation-checklist/#flush-rewrite-rules
function dhp_project_activate()
{
	dhp_register_project_cpt();
	flush_rewrite_rules();
}

// ================== Produce Admin Panel Header ==================

// admin_head action called to create header for admin panel
add_action('admin_head', 'plugin_header');

// plugin_header()
// PURPOSE: Insert DH Press icon into top of administration panel

function plugin_header()
{ ?>
		<style>
		    #icon-dhp-top-level-handle { background:transparent url('<?php echo DHP_PLUGIN_URL .'/images/dhpress-plugin-icon.png';?>') no-repeat; }     
		</style>
<?php
} // plugin_header()


// ================== DHP Maps =====================

	// PURPOSE: Return list of map attributes, given list of items to load
	// INPUT: 	$mapID = custom post ID of map in DH Press library
	//			$mapMetaList = hash [key to use in resulting array : custom field name]
function dhp_get_map_metadata($mapID, $mapMetaList)
{
	$thisMetaSet = array();

	foreach ($mapMetaList as $arrayKey => $metaName) {
		$thisMetaData = get_post_meta($mapID, $metaName, true);
		$thisMetaSet[$arrayKey] = $thisMetaData;
	}
	return $thisMetaSet;
} // dhp_get_map_metadata()


	// PURPOSE: Return list of all dhp-maps in DHP site
	// RETURNS: array [layerID, layerName, layerCat, layerType, layerTypeId]
function dhp_get_map_layer_list()
{
	$layers = array();
	$theMetaSet = array('layerName' => 'dhp_map_shortname', 'layerCat' => 'dhp_map_category',
						'layerType' => 'dhp_map_type', 'layerTypeId' => 'dhp_map_typeid' );

	$args = array( 'post_type' => 'dhp-maps', 'posts_per_page' => -1 );
	$loop = new WP_Query( $args );
	while ( $loop->have_posts() ) : $loop->the_post();
	//var $tempLayers = array();
		$layer_id = get_the_ID();

		$mapMetaData = dhp_get_map_metadata($layer_id, $theMetaSet);
		$mapMetaData['layerID']		= $layer_id;
		// $mapMetaData['layerName']	= get_the_title();
		array_push($layers, $mapMetaData);

	endwhile;
	wp_reset_query();

	return $layers;
} // dhp_get_map_layer_list()


//============================ Customize for Project Posts ============================

// post_updated_messages enables us to customize the messages for our custom post types
add_filter( 'post_updated_messages', 'dhp_project_updated_messages' );

// PURPOSE:	Supply strings specific to Project custom type
// ASSUMES:	Global variables $post, $post_ID set

function dhp_project_updated_messages( $messages )
{
  global $post, $post_ID;

  $messages['dhp-project'] = array(
    0 => '', // Unused. Messages start at index 1.
    1 => sprintf( __('Project updated. <a href="%s">View project</a>'), esc_url( get_permalink($post_ID) ) ),
    2 => __('Custom field updated.'),
    3 => __('Custom field deleted.'),
    4 => __('Project updated.'),
    /* translators: %s: date and time of the revision */
    5 => isset($_GET['revision']) ? sprintf( __('Project restored to revision from %s'), wp_post_revision_title( (int) $_GET['revision'], false ) ) : false,
    6 => sprintf( __('Project published. <a href="%s">View project</a>'), esc_url( get_permalink($post_ID) ) ),
    7 => __('Project saved.'),
    8 => sprintf( __('Project submitted. <a target="_blank" href="%s">Preview project</a>'), esc_url( add_query_arg( 'preview', 'true', get_permalink($post_ID) ) ) ),
    9 => sprintf( __('Project scheduled for: <strong>%1$s</strong>. <a target="_blank" href="%2$s">Preview project</a>'),
      // translators: Publish box date format, see http://php.net/date
      date_i18n( __( 'M j, Y @ G:i' ), strtotime( $post->post_date ) ), esc_url( get_permalink($post_ID) ) ),
    10 => sprintf( __('Project draft updated. <a target="_blank" href="%s">Preview project</a>'), esc_url( add_query_arg( 'preview', 'true', get_permalink($post_ID) ) ) ),
  );

  return $messages;
} // dhp_project_updated_messages()


// post_row_actions enables us to modify the hover links in the Dashboard directories
add_filter( 'post_row_actions', 'dhp_export_post_link', 10, 2 );

// PURPOSE: Add a "CSV Export" hover link to listing of DH Press Projects

function dhp_export_post_link( $actions, $post )
{
    if ($post->post_type != 'dhp-project') {
        return $actions;
    }

	if (current_user_can('edit_posts')) {
		$actions['CSV_Export'] = '<a href="admin.php?action=dhp_export_as_csv&amp;post='.$post->ID.'" title="Export this item as CSV" rel="permalink">CSV Export</a>';
	}
	return $actions;
} // dhp_export_post_link()


// =========================== Customize handling of taxonomies ============================

// add custom taxonomies for each project when plugin is initialized
add_action( 'init', 'create_tax_for_projects', 0 );

	// PURPOSE: Create custom taxonomies for all existing DHP Projects if they don't exist (head term for Project)
function create_tax_for_projects()
{
	$args = array('post_type' => 'dhp-project', 'posts_per_page' => -1);
	$projects = get_posts($args);
	if ($projects) {
			// Go through all currently existing Projects
		foreach ( $projects as $project ) {
			$projectTax = DHPressProject::ProjectIDToRootTaxName($project->ID);
			$projectName = $project->post_title;
			$projectSlug = $project->post_name;
			$taxonomy_exist = taxonomy_exists($projectTax);
			//returns true
			if(!$taxonomy_exist) {
				dhp_create_tax($projectTax,$projectName,$projectSlug);
			}
		}
	}
} // create_tax_for_projects()


	// PURPOSE: Create custom taxonomy for a specific Project in WP
	// INPUT:	$taxID = taxonomy root name, $taxName = project title, $taxSlug = project slug
function dhp_create_tax($taxID,$taxName,$taxSlug)
{
	// Add new taxonomy, make it hierarchical (like categories)
  $labels = array(
    'name' => _x( $taxName, 'taxonomy general name' ),
    'singular_name' => _x( $taxName, 'taxonomy singular name' ),
    'search_items' =>  __( 'Search Terms' ),
    'all_items' => __( 'All Terms' ),
    'parent_item' => __( 'Parent Term' ),
    'parent_item_colon' => __( 'Parent Term:' ),
    'edit_item' => __( 'Edit Term' ), 
    'update_item' => __( 'Update Term' ),
    'add_new_item' => __( 'Add New Term' ),
    'new_item_name' => __( 'New Term Name' ),
    'menu_name' => __( 'Term' ),
  ); 	

  register_taxonomy($taxID,array('dhp-markers'), array(
    'hierarchical' => true,
    'public' => true,
    'labels' => $labels,
    'show_ui' => true,
    'show_in_nav_menus' => false,
    'query_var' => true,
    'rewrite' => array('hierarchical' => true, 'slug' => 'dhp-projects/'.$taxSlug, 'with_front' => false)
  ));
} // dhp_create_tax()

// admin_head called when compiling header of admin panel
add_action( 'admin_head' , 'show_tax_on_project_markers' );

// PURPOSE: Called when compiling project admin panel to remove the editing boxes for
//			all taxonomies other than those connected to this project
// ASSUMES:	$post is set to a project (i.e., that we are editing or viewing project)

function show_tax_on_project_markers()
{
	global $post;

	$projectID = get_post_meta($post->ID,'project_id');
	$project = get_post($projectID[0]);
	$projectRootTaxName = DHPressProject::ProjectIDToRootTaxName($project->ID);
	$dhpTaxs = get_taxonomies();

	foreach ($dhpTaxs as $key => $value) {
		if($value!=$projectRootTaxName) {
			remove_meta_box( $value.'div', 'dhp-markers', 'side' );
		}
	}
} // show_tax_on_project_markers()


// add_meta_boxes called when Edit Post runs
add_action('add_meta_boxes_dhp-project', 'add_dhp_project_admin_edit');

// PURPOSE: Called when Project is edited in admin panel to create Project-specific GUI

function add_dhp_project_admin_edit()
{
    add_meta_box(
		'dhp_settings_box', 			// id of edit box
		'Project Details',				// textual title of box
		'show_dhp_project_admin_edit', 			// name of callback function
		'dhp-project',					// name of custom post type
		'normal',						// part of page to add box
		'high'); 						// priority
} // add_dhp_project_settings_box()


// PURPOSE:	Called by WP to create all needed HTML for admin panel
// ASSUMES:	Global $post is set to point to post for current project
// SIDE-FX: Creates hidden fields for storing data   
// NOTE: 	Data that is generated via WP queries (like looking for custom fields and map entries)
//				must be passed this way, as this happens last and does not overwrite WP globals (like $post)

function show_dhp_project_admin_edit()
{
	global $post;

		// BUG -- Post does not have appropriate value
	$projObj = new DHPressProject($post->ID);
    $project_settings = $projObj->getAllSettings();

    	// must handle case that project has just been created and does not have settings yet
    if (is_null($project_settings)) {
    	$project_settings = '';
    } else {
    	$project_settings = json_encode($project_settings);
    }

    	// Info about DH Press and this project
	echo '<p><b>DH Press version '.DHP_PLUGIN_VERSION.'</b>&nbsp;&nbsp;Project ID '.$post->ID.'</p>';
    echo '<p><a href="'.get_bloginfo('wpurl').'/wp-admin/edit-tags.php?taxonomy='.$projObj->getRootTaxName().'" >Category Manager</a></p>';

		// Insert Edit Panel's HTML
	$projscript = dhp_get_script_text(DHP_HTML_ADMIN_EDIT);
	echo $projscript;

		// Use nonce for verification
	echo '<input type="hidden" name="dhp_project_settings_box_nonce" value="'.wp_create_nonce(basename(__FILE__)).'" />';

		// Insert HTML for special Project Settings
	echo '<table class="project-form-table">';
	echo '<tr><th><label for="project_settings">Project Settings</label></th>';
	echo '<td><textarea name="project_settings" id="project_settings" cols="60" rows="4">'.$project_settings.'</textarea>
		<br /><span class="description">Stores the project_settings as JSON object</span>';
	echo '</td></tr>';
		// Icons not currently used
	// echo '<input type="hidden" name="project_icons" id="project_icons" value="'.get_post_meta($post->ID, 'project_icons', true).'" />';
	echo '</table>'; // end table

		// Insert list of custom fields -- NOTE! getAllCustomFieldNames() will reset WP globals
	$dhp_custom_fields = $projObj->getAllCustomFieldNames();
	echo '<div style="display:none" id="custom-fields">'.json_encode($dhp_custom_fields).'</div>';

		// Insert list of map layers from loaded library -- NOTE! dhp_get_map_layer_list() will reset WP globals
	echo '<div style="display:none" id="map-layers">'.json_encode(dhp_get_map_layer_list()).'</div>';
} // show_dhp_project_admin_edit()


// 'save_post' is called after post is created or updated
add_action('save_post', 'save_dhp_project_settings');

// PURPOSE: Save data posted to WP for project
//				(Could be invoked by Auto-Save feature of WP)
// INPUT:	$post_id is the id of the post updated
// NOTE:    Complication is for new Project that does not yet have ID?
// ASSUMES:	$_POST is set to post data

function save_dhp_project_settings($post_id)
{
    	// is this an update of existing Project post?
	$parent_id = wp_is_post_revision( $post_id );
	
	// verify nonce
	if (!wp_verify_nonce($_POST['dhp_project_settings_box_nonce'], basename(__FILE__)))
		return $post_id;

	// check autosave
	if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE)
		return $post_id;

	// check permissions
	if ($_POST['post_type'] == 'page') {
		if (!current_user_can('edit_page', $post_id))
			return $post_id;
		} elseif (!current_user_can('edit_post', $post_id)) {
			return $post_id;
	}

		// If there was a previous version (not a new Project)
	if ( $parent_id ) {
		// loop through fields and save the data
		$parent  = get_post( $parent_id );
		$srcToCheck = $parent->ID;
	} else {
		$srcToCheck = $post_id;
	}

		// Check to see if Project settings from custom metabox are different from saved version
	$projObj = new DHPressProject($srcToCheck);
    $old = $projObj->getAllSettings();
    $new = $_POST['project_settings'];
	if ($new && $new != $old) {
		update_metadata('post', $post_id, 'project_settings', $new);
	} elseif ($new == '' && $old) {
		delete_metadata('post', $post_id, 'project_settings', $old);
	}
} // save_dhp_project_settings()


add_action( 'admin_action_dhp_export_as_csv', 'dhp_export_as_csv' );

// PURPOSE: Return all of the marker data associated with Project in CSV format
// NOTES:   This is invoked by URL added to Project Dashboard by dhp_export_post_link()
//			CSV file will start with row names:
//				csv_post_title, csv_post_type, project_id, <custom-fields>...
//			Followed by one row per marker, with column values corresponding to above
//				<post title>, 'dhp-marker', <Project ID>, ...

function dhp_export_as_csv()
{
	if (! ( isset( $_GET['post']) || isset( $_POST['post'])  || ( isset($_REQUEST['action']) && 'rd_duplicate_post_as_draft' == $_REQUEST['action'] ) ) ) {
		wp_die('No post to export has been supplied!');
	}

		// ensure that this URL has not been faked by non-admin user
	if (!current_user_can('edit_posts')) {
		wp_die('Invalid request');
	}
 
 		// Get post ID and associated Project Data
	$postID = (isset($_GET['post']) ? $_GET['post'] : $_POST['post']);
	$projObj = new DHPressProject($postID);

		// Create appropriate filename
    $date = new DateTime();
    $dateFormatted = $date->format("Y-m-d");

	$filename = "csv-$dateFormatted.csv";

    	// Tells the browser to expect a csv file and bring up the save dialog in the browser
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment;filename='.$filename);

    	// This opens up the output buffer as a "file"
    $fp = fopen('php://output', 'w');

    $cfs = $projObj->getAllCustomFieldNames();
    $firstLine = array_merge(array('csv_post_title', 'csv_post_type' ), $cfs);
    array_push($firstLine, 'csv_post_post');

    	// Output the names of columns first
    fputcsv($fp, $firstLine);

    	// Go through all of the Project's Markers and gather data
	$loop = $projObj->setAllMarkerLoop();
	while ( $loop->have_posts() ) : $loop->the_post();
		$markerID = get_the_ID();

		$values = array(get_the_title(), 'dhp-marker' );

		foreach ($cfs as $theCF) {
			$content_val = get_post_meta($markerID, $theCF, true);
			array_push($values, $content_val);
		} // foreach

		array_push($values, get_the_content());

    	fputcsv($fp, $values);
	endwhile;

        // Close the output buffer
    fclose($fp);
 
	exit();
} // dhp_export_as_csv()


// PURPOSE: Get all of the visual features associated via metadata with the taxonomic terms associated with 1 Mote
// INPUT:	$parent_term = Object for mote/top-level term
//			$taxonomy = root name of taxonomy for Project
// NOTES:	JS code will break if icon_url field not set, so we will check it here and die if failure
//			If icon_url is a color, the "black" field will be set to true if black will contrast with it
// RETURNS: Description of Legends to appear on Map in the following format:
			// {	"type" : "filter",
			// 		"name" : String (top-level-mote-name),
			// 		"terms" :				// 1st level terms & their children
			// 		[
			// 		  {	"name" :  String (inc. top-level-mote-name),
			// 			"id" : integer,
			// 			"icon_url": URL,
			//			"black": boolean,
			// 			"children" :
			// 			[
			// 			  {	"name" : String,
			// 				"term_id" : integer,
			// 				"parent" : integer,
			// 				"count" : String,
			//				"icon_url" : String,
			// 				"term_group" : String
			//			  }, ...
			// 			]
			// 		  }, ...
			// 		],
			// 	}

function dhp_get_category_vals($parent_term, $taxonomy)
{
	$filter_object  = array();
	$filter_parent  = array();

	$filter_object['type']  = "filter";
	$filter_object['name']  = $parent_term->name;
	$filter_object['terms'] = array();

		// Begin with top-level mote name
	$filter_parent['name']     = $parent_term->name;
	$filter_parent['id']       = intval($parent_term->term_id);

	array_push($filter_object['terms'], $filter_parent);

	$myargs = array( 'orderby'       => 'term_group',
		 			 'hide_empty'    => false, 
					 'parent'        => $parent_term->term_id );
	$children_terms  = get_terms( $taxonomy, $myargs );

		// Go through each of the 1st-level values in the category
	foreach ($children_terms as $child) {
			// Does 1st-level term have any 2ndary children?
		$childArgs = array( 'orderby' 		=> 'term_group',
		 					'hide_empty'    => false,
							'parent'        => $child->term_id );
		$children_terms2 = get_terms( $taxonomy, $childArgs );

			// Save each of the 2ndary children
		$new_children = array();
		foreach ($children_terms2 as $child2) {
			$new_child = array();

			$new_child['name'] = $child2->name;
			$new_child['count'] = intval($child2->count);

				// convert IDs from String to Integer
			$new_child['term_id'] = intval($child2->term_id);
			$new_child['parent'] = intval($child2->parent);

				// 2ndary level colors not currently used, so won't compute B/W contrast
			if ($child2->description) {
				$new_child['icon_url'] = $child2->description;
			} else {
				$new_child['icon_url'] = null;
			}
			array_push($new_children, $new_child);
		} // for each 2ndary-level value

		if ($child->description) {
			$icon_url = $child->description;
		} else {
			$icon_url = null;
		}

			// Now save the top-level category term
		$child_filter				 = array();
		$child_filter['name']        = $child->name;
		$child_filter['id']          = intval($child->term_id);
		$child_filter['icon_url']    = $icon_url;
		$child_filter['children']    = $new_children;

			// If icon_url is a color value, determine if black or white will contrast: algorithms at
        	//    http://www.particletree.com/notebook/calculating-color-contrast-for-legible-text/
        	//    http://stackoverflow.com/questions/5650924/javascript-color-contraster
		if (substr($icon_url, 0, 1) === '#') {
	        $brightness = ((hexdec(substr($icon_url, 1, 2)) * 299.0) +
	                    (hexdec(substr($icon_url, 3, 2)) * 587.0) +
	                    (hexdec(substr($icon_url, 5, 2)) * 114.0)) / 255000.0;

	        if ($brightness >= 0.5) {
	            $child_filter['black'] = true;
	        } else {
	            $child_filter['black'] = false;
	        }
		}

		array_push($filter_object['terms'], $child_filter);
	} // for each 1st-level value

		// Update top-level mote pushed near top of function
	$filter_parent['children'] = $children_terms;

	return $filter_object;
} // dhp_get_category_vals()


// ========================================= AJAX calls ======================================


// PURPOSE:	Creates Legends and Feature Collections Object (as per OpenLayer) when looking at a project page;
//			That is, return array describing all markers based on filter and visualization
// INPUT:	$project_id = ID of Project to view
//			$index = index of entry-point to display
// RETURNS: JSON object describing all markers associated with Project
//			[0..n-1] contains results from dhp_get_category_vals() defined above;
//			[n] is a FeatureCollection; exact contents will depend on visualization, but could include:
			// {	"type": "FeatureCollection",
			// 	 	"features" :
			// 		[
			// 			{ "type" : "Feature",	// Only added to FeatureCollections created for Maps
			//							// Only if map or pinboard
			// 			  "geometry" : {
			//					"type" : "Point" | "Polygon"
			//					"coordinates" : LongLat (or X-Y)
			//			  },
			//			  "date" : String, 	// Only if Timeline
			// 			  "title" : String, // Used by Select Modal and all EPs
			// 			  "properties" :
			// 				[
			//							// All data corresponding to categories/legends associated with marker
			// 					"categories" : [ integer IDs of category terms ],
			//							// Data used to create modals
			// 					"content" : [
			//						{ moteName : moteValue }, ...
			//					],
			// 					"link" : URL,
			// 					"link2" : URL
			//							// Those below only in the case of transcript markers
			// 					"audio" : String,
			//					"video" : String,
			// 					"transcript" : String,
			// 					"transcript2" : String,
			// 					"timecode" : String,
			// 				],
			// 			}, ...
			// 		]
			// 	}

add_action('wp_ajax_dhpGetMarkers', 'dhp_get_markers' );
add_action('wp_ajax_nopriv_dhpGetMarkers', 'dhp_get_markers');

// PURPOSE:	Handle Ajax call to get all markers for a Project for a non-Tree view
// ASSUMED: The current Entry Point is not a Tree!
// INPUT:	$_POST['project'] is ID of Project
//			$_POST['index'] is the 0-based index of the current Entry Point
// RETURNS:	JSON object of array of marker values

function dhp_get_markers()
{
	$projectID = $_POST['project'];
	$index = $_POST['index'];

		// initialize result array
	$json_Object = array();

	$mQuery = new DHPressMarkerQuery($projectID);
	$projObj = $mQuery->projObj;
	$eps = $mQuery->projSettings->eps[$index];

		// Does each Marker need a "type": "Feature" property?  Yes if GeoJSON
	$addFeature = false;

	switch ($eps->type) {
	case "map":
			// Which field used to encode Lat-Long on map?
		$mapPointsMote = $projObj->getMoteByName($eps->settings->coordMote);
		$mapCF = $mapPointsMote->cf;
			// Might data contain Polygons (rather than just Points)?
		if ($mapPointsMote->delim != '') {
			$mapDelim = $mapPointsMote->delim;
		} else {
			$mapDelim = null;
		}
			// Find all possible legends/filters for this map -- each marker needs these fields
		$filters = $eps->settings->legends;
			// Collect all possible category values/tax names for each mote in all filters
		foreach ($filters as $legend) {
			$term = get_term_by('name', $legend, $mQuery->rootTaxName);
			if ($term) {
				array_push($json_Object, dhp_get_category_vals($term, $mQuery->rootTaxName));
			}
		}
		$addFeature = true;
		break;

	case "pinboard":
			// Which field used to encode Lat-Long on map?
		$pinPointsMote = $projObj->getMoteByName($eps->settings->coordMote);
		$pinCF = $pinPointsMote->cf;
			// Find all possible legends/filters for this pinboard -- each marker needs these fields
		$filters = $eps->settings->legends;
			// Collect all possible category values/tax names for each mote in all filters
		foreach ($filters as $legend) {
			$term = get_term_by('name', $legend, $mQuery->rootTaxName);
			if ($term) {
				array_push($json_Object, dhp_get_category_vals($term, $mQuery->rootTaxName));
			}
		}
		break;

	case "cards":
			// Convert color mote to custom field
		$cardColorMote = $eps->settings->color;
		if ($cardColorMote != null && $cardColorMote !== '' && $cardColorMote != 'disable') {
				// Create a legend for the color values
			$term = get_term_by('name', $cardColorMote, $mQuery->rootTaxName);
			if ($term) {
				array_push($json_Object, dhp_get_category_vals($term, $mQuery->rootTaxName));
			}
		}
			// gather card contents
		foreach ($eps->settings->content as $theContent) {
			array_push($mQuery->selectContent, $theContent);
		}
			// must add all sort and filter motes to content
			// We must also collect all category values/tax names for filters that are Short Text motes
			//	(so Card filter knows possible values) but don't duplicate color legend
		foreach ($eps->settings->filterMotes as $theContent) {
			array_push($mQuery->selectContent, $theContent);
			$filterMote = $projObj->getMoteByName($theContent);
			if ($filterMote->type=='Short Text' && $filterMote->name != $cardColorMote) {
				$term = get_term_by('name', $theContent, $mQuery->rootTaxName);
				if ($term) {
					array_push($json_Object, dhp_get_category_vals($term, $mQuery->rootTaxName));
				}
			}
		}
		foreach ($eps->settings->sortMotes as $theContent) {
			array_push($mQuery->selectContent, $theContent);
		}
		break;

	case "time":
			// Create a legend for the color values
		$term = get_term_by('name', $eps->settings->color, $mQuery->rootTaxName);
		if ($term) {
			array_push($json_Object, dhp_get_category_vals($term, $mQuery->rootTaxName));
		}

		$dateMote = $projObj->getMoteByName($eps->settings->date);
		$dateCF = $dateMote->cf;
		break;

	case "flow":
			// Gather all Short Text Legends used for Facet dimensions
		foreach ($eps->settings->motes as $legend) {
			$term = get_term_by('name', $legend, $mQuery->rootTaxName);
			if ($term) {
				array_push($json_Object, dhp_get_category_vals($term, $mQuery->rootTaxName));
			}
		}
		break;

	case "browser":
			// If mote is Short Text Legends, compute Legend values, else add to marker content
		foreach ($eps->settings->motes as $legend) {
			$defDef = $projObj->getMoteByName($legend);
			if ($defDef->type=='Short Text') {
				$term = get_term_by('name', $legend, $mQuery->rootTaxName);
				if ($term) {
					array_push($json_Object, dhp_get_category_vals($term, $mQuery->rootTaxName));
				}
			} else {
				array_push($mQuery->selectContent, $legend);
			}
		}
		break;
	} // switch

		// Ensure that any new content requested from markers is not redundant
	$mQuery->selectContent = array_unique($mQuery->selectContent);

	$feature_collection = array();
	$feature_collection['type'] = 'FeatureCollection';
	$feature_array = array();


		// Run query to return all marker posts belonging to this Project
	$loop = $projObj->setAllMarkerLoop();
	while ( $loop->have_posts() ) : $loop->the_post();

		$markerID = get_the_ID();

			// Feature will hold properties and some other values for each marker
		$thisFeature = array();

			// Only add property if necessary
		if ($addFeature) {
			$thisFeature['type']    = 'Feature';
		}

			// Most data goes into properties field
		$thisFeaturesProperties = $mQuery->getMarkerProperties($markerID);

			// First set up fields required by visualizations, abandon marker if missing

			// Map visualization features?
			// Skip marker if missing necessary LatLong data or not valid numbers
		if ($mapCF != null) {
			$latlon = get_post_meta($markerID, $mapCF, true);
			if (empty($latlon)) {
				continue;
			}
				// Create Polygons? Only if delim given
			if ($mapDelim) {
				$split = explode($mapDelim, $latlon);
					// Just treat as Point if only one data item
				if (count($split) == 1) {
					$split = explode(',', $latlon);
					$thisFeature['geometry'] = array("type"=>"Point",
													"coordinates"=> array((float)$split[1], (float)$split[0]));
				} else {
					$poly = array();
					foreach ($split as $thisPt) {
						$pts = explode(',', $thisPt);
						array_push($poly, array((float)$pts[1], (float)$pts[0]));
					}
					$thisFeature['geometry'] = array("type" => "Polygon", "coordinates" => array($poly));
				}
			} else {
				$split = explode(',', $latlon);
					// Have to reverse order for GeoJSON
				$thisFeature['geometry'] = array("type"=>"Point",
												"coordinates"=> array((float)$split[1],(float)$split[0]));
			}
		}

			// Pinboard visualization features
			// Skip marker if missing necessary LatLong data or not valid numbers
		if ($pinCF != null) {
			$xycoord = get_post_meta($markerID, $pinCF, true);
			if (empty($xycoord)) {
				continue;
			}
			$split = explode(',', $xycoord);
			$thisFeature['geometry'] = array("type"=>"Point",
											"coordinates"=> array((float)$split[0], (float)$split[1]));
		}

			// Timeline visualization features
			// Skip marker if missing necessary Date
		if ($dateCF != null) {
			$date = get_post_meta($markerID, $dateCF, true);
			if (empty($date)) {
				continue;
			}
			$thisFeature['date'] = $date;
		}

			// Fetch title for marker
		if ($mQuery->titleMote=='the_title') {
			$thisFeature["title"] = get_the_title();
		} else {
			$thisFeature["title"] = get_post_meta($markerID, $mQuery->titleMote, true);
		}

			// Store all of the properties
		$thisFeature['properties'] = $thisFeaturesProperties;
			// Save this marker
		array_push($feature_array, $thisFeature);
	endwhile;

	$feature_collection['features'] = $feature_array;
	array_push($json_Object, $feature_collection);

	die(json_encode($json_Object));
} // dhp_get_markers()


// TREE MARKER CODE ==================

// PURPOSE: Retrieve all of the relevant info about this node and all call recursively for all of its children
// INPUT:   $nodeName = the name of the custom post
//			$eps = Entry Point settings
// RETURNS: Nested Array for $nodeName and all of its children

function dhp_create_tree_node($nodeName, $mQuery, $childrenCF, $childrenDelim)
{
		// Get the WP post corresponding to this marker
	$args = array( 
		'post_type' => 'dhp-markers', 
		'posts_per_page' => 1,
		'name' => $nodeName,
		array( 'meta_key' => 'project_id', 'meta_value' => $mQuery->projID )
	);
	$loop = new WP_Query($args);

		// We can only abort if not found
	if (!$loop->have_posts()) {
		trigger_error("Tree view label assigned to unknown mote");
		return null;
	}

	$loop->the_post();
	$markerID = get_the_ID();

		// Feature will hold properties and some other values for each marker
	$thisFeature = array();

		// Most data goes into properties field
	$thisFeaturesProperties = $mQuery->getMarkerProperties($markerID);

		// Store all of the properties
	$thisFeature['properties'] = $thisFeaturesProperties;

		// Fetch title for marker
	if ($mQuery->titleMote=='the_title') {
		$thisFeature["title"] = get_the_title();
	} else {
		$thisFeature["title"] = get_post_meta($markerID, $mQuery->titleMote, true);
	}

		// Now that we've constructed this feature, call recursively for all of its children
	$childrenVal = get_post_meta($markerID, $childrenCF, true);
	if (!is_null($childrenVal) && ($childrenVal !== '')) {
		$childName = explode($childrenDelim, $childrenVal);

			// Create array for all descendants and call this recursively to fetch them
		$children = array();
		foreach($childName as $theChildName) {
			$trimName = trim($theChildName);
			$theChildData = dhp_create_tree_node($trimName, $mQuery, $childrenCF, $childrenDelim);
				// Don't add if data error (name not found)
			if ($theChildData != null) {
				array_push($children, $theChildData);
			}
		}
			// Store in feature if any descendents generated
		if(count($children) > 0) {
			$thisFeature['children'] = $children;
		}
	}

		// Return this marker
	return $thisFeature;
} // dhp_create_tree_node()



// Enable for both editing and viewing

add_action('wp_ajax_dhpGetMarkerTree', 'dhp_get_marker_tree' );
add_action('wp_ajax_nopriv_dhpGetMarkerTree', 'dhp_get_marker_tree');

// PURPOSE:	Handle Ajax call to get all markers for a Project
// 			Similar to createMarkerArray() but creates tree of marker data not flat array
// INPUT:	$_POST['project'] = ID of Project to view
//			$_POST['index'] = index of entry-point to display
// RETURNS: JSON object describing all markers associated with Project
//			[0] contains results from dhp_get_category_vals() defined above;
//			[1] is a Nested tree
//				{
// 					"name": String,
//					"properties" :
//					[
//							// All data corresponding to categories/legends associated with marker
//						"categories" : [ integer IDs of category terms ],
//							// Data used to create modals
//						"title" : String,
//							// Data needed by select modal or card filter/sort
//						"content" : [
//							{ moteName : moteValue }, ...
//						],
//						"link" : URL,
//						"link2" : URL
//							// Those below only in the case of transcript markers
//						"audio" : String,
//						"transcript" : String,
//						"transcript2" : String,
//						"timecode" : String,
//					],
//					"children" : [
//						Objects of the same sort
//					]
//				}
// ASSUMES:  Color Legend has been created and category/taxonomy bound to Markers

function dhp_get_marker_tree()
{
	$projectID = $_POST['project'];
	$index = $_POST['index'];

		// initialize result array
	$json_Object = array();

	$mQuery = new DHPressMarkerQuery($projectID);
	$projObj = $mQuery->projObj;
	$eps = $mQuery->projSettings->eps[$index];

		// Prepare for fetching markers' children pointer
	$childrenMote = $projObj->getMoteByName($eps->settings->children);
	$childrenDelim = $childrenMote->delim;
	$childrenCF = $childrenMote->cf;
	if (is_null($childrenCF)) {
		trigger_error("Tree view children assigned to unknown mote");
		die("Tree view children assigned to unknown mote");
	}

		// Get the Legend info for this Tree view's Legend data
		// We will assume that Legend has been created and category/taxonomy bound to Markers
	$colorCF = $eps->settings->color;
	if ($colorCF != '' && $colorCF != 'disable') {
		$colorCF = $projObj->getCustomFieldForMote($colorCF);
		if (is_null($colorCF)) {
			trigger_error("Tree view color assigned to unknown mote");
			die("Tree view color assigned to unknown mote");
		}
			// Create a legend for the color values
		$term = get_term_by('name', $eps->settings->color, $mQuery->rootTaxName);
		if ($term) {
			array_push($json_Object, dhp_get_category_vals($term, $mQuery->rootTaxName));
		}
	}

		// Ensure that any new content requested from markers is not redundant
	$mQuery->selectContent = array_unique($mQuery->selectContent);

		// Begin with head node
	$markers = dhp_create_tree_node($eps->settings->head, $mQuery, $childrenCF, $childrenDelim);

	array_push($json_Object, $markers);

	die(json_encode($json_Object));
} // dhp_get_marker_tree()


// ====================== AJAX Functions ======================

add_action( 'wp_ajax_dhpSaveProjectSettings', 'dhp_save_project_settings' );

// PURPOSE:	Called by JS code on page to save the settings (constructed by JS) for the Project
// ASSUMES:	Project ID encoded in string

function dhp_save_project_settings()
{
	$settings =  $_POST['settings'];
	$dhp_projectID = $_POST['project'];

	update_post_meta($dhp_projectID, 'project_settings', $settings);

		// Ajax call must terminate with "die"
	die('saving... '. $settings);
} // dhp_save_project_settings()


// PURPOSE:	Initialize the taxonomy terms for a single legend
// INPUT:	$mArray = array of unique values for mote
//			$parent_id = ID of head tax term
//			$projRootTaxName = root taxonomy term for Project
// RETURNS:	array of taxonomic terms belonging to $mote_name

function dhp_initialize_taxonomy($mArray, $parent_id, $projRootTaxName)
{
	$args = array('parent' => $parent_id);

		// Loop through array and create terms with parent(mote_name) for non-empty values
	foreach ($mArray as $value) {
		if (!is_null($value) && $value != '') {
				// WP's term_exists() function doesn't escape slash characters!
				// 	Unlike wp_insert_term() and wp_update_term()!
	   		$termIs = term_exists(addslashes($value), $projRootTaxName, $parent_id);
	   			//debug
	   		if(!$termIs) {
	   			//if term doesn't exist, create
	   			wp_insert_term($value, $projRootTaxName, $args);
	   		} else {
	   			//update term using id
	   			wp_update_term($termIs->term_id, $projRootTaxName, $args);
	   		}
	   	}
	}
} // dhp_initialize_taxonomy()

// PURPOSE: To associate taxonomic terms with Markers in this Project with corresponding values
// INPUT: 	$projObj = Object of DHPressProject class
//			$custom_field = custom field defined for Project's markers
//			$parent_id = ID of head term of taxonomy
//			$rootTaxName = name of root for all taxonomies belonging to this project

function dhp_bind_tax_to_markers($projObj, $custom_field, $parent_id, $rootTaxName, $mote_delim)
{
		// Now (re)create all subterms
	$loop = $projObj->setAllMarkerLoop();
	while ( $loop->have_posts() ) : $loop->the_post();
		$marker_id = get_the_ID();
		$tempMoteValue = get_post_meta($marker_id, $custom_field, true);

			// ignore empty or null values
		if (!is_null($tempMoteValue) && $tempMoteValue != '') {
			$tempMoteArray = array();
			if ($mote_delim) {
				$tempMoteArray = explode($mote_delim, $tempMoteValue );
			} else {
				$tempMoteArray = array($tempMoteValue);
			}
			$theseTerms = array();
			foreach ($tempMoteArray as $value) {
					// Since we are specifying $parent_id, term_exists() will return 0/NULL or hash
				$term = term_exists($value, $rootTaxName, $parent_id);
	   		 	if ($term !== 0 && $term !== null) {
	   		 		array_push($theseTerms, intval($term['term_id']));
	   		 	}
			}
				// Ensure that marker is tagged with category terms for this mote
			wp_set_object_terms($marker_id, $theseTerms, $rootTaxName, true);
			// wp_set_post_terms($marker_id, $theseTerms, $rootTaxName, true);
		}
	endwhile;
	delete_option("{$rootTaxName}_children");
} // dhp_bind_tax_to_markers()


// creates terms in taxonomy when a legend is created
add_action( 'wp_ajax_dhpGetLegendValues', 'dhp_get_legend_vals' );

// PURPOSE:	Handle Ajax call to retrieve Legend values; create if does not exist already
// RETURNS:	Array of unique values/tax-terms as JSON object
//			This array includes the "head term" (legend/mote name)

function dhp_get_legend_vals()
{
	$mote_name 		= $_POST['moteName'];
	$mote_delim		= $_POST['delim'];
	$custom_field 	= $_POST['customField'];
	$projectID 		= $_POST['project'];

		// Nullify empty string or space
	if ($mote_delim == '' || $mote_delim == ' ') { $mote_delim = null; }

	$projObj      = new DHPressProject($projectID);
	$rootTaxName  = $projObj->getRootTaxName();

		// Does term have to be created? -- Do all the work if so
	if (!term_exists($mote_name, $rootTaxName)) {
		wp_insert_term($mote_name, $rootTaxName);
		$parent_term = get_term_by('name', $mote_name, $rootTaxName);
		$parent_id = $parent_term->term_id;

			// Get unique values used by the related custom field
		$mArray = $projObj->getCustomFieldUniqueDelimValues($custom_field, $mote_delim);

			// Initialize terms with mArray
		dhp_initialize_taxonomy($mArray, $parent_id, $rootTaxName);

			// Bind project's markers to the taxonomic terms
		dhp_bind_tax_to_markers($projObj, $custom_field, $parent_id, $rootTaxName, $mote_delim);
	} else {
		$parent_term = get_term_by('name', $mote_name, $rootTaxName);
		$parent_id = $parent_term->term_id;
	}

		// Find all of the terms derived from mote (parent/head term) in the Project's taxonomy
	$parent_terms_to_exclude = get_terms($rootTaxName, 'parent=0&orderby=term_group&hide_empty=0');

		// Create comma-separated string listing terms derived from other motes
	$exclude_string='';
	$initial = true;
	foreach ( $parent_terms_to_exclude as $term ) {
		if($term->term_id != $parent_id) {
			if(!$initial) {
				$exclude_string.=',';
			}
			$exclude_string.= $term->term_id;
			$initial = false;
		}
	}

		// Get all taxonomic terms for project, excluding all other motes
	$terms_loaded = get_terms($rootTaxName, 'exclude_tree='.$exclude_string.'&orderby=term_group&hide_empty=0');
 	$t_count = count($terms_loaded);

 		// Parse icon_url data from the description metadata
 	if ($t_count > 0) {
   		foreach ($terms_loaded as $term) {
			$term->icon_url = $term->description;
		}
	}

	$results = $terms_loaded;

	die(json_encode($results));
} // dhp_get_legend_vals()


add_action( 'wp_ajax_dhpSaveLegendValues', 'dhp_save_legend_vals' );

// PURPOSE:	Handle Ajax function to create or save terms associated with values defined
//			by a mote in a Project (Saving results of Configure Legend function)
// INPUT:	$_POST['project'] = ID of Project
//			$_POST['mote_name'] = name of mote (which is also head term/Legend name)
//			$_POST['terms'] = flat array of mote/legend values
// NOTES:	This function only expects and saves the parent, term_id, term_order and icon_url fields

function dhp_save_legend_vals()
{
	$mote_parent = $_POST['mote_name'];
	$projectID = $_POST['project'];

		// I don't know why terms array can be read directly without JSON decode
	$project_terms = $_POST['terms'];

		// Convert mote_parent to id
	$projRootTaxName = DHPressProject::ProjectIDToRootTaxName($projectID);

	foreach ($project_terms as $term) {
		// $term_name      = $term['name'];	// name not passed in

		$parent_term_id = intval($term['parent']);
		$term_id        = intval($term['term_id']);
		$term_order     = intval($term['term_order']);

		$updateArgs = array('parent' => $parent_term_id, 'term_group' =>  $term_order, 'description' => $term['icon_url']);

			// Update term settings
		wp_update_term($term_id, $projRootTaxName, $updateArgs);
	}
	delete_option("{$projRootTaxName}_children");

		// Taxonomy must be reassociated with Markers because user may have added parent terms
		//	or changed hierarchy
	// $projObj      = new DHPressProject($projectID);
	// dhp_bind_tax_to_markers($projObj, $custom_field, $parent_id, $projRootTaxName, $mote_delim);

	die('');
} // dhp_save_legend_vals()


add_action( 'wp_ajax_dhpRebuildLegendValues', 'dhp_rebuild_legend_vals' );

// PURPOSE:	Handle rebuilding taxonomy (gather custom field values and reassociate with Markers)
// INPUT:	$_POST['project'] = ID of Project
//			$_POST['newTerm'] = name of taxonomy term to add
//			$_POST['legendName'] = name of parent term (mote/Legend) under which it should be added
// RETURNS:	ID of new term

function dhp_rebuild_legend_vals()
{
	$mote_name 		= $_POST['moteName'];
	$custom_field 	= $_POST['customField'];
	$mote_delim		= $_POST['delim'];
	$projectID 		= $_POST['project'];

	$results		= array();

		// Nullify empty string or space
	if ($mote_delim == '' || $mote_delim == ' ') { $mote_delim = null; }

	$projObj      = new DHPressProject($projectID);
	$rootTaxName  = $projObj->getRootTaxName();

		// Has term already been created? -- Do all the work if not
	if (!term_exists($mote_name, $rootTaxName)) {
		$results['existed'] = false;
		wp_insert_term($mote_name, $rootTaxName);
		$parent_term = get_term_by('name', $mote_name, $rootTaxName);
		$parent_id = $parent_term->term_id;
	} else {
		$results['existed'] = true;
		$parent_term = get_term_by('name', $mote_name, $rootTaxName);
		$parent_id = $parent_term->term_id;
			// Empty out any pre-existing subterms in this taxonomy ??
		wp_update_term($parent_id, $rootTaxName);

			// Now delete any Category/Legend values that exist
		$delete_children = get_term_children($parent_id, $rootTaxName);
		if ($delete_children != WP_Error) {
			$results['deletedCount'] = count($delete_children);
			foreach ($delete_children as $delete_term) {
				wp_delete_term($delete_term, $rootTaxName);
			}
		} else {
			die('Get term fatal error: '.$delete_children);
		}
	}
	$results['parentID']= $parent_id;

		// Get unique values used by the related custom field
	$mArray = $projObj->getCustomFieldUniqueDelimValues($custom_field, $mote_delim);
	$results['values'] = $mArray;

		// Initialize terms with mArray
	dhp_initialize_taxonomy($mArray, $parent_id, $rootTaxName);

		// Bind project's markers to the taxonomic terms
	dhp_bind_tax_to_markers($projObj, $custom_field, $parent_id, $rootTaxName, $mote_delim);

	die(json_encode($results));
} // dhp_rebuild_legend_vals()


add_action( 'wp_ajax_dhpCreateTermInTax', 'dhp_create_term_in_tax' );

// PURPOSE:	Handle adding new terms to taxonomy (that don't pre-exist in Marker data)
// INPUT:	$_POST['project'] = ID of Project
//			$_POST['newTerm'] = name of taxonomy term to add
//			$_POST['legendName'] = name of parent term (mote/Legend) under which it should be added
// RETURNS:	Array of related data, inc. ID of new term

function dhp_create_term_in_tax()
{
	$projectID 			= $_POST['project'];
	$dhp_term_name		= $_POST['newTerm'];
	$parent_term_name	= $_POST['legendName'];

		// First get Term/Tax info for the Legend (assoc w/this project)
	$projRootTaxName = DHPressProject::ProjectIDToRootTaxName($projectID);
	$parent_term = term_exists($parent_term_name, $projRootTaxName);
	$parent_term_id = $parent_term['term_id'];
	$args = array( 'parent' => $parent_term_id );

	$results = array();
	$results['rootTaxName'] = $projRootTaxName;
	$results['parent'] = $parent_term;
	$results['parentID'] = $parent_term_id;

		// make sure the new term doesn't already exist
	$testTerm = term_exists($dhp_term_name, $projRootTaxName, $parent_term_id);
	if ($testTerm !== 0 && $testTerm !== null) {
		$results['termID'] = 0;
		$results['debug'] = $testTerm['term_id'];
	} else {
			// create new term
		$newTerm = wp_insert_term($dhp_term_name, $projRootTaxName, $args);
		$results['newTerm'] = $newTerm;
		if ($newTerm == WP_Error) {
			// trigger_error("WP will not create new term ".$dhp_term_name." in taxonomy".$parent_term_name);
			$results['termID'] = 0;
		} else {
			$results['termID'] = $newTerm['term_id'];

				// Clear term taxonomy
			delete_option("{$projRootTaxName}_children");
		}
	}

	die(json_encode($results));
} // dhp_create_term_in_tax()


add_action( 'wp_ajax_dhpDeleteHeadTerm', 'dhp_delete_head_term' );

// PURPOSE:	Delete taxonomic terms in Project and all terms derived from it (as parent)
// INPUT:	$_POST['project'] = ID of Project
//			$_POST['term_name'] = name of taxonomy head term to delete

function dhp_delete_head_term()
{
	$projectID = $_POST['project'];
	$dhp_term_name = $_POST['term_name'];
	$dhp_project = get_post($projectID);
	$dhp_project_slug = $dhp_project->post_name;

		// By default (mote has no corresponding Legend)
	$dhp_delete_children = array();

	$projRootTaxName = DHPressProject::ProjectIDToRootTaxName($projectID);
		// Get ID of term to delete -- don't do anything more if it doesn't exist
	$dhp_delete_parent_term = get_term_by('name', $dhp_term_name, $projRootTaxName);
	if ($dhp_delete_parent_term) {
		$dhp_delete_parent_id = $dhp_delete_parent_term->term_id;
			// Must gather all children and delete them too (first!)
		$dhp_delete_children = get_term_children($dhp_delete_parent_id, $projRootTaxName);
		if ($dhp_delete_children != WP_Error) {
			foreach ($dhp_delete_children as $delete_term) {
				wp_delete_term($delete_term, $projRootTaxName);
			}
		}
		wp_delete_term($dhp_delete_parent_id, $projRootTaxName);
	}

	die(json_encode($dhp_delete_children));
} // dhp_delete_head_term()


// Enable for both editing and viewing

add_action('wp_ajax_dhpGetPostContent', 'dhp_get_post_content');
add_action('wp_ajax_nopriv_dhpGetPostContent', 'dhp_get_post_content');

// PURPOSE: Handle Ajax call to fetch the post-view data for a specific marker
// INPUT:	$_POST['marker_id'] = ID of Marker post
//			$_POST['proj_id'] = ID of Project post
// RETURNS:	JSON object of marker data

function dhp_get_post_content()
{
	$marker_id = $_POST['marker_id'];
	$proj_id = $_POST['proj_id'];

	$mQuery = new DHPressMarkerQuery($proj_id);

		// modify select contents so that all post motes are included
	foreach ($mQuery->projSettings->views->post->content as $theMote) {
		array_push($mQuery->selectContent, $theMote);
	}
	$pTitle = $mQuery->projSettings->views->post->title;
	if ($pTitle && $pTitle !== '' && $pTitle !== 'disable') {
		array_push($mQuery->selectContent, $pTitle);
	}
	$mQuery->selectContent = array_unique($mQuery->selectContent);

		// Construct a pseudo marker

		// Feature will hold properties and some other values for each marker
	$thisFeature = array();

		// Most data goes into properties field
	$thisFeaturesProperties = $mQuery->getMarkerProperties($marker_id);

		// Store all of the properties
	$thisFeature['properties'] = $thisFeaturesProperties;

	die(json_encode($thisFeature));
} // dhp_get_post_content()


// Enable for both editing and viewing

add_action('wp_ajax_dhpGetTaxContent', 'dhp_get_tax_content');
add_action('wp_ajax_nopriv_dhpGetTaxContent', 'dhp_get_tax_content');

// PURPOSE: Handle Ajax call to fetch the tax-view data for a specific marker
// INPUT:	$_POST['marker_id'] = ID of Marker post
//			$_POST['proj_id'] = ID of Project post
// RETURNS:	JSON object of marker data

function dhp_get_tax_content()
{
	$marker_id = $_POST['marker_id'];
	$proj_id = $_POST['proj_id'];

	$mQuery = new DHPressMarkerQuery($proj_id);

		// modify select contents so that all post motes are included
	foreach ($mQuery->projSettings->views->transcript->content as $theMote) {
		array_push($mQuery->selectContent, $theMote);
	}
	$mQuery->selectContent = array_unique($mQuery->selectContent);

		// Construct a pseudo marker

		// Feature will hold properties and some other values for each marker
	$thisFeature = array();

		// Most data goes into properties field
	$thisFeaturesProperties = $mQuery->getMarkerProperties($marker_id);

		// Store all of the properties
	$thisFeature['properties'] = $thisFeaturesProperties;

	die(json_encode($thisFeature));
} // dhp_get_tax_content()


// Enable for both editing and viewing

add_action('wp_ajax_dhpGetTranscriptClip', 'dhp_get_transcript_json');
add_action('wp_ajax_nopriv_dhpGetTranscriptClip', 'dhp_get_transcript_json');

// PURPOSE:	Retrieve section of text file for transcript
// INPUT:	$tran = full text of transcript
//			$clip = String containing from-end time of segment
// RETURNS:	Excerpt of $tran within the time frame specified by $clip (not encoded as UTF8)
//			This text must begin with the beginning timestamp and end with the final timestamp

function dhp_get_transcript_clip($transcript, $clip)
{
	$codedTranscript  = utf8_encode($transcript);
	$clipArray        = explode("-", $clip);
	$clipStart        = mb_strpos($codedTranscript, $clipArray[0]);
	$clipEnd          = mb_strpos($codedTranscript, $clipArray[1]);
		// length must include start and end timestamps
	$clipLength       = ($clipEnd + strlen($clipArray[1]) + 1) - ($clipStart - 1) + 1;

	if (($clipStart !== false) && ($clipEnd !== false)) {
		$codedClip  = mb_substr($codedTranscript, $clipStart-1, $clipLength, 'UTF-8');
		$returnClip = utf8_decode($codedClip);
	}
	else {
		$returnClip = array('clipStart'=> $clipStart,'clipEnd'=> $clipEnd, 'clipArrayend' => $clipArray[1]);
	}
	return $returnClip;
} // dhp_get_transcript_clip()


// PURPOSE:	Load the contents of a transcript file
// INPUT:	$fileUrl = the URL to the file
// RETURNS:	The data in file, if successful

function dhp_load_transcript_from_file($fileUrl)
{
	$content = @file_get_contents($fileUrl);
	if ($content === false) {
		trigger_error("Cannot load transcript file ".$fileUrl);
	}
	return $content;
} // dhp_load_transcript_from_file()


// PURPOSE: AJAX function to retrieve section of transcript when viewing a Marker
// INPUT:	$_POST['project'] = ID of Project post
//			$_POST['transcript'] = URL to file containing contents of transcript
//			$_POST['timecode'] = timestamp specifying excerpt of transcript to return
// RETURNS:	JSON-encoded section of transcription

function dhp_get_transcript_json()
{
	$dhp_project = $_POST['project'];
	$dhp_transcript_field = $_POST['transcript'];
	$dhp_clip = $_POST['timecode'];

	$dhp_transcript = dhp_load_transcript_from_file($dhp_transcript_field);
	$dhp_transcript_clip = dhp_get_transcript_clip($dhp_transcript,$dhp_clip);

	die(json_encode($dhp_transcript_clip));
} // dhp_get_transcript_json()


// Enable for both editing and viewing

add_action( 'wp_ajax_dhpGetTaxTranscript', 'dhp_get_tax_transcript' );
add_action( 'wp_ajax_nopriv_dhpGetTaxTranscript', 'dhp_get_tax_transcript');

// PURPOSE: AJAX function to retrieve entire transcript when viewing a taxonomy archive page
// INPUT:	$_POST['project'] = ID of Project
//			$_POST['transcript'] = (end of URL) to file containing contents of transcript; slug based on mote value
//			$_POST['tax_term'] = the root taxonomic term that marker must match (based on Project ID)
// RETURNS:	null if not found, or if not associated with transcript; otherwise, JSON-encoded complete transcript with fields:
//				audio, video = data from custom fields
//				settings = entry-point settings for transcript
//				transcript, transcript2 = transcript data itself for each of 2 possible transcripts

function dhp_get_tax_transcript()
{
	$projectID     = $_POST['project'];
	$dhp_tax_term  = $_POST['tax_term'];
	$transFile     = $_POST['transcript'];

		// Search for Marker (which will have transaction data) matching taxonomic data
	$args = array(
		'posts_per_page' => 1,
		'post_type' => 'dhp-markers',
		'tax_query' => array(
			array(
				'taxonomy' => $dhp_tax_term,
				'field' => 'slug',
				'terms' => $transFile
			)
		)
	);
		// Get the result and its metadata (fail if not found)
	$first_marker = get_posts($args);
	if (is_null($first_marker) || (count($first_marker) == 0)) {
		die('');
	}
	$marker_meta = get_post_meta($first_marker[0]->ID);

	$projObj      = new DHPressProject($projectID);
	$rootTaxName  = $projObj->getRootTaxName();
	$proj_settings = $projObj->getAllSettings();

		// Store results to return here
	$dhp_object = array();

		// set defaults
	$dhp_object['audio'] = $dhp_object['video'] = $dhp_object['transcript'] = $dhp_object['transcript2'] = null;

		// What custom fields holds appropriate data? Fetch from Marker
	$dhp_audio_mote = null;
	if ($proj_settings->views->transcript->audio && $proj_settings->views->transcript->audio != '') {
		$dhp_audio_mote = $projObj->getMoteByName($proj_settings->views->transcript->audio);
		$dhp_object['audio'] = $marker_meta[$dhp_audio_mote->cf][0];
	}
	$dhp_video_mote = null;
	if ($proj_settings->views->transcript->video && $proj_settings->views->transcript->video != '') {
		$dhp_video_mote = $projObj->getMoteByName($proj_settings->views->transcript->video);
		$dhp_object['video'] = $marker_meta[$dhp_video_mote->cf][0];
	}

	if ($proj_settings->views->transcript->transcript && $proj_settings->views->transcript->transcript != '') {
		$dhp_transcript_mote = $projObj->getMoteByName($proj_settings->views->transcript->transcript);
		$dhp_transcript_cfield = $dhp_transcript_mote->cf;
		$dhp_transcript = $marker_meta[$dhp_transcript_cfield][0];
		if ($dhp_transcript != 'none') {
			$dhp_transcript = dhp_load_transcript_from_file($dhp_transcript);
			$dhp_object['transcript'] = $dhp_transcript;
		}
	}

		// if project has 2nd transcripts
	if ($proj_settings->views->transcript->transcript2 && $proj_settings->views->transcript->transcript2 != '') {
		$dhp_transcript_mote = $projObj->getMoteByName($proj_settings->views->transcript->transcript2);
		$dhp_transcript_cfield = $dhp_transcript_mote->cf;
		$dhp_transcript = $marker_meta[$dhp_transcript_cfield][0];
		if ($dhp_transcript != 'none') {
			$dhp_transcript = dhp_load_transcript_from_file($dhp_transcript);
			$dhp_object['transcript2'] = $dhp_transcript;
		}
	}

	die(json_encode($dhp_object));
} // dhp_get_tax_transcript()


add_action( 'wp_ajax_dhpAddCustomField', 'dhp_add_custom_field' );

// PURPOSE:	Handle Ajax call to create new custom field with particular value for all Markers in Project
// INPUT:	$_POST['project'] = ID of Project
//			$_POST['field_name'] = name of new custom field to add
//			$_POST['field_value'] = default value to set in all markers belonging to Project

function dhp_add_custom_field()
{
	$dhp_project = $_POST['project'];
	$dhp_custom_field_name = $_POST['field_name'];
	$dhp_custom_field_value = $_POST['field_value'];

	$args = array( 'post_type' => 'dhp-markers', 'meta_key' => 'project_id','meta_value'=>$dhp_project, 'posts_per_page' => -1 );
	$loop = new WP_Query( $args );
	while ( $loop->have_posts() ) : $loop->the_post();

		$marker_id = get_the_ID();
		add_post_meta($marker_id, $dhp_custom_field_name, $dhp_custom_field_value, true);

	endwhile;
	
	die();
} // dhp_add_custom_field()


add_action( 'wp_ajax_dhpCreateCustomFieldFilter', 'dhp_create_custom_field_filter' );

// PURPOSE: Handle Ajax call to add the value of custom fields that match "filter condition"
// INPUT:	$_POST['project'] = ID of Project
//			$_POST['field_name'] = name of custom field
//			$_POST['field_value'] = value to set of custom field
//			$_POST['filter_key'] = name of field on which to match
//			$_POST['filter_value'] = value of field to match
// TO DO:	Rename function? dhpSetFieldByCustomFieldFilter?

function dhp_create_custom_field_filter()
{
	$dhp_project 			= $_POST['project'];
	$dhp_custom_field_name 	= $_POST['field_name'];
	$dhp_custom_field_value	= $_POST['field_value'];
	$dhp_custom_filter_key 	= $_POST['filter_key'];
	$dhp_custom_filter_value = $_POST['filter_value'];

	$args = array( 
		'post_type' => 'dhp-markers', 
		'posts_per_page' => -1,
		'meta_query' => array(
			'relation' => 'AND',
			array(
				'key' => 'project_id',
				'value' => $dhp_project
			),
			array(
				'key' => $dhp_custom_filter_key,
				'value' => $dhp_custom_filter_value
			)
		)
	);

	$loop = new WP_Query( $args );
	while ( $loop->have_posts() ) : $loop->the_post();

		$marker_id = get_the_ID();
		add_post_meta($marker_id, $dhp_custom_field_name, $dhp_custom_field_value, true);
				
	endwhile;
	
	die();
} // dhp_create_custom_field_filter()


add_action('wp_ajax_dhpUpdateCustomFieldFilter', 'dhp_update_custom_field_filter');

// PURPOSE: To modify the value of a field (based on string replace) in all of a Project's Markers if
//			it satisfies query condition and currently matches a certain value (like Find & Replace)
// INPUT:	$_POST['project'] = ID of Project
//			$_POST['field_name'] = name of custom field we wish to change
//			$_POST['current_value'] = custom field must have this field to be changed
//			$_POST['new_value'] = new value to set
//			$_POST['filter_key'] = custom field upon which search/filter is based
//			$_POST['filter_value'] = value that must be in custom field
// RETURNS:	Number of markers whose values were changed

function dhp_update_custom_field_filter()
{
	$dhp_project 				= $_POST['project'];
	$dhp_custom_field_name		= $_POST['field_name'];
	$dhp_custom_current_value	= $_POST['current_value'];
	$dhp_custom_new_value		= $_POST['new_value'];
	$dhp_custom_filter_key		= $_POST['filter_key'];
	$dhp_custom_filter_value 	= $_POST['filter_value'];

	$args = array( 
		'post_type' => 'dhp-markers', 
		'posts_per_page' => -1,
		'meta_query' => array(
			'relation' => 'AND',
			array(
				'key' => 'project_id',
				'value' => $dhp_project
			),
			array(
				'key' => $dhp_custom_filter_key,
				'value' => $dhp_custom_filter_value
			)
		)
	);
	$dhp_count=0;
	$loop = new WP_Query( $args );
	while ( $loop->have_posts() ) : $loop->the_post();
		$dhp_count++;
		$marker_id = get_the_ID();
		if($dhp_custom_field_name=='the_content') {

			$tempPostContent = get_the_content();
			$new_value = str_replace($dhp_custom_current_value, $dhp_custom_new_value, $tempPostContent);
			
			$new_post = array();
			$new_post['ID'] = $marker_id;
			$new_post['post_content'] = $new_value;
			wp_update_post( $new_post );
		}
		else {
			$temp_value = get_post_meta( $marker_id, $dhp_custom_field_name, true );
			//replaces string within the value not the whole value
			$new_value = str_replace($dhp_custom_current_value, $dhp_custom_new_value, $temp_value);
			update_post_meta($marker_id, $dhp_custom_field_name, $new_value);
		}
	endwhile;
	
	die(json_encode($dhp_count));
} // dhp_update_custom_field_filter()


add_action( 'wp_ajax_dhpReplaceCustomFieldFilter', 'dhp_replace_custom_field_filter' );

// PURPOSE: To replace the value of a field in all of a Project's Markers if
//			it satisfies query condition and currently matches a certain value
// INPUT:	$_POST['project'] = ID of Project
//			$_POST['field_name'] = name of custom field we wish to change
//			$_POST['new_value'] = new value which will entirely replace previous value
//			$_POST['filter_key'] = custom field upon which search/filter is based
//			$_POST['filter_value'] = value that must be in custom field
// RETURNS:	Number of markers whose values were changed

function dhp_replace_custom_field_filter()
{
	$dhp_project 				= $_POST['project'];
	$dhp_custom_field_name		= $_POST['field_name'];
	$dhp_custom_new_value		= $_POST['new_value'];
	$dhp_custom_filter_key		= $_POST['filter_key'];
	$dhp_custom_filter_value 	= $_POST['filter_value'];

	$args = array( 
		'post_type' => 'dhp-markers', 
		'posts_per_page' => -1,
		'meta_query' => array(
			'relation' => 'AND',
			array(
				'key' => 'project_id',
				'value' => $dhp_project
			),
			array(
				'key' => $dhp_custom_filter_key,
				'value' => $dhp_custom_filter_value
			)
		)
	);
	$dhp_count=0;
	$loop = new WP_Query( $args );
	while ( $loop->have_posts() ) : $loop->the_post();
		$dhp_count++;
		$marker_id = get_the_ID();
		if($dhp_custom_field_name=='the_content') {
			$tempPostContent = get_the_content();
			$new_value = $dhp_custom_new_value;

			$new_post = array();
			$new_post['ID'] = $marker_id;
			$new_post['post_content'] = $new_value;
			wp_update_post( $new_post );
		}
		else {
			$temp_value = get_post_meta( $marker_id, $dhp_custom_field_name, true );
			//replaces string within the value not the whole value
			$new_value = $dhp_custom_new_value;
			update_post_meta($marker_id, $dhp_custom_field_name, $new_value);
		}
	endwhile;

	die(json_encode($dhp_count));
} // dhp_replace_custom_field_filter()


add_action( 'wp_ajax_dhpGetFieldValues', 'dhp_get_field_values' );

// PURPOSE: Handle Ajax call to get values for custom field
// INPUT:	$_POST['project'] = ID of Project
//			$_POST['field_name'] = name of custom field
// RETURNS:	JSON Object of array of all unique values for the field in the project

function dhp_get_field_values()
{
	$projectID 	= $_POST['project'];
	$fieldName 	= $_POST['field_name'];
	$projObj 	= new DHPressProject($projectID);
	$tempValues	= $projObj->getCustomFieldUniqueValues($fieldName);

	die(json_encode($tempValues));
} // dhp_get_field_values()


add_action( 'wp_ajax_dhpFindReplaceCustomField', 'dhp_find_replace_custom_field' );

// PURPOSE: Handle Ajax function to do string replace on matching values in a custom field in Project
// INPUT:	$_POST['project'] = ID of Project
//			$_POST['field_name'] = name of custom field
//			$_POST['find_value'] = field must match this value to be replaced
//			$_POST['replace_value'] = value to use for string replace in field
// RETURNS:	Number of markers whose values were changed

function dhp_find_replace_custom_field()
{
	$projectID = $_POST['project'];
	$dhp_custom_field_name = $_POST['field_name'];
	$dhp_custom_find_value = $_POST['find_value'];
	$dhp_custom_replace_value = $_POST['replace_value'];
	$projObj = new DHPressProject($projectID);

	$loop = $projObj->setAllMarkerLoop();
	$dhp_count=0;
	while ( $loop->have_posts() ) : $loop->the_post();
		$dhp_count++;
		$marker_id = get_the_ID();
		if($dhp_custom_field_name=='the_content') {
			$tempPostContent = get_the_content();
			$new_value = str_replace($dhp_custom_find_value, $dhp_custom_replace_value, $tempPostContent);

			$new_post = array();
			$new_post['ID'] = $marker_id;
			$new_post['post_content'] = $new_value;
			wp_update_post( $new_post );
		}
		else {
			$temp_value = get_post_meta( $marker_id, $dhp_custom_field_name, true );
			//replaces string within the value not the whole value
			$new_value = str_replace($dhp_custom_find_value, $dhp_custom_replace_value, $temp_value);
			update_post_meta($marker_id, $dhp_custom_field_name, $new_value);
		}

	endwhile;
	
	die(json_encode($dhp_count));
} // dhp_find_replace_custom_field()


add_action( 'wp_ajax_dhpDeleteCustomField', 'dhp_delete_custom_field' );

// PURPOSE:	Handle Ajax query to remove specific custom field from all markers of a Project
// INPUT:	$_POST['project'] = ID of Project
//			$_POST['field_name'] = name of custom field

function dhp_delete_custom_field()
{
	$projectID = $_POST['project'];
	$dhp_custom_field_name = $_POST['field_name'];
	$projObj = new DHPressProject($projectID);
	
	$loop = $projObj->setAllMarkerLoop();
	while ( $loop->have_posts() ) : $loop->the_post();

		$marker_id = get_the_ID();
		delete_post_meta($marker_id, $dhp_custom_field_name);

	endwhile;
	
	die();
} // dhp_delete_custom_field()


add_action( 'wp_ajax_dhpGetCustomFields', 'dhp_get_custom_fields' );

// PURPOSE:	Handle Ajax call to retrieve all custom fields defined for a Project
// INPUT:	$_POST['project'] = ID of Project
// RETURNS: JSON Object of array of all custom fields

function dhp_get_custom_fields()
{
	$projectID = $_POST['project'];
	$projObj   = new DHPressProject($projectID);
	
	$dhp_custom_fields = $projObj->getAllCustomFieldNames();
	die(json_encode($dhp_custom_fields));
} // dhp_get_custom_fields()


// PURPOSE: Find all PNG images attached to the given post
// INPUT:   pID is the ID of the post
// RETURNS: Array of [ ]

function dhp_get_attached_PNGs($pID)
{
	$pngs = array();

	$images = get_attached_media('image/png', $post->ID);
	foreach($images as $image) {
	    $onePNG = array();
	    $onePNG['id'] = $image->ID;
	    $onePNG['title'] = $image->post_title;
	    $imageData = wp_get_attachment_image_src($image->ID);
	    $onePNG['url'] = $imageData[0];
	    $onePNG['w'] = $imageData[1];
	    $onePNG['h'] = $imageData[2];
	    array_push($pngs, $onePNG);
	}
	return $pngs;
} // dhp_get_attached_PNGs()


// PURPOSE:	Verify that all timestamps can be found in transcription file
// INPUT:	$transcMoteName = name of mote for a transcription setting
// RETURNS:	Error string or ''

function dhp_verify_transcription($projObj, $projSettings, $transcMoteName)
{
		// don't check anything if the setting is disabled
	if ($transcMoteName == '' || $transcMoteName == 'disable') {
		return '';
	}

	$result = '';
	$tcMote = $projSettings->views->transcript->timecode;

		// Problem if timecode not defined
	if ($tcMote == null || $tcMote == '' || $tcMote == 'disable') {
		$result = '<p>You have not specified the Timestamp setting for the Transcription (despite setting Transcript motes).</p>';
	} else {
		$numErrors = 0;

		$tcMoteDef = $projObj->getMoteByName($tcMote);
		$transMoteDef = $projObj->getMoteByName($transcMoteName);

		$loop = $projObj->setAllMarkerLoop();

		while ($loop->have_posts()) : $loop->the_post();
			$error = false;
			$marker_id = get_the_ID();

				// Get this marker's values for 
			$timecode = get_post_meta($marker_id, $tcMoteDef->cf, true);
			$transFile= get_post_meta($marker_id, $transMoteDef->cf, true);

				// Skip check if either one missing
			if ($timecode != null && $timecode != '' && $transFile != null && $transFile != '' && $transFile !== 'none') {
					// Don't check invalid timestamps -- they should have already been reported
				if (preg_match("/\d\d\:\d\d\:\d\d\.\d\d?-\d\d\:\d\d\:\d\d\.\d\d?/", $moteValue) === 1) {
					$content = @file_get_contents($transFile);
					if ($content == false) {
						$result .= '<p>Problem reading file '.$transFile.' </p>';
						$error = true;
					} else {
						$content  = utf8_encode($content);
						$stamps	  = explode("-", $timecode);
						$clipStart= mb_strpos($content, $stamps[0]);
						if ($clipStart == false) {
							$result .= '<p> Cannot find timestamp '.$stamps[0].' in file '.$transFile.'</p>';
							$error = true;
						}
						$clipEnd  = mb_strpos($content, $stamps[1]);
						if ($clipEnd == false) {
							$result .= '<p> Cannot find timestamp '.$stamps[1].' in file '.$transFile.'</p>';
							$error = true;
						}
					} // file contents
				} // if valid timestamp
			} // if timecode and file values
			if ($error && ++$numErrors >= 20) {
				break;
			}
		endwhile;
	}

	return $result;
} // dhp_verify_transcription()


// PURPOSE: Ensure metadata attached to category/Legend is consistent and of correct format
// INPUT:   $projObj = project object
//			$theLegend = name of mote to check
//			$checkValues = true if Legend values are to be validated
//			$makiOK = true if can use maki icons
//			$pngOK = true if can use PNG image icons

function dhp_verify_legend($projObj, $theLegend, $checkValues, $makiOK, $pngOK)
{
	if ($theLegend === null || $theLegend === '' || $theLegend === 'disable') {
		return '<p>Cannot verify unspecified legend.</p>';
	}

	$moteDef = $projObj->getMoteByName($theLegend);

	$rootTaxName  = $projObj->getRootTaxName();

		// Has Legend not been created yet?
	if (!term_exists($moteDef->name, $rootTaxName)) {
		return '<p>Legend "'.$theLegend.'" has not yet been created but must be for project to work.</p>';
	}

	$results    = '';

	if ($checkValues) {
			// Find all of the terms derived from mote (parent/head term) in the Project's taxonomy
		$parent_terms_to_exclude = get_terms($rootTaxName, 'parent=0&orderby=term_group&hide_empty=0');

			// Create comma-separated string listing terms derived from other motes
		$exclude_string='';
		$initial = true;
		foreach ($parent_terms_to_exclude as $term) {
			if($term->term_id != $parent_id) {
				if(!$initial) {
					$exclude_string .=',';
				}
				$exclude_string .= $term->term_id;
				$initial = false;
			}
		}

			// Get all taxonomic terms for project, excluding all other motes
		$terms_loaded = get_terms($rootTaxName, 'exclude_tree='.$exclude_string.'&orderby=term_group&hide_empty=0');
	 	$t_count = count($terms_loaded);

		$usedColor  = false;
		$usedMaki   = false;
		$usedPNG 	= false;
		$mixFlagged = false;

	 		// Check visualization data (encoded in the description metadata)
	 		// 	Value must specified for all category/legend terms
			//	Ensure value is a parseable value
			//	Ensure there is not a mixture of icon and color
	 		//	Ensure only color values are used if required
	 	if ($t_count > 0) {
	   		foreach ($terms_loaded as $term) {
	   			if ($term->description == null || $term->description == '') {
	   				$results .= '<p>The value '.$term->name.' for legend '.$theLegend.' has no visual setting.</p>';
	   			} else {
					$isColor = preg_match("/^#[:xdigit:]{6}$/", $term->description);
					$isMaki = preg_match("/^.maki\-\S/", $term->description);
					$isPNG = preg_match("/^@\S/", $term->description);
					if ($isColor) {
						$usedColor = true;
						if (!$mixFlagged && ($usedMaki || $usedPNG)) {
							$results .= '<p>Illegal mixture of color and icon settings in legend '.$theLegend.'.</p>';
							$mixFlagged = true;
						}
					} elseif ($isMaki) {
						$usedMaki = true;
						if (!$makiOK) {
							$results .= '<p>The assigned Entry Point cannot use maki-icon setting '.$term->description.' for legend '.$theLegend.' value '.$term->name.'.</p>';
						} elseif ($usedColor && !$mixFlagged) {
							$results .= '<p>Illegal mixture of color and icon settings in legend '.$theLegend.'.</p>';
							$mixFlagged = true;
						}
					} elseif ($isPNG) {
						$usedPNG = true;
						if (!$pngOK) {
							$results .= '<p>The assigned Entry Point cannot use PNG image '.$term->description.' for legend '.$theLegend.' value '.$term->name.'.</p>';
						} elseif ($usedColor && !$mixFlagged) {
							$results .= '<p>Illegal mixture of color and icon settings in legend '.$theLegend.'.</p>';
							$mixFlagged = true;
						}
					} else {
						$results .= '<p>Unknown setting '.$term->description.' for legend '.$theLegend.' value '.$term->name.'.</p>';
					}
				}
			}
		}
	} // if checkValues)

	return $results;
} // dhp_verify_legend()


add_action( 'wp_ajax_dhpPerformTests', 'dhp_perform_tests' );

// PURPOSE:	Handle Ajax call to retrieve all custom fields defined for a Project
// INPUT:	$_POST['project'] = ID of Project
// RETURNS: JSON Object of array of all custom fields

function dhp_perform_tests()
{
	$projectID = $_POST['project'];
	$projObj   = new DHPressProject($projectID);
	$results   = '';

	$projSettings = $projObj->getAllSettings();

		// There will be no project settings for New project
	if (empty($projSettings)) {
		$results = 'This is a new project and cannot be verified until it is saved and Markers imported';

	} else {
			// Ensure any legends used by visualizations have been configured
			// Ensure that configured legends do not mix color and icon types
		foreach ($projSettings->eps as $ep) {
			switch ($ep->type) {
			case 'map':
					// Map Legends can be color, maki-icons or PNG
				foreach ($ep->settings->legends as $theLegend) {
					$results .= dhp_verify_legend($projObj, $theLegend, true, true, true);
				}
				break;
			case 'cards':
					// Card Legends must be color only
				$results .= dhp_verify_legend($projObj, $ep->settings->color, true, false, false);
					// all Short Text Filter Motes must have been created as Legend but values don't matter
				foreach ($ep->settings->filterMotes as $filterMote) {
					if ($filterMote->type === 'Short Text') {
						$results .= dhp_verify_legend($projObj, $filterMote, false, false, false);
					}
				}
				break;
			case 'pinboard':
					// Pinboard Legends currently support color and PNG
				foreach ($ep->settings->legends as $theLegend) {
					$results .= dhp_verify_legend($projObj, $theLegend, true, false, true);
				}
				break;
			case 'tree':
					// Tree legends currently only support color
				$results .= dhp_verify_legend($projObj, $ep->settings->color, true, false, false);
				break;
			case 'time':
					// Time legends currently only support color
				$results .= dhp_verify_legend($projObj, $ep->settings->color, true, false, false);
				break;
			case 'flow':
					// Facet Flows legends currently only require Legend existence
				foreach ($ep->settings->motes as $fMote) {
					$results .= dhp_verify_legend($projObj, $fMote, false, false, false);
				}
				break;
			case 'browser':
					// Browser legends currently only require Legend existence for Short Motes
				foreach ($ep->settings->motes as $fMote) {
					$moteDef = $projObj->getMoteByName($fMote);
					if ($moteDef->type === 'Short Text') {
						$results .= dhp_verify_legend($projObj, $fMote, false, false, false);
					}
				}
				break;
			} // switch()
		}

			// Go through markers and ensure all values are valid:
			//  Go through mote definitions and check values
			//  Stop after >= 20 errors
		$loop = $projObj->setAllMarkerLoop();
		$numErrors = 0;
		$error = false;
		$transcErrors = false;
		while ( $loop->have_posts() ) : $loop->the_post();
			$marker_id = get_the_ID();

			foreach ($projSettings->motes as $mote) {
				$moteValue = get_post_meta($marker_id, $mote->cf, true);
					// ignore empty or null values
				if (!is_null($moteValue) && $moteValue != '') {
					$error = false;
					switch ($mote->type) {
					case 'Lat/Lon Coordinates':
					case 'X-Y Coordinates':
						if (preg_match("/(-?\d+(\.?\d?)?),(\s?-?\d+(\.?\d?)?)/", $moteValue) === 0) {
							$results .= '<p>Invalid Coordinate '.$moteValue;
							$error = true;
						}
						break;
					case 'SoundCloud':
							// Just look at the beginning of the URL
						if (preg_match("!https://soundcloud\.com/\w!i", $moteValue) === 0) {
							$results .= '<p>Invalid SoundCloud URL';
							$error = true;
						}
						break;
					case 'YouTube':
							// Cannot verify because it is just a raw code
						break;
					case 'Link To':
					case 'Image':
							// Just look at beginning and end of URL
						if (preg_match("!^(https?|ftp)://[^\s]*!i", $moteValue) === 0) {
							$results .= '<p>Invalid URL';
							$error = true;
						}
						break;
					case 'Transcript':
							// Just look at beginning and end of URL
						if ($moteValue !== 'none' && (preg_match("!(https?|ftp)://!i", $moteValue) === 0 || preg_match("!\.txt$!i", $moteValue) === 0)) {
							$results .= '<p>Invalid textfile URL';
							$error = true;
							$transcErrors = true;
						}
						break;
					case 'Timestamp':
						if (preg_match("/\d\d\:\d\d\:\d\d\.\d\d?-\d\d\:\d\d\:\d\d\.\d\d?/", $moteValue) === 0) {
							$results .= '<p>Invalid Timestamp '.$moteValue;
							$error = true;
							$transcErrors = true;
						}
						break;
					case 'Pointer':
							// Only way to check would be to explode string and check existence of each
							// marker, but this would likely break the WP Query loop -- so ignore for now
						break;
					case 'Date':
						if (preg_match("/^(open|-?\d+(-(\d)+)?(-(\d)+)?)(\/(open|-?\d+(-(\d)+)?(-(\d)+)?))?$/", $moteValue) === 0) {
							$results .= '<p>Invalid Date range';
							$error = true;
						}
						break;
					} // switch
						// Add rest of error information
					if ($error) {
						$results .=  ' given for mote '.$mote->name.' (custom field '.$mote->cf.') in marker '.get_the_title().'</p>';
						$numErrors++;
					}
				} // if (!is_null)
			} // foreach
				// don't continue if excessive errors found
			if ($numErrors >= 20) {
				$results .= '<p>Stopped checking errors in Marker data because more than 20 errors have been found. Correct these and try again.</p>';
				break;
			}
		endwhile;

			// If transcript (fragmentation) source is set, ensure the category has been created
		$source = $projSettings->views->transcript->source;
		if ($source && $source !== '' && $source !== 'disable') {
			$transSrcCheck = dhp_verify_legend($projObj, $source, false, false, false);
			if ($transSrcCheck != '') {
				$results .= '<p>You have specified the Source mote '.$source.
							' for Transcription fragmentation but you have not built it yet as a category.</p>';
			}
		}

			// Check transcript data themselves -- this check is inefficient and redundant by nature
			// No previous transcription errors must have been registered!
		if (!$transcErrors) {
			$results .= dhp_verify_transcription($projObj, $projSettings, $projSettings->views->transcript->transcript);
		}

		if (!$transcErrors) {
			$results .= dhp_verify_transcription($projObj, $projSettings, $projSettings->views->transcript->transcript2);
		}

			// Are the results all clear?
		if ($results === '') {
			$results = '<p>All data on server has been examined and approved.</p>';
		} else {
			$results .= '<p>Data tests now complete.</p>';
		}
	} // if projSettings

	die($results);
} // dhp_perform_tests()


add_action( 'wp_restore_post_revision', 'dhp_project_restore_revision', 10, 2 );

// PURPOSE: Handles returning to an earlier revision of this post
// INPUT:	$post_id = ID of original post
//			$revision_id = ID of new revised post

function dhp_project_restore_revision($post_id, $revision_id)
{
	$dhp_project_settings_fields = array( 'project_settings' );

	$post     = get_post($post_id);
	$revision = get_post($revision_id);

	foreach ($dhp_project_settings_fields as $fieldID) {
		$old = get_metadata( 'post', $revision->ID, $fieldID, true);
		if ( false !== $old) {
			update_post_meta($post_id, $fieldID, $old);
		} else {
			delete_post_meta($post_id, $fieldID );
		}
	} // end foreach
} // dhp_project_restore_revision()


add_action( 'admin_enqueue_scripts', 'add_dhp_project_admin_scripts', 10, 1 );

// Custom scripts to be run on Project new/edit pages only
// PURPOSE: Prepare CSS and JS files for all page types in WP
// INPUT:	$hook = name of template file being loaded
// ASSUMES:	Other WP global variables for current page are set

function add_dhp_project_admin_scripts( $hook )
{
    global $post;

    $blog_id = get_current_blog_id();
	$dev_url = get_admin_url( $blog_id ,'admin-ajax.php');
	$plugin_folder = plugins_url('',dirname(__FILE__));
	$postID  = get_the_ID();

 		// Editing a specific project in admin panel
    if ( $hook == 'post-new.php' || $hook == 'post.php' ) {
        if ( $post->post_type == 'dhp-project' ) {
        		// Library styles
			wp_enqueue_style('jquery-ui-style', plugins_url('/lib/jquery-ui-1.11.1/themes/base/all.css', dirname(__FILE__)) );
			wp_enqueue_style('jquery-colorpicker-style', plugins_url('/lib/colorpicker/jquery.colorpicker.css',  dirname(__FILE__)),
					array('jquery-ui-style') );
			// wp_enqueue_style('wp-jquery-ui-dialog' );
			wp_enqueue_style('maki-sprite-style', plugins_url('/lib/maki/maki-sprite.css',  dirname(__FILE__)) );
				// Lastly, our plug-in specific styles
			wp_enqueue_style('dhp-admin-style', plugins_url('/css/dhp-admin.css',  dirname(__FILE__)),
					array('jquery-ui-style', 'maki-sprite-style') );

				// JavaScript libraries registered by WP
			wp_enqueue_script('jquery');
			wp_enqueue_script('underscore');

				// Will call our own versions of jquery-ui to minimize compatibility problems
			wp_enqueue_script('dhp-jquery-ui-core', plugins_url('/lib/jquery-ui-1.11.1/ui/core.js', dirname(__FILE__)), 'jquery' );
			wp_enqueue_script('dhp-jquery-ui-widget', plugins_url('/lib/jquery-ui-1.11.1/ui/widget.js', dirname(__FILE__)), 'jquery' );
			wp_enqueue_script('dhp-jquery-ui-accordion', plugins_url('/lib/jquery-ui-1.11.1/ui/accordion.js', dirname(__FILE__)), 'jquery' );
			wp_enqueue_script('dhp-jquery-ui-mouse', plugins_url('/lib/jquery-ui-1.11.1/ui/mouse.js', dirname(__FILE__)), 'jquery' );
			wp_enqueue_script('dhp-jquery-ui-button', plugins_url('/lib/jquery-ui-1.11.1/ui/button.js', dirname(__FILE__)), 'jquery' );
			wp_enqueue_script('dhp-jquery-ui-draggable', plugins_url('/lib/jquery-ui-1.11.1/ui/draggable.js', dirname(__FILE__)), 'jquery' );
			wp_enqueue_script('dhp-jquery-ui-position', plugins_url('/lib/jquery-ui-1.11.1/ui/position.js', dirname(__FILE__)), 'jquery' );
			wp_enqueue_script('dhp-jquery-ui-dialog', plugins_url('/lib/jquery-ui-1.11.1/ui/dialog.js', dirname(__FILE__)), 'jquery' );
			wp_enqueue_script('dhp-jquery-ui-accordion', plugins_url('/lib/jquery-ui-1.11.1/ui/accordian.js', dirname(__FILE__)), 'jquery' );
			wp_enqueue_script('dhp-jquery-ui-slider', plugins_url('/lib/jquery-ui-1.11.1/ui/slider.js', dirname(__FILE__)), 'jquery' );

				// JS libraries specific to DH Press
			wp_enqueue_script('jquery-nestable', plugins_url('/lib/jquery.nestable.js', dirname(__FILE__)), 'jquery' );
			wp_enqueue_script('jquery-colorpicker', plugins_url('/lib/colorpicker/jquery.colorpicker.js', dirname(__FILE__)), 'jquery' );
			wp_enqueue_script('jquery-colorpicker-en', plugins_url('/lib/colorpicker/i18n/jquery.ui.colorpicker-en.js', dirname(__FILE__)),
				array('jquery', 'jquery-colorpicker') );

				// For touch-screen mechanisms
			wp_enqueue_script('dhp-touch-punch', plugins_url('/lib/jquery.ui.touch-punch.js', dirname(__FILE__)),
				array('jquery', 'dhp-jquery-ui-widget', 'dhp-jquery-ui-mouse') );

			wp_enqueue_script('knockout', plugins_url('/lib/knockout-3.1.0.js', dirname(__FILE__)) );

				// Custom JavaScript for Admin Edit Panel
			$allDepends = array('jquery', 'underscore', 'dhp-jquery-ui-core', 'jquery-nestable', 'jquery-colorpicker',
								'knockout');
			wp_enqueue_script('dhp-project-script', plugins_url('/js/dhp-project-admin.js', dirname(__FILE__)), $allDepends );

			$pngs = dhp_get_attached_PNGs($postID);
			wp_localize_script('dhp-project-script', 'dhpDataLib', array(
				'ajax_url' => $dev_url,
				'projectID' => $postID,
				'pngImages' => $pngs
			) );

        } else if ( $post->post_type == 'dhp-markers' ) {
        	wp_enqueue_style('dhp-admin-style', plugins_url('/css/dhp-admin.css',  dirname(__FILE__) ));
        }

        // Shows list of all Project in admin panel
    } else if ( $hook == 'edit.php'  ) {
        if ( $post->post_type == 'dhp-project' ) {
			wp_enqueue_script('jquery' );
        }
    }
} // add_dhp_project_admin_scripts()


// PURPOSE: Extract DHP custom map data from Map Library so they can be rendered
// INPUT:	$mapLayers = array of EP Map layers (each containing Hash ['mapType'], ['id' = WP post ID])
// RETURNS: Array of data about map layers
// ASSUMES:	Custom Map data has been loaded into WP DB
// TO DO:	Further error handling if necessary map data doesn't exist?

function dhp_get_map_layer_data($mapLayers)
{
	$mapMetaList = array(	"dhp_map_shortname"  => "dhp_map_shortname",
							"dhp_map_typeid"     => "dhp_map_typeid",  "dhp_map_category"  => "dhp_map_category" ,
							"dhp_map_type"       => "dhp_map_type",     "dhp_map_url"      => "dhp_map_url",
							"dhp_map_subdomains" => "dhp_map_subdomains", "dhp_map_source" => "dhp_map_source",
							"dhp_map_n_bounds"   => "dhp_map_n_bounds", "dhp_map_s_bounds" => "dhp_map_s_bounds",
							"dhp_map_e_bounds"   => "dhp_map_e_bounds", "dhp_map_w_bounds" => "dhp_map_w_bounds",
							"dhp_map_min_zoom"   => "dhp_map_min_zoom", "dhp_map_max_zoom" => "dhp_map_max_zoom",
							"dhp_map_cent_lat"   => "dhp_map_cent_lat", "dhp_map_cent_lon" => "dhp_map_cent_lon"
						);
	$mapArray = array();

		// Loop thru all map layers, collecting essential data to pass
	foreach($mapLayers as $layer) {
		$mapData = dhp_get_map_metadata($layer->id, $mapMetaList);
			// Do basic error checking to ensure necessary fields exist
		if ($mapData['dhp_map_typeid'] == '') {
			trigger_error('No dhp_map_typeid metadata for map named '.$layer->name.' of id '.$layer->id);
		}
		array_push($mapArray, $mapData);
	}
	return $mapArray;
} // dhp_get_map_layer_data()


// PURPOSE: Called to retrieve file content to insert into HTML for a particular DH Press page
// INPUT:   $scriptname = base name of script file (not pathname)
// RETURNS: Contents of file as string

function dhp_get_script_text($scriptname)
{
 	$scriptpath = plugin_dir_path( __FILE__ ).'scripts/'.$scriptname;
 	if (!file_exists($scriptpath)) {
 		trigger_error("Script file ".$scriptpath." not found");
	}
	$scripthandle = fopen($scriptpath, "r");
	$scripttext = file_get_contents($scriptpath);
	fclose($scripthandle);
	return $scripttext;
} // dhp_get_script_text()


add_filter('the_content', 'dhp_mod_page_content');

// PURPOSE:	Called by WP to modify content to be rendered for a post page
// INPUT:	$content = material to show on page
// RETURNS:	$content with ID of this post and DH Press hooks for marker text and visualization
// NOTES:   Need to insert Handlebars script texts into HTML, depending on visualizations

function dhp_mod_page_content($content) {
	// $postID = get_the_ID();
	// $postType = get_query_var('post_type');

	global $post;
	$postID = $post->ID;
	$postType = $post->post_type;

		// Only produce dhp-visual div hook for Project posts
	switch ($postType) {
	case 'dhp-project':
    	$projObj = new DHPressProject($postID);

		$projscript = dhp_get_script_text(DHP_SCRIPT_PROJ_VIEW);

			// Which visualization is being shown
		$vizIndex = (get_query_var('viz')) ? get_query_var('viz') : 0;
		// $allSettings = $projObj->getAllSettings();
		// $vizIndex = min($vizIndex, count($allSettings->eps)-1);

		$ep = $projObj->getEntryPointByIndex($vizIndex);
		switch ($ep->type) {
		case 'map':
	    	$projscript .= dhp_get_script_text(DHP_SCRIPT_MAP_VIEW);
	    	break;
		case 'cards':
	    	$projscript .= dhp_get_script_text(DHP_SCRIPT_CARDS_VIEW);
			break;
		case 'pinboard':
	    	$projscript .= dhp_get_script_text(DHP_SCRIPT_PINBOARD_VIEW);
			break;
		case 'tree':
				// currently nothing is used
	    	// $projscript .= dhp_get_script_text(DHP_SCRIPT_TREE_VIEW);
			break;
		case 'time':
				// currently nothing is used
	    	// $projscript .= dhp_get_script_text(DHP_SCRIPT_TIME_VIEW);
			break;
		case 'flow':
				// currently nothing is used
	    	// $projscript .= dhp_get_script_text(DHP_SCRIPT_FLOW_VIEW);
			break;
		case 'browser':
				// currently nothing is used
	    	// $projscript .= dhp_get_script_text(DHP_SCRIPT_BROWSER_VIEW);
			break;
		}
		$to_append = '<div id="dhp-visual"></div>'.$projscript;
		break;
	default:
		$to_append = '<div class="dhp-entrytext"></div>';
		break;
	}
	return $content.'<div class="dhp-post" id="'.$postID.'">'.$to_append.'</div>';
} // dhp_mod_page_content()


add_filter( 'query_vars', 'dhp_viz_query_var' );

// PURPOSE: Add the "viz" query variable to WordPress's approved list
function dhp_viz_query_var($vars) {
  $vars[] = "viz";
  return $vars;
}

add_filter( 'single_template', 'dhp_page_template' );

// PURPOSE:	Called by WP to modify output when viewing a page of any type
// INPUT:	$page_template = default path to file to use for template to render page
// RETURNS:	Modified $page_template setting (file path to new php template file)

function dhp_page_template( $page_template )
{
	global $post;
		// For building list of handles upon which page is dependent
	$dependencies = array('jquery', 'underscore');

	$blog_id = get_current_blog_id();
	$dev_url = get_admin_url( $blog_id ,'admin-ajax.php');
	$post_type = get_query_var('post_type');

		// Viewing a Project?
    if ( $post_type == 'dhp-project' ) {
    	$projObj = new DHPressProject($post->ID);
    	$allSettings = $projObj->getAllSettings();

    		// Communicate to visualizations by sending parameters in this array
    	$vizParams = array();

			// Foundation styles
        wp_enqueue_style('dhp-foundation-style', plugins_url('/lib/foundation-5.1.1/css/foundation.min.css',  dirname(__FILE__)));
        wp_enqueue_style('dhp-foundation-icons', plugins_url('/lib/foundation-icons/foundation-icons.css',  dirname(__FILE__)));

		// wp_enqueue_style('dhp-jquery-ui-style', 'http://code.jquery.com/ui/1.10.2/themes/smoothness/jquery-ui.css');
		wp_enqueue_style('dhp-project-css', plugins_url('/css/dhp-project.css',  dirname(__FILE__)), '', DHP_PLUGIN_VERSION );

		wp_enqueue_script('underscore');
		wp_enqueue_script('jquery');
		wp_enqueue_script('dhp-foundation', plugins_url('/lib/foundation-5.1.1/js/foundation.min.js', dirname(__FILE__)), 'jquery');
		wp_enqueue_script('dhp-modernizr', plugins_url('/lib/foundation-5.1.1/js/vendor/modernizr.js', dirname(__FILE__)), 'jquery');
		wp_enqueue_script('handlebars', plugins_url('/lib/handlebars-v1.1.2.js', dirname(__FILE__)));

			// Check query variable "viz" to see which visualization to display -- default = 0
		$vizIndex = (get_query_var('viz')) ? get_query_var('viz') : 0;
		$vizIndex = min($vizIndex, count($allSettings->eps)-1);
		$vizParams['current'] = $vizIndex;

			// Create list of visualization labels for drop-down menu
		$vizMenu = array();
		foreach ($allSettings->eps as $thisEP) {
			array_push($vizMenu, $thisEP->label);
		}
		$vizParams['menu'] = $vizMenu;

    		// Visualization specific -- only 1st Entry Point currently supported
    	$thisEP = $projObj->getEntryPointByIndex($vizIndex);
    	switch ($thisEP->type) {
    	case 'map':
			wp_enqueue_style('dhp-jquery-ui-base-style', plugins_url('/lib/jquery-ui-1.11.1/themes/base/core.css', dirname(__FILE__)) );
			wp_enqueue_style('dhp-jquery-ui-slider-style', plugins_url('/lib/jquery-ui-1.11.1/themes/base/slider.css', dirname(__FILE__)),
								 'dhp-jquery-ui-base-style' );
			wp_enqueue_style('dhp-jquery-ui-smooth-style', plugins_url('/lib/jquery-ui-1.11.1/jquery-ui.theme.min.css', dirname(__FILE__)),
								 array('dhp-jquery-ui-base-style', 'dhp-jquery-ui-slider-style') );

			wp_enqueue_style('dhp-map-css', plugins_url('/css/dhp-map.css',  dirname(__FILE__)), '', DHP_PLUGIN_VERSION );
			wp_enqueue_style('leaflet-css', plugins_url('/lib/leaflet-0.7.3/leaflet.css',  dirname(__FILE__)), '', DHP_PLUGIN_VERSION );
			wp_enqueue_style('maki-sprite-style', plugins_url('/lib/maki/maki-sprite.css',  dirname(__FILE__)) );

	    	wp_enqueue_script('dhp-google-map-script', 'http'. ( is_ssl() ? 's' : '' ) .'://maps.google.com/maps/api/js?v=3&amp;sensor=false');

				// Will call our own versions of jquery-ui to minimize compatibility problems
			wp_enqueue_script('dhp-jquery-ui-core', plugins_url('/lib/jquery-ui-1.11.1/ui/core.js', dirname(__FILE__)), 'jquery' );
			wp_enqueue_script('dhp-jquery-ui-widget', plugins_url('/lib/jquery-ui-1.11.1/ui/widget.js', dirname(__FILE__)), 
						array('jquery', 'dhp-jquery-ui-core') );
			wp_enqueue_script('dhp-jquery-ui-mouse', plugins_url('/lib/jquery-ui-1.11.1/ui/mouse.js', dirname(__FILE__)), 
						array('jquery', 'dhp-jquery-ui-core', 'dhp-jquery-ui-widget') );
			wp_enqueue_script('dhp-jquery-ui-slider', plugins_url('/lib/jquery-ui-1.11.1/ui/slider.js', dirname(__FILE__)),
						array('jquery', 'dhp-jquery-ui-core', 'dhp-jquery-ui-widget') );

			wp_enqueue_script('leaflet', plugins_url('/lib/leaflet-0.7.3/leaflet.js', dirname(__FILE__)));
			wp_enqueue_script('leaflet-maki', plugins_url('/lib/Leaflet.MakiMarkers.js', dirname(__FILE__)), 'leaflet');

			wp_enqueue_script('dhp-maps-view', plugins_url('/js/dhp-maps-view.js', dirname(__FILE__)), 'leaflet', DHP_PLUGIN_VERSION);
			wp_enqueue_script('dhp-custom-maps', plugins_url('/js/dhp-custom-maps.js', dirname(__FILE__)), 'leaflet', DHP_PLUGIN_VERSION);

				// Get any DHP custom map parameters
			$layerData = dhp_get_map_layer_data($thisEP->settings->layers);
			$vizParams['layerData'] = $layerData;

				// Get any PNG image icons
			$vizParams['pngs'] = dhp_get_attached_PNGs($post->ID);

	    	array_push($dependencies, 'leaflet', 'dhp-google-map-script', 'dhp-maps-view', 'dhp-custom-maps',
	    							'dhp-jquery-ui-slider');
	    	break;

	    case 'cards':
			wp_enqueue_style('dhp-cards-css', plugins_url('/css/dhp-cards.css',  dirname(__FILE__)) );

			wp_enqueue_script('isotope', plugins_url('/lib/isotope.pkgd.min.js', dirname(__FILE__)));
			wp_enqueue_script('dhp-cards-view', plugins_url('/js/dhp-cards-view.js', dirname(__FILE__)), 
				'isotope' );

	    	array_push($dependencies, 'isotope', 'dhp-cards-view');
	    	break;

	    case 'pinboard':
			wp_enqueue_style('foundation-icons-css', plugins_url('/lib/foundation-icons/foundation-icons.css',  dirname(__FILE__)));
			wp_enqueue_style('dhp-pinboard-css', plugins_url('/css/dhp-pinboard.css',  dirname(__FILE__)) );

			wp_enqueue_script('snap', plugins_url('/lib/snap.svg-min.js', dirname(__FILE__)));
			wp_enqueue_script('dhp-pinboard-view', plugins_url('/js/dhp-pinboard-view.js', dirname(__FILE__)), 
				'snap' );

			if ($thisEP->settings->animscript && $thisEP->settings->animscript !== '') {
				$content = @file_get_contents($thisEP->settings->animscript);
				if ($content === false) {
					trigger_error("Cannot load animation script file ".$thisEP->settings->animscript);
				}
				$vizParams['animscript'] = $content;
			}

				// Get any PNG image icons
			$vizParams['pngs'] = dhp_get_attached_PNGs($post->ID);

	    	array_push($dependencies, 'snap', 'dhp-pinboard-view');
	    	break;

	    case 'tree':
			wp_enqueue_style('dhp-tree-css', plugins_url('/css/dhp-tree.css',  dirname(__FILE__)) );

			wp_enqueue_script('d3', plugins_url('/lib/d3.min.js', dirname(__FILE__)));
			wp_enqueue_script('dhp-tree-view', plugins_url('/js/dhp-tree-view.js', dirname(__FILE__)), 'd3' );

	    	array_push($dependencies, 'd3', 'dhp-tree-view');
	    	break;

	    case 'time':
			wp_enqueue_style('dhp-time-css', plugins_url('/css/dhp-time.css',  dirname(__FILE__)) );

			wp_enqueue_script('d3', plugins_url('/lib/d3.min.js', dirname(__FILE__)));
			wp_enqueue_script('dhp-time-view', plugins_url('/js/dhp-time-view.js', dirname(__FILE__)), 'd3' );

	    	array_push($dependencies, 'd3', 'dhp-time-view');
	    	break;

	    case 'flow':
			wp_enqueue_style('dhp-flow-css', plugins_url('/css/dhp-flow.css',  dirname(__FILE__)) );

			wp_enqueue_script('d3', plugins_url('/lib/d3.min.js', dirname(__FILE__)));
			wp_enqueue_script('d3-parsets', plugins_url('/lib/d3.dhp-parsets.js', dirname(__FILE__)), 'd3');
			wp_enqueue_script('dhp-flow-view', plugins_url('/js/dhp-flow-view.js', dirname(__FILE__)),
				array('d3', 'd3-parsets') );

	    	array_push($dependencies, 'd3', 'd3-parsets', 'dhp-flow-view');
	    	break;

	    case 'browser':
			wp_enqueue_style('dhp-browser-css', plugins_url('/css/dhp-browser.css',  dirname(__FILE__)) );

			wp_enqueue_script('d3', plugins_url('/lib/d3.min.js', dirname(__FILE__)));
			wp_enqueue_script('dhp-browser-view', plugins_url('/js/dhp-browser-view.js', dirname(__FILE__)),
				'd3' );

	    	array_push($dependencies, 'd3', 'dhp-browser-view');
	    	break;

	    default:
	 		trigger_error("Unknown visualization type: ".$thisEP->type);
	    	break;
	    }

	    	// Transcript specific
	    if ($projObj->selectModalHas('scloud') || $projObj->selectModalHas('youtube')) {
			wp_enqueue_style('dhp-transcript-css', plugins_url('/css/transcriptions.css',  dirname(__FILE__)) );
			wp_enqueue_script('dhp-widget', plugins_url('/js/dhp-widget.js',  dirname(__FILE__)),
				 array('jquery', 'underscore') );
			if ($projObj->selectModalHas('scloud')) {
	        	wp_enqueue_script('soundcloud-api', 'http://w.soundcloud.com/player/api.js');
	    		array_push($dependencies, 'soundcloud-api');
	        }
			// if ($projObj->selectModalHas('youtube')) {
			// }
	    	array_push($dependencies, 'dhp-widget');
	    }

			// For touch-screen mechanisms
		// wp_enqueue_script('dhp-touch-punch', plugins_url('/lib/jquery.ui.touch-punch.js', dirname(__FILE__)),
		// 	array('jquery', 'dhp-jquery-ui-widget', 'dhp-jquery-ui-mouse') );

		wp_enqueue_script('dhp-services', plugins_url('/js/dhp-services.js', dirname(__FILE__)),
						array('jquery', 'underscore'), DHP_PLUGIN_VERSION );
	    array_push($dependencies, 'dhp-services');

	    	// Enqueue page JS last, after we've determine what dependencies might be
		wp_enqueue_script('dhp-public-project-script', plugins_url('/js/dhp-project-page.js', dirname(__FILE__)), $dependencies, DHP_PLUGIN_VERSION );

		wp_localize_script('dhp-public-project-script', 'dhpData', array(
			'ajax_url'   => $dev_url,
			'vizParams'  => $vizParams,
			'settings'   => $allSettings
		) );

		// Looking at a Marker/Data entry?
    } else if ( $post_type == 'dhp-markers' ) {
		$project_id = get_post_meta($post->ID, 'project_id',true);
		$projObj = new DHPressProject($project_id);

		wp_enqueue_style('dhp-project-css', plugins_url('/css/dhp-project.css',  dirname(__FILE__)), '', DHP_PLUGIN_VERSION );

		wp_enqueue_script('jquery');
		wp_enqueue_script('dhp-modernizr', plugins_url('/lib/foundation-5.1.1/js/vendor/modernizr.js', dirname(__FILE__)), 'jquery');
		wp_enqueue_script('underscore');

			// Enqueue last, after dependencies determined
		wp_enqueue_script('dhp-services', plugins_url('/js/dhp-services.js', dirname(__FILE__)),
						array('jquery', 'underscore'), DHP_PLUGIN_VERSION );
		wp_enqueue_script('dhp-marker-script', plugins_url('/js/dhp-marker-page.js', dirname(__FILE__)), $dependencies, DHP_PLUGIN_VERSION);

		wp_localize_script('dhp-marker-script', 'dhpData', array(
			'ajax_url' => $dev_url,
			'settings' => $projObj->getAllSettings(),
			'proj_id' => $project_id
		) );
    } // else if ($post_type == 'dhp-markers')

    return $page_template;
} // dhp_page_template()


add_filter( 'archive_template', 'dhp_tax_template' );

// PURPOSE: Set template to be used to show results of top-level custom taxonomy display
// INPUT:	$page_template = default path to file to use for template to render page
// RETURNS:	Modified $page_template setting (file path to new php template file)
// NOTES:   The name of the taxonomy is the value of a mote;
//				the name of the tax-term's parent is the name of the mote

function dhp_tax_template( $page_template )
{
	$blog_id = get_current_blog_id();
	$dev_url = get_admin_url( $blog_id ,'admin-ajax.php');

		// For building list of handles upon which page is dependent
	$dependencies = array('jquery', 'underscore');

		// ensure a Taxonomy archive page is being rendered
	if( is_tax() ) {
	    global $wp_query;

	    $term = $wp_query->get_queried_object();
	    $title = $term->taxonomy;
	    $term_parent = get_term($term->parent, $title);

	    	// Set the name of the term's parent, which is also the name of the mote
	    $term->parent_name = $term_parent->name;

	    $projectID = DHPressProject::RootTaxNameToProjectID($title);
	    $projObj = new DHPressProject($projectID);
	    $project_settings = $projObj->getAllSettings();

	    	// Are we on a taxonomy/archive page that corresponds to transcript "source"?
	    $isTranscript = ($project_settings->views->transcript->source == $term_parent->name);

			// Foundation styles
		wp_enqueue_style('dhp-foundation-css', plugins_url('/lib/foundation-5.1.1/css/foundation.min.css',  dirname(__FILE__)));
		wp_enqueue_style('dhp-foundation-icons', plugins_url('/lib/foundation-icons/foundation-icons.css',  dirname(__FILE__)));

		wp_enqueue_style('dhp-project-css', plugins_url('/css/dhp-project.css',  dirname(__FILE__)), '', DHP_PLUGIN_VERSION );

		wp_enqueue_script('jquery' );
		wp_enqueue_script('dhp-foundation', plugins_url('/lib/foundation-5.1.1/js/foundation.min.js', dirname(__FILE__)), 'jquery');
		wp_enqueue_script('dhp-modernizr', plugins_url('/lib/foundation-5.1.1/js/vendor/modernizr.js', dirname(__FILE__)), 'jquery');
		wp_enqueue_script('underscore');
		// wp_enqueue_script('handlebars', plugins_url('/lib/handlebars-v1.1.2.js', dirname(__FILE__)));

	    if ($isTranscript) {
			wp_enqueue_style('transcript', plugins_url('/css/transcriptions.css',  dirname(__FILE__)), '', DHP_PLUGIN_VERSION );
			if ($projObj->selectModalHas('scloud')) {
	        	wp_enqueue_script('soundcloud-api', 'http://w.soundcloud.com/player/api.js');
		    	array_push($dependencies, 'soundcloud-api');
	        }
			// if ($projObj->selectModalHas('youtube')) {
			// }
			wp_enqueue_script('dhp-widget', plugins_url('/js/dhp-widget.js',  dirname(__FILE__)),
				 array('jquery', 'underscore'), DHP_PLUGIN_VERSION);
		    array_push($dependencies, 'dhp-widget');
		}

		wp_enqueue_script('dhp-services', plugins_url('/js/dhp-services.js', dirname(__FILE__)),
						array('jquery', 'underscore'), DHP_PLUGIN_VERSION );
	    array_push($dependencies, 'dhp-services');

			// Enqueue last, after dependencies have been determined
		wp_enqueue_script('dhp-tax-script', plugins_url('/js/dhp-tax-page.js', dirname(__FILE__)), $dependencies, DHP_PLUGIN_VERSION );

		wp_localize_script('dhp-tax-script', 'dhpData', array(
				'project_id' => $projectID,
				'ajax_url' => $dev_url,
				'tax' => $term,
				'project_settings' => $project_settings,
				'isTranscript' => $isTranscript
			) );
	}
	return $page_template;
} // dhp_tax_template()