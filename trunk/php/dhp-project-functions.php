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
// define( 'DHP_SCRIPT_TAX_TRANS',  'dhp-script-tax-trans.txt' );	// currently unused
// define( 'DHP_SCRIPT_TRANS_VIEW', 'dhp-script-trans-view.txt' );   // currently unneeded


// ================== Initialize Plug-in ==================

// init action called to initialize a plug-in
add_action( 'init', 'dhp_project_init' );

// dhp_project_init()
// PURPOSE: To create custom post type for Projects in WP

function dhp_project_init()
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
    'supports' => array( 'title', 'editor', 'author', 'thumbnail', 'excerpt', 'comments','revisions', 'custom-fields' )
  ); 
  register_post_type('project',$args);
} // dhp_project_init


// add support for theme-specific feature
if ( function_exists( 'add_theme_support' ) ) {
		// enable use of thumbnails
	add_theme_support( 'post-thumbnails' );
		// default Post Thumbnail dimensions
	set_post_thumbnail_size( 32, 37 ); 
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
function getMapMetaData($mapID, $mapMetaList)
{
	$thisMetaSet = array();

	foreach ($mapMetaList as $arrayKey => $metaName) {
		$thisMetaData = get_post_meta($mapID, $metaName, true);
		$thisMetaSet[$arrayKey] = $thisMetaData;
	}
	return $thisMetaSet;
} // getMapMetaData()


	// PURPOSE: Return list of all dhp-maps in DHP site
	// RETURNS: array [layerID, layerName, layerCat, layerType, layerTypeId]
function getLayerList()
{
	$layers = array();
	$theMetaSet = array('layerName' => 'dhp_map_shortname', 'layerCat' => 'dhp_map_category',
						'layerType' => 'dhp_map_type', 'layerTypeId' => 'dhp_map_typeid' );

	$args = array( 'post_type' => 'dhp-maps', 'posts_per_page' => -1 );
	$loop = new WP_Query( $args );
	while ( $loop->have_posts() ) : $loop->the_post();
	//var $tempLayers = array();
		$layer_id = get_the_ID();

		$mapMetaData = getMapMetaData($layer_id, $theMetaSet);
		$mapMetaData['layerID']		= $layer_id;
		// $mapMetaData['layerName']	= get_the_title();
		array_push($layers, $mapMetaData);

	endwhile;
	wp_reset_query();

	return $layers;
} // getLayerList()


//============================ Customize for Project Posts ============================

// post_updated_messages enables us to customize the messages for our custom post types
add_filter( 'post_updated_messages', 'dhp_project_updated_messages' );

// dhp_project_updated_messages()
// PURPOSE:	Supply strings specific to Project custom type
// ASSUMES:	Global variables $post, $post_ID set

function dhp_project_updated_messages( $messages )
{
  global $post, $post_ID;

  $messages['project'] = array(
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


// =========================== Customize handling of taxonomies ============================

// add custom taxonomies for each project when plugin is initialized
add_action( 'init', 'create_tax_for_projects', 0 );

	// PURPOSE: Create custom taxonomies for all existing DHP Projects if they don't exist (head term for Project)
function create_tax_for_projects()
{
	$args = array( 'post_type' => 'project', 'posts_per_page' => -1 );
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


// // add_meta_boxes called when Edit Post runs
// add_action('add_meta_boxes_project', 'add_dhp_project_icons_box');

// // PURPOSE:	Add the editing box for Marker icons (shown on maps)

// function add_dhp_project_icons_box()
// {
//     add_meta_box(
// 		'dhp_icons_box', // $id
// 		'Marker Icons', // $title
// 		'show_dhp_project_icons_box', // $callback
// 		'project', // $page
// 		'side', // $context 
// 		'default'); // $priority
// } // add_dhp_project_icons_box()

// function show_dhp_project_icons_box()
// {
// 	//dhp_deploy_icons();
// 	bdw_get_images();
// } // show_dhp_project_icons_box()


// // PURPOSE: Create HTML icon box on right sidebox
// // SIDE FX:	Outputs HTML of thumbnail images of images associated with post
// // ASSUMES:	$post global is set to Project post

// function bdw_get_images()
// {
// 	global $post;

//     // Get the post ID
//     $iPostID = $post->ID;
 
//     // Get images associated with this Project post
//     $arrImages = get_children('post_type=attachment&post_mime_type=image&numberpost=-1&post_parent=' . $iPostID );
 
//     // If images exist for this page
//     if($arrImages) {
 
//         // Get array keys representing attached image numbers
//         $arrKeys = array_keys($arrImages);
 
//         $sImgString .= '<div class="misc-pub-section icons">';
 
//         // UNCOMMENT THIS IF YOU WANT THE FULL SIZE IMAGE INSTEAD OF THE THUMBNAIL
//         //$sImageUrl = wp_get_attachment_url($iNum);
//         $i = 0;
//  		foreach ($arrKeys as $field) {
//  			// Get the first image attachment
//         	$iNum = $arrKeys[$i];
//  			$i++;
//         	// Get the thumbnail url for the attachment
//        		$sThumbUrl = wp_get_attachment_thumb_url($iNum);
//         	// Build the <img> string
//         	$sImgString .= '<a id="'.$iNum.'" >' .
//                             '<img src="' . $sThumbUrl . '"/>' .
//                         '</a>';
//  		}
//  		$sImgString .= '</div>';
//         // Print the image
//         echo $sImgString;
//     }
// } // bdw_get_images()


// add_meta_boxes called when Edit Post runs
add_action('add_meta_boxes_project', 'add_dhp_project_admin_edit');

// PURPOSE: Called when Project is edited in admin panel to create Project-specific GUI

function add_dhp_project_admin_edit()
{
    add_meta_box(
		'dhp_settings_box', 			// id of edit box
		'Project Details',				// textual title of box
		'show_dhp_project_admin_edit', 			// name of callback function
		'project',						// custom page name
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

		// Insert list of custom fields -- getAllCustomFieldNames() will reset WP globals
	$dhp_custom_fields = $projObj->getAllCustomFieldNames();
	echo '<div style="display:none" id="custom-fields">'.json_encode($dhp_custom_fields).'</div>';

		// Insert list of map layers from loaded library -- getLayerList() will reset WP globals
	echo '<div style="display:none" id="map-layers">'.json_encode(getLayerList()).'</div>';
	// echo '<select style="display:none" id="hidden-layers" >'.dhp_build_HTML_maplayer_options(getLayerList()).'</select>';
} // show_dhp_project_admin_edit()


// PURPOSE: Create HTML for option list based on map layers
// INPUT:	$layerArray = array of maps generated by getLayerList()
// ASSUMES:	WP slug for map is map name in which spaces replaced by '-'
// RETURNS:	string of HTML <option id='layerID' class='layerCatSlug' data-mapType='type-layerType' value='layerTypeId'> name </option>

function dhp_build_HTML_maplayer_options($layerArray)
{
	$optionHtml ='';
	foreach ($layerArray as $layer) {
			// create slug by ensuring no spaces in name
		$tempCat = str_replace(' ','-',$layer['layerCat']);
		$tempType = 'type-'.$layer['layerType'];
		//$optionHtml .= '{ "id" : "'.$layer['layerID'].'", "name" : "'.$layer['layerName'].'", "usetype" : "'.$layer['layerCat'].'"},';
		$optionHtml .= '<option id="'.$layer['layerID'].
		'" class="'.$tempCat.'" data-mapType="'.$tempType.
		'" value="'.$layer['layerTypeId'].'" >'.$layer['layerName'].'</option>';
	}
	return $optionHtml;
} // dhp_build_HTML_maplayer_options()


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

	$projObj = new DHPressProject($srcToCheck);
    $old = $projObj->getAllSettings();
    $new = $_POST['project_settings'];
	if ($new && $new != $old) {
		update_metadata('post', $post_id, 'project_settings', $new);
	} elseif ($new == '' && $old) {
		delete_metadata('post', $post_id, 'project_settings', $old);
	}

		// Not currently supporting project icons
	// $old = get_post_meta($srcToCheck, 'project_icons', true);
	// $new = $_POST['project_icons'];
	// if ($new && $new != $old) {
	// 	update_metadata('post', $post_id, 'project_icons', $new);
	// } elseif ($new == '' && $old) {
	// 	delete_metadata('post', $post_id, 'project_icons', $old);
	// }
} // save_dhp_project_settings()


// invertLatLon($latlon)
// RETURNS:	New comma separated string with elements reversed, or null if incorrect format
// INPUT:	String with 2 comma-separated numbers
// TO DO:	Move to Map class?

function invertLatLon($latlon)
{
	if(is_null($latlon) || $lonlat==','){
		return null;
	}
	$tempLonLat = split(',',$latlon);
	if (!is_numeric($tempLonLat[0]) || !is_numeric($tempLonLat[1])) {
		return null;
	}
	return array($tempLonLat[1],$tempLonLat[0]);
} // invertLatLon()


// getCategoryValues($parent_term, $taxonomy)
// PURPOSE: Get all of the visual features associated via metadata with the taxonomic terms associated with 1 Mote
// INPUT:	$parent_term = Object for mote/top-level term
//			$taxonomy = root name of taxonomy for Project
// NOTE:	JS code will break if icon_url field not set, so we will check it here and die if failure
// RETURNS: Description of Legends to appear on Map in the following format:
			// {	"type" : "filter",
			// 		"name" : String (top-level-mote-name),
			// 		"terms" :				// 1st level terms & their children
			// 		[
			// 		  {	"name" :  String (inc. top-level-mote-name),
			// 			"id" : integer,
			// 			"icon_url": URL,
			// 			"children_names" : [ Strings of names ],
			// 			"children" :
			// 			[
			// 			  {	"name" : String,
			// 				"term_id" : integer,
			// 				"parent" : integer,
			// 				"count" : String,
			// 				"slug" : String,
			// 				"description" : String,
			// 				"term_taxonomy_id" : String,
			// 				"taxonomy" : String,
			// 				"term_group" : String
			//			  }, ...
			// 			]
			// 		  }, ...
			// 		],
			// 	}

function getCategoryValues($parent_term, $taxonomy)
{
	$children_names = array();
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

		// Go through each of the values in the category
	foreach ($children_terms as $child) {
		array_push($children_names, $child->name);
			// Get any children of this category
		$childArgs = array( 'orderby' 		=> 'term_group',
		 					'hide_empty'    => false,
							'parent'        => $child->term_id );
		$children_terms2 = get_terms( $taxonomy, $childArgs );
		$children_names2 = array();
		foreach ($children_terms2 as $child2) {
				// convert IDs from String to Integer
			$child2->term_id = intval($child2->term_id);
			$child2->parent = intval($child2->parent);
			array_push($children_names2, $child2->name);
		}
		if($child->description) {
			$desc_object = json_decode(stripslashes($child->description));
			$icon_url = $desc_object->icon_url;
		} else {
			$icon_url = null;
		}

		$temp_child_filter				  = array();
		$temp_child_filter['name']        = $child->name;
		$temp_child_filter['id']          = intval($child->term_id);
		$temp_child_filter['icon_url']    = $icon_url;
		$temp_child_filter['children_names'] = $children_names2;
		$temp_child_filter['children']    = $children_terms2;

		array_push($filter_object['terms'], $temp_child_filter);
	}
		// Update top-level mote pushed near top of function
	$filter_parent['children_names'] = $children_names;
	$filter_parent['children'] = $children_terms;

	return $filter_object;
} // getCategoryValues()


// PURPOSE:	Get link to category page based on category value, if one of $terms appears in $link_terms
// INPUT:	$link_terms = array of taxonomic terms
//			$terms = array of terms associated with a particular Marker
//			$rootTaxName = root taxonomic term for Project
// RETURNS: PermaLink for marker's term (from $terms) that appears in $link_terms
// ASSUMES:	That strings in $terms have been HTML-escaped

function dhp_get_term_by_parent($link_terms, $terms, $rootTaxName)
{
	foreach( $terms as $term ) {
		$real_term = get_term_by('id', $term, $rootTaxName);
		$intersect = array_intersect(array($real_term->term_id), $link_terms);
		if ($intersect) {
			 $term_link = get_term_link($real_term);
			 return $term_link;
		}
	}
} // dhp_get_term_by_parent()


// ========================================= AJAX calls ======================================

// PURPOSE:	Creates Legends and Feature Collections Object (as per OpenLayer) when looking at a project page;
//			That is, return array describing all markers based on filter and visualization
// INPUT:	$project_id = ID of Project to view
// RETURNS: JSON object describing all markers associated with Project
//			[0..n-1] contains results from getCategoryValues() defined above;
//			[n] is a FeatureCollection; exact contents will depend on visualization, but could include:
			// {	"type": "FeatureCollection",
			// 	 	"features" :
			// 		[
			// 			{ "type" : "Feature",
			//							// Only if map
			// 			  "geometry" : { "type" : "Point", "coordinates" : longlat },
			//							// Only if topic card
			//			  "card" : { "title": String },
			// 			  "properties" :
			// 				[
			//							// All data corresponding to categories/legends associated with marker
			// 					"categories" : [ integer IDs of category terms ],
			//							// Data used to create modals
			// 					"title" : String,
			//							// Data needed by select modal or card filter/sort
			// 					"content" : [
			//						{ moteName : moteValue }, ...
			//					],
			// 					"link" : URL,
			// 					"link2" : URL
			//							// Those below only in the case of transcript markers
			// 					"audio" : String,
			// 					"transcript" : String,
			// 					"transcript2" : String,
			// 					"timecode" : String,
			// 				],
			// 			}, ...
			// 		]
			// 	}

function createMarkerArray($project_id)
{
		// initialize result array
	$json_Object = array();
		// get Project info
	$projObj      = new DHPressProject($project_id);
	$rootTaxName  = $projObj->getRootTaxName();
	$projSettings = $projObj->getAllSettings();

    	// Initialize settings in case not used -- most of these are custom-field (not mote) names
	$map_pointsMote = $coordMote = $filters = null;
	$audio = $transcript = $transcript2 = $timecode = null;
	$cardTitle = $cardColorMote = null;

		// By default, a marker's content is the set of data needed by select modal, but some
		//	views may need to augment this
	$selectContent = array();
	if ($projSettings->views->select->content) {
		foreach ($projSettings->views->select->content as $theMote) {
			array_push($selectContent, $theMote);
		}
	}

    	// If we support multiple entry points, we must accumulate settings that are specified
		// For now, just the first entry point is implemented
	$eps0 = $projSettings->{'entry-points'}[0];
	switch ($eps0->type) {
	case "map":
			// Which field used to encode Lat-Long on map?
		// $map_pointsMote = $projObj->getMoteByName( $eps['settings']['marker-layer'] );
		$map_pointsMote = $projObj->getMoteByName( $eps0->settings->{'marker-layer'} );
		if($map_pointsMote->type=='Lat/Lon Coordinates'){
			if(!$map_pointsMote->delim) { $map_pointsMote->delim=','; }
			$coordMote = split($map_pointsMote->delim, $map_pointsMote->{'custom-fields'});
			//array of custom fields
		}
			// Find all possible legends/filters for this map -- each marker needs these fields
		// $filters = $eps['settings']['filter-data'];
		$filters = $eps0->settings->{'filter-data'};
			// Collect all possible category values/tax names for each mote in all filters
		foreach( $filters as $legend ) {
			$term = get_term_by('name', $legend, $rootTaxName);
			// $parent_term_id = $term->term_id;
			// $parent_terms = get_terms( $rootTaxName, array( 'parent' => $parent_term_id, 'orderby' => 'term_group', 'hide_empty' => false ) );
			array_push($json_Object, getCategoryValues($term, $rootTaxName));
		}
		break;

	case "cards":
			// Convert title mote to custom field
		$cardTitle = $eps0->settings->title;
		if ($cardTitle == null || $cardTitle == '') {
			$cardTitle = null;
		} else if ($cardTitle != 'the_title') {
			$cardTitle = $projObj->getCustomFieldForMote($cardTitle);
			if (is_null($cardTitle)) {
				trigger_error("Card view title assigned to unknown mote");
			}
		}
			// Convert color mote to custom field
		$cardColorMote = $eps0->settings->color;
		if ($cardColorMote != null && $cardColorMote !== '') {
				// Create a legend for the color values
			$term = get_term_by('name', $cardColorMote, $rootTaxName);
			array_push($json_Object, getCategoryValues($term, $rootTaxName));
		}
			// prepare card contents (for now, just image and text motes)
			// TO DO: Prevent redundancies
		if ($eps0->settings->content[0] != null && $eps0->settings->content[0] != '') {
			array_push($selectContent, $eps0->settings->content[0]);
		}
		if ($eps0->settings->content[1] != null && $eps0->settings->content[1] != '') {
			array_push($selectContent, $eps0->settings->content[1]);
		}
		break;
	} // switch

		// If a marker is selected and leads to a transcript in modal, need those values also
	if ($projObj->selectModalHas("transcript")) {
		$audio = $projSettings->views->transcript->audio;
			// Translate from Mote Name to Custom Field name
		if (!is_null($audio) && ($audio !== '')) {
			$audio = $projObj->getCustomFieldForMote($audio);
			$transcript = $projObj->getCustomFieldForMote($projSettings->views->transcript->transcript);
			$transcript2= $projObj->getCustomFieldForMote($projSettings->views->transcript->transcript2);
			$timecode   = $projObj->getCustomFieldForMote($projSettings->views->transcript->timecode);
		}
	}

		// Ensure that any new content requested from markers is not redundant
	$selectContent = array_unique($selectContent);

	$feature_collection = array();
	$feature_collection['type'] = 'FeatureCollection';
	$feature_array = array();


		// Link parent enables linking to either the Post page for this Marker,
		//	or to the category/taxonomy which includes this Marker
	$link_parent = $projSettings->views->select->link;
	if($link_parent) {
		if($link_parent=='marker') {
		//$parent_id = get_term_by('name', $link_parent, $rootTaxName);
			$child_terms = 'marker';
		}
		elseif($link_parent=='disable') {
			$term_links = 'disable';
			$child_terms = 'disable';
		}
			// Link to mote value
		elseif(strpos($link_parent, '(Mote)') !== FALSE) {
			$linkMoteName = str_replace(' (Mote)', '', $link_parent);
			$child_terms = $projObj->getMoteByName( $linkMoteName );
		}
		else {
				// translate into category/term ID
			$parent_id = get_term_by('name', $link_parent, $rootTaxName);
				// find all category terms
			$child_terms = get_term_children($parent_id->term_id, $rootTaxName);
		}
	}

	$link_parent2 = $projSettings->views->select->link2;
	if($link_parent2) {
		if($link_parent2=='marker') {
		//$parent_id2 = get_term_by('name', $link_parent2, $rootTaxName);
			$child_terms2 = 'marker';
		}
		elseif($link_parent2=='disable') {
			$term_links2 = 'disable';
			$child_terms2 = 'disable';
		}
			// Link to mote value
		elseif(strpos($link_parent2, '(Mote)') !== FALSE) {
			$link2MoteName = str_replace(' (Mote)', '', $link_parent2);
			$child_terms2 = $projObj->getMoteByName( $link2MoteName );
		} else {
			$parent_id2 = get_term_by('name', $link_parent2, $rootTaxName);
			$child_terms2 = get_term_children($parent_id2->term_id, $rootTaxName);
		}
	}

		// Determine whether title is default title of marker post or another (custom) field
	$title_mote = $projSettings->views->select->title;
	if ($title_mote != 'the_title') {
		$temp_mote = $projObj->getMoteByName($title_mote);
		if (is_null($temp_mote)) {
			trigger_error("Modal view title assigned to unknown mote");
		}
		$title_mote = $temp_mote->{'custom-fields'};
	}

	// $feature_collection['debugmsg'] = "coordMote count = ".count($coordMote)." moteName = ".$map_pointsMote["name"];
	// $feature_collection['debug'] = array();

		// Run query to return all marker posts belonging to this Project
	// $args = array( 'post_type' => 'dhp-markers', 'meta_key' => 'project_id','meta_value'=>$project_id, 'posts_per_page' => -1 );
	// $loop = new WP_Query( $args );
	$loop = $projObj->setAllMarkerLoop();
	while ( $loop->have_posts() ) : $loop->the_post();

		$marker_id = get_the_ID();

			// Feature will hold properties and some other values for each marker
		$thisFeature = array();
		$thisFeature['type']    = 'Feature';

			// Most data goes into properties field
		$thisFeaturesProperties = array();

			// First set up fields required by visualizations, abandon marker if missing

			// Map visualization features?
			// Skip marker if missing necessary LatLong data or not valid numbers
		if (!is_null($map_pointsMote)) {
			if(count($coordMote)==2) {
				$temp_lat = get_post_meta($marker_id, $coordMote[0], true);
				$temp_lon = get_post_meta($marker_id, $coordMote[1], true);
				// array_push($feature_collection['debug'], $temp_lat);
				if ($temp_lat=="" || $temp_lon=="" || !is_numeric($temp_lat) || !is_numeric($temp_lon)) {
					continue;
				}
				$lonlat = array($temp_lon,$temp_lat);
			} elseif(count($coordMote)==1) {
				$temp_latlon = get_post_meta($marker_id, $coordMote[0], true);
				// array_push($feature_collection['debug'], $temp_latlon);
				if ($temp_latlon=="") {
					continue;
				}
					// invertLatLon will return null if non-numeric entries found!
				$lonlat = invertLatLon($temp_latlon);
				if (is_null($lonlat)) {
					continue;
				}
			}
			$thisFeature['geometry'] = array("type"=>"Point","coordinates"=> $lonlat);
		}

			// Audio transcript features?
		if (!is_null($audio)) {
			$audio_val = get_post_meta($marker_id, $audio, true);
			$thisFeaturesProperties["audio"] = $audio_val;
		}
		if (!is_null($transcript)) {
			$transcript_val = get_post_meta($marker_id, $transcript, true);
			$thisFeaturesProperties["transcript"]  = $transcript_val;
		}
		if (!is_null($transcript2)) {
			$transcript2_val = get_post_meta($marker_id, $transcript2, true);
			$thisFeaturesProperties["transcript2"] = $transcript2_val;
		}
		if (!is_null($timecode)) {
			$timecode_val = get_post_meta($marker_id, $timecode, true);
			$thisFeaturesProperties["timecode"]    = $timecode_val;
		}

		if ($title_mote) {
			if($title_mote=='the_title') {
				$title = get_the_title();
			} else {
				$title = get_post_meta($marker_id,$title_mote,true);
			}
			$thisFeaturesProperties["title"] = $title;
		}

			// Special Topic Card values
		if ($cardTitle != null || $cardTitle != '') {
			$cardValues = array();
			if($cardTitle=='the_title') {
				$title = get_the_title();
			} else {
				$title = get_post_meta($marker_id, $cardTitle, true);
			}
			$cardValues['title'] = $title;
			$thisFeature['card'] = $cardValues;
		}

			// Get all of the legend/category values associated with this marker post
		$args = array('fields' => 'ids');
		$post_terms = wp_get_post_terms( $marker_id, $rootTaxName, $args );
		$term_array = array();
		foreach( $post_terms as $term) {
				// Convert tax category names into IDs
			array_push($term_array,intval($term));
		}
		$thisFeaturesProperties["categories"]  = $term_array;

		// $feature_collection['debug'] = $viewsContent;
		$content_att = array();

			// Gather all values to be displayed in modal if marker selected
		if (count($selectContent)) {
			foreach( $selectContent as $contentMoteName ) {
				if ($contentMoteName == 'the_content') {
					$content_val = apply_filters('the_content', get_post_field('the_content', $marker_id));
				} elseif ($contentMoteName == 'the_title') {
					$content_val = apply_filters('the_title', get_the_title());
				} else {
					$content_mote = $projObj->getMoteByName( $contentMoteName );
					$contentCF = $content_mote->{'custom-fields'};
					if($contentCF =='the_content') {
						$content_val = apply_filters('the_content', get_post_field($contentCF, $marker_id));
					} elseif ($contentCF=='the_title') {
						$content_val = apply_filters('the_title', get_the_title());
					} else {
						$content_val = get_post_meta($marker_id, $contentCF, true);
					}
						// Do we need to wrap data?
					if($content_mote->type=='Image'){
						$content_val = '<img src="'.addslashes($content_val).'" />';
					}
				}
				if (!is_null($content_val) && ($content_val !== '')) {
					$content_att[$contentMoteName] = $content_val;
					// array_push($content_att, array($contentMoteName => $content_val));
				}
			} // foreach
			$thisFeaturesProperties["content"]     = $content_att;
		}

			// Does item link to its own Marker page, Taxonomy page, or Mote value?
		if ($link_parent && $child_terms && $child_terms != 'disable') {
			if ($child_terms=='marker') {
				$term_links = get_permalink();
			}
			elseif(strpos($link_parent, '(Mote)') !== FALSE) {
				$term_links = get_post_meta($marker_id, $child_terms->{'custom-fields'}, true);
			}
			else {
				$term_links = dhp_get_term_by_parent($child_terms, $post_terms, $rootTaxName);
			}
			if ($term_links)
				$thisFeaturesProperties["link"] = addslashes($term_links);
		}

		if ($link_parent2 && $child_terms2 && $child_terms2 != 'disable') {
			if ($child_terms2=='marker') {
				$term_links2 = get_permalink();
			}
			elseif(strpos($link_parent2, '(Mote)') !== FALSE) {
				$term_links2 = get_post_meta($marker_id, $child_terms2->{'custom-fields'}, true);
			}
			else {
				$term_links2 = dhp_get_term_by_parent($child_terms2, $post_terms, $rootTaxName);
			}
			if ($term_links2)
				$thisFeaturesProperties["link2"] = addslashes($term_links2);
		}

			// Store all of the properties
		$thisFeature['properties'] = $thisFeaturesProperties;
			// Save this marker
		array_push($feature_array,$thisFeature);
	endwhile;

	$feature_collection['features'] = $feature_array;
	array_push($json_Object, $feature_collection);
	return $json_Object;
} // createMarkerArray()


// ====================== AJAX Functions ======================

add_action( 'wp_ajax_dhpSaveProjectSettings', 'dhpSaveProjectSettings' );

// PURPOSE:	Called by JS code on page to save the settings (constructed by JS) for the Project
// ASSUMES:	Project ID encoded in string

function dhpSaveProjectSettings()
{
	$settings =  $_POST['settings'];
	$dhp_projectID = $_POST['project'];

	update_post_meta($dhp_projectID, 'project_settings', $settings);

		// Ajax call must terminate with "die"
	die('saving... '. $settings);
} // dhpSaveProjectSettings()


// PURPOSE:	Initialize the taxonomy terms for a single legend
// INPUT:	$mArray = array of unique values for mote
//			$parent_id = ID of head tax term
//			$projRootTaxName = root taxonomy term for Project
// RETURNS:	array of taxonomic terms belonging to $mote_name

function dhpInitializeTaxonomy($mArray, $parent_id, $projRootTaxName)
{
	$args = array('parent' => $parent_id);

	// $updateTaxObject['debug']['tax'] = $projRootTaxName;
	// $updateTaxObject['debug']['parent'] = $args;
	// $updateTaxObject['debug']['mArrayLoop'] = array();

		// Loop through array and create terms with parent(mote_name) for non-empty values
	foreach ($mArray as $value) {
		if (!is_null($value) && $value != '') {
				// WP's term_exists() function doesn't escape slash characters!  Unlike wp_insert_term() and wp_update_term()!
	   		$termIs = term_exists(addslashes($value), $projRootTaxName, $parent_id);
	   			//debug
	   		// array_push($updateTaxObject['debug']['mArrayLoop'], addslashes($value));
	   		// array_push($updateTaxObject['debug']['mArrayLoop'], $termIs);
	   		if(!$termIs) {
	   			//if term doesn't exist, create
	   			wp_insert_term($value, $projRootTaxName, $args);
	   		} else {
	   			//update term using id
	   			wp_update_term($termIs->term_id, $projRootTaxName, $args);
	   		}
	   	}
	}
	// This is needed to create the terms which do not display until they are added to posts(markers in this case).
	// Code that was removed was not neccessary as it is run in the configure legend step with dhpGetMoteValues()
} // dhpInitializeTaxonomy()

	// PURPOSE: To associate taxonomic terms with Markers in this Project with corresponding values
	// INPUT: 	$projObj = Object of DHPressProject class
	//			$custom_field = custom field defined for Project's markers
	//			$parent_id = ID of head term of taxonomy
	//			$rootTaxName = name of root for all taxonomies belonging to this project
function dhpBindTaxonomyToMarkers($projObj, $custom_field, $parent_id, $rootTaxName, $mote_delim)
{
		// Empty out any pre-existing subterms in this taxonomy
	wp_update_term($parent_id, $rootTaxName);
		// Now (re)create all subterms
	$loop = $projObj->setAllMarkerLoop();
	while ( $loop->have_posts() ) : $loop->the_post();
		$marker_id = get_the_ID();
		$tempMoteValue = get_post_meta($marker_id, $custom_field, true);

			// ignore empty or null values
		if (!is_null($tempMoteValue) && $tempMoteValue != '') {
			$tempMoteArray = array();
			if ($mote_delim) {
				$tempMoteArray = split($mote_delim, $tempMoteValue );
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
} // dhpBindTaxonomyToMarkers()


// creates terms in taxonomy when a legend is created
add_action( 'wp_ajax_dhpGetLegendValues', 'dhpGetLegendValues' );

// PURPOSE:	Handle Ajax call to retrieve Legend values; create if does not exist already
// INPUT:	Through $_POST['mote'] array: ['type', 'delim', 'custom-fields', 'name']
//			$_POST['project'] = ID of Project
// RETURNS:	Array of unique values/tax-terms as JSON object
//			This array includes the "head term" (legend/mote name)

function dhpGetLegendValues()
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
		dhpInitializeTaxonomy($mArray, $parent_id, $rootTaxName);

			// Bind project's markers to the taxonomic terms
		dhpBindTaxonomyToMarkers($projObj, $custom_field, $parent_id, $rootTaxName, $mote_delim);
	} else {
		$parent_term = get_term_by('name', $mote_name, $rootTaxName);
		$parent_id = $parent_term->term_id;
	}

	$results = array();
	$results = $mArray;
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

 	//$dhp_top_term = get_term_by('name', $term_name, $rootTaxName);
	//$terms = get_terms($rootTaxName, array( 'orderby' => 'term_id' ) );

 		// Need to parse icon_url data from the description metadata
 	if ( $t_count > 0 ){
   		foreach ( $terms_loaded as $term ) {
   				// First try to retrieve icon_url field value from description
   			if(strlen($term->description) > 0){
   				$desc_object = json_decode(stripslashes($term->description));
   				$term_url = $desc_object->icon_url;

				// If term has no description field, load data from term_meta
   			} else {
   				if(function_exists(get_term_meta)) {
   					$term_url = get_term_meta($term->term_id, 'icon_url', true);
   				} else {
   					$term_url = null;
   				}
   			}
			$term->icon_url = $term_url;
		}
	}

	$results = $terms_loaded;

	die(json_encode($results));
} // dhpGetLegendValues()


add_action( 'wp_ajax_dhpSaveLegendValues', 'dhpSaveLegendValues' );

// PURPOSE:	Handle Ajax function to create or save terms associated with values defined
//			by a mote in a Project (Saving results of Configure Legend function)
// INPUT:	$_POST['project'] = ID of Project
//			$_POST['mote_name'] = name of mote (which is also head term/Legend name)
//			$_POST['terms'] = flat array of mote/legend values
// NOTES:	This function only expects and saves the parent, term_id, term_order and icon_url fields

function dhpSaveLegendValues()
{
	$mote_parent = $_POST['mote_name'];
	$projectID = $_POST['project'];

	// $raw_term_data = stripslashes($_POST['terms']);
	// $raw_term_data = stripslashes_deep($_POST['terms'])
	// $raw_term_data = $_POST['terms'];
	// $project_terms = json_decode($raw_term_data);

	$project_terms = $_POST['terms'];

		// Convert mote_parent to id
	$projRootTaxName = DHPressProject::ProjectIDToRootTaxName($projectID);

	foreach ($project_terms as $term) {
		// $term_name      = $term['name'];	// name not passed in

		$parent_term_id = intval($term['parent']);
		$term_id        = intval($term['term_id']);
		$term_order     = intval($term['term_order']);
		$meta_value     = $term['icon_url'];

		if ($meta_value=='undefined') { $meta_value = ''; }

			// Encode and append icon_url metadata
		$icon_url = add_magic_quotes(json_encode(array('icon_url' => $meta_value)));
		$updateArgs = array('parent' => $parent_term_id, 'term_group' =>  $term_order, 'description' => $icon_url);
			// Update term settings
		wp_update_term($term_id, $projRootTaxName, $updateArgs);
	}
	delete_option("{$projRootTaxName}_children");

	// die(json_encode($results));
	die('');
} // dhpSaveLegendValues()


add_action( 'wp_ajax_dhpCreateTermInTax', 'dhpCreateTermInTax' );

// PURPOSE:	Handle adding new terms to taxonomy (that don't pre-exist in Marker data)
// INPUT:	$_POST['project'] = ID of Project
//			$_POST['newTerm'] = name of taxonomy term to add
//			$_POST['legendName'] = name of parent term (mote/Legend) under which it should be added
// RETURNS:	ID of new term

function dhpCreateTermInTax()
{
	$projectID 			= $_POST['project'];
	$dhp_term_name		= $_POST['newTerm'];
	$parent_term_name	= $_POST['legendName'];

	$projRootTaxName = DHPressProject::ProjectIDToRootTaxName($projectID);
	$parent_term = term_exists( $parent_term_name, $projRootTaxName );
	$parent_term_id = $parent_term['term_id'];
	$args = array( 'parent' => $parent_term_id );
	// create new term
	$newTermId = wp_insert_term( $dhp_term_name, $projRootTaxName, $args );
	// $newTerm = get_term_by('id', $newTermId['term_id'], $projRootTaxName);
		// Clear term taxonomy
	delete_option("{$projRootTaxName}_children");

	die(json_encode($newTermId));
} // dhpCreateTermInTax()


add_action( 'wp_ajax_dhpDeleteHeadTerm', 'dhpDeleteHeadTerm' );

// PURPOSE:	Delete taxonomic terms in Project and all terms derived from it (as parent)
// INPUT:	$_POST['project'] = ID of Project
//			$_POST['term_name'] = name of taxonomy head term to delete

function dhpDeleteHeadTerm()
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
} // dhpDeleteHeadTerm()


// Enable for both editing and viewing

add_action('wp_ajax_dhpGetMarkers', 'dhpGetMarkers' );
add_action('wp_ajax_nopriv_dhpGetMarkers', 'dhpGetMarkers');

// dhpGetMarkers()
// PURPOSE:	Handle Ajax call to get all markers for a Project
// INPUT:	$_POST['project'] is ID of Project
// RETURNS:	JSON object of array of marker values

function dhpGetMarkers()
{
	$dhp_project = $_POST['project'];
	$mArray = createMarkerArray($dhp_project);

	// $result = json_encode($mArray);
	// $result = stripslashes($result);
	// die($result);
	die(json_encode($mArray));
} // dhpGetMarkers()


// Enable for both editing and viewing

add_action( 'wp_ajax_dhpGetMoteContent', 'dhpGetMoteContent' );
add_action('wp_ajax_nopriv_dhpGetMoteContent', 'dhpGetMoteContent');

// dhpGetMoteContent()
// PURPOSE: Handle Ajax call to fetch the Project-specific data for a specific marker
// INPUT:	$_POST['post'] = ID of marker post
// RETURNS:	JSON object of marker data

function dhpGetMoteContent()
{
	$dhp_post_id = $_POST['post'];

	$post_meta_content = get_post_meta($dhp_post_id);
	die(json_encode($post_meta_content));
} // dhpGetMoteContent()

// Enable for both editing and viewing

add_action( 'wp_ajax_dhpGetTranscriptClip', 'dhpGetTranscriptClip' );
add_action('wp_ajax_nopriv_dhpGetTranscriptClip', 'dhpGetTranscriptClip');

// getTranscriptClip($tran,$clip)
// PURPOSE:	Retrieve section of text file for transcript
// INPUT:	$tran = full text of transcript
//			$clip = String containing from-end time of segment
// RETURNS:	Excerpt of $tran within the time frame specified by $clip (not encoded as UTF8)
//			This text must begin with the beginning timestamp and end with the final timestamp

function getTranscriptClip($transcript, $clip)
{
	$codedTranscript  = utf8_encode($transcript);
	$clipArray        = split("-", $clip);
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
} // getTranscriptClip()


// loadTranscriptFromFile($fileUrl)
// PURPOSE:	Load the contents of a transcript file
// INPUT:	$fileUrl = the URL to the file
// RETURNS:	The data in file, if successful

function loadTranscriptFromFile($fileUrl)
{
	$content = @file_get_contents($fileUrl);
	if ($content === false) {
		trigger_error("Cannot load transcript file ".$fileUrl);
	}
	return $content;
} // loadTranscriptFromFile()


// dhpGetTranscriptClip()
// PURPOSE: AJAX function to retrieve section of transcript when viewing a Marker
// INPUT:	$_POST['project'] = ID of Project post
//			$_POST['transcript'] = URL to file containing contents of transcript
//			$_POST['timecode'] = timestamp specifying excerpt of transcript to return
// RETURNS:	JSON-encoded section of transcription

function dhpGetTranscriptClip()
{
	$dhp_project = $_POST['project'];
	$dhp_transcript_field = $_POST['transcript'];
	$dhp_clip = $_POST['timecode'];

	$dhp_transcript = loadTranscriptFromFile($dhp_transcript_field);
	$dhp_transcript_clip = getTranscriptClip($dhp_transcript,$dhp_clip);

	die(json_encode($dhp_transcript_clip));
} // dhpGetTranscriptClip()


// Enable for both editing and viewing

add_action( 'wp_ajax_dhpGetTaxTranscript', 'dhpGetTaxTranscript' );
add_action( 'wp_ajax_nopriv_dhpGetTaxTranscript', 'dhpGetTaxTranscript');

// PURPOSE: AJAX function to retrieve entire transcript when viewing a taxonomy archive page
// INPUT:	$_POST['project'] = ID of Project
//			$_POST['transcript'] = (end of URL) to file containing contents of transcript; slug based on mote value
//			$_POST['tax_term'] = the root taxonomic term that marker must match (based on Project ID)
// RETURNS:	null if not found, or if not associated with transcript; otherwise, JSON-encoded complete transcript with fields:
//				audio = data from custom field
//				settings = entry-point settings for transcript
//				transcript, transcript2 = transcript data itself for each of 2 possible transcripts

function dhpGetTaxTranscript()
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
	$first_marker = get_posts( $args );
	if (is_null($first_marker) || (count($first_marker) == 0)) {
		return null;
	}
	$marker_meta = get_post_meta( $first_marker[0]->ID );

	$projObj      = new DHPressProject($projectID);
	$rootTaxName  = $projObj->getRootTaxName();
	$proj_settings = $projObj->getAllSettings();

		// Store results to return here
	$dhp_object = array();

		// What custom field holds appropriate data? Fetch it from Marker
	$dhp_audio_mote = $projObj->getMoteByName($proj_settings->views->transcript->audio);
	$dhp_transcript_mote = $projObj->getMoteByName($proj_settings->views->transcript->transcript);

	$dhp_transcript_cfield = $dhp_transcript_mote->{'custom-fields'};
	$dhp_transcript = $marker_meta[$dhp_transcript_cfield][0];
	if($dhp_transcript!='none') {
		$dhp_transcript = loadTranscriptFromFile($dhp_transcript);
	}

		//if project has two transcripts
	if($proj_settings->views->transcript->transcript2) {
		$dhp_transcript2_mote = $projObj->getMoteByName($proj_settings->views->transcript->transcript2);
		$dhp_transcript2_cfield = $dhp_transcript2_mote->{'custom-fields'};
		$dhp_transcript2 = $marker_meta[$dhp_transcript2_cfield][0];
		if ($dhp_transcript2 != 'none') {
			$dhp_object['transcript2'] = loadTranscriptFromFile($dhp_transcript2);
		}
	}

	$dhp_object['settings'] = $dhp_transcript_ep;
	$dhp_object['audio'] = $marker_meta[$dhp_audio_mote->{'custom-fields'}][0];
	$dhp_object['transcript'] = $dhp_transcript;

	die(json_encode($dhp_object));
} // dhpGetTaxTranscript()


add_action( 'wp_ajax_dhpAddCustomField', 'dhpAddCustomField' );

// PURPOSE:	Handle Ajax call to create new custom field with particular value for all Markers in Project
// INPUT:	$_POST['project'] = ID of Project
//			$_POST['field_name'] = name of new custom field to add
//			$_POST['field_value'] = default value to set in all markers belonging to Project

function dhpAddCustomField()
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
} // dhpAddCustomField()


add_action( 'wp_ajax_dhpCreateCustomFieldFilter', 'dhpCreateCustomFieldFilter' );

// PURPOSE: Handle Ajax call to add the value of custom fields that match "filter condition"
// INPUT:	$_POST['project'] = ID of Project
//			$_POST['field_name'] = name of custom field
//			$_POST['field_value'] = value to set of custom field
//			$_POST['filter_key'] = name of field on which to match
//			$_POST['filter_value'] = value of field to match
// TO DO:	Rename function! dhpSetFieldByCustomFieldFilter?

function dhpCreateCustomFieldFilter()
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
} // dhpCreateCustomFieldFilter()


