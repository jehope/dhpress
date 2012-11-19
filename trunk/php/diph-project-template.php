<?php
/*
Template Name: Project Template
*/
?>
<?php get_header(); ?>
<div id="content" class="widecolumn">
 <?php if (have_posts()) : while (have_posts()) : the_post();?>
 <div class="post">
 <h2 id="post-<?php the_ID(); ?>"><?php the_title();?></h2>
 <div class="entrytext">
  <?php the_content('<p class="serif">Read the rest of this page &raquo;</p>'); ?>

 </div>
 </div>
 <?php endwhile; endif; ?>
 <ul>
<?php
	$postid = get_the_ID();
	$args = array( 'post_type' => 'diph-markers', 'meta_key' => 'marker_project','meta_value'=>$postid, 'posts_per_page' => -1 );
	$loop = new WP_Query( $args );
	while ( $loop->have_posts() ) : $loop->the_post(); ?>
<li>
		<?php the_title(); ?>	
</li>		
	<?php endwhile; ?>
</ul>
 <?php edit_post_link('Edit this entry.', '<p>', '</p>'); ?>
</div>
<div id="main">

</div>
<?php get_footer(); ?>