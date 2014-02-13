<?php 

/**
	 * Registers and handles DHPress Project functions
	 *
	 * @package DHPress Toolkit
	 * @author DHPress Team
	 * @link http://dhpress.org/download/
	 */

// ================== Global Constants and Variables ===================

define( 'DHP_SCRIPT_PROJ_VIEW',  'dhp-script-proj-view.txt' );
define( 'DHP_SCRIPT_MAP_VIEW',   'dhp-script-map-view.txt' );
// define( 'DHP_SCRIPT_TAX_TRANS',  'dhp-script-tax-trans.txt' );	// currently unused
// define( 'DHP_SCRIPT_TRANS_VIEW', 'dhp-script-trans-view.txt' );   // currently unneeded

	// HTML fields added to Custom Fields box in Edit Project admin panel
// $dhp_project_settings_fields = array (
// 	array(
// 		'label'=> 'Project Settings',
// 		'desc'	=> 'Stores the project_settings string as a JSON object.',
// 		'id'	=> 'project_settings',
// 		'type'	=> 'textarea'
// 	),
// 	array(
// 		'label'=> 'Icons',
// 		'desc'	=> 'Icons for categories.',
// 		'id'	=> 'project_icons',
// 		'type'	=> 'hidden'
// 	)
// );

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


// ================== Preparing the Admin Panel ==================

// admin_init called when user brings up the admin panel -- this sets global variable
// add_action('admin_init', 'init_layer_list');

// init_layer_list()
// PURPOSE:	Sets global variable of list of map layers for later use

// function init_layer_list()
// {
// 	$layers_global = getLayerList();
// } // init_layer_list()


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

// show_tax_on_project_markers()
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
add_action('add_meta_boxes', 'add_dhp_project_icons_box');

// add_dhp_project_icons_box()
// PURPOSE:	Add the editing box for Marker icons (shown on maps)

function add_dhp_project_icons_box()
{
    add_meta_box(
		'dhp_icons_box', // $id
		'Marker Icons', // $title
		'show_dhp_project_icons_box', // $callback
		'project', // $page
		'side', // $context 
		'default'); // $priority
} // add_dhp_project_icons_box()

function show_dhp_project_icons_box()
{
	//dhp_deploy_icons();
	bdw_get_images();
} // show_dhp_project_icons_box()


// PURPOSE: Create HTML icon box on right sidebox
// SIDE FX:	Outputs HTML of thumbnail images of images associated with post
// ASSUMES:	$post global is set to Project post
// TO DO:	Wrap in Project class

function bdw_get_images()
{
	global $post;

    // Get the post ID
    $iPostID = $post->ID;
 
    // Get images associated with this Project post
    $arrImages = get_children('post_type=attachment&post_mime_type=image&numberpost=-1&post_parent=' . $iPostID );
 
    // If images exist for this page
    if($arrImages) {
 
        // Get array keys representing attached image numbers
        $arrKeys = array_keys($arrImages);
 
        $sImgString .= '<div class="misc-pub-section icons">';
 
        // UNCOMMENT THIS IF YOU WANT THE FULL SIZE IMAGE INSTEAD OF THE THUMBNAIL
        //$sImageUrl = wp_get_attachment_url($iNum);
        $i = 0;
 		foreach ($arrKeys as $field) {
 			// Get the first image attachment
        	$iNum = $arrKeys[$i];
 			$i++;
        	// Get the thumbnail url for the attachment
       		$sThumbUrl = wp_get_attachment_thumb_url($iNum);
        	// Build the <img> string
        	$sImgString .= '<a id="'.$iNum.'" >' .
                            '<img src="' . $sThumbUrl . '"/>' .
                        '</a>';
 		}
 		$sImgString .= '</div>';
        // Print the image
        echo $sImgString;
    }
} // bdw_get_images()


// add_meta_boxes called when Edit Post runs
add_action('add_meta_boxes', 'add_dhp_project_settings_box');

// PURPOSE: Called when Project is edited in admin panel to create Project-specific GUI

function add_dhp_project_settings_box()
{
    add_meta_box(
		'dhp_settings_box', 			// id of edit box
		'Project Details',				// textual title of box
		'show_dhp_project_settings_box', // name of callback function
		'project',						// custom page name
		'normal',						// part of page to add box
		'high'); 						// priority
} // add_dhp_project_settings_box()


// PURPOSE:	Called by WP to create HTML for hidden fields (in admin panel) which save Project state
//					for auto-save
// ASSUMES:	Global $post is set to point to post for current project
//			Global $dhp_project_settings_fields is set to array of strings describing HTML controls
// SIDE-FX: Creates hidden fields for storing data   
// TO DO:	Put all HTML producing logic into special generalized function

function show_dhp_project_settings_box()
{
	global $post;

	$projObj = new DHPressProject($post->ID);
    $project_settings = $projObj->getAllSettings();
    	// must handle case that project has just been created and does not have settings yet
    if (is_null($project_settings)) {
    	$project_settings = '';
    } else {
    	$project_settings = json_encode($project_settings);
    }

	// Load post id for project settings
	echo '<input type="hidden" id="dhp-projectid" value="'.$post->ID.'"/>';
	// Use nonce for verification
	echo '<input type="hidden" name="dhp_project_settings_box_nonce" value="'.wp_create_nonce(basename(__FILE__)).'" />';

	// Insert HTML for special Project fields
	echo '<table class="project-form-table">';
	echo '<tr><th><label for="project_settings">Project Settings</label></th><td>';
	echo '<textarea name="project_settings" id="project_settings" cols="60" rows="4">'.$project_settings.'</textarea>
		<br /><span class="description">Stores the project_settings as JSON object</span>';
	echo '</td></tr>';
	echo '<input type="hidden" name="project_icons" id="project_icons" value="'.get_post_meta($post->ID, 'project_icons', true).'" />';
	echo '</table>'; // end table

	print_new_bootstrap_html($post->ID);
} // show_dhp_project_settings_box()


// 'save_post' is called after post is created or updated
add_action('save_post', 'save_dhp_project_settings');

// PURPOSE: Save data posted to WP for project
//				(Could be invoked by Auto-Save feature of WP)
// INPUT:	$post_id is the id of the post updated
// NOTE:    Complication is for new Project that does not yet have ID?
// ASSUMES:	$_POST is set to post data
//			$dhp_project_settings_fields describes the data posted

function save_dhp_project_settings($post_id)
{
    // global $dhp_project_settings_fields;

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

		// $parent  = get_post( $parent_id );

	$projObj = new DHPressProject($srcToCheck);
    $old = $projObj->getAllSettings();
    $new = $_POST['project_settings'];
	if ($new && $new != $old) {
		update_metadata('post', $post_id, 'project_settings', $new);
	} elseif ($new == '' && $old) {
		delete_metadata('post', $post_id, 'project_settings', $old);
	}

	$old = get_post_meta($srcToCheck, 'project_icons', true);
	$new = $_POST['project_icons'];
	if ($new && $new != $old) {
		update_metadata('post', $post_id, 'project_icons', $new);
	} elseif ($new == '' && $old) {
		delete_metadata('post', $post_id, 'project_icons', $old);
	}
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


// getIconsForTerms($parent_term, $taxonomy)
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

function getIconsForTerms($parent_term, $taxonomy)
{
	$children_names  = array();
	$filter_children = array();

	$filter_object['type']  = "filter";
	$filter_object['name']  = $parent_term->name;
	$filter_object['terms'] = array();

		// Begin with top-level mote name
	$filter_parent['name']     = $parent_term->name;
	$filter_parent['id']       = intval($parent_term->term_id);
	// $icon_url        = get_term_meta($parent_term->term_id,'icon_url',true);
	// $filter_parent['icon_url'] = $icon_url;

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
			$desc_object = json_decode($child->description);
			$icon_url = $desc_object->icon_url;
		}
		else {
			if(function_exists(get_term_meta)){
				$icon_url = get_term_meta($child->term_id,'icon_url',true);
			}
			else {
				$icon_url = null;
			}
		}

		if ($icon_url == "Pick Icon") {
			trigger_error("Project cannot be viewed until legend ".$parent_term->name." is configured.");
		}

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
} // getIconsForTerms()


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

