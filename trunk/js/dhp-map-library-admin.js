// JavaScript Document

jQuery(document).ready(function($) {
	
	console.log('here');
	if($("#diph_map_type").val() == "CDLA"){
		$(".KML").hide();
		$(".CDLA").show();
	}else if($("#diph_map_type").val() == "KML"){
		$(".CDLA").hide();
		$(".KML").show();
	}else if($("#diph_map_type").val() == ""){
		$(".CDLA").hide();
		$(".KML").hide();
	}
	
	$("#diph_map_type").change(function(){
		if($("#diph_map_type").val() == "CDLA"){
			$(".KML").hide();
			$(".CDLA").show();
		}else if($("#diph_map_type").val() == "KML"){
			$(".CDLA").hide();
			$(".KML").show();
		}else if($("#diph_map_type").val() == ""){
			$(".CDLA").hide();
			$(".KML").hide();
		}
	});

});