add_action('wp_ajax_dhpUpdateCustomFieldFilter', 'dhpUpdateCustomFieldFilter');

// dhpUpdateCustomFieldFilter()
// PURPOSE: To modify the value of a field (based on string replace) in all of a Project's Markers if
//			it satisfies query condition and currently matches a certain value (like Find & Replace)
// INPUT:	$_POST['project'] = ID of Project
//			$_POST['field_name'] = name of custom field we wish to change
//			$_POST['current_value'] = custom field must have this field to be changed
//			$_POST['new_value'] = new value to set
//			$_POST['filter_key'] = custom field upon which search/filter is based
//			$_POST['filter_value'] = value that must be in custom field
// RETURNS:	Number of markers whose values were changed

function dhpUpdateCustomFieldFilter()
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
		$tempPostContent = get_the_content();
		if($dhp_custom_field_name=='the_content') {

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
} // dhpUpdateCustomFieldFilter()


add_action( 'wp_ajax_dhpReplaceCustomFieldFilter', 'dhpReplaceCustomFieldFilter' );

// dhpReplaceCustomFieldFilter()
// PURPOSE: To replace the value of a field in all of a Project's Markers if
//			it satisfies query condition and currently matches a certain value
// INPUT:	$_POST['project'] = ID of Project
//			$_POST['field_name'] = name of custom field we wish to change
//			$_POST['new_value'] = value to 
//			$_POST['filter_key'] = custom field upon which search/filter is based
//			$_POST['filter_value'] = value that must be in custom field
// RETURNS:	Number of markers whose values were changed

