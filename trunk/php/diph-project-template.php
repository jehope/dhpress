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
 <h2 id="post-<?php the_ID(); ?>"><?php the_title();?></h2>
 <div class="entrytext">
  <?php the_content('<p class="serif">Read the rest of this page &raquo;</p>'); ?>

 </div>
 
 <div id="map_div"></div>
 <div id="map_div2"></div>
 <div id="map_marker"></div>
 <div id="timeline"></div><a class="launch-timeline">Timeline</a>
 </div>
 <!-- Modal -->
<div id="markerModal" class="modal hide fade" tabindex="-1" role="dialog" aria-labelledby="markerModalLabel" aria-hidden="true">
  <div class="modal-header">
    <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>
    <h3 id="markerModalLabel">Map Setup</h3>
  </div>
  <div class="modal-body">
    
  </div>
  <div class="modal-footer">
    <button class="btn" data-dismiss="modal" aria-hidden="true">Close</button>
  </div>
</div>
 <?php endwhile; endif; ?>
 
 <?php edit_post_link('Edit this entry.', '<p>', '</p>'); ?>
</div>
</div>
<?php get_sidebar(); ?>
<?php get_footer(); ?>