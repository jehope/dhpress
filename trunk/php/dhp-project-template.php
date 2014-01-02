<?php
/*
Template Name: Project Template
*/
?>
<?php get_header(); ?>
<div id="primary" class="site-content">
  <div id="content" >
 <?php if (have_posts()) : while (have_posts()) : the_post();?>
 <div class="post" id="<?php the_ID(); ?>">
 <h2 id="post-<?php the_ID(); ?>" class="post-title"><?php the_title();?></h2>
 <div class="entrytext">
  <?php the_content('<p class="serif">Read the rest of this page &raquo;</p>'); ?>

 </div>
 
 <div id="map_div"></div>
 </div>
 <!-- Modal -->
 <?php endwhile; endif; ?>


 <?php edit_post_link('Edit this entry.', '<p>', '</p>'); ?>
</div>
</div>
<?php get_sidebar(); ?>
<?php get_footer(); ?>