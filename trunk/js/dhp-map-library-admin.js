// Library loaded by add_dhp_map_library_scripts() in dhp-map-library.php for editing/viewing Maps
// ASSUMES:  HTML has embedded element with ID dhp_map_type, and corresponding CSS classes
// USES:     jQuery
// TO DO:    Not sure if this is relevant to GUI any more

jQuery(document).ready(function($) {
	
	function showVizElements() {
		switch ($("#dhp_map_type").val()) {
		case "DHP":
			$(".KML").hide();
			$(".DHP").show();
			break;
		case "KML":
			$(".DHP").hide();
			$(".KML").show();
			break;
		default:
			$(".DHP").hide();
			$(".KML").hide();
			break;
		}
	}

		// do initial CSS setings
	showVizElements();

		// bind function to HTML element for further changes
	// $("#diph_map_type").change(showVizElements);
	$("#dhp_map_type").change(showVizElements);
});