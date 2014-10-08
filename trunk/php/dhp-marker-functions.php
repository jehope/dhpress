<?php 

/**
	 * Registers and handles DHPress Marker functions
	 *	(i.e., posts representing a single data point)
	 *
     * @package DHPress Toolkit
     * @author DHPress Team
     * @link http://dhpress.org/download/
	 */

// ====================== Global Variables ==========================

	// GUI components added to Marker Settings box in Edit Marker admin panel
$dhp_marker_settings_fields = array(
	array(
		'label'=> 'Associated Project',
		'desc'	=> 'Select Project to which this marker should belong',
		'id'	=> 'project_id',
		'type'	=> 'select',
		'options' => dhp_get_projects()
		)
);

// ====================== Init Functions ==========================

add_action( 'init', 'dhp_marker_init' );

// PURPOSE: To create custom post type for Markers in WP
// NOTES:   This is called by dhp_marker_activate(), which only expects it to register CPT

function dhp_marker_init()
{
  $labels = array(
    'name' => _x('Markers', 'post type general name'),
    'singular_name' => _x('Marker', 'post type singular name'),
    'add_new' => _x('Add New', 'dhp-markers'),
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
    'show_in_menu' => 'dhp-top-level-handle', 
    'query_var' => true,
    'rewrite' => true,
    'capability_type' => 'post',
    'has_archive' => true, 
    'hierarchical' => false,
    'menu_position' => null,
    'supports' => array( 'title', 'editor', 'author', 'thumbnail', 'excerpt', 'comments', 'revisions','custom-fields' )
  ); 
  register_post_type('dhp-markers',$args);
} // dhp_marker_init()


register_activation_hook( __FILE__, 'dhp_markers_activate');

// PURPOSE: Ensure that custom post types have been registered before we flush rewrite rules
//          See http://solislab.com/blog/plugin-activation-checklist/#flush-rewrite-rules
function dhp_markers_activate()
{
    dhp_marker_init();
    flush_rewrite_rules();
}


add_action( 'admin_enqueue_scripts', 'add_dhp_marker_admin_scripts', 10, 1 );

// PURPOSE: Prepare CSS and JS files for this page
// INPUT:	$hook is file path to template page for this page
// ASSUMES:	WP global variables set to current post & context

function add_dhp_marker_admin_scripts( $hook )
{
    global $post;

	$blog_id = get_current_blog_id();
	$dev_url = get_admin_url( $blog_id ,'admin-ajax.php');

        // Save global post info to restore later
    $savePost = $post;

 		// Editing a specific Marker in admin panel
    if ( $hook == 'post-new.php' || $hook == 'post.php' )
    {
        if ( $post->post_type === 'dhp-markers' ) {
                // Grab marker info before it gets reset
            $markerID = $post->ID;

            $project_id = get_post_meta( $post->ID, 'project_id', true );
            $projObj = new DHPressProject($project_id);

                // We need list of custom fields, but this query resets global variables
            $custom_fields = $projObj->getAllCustomFieldNames();
                // Try resetting global post vars
            $post = $savePost;

			wp_enqueue_style('dhp-admin', plugins_url('/css/dhp-admin.css',  dirname(__FILE__) ));
			wp_enqueue_script('jquery');

			wp_enqueue_script('dhp-marker-script', plugins_url('/js/dhp-marker-admin.js', dirname(__FILE__) ));
			wp_localize_script('dhp-marker-script', 'dhpDataLib', array(
				'ajax_url' => $dev_url,
                'projectID' => $project_id,
                'markerID' => $markerID,
                'customFields' => $custom_fields
			) );
        }

        // Shows list of all Markers in admin panel
    } else if ( $hook == 'edit.php'  ) {
        if ($post->post_type === 'dhp-markers') {
			wp_enqueue_script('jquery');
        }
    }
} // add_dhp_marker_admin_scripts()


add_filter( 'post_updated_messages', 'dhp_marker_updated_messages' );

// PURPOSE: Ensure the text Marker is displayed when user updates a marker

function dhp_marker_updated_messages( $messages )
{
  global $post, $post_ID;

  $messages['dhp-markers'] = array(
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
} // dhp_marker_updated_messages()

// PURPOSE: Sorts an array based on value of a specific key
//			From http://php.net/manual/en/function.sort.php
// INPUT:	$array = array to sort
//			$on = key to use for sort
//			$order = ascending or descending
// RETURNS:	new sorted array

function dhp_array_sort($array, $on, $order=SORT_ASC)
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
} // dhp_array_sort()


// PURPOSE:	Retrieve list of all DHP Projects in WP DB
// RETURNS:	Array of arrays [ID, Title] sorted by Title

