<?php 

/**
	 * Registers and handles DHPress Project functions
	 *
	 * @package DHPress Toolkit
	 * @author DHPress Team
	 * @link http://dhpress.org/download/
	 */


function dhp_project_init() {
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
    'hierarchical' => true,
    'menu_position' => null,
    'supports' => array( 'title', 'editor', 'author', 'thumbnail', 'excerpt', 'comments','revisions', 'custom-fields' )
  ); 
  register_post_type('project',$args);
  
}
add_action( 'init', 'dhp_project_init' );

add_action('admin_head', 'plugin_header');
function plugin_header() { ?>
		<style>
		    #icon-dhp-top-level-handle { background:transparent url('<?php echo DHP_PLUGIN_URL .'/images/dhpress-plugin-icon.png';?>') no-repeat; }     
		</style>
<?php }

function getLayerList(){
	$layers = array();
	$args = array( 'post_type' => 'dhp-maps', 'posts_per_page' => -1 );
	$loop = new WP_Query( $args );
	$layerCount=0;
	while ( $loop->have_posts() ) : $loop->the_post();
	//var $tempLayers = array();
		$layer_id = get_the_ID();
		$layer_name = get_the_title();
		$layer_use = get_post_meta($layer_id, 'dhp_map_category',true);
		$layer_type = get_post_meta($layer_id, 'dhp_map_type',true);
		$layer_typeid = get_post_meta($layer_id, 'dhp_map_typeid',true);
		$layerCount++;
		
		array_push($layers,array( 'layerID'=>$layer_id,
		 'layerName'=>$layer_name,
		 'layerCat'=>$layer_use,
		 'layerType'=>$layer_type,
		 'layerTypeId'=>$layer_typeid
		 ));
				
	endwhile;
	wp_reset_query();

	return $layers;
}
function dhp_create_option_list($layerArray){
	$optionHtml ='';
	foreach ($layerArray as $layer) {
		$tempCat = str_replace(' ','-',$layer['layerCat']);
		$tempType = 'type-'.$layer['layerType'];
		//$optionHtml .= '{ "id" : "'.$layer['layerID'].'", "name" : "'.$layer['layerName'].'", "usetype" : "'.$layer['layerCat'].'"},';
		$optionHtml .= '<option id="'.$layer['layerID'].
		'" class="'.$tempCat.'" data-mapType="'.$tempType.
		'" value="'.$layer['layerTypeId'].'" >'.$layer['layerName'].'</option>';
	}
	return $optionHtml;
}
function init_layer_list() {
	$layers_global = getLayerList();
}
add_action('admin_init', 'init_layer_list');  

//add filter to ensure the text Project, or project, is displayed when user updates a project 
function dhp_project_updated_messages( $messages ) {
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
}
add_filter( 'post_updated_messages', 'dhp_project_updated_messages' );


//add custom taxonomies for each project
add_action( 'init', 'create_tax_for_projects', 0 );
function create_tax_for_projects() {
	$args = array( 'post_type' => 'project', 'posts_per_page' => -1 );
	$projects = get_posts($args);
	if ($projects) {
		foreach ( $projects as $project ) {
			$projectTax = 'dhp_tax_'.$project->ID;
			$projectName = $project->post_title;
			$projectSlug = $project->post_name;
			$taxonomy_exist = taxonomy_exists($projectTax);
			//returns true
			if(!$taxonomy_exist) {
				dhp_create_tax($projectTax,$projectName,$projectSlug);
			}
		}
	}
}

function dhp_create_tax($taxID,$taxName,$taxSlug){

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
}

function show_tax_on_project_markers() {
	global $post;
	$projectID = get_post_meta($post->ID,'project_id');
	$project = get_post($projectID[0]);
	$projectTaxSlug = 'dhp_tax_'.$project->ID;
	$dhpTaxs = get_taxonomies();
		
	foreach ($dhpTaxs as $key => $value) {
		if($value!=$projectTaxSlug) {
			remove_meta_box( $value.'div', 'dhp-markers', 'side' );
		}
	}

}

add_action( 'admin_head' , 'show_tax_on_project_markers' );


if ( function_exists( 'add_theme_support' ) ) {
	add_theme_support( 'post-thumbnails' );
        set_post_thumbnail_size( 32, 37 ); // default Post Thumbnail dimensions
}
// Add the Meta Box
function add_dhp_project_settings_box() {
    add_meta_box(
		'dhp_settings_box', // $id
		'Project Details', // $title
		'show_dhp_project_settings_box', // $callback
		'project', // $page
		'normal', // $context
		'high'); // $priority
}
add_action('add_meta_boxes', 'add_dhp_project_settings_box');
// Add the Icon Box
function add_dhp_project_icons_box() {
    add_meta_box(
		'dhp_icons_box', // $id
		'Marker Icons', // $title
		'show_dhp_project_icons_box', // $callback
		'project', // $page
		'side', // $context 
		'default'); // $priority
}
add_action('add_meta_boxes', 'add_dhp_project_icons_box');
// Field Array
$prefix = 'project_';
$dhp_project_settings_fields = array(
	array(
		'label'=> 'Project Settings',
		'desc'	=> 'Stores the project setup as json.',
		'id'	=> $prefix.'settings',
		'type'	=> 'textarea'
	),array(
		'label'=> 'Icons',
		'desc'	=> 'Icons for categories.',
		'id'	=> $prefix.'icons',
		'type'	=> 'hidden'
	)
);
// The Callback 
function show_dhp_project_icons_box() {
	//dhp_deploy_icons();
	bdw_get_images();
}
// The Callback
function show_dhp_project_settings_box() {

global $dhp_project_settings_fields, $post;
define("_PROJECT_ID_", $post->ID);
// Load post id for project settings
echo '<input type="hidden" id="dhp-projectid" value="'.$post->ID.'"/>';
// Use nonce for verification
echo '<input type="hidden" name="dhp_project_settings_box_nonce" value="'.wp_create_nonce(basename(__FILE__)).'" />';
	//echo '<div id="map-divs"></div><button id="locate">Locate me!</button>';

	// Begin the field table and loop
	echo '<table class="project-form-table">';
	foreach ($dhp_project_settings_fields as $field) {
		// get value of this field if it exists for this post
		$meta = get_post_meta($post->ID, $field['id'], true);
		// begin a table row with
		
				switch($field['type']) {
					// case items will go here
					// text
					case 'text':
						echo '<tr>
							<th><label for="'.$field['id'].'">'.$field['label'].'</label></th>
							<td>';
						echo '<input type="text" name="'.$field['id'].'" id="'.$field['id'].'" value="'.$meta.'" size="30" />
							<br /><span class="description">'.$field['desc'].'</span>';
							echo '</td></tr>';
					break;
					// textarea
					case 'textarea':
						echo '<tr>
							<th><label for="'.$field['id'].'">'.$field['label'].'</label></th>
							<td>';
						echo '<textarea name="'.$field['id'].'" id="'.$field['id'].'" cols="60" rows="4">'.$meta.'</textarea>
							<br /><span class="description">'.$field['desc'].'</span>';
							echo '</td></tr>';
					break;
					// checkbox
					case 'checkbox':
						echo '<tr>
							<th><label for="'.$field['id'].'">'.$field['label'].'</label></th>
							<td>';
						echo '<input type="checkbox" name="'.$field['id'].'" id="'.$field['id'].'" ',$meta ? ' checked="checked"' : '','/>
							<label for="'.$field['id'].'">'.$field['desc'].'</label>';
							echo '</td></tr>';
					break;
					// select
					case 'select':
						echo '<tr>
							<th><label for="'.$field['id'].'">'.$field['label'].'</label></th>
							<td>';
						echo '<select name="'.$field['id'].'" id="'.$field['id'].'">';
						foreach ($field['options'] as $option) {
							echo '<option', $meta == $option['value'] ? ' selected="selected"' : '', ' value="'.$option['value'].'">'.$option['label'].'</option>';
						}
						echo '</select><br /><span class="description">'.$field['desc'].'</span>';
						echo '</td></tr>';
					break;
					// textarea
					case 'hidden':
					
						echo '<input type="hidden" name="'.$field['id'].'" id="'.$field['id'].'" value="'.$meta.'" />';
		
					break;
				} //end switch
		
	} // end foreach
	echo '</table>'; // end table
	
	print_new_bootstrap_html();

}

// Save the Data
function save_dhp_project_settings($post_id) {
    global $dhp_project_settings_fields;
	$parent_id = wp_is_post_revision( $post_id );
	
	// verify nonce
	if (!wp_verify_nonce($_POST['dhp_project_settings_box_nonce'], basename(__FILE__)))
		return $post_id;
	// check autosave
	if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE)
		return $post_id;
	// check permissions
	if ('page' == $_POST['post_type']) {
		if (!current_user_can('edit_page', $post_id))
			return $post_id;
		} elseif (!current_user_can('edit_post', $post_id)) {
			return $post_id;
	}
	if ( $parent_id ) {
		// loop through fields and save the data
		$parent  = get_post( $parent_id );
		
		foreach ($dhp_project_settings_fields as $field) {
			$old = get_post_meta( $parent->ID, $field['id'], true);
			$new = $_POST[$field['id']];
			if ($new && $new != $old) {
				update_metadata( 'post', $post_id, $field['id'], $new);
			} elseif ('' == $new && $old) {
				delete_metadata( 'post', $post_id, $field['id'], $old);
			}
		} // end foreach
	}
	else {
		// loop through fields and save the data
		foreach ($dhp_project_settings_fields as $field) {
			$old = get_post_meta($post_id, $field['id'], true);
			$new = $_POST[$field['id']];
			if ($new && $new != $old) {
				update_post_meta($post_id, $field['id'], $new);
			} elseif ('' == $new && $old) {
				delete_post_meta($post_id, $field['id'], $old);
			}
		} // end foreach
	}
}
add_action('save_post', 'save_dhp_project_settings');  


