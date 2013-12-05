<?php
/*
Template Name: Map Template
*/
?>
<?php get_header(); ?>

<div id="content" class="widecolumn">
 <?php if (have_posts()) : while (have_posts()) : the_post();?>

 <div class="post">
 <h2 id="post-<?php the_ID(); ?>"><?php the_title();?></h2>
 <div class="entrytext">
  <?php the_content('<p class="serif">Read the rest of this page &raquo;</p>'); ?>
  <?php
    $postid = get_the_ID();
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
 
        $html = '';
        foreach ( $posts as $post ) {
            // Embed parameters about the map in 
            the_title();
            $meta_desc = esc_attr(get_post_meta( $post->ID, 'dhp_map_desc', true ));
            $meta_type = get_post_meta( $post->ID, 'dhp_map_type', true );
            $meta_classification = get_post_meta( $post->ID, 'dhp_map_classification', true );
            $meta_state = get_post_meta( $post->ID, 'dhp_map_state', true );
            $meta_county = get_post_meta( $post->ID, 'dhp_map_county', true );
            $meta_city = get_post_meta( $post->ID, 'dhp_map_city', true );
            $meta_year = get_post_meta( $post->ID, 'dhp_map_year', true );
            $meta_creator = get_post_meta( $post->ID, 'dhp_map_creator', true );
            $meta_category = get_post_meta( $post->ID, 'dhp_map_category', true );

            if($meta_type == "CDLA"){
                $meta_cdlaid = get_post_meta( $post->ID, 'dhp_map_typeid', true );
            } else  if($meta_type == "KML"){
                $meta_url = get_post_meta( $post->ID, 'dhp_map_url', true );
            }

                // pass parameters in hidden form, before displaying them
            echo "<form name='map-params-form'>";
            echo "<input type='hidden' name='map-post' value='".$post->ID."'>";
            // echo "<input type='hidden' name='map-desc' value='".$meta_desc."'>";
            echo "<input type='hidden' name='map-category' value='".$meta_category."'>";
            echo "<input type='hidden' name='map-type' value='".$meta_type."'>";
            echo "<input type='hidden' name='map-classification' value='".$meta_classification."'>";
            echo "<input type='hidden' name='map-state' value='".$meta_state."'>";
            echo "<input type='hidden' name='map-county' value='".$meta_county."'>";
            echo "<input type='hidden' name='map-city' value='".$meta_city."'>";
            echo "<input type='hidden' name='map-year' value='".$meta_year."'>";
            echo "<input type='hidden' name='map-creator' value='".$meta_creator."'>";
            if($meta_type == "CDLA"){
                echo "<input type='hidden' name ='map-cdlaid' value='".$meta_cdlaid."'>";
            } else if($meta_type == "KML"){
                echo "<input type='hidden' name = 'map-url' value='".$meta_url."'>";
            }
            echo "</form>";

            echo "<table border=1>";
            echo "<tr><td colspan=2 align=center><b>Map Information<b></td><tr>";
            echo "<tr><td><b>Description: </b></td><td>$meta_desc</td></tr>";
            echo "<tr><td><b>Category: </b></td><td>$meta_category</td></tr>";
            echo "<tr><td><b>Type: </b></td><td>$meta_type</td></tr>";
            if($meta_type == "CDLA"){
                echo "<tr><td><b>CDLA MAP ID: </b></td><td>$meta_cdlaid</td></tr>";
            } else if($meta_type == "KML"){
                echo "<tr><td><b>URL: </b></td><td>$meta_url</td></tr>";
            }
            echo "<tr><td><b>Classification: </b></td><td>$meta_classification</td></tr>";
            echo "<tr><td><b>State: </b></td><td>$meta_state</td></tr>";
            echo "<tr><td><b>County: </b></td><td>$meta_county</td></tr>";
            echo "<tr><td><b>City: </b></td><td>$meta_city</td></tr>";
            echo "<tr><td><b>Year: </b></td><td>$meta_year</td></tr>";
            echo "<tr><td><b>Creator: </b></td><td>$meta_creator</td></tr>";
            echo "<tr><td><b></b></td><td></td></tr>";
            echo "</table>";
        }
  ?>
 </div>
 <div id="map_div"></div>
 <button id="hide">Hide</button>
 </div>
 <?php endwhile; endif; ?>

 <?php edit_post_link('Edit this entry.', '<p>', '</p>'); ?>
</div>

<?php get_footer(); ?>