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
    'rewrite' => array('slug' => 'projects','with_front' => FALSE),
    'capability_type' => 'page',
    'has_archive' => true, 
    'hierarchical' => true,
    'menu_position' => null,
    'supports' => array( 'title', 'author', 'thumbnail', 'excerpt', 'comments','revisions', 'custom-fields' )
  ); 
  register_post_type('project',$args);
}
add_action( 'init', 'diph_project_init' );

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

// Custom scripts to be run on Project new/edit pages only
function add_diph_project_admin_scripts( $hook ) {

    global $post;

    if ( $hook == 'post-new.php' || $hook == 'post.php' ) {
        if ( 'project' === $post->post_type ) {     
			//wp_register_style( 'ol-style', plugins_url('/js/OpenLayers/theme/default/style.css',  dirname(__FILE__) ));
			wp_enqueue_style( 'ol-map', plugins_url('/css/ol-map.css',  dirname(__FILE__) ));
			wp_enqueue_style( 'diph-style', plugins_url('/css/diph-style.css',  dirname(__FILE__) ));
			wp_enqueue_script(  'jquery' );
             //wp_enqueue_script(  'open-layers', plugins_url('/js/OpenLayers/OpenLayers.js', dirname(__FILE__) ));
			 wp_enqueue_script(  'diph-project-script', plugins_url('/js/diph-project-admin.js', dirname(__FILE__) ));
			 wp_enqueue_style('thickbox');
wp_enqueue_script('thickbox');
        }
    }
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
	diph_deploy_icons();
}
// The Callback
function show_diph_project_settings_box() {

global $diph_project_settings_fields, $post;
// Use nonce for verification
echo '<input type="hidden" name="diph_project_settings_box_nonce" value="'.wp_create_nonce(basename(__FILE__)).'" />';
	//echo '<div id="map-divs"></div><button id="locate">Locate me!</button>';

	// Begin the field table and loop
	echo '<table class="form-table">';
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
	
	$motes = createMoteValueArrays('Concepts','4233');
	print_r(array_count_values($motes));
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
function createMoteValueArrays($mote_name,$project_id){

	//loop through all markers in project -add to array
	$moteArray = array();
	
	$args = array( 'post_type' => 'diph-markers', 'meta_key' => 'marker_project','meta_value'=>$project_id, 'posts_per_page' => -1 );
	$loop = new WP_Query( $args );
	while ( $loop->have_posts() ) : $loop->the_post();

		$marker_id = get_the_ID();
		$tempMoteValue = get_post_meta($marker_id,$mote_name);
		$tempMoteArray = split(';',$tempMoteValue[0]);

		//array_push($moteArray,$tempMoteValue[0]); 
		//array_push($moteArray,$tempMoteArray.length); 
		for($i=0;$i<count($tempMoteArray);$i++) {
			array_push($moteArray, trim($tempMoteArray[$i]));
		}
		
		
	endwhile;

	 //$result = array_unique($array)
	return $moteArray;
}
function diphGetMoteValues(){
$mote_values = array();
	$mote_name = $_POST['mote_name'];
	$diph_project = $_POST['project'];
	$mArray = createMoteValueArrays($mote_name,$diph_project);
	$counts = array_count_values($mArray);
	$result = array_unique($mArray);
	array_push($mote_values, $counts);
	array_push($mote_values, $result);
	die(json_encode($mote_values));
}
add_action( 'wp_ajax_diphGetMoteValues', 'diphGetMoteValues' );

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

// Set template to be used for Project type
function diph_page_template( $page_template )
{
	
	$post_type = get_query_var('post_type');
    if ( $post_type == 'project' ) {
        $page_template = dirname( __FILE__ ) . '/diph-project-template.php';
    }
    return $page_template;
}
add_filter( 'single_template', 'diph_page_template' );

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
