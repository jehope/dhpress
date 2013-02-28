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
			'p'				=> $postid,
            'numberposts'     => $num,
            'offset'          => 0,
            //'category'        => ,
            'orderby'         => 'menu_order, post_title', // post_date, rand
            'order'           => 'DESC',
            //'include'         => ,
            //'exclude'         => ,
            //'meta_key'        => ,
            //'meta_value'      => $postid,
            'post_type'       => 'diph-maps',
            //'post_mime_type'  => ,
            //'post_parent'     => ,
            'post_status'     => 'publish',
            'suppress_filters' => true
        );
 
        $posts = get_posts( $args );
 
        $html = '';
        foreach ( $posts as $post ) {
        	the_title();
            $meta_desc = get_post_meta( $post->ID, 'diph_map_desc', true );
            $meta_type = get_post_meta( $post->ID, 'diph_map_type', true );
            $meta_creator = get_post_meta( $post->ID, 'diph_map_creator', true );
            $meta_category = get_post_meta( $post->ID, 'diph_map_category', true );
            echo "<table border=1><post id='$post->ID'></post>";
            echo "<tr><td colspan=2 align=center><b>Map Information<b></td><tr>";
            echo "<tr><td><b>Description</b></td><td><desp>$meta_desc</desp></td></tr>";
            echo "<tr><td><b>Category</b></td><td><category>$meta_category</category></td></tr>";
            echo "<tr><td><b>Type</b></td><td><type>$meta_type</type></td></tr>";
            if($meta_type == "CDLA"){
            	$meta_cdlaid = get_post_meta( $post->ID, 'diph_map_cdlaid', true );
            	echo "<tr><td><b>CDLA MAP ID</b></td><td><cdlaid>$meta_cdlaid</cdlaid></td></tr>";
            }
            if($meta_type == "KML"){
            	$meta_url = get_post_meta( $post->ID, 'diph_map_url', true );
            	echo "<tr><td><b>URL</b></td><td><url>$meta_url</url></td></tr>";
            }
            echo "<tr><td><b>Creator</b></td><td><creator>$meta_creator</creator></td></tr>";
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