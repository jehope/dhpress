$(document).ready(function(){
	//add class="current" to the <li> that is parent of the <a> tag with href as stated below (this is the Map Library sublevel menu under diPH Toolkit)
	$("a[href='admin.php?page=map-library']").closest("li").addClass("current");
	//add Map Layer Library and Manage Mapsets tabs to taxonomy="mapset" page
	$("div.wrap.nosubsub").prepend('<div id = "icon-themes" class = "icon32"></div><h2>Map Layer Library</h2><h2 class = "nav-tab-wrapper"><a href = "admin.php?page=map-library&tab=map_lib" class = "nav-tab">Map Library</a><a href = "edit-tags.php?taxonomy=mapset&tab=mapset" class = "nav-tab nav-tab-active">Manage Mapsets</a></h2>'); //end prepend
	//remove default icon from taxonomy='mapset' page (edit-tags.php?taxonomy=mapset)
	$("#icon-diph-top-level-handle").remove();
	//remove default <h2> from taxonomy='mapset' page (edit-tags.php?taxonomy=mapset)
	$("div.wrap.nosubsub h2").eq(2).remove();
});