<?php
/*
Plugin Name: Digital Public Humanities Toolkit
Plugin URI: http://diph.org/download
Description: diPH is a flexible, repurposable, fully extensible digital public humanities toolkit designed for non-technical users.
Version: 0.1.2
Author: diPH Team: Joe E Hope, Bryan Gaston, Pam Lach
Author URI: http://diph.org/team
License: GPLv2
*/
/*  Copyright 2012  diPH Team  (email : info@diph.org)

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License, version 2, as 
    published by the Free Software Foundation.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program; if not, write to the Free Software
    Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
*/



define( 'DIPH_NAME', 'Digital Public Humanities Toolkit' );
define( 'DIPH_REQUIRED_PHP_VERSON', '5.2' );
define( 'DIPH_REQUIRED_WP_VERSION', '3.1' );
define( 'DIPH_PLUGIN_DIR', WP_PLUGIN_DIR."/".dirname(plugin_basename(__FILE__)) );
define( 'DIPH_PLUGIN_URL', plugins_url('', __FILE__ ) );
/**
 * Checks if the system requirements are met
 * @return bool True if system requirements are met, false if not
 */
function diph_requirements_met()
{
	global $wp_version;
	
	if( version_compare( PHP_VERSION, DIPH_REQUIRED_PHP_VERSON, '<') )
		return false;
	
	if( version_compare( $wp_version, DIPH_REQUIRED_WP_VERSION, "<") )
		return false;
	
	return true;
}

/**
 * Prints an error that the system requirements weren't met.
 */
function diph_requirements_not_met()
{
	global $wp_version;
	
	echo sprintf('
		<div id="message" class="error">
			<p>
				%s <strong>requires PHP %s</strong> and <strong>WordPress %s</strong> in order to work. You\'re running PHP %s and WordPress %s. You\'ll need to upgrade in order to use this plugin. If you\'re not sure how to <a href="http://codex.wordpress.org/Switching_to_PHP5">upgrade to PHP 5</a> you can ask your hosting company for assistance, and if you need help upgrading WordPress you can refer to <a href="http://codex.wordpress.org/Upgrading_WordPress">the Codex</a>.
			</p>
		</div>',
		DIPH_NAME,
		DIPH_REQUIRED_PHP_VERSON,
		DIPH_REQUIRED_WP_VERSION,
		PHP_VERSION,
		esc_html( $wp_version )
	);
}

// Check requirements and instantiate
if( diph_requirements_met() )
{
   include_once( dirname(__FILE__) . '/php/diph-core.php' );
}
else
	add_action( 'admin_notices', 'diph_requirements_not_met' );

?>