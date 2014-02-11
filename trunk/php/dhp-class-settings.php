<?php
// PURPOSE: Include settings for useful addins that are used site wide and not just on dhp pages.
if( !class_exists( 'DHPressSettings' ) ) {
	class DHPressSettings
	{
		static function init() 
		{	
			add_action( 'admin_init', array( __CLASS__, 'admin_init' ) );
			add_action( 'admin_menu', array( __CLASS__, 'add_menu' ) );

				// Register/load scripts if options are set
			if( get_option( 'timeout_duration' ) ) {
				add_action( 'init', array( __CLASS__, 'register_scripts' ) );
				add_action( 'wp_enqueue_scripts', array( __CLASS__, 'print_scripts' ) );
			}
		}
		static function admin_init()
		{
		    // Set up the settings for this plugin
		    self::init_settings();
		    // Possibly do additional admin_init tasks
		}
		static function init_settings()
		{
		    // register the settings for this plugin
		    register_setting( 'dhp_global_settings-group', 'timeout_duration' );
		    register_setting( 'dhp_global_settings-group', 'redirect_url' );
		}
			// Add options page for global utilities
		static function add_menu()
		{
			add_options_page( 'Global Options', 'DH Press Options', 'manage_options', 'dhp-global-options', array( __CLASS__, 'dhp_settings_page' ) );
		}
			// Add menu callback function
		static function dhp_settings_page() 
		{
			echo self::settingsPageTemplate();
		}
			// Template for settings page
			// TODO: Move to it's own file
		static function settingsPageTemplate() 
		{
			ob_start(); ?>
				<div class="wrap">
				    <h2>DH Press Global Options</h2>
				    <div>Timeout and redirect mode. (kiosk mode for project display)</div>
				    <form method="post" action="options.php"> 
				        <?php @settings_fields( 'dhp_global_settings-group' ); ?>
				        <?php @do_settings_fields( 'dhp_global_settings-group' ); ?>

				        <table class="form-table">  
				            <tr valign="top">
				                <th scope="row"><label for="timeout_duration">Timeout Duration(mins)</label></th>
				                <td><input type="text" name="timeout_duration" id="timeout_duration" value="<?php echo get_option( 'timeout_duration' ); ?>" /></td>
				            </tr>
				            <tr valign="top">
				                <th scope="row"><label for="redirect_url">Redirect URL</label></th>
				                <td><input type="text" name="redirect_url" id="redirect_url" value="<?php echo get_option( 'redirect_url' ); ?>" /></td>
				            </tr>
				        </table>

				        <?php @submit_button(); ?>
				    </form>
				</div> 
			<?php
			return ob_get_clean();
		}
			// Register scripts/styles used by global settings
		static function register_scripts() 
		{
				// Register styles
			// wp_register_style('dhp-global-settings-style', plugins_url('/css/dhp-global-settings.css', dirname(__FILE__)), false, DHP_PLUGIN_VERSION );
				// Register scripts
			wp_register_script( 'dhp-global-settings-script', plugins_url( '/js/dhp-global-settings.js', dirname( __FILE__ ) ), array( 'jquery' ), DHP_PLUGIN_VERSION, true );
		}
		static function print_scripts() 
		{
				// Load styles
			// wp_enqueue_style( 'dhp-global-settings-styles' );
				// Load scripts
			wp_enqueue_script( 'dhp-global-settings-script' );
				// Print settings to page
			wp_localize_script( 'dhp-global-settings-script', 'dhpGlobals', array(
				'timeout_duration' => get_option( 'timeout_duration' ),
				'redirect_url' => get_option( 'redirect_url' )
			) );
		}
	}
}
if( class_exists( 'DHPressSettings' ) ) {
	DHPressSettings::init();
}