function dhpReplaceCustomFieldFilter()
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
		$tempPostContent = get_the_content();
		if($dhp_custom_field_name=='the_content') {
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
} // dhpReplaceCustomFieldFilter()


add_action( 'wp_ajax_dhpGetFieldValues', 'dhpGetFieldValues' );

// dhpGetFieldValues()
// PURPOSE: Handle Ajax call to get values for custom field
// INPUT:	$_POST['project'] = ID of Project
//			$_POST['field_name'] = name of custom field
// RETURNS:	JSON Object of array of all unique values for the field in the project

function dhpGetFieldValues()
{
	$projectID 	= $_POST['project'];
	$fieldName 	= $_POST['field_name'];
	$projObj 	= new DHPressProject($projectID);
	$tempValues	= $projObj->getCustomFieldUniqueValues($fieldName);

	die(json_encode($tempValues));
} // dhpGetFieldValues()


add_action( 'wp_ajax_dhpFindReplaceCustomField', 'dhpFindReplaceCustomField' );

// dhpFindReplaceCustomField()
// PURPOSE: Handle Ajax function to do string replace on matching values in all custom fields in Project
// INPUT:	$_POST['project'] = ID of Project
//			$_POST['field_name'] = name of custom field
//			$_POST['find_value'] = field must match this value to be replaced
//			$_POST['replace_value'] = value to use for string replace in field
// RETURNS:	Number of markers whose values were changed