// add_action( 'wp_ajax_dhp_get_group_feed', 'dhp_get_group_feed' );
// add_action( 'wp_ajax_nopriv_dhp_get_group_feed', 'dhp_get_group_feed' );

// PURPOSE: Determine all Markers in this Project associated with a specific term
//				and their associated data (as configured in project settings)
// INPUT:	$tax_name = taxonomic root for this Project
// 			$term_name = taxonomic term created for Mote value
// RETURNS:	Feature collection containing Markers associated with term
// ASSUMES: Should retain marker even if missing visualization data
// NOTE:    Which specific features will be returned in results will depend upon visualization; that is,
//				category/legend MUST be augmented by visual features
// TO DO:   Is this function even used or needed now? Doesn't look like it.

function dhp_get_group_feed($rootTaxName,$term_name)
{
		// Get ProjectID from taxonomy root name
	$projectID = DHPressProject::RootTaxNameToProjectID($rootTaxName);
	$projObj = new DHPressProject($projectID);

    $project_settings = $projObj->getAllSettings();

    $the_term = get_term_by('name', $term_name, $rootTaxName);

    	// Initialize settings in case not used
	$map_pointsMote = $cordMote = $audio = $transcript = $timecode = null;

    	// Accumulate settings that are specified
	foreach( $project_settings['entry-points'] as $eps) {
		switch ($eps['type']) {
		case "map":
				// Get mote responsible for setting Lat/Lon on map
			$map_pointsMote = $projObj->getMoteByName($eps['settings']['marker-layer'] );
				// Ensure type is Lat/Lon
			if($map_pointsMote['type']=='Lat/Lon Coordinates'){
					// use "," as default delimiter
				if(!$map_pointsMote['delim']) { $map_pointsMote['delim']=','; }
					// Is custom-fields a concatenation of two other fields?
				$coordMote = split($map_pointsMote['delim'],$map_pointsMote['custom-fields']);
			}
			break;
		}
	}

	if ($projObj->selectModalHas("transcript")) {
		$audio = $project_settings['views']['transcript']['audio'];
		if (!is_null($audio) && ($audio != '')) {
			$transcript = $project_settings['views']['transcript']['transcript'];
			$transcript2= $project_settings['views']['transcript']['transcript2'];
			$timecode   = $project_settings['views']['transcript']['timecode'];
		}
	}

	$feature_collection['type'] = "FeatureCollection";
	$feature_collection['features'] = array();

	$args = array(
	    'post_type'=> 'dhp-markers',
	    'posts_per_page' => '-1',
	    'tax_query' => array(
			array(
				'taxonomy' => $tax_name,
				'field' => 'slug',
				'terms' => $the_term->slug
			)
		)
    );
	$loop = new WP_Query( $args );

		// Go through all marker posts that match
	while ( $loop->have_posts() ) : $loop->the_post();
			// Get its value(s) for this legend/category
		$marker_id = get_the_ID();
		$args1 = array("fields" => "names");
		$post_terms = wp_get_post_terms( $marker_id, $rootTaxName, $args1 );

		$this_feature = array();
		$this_feature['properties']= array();
		$this_feature['properties']['title'] = get_the_title();
		$this_feature['properties']['categories'] = json_encode($post_terms);

			// Get all potential visualization features

			// Get audio transcripts features
		if (!is_null($audio)) {
			$audio_val = get_post_meta($marker_id, $audio['custom-fields'], true);
			$timecode_val = get_post_meta($marker_id, $timecode['custom-fields'], true);
			$this_feature['properties']['audio'] = $audio_val;
			$this_feature['properties']['timecode'] = $timecode_val;
		}

			// Get map visualization features
		if (!is_null($map_pointsMote)) {
				// retrieve coordinate data
			if(count($coordMote)==2) {
				$temp_lat = get_post_meta($marker_id, $coordMote[0], true);
				$temp_lon = get_post_meta($marker_id, $coordMote[1], true);
				// if ($temp_lat=="" || $temp_lon=="" || !is_numeric($temp_lat) || !is_numeric($temp_lon)) {
				// 	continue;
				// }
				$lonlat = $temp_lon.','.$temp_lat;
				// if (is_null($lonlat)) {
				// 	continue;
				// }
			} else if(count($coordMote)==1) {
				$temp_latlon = get_post_meta($marker_id, $coordMote[0], true);
				// if ($temp_latlon=="" || !is_numeric($temp_latlon)) {
				// 	continue;
				// }
				$lonlat = invertLatLon($temp_latlon);
				// if (is_null($lonlat)) {
				// 	continue;
				// }
			}

			$this_feature['type'] = 'Feature';
			$this_feature['geometry'] = array();

			$this_feature['geometry']['type'] = 'Point';
			$this_feature['geometry']['coordinates'] = $lonlat;
			//properties
			//array_push($markerArray,$json_string); 
		}
		array_push($feature_collection['features'],$this_feature);

	endwhile;

	return $feature_collection;
} // dhp_get_group_feed()


