<?php 

/**
	 * Registers and handles diPH Marker functions
	 *
	 * @package diPH Toolkit
	 * @author diPH Team
	 * @link http://diph.org/download/
	 */

function diph_marker_init() {
  $labels = array(
    'name' => _x('Markers', 'post type general name'),
    'singular_name' => _x('Marker', 'post type singular name'),
    'add_new' => _x('Add New', 'diph-markers'),
    'add_new_item' => __('Add New Marker'),
    'edit_item' => __('Edit Marker'),
    'new_item' => __('New Marker'),
    'all_items' => __('Markers'),
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

//add filter to ensure the text Marker, or marker, is displayed when user updates a marker
function diph_marker_updated_messages( $messages ) {
  global $post, $post_ID;

  $messages['diph-markers'] = array(
    0 => '', // Unused. Messages start at index 1.
    1 => sprintf( __('Marker updated. <a href="%s">View marker</a>'), esc_url( get_permalink($post_ID) ) ),
    2 => __('Custom field updated.'),
    3 => __('Custom field deleted.'),
    4 => __('Marker updated.'),
    /* translators: %s: date and time of the revision */
    5 => isset($_GET['revision']) ? sprintf( __('Marker restored to revision from %s'), wp_post_revision_title( (int) $_GET['revision'], false ) ) : false,
    6 => sprintf( __('Marker published. <a href="%s">View marker</a>'), esc_url( get_permalink($post_ID) ) ),
    7 => __('Marker saved.'),
    8 => sprintf( __('Marker submitted. <a target="_blank" href="%s">Preview marker</a>'), esc_url( add_query_arg( 'preview', 'true', get_permalink($post_ID) ) ) ),
    9 => sprintf( __('Marker scheduled for: <strong>%1$s</strong>. <a target="_blank" href="%2$s">Preview marker</a>'),
      // translators: Publish box date format, see http://php.net/date
      date_i18n( __( 'M j, Y @ G:i' ), strtotime( $post->post_date ) ), esc_url( get_permalink($post_ID) ) ),
    10 => sprintf( __('Marker draft updated. <a target="_blank" href="%s">Preview marker</a>'), esc_url( add_query_arg( 'preview', 'true', get_permalink($post_ID) ) ) ),
  );

  return $messages;
}
add_filter( 'post_updated_messages', 'diph_marker_updated_messages' );

// Add the Meta Box
function add_custom_meta_box() {
    add_meta_box(
		'custom_meta_box', // $id
		'Slider Content', // $title
		'show_custom_meta_box', // $callback
		'post', // $page
		'normal', // $context
		'high'); // $priority
}
add_action('add_meta_boxes', 'add_custom_meta_box');
// Field Array
$prefix = 'marker_';
$custom_meta_fields = array(
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
function show_custom_meta_box() {
global $custom_meta_fields, $post;
// Use nonce for verification
echo '<input type="hidden" name="custom_meta_box_nonce" value="'.wp_create_nonce(basename(__FILE__)).'" />';

	// Begin the field table and loop
	echo '<table class="form-table">';
	foreach ($custom_meta_fields as $field) {
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
function save_custom_meta($post_id) {
    global $custom_meta_fields;

	// verify nonce
	if (!wp_verify_nonce($_POST['custom_meta_box_nonce'], basename(__FILE__)))
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

	// loop through fields and save the data
	foreach ($custom_meta_fields as $field) {
		$old = get_post_meta($post_id, $field['id'], true);
		$new = $_POST[$field['id']];
		if ($new && $new != $old) {
			update_post_meta($post_id, $field['id'], $new);
		} elseif ('' == $new && $old) {
			delete_post_meta($post_id, $field['id'], $old);
		}
	} // end foreach
}
add_action('save_post', 'save_custom_meta');  