<?php
/*
Plugin Name: Category Checklist Tree
Version: 1.3
Description: Preserves the category hierarchy on the post editing screen
Author: scribu
Author URI: http://scribu.net
Plugin URI: http://scribu.net/wordpress/category-checklist-tree
*/

class Category_Checklist {

	function init() {
		add_filter( 'wp_terms_checklist_args', array( __CLASS__, 'checklist_args' ) );
	}

	function checklist_args( $args ) {
		add_action( 'admin_footer', array( __CLASS__, 'script' ) );

		$args['checked_ontop'] = false;

		return $args;
	}

	// Scrolls to first checked category
	function script() {
?>
<script type="text/javascript">
	jQuery(function(){
		jQuery('[id$="-all"] > ul.categorychecklist').each(function() {
			var $list = jQuery(this);
			var $firstChecked = $list.find(':checked').first();

			if ( !$firstChecked.length )
				return;

			var pos_first = $list.find(':checkbox').position().top;
			var pos_checked = $firstChecked.position().top;

			$list.closest('.tabs-panel').scrollTop(pos_checked - pos_first + 5);
		});
	});
</script>
<?php
	}
}

Category_Checklist::init();