// PURPOSE:	Creates Legends and Feature Collections Object (as per OpenLayer) when looking at a project page;
//			That is, return array describing all markers based on filter and visualization
// INPUT:	$project_id = ID of Project to view
// RETURNS: JSON object describing all markers associated with Project
//			[0..n] is as getIconsForTerms above; [n+1] is as follows:
			// {	"type": "FeatureCollection",
			// 	 	"features" :
			// 		[
			// 			{ "type" : "Feature",
			// 			  "geometry" : {"type" : "Point", "coordinates" : longlat}, 
			// 			  "properties" :
			// 				[
			// 					"title" : String,
			// 					"categories" : [ integer IDs of category terms ],
			// 					"content" : [ { moteName : moteValue }, ... ],
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

    	// Initialize settings in case not used
	$map_pointsMote = $cordMote = $filters = $audio = $transcript = $transcript2 = $timecode = null;

    	// Accumulate settings that are specified
	foreach( $projSettings['entry-points'] as $eps) {
		switch ($eps['type']) {
		case "map":
				// Which field used to encode Lat-Long on map?
			$map_pointsMote = $projObj->getMoteByName( $eps['settings']['marker-layer'] );
			if($map_pointsMote['type']=='Lat/Lon Coordinates'){
				if(!$map_pointsMote['delim']) { $map_pointsMote['delim']=','; }
				$coordMote = split($map_pointsMote['delim'],$map_pointsMote['custom-fields']);
				//array of custom fields
				//$coordMote = $map_pointsMote['custom-fields'];
			}
				// Find all possible legends/filters for this map -- each marker needs these fields
			$filters = $eps['settings']['filter-data'];
				// Collect all possible category values/tax names for each mote in all filters
			foreach( $filters as $legend ) {
				$parent = get_term_by('name', $legend, $rootTaxName);
				$parent_term_id = $parent->term_id;
				// $parent_terms = get_terms( $rootTaxName, array( 'parent' => $parent_term_id, 'orderby' => 'term_group', 'hide_empty' => false ) );
				array_push($json_Object, getIconsForTerms($parent, $rootTaxName));
			}
			break;
		}
	}

		// If a marker is selected and leads to a transcript in modal, need those values also
	if ($projObj->selectModalHas("transcript")) {
		$audio = $projSettings['views']['transcript']['audio'];
			// Translate from Mote Name to Custom Field name
		if (!is_null($audio) && ($audio !== '')) {
			$audio = $projObj->getCustomFieldForMote($audio);
			$transcript = $projObj->getCustomFieldForMote($projSettings['views']['transcript']['transcript']);
			$transcript2= $projObj->getCustomFieldForMote($projSettings['views']['transcript']['transcript2']);
			$timecode   = $projObj->getCustomFieldForMote($projSettings['views']['transcript']['timecode']);
		}
	}

	$feature_collection = array();
	$feature_collection['type'] = 'FeatureCollection';
	$feature_array = array();


		// Link parent enables linking to either the Post page for this Marker,
		//	or to the category/taxonomy which includes this Marker
	$link_parent = $projSettings['views']['select']['link'];
	if($link_parent) {
		if($link_parent=='marker') {
		//$parent_id = get_term_by('name', $link_parent, $rootTaxName);
			$child_terms = 'marker';
		}
		elseif($link_parent=='no-link') {
			$term_links = 'no-link';
			$child_terms = 'no-link';
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

	$link_parent2 = $projSettings['views']['select']['link2'];
	if($link_parent2) {
		if($link_parent2=='marker') {
		//$parent_id2 = get_term_by('name', $link_parent2, $rootTaxName);
			$child_terms2 = 'marker';
		}
		elseif($link_parent2=='no-link') {
			$term_links2 = 'no-link';
			$child_terms2 = 'no-link';
		}
			// Link to mote value
		elseif(strpos($link_parent2, '(Mote)') !== FALSE) {
			$link2MoteName = str_replace(' (Mote)', '', $link_parent2);
			$child_terms2 = $projObj->getMoteByName( $link2MoteName );
		}
		else {
			$parent_id2 = get_term_by('name', $link_parent2, $rootTaxName);
			$child_terms2 = get_term_children($parent_id2->term_id, $rootTaxName);
		}
	}

		// Determine whether title is default title of marker post or another (custom) field
	$title_mote = $projSettings['views']['select']['title'];
	if ($title_mote != 'the_title') {
		$temp_mote = $projObj->getMoteByName($title_mote);
		if (is_null($temp_mote)) {
			trigger_error("Modal view title assigned to unknown mote");
		}
		$title_mote = $temp_mote['custom-fields'];
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

			$transcript_val = get_post_meta($marker_id, $transcript, true);
			$thisFeaturesProperties["transcript"]  = $transcript_val;

			$transcript2_val = get_post_meta($marker_id, $transcript2, true);
			$thisFeaturesProperties["transcript2"] = $transcript2_val;

			$timecode_val = get_post_meta($marker_id, $timecode, true);
			$thisFeaturesProperties["timecode"]    = $timecode_val;
		}

			// Now begin saving data about this marker
		if($title_mote=='the_title') {
			$title = get_the_title();
		} else {
			$title = get_post_meta($marker_id,$title_mote,true);
		}
		$thisFeaturesProperties["title"] = $title;

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

			// For each of the legends/categories defined for the View, gather values for this Marker
		$viewsContent = $projSettings['views']['select']['content'];
		if($viewsContent) {
			foreach( $viewsContent as $contentMoteName ) {
				$content_mote = $projObj->getMoteByName( $contentMoteName );
				$content_type = $content_mote['type'];
				if($content_mote['custom-fields']=='the_content') {
					$content_val = apply_filters('the_content', get_post_field('post_content', $marker_id));
				} else {
					$content_val = get_post_meta($marker_id,$content_mote['custom-fields'],true);
				}
				if (!is_null($content_val) && ($content_val != '')) {
					if($content_type=='Image'){
						$content_val = '<img src="'.addslashes($content_val).'" />';
					}
					array_push($content_att, array($contentMoteName => $content_val));
				}
			}
			$thisFeaturesProperties["content"]     = $content_att;
		}

			// Does item link to its own Marker page, Taxonomy page, or Mote value?
		if ($link_parent && $child_terms && $child_terms != 'no-link') {
			if ($child_terms=='marker') {
				$term_links = get_permalink();
			}
			elseif(strpos($link_parent, '(Mote)') !== FALSE) {
				$term_links = get_post_meta($marker_id, $child_terms['custom-fields'], true);
			}
			else {
				$term_links = dhp_get_term_by_parent($child_terms, $post_terms, $rootTaxName);
			}			
			if ($term_links)
				$thisFeaturesProperties["link"] = addslashes($term_links);
		}

		if ($link_parent2 && $child_terms2 && $child_terms2 != 'no-link') {
			if ($child_terms2=='marker') {
				$term_links2 = get_permalink();
			}
			elseif(strpos($link_parent2, '(Mote)') !== FALSE) {
				$term_links2 = get_post_meta($marker_id, $child_terms2['custom-fields'], true);
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

	//$feature_collection .= ']';
	$feature_collection['features'] = $feature_array;
	array_push($json_Object, $feature_collection);
	 //$result = array_unique($array)
	return $json_Object;
} // createMarkerArray()


// PURPOSE:	Parse date range into from and to fields in format
//			DATE1-DATE2 = 
// INPUT:	Date as String in format 
// RETURNS: Array where [0] is From-Date and [1] is To-Date
// TO DO:	Not fully implemented

function dateFormatSplit($date_range)
{
		// Approximate date?
	$posA = strpos($date_range, "~");
		// Exact date?
	$posE = strpos($date_range, "-");

	if($posE > 0) {
    	$dateArray = explode('-', $date_range);	
    	if($dateArray[1]=='') {
    		$dateArray[1] = $dateArray[0];
    	}
	}
	if($posA > 0) {
    	$dateArray = explode('~', $date_range);	
    	if($dateArray[1]=='') {
    		$dateArray[1] = $dateArray[0];
   	 	}
	}
	return $dateArray;
} // dateFormatSplit()


// PURPOSE: Prepare for timeline view
// INPUT:	$project_id = ID of project
// TO DO:	Not currently used -- Incorporate logic into createMarkerArray

function createTimelineArray($project_id)
{
	// //loop through all markers in project -add to array
	// $timelineArray = array();
	// $project_object = get_post($project_id);
	// $project_tax = DHPressProject::ProjectIDToRootTaxName($project_object->ID);

	// //LOAD PROJECT SETTINGS
	// //-get primary category parent

	// $parent = get_term_by('name', "Primary Concept", $project_tax);
	// //$parent = get_terms($project_tax, array('parent=0&hierarchical=0&number=1'));
	// //print_r($parent);
	// $parent_term_id = $parent->term_id;
	// $parent_terms = get_terms( $project_tax, array( 'parent' => $parent_term_id, 'orderby' => 'term_group' ) );

	// $term_icons = getIconsForTerms($parent_terms, $project_tax);

	// $json_string = '{"timeline":{"headline":"Long Womens Movement","type":"default","text":"A journey","date":[';
	// $args = array( 'post_type' => 'dhp-markers', 'meta_key' => 'project_id','meta_value'=>$project_id, 'posts_per_page' => -1 );
	// $loop = new WP_Query( $args );
	// $i = 0;
	// while ( $loop->have_posts() ) : $loop->the_post();

	// 	$marker_id = get_the_ID();
	// 	$tempMarkerValue = get_post_meta($marker_id,$mote_name);
	// 	$tempMoteArray = split(';',$tempMoteValue[0]);
	// 	$latlon = get_post_meta($marker_id,'Location0');

	// 	$lonlat = invertLatLon($latlon[0]);
	// 	$title = get_the_title();
	// 	$categories = get_post_meta($marker_id,'Primary Concept');
	// 	$date = get_post_meta($marker_id,'date_range');
	// 	$dateA = dateFormatSplit($date[0]);

	// 	$startDate = $dateA[0];
	// 	$endDate = $dateA[1];
	// 	$args = array("fields" => "names");
	// 	$post_terms = wp_get_post_terms( $marker_id, $project_tax, $args );
	// 	$p_terms;
	// 	foreach ($post_terms as $term ) {
	// 		$p_terms .= $term.',';
	// 	}
	// 	if($i>0) {
	// 		$json_string .= ',';
	// 	}
	// 	else {$i++;}
			
	// 	$json_string .= '{"startDate":"'.$startDate.'","endDate":"'.$endDate.'","headline":"'.$title.'","text":"'.$categories[0].'","asset":{"media":"","credit":"","caption":""}}';

	// 	//array_push($markerArray,$json_string);
	// endwhile;

	// $json_string .= ']}}';	
	//  //$result = array_unique($array)
	// return $json_string;
} // createTimelineArray()


// PURPOSE:	Create HTML for option buttons for listing custom fields in print_new_bootstrap_html()
// INPUT:	$cf_array = list of custom fields
// RETURNS:	String containing HTML

function create_custom_field_option_list($cf_array)
{
	$optionHtml .='<option value="">--</option><option value="the_content">Post Content</option>';
	foreach ($cf_array as $key => $value) {
		$optionHtml .='<option value="'.$value.'">'.$value.'</option>';
	}
	return $optionHtml;
} // create_custom_field_option_list()


// PURPOSE:	Create the HTML for DHP admin panel for editing a Project

function print_new_bootstrap_html($project_id)
{
	// global $dhp_custom_fields, $post;
	global $dhp_custom_fields;

	$projObj = new DHPressProject($project_id);
	$dhp_custom_fields = $projObj->getAllCustomFieldNames();

	echo '<div class="new-bootstrap">
    <div class="row-fluid">
      <div class="span12">
        <div class="tabbable tabs-left">
          <ul class="nav nav-tabs">
           <li class="active"><a href="#info" data-toggle="tab">Settings</a></li>
           <li><a href="#motes" data-toggle="tab">Motes</a></li>
           <li><a href="#entry-point" data-toggle="tab">Entry Points</a></li>
           <li><a href="#views" data-toggle="tab">Views</a></li>
            <a id="save-btn" type="button" class="btn" data-loading-text="Saving...">Save</a>
          </ul>

          <div class="tab-content">

          	<div id="info" class="tab-pane fade in active">
              <h4>Project Info</h4>
              <p>Project ID: '.$project_id.'</p>
              <p><a href="'.get_bloginfo('wpurl').'/wp-admin/edit-tags.php?taxonomy='.$projObj->getRootTaxName().'" >Category Manager</a></p>
              <p>Label for Home Button: <input id="home-label" type="text" name="home-label" placeholder="Home" size="15"/></p>
              <p>Home URL: <input id="home-url" type="text" name="home-url" placeholder="http://www." size="20" /></p>
              <p>Return Home after minutes of inactivity: <input id="max-inactive" type="text" name="max-inactive" placeholder="5" size="2" /></p>
          	</div>

            <div id="motes" class="tab-pane fade in form-inline">
              <h4>Motes</h4>
              <p>Create relational containers for the data in the custom fields</p>
              <div id="create-mote">
                <p>
                  <input class="span4 mote-name" type="text" name="mote-name" placeholder="Mote Name" />
                </p>
                <div class="control-group">
	                Choose a custom field<br/>
	                <select name="custom-fields" class="custom-fields">'.create_custom_field_option_list($dhp_custom_fields).'</select> 
	                <label class="checkbox">
	                  	<input type="checkbox" id="pickMultiple" value="multiple"> Multiple
	                </label>
                </div>
                <div class="control-group">
	                <div class="btn-group">
	              		<a class="btn btn-info" id="search-replace-btn" data-toggle="modal" href="#projectModal"><i class="icon-edit"></i></a>
	              		<a class="btn btn-info" id="delete-cf-btn" data-toggle="modal" href="#projectModal"><i class="icon-trash"></i></a>
	              		<a class="btn btn-info" id="create-new-custom" data-toggle="modal" href="#projectModal"><i class="icon-plus"></i></a> 
	              	</div>
                </div>
                <div class="control-group">
                  <select name="cf-type" class="cf-type">
                    <option>Text</option>
                    <option>Lat/Lon Coordinates</option>
                    <option>File</option>
                    <option>Image</option>
                    <option>URL</option>
                  </select><span class="help-inline">Choose a data type</span>
                </div>
                <div class="control-group">
                	<input class="delim" type="text" name="delim" placeholder="Delimiter" /> If multiple text indicate the delimiter
                </div>
                <p><a class="btn btn-success" id="create-btn">Create mote</a></p>
              </div>           
              <div class="accordion" id="mote-list">                
              </div>              
            </div>

            <div id="entry-point" class="tab-pane fade in">
              <h4>Entry Points</h4>
              <ul id="entryTabs" class="nav nav-tabs">
                <li class="active"><a href="#home" data-toggle="tab">Home</a></li>           
                <li class="dropdown  pull-right">
                  <a href="#" class="dropdown-toggle" data-toggle="dropdown">Create Entry Point<b class="caret"></b></a>
                  <ul class="dropdown-menu">
                    <li><a id="add-map" >Map</a></li>
                    <li class="disabled"><a id="add-top-card">Topic Cards</a></li>
                    <li class="disabled"><a id="add-timeline">Timeline</a></li>
                  </ul>
                </li>
              </ul>
              <div id="entryTabContent" class="tab-content">
                <div class="tab-pane fade in active" id="home">
                  <p>Create entry points to the project using the right most tab above. </p>
                </div>               
              </div>
            </div>

            <div id="views" class="tab-pane fade in">
              <h4>Views</h4>
              
              <div class="accordion" id="viewList">

				  <div class="accordion-group">
				    <div class="accordion-heading">
				      <a class="accordion-toggle" data-toggle="collapse" data-parent="#viewList" href="#mapView">
				        Main View
				      </a>
				    </div>
				    <div id="mapView" class="accordion-body collapse in">
				      <div class="accordion-inner">
				       <p>
				       <label class="checkbox">
                    	<input class="save-view viz-fullscreen" type="checkbox" name="viz-fullscreen" value="fullscreen">Visualization takes full screen
                  		</label>
                  		</p>
                  		<p>
				       <input class="span3 save-view viz-width" name="viz-width" type="text" placeholder="Viz Width" />             
				       <input class="span3 save-view viz-height" name="viz-height" type="text" placeholder="Viz Height" />
				       </p>
				       <!--<p>
				       <select name="legend-pos" class="legend-pos save-view">                          
                	    <option>Left</option>
              		    <option>Right</option>
               		   </select><span class="help-inline">Legend Location</span>
               		   </p>-->
				      </div>
				    </div>
				  </div>

				  <div class="accordion-group">
				    <div class="accordion-heading">
				      <a class="accordion-toggle" data-toggle="collapse" data-parent="#viewList" href="#modalView">
				        Modal View (item selected from visualization)
				      </a>
				    </div>
				    <div id="modalView" class="accordion-body collapse">
				      <div class="accordion-inner">
				      	<a href="#projectModal" role="button" class="setup-modal-view btn" data-toggle="modal">
                        	<i class="icon-wrench"></i> Setup Modal
                        </a>
				      </div>
				    </div>
				  </div>

				  <div class="accordion-group">
				    <div class="accordion-heading">
				      <a class="accordion-toggle" data-toggle="collapse" data-parent="#viewList" href="#linkView">
				        Post View (marker pages)
				      </a>
				    </div>
				    <div id="linkView" class="accordion-body collapse">
				      <div class="accordion-inner marker-view">
				      </div>
				    </div>
				  </div>

				  <div class="accordion-group">
				    <div class="accordion-heading">
				      <a class="accordion-toggle" data-toggle="collapse" data-parent="#viewList" href="#transcView">
				        Taxonomy/Transcript View (modal and archive pages)
				      </a>
				    </div>
				    <div id="transcView" class="accordion-body collapse">
				      <div class="accordion-inner transc-view">
				      </div>
				    </div>
				  </div>

				</div> <!-- accordian -->
            </div> <!-- div views -->
          </div> <!-- tab content -->
        </div> <!-- tabbable tabs-left -->
      </div>  <!-- span12 -->
    </div> <!-- row-fluid -->
</div><!-- new-bootstrap -->
<select style="display:none;" id="hidden-layers" >'.dhp_build_HTML_maplayer_options(getLayerList()).'</select>'.'
<!-- This modal used for all pop-ups -->
<div id="projectModal" class="modal hide fade" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">
</div>';
} // print_new_bootstrap_html()


// categoryString($cats)
// PURPOSE:	Form list of category names
// INPUT:	$cats = array of category names
// RETURNS: Concatenated string of category names separated by comma
// TO DO:   Can't this be implemented with implode ??

// function categoryString($cats)
// {
// 	$catString;

// 	foreach ($catArray as $key => $cat) {
// 		if($key>0) {
// 			$catString .= ','.$cat;
// 		}
// 		else {
// 			$catString .= $cat;
// 		} 
// 	}
// 	return $catString;
// } // categoryString()


// PURPOSE:	Creates top-level term in WP database for a mote taxonomy (may insert or update)
// INPUT:	$term_name = name of mote (must be HTML-encoded)
//			$projRootTaxName = root taxonomy term for Project

function createParentTerm($term_name, $projRootTaxName)
{
	if(term_exists( $term_name, $projRootTaxName )) {
			$temp_term = get_term_by('name', $term_name, $projRootTaxName);
			$term_id = $temp_term->id;			
			wp_update_term( $term_id, $projRootTaxName );
	}
	else {
		wp_insert_term( $term_name, $projRootTaxName );
	}
} // createParentTerm()


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
//			$mote_name = name of mote itself (parent term)
//			$projRootTaxName = root taxonomy term for Project
// RETURNS:	array of taxonomic terms belonging to $mote_name

function dhpUpdateTaxonomy($mArray, $mote_name, $projRootTaxName)
{ 
	$term_counts = array_count_values($mArray);	

	$parent_term = get_term_by('name', $mote_name, $projRootTaxName);
	$parent_id = $parent_term->term_id;
	$args = array('parent' => $parent_id);

	// $updateTaxObject['debug']['tax'] = $projRootTaxName;
	// $updateTaxObject['debug']['parent'] = $args;
	// $updateTaxObject['debug']['mArrayLoop'] = array();

		// Loop through array and create terms with parent(mote_name) for non-empty values
	foreach ($mArray as $value) {
		if (!is_null($value) && $value != '') {
				// WP's term_exists() function doesn't escape slash characters!  Unlike wp_insert_term() and wp_update_term()!
	   		$termIs = term_exists( addslashes($value), $projRootTaxName, $parent_id );
	   		//debug
	   		// array_push($updateTaxObject['debug']['mArrayLoop'], addslashes($value));
	   		// array_push($updateTaxObject['debug']['mArrayLoop'], $termIs);
	   		if(!$termIs) {
	   			//if term doesn't exist, create
	   			wp_insert_term( $value, $projRootTaxName, $args );
	   		}
	   		else {
	   			//update term using id
	   			wp_update_term( $termIs->term_id, $projRootTaxName, $args );
	   		}
	   	}
	}
	// This is needed to create the terms which do not display until they are added to posts(markers in this case).
	// Code that was removed was not neccessary as it is run in the configure legend step with dhpGetMoteValues()
	return 'terms created';
} // dhpUpdateTaxonomy()


// creates terms in taxonomy when a legend is created
add_action( 'wp_ajax_dhpCreateLegendTax', 'dhpCreateLegendTax' );

// PURPOSE:	Handle Ajax call to create a taxonomy when a Legend is created
// INPUT:	Through $_POST['mote_name'] array: ['type', 'delim', 'custom-fields', 'name']
//			$_POST['project'] = ID of Project
// RETURN:	Array of unique values/tax-terms as JSON object

function dhpCreateLegendTax()
{ 
	$mote         = $_POST['mote_name'];
	$mote_type    = $mote['type'];
	$mote_delim   = $mote['delim'];
	$mote_name	  = $mote['name'];
	$custom_field = $mote['custom-fields'];

	$projectID    = $_POST['project'];
	$projObj      = new DHPressProject($projectID);
	$rootTaxName  = $projObj->getRootTaxName();

	createParentTerm($mote_name,$rootTaxName);
	//get fresh terms from meta feild 

	//returns unique array of values
	$mArray = $projObj->getCustomFieldUniqueDelimValues($custom_field, $mote_delim);

	//create terms with mArray
	$legendObject = dhpUpdateTaxonomy($mArray, $mote_name, $rootTaxName);

	//testing returns
	//die(json_encode($mArray));
	die(json_encode($legendObject));
} // dhpCreateLegendTax()


//Lists all the terms in taxonomies(already created)
add_action( 'wp_ajax_dhpGetMoteValues', 'dhpGetMoteValues' );

// PURPOSE:	Handle Ajax call to get the unique values for a mote and associate these as
//			taxonomy terms with each Marker post
// INPUT:	$_POST['project'] global is ID of Project
//			$_POST['mote_name'] global is Hash describing mote
// RETURNS:	JSON Object of all of the unique values of the Mote
// TO DO:	Isn't there a lot of duplicate code in here?

function dhpGetMoteValues()
{
	$mote        = $_POST['mote_name'];
	$projectID   = $_POST['project'];
	$projObj     = new DHPressProject($projectID);
	$rootTaxName = $projObj->getRootTaxName();

	// $debugArray = array();
	// $debugArray['name'] = $mote['name'];

		// Loop through markers for this Project, getting values for mote in each marker
		//	and associating the marker with the taxonomic term

		// Find all of the terms derived from $mote['name'] in the Project's taxonomy
	$parent_term = get_term_by('name', $mote['name'], $rootTaxName);
	$parent_id = $parent_term->term_id;
	$parent_terms_to_exclude = get_terms($rootTaxName, 'parent=0&orderby=term_group&hide_empty=0');

	$loop = $projObj->setAllMarkerLoop();
	while ( $loop->have_posts() ) : $loop->the_post();
		$marker_id = get_the_ID();
		$tempMoteValue = get_post_meta($marker_id, $mote['custom-fields'], true);

			// ignore empty or null values
		if (!is_null($tempMoteValue) && $tempMoteValue != '') {
			$tempMoteArray = array();
			if($mote['delim']) {
				$tempMoteArray = split( $mote['delim'], $tempMoteValue );
			}
			else {
				$tempMoteArray = array($tempMoteValue);
			}
			$theseTerms = array();
			// $debugArray['terms'] = array();
			foreach ($tempMoteArray as &$value) {
				// array_push($debugArray, $value);
				$term = term_exists( $value, $rootTaxName, $parent_id );
	   		 	if($term) {
	   		 		array_push($theseTerms, $term['term_id']);
	   		 		// array_push($debugArray['terms'], $term['term_id']);
	   		 	}
			}
			wp_set_post_terms( $marker_id, $theseTerms, &$rootTaxName, true );
		}
	endwhile;
	delete_option("{$rootTaxName}_children");
		// Create comma-separated string listing terms derived from other motes
	$exclude_string;
	$exclude_count = 0;
	foreach ( $parent_terms_to_exclude as $term ) {
		if($term->term_id != $parent_id) {
			if($exclude_count >0) {
				$exclude_string.=',';
			}
			$exclude_string.= $term->term_id;
			$exclude_count = 1;
		}
  	    //array_push($exclude_array, $term->term_id);
	}
	$terms_loaded = get_terms($rootTaxName, 'exclude_tree='.$exclude_string.'&orderby=term_group&hide_empty=0');
	//$terms = get_terms($rootTaxName, array( 'orderby' => 'term_id' ) );
 	$t_count = count($terms_loaded);

 	//return wp tax id,name,count,order
 	//$dhp_top_term = get_term_by('name', $term_name, $rootTaxName);
 	if ( $t_count > 0 ){
   		foreach ( $terms_loaded as $term ) {
			// if term doesn't have a length for description load from term_meta
   			if(strlen($term->description) > 0){
   				$desc_object = json_decode($term->description);
   				$term_url = $desc_object->icon_url;
   			}
   			else {
   				if(function_exists(get_term_meta)){
   					$term_url = get_term_meta($term->term_id, 'icon_url', true);
   				}
   				else {
   					$term_url = null;
   				}		
   			}
			$term ->icon_url = $term_url;
		}
	}

	die(json_encode($terms_loaded));
	// die(json_encode($debugArray));
	//die(json_encode($dhp_tax_name));
} // dhpGetMoteValues()


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

add_action( 'wp_ajax_dhpGetTimeline', 'dhpGetTimeline' );
add_action( 'wp_ajax_nopriv_dhpGetTimeline', 'dhpGetTimeline' );

// dhpGetTimeline()
// PURPOSE: Handle Ajax call to compute Timeline for Project
// INPUT:	$_POST['project'] is ID of Project
// RETURNS:	Array of timeline data
// TO DO:	Not fully implemented yet

function dhpGetTimeline()
{
	$dhp_project = $_POST['project'];
	$mArray = createTimelineArray($dhp_project);
	
	die(json_encode($mArray));
} // dhpGetTimeline()


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
// INPUT:	$tran = actual text
//			$clip = String containing from-end time of segment
// RETURNS:	Section of $tran within the time frame specified by $clip

function getTranscriptClip($transcript, $clip)
{
	$codedTransctript = utf8_encode($transcript);
	$clipArray        = split("-", $clip);
	$clipStart        = mb_strpos($codedTransctript, $clipArray[0]);
	$clipEnd          = mb_strpos($codedTransctript, $clipArray[1]);
		// timecode is always 13 characters
	$clipLength       = $clipEnd - $clipStart + 13;

	if( $clipStart && $clipEnd ) {
		$codedClip  = mb_substr($codedTransctript, $clipStart-1, $clipLength, 'UTF-8');
		$returnClip = utf8_decode($codedClip);
	}
	else {
		$returnClip = json_encode(array('clipStart'=> $clipStart,'clipEnd'=> $clipEnd, 'clipArrayend' => $clipArray[1]));
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
	} else {
		return $content;
	}
} // loadTranscriptFromFile()


// dhpGetTranscriptClip()
// PURPOSE: AJAX function to retrieve section of transcript when viewing a Marker
// INPUT:	$_POST['project'] = ID of Project post
//			$_POST['transcript'] = URL to file containing contents of transcript
//			$_POST['timecode'] = timestamp specifying part of transcript to return
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
	$dhp_audio_mote = $projObj->getMoteByName($proj_settings['views']['transcript']['audio']);
	$dhp_transcript_mote = $projObj->getMoteByName($proj_settings['views']['transcript']['transcript']);

	$dhp_transcript_cfield = $dhp_transcript_mote['custom-fields'];
	$dhp_transcript = $marker_meta[$dhp_transcript_cfield][0];
	if($dhp_transcript!='none') {
		$dhp_transcript = loadTranscriptFromFile($dhp_transcript);
	}

		//if project has two transcripts
	if($proj_settings['views']['transcript']['transcript2']) {
		$dhp_transcript2_mote = $projObj->getMoteByName($proj_settings['views']['transcript']['transcript2']);
		$dhp_transcript2_cfield = $dhp_transcript2_mote['custom-fields'];
		$dhp_transcript2 = $marker_meta[$dhp_transcript2_cfield][0];
		if ($dhp_transcript2 != 'none') {
			$dhp_object['transcript2'] = loadTranscriptFromFile($dhp_transcript2);
		}
	}

	// $dhp_object['feed'] = dhp_get_group_feed($rootTaxName, $dhp_tax_term);
	$dhp_object['settings'] = $dhp_transcript_ep;
	$dhp_object['audio'] = $marker_meta[$dhp_audio_mote['custom-fields']][0];
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
// TO DO:	Reduce redundant code with other nearby functions

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
// TO DO:	Reduce redundant code with other nearby functions

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
// TO DO:	Rename function

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
// TO DO:	Reduce redundant code!

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


add_action( 'wp_ajax_dhpCreateTaxTerms', 'dhpCreateTaxTerms' );

// PURPOSE:	Handle Ajax function to create all terms associated with all of the values defined
//			by a mote in a Project (Saving results of Configure Legend function)
// INPUT:	$_POST['project'] = ID of Project
//			$_POST['mote_name'] = name of mote
//			$_POST['terms'] = array of mote/legend values
// RETURNS:	JSON Object version of loopTermHierarchy() result

function dhpCreateTaxTerms()
{
	$mote_parent = $_POST['mote_name'];
	$dhp_projectID = $_POST['project'];
	$dhp_project_terms = stripslashes($_POST['terms']);

	$dhp_project_terms1 = json_decode($dhp_project_terms);
	// $termDetailsArray = array('parentTerm'=>$mote_parent, 'projectID' => $dhp_projectID, 'termsArray'=>$dhp_project_terms1);

	$newArgs = loopTermHierarchy($mote_parent, $dhp_projectID, $dhp_project_terms1);
	delete_option("{$projRootTaxName}_children");
	die(json_encode($newArgs));
} // dhpCreateTaxTerms()


// PURPOSE: Saving taxonomy hierarchy in WP and updating display of icon URL
// INPUT:	$mote_parent = name of parent mote
//			$projectID = ID of Project
//			$dhp_project_terms = array of taxonomy terms
// RETURNS:	Hash: ['parentTerm'] = $mote_parent, ['projectID'], ['termsArray'] = array of taxonomy terms, ['count'] = size of terms array

function loopTermHierarchy($mote_parent, $projectID, $dhp_project_terms)
{
	//convert mote_parent to id
	$projRootTaxName = DHPressProject::ProjectIDToRootTaxName($projectID);
	$mote_parentID = get_term_by('name', $mote_parent, $projRootTaxName);
	$meta_key = 'icon_url';
	$myCount = count($dhp_project_terms);

	foreach ($dhp_project_terms as $term) {
		$term_name      = $term->name;
		$parent_term_id = $term->parent;
		$term_id        = $term->term_id;
		$term_order     = $term->term_order;
		$meta_value     = $term->icon_url;

		if($meta_value=='undefined') { $meta_value = '';}

		if( ($parent_term_id==0||$parent_term_id==""||$parent_term_id==null) && ($term_id!=$mote_parent) ) {
			$parent_term_id = $mote_parent;
		}
		// add arg to update description field with icon_url
		$new_icon_url = json_encode(array($meta_key => $meta_value));
		$args = array( 'parent' => $parent_term_id, 'term_group' =>  $term_order, 'description' => $new_icon_url );
		//update term(insert takes place on legend setup)
		wp_update_term( $term_id, $projRootTaxName, $args );
		
		// NO LONGER NEEDED. SAVES IN DESCRIPTION ABOVE
		// delete_term_meta($term_id, $meta_key);
		// add_term_meta($term_id, $meta_key, $meta_value);
	}
	delete_option("{$projRootTaxName}_children");
	$oldArgs = array('parentTerm'=>$mote_parent, 'projectID' => $projectID, 'termsArray'=> $dhp_project_terms, 'count'=> $myCount);
	return $oldArgs;
} // loopTermHierarchy()


add_action( 'wp_ajax_dhpCreateTermInTax', 'dhpCreateTermInTax' );

// PURPOSE:	Handle adding new terms to taxonomy (that don't pre-exist in Marker data)
// INPUT:	$_POST['project'] = ID of Project
//			$_POST['term_name'] = name of taxonomy term to add
//			$_POST['parent_term_name'] = name of parent term under which it should be added
// RETURNS:	JSON Object describing new term

function dhpCreateTermInTax()
{
	$projectID 			= $_POST['project'];
	$dhp_term_name		= $_POST['term_name'];
	$parent_term_name	= $_POST['parent_term_name'];

	if (!is_null($dhp_term_name) && $dhp_term_name != '') {
		$projRootTaxName = DHPressProject::ProjectIDToRootTaxName($projectID);
		$parent_term = term_exists( $parent_term_name, $projRootTaxName );
			// TO DO: Check and handle non-existing term?

		$parent_term_id = $parent_term['term_id'];
		$args = array( 'parent' => $parent_term_id );
		// create new term
		$newTermId = wp_insert_term( $dhp_term_name, $projRootTaxName, $args );
		$newTerm = get_term_by('id', $newTermId['term_id'], $projRootTaxName);
			// Clear term taxonomy
		delete_option("{$projRootTaxName}_children");

		die(json_encode($newTerm));
	} else {
		die('');
	}
} // dhpCreateTermInTax()


add_action( 'wp_ajax_dhpDeleteTerms', 'dhpDeleteTerms' );

// PURPOSE:	Delete taxonomic terms in Project and all terms derived from it (as parent)
// INPUT:	$_POST['project'] = ID of Project
//			$_POST['term_name'] = name of taxonomy term to delete
// RETURNS:	Array of all children that were deleted

function dhpDeleteTerms()
{
	$projectID = $_POST['project'];
	$dhp_term_name = $_POST['term_name'];
	$dhp_project = get_post($projectID);
	$dhp_project_slug = $dhp_project->post_name;

	$projRootTaxName = DHPressProject::ProjectIDToRootTaxName($projectID);
	//get term id, get children term ids
	$dhp_delete_parent_term = get_term_by('name',$dhp_term_name,$projRootTaxName);
	$dhp_delete_parent_id = $dhp_delete_parent_term->term_id;
	$dhp_delete_children = get_term_children($dhp_delete_parent_id,$projRootTaxName);
	foreach ($dhp_delete_children as $delete_term) {
		wp_delete_term($delete_term, $projRootTaxName);
	}
	wp_delete_term($dhp_delete_parent_id, $projRootTaxName);

	die(json_encode($dhp_delete_children));
} // dhpDeleteTerms()


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
// ASSUMES:	$dhp_project_settings_fields global is set

function dhp_project_restore_revision($post_id, $revision_id)
{
	// global $dhp_project_settings_fields;
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
	$postID  = get_the_ID();

 		// Editing a specific project in admin panel
    if ( $hook == 'post-new.php' || $hook == 'post.php' ) {
        if ( $post->post_type == 'project' ) {    
			wp_enqueue_style('dhp-sortable-style', plugins_url('/css/sortable.css',  dirname(__FILE__) ));
			wp_enqueue_style('dhp-bootstrap-style', plugins_url('/lib/bootstrap/css/bootstrap.min.css',  dirname(__FILE__) ));
			// wp_enqueue_style('dhp-bootstrap-responsive-style', plugins_url('/lib/bootstrap/css/bootstrap-responsive.min.css',  dirname(__FILE__) ));
			wp_enqueue_style('dhp-jquery-ui-style', 'http://code.jquery.com/ui/1.10.2/themes/smoothness/jquery-ui.css');
			wp_enqueue_style('dhp-admin-style', plugins_url('/css/dhp-admin.css',  dirname(__FILE__) ));

			// wp_enqueue_script( 'jquery' );
			// wp_enqueue_script( 'jquery-ui' );

				// There is a conflict between default jQuery and nestedSortable, so we must replace it with a different
				//	version of jQuery
			wp_dequeue_script('jquery' ); 
			wp_dequeue_script('jquery-ui' );
			wp_enqueue_script('dhp-jquery', plugins_url('/lib/jquery-1.7.2.min.js', dirname(__FILE__) ));
			wp_enqueue_script('dhp-jquery-ui', plugins_url('/lib/jquery-ui-1.8.16.custom.min.js', dirname(__FILE__) ));

	 		wp_enqueue_script('jquery-ui-slider' );
			wp_enqueue_script('dhp-bootstrap', plugins_url('/lib/bootstrap/js/bootstrap.min.js', dirname(__FILE__) ),'jquery');

			wp_enqueue_script('dhp-touch-punch', plugins_url('/lib/jquery.ui.touch-punch.js', dirname(__FILE__) ));
            // wp_enqueue_script('open-layers', plugins_url('/js/OpenLayers/OpenLayers.js', dirname(__FILE__) ));

             //wp_enqueue_script(  'open-layers', plugins_url('/js/OpenLayers/OpenLayers.js', dirname(__FILE__) ));
			wp_enqueue_script('dhp-nested-sortable', plugins_url('/lib/jquery.mjs.nestedSortable.js', dirname(__FILE__) ));
			wp_enqueue_style('dhp-jPicker-style1', plugins_url('/js/jpicker/css/jPicker-1.1.6.min.css',  dirname(__FILE__) ));
			wp_enqueue_style('dhp-jPicker-style2', plugins_url('/js/jpicker/jPicker.css',  dirname(__FILE__) ));
			wp_enqueue_script('dhp-jPicker', plugins_url('/js/jpicker/jpicker-1.1.6.js', dirname(__FILE__) ));

			wp_enqueue_script('dhp-project-script', plugins_url('/js/dhp-project-admin.js', dirname(__FILE__) ));
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
			// wp_enqueue_style('ol-map', plugins_url('/css/ol-map.css',  dirname(__FILE__) ));
			wp_enqueue_script('jquery' );
        }
    }
} // add_dhp_project_admin_scripts()


// PURPOSE: Extract DHP custom map data from Map Library so they can be rendered
// INPUT:	$mapLayers = array of map layers (each containing Hash ['mapType'], ['id' = WP post ID])
// RETURNS: Array of data about map layers
// ASSUMES:	Custom Map data has been loaded into WP DB
// TO DO:	Error handling if map data doesn't exist?

function dhpGetMapLayerData($mapLayers)
{
	$mapMetaList = array(	"dhp_map_shortname"=> "dhp_map_shortname",
							"dhp_map_typeid"   => "dhp_map_typeid",  "dhp_map_category"  => "dhp_map_category" ,
							"dhp_map_type"     => "dhp_map_type",     "dhp_map_url"      => "dhp_map_url",
							"dhp_map_n_bounds" => "dhp_map_n_bounds", "dhp_map_s_bounds" => "dhp_map_s_bounds",
							"dhp_map_e_bounds" => "dhp_map_w_bounds", "dhp_map_w_bounds" => "dhp_map_w_bounds",
							"dhp_map_min_zoom" => "dhp_map_min_zoom", "dhp_map_max_zoom" => "dhp_map_max_zoom",
							"dhp_map_cent_lat" => "dhp_map_cent_lat", "dhp_map_cent_lon" => "dhp_map_cent_lon"
						);
	$mapArray = array();

		// Loop thru all map layers, collecting essential data to pass
	foreach($mapLayers as $layer) {
		// if($layer['mapType'] == 'type-DHP')
		// {
			$mapData = getMapMetaData($layer['id'], $mapMetaList);
			array_push($mapArray, $mapData);
		// }
	}
	return $mapArray;
} // dhpGetMapLayerData()


// PURPOSE: Called to retrieve Handlebar script to insert into HTML for a particular DH Press page
// INPUT:   $scriptname = base name of script file (not pathname)
// RETURNS: Contents of file as string
// NOTES:   First check for attachments to Project with appropriate names; by default, text files loaded from scripts directory
// TO DO:   Write code to check for attachment file in the Media Library

function dhp_get_script_text($scriptname)
{
		// First, look for attachment file for Project View
		// TO DO

		// Failing that, load the default text file
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
	    // if (!is_null($projObj->getEntryPointByName('transcript'))) {		// currently unneeded
	    // 	$projscript .= dhp_get_script_text(DHP_SCRIPT_TRANS_VIEW);
	    // }
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
// NOTES:   Use of Google maps dependent upon Open Layers code (so must be loaded regardless); DHP custom maps use both OL & Google
// TO DO:   Add visualization to Marker pages??

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

    		// Visualizations can send parameters via this array
    	$vizParams = array();

		//foundation styles
        wp_enqueue_style( 'dhp-foundation-style', plugins_url('/lib/foundation-5.0.3/css/foundation.min.css',  dirname(__FILE__)));
        wp_enqueue_style( 'dhp-foundation-icons', plugins_url('/lib/foundation-icons/foundation-icons.css',  dirname(__FILE__)));

		wp_enqueue_style('dhp-jquery-ui-style', 'http://code.jquery.com/ui/1.10.2/themes/smoothness/jquery-ui.css');
		wp_enqueue_style('joyride', plugins_url('/css/joyride-2.1.css',  dirname(__FILE__)));
		wp_enqueue_style('dhp-style', plugins_url('/css/dhp-style.css',  dirname(__FILE__)), '', DHP_PLUGIN_VERSION );

		wp_enqueue_script('underscore');
		wp_enqueue_script('jquery');
		wp_enqueue_script('jquery-ui' );
		wp_enqueue_script('dhp-jquery-ui', plugins_url('/lib/jquery-ui-1.10.3.custom.min.js', dirname(__FILE__)));
 		wp_enqueue_script('jquery-ui-slider' );
		// wp_enqueue_script('dhp-bootstrap', plugins_url('/lib/bootstrap/js/bootstrap.min.js', dirname(__FILE__)), 'jquery');
		wp_enqueue_script( 'dhp-foundation', plugins_url('/lib/foundation-5.0.3/js/foundation.min.js', dirname(__FILE__)), 'jquery');
		wp_enqueue_script( 'dhp-modernizr', plugins_url('/lib/foundation-5.0.3/js/modernizr.js', dirname(__FILE__)), 'jquery');
		wp_enqueue_script('joyride', plugins_url('/js/jquery.joyride-2.1.js', dirname(__FILE__)), 'jquery');
		wp_enqueue_script('handlebars', plugins_url('/lib/handlebars-v1.1.2.js', dirname(__FILE__)));

    		// Map visualization specific
    	$projectSettings_map = $projObj->getEntryPointByName('map');
    	if (!is_null($projectSettings_map)) {
			wp_enqueue_style('ol-map', plugins_url('/css/ol-map.css',  dirname(__FILE__)), '', DHP_PLUGIN_VERSION );
	    	wp_enqueue_script('dhp-google-map-script', 'http'. ( is_ssl() ? 's' : '' ) .'://maps.google.com/maps/api/js?v=3&amp;sensor=false');
			wp_enqueue_script('open-layers', plugins_url('/js/OpenLayers-2.13/OpenLayers.js', dirname(__FILE__)));
			wp_enqueue_script('dhp-maps-view', plugins_url('/js/dhp-maps-view.js', dirname(__FILE__)), 'open-layers', DHP_PLUGIN_VERSION);
			wp_enqueue_script('dhp-custom-maps', plugins_url('/js/dhp-custom-maps.js', dirname(__FILE__)), 'open-layers', DHP_PLUGIN_VERSION);

				// Get any DHP custom map parameters
			$layerData = dhpGetMapLayerData($projectSettings_map['settings']['layers']);
			$vizParams["layerData"] = $layerData;

	    	array_push($dependencies, 'open-layers', 'dhp-google-map-script', 'dhp-maps-view', 'dhp-custom-maps');
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
		wp_enqueue_style( 'dhp-foundation-style', plugins_url('/lib/foundation-5.0.3/css/foundation.min.css',  dirname(__FILE__)));
		wp_enqueue_style( 'dhp-foundation-icons', plugins_url('/lib/foundation-icons/foundation-icons.css',  dirname(__FILE__)));

		// wp_enqueue_style( 'joyride', plugins_url('/css/joyride-2.1.css',  dirname(__FILE__) ));	
		wp_enqueue_style('dhp-admin-style', plugins_url('/css/dhp-style.css',  dirname(__FILE__)), '', DHP_PLUGIN_VERSION );

		wp_enqueue_script('jquery');
		// wp_enqueue_script( 'dhp-bootstrap', plugins_url('/lib/bootstrap/js/bootstrap.min.js', dirname(__FILE__)), 'jquery');
		wp_enqueue_script( 'dhp-foundation', plugins_url('/lib/foundation-5.0.3/js/foundation.min.js', dirname(__FILE__)), 'jquery');
		wp_enqueue_script( 'dhp-modernizr', plugins_url('/lib/foundation-5.0.3/js/modernizr.js', dirname(__FILE__)), 'jquery');
		//wp_enqueue_script( 'mediaelement', plugins_url('/js/mediaelement/mediaelement-and-player.min.js', dirname(__FILE__),array('jquery') ));
		wp_enqueue_script('underscore');
		// wp_enqueue_script('handlebars', plugins_url('/lib/handlebars-v1.1.2.js', dirname(__FILE__)));

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
	    $isTranscript = ($project_settings['views']['transcript']['source'] == $term_parent->name);
	    	// If above doesn't work, try comparing $term->taxonomy

	    	// mediaelement for timelines -- not currently used
		// wp_enqueue_style('mediaelement', plugins_url('/js/mediaelement/mediaelementplayer.css',  dirname(__FILE__) ));

		//foundation styles
		wp_enqueue_style( 'dhp-foundation-style', plugins_url('/lib/foundation-5.0.3/css/foundation.min.css',  dirname(__FILE__)));
		wp_enqueue_style( 'dhp-foundation-icons', plugins_url('/lib/foundation-icons/foundation-icons.css',  dirname(__FILE__)));

	    // wp_enqueue_style( 'joyride', plugins_url('/css/joyride-2.1.css',  dirname(__FILE__) ));
		wp_enqueue_style('dhp-style', plugins_url('/css/dhp-style.css',  dirname(__FILE__)), '', DHP_PLUGIN_VERSION );

		wp_enqueue_script( 'jquery' );
		wp_enqueue_script( 'dhp-foundation', plugins_url('/lib/foundation-5.0.3/js/foundation.min.js', dirname(__FILE__)), 'jquery');
		wp_enqueue_script( 'dhp-modernizr', plugins_url('/lib/foundation-5.0.3/js/modernizr.js', dirname(__FILE__)), 'jquery');
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