function dhp_get_projects()
{

	// I'm assuming that project titles will have already been trimmed, so I haven't included code to deal with that.  I can if you want.
	global $wpdb;

	$args = array( 
		'post_type' => 'dhp-project',
		'post_status' => array('drafts', 'publish'),
		'posts_per_page'   => -1
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
	
	$projects_array = dhp_array_sort( $projects_array, 'label' );
	return $projects_array;
} // dhp_get_projects()



add_action('add_meta_boxes', 'add_dhp_marker_settings_box');

// PURPOSE: Register box in panel for editing Marker settings
function add_dhp_marker_settings_box() {
    add_meta_box(
		'dhp_marker_settings_meta_box', 		// $id
		'Marker Settings', 						// $title
		'show_dhp_marker_settings_box', 		// $callback
		'dhp-markers', 						// $page
		'normal',								// $context
		'high'); 								// $priority
}

// PURPOSE: Handle Callback to create editing boxes for Marker Settings box in admin panel
// ASSUMES:	$post is set to this Marker post

function show_dhp_marker_settings_box()
{
	global $post, $dhp_marker_settings_fields;

	// Field Array
	$prefix = 'marker_';

	//display selected project settings
	$selected_project = get_post_meta($post->ID, 'project_id', true);
	if($selected_project) {
		$project_settings = get_post_meta($selected_project, 'project_settings', true);
		//echo $project_settings;
	}
	// Use nonce for verification
	echo '<input type="hidden" name="dhp_marker_settings_box_nonce" value="'.wp_create_nonce(basename(__FILE__)).'" />';

	// Begin the field table and loop
	echo '<table class="form-table dhp_marker_project" id="'.$selected_project.'">';
	foreach ($dhp_marker_settings_fields as $field) {
		// get value of this field if it exists for this post
		$meta = get_post_meta($post->ID, $field['id'], true);
		// begin a table row with
		echo '<tr>
				<th><label for="'.$field['id'].'">'.$field['label'].'</label></th>
				<td>';
				switch($field['type']) {
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


	$markerMeta = get_post_meta( $post->ID );
	//print_r($markerMeta);
	echo dhp_build_marker_meta_fields($markerMeta);
} // show_dhp_marker_settings_box()


// PURPOSE: Create HTML to display all custom field values of Marker
// INPUT:	$theMeta = array (provided by WP) of key-pairs: [ field-name, field-value ]
// RETURNS:	HTML string the data in $theMeta as unordered list
// NOTE:	CSS class delete-mote was used by (now dead) JavaScript code

function dhp_build_marker_meta_fields($theMeta)
{
	$markerHtml ='<ul class="marker-fields">';
	foreach ($theMeta as $key => $value) {
		if(($key!="_edit_lock") && ($key!="_edit_last")) {
			$markerHtml .='<li id="'.dhp_slug_from_name($key).'" class="motes"><label>'.$key.' </label><textarea class="mote-value">'.$value[0].'</textarea><a class="delete-mote">X</a></li>';			
		}
	}
	$markerHtml .='</ul>';
	// return $markerHtml;
} // dhp_build_marker_meta_fields()


// PURPOSE:	Create WP slug corresonding custom field
// INPUT:	$theName = string for name of mote
// RETURNS:	WP-style slug form of mote name
// TO DO:	Rename and encapsulate in Marker class?

function dhp_slug_from_name($theName)
{
	$moteID = strtolower($theName);
    $moteID = str_replace(" ","_",$moteID);
    return $moteID;
} // dhp_slug_from_name()


// Save the Data
// function save_dhp_marker_settings($post_id) {
//     global $dhp_marker_settings_fields;
// 	$parent_id = wp_is_post_revision( $post_id );
	
// 	// verify nonce
// 	if (!wp_verify_nonce($_POST['dhp_marker_settings_box_nonce'], basename(__FILE__)))
// 		return $post_id;
// 	// check autosave
// 	if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE)
// 		return $post_id;
// 	// check permissions
// 	if ('page' == $_POST['post_type']) {
// 		if (!current_user_can('edit_page', $post_id))
// 			return $post_id;
// 		} elseif (!current_user_can('edit_post', $post_id)) {
// 			return $post_id;
// 	}
// 	if ( $parent_id ) {
// 		// loop through fields and save the data
// 		$parent  = get_post( $parent_id );		
// 		foreach ($dhp_marker_settings_fields as $field) {
// 			$old = get_post_meta( $parent->ID, $field['id'], true);
// 			$new = $_POST[$field['id']];
// 			if ($new && $new != $old) {
// 				update_metadata( 'post', $post_id, $field['id'], $new);
// 			} elseif ('' == $new && $old) {
// 				delete_metadata( 'post', $post_id, $field['id'], $old);
// 			}
// 		} // end foreach
// 	}
// 	else {
// 		// loop through fields and save the data
// 		foreach ($dhp_marker_settings_fields as $field) {
// 			$old = get_post_meta($post_id, $field['id'], true);
// 			$new = $_POST[$field['id']];
// 			if ($new && $new != $old) {
// 				update_post_meta($post_id, $field['id'], $new);
// 			} elseif ('' == $new && $old) {
// 				delete_post_meta($post_id, $field['id'], $old);
// 			}
// 		} // end foreach
// 	}
// }
//add_action('save_post', 'save_dhp_marker_settings');  


// function get_project_icons( $project_id ){
// 		$icons = get_metadata( 'post', $project_id, 'project_icons', true);
// 		$icon_array = explode(',',$icons);
// 		echo '<div id="icon-cats"><ul>';
// 			for ($i=0; $i<count($icon_array)-2; $i=$i+3) {
// 		echo '<li><img src="'.$icon_array[$i+2].'"/><span>'.$icon_array[$i+1].'</span>';
// 			}
//         echo  '</ul></div>';
		 
// 	}



add_action( 'restrict_manage_posts', 'dhp_markers_filter_restrict_manage_posts' );

// PURPOSE: Create HTML code to create Drop-down list of Projects to filter lists of Markers in admin Panel
// INPUT:	$_GET['post_type'] is set to post type being edited in admin panel

function dhp_markers_filter_restrict_manage_posts()
{
    $type = 'post';
    if (isset($_GET['post_type'])) {
        $type = $_GET['post_type'];
    }
 
    //only add filter to post type you want
    if ($type == 'dhp-markers')
    {
        //change this to the list of values you want to show
        //in 'label' => 'value' format
        $values = dhp_get_projects();
        ?>
        <select name="PROJECT_ID_VALUE">
        <option value=""><?php _e('Filter By Project', 'acs'); ?></option>
        <?php
            $current_v = isset($_GET['PROJECT_ID_VALUE'])? $_GET['PROJECT_ID_VALUE']:'';
            foreach ($values as $label => $value) {
                printf
                    (
                        '<option value="%s"%s>%s</option>',
                        $value['value'],
                        $value['label'] == $current_v? ' selected="selected"':'',
                        $value['label']
                    );
                }
        ?>
        </select>
        <?php
    }
} // dhp_markers_filter_restrict_manage_posts()


add_filter( 'parse_query', 'dhp_markers_filter' );

// PURPOSE:	Modify the query string (used to show list in Markers admin panel) according to UI selection
// INPUT:	$query = the array describing the query for Markers to display in panel
//			$_GET['post_type'] = post type of posts being displayed in admin panel
//			$_GET['PROJECT_ID_VALUE'] = ID of Project selected in option button
// ASSUMES:	$pagenow global is set to file name of current page-wide template file

function dhp_markers_filter( $query )
{
    global $pagenow;

    $type = 'post';
    if (isset($_GET['post_type'])) {
        $type = $_GET['post_type'];
    }
    if ($type == 'dhp-markers' && is_admin() && $pagenow == 'edit.php' && isset($_GET['PROJECT_ID_VALUE']) && $_GET['PROJECT_ID_VALUE'] != '') {
        $query->query_vars['meta_key'] = 'project_id';
        $query->query_vars['meta_value'] = $_GET['PROJECT_ID_VALUE'];
    }
} // dhp_markers_filter()


add_filter('manage_edit-dhp-markers_columns', 'add_dhp_markers_columns');

// PURPOSE: Handle modifying array of columns to show when listing Markers in admin panel
// INPUT:	$columns = hash/array of field names and labels for the columns to display
// RETURNS:	Hash/array of column names with Project added

function add_dhp_markers_columns($columns)
{
    unset($columns['comments']);

    $columns['project'] = __('Project');

    return $columns;
} // add_dhp_markers_columns()


add_action('manage_dhp-markers_posts_custom_column', 'dhp_markers_custom_column', 10, 2);

// dhp_markers_custom_column($column, $post_id)
// PURPOSE: Output value of custom column for Marker in admin panel
// INPUT:	$column = key for column (name of field)
//			$post_id = ID of Marker post
// SIDE-FX:	Outputs text for name of project or category

function dhp_markers_custom_column($column, $post_id)
{
    $post_type = get_query_var('post_type');
    if ( $post_type == 'dhp-markers' )
    {
        $meta_project = get_post_meta( $post_id, 'project_id', true );
        $project_name = get_the_title($meta_project);
        
        switch ($column)
        {
            case 'project':
                echo $project_name;
            	break;
            case 'category':
                echo $meta_category;
            	break;
        }
    }
} // dhp_markers_custom_column()

// ================================ Ajax Functions =============================

	// Edit only
add_action( 'wp_ajax_dhpAddUpdateMetaField', 'dhp_add_update_metafield' );

// PURPOSE: Handle saving edited values for a single field
// INPUT:	$_POST['post_id'] = the ID of the Marker post
//			$_POST['field_name'] = the name of the custom field
//			$_POST['field_value'] = the value to save in the field

function dhp_add_update_metafield()
{
    $post_id = $_POST['post_id'];
	$field_name = $_POST['field_name'];
    $field_value = $_POST['field_value'];

	update_post_meta($post_id, $field_name, $field_value);
} // dhp_add_update_metafield()

	// Edit only
add_action( 'wp_ajax_dhpDeleteMoteMeta', 'dhp_delete_mote_meta' );

// PURPOSE: Handle deleting custom value/mote from a Marker post
// INPUT:	$_POST['post_id'] = ID of Marker post
//			$_POST['post_id'] = ID of custom field to remove

function dhp_delete_mote_meta()
{
	$dhp_post = $_POST['post_id'];
	$dhp_mote = $_POST['mote_id'];

	delete_post_meta($dhp_post, $dhp_mote);
} // dhp_delete_mote_meta()

?>