//create array of custom field values associated with a project
function createMetaValueArray($custom_name,$project_id){

	//loop through all markers in project -add to array
	$moteArray = array();
	$projectObj = get_post($project_id);
	$dhp_tax_name = 'dhp_tax_'.$projectObj->ID;


	$args = array( 'post_type' => 'dhp-markers', 'meta_key' => 'project_id','meta_value'=>$project_id, 'posts_per_page' => -1 );
	$tempMetaArray = array();
	$loop = new WP_Query( $args );
	while ( $loop->have_posts() ) : $loop->the_post();

		$marker_id = get_the_ID();
		//$temp_post = get_post($marker_id);
		$tempMetaValue = get_post_meta($marker_id, $custom_name, true);
		
		array_push($tempMetaArray, $tempMetaValue);
		
	endwhile;

	$result = array_unique($tempMetaArray);
	return $result;
}

//create unique array of custom fields from the project
function createUniqueProjectCustomFieldArray(){

	$project_id = _PROJECT_ID_;
	$project_custom_field_array = array();
	$temp_project_custom_field_keys = get_post_custom_keys($project_id);

	if($temp_project_custom_field_keys) {
		foreach($temp_project_custom_field_keys as $key => $value) {
			$valuet = trim($value);
     		if ( '_' == $valuet{0} || 'project_settings' == $valuet)
      		continue;
			array_push($project_custom_field_array, $value);
		}
	}
	$unique_custom_fields = array_unique($project_custom_field_array);

	return $unique_custom_fields;
}
//create unique array of custom fields of posts associated with the project
function createUniqueCustomFieldArray($the_id){

	$project_id =  $the_id;
	//loop through all markers in project -add to array
	$custom_field_array = array();

	$args = array( 'post_type' => 'dhp-markers', 'meta_key' => 'project_id','meta_value'=>$project_id, 'posts_per_page' => -1 );
	$loop = new WP_Query( $args );
	while ( $loop->have_posts() ) : $loop->the_post();

		$marker_id = get_the_ID();
		$temp_custom_field_keys = get_post_custom_keys($marker_id);

		foreach($temp_custom_field_keys as $key => $value) {
			$valuet = trim($value);
     		if ( '_' == $valuet{0} )
      		continue;
			array_push($custom_field_array, $value);
		}
				
	endwhile;
	$unique_custom_fields = array_unique($custom_field_array);

	return $unique_custom_fields;
}


