<?php
// PURPOSE: Add a shortcode to be used anywhere in site and load scripts/styles on only pages that call shortcode
// USAGE: [dhpress_split_projects left="url" right="url"]
if(!class_exists('DHP_Splitmap_Shortcode'))
{
	class DHP_Splitmap_Shortcode
	{
		static $add_script; // Identifier for pages that need to load script/styles

		static function init()
		{
				// Register shortcode and scripts
			add_shortcode('dhpress_split_projects', array(__CLASS__, 'dhp_split_projects_function'));
			add_action('init', array(__CLASS__, 'register_scripts'));

				// has to add scripts/styles to footer since shortcodes are registered after enqueue step
			add_action('wp_footer', array(__CLASS__, 'print_scripts'));
		}
			// USAGE: [dhpress_split_projects left="url" right="url"]
		static function dhp_split_projects_function($atts)
		{
			self::$add_script = true; // Load script/style

			extract( shortcode_atts( array(
				'left' => 'null',
				'right' => 'null',
				), $atts ) );
			ob_start(); ?>
				<div class="dhp-split-iframes">
					<iframe class="left-iframe" src="<?php echo $left; ?>" /></iframe>
					<iframe class="right-iframe" src="<?php echo $right; ?>" /></iframe>
				</div>
			<?php
			return ob_get_clean();
		}
			// Register scripts/styles used by shortcode
		static function register_scripts()
		{
				// Register styles
			wp_register_style('dhp-shortcode-styles', plugins_url('/css/dhp-shortcodes.css', dirname(__FILE__)), false, DHP_PLUGIN_VERSION );
				// Register scripts
			// wp_register_script('my-script', plugins_url('my-script.js', __FILE__), array('jquery'), '1.0', true);
		}
		static function print_scripts()
		{
			if ( ! self::$add_script )
				return;
				// Load styles
			wp_enqueue_style('dhp-shortcode-styles');
				// Load scripts
			// wp_enqueue_script('my-script');
		}
	}
}
	// Initialize shortcode class
if(class_exists('DHP_Splitmap_Shortcode'))
{
	DHP_Splitmap_Shortcode::init();
}