function dhpFindReplaceCustomField()
{
	$projectID = $_POST['project'];
	$dhp_custom_field_name = $_POST['field_name'];
	$dhp_custom_find_value = $_POST['find_value'];
	$dhp_custom_replace_value = $_POST['replace_value'];
	$projObj = new DHPressProject($projectID);

	// $args = array( 'post_type' => 'dhp-markers', 'meta_key' => 'project_id','meta_value'=>$dhp_project, 'posts_per_page' => -1 );
	// $loop = new WP_Query( $args );
	$loop = $projObj->setAllMarkerLoop();
	$dhp_count=0;
	while ( $loop->have_posts() ) : $loop->the_post();
		$dhp_count++;
		$marker_id = get_the_ID();
		$tempPostContent = get_the_content();
		if($dhp_custom_field_name=='the_content') {
			$new_value = str_replace($dhp_custom_find_value,$dhp_custom_replace_value,$tempPostContent);

			$new_post = array();
			$new_post['ID'] = $marker_id;
			$new_post['post_content'] = $new_value;
			wp_update_post( $new_post );
		}
		else {
			$temp_value = get_post_meta( $marker_id, $dhp_custom_field_name, true );
			//replaces string within the value not the whole value
			$new_value = str_replace($dhp_custom_find_value,$dhp_custom_replace_value,$temp_value);
			update_post_meta($marker_id, $dhp_custom_field_name, $new_value);
		}

	endwhile;
	
	die(json_encode($dhp_count));
} // dhpFindReplaceCustomField()