function invertLatLon($latlon){
	if($lonlat==','){
		return '';
	}
	if($latlon&&$latlon!=',') {
		$tempLonLat = split(',',$latlon);	
		return array($tempLonLat[1],$tempLonLat[0]);
	}

}
function getIconsForTerms($parent_terms, $taxonomy){

	$filter_object['type'] = "filter";
	$filter_object['name'] = $parent_terms->name;
	$filter_object['terms'] = array();

	$myargs = array( 'orderby'       => 'term_group',
		 			 'hide_empty'    => false, 
					 'parent'        => $parent_terms->term_id );

	$children_terms = get_terms( $taxonomy, $myargs );
	$children_names = array();
	$filter_children = array();

	$icon_url = get_term_meta($parent_terms->term_id,'icon_url',true);
	$filter_parent['name'] = $parent_terms->name;
	$filter_parent['icon_url'] = $icon_url;
	array_push($filter_object['terms'], $filter_parent);

	foreach ($children_terms as $child) {
		array_push($children_names, $child->name);
		$childArgs = array( 'orderby' 		=> 'term_group',
		 					'hide_empty'    => false, 
							'parent'        => $child->term_id );
		$children_terms2 = get_terms( $taxonomy, $childArgs );
		$children_names2 = array();
		foreach ($children_terms2 as $child2) {
			array_push($children_names2, $child2->name);
		}
		$icon_url = get_term_meta($child->term_id,'icon_url',true);
		$temp_child_filter['name'] = $child->name;
		$temp_child_filter['icon_url'] = $icon_url;
		$temp_child_filter['children'] = $children_names2;
		array_push($filter_object['terms'], $temp_child_filter);
	}	
	$filter_parent['children'] = $children_names;

	return $filter_object;
}
function getMoteFromName($settings,$moteName){ 
	//$moteCount=0;
	foreach( $settings['motes'] as $mote) {

				
		if($mote['name']==$moteName){
			
			return $mote;
		}
		//$moteCount++;
	}

}
function dhp_get_term_by_parent($link_terms, $terms, $tax) {

	foreach( $terms as $term ) {
		$real_term = get_term_by('name', $term, $tax);
		$intersect = array_intersect(array($real_term->term_id), $link_terms);
		if ($intersect) {
			 $term_link = get_term_link($real_term);
			 return $term_link;
		}
	}
}
function dhp_get_group_feed($tax_name,$term_name){
//return feed for map, icon color, audio file
	$pieces = explode("dhp_tax_", $tax_name);
    $projectID = get_page($pieces[1],OBJECT,'project');
    $project_settings = json_decode(get_post_meta($projectID->ID,'project_settings',true),true);
    $the_term = get_term_by('name', $term_name, $tax_name);
    //$test_string =  $pieces;
	foreach( $project_settings['entry-points'] as $eps) {
		if($eps['type']=="map") {
			$filter_parentMote = getMoteFromName( $project_settings, $eps['settings']['filter-data'] );
			$filter = $eps['settings']['filter-data'];
			$map_pointsMote = getMoteFromName( $project_settings, $eps['settings']['marker-layer'] );
			if($map_pointsMote['type']=='Lat/Lon Coordinates'){
				if(!$map_pointsMote['delim']) {$map_pointsMote['delim']=',';}
				$cordMote = split($map_pointsMote['delim'],$map_pointsMote['custom-fields']);
				//array of custom fields
				//$cordMote = $map_pointsMote['custom-fields'];
			}
			
		}
		if($eps['type']=="transcript") {
			$audio = getMoteFromName( $project_settings, $eps['settings']['audio'] );
			$transcript = getMoteFromName( $project_settings, $eps['settings']['transcript'] );
			$timecode = getMoteFromName( $project_settings, $eps['settings']['timecode'] );

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

	while ( $loop->have_posts() ) : $loop->the_post();
	
		$marker_id = get_the_ID();
		$args1 = array("fields" => "names");
		$post_terms = wp_get_post_terms( $marker_id, $tax_name, $args1 );
		$title = get_the_title();
		$audio_val = get_post_meta($marker_id,$audio['custom-fields']);
		$timecode_val = get_post_meta($marker_id,$timecode['custom-fields'],true);
		if(count($cordMote)==2) {
			$temp_lat = get_post_meta($marker_id,$cordMote[0]);
			$temp_lon = get_post_meta($marker_id,$cordMote[1]);

			$temp_latlon = $temp_lat[0].','.$temp_lon[0];

			$lonlat = invertLatLon($temp_latlon);
		}
		if(count($cordMote)==1) {
			$temp_latlon = get_post_meta($marker_id,$cordMote[0]);
			$lonlat = invertLatLon($temp_latlon[0]);
		}

		if($lonlat) {
			$this_feature = array();
			$this_feature['type'] = 'Feature';
			$this_feature['geometry'] = array();
			$this_feature['properties']= array();

			$this_feature['geometry']['type'] = 'Point';
			$this_feature['geometry']['coordinates'] = $lonlat;
			
			//properties
			$this_feature['properties']['title'] = $title;
			$this_feature['properties']['categories'] = json_encode($post_terms);
			$this_feature['properties']['audio'] = $audio_val[0];
			$this_feature['properties']['timecode'] = $timecode_val;
			
		//array_push($markerArray,$json_string); 
		array_push($feature_collection['features'],$this_feature);
		}

	endwhile;
	
	return $feature_collection;

}
add_action( 'wp_ajax_dhp_get_group_feed', 'dhp_get_group_feed' );
add_action( 'wp_ajax_nopriv_dhp_get_group_feed', 'dhp_get_group_feed' );
function createMarkerArray($project_id) {
	//loop through all markers in project -add to array
	$markerArray = array();
	$json_Object = array();
	$project_object = get_post($project_id);
	$project_tax = 'dhp_tax_'.$project_object->ID;

	//LOAD PROJECT SETTINGS
	//-get primary category parent
	$project_settingsA = get_post_meta($project_id,'project_settings');
	$project_settings = json_decode(str_replace('\\','',$project_settingsA[0]),true);

	foreach( $project_settings['entry-points'] as $eps) {
		if($eps['type']=="map") {
			$filter_parentMote = getMoteFromName( $project_settings, $eps['settings']['filter-data'] );
			$filter = $eps['settings']['filter-data'];
			$map_pointsMote = getMoteFromName( $project_settings, $eps['settings']['marker-layer'] );
			if($map_pointsMote['type']=='Lat/Lon Coordinates'){
				if(!$map_pointsMote['delim']) {$map_pointsMote['delim']=',';}
				$cordMote = split($map_pointsMote['delim'],$map_pointsMote['custom-fields']);
				//array of custom fields
				//$cordMote = $map_pointsMote['custom-fields'];
			}
			
		}
		if($eps['type']=="transcript") {
			$audio = getMoteFromName( $project_settings, $eps['settings']['audio'] );
			$transcript = getMoteFromName( $project_settings, $eps['settings']['transcript'] );
			$timecode = getMoteFromName( $project_settings, $eps['settings']['timecode'] );

		}
	}
	//CREATE loop to generate tabs for filters
	foreach( $filter as $legend ) {
		
		$parent = get_term_by('name', $legend, $project_tax);
		$parent_term_id = $parent->term_id;
		$parent_terms = get_terms( $project_tax, array( 'parent' => $parent_term_id, 'orderby' => 'term_group', 'hide_empty'    => false ) );

		array_push($json_Object, getIconsForTerms($parent, $project_tax));
	}
	
	
	//$json_string = '{"type": "FeatureCollection","features": [';
	$json_string['type'] = 'FeatureCollection';
	$feature_array = array();
	//$feature_collection['type'] = "FeatureCollection";
	//$feature_collection['features'] = array();
	$args = array( 'post_type' => 'dhp-markers', 'meta_key' => 'project_id','meta_value'=>$project_id, 'posts_per_page' => -1 );
	$loop = new WP_Query( $args );
	$i = 0;
	$audio_val;
	$transcript_val;
	$timecode_val;
	$link_parent = $project_settings['views']['link'];
	$link_parent2 = $project_settings['views']['link2'];
	


	if($link_parent) {
		if($link_parent=='marker') {
		//$parent_id = get_term_by('name', $link_parent, $project_tax);
			$child_terms = 'marker';
		}
		elseif($link_parent=='no-link') {
			$term_links = 'no-link';
			$child_terms = 'no-link';
		}
		else {
			$parent_id = get_term_by('name', $link_parent, $project_tax);
			$child_terms = get_term_children($parent_id->term_id, $project_tax);
		}
	}
	if($link_parent2) {
		if($link_parent2=='marker') {
		//$parent_id = get_term_by('name', $link_parent, $project_tax);
			$child_terms2 = 'marker';
		}
		elseif($link_parent2=='no-link') {
			$term_links2 = 'no-link';
			$child_terms2 = 'no-link';
		}
		else {
			$parent_id2 = get_term_by('name', $link_parent2, $project_tax);
			$child_terms2 = get_term_children($parent_id2->term_id, $project_tax);
		}
	}
	
	while ( $loop->have_posts() ) : $loop->the_post();

		$marker_id = get_the_ID();
		$tempMarkerValue = get_post_meta($marker_id,$mote_name);
		$tempMoteArray = split(';',$tempMoteValue[0]);
		//map points. if cordMote.length is 2 create latlon
		if(count($cordMote)==2) {
			$temp_lat = get_post_meta($marker_id,$cordMote[0]);
			$temp_lon = get_post_meta($marker_id,$cordMote[1]);

			$temp_latlon = $temp_lat[0].','.$temp_lon[0];

			$lonlat = invertLatLon($temp_latlon);
		}
		if(count($cordMote)==1) {
			$temp_latlon = get_post_meta($marker_id,$cordMote[0]);
			$lonlat = invertLatLon($temp_latlon[0]);
		}
		//$json_string .= $cordMote;
		//$lonlat = invertLatLon($latlon[0]);
		if($project_settings['views']['title']=='the_title') {
			$title = get_the_title();
		}
		else {
			$title_mote = getMoteFromName( $project_settings, $project_settings['views']['title'] );
			$title = get_post_meta($marker_id,$title_mote['custom-fields'],true);
		}
		$audio_val = get_post_meta($marker_id,$audio['custom-fields'],true);
		
			$transcript_val1 = get_post_meta($marker_id, $transcript['custom-fields']);
			$transcript_val = $transcript['delim'].$transcript_val1[0];
		
		$timecode_val = get_post_meta($marker_id,$timecode['custom-fields'],true);
		//$categories = get_post_meta($marker_id,'Concepts');
		$args = array("fields" => "names");
		$post_terms = wp_get_post_terms( $marker_id, $project_tax, $args );
		$p_terms;
		$viewsContent = $project_settings['views']['content'];
		$json_string['debug'] = $viewsContent;
		$content_att = array();
		if($viewsContent) {
			foreach( $viewsContent as $contentMote ) {
				$content_mote = getMoteFromName( $project_settings, $contentMote );
				$content_type = $content_mote['type'];
				if($content_mote['custom-fields']=='the_content') {
					$content_val = apply_filters('the_content', get_post_field('post_content', $marker_id));
					$content_val = $content_val;
				}
				else {
					$content_val = get_post_meta($marker_id,$content_mote['custom-fields'],true);
				}
				if($content_type=='Image'){
					$content_val = '<img src="'.$content_val.'" />';
				}
				array_push($content_att, array($contentMote => $content_val));
			}
		}
		

		if($child_terms=='marker') {
			$term_links = get_permalink();
		}
		elseif ($child_terms=='no-link') {
			
		}
		else {
			if($child_terms) {
				$term_links = dhp_get_term_by_parent($child_terms, $post_terms, $project_tax);
			}
			
		}
		
		if($child_terms2=='marker') {
			$term_links2 = get_permalink();
		}
		elseif ($child_terms2=='no-link') {
			
		}
		else {
			if($child_terms2) {
				$term_links2 = dhp_get_term_by_parent($child_terms2, $post_terms, $project_tax);
			}
			
		}
		
		
		if($lonlat) {
			if($i>0) {
				//$json_string .= ',';
			}
			else {$i++;}
		$temp_feature['type'] = 'Feature';
		$temp_feature['geometry'] = array("type"=>"Point","coordinates"=> $lonlat);
		$temp_feature['properties'] = array("title"=>$title,
			"categories"=> $post_terms,
			"audio"=>$audio_val,
			"content"=>$content_att,
			"transcript"=>$transcript_val,
			"timecode"=>$timecode_val,
			"link"=>$term_links,
			"link2"=>$term_links2);


		//array_push($markerArray,$json_string); 
		array_push($feature_array,$temp_feature);
		}
	
		
	endwhile;
	//$json_string .= ']';
	$json_string['features'] = $feature_array;
	array_push($json_Object, $json_string);	
	 //$result = array_unique($array)
	return $json_Object;
	//return $term_icons;
}
function dateFormatSplit($date_range){
	$posA = strpos($date_range, "~");
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
}
function createTimelineArray($project_id) {
	//loop through all markers in project -add to array
	$timelineArray = array();
	$project_object = get_post($project_id);
	$project_tax = 'dhp_tax_'.$project_object->ID;

	//LOAD PROJECT SETTINGS
	//-get primary category parent

	$parent = get_term_by('name', "Primary Concept", $project_tax);
	//$parent = get_terms($project_tax, array('parent=0&hierarchical=0&number=1'));
	//print_r($parent);
	$parent_term_id = $parent->term_id;
	$parent_terms = get_terms( $project_tax, array( 'parent' => $parent_term_id, 'orderby' => 'term_group' ) );

	$term_icons = getIconsForTerms($parent_terms, $project_tax);

	$json_string = '{"timeline":{"headline":"Long Womens Movement","type":"default","text":"A journey","date":[';
	$args = array( 'post_type' => 'dhp-markers', 'meta_key' => 'project_id','meta_value'=>$project_id, 'posts_per_page' => -1 );
	$loop = new WP_Query( $args );
	$i = 0;
	while ( $loop->have_posts() ) : $loop->the_post();

		$marker_id = get_the_ID();
		$tempMarkerValue = get_post_meta($marker_id,$mote_name);
		$tempMoteArray = split(';',$tempMoteValue[0]);
		$latlon = get_post_meta($marker_id,'Location0');

		$lonlat = invertLatLon($latlon[0]);
		$title = get_the_title();
		$categories = get_post_meta($marker_id,'Primary Concept');
		$date = get_post_meta($marker_id,'date_range');
		$dateA = dateFormatSplit($date[0]);

		$startDate = $dateA[0];
		$endDate = $dateA[1];
		$args = array("fields" => "names");
		$post_terms = wp_get_post_terms( $marker_id, $project_tax, $args );
		$p_terms;
		foreach ($post_terms as $term ) {
			$p_terms .= $term.',';
		}
		if($i>0) {
			$json_string .= ',';
		}
		else {$i++;}
			
		$json_string .= '{"startDate":"'.$startDate.'","endDate":"'.$endDate.'","headline":"'.$title.'","text":"'.$categories[0].'","asset":{"media":"","credit":"","caption":""}}';

		//array_push($markerArray,$json_string); 
		
		
	endwhile;
$json_string .= ']}}';	
	 //$result = array_unique($array)
	return $json_string;
}
//used in print_new_bootstrap_html()
function create_custom_field_option_list($cf_array){
	$optionHtml .='<option value="">--</option><option value="the_content">Post Content</option>';
	foreach ($cf_array as $key => $value) {
		$optionHtml .='<option value="'.$value.'">'.$value.'</option>';
	}
	return $optionHtml;
}

function print_new_bootstrap_html(){
	$projectPage = get_page(_PROJECT_ID_);
	$projectTax_slug = $projectPage->post_name;
	global $dhp_custom_fields;
	$dhp_custom_fields = createUniqueCustomFieldArray(_PROJECT_ID_);
	echo '<div class="new-bootstrap">
    <div class="row-fluid"> 	
    	<div class="span12">
        <div class="tabbable tabs-left">
          <ul class="nav nav-tabs">
           <li class="active"><a href="#entry-point" data-toggle="tab">Entry Points</a></li>
           <li><a href="#motes" data-toggle="tab">Motes</a></li>
           <li><a href="#views" data-toggle="tab">Views</a></li>
            <a id="save-btn" type="button" class="btn" data-loading-text="Saving...">Save</a>
          </ul>
          <div class="tab-content">
            <div id="entry-point" class="tab-pane fade in active">
              <h4>Entry Points</h4>
              <ul id="entryTabs" class="nav nav-tabs">
                <li class="active"><a href="#home" data-toggle="tab">Home</a></li>           
                <li class="dropdown  pull-right">
                  <a href="#" class="dropdown-toggle" data-toggle="dropdown">Create Entry Point<b class="caret"></b></a>
                  <ul class="dropdown-menu">
                    <li><a id="add-map" >Map</a></li>
                    <li><a id="add-timeline" >Timeline</a></li>
                    <li class="disabled"><a >Topic Cards</a></li>
                    <li><a id="add-transcript" >A/V Transcript</a></li>
                  </ul>
                </li>
              </ul>
              <div id="entryTabContent" class="tab-content">
                <div class="tab-pane fade in active" id="home">
                	<p>Project ID: '._PROJECT_ID_.'</p>
                	<p><a href="'.get_bloginfo('wpurl').'/wp-admin/edit-tags.php?taxonomy=dhp_tax_'._PROJECT_ID_.'" >Catagory Manager</a></p>
                  <p>Create entry points to the project using the right most tab above. </p>
                </div>               
              </div>
            </div>
            <div id="motes" class="tab-pane fade in">
              <h4>Motes</h4>
              <p>Create relational containers for the data in the custom fields</p>
              <div id="create-mote">
                <p>
                  <input class="span4 mote-name" type="text" name="mote-name" placeholder="Mote Name" />
                </p>
                <p>
                  <select name="custom-fields" class="custom-fields">'.create_custom_field_option_list($dhp_custom_fields).'
                  </select><span class="help-inline">Choose a custom field</span>
                  <label class="checkbox inline">
                    <input type="checkbox" id="pickMultiple" value="multiple"> Multiple
                  </label><div class="btn-group drag-right">
              	<a class="btn btn-info" id="search-replace-btn" data-toggle="modal" href="#projectModal"><i class="icon-edit"></i></a>
              	<a class="btn btn-info" id="delete-cf-btn" data-toggle="modal" href="#projectModal"><i class="icon-trash"></i></a>
              	<a class="btn btn-info" id="create-new-custom" data-toggle="modal" href="#projectModal"><i class="icon-plus"></i></a> 
              </div>                
                </p>
                <p>
                  <select name="cf-type" class="cf-type">                          
                    <option>Text</option>
                    <option>Exact Date</option>
                    <option>Date Range</option>
                    <option>Lat/Lon Coordinates</option>
                    <option>File</option>
                    <option>Image</option>
                  </select><span class="help-inline">Choose a data type</span>
                </p>
                <p><input class="delim" type="text" name="delim" placeholder="Delimiter" /> If multiple text indicate the delimiter</p>
                <p><a class="btn btn-success" id="create-btn">Create mote</a></p>
              </div>           
              <div class="accordion" id="mote-list">                
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
                    	<input class="save-view map-fullscreen" type="checkbox" name="map-fullscreen" value="fullscreen"> Map Fullscreen
                  		</label>
                  		</p>
                  		<p>
				       <input class="span3 save-view map-width" name="map-width" type="text" placeholder="Width" />             
				       <input class="span3 save-view map-height" name="map-height" type="text" placeholder="Height" />
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
				        Modal View
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
				        Post View
				      </a>
				    </div>
				    <div id="linkView" class="accordion-body collapse">
				      <div class="accordion-inner marker-view">
				      	
				      </div>
				    </div>
				  </div>
				</div>
            </div>
          </div>
        </div>
      </div>  
    </div>
</div>'.
'<select style="display:none;"id="hidden-layers" >'.dhp_create_option_list(getLayerList()).'</select>'.'
<!--New Custom Field Modal -->
<div id="projectModal" class="modal hide fade" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">
</div>';
}

function categoryString($cats){
	$catString;

	foreach ($catArray as $key => $cat) {
		if($key>0) {
			$catString .= ','.$cat;
		}
		else {
			$catString .= $cat;
		} 
	}
	return $catString;
}
function createParentTerm($term_name,$dhp_tax_name){

	if(term_exists( $term_name, $dhp_tax_name )) {
			$temp_term = get_term_by('name', $term_name, $dhp_tax_name);
			$term_id = $temp_term->id;			
			wp_update_term( $term_id, $dhp_tax_name );
	}
	else {
		wp_insert_term( $term_name, $dhp_tax_name );
	}

}
//ajax functions
function dhpSaveProjectSettings(){
	$settings =  $_POST['settings'];
	$dhp_projectID = $_POST['project'];

	update_post_meta($dhp_projectID, 'project_settings', $settings);

	die('working... '. $settings);
}
add_action( 'wp_ajax_dhpSaveProjectSettings', 'dhpSaveProjectSettings' );


function dhpUpdateTaxonomy($mArray, $mote_name, $dhp_tax_name){ 
	$term_counts = array_count_values($mArray);	

	$parent_term = get_term_by('name', $mote_name, $dhp_tax_name);
	$parent_id = $parent_term->term_id;
	$args = array('parent' => $parent_id);


	//loop through array and create terms with parent(mote_name)

	foreach ($mArray as &$value) {
   		$termIs = term_exists( $value, $dhp_tax_name ); 	
   		
   		if(!$termIs) {
   			wp_insert_term( $value, $dhp_tax_name, $args );
   		}
   		else {
   			$termName = get_term($termIs->term_id, $dhp_tax_name);
   			$args = array('parent' => $parent_id, 'alias_of'=>$termName->slug);
   			wp_update_term( $value, $dhp_tax_name, $args );
   		}
	}

	$parent_terms_to_exclude = get_terms($dhp_tax_name, 'parent=0&orderby=term_group&hide_empty=0');
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
	}

	$terms_loaded = get_terms($dhp_tax_name, 'exclude_tree='.$exclude_string.'&orderby=term_group&hide_empty=0');
 	$t_count = count($terms_loaded);

 	//return wp tax id,name,count,order
 	$dhp_top_term = get_term_by('name', $term_name, $dhp_tax_name);

 	if ( $t_count > 0 ){
   		foreach ( $terms_loaded as $term ) {
  	    	$term_url = get_term_meta($term->term_id, 'icon_url', true);
			$term ->icon_url = $term_url;
		}
	}

	return $terms_loaded;
}

//create arrays of custom field values associated with a project
function createMoteValueArrays($custom_name, $delim, $project_id){

	//loop through all markers in project -add to moteArray
	$moteArray = array();

	$args = array( 'post_type' => 'dhp-markers', 'meta_key' => 'project_id','meta_value'=>$project_id, 'posts_per_page' => -1 );
	
	$loop = new WP_Query( $args );
	while ( $loop->have_posts() ) : $loop->the_post();

		$marker_id = get_the_ID();
		//$temp_post = get_post($marker_id);
		$tempMoteValue = get_post_meta($marker_id, $custom_name, true);
		$tempMoteArray = array();
		if($delim) {
			$tempMoteArray = split($delim,$tempMoteValue);
		}
		else {
			$tempMoteArray = array($tempMoteValue);
		}

		foreach ($tempMoteArray as &$value) {
   		 	array_push($moteArray,$value);
		}
		
		
	endwhile;

	$result = array_unique($moteArray);

	return $result;
}
//find if a term exists under a specific parent. Create it if it doesn't
function addOrUpdateTermInTax($term_name, $tax_name, $term_parent) {
	if(term_exists( $term_name, $tax_name, $term_parent )) {

	}
	else {
		//create term
		wp_insert_term( $term, $taxonomy, $args = array() );
	}

}

function dhpCreateLegendTax(){ 

	$mote_values = array();
	$mote = $_POST['mote_name'];
	$mote_type = $mote['type'];
	$mote_delim = $mote['delim'];
	
	$custom_field = $mote['custom-fields'];
	$dhp_projectID = $_POST['project'];

	$dhp_project = get_post($dhp_projectID);
	$dhp_project_slug = $dhp_project->post_name;
	$dhp_tax_name = 'dhp_tax_'.$dhp_project->ID;

	createParentTerm($mote['name'],$dhp_tax_name);
	//get fresh terms from meta feild 

	//returns unique array of values
	$mArray = createMoteValueArrays($custom_field,$mote_delim,$dhp_projectID);

	//create/update terms with mArray
	$terms_loaded = dhpUpdateTaxonomy($mArray, $mote['name'], $dhp_tax_name);

	
	//die(json_encode($mArray));
	die(json_encode($terms_loaded));
	//die(json_encode($exclude_string));
}
//creates terms in taxonomy when a legend is created
add_action( 'wp_ajax_dhpCreateLegendTax', 'dhpCreateLegendTax' );


function dhpGetMoteValues(){
	$dhp_projectID = $_POST['project'];
	$mote = $_POST['mote_name'];
	$dhp_tax_name = 'dhp_tax_'.$dhp_projectID;
	$debugArray = array();
	//run a loop to populate terms in posts
	$args = array( 'post_type' => 'dhp-markers', 'meta_key' => 'project_id','meta_value'=>$dhp_projectID, 'posts_per_page' => -1 );
	
	$loop = new WP_Query( $args );
	while ( $loop->have_posts() ) : $loop->the_post();
		$marker_id = get_the_ID();
		$tempMoteValue = get_post_meta($marker_id, $mote['custom-fields'], true);
		$tempMoteArray = array();
		if($mote['delim']) {
			$tempMoteArray = split($mote['delim'],$tempMoteValue);
		}
		else {
			$tempMoteArray = array($tempMoteValue);
		}
		$theseTerms = array();
		foreach ($tempMoteArray as &$value) {
			$term = term_exists( $value, $dhp_tax_name ); 	
   		 	array_push($theseTerms, $term['term_id']);
   		 	// array_push($debugArray, $term->term_id);
		}
		wp_set_post_terms( $marker_id, $theseTerms, &$dhp_tax_name, true );
	endwhile;

	$parent_term = get_term_by('name', $mote['name'], $dhp_tax_name);
	$parent_id = $parent_term->term_id;
	$args = array('parent' => $parent_id);

	$parent_terms_to_exclude = get_terms($dhp_tax_name, 'parent=0&orderby=term_group&hide_empty=0');
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
	$terms_loaded = get_terms($dhp_tax_name, 'exclude_tree='.$exclude_string.'&orderby=term_group&hide_empty=0');
	//$terms = get_terms($dhp_tax_name, array( 'orderby' => 'term_id' ) );
 	$t_count = count($terms_loaded);

 	//return wp tax id,name,count,order
 	//$dhp_top_term = get_term_by('name', $term_name, $dhp_tax_name);
 	if ( $t_count > 0 ){
   		foreach ( $terms_loaded as $term ) {
  	    	

  	    	$term_url = get_term_meta($term->term_id, 'icon_url', true);
			//$term .= '"icon_url" : "'.$term_url.'"';

			$term ->icon_url = $term_url;
  	    	//array_push($term, array('icon_url' => $term_url ));
		}
	}

	die(json_encode($terms_loaded));
	//die(json_encode($dhp_tax_name));
	
}
//Lists all the terms in taxonomies(already created)
add_action( 'wp_ajax_dhpGetMoteValues', 'dhpGetMoteValues' );

function dhpGetMarkers(){

	$dhp_project = $_POST['project'];
	$mArray = createMarkerArray($dhp_project);
	
	die(json_encode($mArray));
}
//show on both front and backend
add_action( 'wp_ajax_dhpGetMarkers', 'dhpGetMarkers' );
add_action('wp_ajax_nopriv_dhpGetMarkers', 'dhpGetMarkers');

function dhpGetTimeline(){

	$dhp_project = $_POST['project'];
	$mArray = createTimelineArray($dhp_project);
	
	die(json_encode($mArray));
}
//show on both front and backend
add_action( 'wp_ajax_dhpGetTimeline', 'dhpGetTimeline' );
add_action( 'wp_ajax_nopriv_dhpGetTimeline', 'dhpGetTimeline' );

function dhpGetMoteContent(){
	$dhp_post_id = $_POST['post'];
	$dhp_post_field = $_POST['field_names'];

	$post_meta_content = get_post_meta($dhp_post_id,$dhp_post_field,true);
	die(json_encode($post_meta_content));
}
add_action( 'wp_ajax_dhpGetMoteContent', 'dhpGetMoteContent' );
add_action('wp_ajax_nopriv_dhpGetMoteContent', 'dhpGetMoteContent');


function getTranscriptClip($tran,$clip){

	$clipArray = split("-", $clip);
	$clipStart = strpos($tran, $clipArray[0]);
	$clipEnd = mb_strpos($tran, $clipArray[1]);
	$clipLength = $clipEnd - $clipStart;
	if($clipStart&&$clipEnd) {
		$returnClip = substr($tran, $clipStart-1, $clipLength+13);
	}
	else {
		$returnClip = $clipStart . '-'.$clipEnd.$clipArray[1].$tran;//'incorrect timestamp or transcript not found';
	}
	//return $clipArray[0];
	return $returnClip;
}
function loadTranscriptFromFile($fileUrl) {
	//'http://msc.renci.org/dev/wp-content/uploads/2012/11/Ambler-Susan.mp3.qt.txt'
	$content = @file_get_contents($fileUrl);
	if ($content === false) { /* failure */ } 
	
	else { /* success */ 
		return $content;
	}
}
function dhpGetTranscriptClip() {
	$dhp_project = $_POST['project'];
	$dhp_transcript_field = $_POST['transcript'];
	$dhp_clip = $_POST['timecode'];
	$projectObj = get_post($dhp_project);
	//$dhp_transcript = get_post_meta( $dhp_project, $dhp_project_field, true);
	$dhp_transcript = loadTranscriptFromFile($dhp_transcript_field);
	$dhp_transcript_clip = getTranscriptClip($dhp_transcript,$dhp_clip);
	die(json_encode($dhp_transcript_clip));
}
add_action( 'wp_ajax_dhpGetTranscriptClip', 'dhpGetTranscriptClip' );
add_action('wp_ajax_nopriv_dhpGetTranscriptClip', 'dhpGetTranscriptClip');
function dhpGetTranscript(){

	$dhp_project = $_POST['project'];
	$dhp_project_field = $_POST['transcript'];
	//$dhp_clip = $_POST['timecode'];
	$dhp_tax_term = $_POST['tax_view'];
	$projectObj = get_post($dhp_project);
	$dhp_tax_name = 'dhp_tax_'.$projectObj->ID;

	$dhp_settings = json_decode(get_post_meta( $dhp_project, 'project_settings', true),true);
	foreach ($dhp_settings['entry-points'] as $i => $ep) {
 	   if (array_key_exists('type', $ep) && $ep['type'] == 'transcript')
        $dhp_settings_ep = $dhp_settings['entry-points'][$i];
    	$dhp_audio_mote = getMoteFromName($dhp_settings,$dhp_settings_ep['settings']['audio']);
		
	}

	$args = array(
		'posts_per_page' => 1,
		'post_type' => 'dhp-markers',
		'tax_query' => array(
			array(
				'taxonomy' => $dhp_tax_name,
				'field' => 'slug',
				'terms' => $dhp_project_field
			)
		)
	);
	$first_marker = get_posts( $args );
	$marker_meta = get_post_meta( $first_marker[0]->ID );
	$dhp_audio_field = getMoteFromName($dhp_settings,$dhp_settings_ep['settings']['audio']);

	$dhp_transcript_field = getMoteFromName($dhp_settings,$dhp_settings_ep['settings']['transcript']);
	$dhp_transcript_cfield = $dhp_transcript_field['custom-fields'];//$marker_meta['transcript_url'])
	$dhp_transcript = loadTranscriptFromFile($marker_meta[$dhp_transcript_cfield][0]);

	$dhp_object;
	//'"'.$dhp_tax_name.','.$dhp_tax_term.'"';//
	$dhp_object['feed'] = dhp_get_group_feed($dhp_tax_name,$dhp_tax_term);
	$dhp_object['settings'] = $dhp_settings_ep;
	$dhp_object['audio'] = $marker_meta[$dhp_audio_field['custom-fields']][0];
	$dhp_object['transcript'] = $dhp_transcript;
	
	die(json_encode($dhp_object));	
}
//show on both front and backend
add_action( 'wp_ajax_dhpGetTranscript', 'dhpGetTranscript' );
add_action( 'wp_ajax_nopriv_dhpGetTranscript', 'dhpGetTranscript');

function dhpAddCustomField(){
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
}
add_action( 'wp_ajax_dhpAddCustomField', 'dhpAddCustomField' );

/**
 * [dhpCreateCustomFieldFilter description]
 * @return [type] [description]
 */
function dhpCreateCustomFieldFilter(){
	$dhp_project 				= $_POST['project'];
	$dhp_custom_field_name 	= $_POST['field_name'];
	$dhp_custom_field_value	= $_POST['field_value'];
	$dhp_custom_filter_key 	= $_POST['filter_key'];
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

	$loop = new WP_Query( $args );
	while ( $loop->have_posts() ) : $loop->the_post();

		$marker_id = get_the_ID();
		add_post_meta($marker_id, $dhp_custom_field_name, $dhp_custom_field_value, true);
				
	endwhile;
	
	die();
}
add_action( 'wp_ajax_dhpCreateCustomFieldFilter', 'dhpCreateCustomFieldFilter' );

function dhpUpdateCustomFieldFilter(){
	$dhp_project 				= $_POST['project'];
	$dhp_custom_field_name 	= $_POST['field_name'];
	$dhp_custom_current_value	= $_POST['current_value'];
	$dhp_custom_new_value		= $_POST['new_value'];
	$dhp_custom_filter_key 	= $_POST['filter_key'];
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

			$new_value = str_replace($dhp_custom_current_value,$dhp_custom_new_value,$tempPostContent);
			
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
}
add_action( 'wp_ajax_dhpUpdateCustomFieldFilter', 'dhpUpdateCustomFieldFilter' );

function dhpReplaceCustomFieldFilter(){
	$dhp_project 				= $_POST['project'];
	$dhp_custom_field_name 	= $_POST['field_name'];
	$dhp_custom_new_value		= $_POST['new_value'];
	$dhp_custom_filter_key 	= $_POST['filter_key'];
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
}
add_action( 'wp_ajax_dhpReplaceCustomFieldFilter', 'dhpReplaceCustomFieldFilter' );

function dhpGetFieldValues() {
	$dhp_project 				= $_POST['project'];
	$dhp_custom_field_name 	= $_POST['field_name'];
	$tempValues = createMetaValueArray($dhp_custom_field_name, $dhp_project);

	die(json_encode($tempValues));
}
add_action( 'wp_ajax_dhpGetFieldValues', 'dhpGetFieldValues' );

function dhpFindReplaceCustomField(){
	$dhp_project = $_POST['project'];
	$dhp_custom_field_name = $_POST['field_name'];
	$dhp_custom_find_value = $_POST['find_value'];
	$dhp_custom_replace_value = $_POST['replace_value'];

	$args = array( 'post_type' => 'dhp-markers', 'meta_key' => 'project_id','meta_value'=>$dhp_project, 'posts_per_page' => -1 );
	$loop = new WP_Query( $args );
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
}
add_action( 'wp_ajax_dhpFindReplaceCustomField', 'dhpFindReplaceCustomField' );

function dhpDeleteCustomField(){
	$dhp_project = $_POST['project'];
	$dhp_custom_field_name = $_POST['field_name'];
	
	$args = array( 'post_type' => 'dhp-markers', 'meta_key' => 'project_id','meta_value'=>$dhp_project, 'posts_per_page' => -1 );
	$loop = new WP_Query( $args );
	while ( $loop->have_posts() ) : $loop->the_post();

		$marker_id = get_the_ID();
		delete_post_meta($marker_id, $dhp_custom_field_name);
		//add_post_meta($marker_id, $dhp_custom_field_name, $dhp_custom_field_value, true);
				
	endwhile;
	
	die();
}
add_action( 'wp_ajax_dhpDeleteCustomField', 'dhpDeleteCustomField' );


function dhpCreateTaxTerms(){
	$mote_parent = $_POST['mote_name'];
	$dhp_projectID = $_POST['project'];
	$dhp_project_terms = str_replace('\\', '', $_POST['terms']);


	$dhp_project_terms1 = json_decode($dhp_project_terms);
	$termDetailsArray = array('parentTerm'=>$mote_parent, 'projectID' => $dhp_projectID, 'termsArray'=>$dhp_project_terms1);

	$newArgs = loopTermHeirarchy($termDetailsArray);

	die(json_encode($newArgs));
}
add_action( 'wp_ajax_dhpCreateTaxTerms', 'dhpCreateTaxTerms' );

function loopTermHeirarchy($argArray) {
	$mote_parent = $argArray['parentTerm'];
	//convert mote_parent to id
	
	$dhp_project_terms = $argArray['termsArray'];
	$dhp_tax_name = 'dhp_tax_'.$argArray['projectID'];
	$mote_parentID = get_term_by('name', $mote_parent, $dhp_tax_name);
	$meta_key = 'icon_url';
	$myCount = count($dhp_project_terms);

	foreach ($dhp_project_terms as $term) {
		$term_name = $term->{'name'};
		$parent_term_id = $term->{'parent'};
		$term_id = $term->{'term_id'};	
		$term_order = $term->{'term_order'};	
		$meta_value = $term->{'icon_url'};

		if($meta_value=='undefined') { $meta_value = '';}
		
		if( ($parent_term_id==0||$parent_term_id==""||$parent_term_id==null) && ($term_id!=$mote_parent) ) {
			$parent_term_id = $mote_parent;
		}

		$args = array( 'parent' => $parent_term_id,'term_group' =>  $term_order );
		//update term(insert takes place on legend setup)
		wp_update_term( $term_id, $dhp_tax_name, $args );
		//clear out old value and insert new
		delete_term_meta($term_id, $meta_key);
		add_term_meta($term_id, $meta_key, $meta_value);
		
	}
	$oldArgs = array('parentTerm'=>$mote_parent, 'projectID' => $argArray['projectID'], 'termsArray'=>$dhp_project_terms, 'count'=> $myCount);
	return $oldArgs;
}
function dhpCreateTermInTax(){
	$dhp_projectID = $_POST['project'];
	$dhp_term_name = $_POST['term_name'];
	$parent_term_name = $_POST['parent_term_name'];

	$dhp_tax_name = 'dhp_tax_'.$dhp_projectID;
	$parent_term = term_exists( $parent_term_name, $dhp_tax_name );
	$parent_term_id = $parent_term['term_id'];
	$args = array( 'parent' => $parent_term_id );
	//create new term
	wp_insert_term( $dhp_term_name, $dhp_tax_name, $args );
	$newTerm = get_term_by('name', $dhp_term_name, $dhp_tax_name);

	die(json_encode($newTerm));
}
add_action( 'wp_ajax_dhpCreateTermInTax', 'dhpCreateTermInTax' );

function dhpDeleteTerms(){
	$dhp_projectID = $_POST['project'];
	$dhp_term_name = $_POST['term_name'];
	$dhp_project = get_post($dhp_projectID);
	$dhp_project_slug = $dhp_project->post_name;
	
	$dhp_tax = 'dhp_tax_'.$dhp_projectID;
	//get term id, get children term ids
	$dhp_delete_parent_term = get_term_by('name',$dhp_term_name,$dhp_tax);
	$dhp_delete_parent_id = $dhp_delete_parent_term->term_id;
	$dhp_delete_children = get_term_children($dhp_delete_parent_id,$dhp_tax);
	foreach ($dhp_delete_children as $delete_term) {
		wp_delete_term($delete_term, $dhp_tax);
	}
	wp_delete_term($dhp_delete_parent_id, $dhp_tax);
	
	
	die(json_encode($dhp_delete_children));
}
add_action( 'wp_ajax_dhpDeleteTerms', 'dhpDeleteTerms' );
function dhpGetCustomFields(){
	$dhp_projectID = $_POST['project'];
	
	
	$dhp_custom_fields = createUniqueCustomFieldArray($dhp_projectID);
	die(json_encode($dhp_custom_fields));
}
add_action( 'wp_ajax_dhpGetCustomFields', 'dhpGetCustomFields' );

//getTaxObject()


// Restore revision
function dhp_project_restore_revision( $post_id, $revision_id ) {
	global $dhp_project_settings_fields;
	$post     = get_post( $post_id );
	$revision = get_post( $revision_id );
	foreach ($dhp_project_settings_fields as $field) {
			$old = get_metadata( 'post', $revision->ID, $field['id'], true);
			if ( false !== $old) {
				update_post_meta($post_id, $field['id'], $old);
			} else {
				delete_post_meta($post_id, $field['id'] );
			}
		} // end foreach
}
add_action( 'wp_restore_post_revision', 'dhp_project_restore_revision', 10, 2 );


function my_plugin_revision_fields( $fields ) {

	$fields['my_meta'] = 'My Meta';
	return $fields;

}
//add_filter( '_wp_post_revision_fields', 'my_plugin_revision_fields' );

function my_plugin_revision_field( $value, $field ) {

	global $revision;
	return get_metadata( 'post', $revision->ID, $field, true );

}
//add_filter( '_wp_post_revision_field_my_meta', 'my_plugin_revision_field', 10, 2 );
function dhp_get_type_settings($type,$object) {
	foreach($object as $eps) {
		//var $ec = $eps.type;
		if($eps['type'] == $type){
			return $eps['settings'];
		}
		//return $ec;
	}
}
function dhp_get_map_type($type,$object) {
	foreach($object as $layer) {
		//var $ec = $eps.type;
		//return $layer['id'];
		if($layer['mapType'] == $type){
			$map_id = get_post_meta($layer['id'],'dhp_map_typeid');
			return $map_id[0];
		}
		//return $ec;
	}
}

// Custom scripts to be run on Project new/edit pages only
function add_dhp_project_admin_scripts( $hook ) {

    global $post;
    global $layers_global;
    $blog_id = get_current_blog_id();
	$dev_url = get_admin_url( $blog_id ,'admin-ajax.php');

    //$dhp_custom_fields = createUniqueCustomFieldArray($post->ID);
    if ( $hook == 'post-new.php' || $hook == 'post.php' ) {
        if ( 'project' === $post->post_type ) {    
        $tempLayers = 'layers '.$layers_global; 
			//wp_register_style( 'ol-style', plugins_url('/js/OpenLayers/theme/default/style.css',  dirname(__FILE__) ));
			//wp_enqueue_style( 'ol-map', plugins_url('/css/ol-map.css',  dirname(__FILE__) ));
			
			wp_enqueue_style( 'dhp-sortable-style', plugins_url('/css/sortable.css',  dirname(__FILE__) ));
			wp_enqueue_style( 'dhp-bootstrap-style', plugins_url('/lib/bootstrap/css/bootstrap.min.css',  dirname(__FILE__) ));
			wp_enqueue_style( 'dhp-bootstrap-responsive-style', plugins_url('/lib/bootstrap/css/bootstrap-responsive.min.css',  dirname(__FILE__) ));
			wp_enqueue_style( 'dhp-jquery-ui-style', 'http://code.jquery.com/ui/1.10.2/themes/smoothness/jquery-ui.css');
			wp_enqueue_style( 'dhp-font-awesome', plugins_url('/lib/font-awesome/css/font-awesome.min.css',  dirname(__FILE__) ));
			//wp_enqueue_style( 'dhp-bootstrap-slider-style', plugins_url('/lib/bootstrap/css/slider.css',  dirname(__FILE__) ));
			wp_enqueue_style( 'dhp-style', plugins_url('/css/dhp-style.css',  dirname(__FILE__) ));
			
			// wp_enqueue_script( 'jquery' );
			// wp_enqueue_script( 'jquery-ui' );
			wp_dequeue_script( 'jquery' ); 
			wp_dequeue_script( 'jquery-ui' );
			wp_enqueue_script(  'dhp-jquery', plugins_url('/lib/jquery-1.7.2.min.js', dirname(__FILE__) ));
			wp_enqueue_script(  'dhp-jquery-ui', plugins_url('/lib/jquery-ui-1.8.16.custom.min.js', dirname(__FILE__) ));

	 		wp_enqueue_script( 'jquery-ui-slider' );
			wp_enqueue_script(  'dhp-bootstrap', plugins_url('/lib/bootstrap/js/bootstrap.min.js', dirname(__FILE__) ),'jquery');
			//wp_enqueue_script(  'bootstrap-button-fix', plugins_url('/lib/bootstrap/js/bootstrap-button-fix.js', dirname(__FILE__) ),'dhp-bootstrap');
			//wp_enqueue_script(  'dhp-bootstrap-slider', plugins_url('/lib/bootstrap/js/bootstrap-slider.js', dirname(__FILE__) ),'dhp-bootstrap');
           	
			wp_enqueue_script(  'dhp-touch-punch', plugins_url('/lib/jquery.ui.touch-punch.js', dirname(__FILE__) ));
            wp_enqueue_script( 'open-layers', plugins_url('/js/OpenLayers/OpenLayers.js', dirname(__FILE__) ));
        
             //wp_enqueue_script(  'open-layers', plugins_url('/js/OpenLayers/OpenLayers.js', dirname(__FILE__) ));
			wp_enqueue_script(  'dhp-nested-sortable', plugins_url('/lib/jquery.mjs.nestedSortable.js', dirname(__FILE__) ));
			wp_enqueue_style( 'dhp-jPicker-style1', plugins_url('/js/jpicker/css/jPicker-1.1.6.min.css',  dirname(__FILE__) ));
			wp_enqueue_style( 'dhp-jPicker-style2', plugins_url('/js/jpicker/jPicker.css',  dirname(__FILE__) ));
			wp_enqueue_script(  'dhp-jPicker', plugins_url('/js/jpicker/jpicker-1.1.6.js', dirname(__FILE__) ));

			wp_enqueue_script(  'dhp-project-script', plugins_url('/js/dhp-project-admin.js', dirname(__FILE__) ));
			wp_localize_script( 'dhp-project-script', 'dhpDataLib', array(
				'ajax_url' => __($dev_url, 'dhp'),
				//'dhp_custom_fields' => __($dhp_custom_fields, 'dhp'),
				'layers' => __($tempLayers, 'dhp')
			) );
			wp_enqueue_style('thickbox');
			wp_enqueue_script('thickbox');

        }
    }
    //Bulk display of all projects
	if ( $hook == 'edit.php'  ) {
        if ( 'project' === $post->post_type ) {     
			//wp_register_style( 'ol-style', plugins_url('/js/OpenLayers/theme/default/style.css',  dirname(__FILE__) ));
			wp_enqueue_style( 'ol-map', plugins_url('/css/ol-map.css',  dirname(__FILE__) ));
			wp_enqueue_script(  'jquery' );
             //wp_enqueue_script(  'open-layers', plugins_url('/js/OpenLayers/OpenLayers.js', dirname(__FILE__) ));
			 //wp_enqueue_script(  'dhp-project-script2', plugins_url('/js/dhp-project-admin2.js', dirname(__FILE__) ));
			 
        }
    }
}
add_action( 'admin_enqueue_scripts', 'add_dhp_project_admin_scripts', 10, 1 );


function dhp_register_maps($mapObject){
	//if cdla, load api
	wp_register_script(
				'cdlaMaps',
				'http://docsouth.unc.edu/cdlamaps/api/OASIS',
				array( 'open-layers' ),
				false,
				true
			);
	//loop thru layers
	$cdla_count = 0;
	foreach($mapObject as $layer) {
		//var $ec = $eps.type;
		//return $layer['id'];
		if($layer['mapType'] == 'type-CDLA'){
			$map_id = get_post_meta($layer['id'],'dhp_map_typeid',true);
			$cdla_layer_url = 'http://docsouth.unc.edu/cdlamaps/api/mapdata/OASIS/'.$map_id;
			
			wp_register_script(
				'cdla-layer-data'.$cdla_count,
				$cdla_layer_url,
				array( 'cdlaMaps' ),
				false,
				true
			);
			wp_enqueue_script( 'cdla-layer-data'.$cdla_count);
			$cdla_count++;
		}
		//return $ec;
	}	
}

// Set template to be used for Project type
function dhp_page_template( $page_template )
{
	global $post;
	$blog_id = get_current_blog_id();
	$dev_url = get_admin_url( $blog_id ,'admin-ajax.php');
	$post_type = get_query_var('post_type');
    if ( $post_type == 'project' ) {
    	$projectSettings_get = get_post_meta($post->ID, 'project_settings');
    	$projectSettings = json_decode($projectSettings_get[0],true);
    	$projectSettings_map = dhp_get_type_settings('map',$projectSettings['entry-points']);

    	//if map type is cdla get id
    	$projectSettings_map_cdla = dhp_get_map_type('type-CDLA',$projectSettings_map['layers']);

		dhp_register_maps($projectSettings_map['layers']);

    	wp_register_script(
				'cdlaMaps',
				'http://docsouth.unc.edu/cdlamaps/api/OASIS',
				array( 'open-layers' ),
				false,
				true
			);	
    	
        $page_template = dirname( __FILE__ ) . '/dhp-project-template.php';

		wp_enqueue_style( 'dhp-bootstrap-style', plugins_url('/lib/bootstrap/css/bootstrap.min.css',  dirname(__FILE__) ));
		wp_enqueue_style( 'dhp-bootstrap-responsive-style', plugins_url('/lib/bootstrap/css/bootstrap-responsive.min.css',  dirname(__FILE__) ));
        wp_enqueue_style( 'dhp-font-awesome', plugins_url('/lib/font-awesome/css/font-awesome.min.css',  dirname(__FILE__) ));
        wp_enqueue_style( 'dhp-jquery-ui-style', 'http://code.jquery.com/ui/1.10.2/themes/smoothness/jquery-ui.css');
		wp_enqueue_style( 'ol-map', plugins_url('/css/ol-map.css',  dirname(__FILE__) ));
		wp_enqueue_style( 'joyride', plugins_url('/css/joyride-2.1.css',  dirname(__FILE__) ));
			
		wp_enqueue_script('jquery');
		wp_enqueue_script( 'jquery-ui' );
		wp_enqueue_script(  'dhp-jquery-ui', plugins_url('/lib/jquery-ui-1.10.3.custom.min.js', dirname(__FILE__) ));
 		wp_enqueue_script( 'jquery-ui-slider' );
			
		wp_enqueue_script( 'dhp-bootstrap', plugins_url('/lib/bootstrap/js/bootstrap.min.js', dirname(__FILE__) ),'jquery');
			
		wp_enqueue_script( 'joyride', plugins_url('/js/jquery.joyride-2.1.js', dirname(__FILE__),array('jquery') ));


		wp_enqueue_script('backbone');
		wp_enqueue_script('underscore');
		//wp_enqueue_script( 'open-layers', 'http://dev.openlayers.org/releases/OpenLayers-2.12/lib/OpenLayers.js' );
    	wp_enqueue_script( 'open-layers', plugins_url('/js/OpenLayers/OpenLayers.js', dirname(__FILE__) ));
    	wp_enqueue_script( 'dhp-google-map-script', 'http'. ( is_ssl() ? 's' : '' ) .'://maps.google.com/maps/api/js?v=3&amp;sensor=false');
        wp_enqueue_script( 'soundcloud-api', 'http://w.soundcloud.com/player/api.js','jquery');
    	wp_enqueue_script( 'cdlaMaps' );

    	if($projectSettings_map_cdla) {
    		//wp_enqueue_script( 'cdla-layer-data' );
    	}

        wp_enqueue_script( 'timeline-js', plugins_url('/js/storyjs-embed.js', dirname(__FILE__) ));

		wp_enqueue_style('thickbox');
		wp_enqueue_script('thickbox');
		wp_enqueue_script( 'dhp-public-project-script', plugins_url('/js/dhp-project-page.js', dirname(__FILE__) ),'mediaelement');
		 
		wp_localize_script( 'dhp-public-project-script', 'dhpData', array(
			'ajax_url' => __($dev_url, 'dhp'),
			'settings' => __($projectSettings_get[0], 'dhp'),
			'map' => __($projectSettings_map, 'dhp'),
			'layers' => __($projectSettings_map['layers'], 'dhp')
		) );
    }
    if ( $post_type == 'dhp-markers' ) {
		$projectSettings_id = get_post_meta($post->ID, 'project_id',true);
		$projectSettings_get = get_post_meta($projectSettings_id, 'project_settings');
    	$projectSettings = json_decode($projectSettings_get[0],true);
    	$projectSettings_map = dhp_get_type_settings('map',$projectSettings['entry-points']);

    	//if map type is cdla get id
    	$projectSettings_map_cdla = dhp_get_map_type('type-CDLA',$projectSettings_map['layers']);

		dhp_register_maps($projectSettings_map['layers']);

    	wp_register_script(
				'cdlaMaps',
				'http://docsouth.unc.edu/cdlamaps/api/OASIS',
				array( 'open-layers' ),
				false,
				true
			);	
    	
        $page_template = dirname( __FILE__ ) . '/dhp-project-template.php';

		wp_enqueue_style( 'dhp-bootstrap-style', plugins_url('/lib/bootstrap/css/bootstrap.min.css',  dirname(__FILE__) ));
		wp_enqueue_style( 'dhp-bootstrap-responsive-style', plugins_url('/lib/bootstrap/css/bootstrap-responsive.min.css',  dirname(__FILE__) ));
        wp_enqueue_style( 'dhp-font-awesome', plugins_url('/lib/font-awesome/css/font-awesome.min.css',  dirname(__FILE__) ));

		wp_enqueue_style( 'ol-map', plugins_url('/css/ol-map.css',  dirname(__FILE__) ));
		wp_enqueue_style( 'joyride', plugins_url('/css/joyride-2.1.css',  dirname(__FILE__) ));	
		wp_enqueue_script('jquery');

			
		wp_enqueue_script( 'dhp-bootstrap', plugins_url('/lib/bootstrap/js/bootstrap.min.js', dirname(__FILE__) ),'jquery');
			
		//wp_enqueue_script( 'mediaelement', plugins_url('/js/mediaelement/mediaelement-and-player.min.js', dirname(__FILE__),array('jquery') ));
		wp_enqueue_script('backbone');
		wp_enqueue_script('underscore');

		//wp_enqueue_script( 'open-layers', 'http://dev.openlayers.org/releases/OpenLayers-2.12/lib/OpenLayers.js' );
    	wp_enqueue_script( 'open-layers', plugins_url('/js/OpenLayers/OpenLayers.js', dirname(__FILE__) ));
    	wp_enqueue_script( 'dhp-google-map-script', 'http'. ( is_ssl() ? 's' : '' ) .'://maps.google.com/maps/api/js?v=3&amp;sensor=false');

    	wp_enqueue_script( 'cdlaMaps' );
        //wp_enqueue_script( 'timeline-js', plugins_url('/js/storyjs-embed.js', dirname(__FILE__) ));

		wp_enqueue_script( 'dhp-public-project-script', plugins_url('/js/dhp-marker-page.js', dirname(__FILE__) ),'jquery');
		 
		wp_localize_script( 'dhp-public-project-script', 'dhpData', array(
			'ajax_url' => __($dev_url, 'dhp'),
			'settings' => __($projectSettings_get[0], 'dhp'),
			'map' => __($projectSettings_map, 'dhp'),
			'layers' => __($projectSettings_map['layers'], 'dhp')
		) );
    }
    return $page_template;
}
add_filter( 'single_template', 'dhp_page_template' );



// Set template to be used for top level custom taxonomy term
function dhp_tax_template( $page_template )
{
	$blog_id = get_current_blog_id();
	$dev_url = get_admin_url( $blog_id ,'admin-ajax.php');
	if( is_tax() ) {
    global $wp_query;
    $term = $wp_query->get_queried_object();
    $title = $term->taxonomy;
    $term_parent = get_term($term->parent, $title);
    $term->parent_name = $term_parent->name;

    $page_template = dirname( __FILE__ ) . '/dhp-archive.php';
    //get mp3 url from first term marker
    //get transcript url
    $pieces = explode("dhp_tax_", $title);
    $projectID = get_page($pieces[1],OBJECT,'project');
    $project_settings = get_post_meta($projectID->ID,'project_settings',true);
	
	wp_enqueue_style('mediaelement', plugins_url('/js/mediaelement/mediaelementplayer.css',  dirname(__FILE__) ));
	wp_enqueue_style( 'dhp-bootstrap-style', plugins_url('/lib/bootstrap/css/bootstrap.min.css',  dirname(__FILE__) ));
	wp_enqueue_style( 'dhp-bootstrap-responsive-style', plugins_url('/lib/bootstrap/css/bootstrap-responsive.min.css',  dirname(__FILE__) ));
    wp_enqueue_style( 'dhp-font-awesome', plugins_url('/lib/font-awesome/css/font-awesome.min.css',  dirname(__FILE__) ));
    wp_enqueue_script( 'soundcloud-api', 'http://w.soundcloud.com/player/api.js','jquery');
    wp_enqueue_style( 'ol-map', plugins_url('/css/ol-map.css',  dirname(__FILE__) ));
    wp_enqueue_style( 'joyride', plugins_url('/css/joyride-2.1.css',  dirname(__FILE__) ));
	//map reqs	
    wp_enqueue_script( 'open-layers', plugins_url('/js/OpenLayers/OpenLayers.js', dirname(__FILE__) ));
    wp_enqueue_script( 'cdlaMaps' );
	if($projectSettings_map_cdla) {
    	wp_enqueue_script( 'cdla-layer-data' );
    }
	//$projectSettings_get = get_post_meta($post->ID, 'project_settings');
	
	wp_enqueue_script( 'jquery' );
	wp_enqueue_script( 'dhp-bootstrap', plugins_url('/lib/bootstrap/js/bootstrap.min.js', dirname(__FILE__) ),'jquery');		
	wp_enqueue_script( 'backbone' );
	wp_enqueue_script( 'underscore' );
	wp_enqueue_script( 'joyride', plugins_url('/js/jquery.joyride-2.1.js', dirname(__FILE__),array('jquery') ));
		
	wp_enqueue_script( 'dhp-tax-script', plugins_url('/js/dhp-tax-template.js', dirname(__FILE__) ),'mediaelement');
	
	wp_localize_script( 'dhp-tax-script', 'dhpData', array(
			'project_id' => __($projectID->ID,'dhp'),
			'ajax_url' => __($dev_url, 'dhp'),
			'tax' => __($term,'dhp'), 
			'project' => __($project_settings)
			
		) );
	}
	return $page_template;
}
add_filter( 'archive_template', 'dhp_tax_template' );
/**
 * Deploy the icons list to select one
 */
function dhp_deploy_icons(){ 
	
	
	$icon_path = DHP_PLUGIN_URL.'/images/icons/';
	$icon_dir = DHP_PLUGIN_DIR.'/images/icons/';	
	
	$icons_array = array();
	
	
	if ($handle = opendir($icon_dir)) {
		
		while (false !== ($file = readdir($handle))) {
	
			$file_type = wp_check_filetype($file);
	
			$file_ext = $file_type['ext'];
		
			if ($file != "." && $file != ".." && ($file_ext == 'gif' || $file_ext == 'jpg' || $file_ext == 'png') ) {
				array_push($icons_array,$icon_path.$file);
			}
		}
	}
	?>
          	   
		<div id="dhp_icon_cont">
        	
		<?php $i = 1; foreach ($icons_array as $icon){ ?>
		  <div class="dhp_icon" id="icon_<?php echo $i;?>">
		  <img src="<?php echo $icon; $i++; ?>" /> 
		  </div>
		<?php } ?>
        
		 </div> 
         <div id="icon-cats"><ul>
         
         </ul></div>
         
         	
	<?php
}
function bdw_get_images() {
 global $post;
    // Get the post ID
    $iPostID = $post->ID;
 
    // Get images for this post
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
}