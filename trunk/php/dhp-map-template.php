<?php
/*
Template Name: Map Template
*/

// NOTE:    The dhp-maps-view.js code is only set up to display a single map in the dhp-visual DIV;
//          Displaying multiple maps (one per post in a list) would require modifications

?>
<?php get_header(); ?>

<div id="content" class="widecolumn">
 <?php if (have_posts()) : while (have_posts()) : the_post();?>

 <div class="post">
 <h1>MAP LIBRARY ENTRY</h1>
 <!-- <h2 id="post-<?php the_ID(); ?>"><?php the_title();?></h2> -->

 <div class="dhp-entrytext">
  <?php the_content('<p class="serif">Read the rest of this page &raquo;</p>'); ?>
  <?php
    $postid = get_the_ID();
    echo "<br/>";

    //echo $postid;
    $args = array(
            'p'             => $postid,
            'numberposts'     => $num,
            'offset'          => 0,
            //'category'        => ,
            'orderby'         => 'menu_order, post_title', // post_date, rand
            'order'           => 'DESC',
            //'include'         => ,
            //'exclude'         => ,
            //'meta_key'        => ,
            //'meta_value'      => $postid,
            'post_type'       => 'dhp-maps',
            //'post_mime_type'  => ,
            //'post_parent'     => ,
            'post_status'     => 'publish',
            'suppress_filters' => true
        );
        $posts = get_posts( $args );
 
        global $dhp_map_custom_fields;

        $html = '';
        foreach ( $posts as $post ) {
            the_title();

                // Get all custom fields about this map -- call function in dhp-map-library.php
            $mapMetaData = dhp_get_map_custom_fields($post->ID, $dhp_map_custom_fields);

            // $meta_desc = esc_attr(get_post_meta( $post->ID, 'dhp_map_desc', true ));
            // $meta_type = get_post_meta( $post->ID, 'dhp_map_type', true );
            // $meta_classification = get_post_meta( $post->ID, 'dhp_map_classification', true );
            // $meta_state = get_post_meta( $post->ID, 'dhp_map_state', true );
            // $meta_county = get_post_meta( $post->ID, 'dhp_map_county', true );
            // $meta_city = get_post_meta( $post->ID, 'dhp_map_city', true );
            // $meta_year = get_post_meta( $post->ID, 'dhp_map_year', true );
            // $meta_creator = get_post_meta( $post->ID, 'dhp_map_creator', true );
            // $meta_category = get_post_meta( $post->ID, 'dhp_map_category', true );

            // if($meta_type == "DHP"){
            //     $meta_cdlaid = get_post_meta( $post->ID, 'dhp_map_typeid', true );
            // } else  if($meta_type == "KML"){
            //     $meta_url = get_post_meta( $post->ID, 'dhp_map_url', true );
            // }

                // Pass map data required to show it as parameters in hidden form
            echo "<form name='map-params-form'>";
            echo "<input type='hidden' id='map-post' name='map-post' value='".$post->ID."'>";
            echo "<input type='hidden' id='map-category' name='map-category' value='".$mapMetaData['dhp_map_category']."'>";
            echo "<input type='hidden' id='map-type' name='map-type' value='".$mapMetaData['dhp_map_type']."'>";
            echo "<input type='hidden' id='map-typeid' name='map-typeid' value='".$mapMetaData['dhp_map_typeid']."'>";
            echo "<input type='hidden' id='map-shortname' name='map-shortname' value='".$mapMetaData['dhp_map_shortname']."'>";
            echo "<input type='hidden' id='map-url' name='map-url' value='".$mapMetaData['dhp_map_url']."'>";
            echo "<input type='hidden' id='map-subdomains' name='map-subdomains' value='".$mapMetaData['dhp_map_subdomains']."'>";
            echo "<input type='hidden' id='map-bounds' name='map-bounds' value='".$mapMetaData['dhp_map_n_bounds'].",".$mapMetaData['dhp_map_s_bounds'].",".$mapMetaData['dhp_map_e_bounds'].",".$mapMetaData['dhp_map_w_bounds']."'>";
            echo "<input type='hidden' id='map-zoom-min' name='map-zoom-min' value='".$mapMetaData['dhp_map_min_zoom']."'>";
            echo "<input type='hidden' id='map-zoom-max' name='map-zoom-max' value='".$mapMetaData['dhp_map_max_zoom']."'>";
            echo "<input type='hidden' id='map-centroid' name='map-centroid' value='".$mapMetaData['dhp_map_cent_lat'].",".$mapMetaData['dhp_map_cent_lon']."'>";
            echo "<input type='hidden' id='map-desc' name='map-desc' value='".$mapMetaData['dhp_map_desc']."'>";
            echo "</form>";


                // Show all map data
            echo "<br/>";

            echo "<table border=1>";
            echo "<tr><td colspan=2 align=center><b>Map Information<b></td><tr>";

            // echo "<tr><td><b>ID: </b></td><td>".$mapMetaData['dhp_map_typeid']."</td></tr>";
            echo "<tr><td><b>Short title: </b></td><td>".$mapMetaData['dhp_map_shortname']."</td></tr>";
            echo "<tr><td><b>Description: </b></td><td>".$mapMetaData['dhp_map_desc']."</td></tr>";
            echo "<tr><td><b>Category: </b></td><td>".$mapMetaData['dhp_map_category']."</td></tr>";
            echo "<tr><td><b>Type: </b></td><td>".$mapMetaData['dhp_map_type']."</td></tr>";
            echo "<tr><td><b>URL: </b></td><td>".$mapMetaData['dhp_map_url']."</td></tr>";
            echo "<tr><td><b>Subdomains: </b></td><td>".$mapMetaData['dhp_map_subdomains']."</td></tr>";
            echo "<tr><td><b>Classification: </b></td><td>".$mapMetaData['dhp_map_classification']."</td></tr>";
            echo "<tr><td><b>State: </b></td><td>".$mapMetaData['dhp_map_state']."</td></tr>";
            echo "<tr><td><b>County: </b></td><td>".$mapMetaData['dhp_map_county']."</td></tr>";
            echo "<tr><td><b>City: </b></td><td>".$mapMetaData['dhp_map_city']."</td></tr>";
            echo "<tr><td><b>Other loc info: </b></td><td>".$mapMetaData['dhp_map_otherlocation']."</td></tr>";
            echo "<tr><td><b>Year: </b></td><td>".$mapMetaData['dhp_map_year']."</td></tr>";
            echo "<tr><td><b>Creator: </b></td><td>".$mapMetaData['dhp_map_creator']."</td></tr>";
            echo "<tr><td><b>N,S,E,W Bounds: </b></td><td>".$mapMetaData['dhp_map_n_bounds'].", ".$mapMetaData['dhp_map_s_bounds'].", ".$mapMetaData['dhp_map_e_bounds'].", ".$mapMetaData['dhp_map_w_bounds']."</td></tr>";
            echo "<tr><td><b>Min/Max Zoom: </b></td><td>".$mapMetaData['dhp_map_min_zoom']."/".$mapMetaData['dhp_map_max_zoom']."</td></tr>";
            echo "<tr><td><b>Centroid (Lat,Long): </b></td><td>".$mapMetaData['dhp_map_cent_lat'].", ".$mapMetaData['dhp_map_cent_lon']."</td></tr>";
            echo "<tr><td><b></b></td><td></td></tr>";
            echo "</table>";
        }
  ?>
 </div>
 <div id="dhp-visual"></div>
 <button id="hide">Hide</button>
 </div>
 <?php endwhile; endif; ?>

 <?php edit_post_link('Edit this entry.', '<p>', '</p>'); ?>
</div>

<?php get_footer(); ?>