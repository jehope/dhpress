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
    'supports' => array( 'title', 'editor', 'author', 'thumbnail', 'excerpt', 'comments', 'revisions' )
  ); 
  register_post_type('diph-markers',$args);
}
add_action( 'init', 'diph_marker_init' );

// Custom scripts to be run on Project new/edit pages only
function add_diph_marker_admin_scripts( $hook ) {

    global $post;

    if ( $hook == 'post-new.php' || $hook == 'post.php' ) {
        if ( 'diph-markers' === $post->post_type ) {     
			//wp_register_style( 'ol-style', plugins_url('/js/OpenLayers/theme/default/style.css',  dirname(__FILE__) ));
			wp_enqueue_style( 'ol-map', plugins_url('/css/ol-map.css',  dirname(__FILE__) ));
			wp_enqueue_script(  'jquery' );
             //wp_enqueue_script(  'open-layers', plugins_url('/js/OpenLayers/OpenLayers.js', dirname(__FILE__) ));
			 wp_enqueue_script(  'diph-marker-script', plugins_url('/js/diph-marker-admin.js', dirname(__FILE__) ));
			 
        }
    }
}
add_action( 'admin_enqueue_scripts', 'add_diph_marker_admin_scripts', 10, 1 );
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

/*
Sorts an array based on a specific key
Courtesy of http://php.net/manual/en/function.sort.php
*/
function diph_array_sort($array, $on, $order=SORT_ASC)
{
    $new_array = array();
    $sortable_array = array();

    if (count($array) > 0) {
        foreach ($array as $k => $v) {
            if (is_array($v)) {
                foreach ($v as $k2 => $v2) {
                    if ($k2 == $on) {
                        $sortable_array[$k] = $v2;
                    }
                }
            } else {
                $sortable_array[$k] = $v;
            }
        }

        switch ($order) {
            case SORT_ASC:
                asort($sortable_array);
            break;
            case SORT_DESC:
                arsort($sortable_array);
            break;
        }

        foreach ($sortable_array as $k => $v) {
            $new_array[$k] = $array[$k];
        }
    }

    return $new_array;
}

function diph_get_projects() {

	// I'm assuming that project titles will have already been trimmed, so I haven't included code to deal with that.  I can if you want.
	global $wpdb;

	$args = array( 
		'post_type' => 'project',
		'post_status' => 'publish'
	);
	
	// Get array of all projects (as post objects)
	$projects_query = get_posts ( $args );
	
	$projects_array = array();

	foreach( $projects_query as $project ) {
		$this_project = array(
			'value' => $project->ID,
			'label' => $project->post_title
		);
	
		array_push( $projects_array, $this_project );
	}
	
	$projects_array = diph_array_sort( $projects_array, 'label' );
	return $projects_array;
	
}

// an array of arrays containing 'value' and 'label' for each project
$projects = diph_get_projects();

// Add the Meta Box
function add_diph_marker_settings_box() {
    add_meta_box(
		'diph_marker_settings_meta_box', 		// $id
		'Marker Settings', 						// $title
		'show_diph_marker_settings_box', 		// $callback
		'diph-markers', 						// $page
		'normal',								// $context
		'high'); 								// $priority
}
add_action('add_meta_boxes', 'add_diph_marker_settings_box');
// Field Array
$prefix = 'marker_';
$diph_marker_settings_fields = array(
	array(
		'label'=> 'Associated Project',
		'desc'	=> 'Select which project this marker should belong to.',
		'id'	=> $prefix .'project',
		'type'	=> 'select',
		'options' => $projects
		)
);
// The Callback
function show_diph_marker_settings_box() {
global $diph_marker_settings_fields, $post;
// Use nonce for verification
echo '<input type="hidden" name="diph_marker_settings_box_nonce" value="'.wp_create_nonce(basename(__FILE__)).'" />';

	// Begin the field table and loop
	echo '<table class="form-table">';
	foreach ($diph_marker_settings_fields as $field) {
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
function save_diph_marker_settings($post_id) {
    global $diph_marker_settings_fields;
	$parent_id = wp_is_post_revision( $post_id );
	
	// verify nonce
	if (!wp_verify_nonce($_POST['diph_marker_settings_box_nonce'], basename(__FILE__)))
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
		
		foreach ($diph_marker_settings_fields as $field) {
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
		foreach ($diph_marker_settings_fields as $field) {
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
add_action('save_post', 'save_diph_marker_settings');  

// Restore revision
function diph_marker_restore_revision( $post_id, $revision_id ) {
	global $diph_marker_settings_fields;
	$post     = get_post( $post_id );
	$revision = get_post( $revision_id );
	foreach ($diph_marker_settings_fields as $field) {
			$old = get_metadata( 'post', $revision->ID, $field['id'], true);
			if ( false !== $old) {
				update_post_meta($post_id, $field['id'], $old);
			} else {
				delete_post_meta($post_id, $field['id'] );
			}
		} // end foreach
}
add_action( 'wp_restore_post_revision', 'diph_marker_restore_revision', 10, 2 );