add_action( 'wp_ajax_dhpDeleteCustomField', 'dhpDeleteCustomField' );

// dhpDeleteCustomField()
// PURPOSE:	Handle Ajax query to remove specific custom field from all markers of a Project
// INPUT:	$_POST['project'] = ID of Project
//			$_POST['field_name'] = name of custom field

function dhpDeleteCustomField()
{
	$projectID = $_POST['project'];
	$dhp_custom_field_name = $_POST['field_name'];
	$projObj = new DHPressProject($projectID);
	
	// $args = array( 'post_type' => 'dhp-markers', 'meta_key' => 'project_id','meta_value'=>$projectID, 'posts_per_page' => -1 );
	// $loop = new WP_Query( $args );
	$loop = $projObj->setAllMarkerLoop();
	while ( $loop->have_posts() ) : $loop->the_post();

		$marker_id = get_the_ID();
		delete_post_meta($marker_id, $dhp_custom_field_name);
		//add_post_meta($marker_id, $dhp_custom_field_name, $dhp_custom_field_value, true);

	endwhile;
	
	die();
} // dhpDeleteCustomField()


add_action( 'wp_ajax_dhpGetCustomFields', 'dhpGetCustomFields' );

// dhpGetCustomFields()
// PURPOSE:	Handle Ajax call to retrieve all custom fields defined for a Project
// INPUT:	$_POST['project'] = ID of Project
// RETURNS: JSON Object of array of all custom fields

