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
			if( get_option( 'timeout_duration' ) || get_option( 'tip_url' ) || get_option( 'kiosk_mode' ) ) {
				if(get_option( 'tip_url' )) {
					add_action('wp_footer', array( __CLASS__, 'dhp_tip_page_content') );
				}
				
				if(get_option( 'kiosk_mode' )) {
					// Trying to load external links in modal
					// add_action('wp_footer', array( __CLASS__, 'dhp_external_page_content') );
					
					// Add specific CSS class by filter
					add_filter('body_class', array( __CLASS__, 'kiosk_class_names') );
				}
				
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
		    register_setting( 'dhp_global_settings-group', 'kiosk_mode' );
		    register_setting( 'dhp_global_settings-group', 'kiosk_useragent' );
		    register_setting( 'dhp_global_settings-group', 'kiosk_blockurls' );
		    register_setting( 'dhp_global_settings-group', 'tip_url' );
		    register_setting( 'dhp_global_settings-group', 'dhp_love' );
		}
			// Add options page for global utilities
		static function add_menu()
		{
			add_options_page( 'Global Options', 'DH Press Options', 'manage_options', 'dhp-global-options', array( __CLASS__, 'dhp_settings_page' ) );
		}
			// Add menu callback function
		static function dhp_settings_page() 
		{
			echo self::settings_page_template();
		}
			// PURPOSE: Add kiosk class name to page before js renders
		static function kiosk_class_names($classes) {
			// add 'class-name' to the $classes array
			$classes[] = 'kiosk-mode';
			// return the $classes array
			return $classes;
		}
			// PURPOSE: Generate html for page tip select box and select current option
		static function dhp_list_pages_for_tips()
		{
 
			$pages = get_pages();
			$options = '<option value="0" '. selected(get_option('tip_url'),0) . '>-- No Tip Page --</option>';
			foreach ( $pages as $page ) {
				$option  = '<option value="' . $page->ID . '" '. selected(get_option('tip_url'),$page->ID) . '>';
				$option  .= $page->post_title;
				$option  .= '</option>';
				$options .= $option;
			}
			return $options;
		}
			// Template for settings page
			// TODO: Move to it's own file
		static function settings_page_template() 
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
				                <th scope="row"><label for="tip_url">Site Tip Page</label></th>
				                <td>
				                	<select name="tip_url" id="tip_url">
				                		<?php echo self::dhp_list_pages_for_tips(); ?>
								    </select>
								    Create a page for help text/tips and select it here.
				                </td>
				            </tr>

				            <tr valign="top">
				                <th scope="row"><label for="timeout_duration">Timeout Duration(mins)</label></th>
				                <td><input type="text" name="timeout_duration" id="timeout_duration" value="<?php echo get_option( 'timeout_duration' ); ?>" />
				                	Leave blank if no timeout is needed.</td>
				            </tr>
				            <tr valign="top">
				                <th scope="row"><label for="redirect_url">Redirect URL</label></th>
				                <td><input type="text" name="redirect_url" id="redirect_url" value="<?php echo get_option( 'redirect_url' ); ?>" />
				                	Enter url to redirct site to when timeout occurs.</td>
				            </tr>
				            <tr valign="top">
				                <th scope="row"><label for="kiosk_mode">Kiosk Mode</label></th>
				                <td><input type="checkbox" name="kiosk_mode" id="kiosk_mode" value="1" <?php checked(get_option('kiosk_mode'),1); ?>/>
				                	Add menu to bottom of site.</td>
				            </tr>
				            <tr valign="top">
				             	<th scope="row"><label for="redirect_url">Kiosk User Agent</label></th>
				                <td><input type="text" name="kiosk_useragent" id="kiosk_useragent" value="<?php echo get_option( 'kiosk_useragent' ); ?>" /> 
				                	Only enable kiosk mode for specific device. Leave empty if enabled for all devices.</td>
				            </tr>
				            <tr valign="top">
				             	<th scope="row"><label for="redirect_url">Block External URLs </label></th>
				                <td>Enter comma separated list of domains that you wish to block on kiosk(only applies if User Agent is set above).<br/>
				                	<textarea name="kiosk_blockurls" id="kiosk_blockurls"><?php echo get_option( 'kiosk_blockurls' ); ?></textarea> 
				                </td>
				            </tr>
				            <tr valign="top">
				                <th scope="row"><label for="dhp_love">Display DH Press credits in footer? </label></th>
				                <td><input type="checkbox" name="dhp_love" id="dhp_love" value="1" <?php checked(get_option('dhp_love'),1); ?>/> You'd be even cooler if you did!</td>
				            </tr>
				            
				        </table>

				        <?php @submit_button(); ?>
				    </form>
				</div> 
			<?php
			return ob_get_clean();
		}
			// Add handlebars template to footer for tip modal
		static function dhp_tip_page_content()
		{	
			echo self::dhp_tip_page_template();
		}
		static function dhp_get_tip_page() 
		{
			//get page object
			$tip_page_object = get_post(get_option('tip_url'));

			return $tip_page_object;
		}
			// PURPOSE: Load template in html to be called by javascript
		static function dhp_tip_page_template() {
			$tip_obj = self::dhp_get_tip_page();
			ob_start(); ?>
			<div id="tipModal" class="reveal-modal medium" data-reveal>
			  <div class="modal-content">
			    <div class="modal-header">
			      <h1><?php echo $tip_obj->post_title;?></h1>
			    </div>
			    <div class="modal-body clearfix">
			    	<?php remove_filter( 'the_content', 'dhp_mod_page_content' ); ?>
			    	<?php echo apply_filters( 'the_content', $tip_obj->post_content ); ?>
			    </div>
			    <div class="reveal-modal-footer clearfix ">
			      <ul class="button-group right"><li><a class="button close-tip" >Close</a></li></ul>
			    </div>
			  </div>
			    <a class="close-reveal-modal close-tip">&#215;</a>
			</div>
			<?php
			return ob_get_clean();
		}
			// PURPOSE: Load template in html to be called by javascript
		static function dhp_external_page_content() {
			ob_start(); ?>
			<div id="externalModal" class="reveal-modal medium" data-reveal>
			  <div class="modal-content">
			    <div class="modal-header">
			      <h1>External Page</h1>
			    </div>
			    <div class="modal-body clearfix">
			    </div>
			    <div class="reveal-modal-footer clearfix ">
			      <ul class="button-group right"><li><a class="button close-tip" >Close</a></li></ul>
			    </div>
			  </div>
			    <a class="close-reveal-modal close-tip">&#215;</a>
			</div>
			<?php
			echo ob_get_clean();
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
			$global_tip = false;

			if(get_option('tip_url')) {
				$global_tip = true;
			}
			wp_enqueue_script( 'jquery' );
			wp_enqueue_style( 'dhp-foundation-style', plugins_url('/lib/foundation-5.1.1/css/foundation.min.css',  dirname(__FILE__)));
	        wp_enqueue_style( 'dhp-foundation-icons', plugins_url('/lib/foundation-icons/foundation-icons.css',  dirname(__FILE__)));
	        wp_enqueue_script( 'dhp-foundation', plugins_url('/lib/foundation-5.1.1/js/foundation.min.js', dirname(__FILE__)), 'jquery');
			wp_enqueue_script( 'dhp-modernizr', plugins_url('/lib/foundation-5.1.1/js/vendor/modernizr.js', dirname(__FILE__)), 'jquery');
			
			wp_enqueue_style( 'dhp-global-settings', plugins_url('/css/dhp-global-settings.css',  dirname(__FILE__)), '', DHP_PLUGIN_VERSION);
	        
				// Load styles
			// wp_enqueue_style( 'dhp-global-settings-styles' );
				// Load scripts
			wp_enqueue_script( 'dhp-global-settings-script' );
				// Print settings to page
			wp_localize_script( 'dhp-global-settings-script', 'dhpGlobals', array(
				'global_tip' => $global_tip,
				'timeout_duration' => get_option( 'timeout_duration' ),
				'redirect_url' => get_option( 'redirect_url' ),
				'kiosk_mode' => get_option( 'kiosk_mode' ),
				'kiosk_useragent' => get_option( 'kiosk_useragent' ),
				'kiosk_blockurls' => get_option( 'kiosk_blockurls' ),
				'dhp_love' => get_option( 'dhp_love' )
			) );
		}
	}
}
if( class_exists( 'DHPressSettings' ) ) {
	DHPressSettings::init();
}
