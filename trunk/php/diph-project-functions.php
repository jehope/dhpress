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
    'supports' => array( 'title', 'author', 'thumbnail', 'excerpt', 'comments','revisions' )
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
            wp_enqueue_script(  'diph-project-script', plugins_url('/js/diph-project-admin.js', dirname(__FILE__) ));
        }
    }
}
add_action( 'admin_enqueue_scripts', 'add_diph_project_admin_scripts', 10, 1 );

// Add the Meta Box
function add_diph_project_settings_box() {
    add_meta_box(
		'custom_meta_box', // $id
		'Project Details', // $title
		'show_diph_project_settings_box', // $callback
		'project', // $page
		'normal', // $context
		'high'); // $priority
}
add_action('add_meta_boxes', 'add_diph_project_settings_box');
// Field Array
$prefix = 'project_';
$diph_project_settings_fields = array(
	array(
		'label'=> 'Show as Slider',
		'desc'	=> 'Check here to display post in slider format. Assign images that are 1000px x 500px in the Slide Image boxes to the right.',
		'id'	=> $prefix.'true',
		'type'	=> 'checkbox'
	),
	array(
		'label'=> 'Project Date',
		'desc'	=> 'Date of project.',
		'id'	=> $prefix.'date',
		'type'	=> 'text'
	),
	array(
		'label'=> 'Project Type',
		'desc'	=> 'Type of project.',
		'id'	=> $prefix.'type',
		'type'	=> 'text'
	),
	array(
		'label'=> 'Client Name',
		'desc'	=> 'Name of client.',
		'id'	=> $prefix.'client',
		'type'	=> 'text'
	),
	array(
		'label'=> 'Website',
		'desc'	=> 'URL for website.',
		'id'	=> $prefix.'weblink',
		'type'	=> 'text'
	),
	array(
		'label'=> 'Profile Image',
		'desc'	=> 'Put url of image here. No html code required.',
		'id'	=> $prefix.'profile',
		'type'	=> 'text'
	),
	array(
		'label'=> 'Project Description',
		'desc'	=> 'A description of the project.',
		'id'	=> $prefix.'desc',
		'type'	=> 'textarea'
	),array(
		'label'=> 'Previous Project Link',
		'desc'	=> 'Url to previous project.',
		'id'	=> $prefix.'prev_link',
		'type'	=> 'text'
	),array(
		'label'=> 'Previous Link Text',
		'desc'	=> 'Previous text to display below slider.',
		'id'	=> $prefix.'prevtext_link',
		'type'	=> 'text'
	),array(
		'label'=> 'Next Project Link',
		'desc'	=> 'Url to next project.',
		'id'	=> $prefix.'next_link',
		'type'	=> 'text'
	),array(
		'label'=> 'Next Link Text',
		'desc'	=> 'Next text to display below slider.',
		'id'	=> $prefix.'nexttext_link',
		'type'	=> 'text'
	)
);
// The Callback
function show_diph_project_settings_box() {
global $diph_project_settings_fields, $post;
// Use nonce for verification
echo '<input type="hidden" name="diph_project_settings_box_nonce" value="'.wp_create_nonce(basename(__FILE__)).'" />';

	// Begin the field table and loop
	echo '<table class="form-table">';
	foreach ($diph_project_settings_fields as $field) {
		// get value of this field if it exists for this post
		$meta = get_post_meta($post->ID, $field['id'], true);
		// begin a table row with
		echo '<tr>
				<th><label for="'.$field['id'].'">'.$field['label'].'</label></th>
				<td>';
				switch($field['type']) {
					// case items will go here
					// text
					case 'text':
						echo '<input type="text" name="'.$field['id'].'" id="'.$field['id'].'" value="'.$meta.'" size="30" />
							<br /><span class="description">'.$field['desc'].'</span>';
					break;
					// textarea
					case 'textarea':
						echo '<textarea name="'.$field['id'].'" id="'.$field['id'].'" cols="60" rows="4">'.$meta.'</textarea>
							<br /><span class="description">'.$field['desc'].'</span>';
					break;
					// checkbox
					case 'checkbox':
						echo '<input type="checkbox" name="'.$field['id'].'" id="'.$field['id'].'" ',$meta ? ' checked="checked"' : '','/>
							<label for="'.$field['id'].'">'.$field['desc'].'</label>';
					break;
					// select
					case 'select':
						echo '<select name="'.$field['id'].'" id="'.$field['id'].'">';
						foreach ($field['options'] as $option) {
							echo '<option', $meta == $option['value'] ? ' selected="selected"' : '', ' value="'.$option['value'].'">'.$option['label'].'</option>';
						}
						echo '</select><br /><span class="description">'.$field['desc'].'</span>';
					break;
				} //end switch
		echo '</td></tr>';
	} // end foreach
	echo '</table>'; // end table
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