function dhpGetCustomFields()
{
	$projectID = $_POST['project'];
	$projObj   = new DHPressProject($projectID);
	
	$dhp_custom_fields = $projObj->getAllCustomFieldNames();
	die(json_encode($dhp_custom_fields));
} // dhpGetCustomFields()


add_action( 'wp_restore_post_revision', 'dhp_project_restore_revision', 10, 2 );

// dhp_project_restore_revision( $post_id, $revision_id )
// PURPOSE: Handles returning to an earlier revision of this post
// INPUT:	$post_id = ID of original post
//			$revision_id = ID of new revised post

function dhp_project_restore_revision($post_id, $revision_id)
{
	$dhp_project_settings_fields = array( 'project_settings', 'project_icons' );

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

// add_dhp_project_admin_scripts( $hook )
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
        if ( $post->post_type == 'project' ) {
        		// Get the object for the Project so we can pass the custom fields
			// $projObj = new DHPressProject($postID);
			// $customFields = $projObj->getAllCustomFieldNames();

        		// Library styles
			wp_enqueue_style('jquery-ui-style', plugins_url('/lib/jquery-ui-1.10.4/themes/base/jquery.ui.all.css', dirname(__FILE__)) );
			wp_enqueue_style('jquery-colorpicker-style', plugins_url('/lib/colorpicker/jquery.colorpicker.css',  dirname(__FILE__)) );
			// wp_enqueue_style('wp-jquery-ui-dialog' );
			wp_enqueue_style('maki-sprite-style', plugins_url('/lib/maki-sprite.css',  dirname(__FILE__)) );
			wp_enqueue_style('leaflet-style', plugins_url('/lib/leaflet-0.7.2/leaflet.css',  dirname(__FILE__)) );
				// Lastly, our plug-in specific styles
			wp_enqueue_style('dhp-admin-style', plugins_url('/css/dhp-admin.css',  dirname(__FILE__)) );

				// JavaScript libraries registered by WP
			wp_enqueue_script('jquery');
			wp_enqueue_script('underscore');

			wp_enqueue_script('jquery-ui-core');
			wp_enqueue_script('jquery-ui-widget');
			wp_enqueue_script('jquery-ui-mouse');
			wp_enqueue_script('jquery-ui-button');
			wp_enqueue_script('jquery-ui-draggable');
			wp_enqueue_script('jquery-ui-position');
			wp_enqueue_script('jquery-ui-dialog');
			wp_enqueue_script('jquery-ui-accordion');
			wp_enqueue_script('jquery-ui-slider');

				// JS libraries specific to DH Press
			wp_enqueue_script('jquery-nestable', plugins_url('/lib/jquery.nestable.js', dirname(__FILE__)), 'jquery' );
			wp_enqueue_script('jquery-colorpicker', plugins_url('/lib/colorpicker/jquery.colorpicker.js', dirname(__FILE__)), 'jquery' );
			wp_enqueue_script('jquery-colorpicker-en', plugins_url('/lib/colorpicker/i18n/jquery.ui.colorpicker-en.js', dirname(__FILE__)),
				array('jquery', 'jquery-colorpicker') );

				// For touch-screen mechanisms
			wp_enqueue_script('dhp-touch-punch', plugins_url('/lib/jquery.ui.touch-punch.js', dirname(__FILE__)),
				array('jquery', 'jquery-ui-widget', 'jquery-ui-mouse') );

				// Mapping
			wp_enqueue_script('leaflet', plugins_url('/lib/leaflet-0.7.2/leaflet.js', dirname(__FILE__)) );

			wp_enqueue_script('knockout', plugins_url('/lib/knockout-3.1.0.js', dirname(__FILE__)) );

				// Custom JavaScript for Admin Edit Panel
			$allDepends = array('jquery', 'underscore', 'jquery-ui-core', 'jquery-nestable', 'jquery-colorpicker',
								'leaflet', 'knockout');
			wp_enqueue_script('dhp-project-script', plugins_url('/js/dhp-project-admin.js', dirname(__FILE__)), $allDepends );
			wp_localize_script('dhp-project-script', 'dhpDataLib', array(
				'ajax_url' => $dev_url,
				'projectID' => $postID
			) );

        } else if ( $post->post_type == 'dhp-markers' ) {
        	wp_enqueue_style('dhp-admin-style', plugins_url('/css/dhp-admin.css',  dirname(__FILE__) ));
        }

        // Shows list of all Project in admin panel
    } else if ( $hook == 'edit.php'  ) {
        if ( $post->post_type == 'project' ) {
			// wp_enqueue_style('dhp-map', plugins_url('/css/dhp-map.css',  dirname(__FILE__) ));
			wp_enqueue_script('jquery' );
        }
    }
} // add_dhp_project_admin_scripts()


