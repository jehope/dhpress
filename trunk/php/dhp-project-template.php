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
 <div id="map_div2"></div>
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

<ol id="dhpress-tips" class="joyRideTipContent">
  <li data-id="legends" data-options="tipLocation:right">Legends allow you to change (or filter) what you see on the map. By clicking on different options in the legend, you can see related markers by themselves or in combination with each other. Click on the check box or name to narrow the display of markers on the map. You can click on multiple check boxes. Refreshing the browser page will restore all markers on the map.</li>
  <li data-class="dropdown" data-options="tipLocation:bottom">A DH Press project may have multiple legends which allow you to explore the project content in different ways. To toggle, or switch, between different legends, click the arrow. A drop-down menu showing all existing legends will appear. Move your mouse to the one you want and click the name to activate that legend. </li>
  <li data-id="legends" data-options="tipLocation:right">Decrease the size of the legend by clicking on the arrows in the top right corner of the legend. This will shrink the legend, allowing you to see more of the map. Click the arrows again to restore the full size of the legend.
  </li>
  <li data-class="layers" data-options="tipLocation:bottom"><p>Some DH Press projects layer different maps on top of each other to highlight different things about the built environment or landscape. You can turn each map layer on and off, change the transparency level of each map, and turn all markers off/on. </p>
    <ul>
      <li>1) Turning maps on/off: click the checkbox next to a map to hide it.</li>
      <li>2) Changing transparency: move the slider to the left to make the map layer more transparent. Move it to the right to increase opacity. This action can be performed on any individual map, whether a base map (such as Google Street view) or a map overlay.</li>
      <li>3) Turn markers off: click the checkbox next to the markers to turn all markers off. Click again to restore all markers. You can also change the transparency of the markers by dragging the slider.</li>
    </ul>
  </li>
  <li data-class="icon-fullscreen" data-options="tipLocation:bottom" class="custom-class">Click the “Fullscreen map” button to switch between a smaller view of the map and one that takes up the browser’s entire window. All of the map’s interactivity is functional in both views. When in the smaller map view, you will see the rest of the project site, including the navigation bar at the top and any additional content on the sidebar.
  </li>
  <li data-class="icon-legend" data-options="tipLocation:bottom" class="custom-class">Click on the check box or name to narrow the display of markers on the map to that category. Check multiple boxes to see markers from multiple categories at the same time.
</li>
  <li>To reposition the map in any cardinal direction, click and hold the mouse down while moving the mouse. This will allow you to pan, or drag, the map to see areas not currently visible in the browser. Panning will not affect the zoom level of the map.</li>
  <li data-class="olControlZoom" class="custom-class" data-options="tipLocation:left">To change the scale (magnification value) of the map, zoom in or out. There are several ways to zoom: click the plus sign on the map, double click the mouse, or move the mouse wheel away from you. Hitting the minus button, or moving the mouse wheel towards you, makes the map smaller (zoom out). To reset the map’s original zoom level (scale) completely, refresh the browser.
</li>
  <li>Clicking on a marker opens up a lightbox (or popup window) with more information about that marker. Depending on the amount of content in the lightbox, you may need to scroll down to see everything. Click the green link button (when enabled) at the bottom to open up a new tab in the browser. This allows you either to navigate to more information about the selected marker, or to a page of related markers. </li>
  <li>Firefox and Chrome are the recommended browsers for DH Press. Some users may experience difficulty viewing all of a project’s features in their browser, particularly those using ad blockers and other browser plugins. Mac users experiencing problems with Flash should use Safari. </li>
</ol>

 <?php edit_post_link('Edit this entry.', '<p>', '</p>'); ?>
</div>
</div>
<?php get_sidebar(); ?>
<?php get_footer(); ?>