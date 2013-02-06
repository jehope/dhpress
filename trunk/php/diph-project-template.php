<?php
/*
Template Name: Project Template
*/
?>
<?php get_header(); ?>
<style>
 #TB_window {
 	z-index: 2000;
 	opacity: .8;
 }
 #TB_overlay {
 	z-index: 1999;
 	opacity: .5;
 }</style>
<div id="content" class="widecolumn">
 <?php if (have_posts()) : while (have_posts()) : the_post();?>
 <div class="post" id="<?php the_ID(); ?>">
 <h2 id="post-<?php the_ID(); ?>"><?php the_title();?></h2>
 <div class="entrytext">
  <?php the_content('<p class="serif">Read the rest of this page &raquo;</p>'); ?>

 </div>
 
 <div id="map_div"></div>
 <div id="map_div2"></div>
 <div id="map_marker"></div>
 <div id="timeline"></div><a class="launch-timeline">Timeline</a>
 </div>
 <?php endwhile; endif; ?>
 <ul>
<?php
	$postid = get_the_ID();
	$args = array( 'post_type' => 'diph-markers', 'meta_key' => 'marker_project','meta_value'=>$postid, 'posts_per_page' => -1 );
	$loop = new WP_Query( $args );
	while ( $loop->have_posts() ) : $loop->the_post(); ?>
<!-- <li>
		<?php the_title(); ?>	
</li>		 -->
	<?php endwhile; ?>
</ul>
 <?php edit_post_link('Edit this entry.', '<p>', '</p>'); ?>
</div>

<?php get_footer(); ?>