// PURPOSE: Extract DHP custom map data from Map Library so they can be rendered
// INPUT:	$mapLayers = array of EP Map layers (each containing Hash ['mapType'], ['id' = WP post ID])
// RETURNS: Array of data about map layers
// ASSUMES:	Custom Map data has been loaded into WP DB
// TO DO:	Further error handling if necessary map data doesn't exist?

function dhpGetMapLayerData($mapLayers)
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
		$mapData = getMapMetaData($layer->id, $mapMetaList);
			// Do basic error checking to ensure necessary fields exist
		if ($mapData['dhp_map_typeid'] == '') {
			trigger_error('No dhp_map_typeid metadata for map named '.$layer->name.' of id '.$layer->id);
		}
		array_push($mapArray, $mapData);
	}
	return $mapArray;
} // dhpGetMapLayerData()


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


add_filter( 'the_content', 'dhp_mod_page_content' );

// PURPOSE:	Called by WP to modify content to be rendered for a post page
// INPUT:	$content = material to show on page
// RETURNS:	$content with ID of this post and DH Press hooks for marker text and visualization
// NOTES:   Need to insert Handlebars script texts into HTML, depending on visualizations

function dhp_mod_page_content($content) {
	$postID = get_the_ID();
	$postType = get_query_var('post_type');
		// Only produce dhp-visual div hook for Project posts
	switch ($postType) {
	case 'project':
    	$projObj = new DHPressProject($postID);

		$projscript = dhp_get_script_text(DHP_SCRIPT_PROJ_VIEW);

	    if (!is_null($projObj->getEntryPointByName('map'))) {
	    	$projscript .= dhp_get_script_text(DHP_SCRIPT_MAP_VIEW);
	    }
		$to_append = '<div id="dhp-visual"></div>'.$projscript;
		break;
	default:
		$to_append = '';
		break;
	}
	return $content.'<div class="dhp-post" id="'.$postID.'"><div class="dhp-entrytext"></div>'.$to_append.'</div>';
} // dhp_mod_page_content()


add_filter( 'single_template', 'dhp_page_template' );

