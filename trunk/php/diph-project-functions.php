<?php 

/**
	 * Registers and handles diPH Project functions
	 *
	 * @package diPH Toolkit
	 * @author diPH Team
	 * @link http://diph.org/download/
	 */


function diph_project_init() {
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
    'menu_name' => __('Projects')

  );
  $args = array(
    'labels' => $labels,
    'public' => true,
    'publicly_queryable' => true,
    'show_ui' => true, 
    'show_in_menu' => 'diph-top-level-handle', 
    'query_var' => true,
    'rewrite' => array('slug' => 'dhp-projects','with_front' => FALSE),
    'capability_type' => 'page',
    'has_archive' => true, 
    'hierarchical' => true,
    'menu_position' => null,
    'supports' => array( 'title', 'author', 'thumbnail', 'excerpt', 'comments','revisions', 'custom-fields' )
  ); 
  register_post_type('project',$args);
  
}
add_action( 'init', 'diph_project_init' );

function getLayerList(){
	$layers = array();
	$args = array( 'post_type' => 'diph-maps', 'posts_per_page' => -1 );
	$loop = new WP_Query( $args );
	$layerCount=0;
	while ( $loop->have_posts() ) : $loop->the_post();
	//var $tempLayers = array();
		$layer_id = get_the_ID();
		$layer_name = get_the_title();
		$layer_use = get_post_meta($layer_id, 'diph_map_category',true);
		$layer_type = get_post_meta($layer_id, 'diph_map_type',true);
		$layer_typeid = get_post_meta($layer_id, 'diph_map_typeid',true);
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
function diph_create_option_list($layerArray){
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
function diph_project_updated_messages( $messages ) {
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
add_filter( 'post_updated_messages', 'diph_project_updated_messages' );


//add custom taxonomies for each project
add_action( 'init', 'create_tax_for_projects', 0 );
function create_tax_for_projects() {
	$args = array( 'post_type' => 'project', 'posts_per_page' => -1 );
	$projects = get_posts($args);
	if ($projects) {
		foreach ( $projects as $project ) {
			$projectTax = 'diph_tax_'.$project->post_name;
			$projectName = $project->post_title;
			$projectSlug = $project->post_name;
			$taxonomy_exist = taxonomy_exists($projectTax);
			//returns true
			if(!$taxonomy_exist) {
				diph_create_tax($projectTax,$projectName,$projectSlug);
			}
		}
	}
}

function diph_create_tax($taxID,$taxName,$taxSlug){

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

  register_taxonomy($taxID,array('diph-markers'), array(
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
	$projectTaxSlug = 'diph_tax_'.$project->post_name;
	$diphTaxs = get_taxonomies();
		
	foreach ($diphTaxs as $key => $value) {
		if($value!=$projectTaxSlug) {
			remove_meta_box( $value.'div', 'diph-markers', 'side' );
		}
	}

}

add_action( 'admin_head' , 'show_tax_on_project_markers' );


if ( function_exists( 'add_theme_support' ) ) {
	add_theme_support( 'post-thumbnails' );
        set_post_thumbnail_size( 32, 37 ); // default Post Thumbnail dimensions
}
// Add the Meta Box
function add_diph_project_settings_box() {
    add_meta_box(
		'diph_settings_box', // $id
		'Project Details', // $title
		'show_diph_project_settings_box', // $callback
		'project', // $page
		'normal', // $context
		'high'); // $priority
}
add_action('add_meta_boxes', 'add_diph_project_settings_box');
// Add the Icon Box
function add_diph_project_icons_box() {
    add_meta_box(
		'diph_icons_box', // $id
		'Marker Icons', // $title
		'show_diph_project_icons_box', // $callback
		'project', // $page
		'side', // $context 
		'default'); // $priority
}
add_action('add_meta_boxes', 'add_diph_project_icons_box');
// Field Array
$prefix = 'project_';
$diph_project_settings_fields = array(
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
function show_diph_project_icons_box() {
	//diph_deploy_icons();
	bdw_get_images();
}
// The Callback
function show_diph_project_settings_box() {

global $diph_project_settings_fields, $post;
define("_PROJECT_ID_", $post->ID);
// Load post id for project settings
echo '<input type="hidden" id="diph-projectid" value="'.$post->ID.'"/>';
// Use nonce for verification
echo '<input type="hidden" name="diph_project_settings_box_nonce" value="'.wp_create_nonce(basename(__FILE__)).'" />';
	//echo '<div id="map-divs"></div><button id="locate">Locate me!</button>';

	// Begin the field table and loop
	echo '<table class="project-form-table">';
	foreach ($diph_project_settings_fields as $field) {
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
function save_diph_project_settings($post_id) {
    global $diph_project_settings_fields;
	$parent_id = wp_is_post_revision( $post_id );
	
	// verify nonce
	if (!wp_verify_nonce($_POST['diph_project_settings_box_nonce'], basename(__FILE__)))
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
		
		foreach ($diph_project_settings_fields as $field) {
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
		foreach ($diph_project_settings_fields as $field) {
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
add_action('save_post', 'save_diph_project_settings');  

//create arrays of custom field values associated with a project
function createMoteValueArrays($custom_name,$delim,$project_id){

	//loop through all markers in project -add to array
	$moteArray = array();
	$projectObj = get_post($project_id);
	$diph_tax_name = 'diph_tax_'.$projectObj->post_name;


	$args = array( 'post_type' => 'diph-markers', 'meta_key' => 'project_id','meta_value'=>$project_id, 'posts_per_page' => -1 );
	$loop = new WP_Query( $args );
	while ( $loop->have_posts() ) : $loop->the_post();

		$marker_id = get_the_ID();
		//$temp_post = get_post($marker_id);
		$tempMoteValue = get_post_meta($marker_id,$custom_name);
		$tempMoteArray = array();
		if($delim) {
			if (strpos($tempMoteValue[0],$delim) !== false) {
				$tempMoteArray = split($delim,$tempMoteValue[0]);
			}
			else {
			//array_push($moteArray,$tempMoteValue[0]);
			$tempMoteArray[0] = $tempMoteValue[0];
			}
		}
		else {
			//array_push($moteArray,$tempMoteValue[0]);
			$tempMoteArray[0] = $tempMoteValue[0];
		}
		//array_push($moteArray,$tempMoteValue[0]); 
		//array_push($moteArray,$tempMoteValue[0]); 
		$termsArray = array();
		for($i=0;$i<count($tempMoteArray);$i++) {
			$term_name = trim($tempMoteArray[$i]);

			if(term_exists( $term_name, $diph_tax_name )) {
				$clean_termName = htmlspecialchars($term_name);
				$ttermid = get_term_by('name', $clean_termName, $diph_tax_name);
				array_push($termsArray, $ttermid->term_id);
			}
			array_push($moteArray, $term_name);
		}
		wp_set_post_terms( $marker_id, $termsArray, &$diph_tax_name, true );
		
	endwhile;

	 //$result = array_unique($array)
	return $moteArray;
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
function createUniqueCustomFieldArray(){

	$project_id =  _PROJECT_ID_;
	//loop through all markers in project -add to array
	$custom_field_array = array();

	$args = array( 'post_type' => 'diph-markers', 'meta_key' => 'project_id','meta_value'=>$project_id, 'posts_per_page' => -1 );
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
		return $tempLonLat[1].','.$tempLonLat[0];
	}

}
function getIconsForTerms($parent_terms, $taxonomy){

	$json_filter = '{ "type":"filter", "name":"'.$parent_terms->name.'", "terms" :[';
	//$json_filter .= 'here'.$parent_terms->name;	
	$myargs = array( 'orderby'       => 'term_group',
					'parent'         => $parent_terms->term_id, );

	//$children_terms = get_term_children( $parent_terms->term_id, $taxonomy );
	$children_terms = get_terms( $taxonomy, $myargs );
	$children_names = array();
	foreach ($children_terms as $child) {
		//$child_name = get_term_by('id', $child, $taxonomy);
		array_push($children_names, $child->name);

		$children_terms2 = get_term_children( $child->term_id, $taxonomy );
		$children_names2 = array();
		foreach ($children_terms2 as $child2) {
		$child_name2 = get_term_by('id', $child2, $taxonomy);
		array_push($children_names2, $child_name2->name);
		}
		$icon_url = get_term_meta($child->term_id,'icon_url',true);
		$json_filter_children .= ',{ "name":"'.$child->name.'","icon_url" :"'.$icon_url.'", "children" : '.json_encode($children_names2).'}';
	}
	$icon_url = get_term_meta($parent_terms->term_id,'icon_url',true);
	$json_filter .= '{ "name":"'.$parent_terms->name.'","icon_url" :"'.$icon_url.'", "children" : '.json_encode($children_names).'}';
	$json_filter .= $json_filter_children;
	
	$json_filter .= ']}';
	return $json_filter;
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
	


	//$term_id = get_term_by('name', $terms[0], $tax);
	foreach( $terms as $term ) {
		$real_term = get_term_by('name', $term, $tax);
		//$termtest .= $term->term_id;
		$intersect = array_intersect(array($real_term->term_id), $link_terms);
		if ($intersect) {
			//return $intersect[0];
			 $term_link = get_term_link($real_term);
			 return $term_link;
		}
	}
	//return print_r($real_term);
	//return $real_term->term_id;
	//return get_term_link($term_id, $tax);
	//return print_r($intersect);
}
function diph_get_group_feed($tax_name,$term_name){
//return feed for map, icon color, audio file
	$pieces = explode("diph_tax_", $tax_name);
    $projectID = get_page_by_path($pieces[1],OBJECT,'project');
    $project_settings = json_decode(get_post_meta($projectID->ID,'project_settings',true),true);
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

	$json_string = '[{"type": "FeatureCollection","features": [';
	$args = array(
    'post_type'=> 'diph-markers',
    $tax_name    => $term_name,
    'order'    => 'ASC'
    );   
	$loop = new WP_Query( $args );

	while ( $loop->have_posts() ) : $loop->the_post();
		$marker_id = get_the_ID();
		$args1 = array("fields" => "names");
		$post_terms = wp_get_post_terms( $marker_id, $tax_name, $args1 );
		$title = get_the_title();
		$audio_val = get_post_meta($marker_id,$audio['custom-fields']);

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
			if($i>0) {
				$json_string .= ',';
			}
			else {$i++;}

			$json_string .= '{"type": "Feature","geometry": { "type": "Point","coordinates": [ '.$lonlat. '] },';
			//properties
			$json_string .= '"properties": {"title": "'.$title.'","categories": '.json_encode($post_terms);
			$json_string .= ',"audio":"'.$audio_val[0].'","timecode":"'.$timecode_val[0].'"';
			$json_string .= '}}';

		//array_push($markerArray,$json_string); 
		}

	endwhile;
	
	$json_string .= ']}]';	
	 //$result = array_unique($array)
	return $json_string;
	//return $test_string;
}
add_action( 'wp_ajax_diph_get_group_feed', 'diph_get_group_feed' );
add_action( 'wp_ajax_nopriv_diph_get_group_feed', 'diph_get_group_feed' );
function createMarkerArray($project_id) {
	//loop through all markers in project -add to array
	$markerArray = array();
	$project_object = get_post($project_id);
	$project_tax = 'diph_tax_'.$project_object->post_name;

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
	$term_icons;
	foreach( $filter as $legend ) {
		
		$parent = get_term_by('name', $legend, $project_tax);
		$parent_term_id = $parent->term_id;
		$parent_terms = get_terms( $project_tax, array( 'parent' => $parent_term_id, 'orderby' => 'term_group' ) );
		//$term_icons .= $parent_term_id;
	 $term_icons .= getIconsForTerms($parent, $project_tax) . ',';
	}
	
	//$parent = get_terms($project_tax, array('parent=0&hierarchical=0&number=1'));
	//print_r($parent);
	
	//$term_icons = json_encode($term_icons);

	$json_string = '['.$term_icons.'{"type": "FeatureCollection","features": [';
	$args = array( 'post_type' => 'diph-markers', 'meta_key' => 'project_id','meta_value'=>$project_id, 'posts_per_page' => -1 );
	$loop = new WP_Query( $args );
	$i = 0;
	$audio_val;
	$transcript_val;
	$timecode_val;
	$link_parent = $project_settings['views']['link'];

	if($link_parent=='marker') {
		//$parent_id = get_term_by('name', $link_parent, $project_tax);
		$child_terms = 'marker';
	}
	else {
		$parent_id = get_term_by('name', $link_parent, $project_tax);
		$child_terms = get_term_children($parent_id->term_id, $project_tax);
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
		$title = get_the_title();
		$audio_val = get_post_meta($marker_id,$audio['custom-fields']);
		
			$transcript_val1 = get_post_meta($marker_id, $transcript['custom-fields']);
			$transcript_val = $transcript['delim'].$transcript_val1[0];
		
		$timecode_val = get_post_meta($marker_id,$timecode['custom-fields']);
		//$categories = get_post_meta($marker_id,'Concepts');
		$args = array("fields" => "names");
		$post_terms = wp_get_post_terms( $marker_id, $project_tax, $args );
		$p_terms;
		$viewsContent = $project_settings['views']['content'];
		$content_att = '';
		foreach( $viewsContent as $contentMote ) {
			$content_mote = getMoteFromName( $project_settings, $contentMote );
			$content_val = get_post_meta($marker_id,$content_mote['custom-fields'],true);
			$content_att .= ',"'.$contentMote. '":"' .htmlentities($content_val).'"';
		}

		if($child_terms=='marker') {
			$term_links = get_permalink();
		}
		else {
			$term_links = dhp_get_term_by_parent($child_terms, $post_terms, $project_tax);
		}
		
		

		foreach ($post_terms as $term ) {
			//$term->name = htmlspecialchars($term->name);
		}
		
		
		if($lonlat) {
			if($i>0) {
				$json_string .= ',';
			}
			else {$i++;}
		$json_string .= '{"type": "Feature","geometry": { "type": "Point","coordinates": [ '.$lonlat. '] },';
		//properties
		$json_string .= '"properties": {"title": "'.$title.'","categories": '.json_encode($post_terms);
		$json_string .= ',"audio":"'.$audio_val[0].'"'.$content_att.',"transcript":"'.$transcript_val.'","timecode":"'.$timecode_val[0].'","link":"'.$term_links.'#'.$timecode_val[0].'"';
		$json_string .= '}}';

		//array_push($markerArray,$json_string); 
		}
	
		
	endwhile;
	$json_string .= ']}]';	
	 //$result = array_unique($array)
	return $json_string;
	//return $content_att;
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
	$project_tax = 'diph_tax_'.$project_object->post_name;

	//LOAD PROJECT SETTINGS
	//-get primary category parent

	$parent = get_term_by('name', "Primary Concept", $project_tax);
	//$parent = get_terms($project_tax, array('parent=0&hierarchical=0&number=1'));
	//print_r($parent);
	$parent_term_id = $parent->term_id;
	$parent_terms = get_terms( $project_tax, array( 'parent' => $parent_term_id, 'orderby' => 'term_group' ) );

	$term_icons = getIconsForTerms($parent_terms, $project_tax);

	$json_string = '{"timeline":{"headline":"Long Womens Movement","type":"default","text":"A journey","date":[';
	$args = array( 'post_type' => 'diph-markers', 'meta_key' => 'project_id','meta_value'=>$project_id, 'posts_per_page' => -1 );
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
	$optionHtml .='<option value="">--</option>';
	foreach ($cf_array as $key => &$value) {
		$optionHtml .='<option value="'.$value.'">'.$value.'</option>';
	}
	return $optionHtml;
}

function print_new_bootstrap_html(){
	$projectPage = get_page(_PROJECT_ID_);
	$projectTax_slug = $projectPage->post_name;

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
                	<p><a href="'.get_bloginfo('wpurl').'/wp-admin/edit-tags.php?taxonomy=diph_tax_'.$projectTax_slug.'" >Catagory Manager</a></p>
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
                  <select name="custom-fields" class="custom-fields">'.create_custom_field_option_list(createUniqueCustomFieldArray()).'
                  </select><span class="help-inline">Choose a data object (custom field)</span>
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
                    <option>Multiple Text</option>
                    <option>HTML</option>
                    <option>Exact Date</option>
                    <option>Date Range</option>
                    <option>Lat/Lon Coordinates</option>
                    <option>File</option>
                    <option>Dynamic Data Field</option>
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
				       <p>
				       <select name="legend-pos" class="legend-pos save-view">                          
                	    <option>Left</option>
              		    <option>Right</option>
               		   </select><span class="help-inline">Legend Location</span>
               		   </p>
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
				        Title, Mote values to include, Terms, Link to Legend term. 
				      </div>
				    </div>
				  </div>
				  <div class="accordion-group">
				    <div class="accordion-heading">
				      <a class="accordion-toggle" data-toggle="collapse" data-parent="#viewList" href="#linkView">
				        Link View
				      </a>
				    </div>
				    <div id="linkView" class="accordion-body collapse">
				      <div class="accordion-inner">
				        Title, Mote values to include, Terms, Link to Legend term. 
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
'<select style="display:none;"id="hidden-layers" >'.diph_create_option_list(getLayerList()).'</select>'.'
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
function createParentTerm($term_name,$diph_tax_name){

	if(term_exists( $term_name, $diph_tax_name )) {
			$temp_term = get_term_by('name', $term_name, $diph_tax_name);
			$term_id = $temp_term->id;			
			wp_update_term( $term_id, $diph_tax_name );
	}
	else {
		wp_insert_term( $term_name, $diph_tax_name );
	}

}
//ajax functions
function diphSaveProjectSettings(){
	$settings =  $_POST['settings'];
	$diph_projectID = $_POST['project'];

	update_post_meta($diph_projectID, 'project_settings', $settings);

	die('working... '. $settings);
}
add_action( 'wp_ajax_diphSaveProjectSettings', 'diphSaveProjectSettings' );
function diphGetMoteValues(){
	$mote_values = array();
	$mote = $_POST['mote_name'];
	$mote_type = $mote['type'];
	$mote_delim = $mote['delim'];
	
	$custom_field = $mote['custom-fields'];
	$diph_projectID = $_POST['project'];

	$diph_project = get_post($diph_projectID);
	$diph_project_slug = $diph_project->post_name;
	$diph_tax_name = 'diph_tax_'.$diph_project_slug;
	createParentTerm($mote['name'],$diph_tax_name);
	//get fresh terms from meta feild 

	$mArray = createMoteValueArrays($custom_field,$mote_delim,$diph_projectID);

	$term_counts = array_count_values($mArray);	

	$parent_term = get_term_by('name', $mote['name'], $diph_tax_name);
	$parent_id = $parent_term->term_id;
	$args = array('parent' => $parent_id);
	//loop through terms and add to taxonomy
	foreach ($term_counts as $key=>$term) {
		$term_name = $key;
		//$args = array();		

		$term_id = term_exists( $term_name, $diph_tax_name );

		if($term_id) {	
			$old_parent = $term_id->parent;
			
			//wp_update_term( $term_id, $diph_tax_name );
			//clean_term_cache($parent_term->term_id, $diph_tax_name,true,true);
		}
		else {	
			//create a unique id by changing the name from an existing term. Error in WP causes terms with same name to share ID
			if(term_exists($term_name)) {
				$temp_term_name = $term_name . '_dup';
				wp_insert_term( $temp_term_name, $diph_tax_name, $args );
				//change name back
				$new_term_id = term_exists($temp_term_name);
				$temp_args = array('name'=>$term_name, 'slug'=>($term_name.' '.$diph_projectID));
				wp_update_term( $new_term_id, $diph_tax_name, $temp_args );
			}
			else {
				wp_insert_term( $term_name, $diph_tax_name, $args );
				//clean_term_cache($parent_term->term_id, $diph_tax_name,true,true);
			}
		}
		
	}	
	//clean_term_cache($parent_term->term_id, $diph_tax_name,true,true);
	$parent_terms_to_exclude = get_terms($diph_tax_name, 'parent=0&orderby=term_group&hide_empty=0');
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
	// if(($key = array_search($parent_id, $exclude_array)) !== false) {
 //     	unset($exclude_array[$key]);
	// }
	//delete_option("{$diph_tax_name}_children");
	$terms_loaded = get_terms($diph_tax_name, 'exclude_tree='.$exclude_string.'&orderby=term_group&hide_empty=0');
	//$terms = get_terms($diph_tax_name, array( 'orderby' => 'term_id' ) );
 	$t_count = count($terms_loaded);

 	//return wp tax id,name,count,order
 	//$diph_top_term = get_term_by('name', $term_name, $diph_tax_name);
 	if ( $t_count > 0 ){
   		foreach ( $terms_loaded as $term ) {
  	    	

  	    	$term_url = get_term_meta($term->term_id, 'icon_url', true);
			//$term .= '"icon_url" : "'.$term_url.'"';

			$term ->icon_url = $term_url;
  	    	//array_push($term, array('icon_url' => $term_url ));
		}
	}

	die(json_encode($terms_loaded));
	//die(json_encode($exclude_string));
}
add_action( 'wp_ajax_diphGetMoteValues', 'diphGetMoteValues' );

function diphGetMarkers(){

	$diph_project = $_POST['project'];
	$mArray = createMarkerArray($diph_project);
	
	die(json_encode($mArray));
}
//show on both front and backend
add_action( 'wp_ajax_diphGetMarkers', 'diphGetMarkers' );
add_action('wp_ajax_nopriv_diphGetMarkers', 'diphGetMarkers');

function diphGetTimeline(){

	$diph_project = $_POST['project'];
	$mArray = createTimelineArray($diph_project);
	
	die(json_encode($mArray));
}
//show on both front and backend
add_action( 'wp_ajax_diphGetTimeline', 'diphGetTimeline' );
add_action('wp_ajax_nopriv_diphGetTimeline', 'diphGetTimeline');

function getTranscriptClip($tran,$clip){

	$clipArray = split("-", $clip);
	$clipStart = strpos($tran, $clipArray[0]);
	$clipEnd = strpos($tran, $clipArray[1]);
	$clipLength = $clipEnd - $clipStart;

	$returnClip = substr($tran, $clipStart-1, $clipLength+13);
	return $returnClip;
}

function diphGetTranscript(){

	$diph_project = $_POST['project'];
	$diph_project_field = $_POST['transcript'];
	$diph_clip = $_POST['timecode'];
	$diph_tax_term = $_POST['tax_view'];
	$projectObj = get_post($diph_project);
	$diph_tax_name = 'diph_tax_'.$projectObj->post_name;

	$diph_settings = json_decode(get_post_meta( $diph_project, 'project_settings', true),true);
	foreach ($diph_settings['entry-points'] as $i => $ep) {
 	   if (array_key_exists('type', $ep) && $ep['type'] == 'transcript')
        $diph_settings_ep = $diph_settings['entry-points'][$i];
    	$diph_audio_mote = getMoteFromName($diph_settings,$diph_settings_ep['settings']['audio']);
		
	}



	$diph_transcript = get_post_meta( $diph_project, $diph_project_field, true);

	$diph_object;
	$diph_object['feed'] = json_decode(diph_get_group_feed($diph_tax_name,$diph_tax_term));
	$diph_object['settings'] = $diph_settings_ep;
	$diph_object['audio'] = $diph_settings_ep['settings']['audio'];
	$diph_object['transcript'] = $diph_transcript;
	
	if($diph_clip) {
		$diph_transcript_clip = getTranscriptClip($diph_transcript,$diph_clip);
		$diph_object['transcript'] = $diph_transcript_clip;
		die(json_encode($diph_object));
	}
	else {
		die(json_encode($diph_object));
	}

	
}
//show on both front and backend
add_action( 'wp_ajax_diphGetTranscript', 'diphGetTranscript' );
add_action('wp_ajax_nopriv_diphGetTranscript', 'diphGetTranscript');

function diphAddCustomField(){
	$diph_project = $_POST['project'];
	$diph_custom_field_name = $_POST['field_name'];
	$diph_custom_field_value = $_POST['field_value'];

	$args = array( 'post_type' => 'diph-markers', 'meta_key' => 'project_id','meta_value'=>$diph_project, 'posts_per_page' => -1 );
	$loop = new WP_Query( $args );
	while ( $loop->have_posts() ) : $loop->the_post();

		$marker_id = get_the_ID();
		add_post_meta($marker_id, $diph_custom_field_name, $diph_custom_field_value, true);
				
	endwhile;
	
	die();
}
add_action( 'wp_ajax_diphAddCustomField', 'diphAddCustomField' );
function diphFindReplaceCustomField(){
	$diph_project = $_POST['project'];
	$diph_custom_field_name = $_POST['field_name'];
	$diph_custom_find_value = $_POST['find_value'];
	$diph_custom_replace_value = $_POST['replace_value'];

	$args = array( 'post_type' => 'diph-markers', 'meta_key' => 'project_id','meta_value'=>$diph_project, 'posts_per_page' => -1 );
	$loop = new WP_Query( $args );
	$diph_count=0;
	while ( $loop->have_posts() ) : $loop->the_post();
		$diph_count++;
		$marker_id = get_the_ID();
		$temp_value = get_post_meta($marker_id,$diph_custom_field_name);
		$new_value = str_replace($diph_custom_find_value,$diph_custom_replace_value,$temp_value[0]);
		update_post_meta($marker_id, $diph_custom_field_name, $new_value);
		//add_post_meta($marker_id, $diph_custom_field_name, $diph_custom_field_value, true);
				
	endwhile;
	
	die($diph_count);
}
add_action( 'wp_ajax_diphFindReplaceCustomField', 'diphFindReplaceCustomField' );

function diphDeleteCustomField(){
	$diph_project = $_POST['project'];
	$diph_custom_field_name = $_POST['field_name'];
	
	$args = array( 'post_type' => 'diph-markers', 'meta_key' => 'project_id','meta_value'=>$diph_project, 'posts_per_page' => -1 );
	$loop = new WP_Query( $args );
	while ( $loop->have_posts() ) : $loop->the_post();

		$marker_id = get_the_ID();
		delete_post_meta($marker_id, $diph_custom_field_name);
		//add_post_meta($marker_id, $diph_custom_field_name, $diph_custom_field_value, true);
				
	endwhile;
	
	die();
}
add_action( 'wp_ajax_diphDeleteCustomField', 'diphDeleteCustomField' );


function diphCreateTaxTerms(){
	$mote_parent = $_POST['mote_name'];
	$diph_projectID = $_POST['project'];
	$diph_project_terms = str_replace('\\', '', $_POST['terms']);
	$diph_project_terms = json_decode($diph_project_terms);
	
	$diph_project = get_post($diph_projectID);
	$diph_project_slug = $diph_project->post_name;
	$diph_tax_name = 'diph_tax_'.$diph_project_slug;

	$mote_parent_id = term_exists( $mote_parent, $diph_tax_name );
	$meta_key = 'icon_url';
	

	$testArray = array();
	array_push($testArray, 'here');
	foreach ($diph_project_terms as $term) {
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

		if(term_exists( $term_name, $diph_tax_name )) {
					
			wp_update_term( $term_id, $diph_tax_name, $args );
			//add_term_meta($term_id, $meta_key, $meta_value)
			update_term_meta($term_id, $meta_key, $meta_value);
		}
		else {
			wp_insert_term( $term_name, $diph_tax_name, $args );
			add_term_meta($term_id, $meta_key, $meta_value, true);
			update_term_meta($term_id, $meta_key, $meta_value);
		}
		array_push($testArray, $meta_value);
	}
	
	die(json_encode($testArray));
}
add_action( 'wp_ajax_diphCreateTaxTerms', 'diphCreateTaxTerms' );

function diphDeleteTerms(){
	$diph_projectID = $_POST['project'];
	$diph_term_name = $_POST['term_name'];
	$diph_project = get_post($diph_projectID);
	$diph_project_slug = $diph_project->post_name;
	
	$diph_tax = 'diph_tax_'.$diph_project_slug;
	//get term id, get children term ids
	$diph_delete_parent_term = get_term_by('name',$diph_term_name,$diph_tax);
	$diph_delete_parent_id = $diph_delete_parent_term->term_id;
	$diph_delete_children = get_term_children($diph_delete_parent_id,$diph_tax);
	foreach ($diph_delete_children as $delete_term) {
		wp_delete_term($delete_term, $diph_tax);
	}
	wp_delete_term($diph_delete_parent_id, $diph_tax);
	
	
	die(json_encode($diph_delete_children));
}
add_action( 'wp_ajax_diphDeleteTerms', 'diphDeleteTerms' );

//getTaxObject()


// Restore revision
function diph_project_restore_revision( $post_id, $revision_id ) {
	global $diph_project_settings_fields;
	$post     = get_post( $post_id );
	$revision = get_post( $revision_id );
	foreach ($diph_project_settings_fields as $field) {
			$old = get_metadata( 'post', $revision->ID, $field['id'], true);
			if ( false !== $old) {
				update_post_meta($post_id, $field['id'], $old);
			} else {
				delete_post_meta($post_id, $field['id'] );
			}
		} // end foreach
}
add_action( 'wp_restore_post_revision', 'diph_project_restore_revision', 10, 2 );


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
function diph_get_type_settings($type,$object) {
	foreach($object as $eps) {
		//var $ec = $eps.type;
		if($eps['type'] == $type){
			return $eps['settings'];
		}
		//return $ec;
	}
}
function diph_get_map_type($type,$object) {
	foreach($object as $layer) {
		//var $ec = $eps.type;
		//return $layer['id'];
		if($layer['mapType'] == $type){
			$map_id = get_post_meta($layer['id'],'diph_map_typeid');
			return $map_id[0];
		}
		//return $ec;
	}
}

// Custom scripts to be run on Project new/edit pages only
function add_diph_project_admin_scripts( $hook ) {

    global $post;
    global $layers_global;
    $blog_id = get_current_blog_id();
	$dev_url = get_admin_url( $blog_id ,'admin-ajax.php');

    if ( $hook == 'post-new.php' || $hook == 'post.php' ) {
        if ( 'project' === $post->post_type ) {    
        $tempLayers = 'layers '.$layers_global; 
			//wp_register_style( 'ol-style', plugins_url('/js/OpenLayers/theme/default/style.css',  dirname(__FILE__) ));
			//wp_enqueue_style( 'ol-map', plugins_url('/css/ol-map.css',  dirname(__FILE__) ));
			
			wp_enqueue_style( 'diph-sortable-style', plugins_url('/css/sortable.css',  dirname(__FILE__) ));
			wp_enqueue_style( 'diph-bootstrap-style', plugins_url('/lib/bootstrap/css/bootstrap.min.css',  dirname(__FILE__) ));
			wp_enqueue_style( 'diph-bootstrap-responsive-style', plugins_url('/lib/bootstrap/css/bootstrap-responsive.min.css',  dirname(__FILE__) ));
			wp_enqueue_style( 'diph-jquery-ui-style', 'http://code.jquery.com/ui/1.10.2/themes/smoothness/jquery-ui.css');
			wp_enqueue_style( 'diph-font-awesome', plugins_url('/lib/font-awesome/css/font-awesome.min.css',  dirname(__FILE__) ));
			//wp_enqueue_style( 'diph-bootstrap-slider-style', plugins_url('/lib/bootstrap/css/slider.css',  dirname(__FILE__) ));
			wp_enqueue_style( 'diph-style', plugins_url('/css/diph-style.css',  dirname(__FILE__) ));
			
			wp_enqueue_script( 'jquery' );
			wp_enqueue_script( 'jquery-ui' );
			wp_enqueue_script(  'diph-jquery-ui', plugins_url('/lib/jquery-ui-1.9.2.custom.min.js', dirname(__FILE__) ));
	 		wp_enqueue_script( 'jquery-ui-slider' );
			wp_enqueue_script(  'diph-bootstrap', plugins_url('/lib/bootstrap/js/bootstrap.min.js', dirname(__FILE__) ),'jquery');
			//wp_enqueue_script(  'bootstrap-button-fix', plugins_url('/lib/bootstrap/js/bootstrap-button-fix.js', dirname(__FILE__) ),'diph-bootstrap');
			//wp_enqueue_script(  'diph-bootstrap-slider', plugins_url('/lib/bootstrap/js/bootstrap-slider.js', dirname(__FILE__) ),'diph-bootstrap');
           	
			wp_enqueue_script(  'diph-touch-punch', plugins_url('/lib/jquery.ui.touch-punch.js', dirname(__FILE__) ));
            wp_enqueue_script( 'open-layers', plugins_url('/js/OpenLayers/OpenLayers.js', dirname(__FILE__) ));
        
             //wp_enqueue_script(  'open-layers', plugins_url('/js/OpenLayers/OpenLayers.js', dirname(__FILE__) ));
			wp_enqueue_script(  'diph-nested-sortable', plugins_url('/lib/jquery.mjs.nestedSortable.js', dirname(__FILE__) ));
			wp_enqueue_style( 'diph-jPicker-style1', plugins_url('/js/jpicker/css/jPicker-1.1.6.min.css',  dirname(__FILE__) ));
			wp_enqueue_style( 'diph-jPicker-style2', plugins_url('/js/jpicker/jPicker.css',  dirname(__FILE__) ));
			wp_enqueue_script(  'diph-jPicker', plugins_url('/js/jpicker/jpicker-1.1.6.js', dirname(__FILE__) ));

			wp_enqueue_script(  'diph-project-script', plugins_url('/js/diph-project-admin.js', dirname(__FILE__) ));
			wp_localize_script( 'diph-project-script', 'diphDataLib', array(
				'ajax_url' => __($dev_url, 'diph'),
				'layers' => __($tempLayers, 'diph')
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
			 wp_enqueue_script(  'diph-project-script2', plugins_url('/js/diph-project-admin2.js', dirname(__FILE__) ));
			 
        }
    }
}
add_action( 'admin_enqueue_scripts', 'add_diph_project_admin_scripts', 10, 1 );


function diph_register_maps($mapObject){
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
			$map_id = get_post_meta($layer['id'],'diph_map_typeid',true);
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
function diph_page_template( $page_template )
{
	global $post;
	$blog_id = get_current_blog_id();
	$dev_url = get_admin_url( $blog_id ,'admin-ajax.php');
	$post_type = get_query_var('post_type');
    if ( $post_type == 'project' ) {
    	$projectSettings_get = get_post_meta($post->ID, 'project_settings');
    	$projectSettings = json_decode($projectSettings_get[0],true);
    	$projectSettings_map = diph_get_type_settings('map',$projectSettings['entry-points']);

    	//if map type is cdla get id
    	$projectSettings_map_cdla = diph_get_map_type('type-CDLA',$projectSettings_map['layers']);

		diph_register_maps($projectSettings_map['layers']);

    	wp_register_script(
				'cdlaMaps',
				'http://docsouth.unc.edu/cdlamaps/api/OASIS',
				array( 'open-layers' ),
				false,
				true
			);	
    	
        $page_template = dirname( __FILE__ ) . '/diph-project-template.php';

		wp_enqueue_style( 'diph-bootstrap-style', plugins_url('/lib/bootstrap/css/bootstrap.min.css',  dirname(__FILE__) ));
		wp_enqueue_style( 'diph-bootstrap-responsive-style', plugins_url('/lib/bootstrap/css/bootstrap-responsive.min.css',  dirname(__FILE__) ));
        wp_enqueue_style( 'diph-font-awesome', plugins_url('/lib/font-awesome/css/font-awesome.min.css',  dirname(__FILE__) ));
        wp_enqueue_style( 'diph-jquery-ui-style', 'http://code.jquery.com/ui/1.10.2/themes/smoothness/jquery-ui.css');
		wp_enqueue_style( 'ol-map', plugins_url('/css/ol-map.css',  dirname(__FILE__) ));
			
		wp_enqueue_script('jquery');
		wp_enqueue_script( 'jquery-ui' );
		wp_enqueue_script(  'diph-jquery-ui', plugins_url('/lib/jquery-ui-1.9.2.custom.min.js', dirname(__FILE__) ));
 		wp_enqueue_script( 'jquery-ui-slider' );
			
		wp_enqueue_script( 'diph-bootstrap', plugins_url('/lib/bootstrap/js/bootstrap.min.js', dirname(__FILE__) ),'jquery');
			
		wp_enqueue_script( 'mediaelement', plugins_url('/js/mediaelement/mediaelement-and-player.min.js', dirname(__FILE__),array('jquery') ));
		wp_enqueue_script( 'jwplayer', plugins_url('/js/jwplayer/jwplayer.js', dirname(__FILE__),array('jquery') ));
		//wp_enqueue_script( 'audiojs', plugins_url('/js/audiojs/audio.min.js', dirname(__FILE__) ));

		wp_enqueue_script('backbone');
		wp_enqueue_script('underscore');
		//wp_enqueue_script( 'open-layers', 'http://dev.openlayers.org/releases/OpenLayers-2.12/lib/OpenLayers.js' );
    	wp_enqueue_script( 'open-layers', plugins_url('/js/OpenLayers/OpenLayers.js', dirname(__FILE__) ));
    	wp_enqueue_script( 'diph-google-map-script', 'http'. ( is_ssl() ? 's' : '' ) .'://maps.google.com/maps/api/js?v=3&amp;sensor=false');
        
    	wp_enqueue_script( 'cdlaMaps' );

    	if($projectSettings_map_cdla) {
    		//wp_enqueue_script( 'cdla-layer-data' );
    	}

        wp_enqueue_script( 'timeline-js', plugins_url('/js/storyjs-embed.js', dirname(__FILE__) ));
       
		wp_enqueue_style('mediaelement', plugins_url('/js/mediaelement/mediaelementplayer.css',  dirname(__FILE__) ));
		wp_enqueue_style('thickbox');
		wp_enqueue_script('thickbox');
		wp_enqueue_script( 'diph-public-project-script', plugins_url('/js/diph-project-page.js', dirname(__FILE__) ),'mediaelement');
		 
		wp_localize_script( 'diph-public-project-script', 'diphData', array(
			'ajax_url' => __($dev_url, 'diph'),
			'settings' => __($projectSettings_get[0], 'diph'),
			'map' => __($projectSettings_map, 'diph'),
			'layers' => __($projectSettings_map['layers'], 'diph')
		) );
    }
    return $page_template;
}
add_filter( 'single_template', 'diph_page_template' );



// Set template to be used for top level custom taxonomy term
function diph_tax_template( $page_template )
{
	$blog_id = get_current_blog_id();
	$dev_url = get_admin_url( $blog_id ,'admin-ajax.php');
	if( is_tax() ) {
    global $wp_query;
    $term = $wp_query->get_queried_object();
    $title = $term->taxonomy;
    $term_parent = get_term($term->parent, $title);
    $term->parent_name = $term_parent->name;
    //get mp3 url from first term marker
    //get transcript url
    $pieces = explode("diph_tax_", $title);
    $projectID = get_page_by_path($pieces[1],OBJECT,'project');
    $project_settings = get_post_meta($projectID->ID,'project_settings',true);
	
	wp_enqueue_style('mediaelement', plugins_url('/js/mediaelement/mediaelementplayer.css',  dirname(__FILE__) ));
	wp_enqueue_style( 'diph-bootstrap-style', plugins_url('/lib/bootstrap/css/bootstrap.min.css',  dirname(__FILE__) ));
	wp_enqueue_style( 'diph-bootstrap-responsive-style', plugins_url('/lib/bootstrap/css/bootstrap-responsive.min.css',  dirname(__FILE__) ));
    wp_enqueue_style( 'diph-font-awesome', plugins_url('/lib/font-awesome/css/font-awesome.min.css',  dirname(__FILE__) ));
    wp_enqueue_style( 'ol-map', plugins_url('/css/ol-map.css',  dirname(__FILE__) ));
	//map reqs	
    wp_enqueue_script( 'open-layers', plugins_url('/js/OpenLayers/OpenLayers.js', dirname(__FILE__) ));
    wp_enqueue_script( 'cdlaMaps' );
	if($projectSettings_map_cdla) {
    	wp_enqueue_script( 'cdla-layer-data' );
    }
	//$projectSettings_get = get_post_meta($post->ID, 'project_settings');
	
	wp_enqueue_script( 'jquery' );
	wp_enqueue_script( 'diph-bootstrap', plugins_url('/lib/bootstrap/js/bootstrap.min.js', dirname(__FILE__) ),'jquery');		
	wp_enqueue_script( 'backbone' );
	wp_enqueue_script( 'underscore' );
	wp_enqueue_script( 'mediaelement', plugins_url('/js/mediaelement/mediaelement-and-player.min.js', dirname(__FILE__),array('jquery') ));
		
	wp_enqueue_script( 'diph-tax-script', plugins_url('/js/diph-tax-template.js', dirname(__FILE__) ),'mediaelement');
			
	wp_localize_script( 'diph-tax-script', 'diphData', array(
			'project_id' => __($projectID->ID,'diph'),
			'ajax_url' => __($dev_url, 'diph'),
			'tax' => __($term,'diph'),
			'project' => __($project_settings)
			
		) );
	}
	return $page_template;
}
add_filter( 'archive_template', 'diph_tax_template' );
/**
 * Deploy the icons list to select one
 */
function diph_deploy_icons(){ 
	
	
	$icon_path = DIPH_PLUGIN_URL.'/images/icons/';
	$icon_dir = DIPH_PLUGIN_DIR.'/images/icons/';	
	
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
          	   
		<div id="diph_icon_cont">
        	
		<?php $i = 1; foreach ($icons_array as $icon){ ?>
		  <div class="diph_icon" id="icon_<?php echo $i;?>">
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
    $arrImages =& get_children('post_type=attachment&post_mime_type=image&numberpost=-1&post_parent=' . $iPostID );
 
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