// PURPOSE:	Called by WP to modify output for rendering page, inc template to be used, acc to Project
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
    if ( $post_type == 'project' ) {
    	$projObj = new DHPressProject($post->ID);

    		// Communicate to visualizations by sending parameters in this array
    	$vizParams = array();

		//foundation styles
        wp_enqueue_style( 'dhp-foundation-style', plugins_url('/lib/foundation-5.1.1/css/foundation.min.css',  dirname(__FILE__)));
        wp_enqueue_style( 'dhp-foundation-icons', plugins_url('/lib/foundation-icons/foundation-icons.css',  dirname(__FILE__)));

		wp_enqueue_style('dhp-jquery-ui-style', 'http://code.jquery.com/ui/1.10.2/themes/smoothness/jquery-ui.css');
		wp_enqueue_style('dhp-style', plugins_url('/css/dhp-style.css',  dirname(__FILE__)), '', DHP_PLUGIN_VERSION );
		wp_enqueue_style('joyride-css', plugins_url('/css/joyride-2.1.css',  dirname(__FILE__)));

		wp_enqueue_script('underscore');
		wp_enqueue_script('jquery');
		wp_enqueue_script('dhp-foundation', plugins_url('/lib/foundation-5.1.1/js/foundation.min.js', dirname(__FILE__)), 'jquery');
		wp_enqueue_script('dhp-modernizr', plugins_url('/lib/foundation-5.1.1/js/vendor/modernizr.js', dirname(__FILE__)), 'jquery');
		wp_enqueue_script('handlebars', plugins_url('/lib/handlebars-v1.1.2.js', dirname(__FILE__)));
		wp_enqueue_script('joyride', plugins_url('/lib/jquery.joyride-2.1.js', dirname(__FILE__)), 'jquery');

    		// Visualization specific -- only 1st Entry Point currently supported
    	$projectSettings_viz = $projObj->getEntryPointByIndex(0);
    	switch ($projectSettings_viz->type) {
    	case 'map':
			wp_enqueue_style('dhp-map-css', plugins_url('/css/dhp-map.css',  dirname(__FILE__)), '', DHP_PLUGIN_VERSION );
			wp_enqueue_style('leaflet-css', plugins_url('/lib/leaflet-0.7.2/leaflet.css',  dirname(__FILE__)), '', DHP_PLUGIN_VERSION );

	    	wp_enqueue_script('dhp-google-map-script', 'http'. ( is_ssl() ? 's' : '' ) .'://maps.google.com/maps/api/js?v=3&amp;sensor=false');

			wp_enqueue_script('jquery-ui-core');
	 		wp_enqueue_script('jquery-ui-slider');

			wp_enqueue_script('leaflet', plugins_url('/lib/leaflet-0.7.2/leaflet.js', dirname(__FILE__)));

			wp_enqueue_script('dhp-maps-view', plugins_url('/js/dhp-maps-view.js', dirname(__FILE__)), 'leaflet', DHP_PLUGIN_VERSION);
			wp_enqueue_script('dhp-custom-maps', plugins_url('/js/dhp-custom-maps.js', dirname(__FILE__)), 'leaflet', DHP_PLUGIN_VERSION);

				// Get any DHP custom map parameters
			$layerData = dhpGetMapLayerData($projectSettings_viz->settings->layers);
			$vizParams["layerData"] = $layerData;

	    	array_push($dependencies, 'leaflet', 'dhp-google-map-script', 'dhp-maps-view', 'dhp-custom-maps',
	    							'jquery-ui-slider', 'joyride');
	    	break;
	    case 'cards':
			wp_enqueue_style('dhp-cards-css', plugins_url('/css/dhp-cards.css',  dirname(__FILE__)) );

			wp_enqueue_script('isotope', plugins_url('/lib/isotope.pkgd.js', dirname(__FILE__)));
			wp_enqueue_script('dhp-cards-view', plugins_url('/js/dhp-cards-view.js', dirname(__FILE__)), 
				'isotope' );

	    	array_push($dependencies, 'isotope', 'dhp-cards-view');
	    	break;
	    default:
	 		trigger_error("Unknown visualization type: ".$projectSettings_viz->type);
	    	break;
	    }

	    	// Transcript specific
	    if ($projObj->selectModalHas('transcript')) {
			wp_enqueue_style('transcript', plugins_url('/css/transcriptions.css',  dirname(__FILE__)), '', DHP_PLUGIN_VERSION );
	        wp_enqueue_script('soundcloud-api', 'http://w.soundcloud.com/player/api.js','jquery');
			wp_enqueue_script('dhp-transcript', plugins_url('/js/dhp-transcript.js',  dirname(__FILE__)),
				 array('jquery', 'underscore', 'soundcloud-api'), DHP_PLUGIN_VERSION);
	    	array_push($dependencies, 'dhp-transcript');
	    }

	    	// Enqueue page JS last, after we've determine what dependencies might be
		wp_enqueue_script('dhp-public-project-script', plugins_url('/js/dhp-project-page.js', dirname(__FILE__)), $dependencies, DHP_PLUGIN_VERSION );

		wp_localize_script( 'dhp-public-project-script', 'dhpData', array(
			'ajax_url'   => $dev_url,
			'vizParams'  => $vizParams,
			'settings'   => $projObj->getAllSettings()
		) );

		// Looking at a Marker/Data entry?
    } else if ( $post_type == 'dhp-markers' ) {
		$project_id = get_post_meta($post->ID, 'project_id',true);
		$projObj = new DHPressProject($project_id);

		//foundation styles
		wp_enqueue_style( 'dhp-foundation-style', plugins_url('/lib/foundation-5.1.1/css/foundation.min.css',  dirname(__FILE__)));
		wp_enqueue_style( 'dhp-foundation-icons', plugins_url('/lib/foundation-icons/foundation-icons.css',  dirname(__FILE__)));

		wp_enqueue_style('dhp-admin-style', plugins_url('/css/dhp-style.css',  dirname(__FILE__)), '', DHP_PLUGIN_VERSION );

		wp_enqueue_script('jquery');
		wp_enqueue_script( 'dhp-foundation', plugins_url('/lib/foundation-5.1.1/js/foundation.min.js', dirname(__FILE__)), 'jquery');
		wp_enqueue_script( 'dhp-modernizr', plugins_url('/lib/foundation-5.1.1/js/vendor/modernizr.js', dirname(__FILE__)), 'jquery');
		wp_enqueue_script('underscore');

			// Enqueue last, after dependencies determined
		wp_enqueue_script('dhp-public-project-script', plugins_url('/js/dhp-marker-page.js', dirname(__FILE__)), $dependencies, DHP_PLUGIN_VERSION);

		wp_localize_script( 'dhp-public-project-script', 'dhpData', array(
			'ajax_url' => $dev_url,
			'settings' => $projObj->getAllSettings()
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
	    	// If above doesn't work, try comparing $term->taxonomy

	    	// mediaelement for timelines -- not currently used
		// wp_enqueue_style('mediaelement', plugins_url('/js/mediaelement/mediaelementplayer.css',  dirname(__FILE__) ));

		//foundation styles
		wp_enqueue_style( 'dhp-foundation-style', plugins_url('/lib/foundation-5.1.1/css/foundation.min.css',  dirname(__FILE__)));
		wp_enqueue_style( 'dhp-foundation-icons', plugins_url('/lib/foundation-icons/foundation-icons.css',  dirname(__FILE__)));

	    // wp_enqueue_style( 'joyride', plugins_url('/css/joyride-2.1.css',  dirname(__FILE__) ));
		wp_enqueue_style('dhp-style', plugins_url('/css/dhp-style.css',  dirname(__FILE__)), '', DHP_PLUGIN_VERSION );

		wp_enqueue_script( 'jquery' );
		wp_enqueue_script( 'dhp-foundation', plugins_url('/lib/foundation-5.1.1/js/foundation.min.js', dirname(__FILE__)), 'jquery');
		wp_enqueue_script( 'dhp-modernizr', plugins_url('/lib/foundation-5.1.1/js/vendor/modernizr.js', dirname(__FILE__)), 'jquery');
		wp_enqueue_script( 'underscore' );
		// wp_enqueue_script( 'joyride', plugins_url('/js/jquery.joyride-2.1.js', dirname(__FILE__),array('jquery') ));
		// wp_enqueue_script('handlebars', plugins_url('/lib/handlebars-v1.1.2.js', dirname(__FILE__)));

	    if ($isTranscript) {
			wp_enqueue_style('transcript', plugins_url('/css/transcriptions.css',  dirname(__FILE__)), '', DHP_PLUGIN_VERSION );
		    wp_enqueue_script('soundcloud-api', 'http://w.soundcloud.com/player/api.js','jquery');
			wp_enqueue_script('dhp-transcript', plugins_url('/js/dhp-transcript.js',  dirname(__FILE__)),
				 array('jquery', 'underscore', 'soundcloud-api'), DHP_PLUGIN_VERSION);
		    array_push($dependencies, 'dhp-transcript');
		}

			// Enqueue last, after dependencies have been determined
		wp_enqueue_script( 'dhp-tax-script', plugins_url('/js/dhp-tax-page.js', dirname(__FILE__)), $dependencies, DHP_PLUGIN_VERSION );

		wp_localize_script( 'dhp-tax-script', 'dhpData', array(
				'project_id' => $projectID,
				'ajax_url' => $dev_url,
				'tax' => $term,
				'project_settings' => $project_settings,
				'isTranscript' => $isTranscript
			) );
	}
	return $page_template;
} // dhp_tax_template()


// dhp_deploy_icons()
// PURPOSE:	Produce HTML to display all marker icons in sidebar; search for all gif, jpg and png files

// function dhp_deploy_icons()
// { 	
// 	$icon_path = DHP_PLUGIN_URL.'/images/icons/';
// 	$icon_dir = DHP_PLUGIN_DIR.'/images/icons/';	
	
// 	$icons_array = array();
	
	
// 	if ($handle = opendir($icon_dir)) {
		
// 		while (false !== ($file = readdir($handle))) {
	
// 			$file_type = wp_check_filetype($file);
	
// 			$file_ext = $file_type['ext'];
		
// 			if ($file != "." && $file != ".." && ($file_ext == 'gif' || $file_ext == 'jpg' || $file_ext == 'png') ) {
// 				array_push($icons_array,$icon_path.$file);
// 			}
// 		}
// 	}
/** 	?>
          	   
// 		<div id="dhp_icon_cont">
        	
// 		<?php $i = 1; foreach ($icons_array as $icon){ ?>
// 		  <div class="dhp_icon" id="icon_<?php echo $i;?>">
// 		  <img src="<?php echo $icon; $i++; ?>" /> 
// 		  </div>
// 		<?php } ?>
        
// 		 </div> 
//          <div id="icon-cats"><ul>
         
//          </ul></div>
         
         	
// 	<?php
// } // dhp_deploy_icons()
**/
