<?php
/*
Plugin Name: DH Press | Digital Humanities Toolkit
Plugin URI: http://dhpress.org/download
Description: DHPress is a flexible, repurposable, fully extensible digital humanities toolkit designed for non-technical users.
Version: 2.5.6
Author: DHPress Team: Michael Newton, Joe E Hope, Pam Lach
Author URI: http://dhpress.org/team
License: GPLv2
*/
/*  Copyright 2014  DHPress Team  (email : info@dhpress.org)

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


define( 'DHP_NAME', 'Digital Humanities Toolkit' );
define( 'DHP_REQUIRED_PHP_VERSION', '5.2' );
define( 'DHP_REQUIRED_WP_VERSION', '3.1' );
define( 'DHP_PLUGIN_URL', plugins_url('', __FILE__ ) );
define( 'DHP_MAPS_TABLE_VERSION', '0.1' );
define( 'DHP_PLUGIN_VERSION', '2.5.6' );
define( 'SCRIPT_DEBUG', true );

/**
 * Checks if the system requirements are met
 * @return bool True if system requirements are met, false if not
 */
function dhp_requirements_met()
{
	global $wp_version;
	
	if( version_compare( PHP_VERSION, DHP_REQUIRED_PHP_VERSION, '<') )
		return false;
	
	if( version_compare( $wp_version, DHP_REQUIRED_WP_VERSION, "<") )
		return false;
	
	return true;
}

/**
 * Prints an error that the system requirements weren't met.
 */
function dhp_requirements_not_met()
{
	global $wp_version;
	
	echo sprintf('
		<div id="message" class="error">
			<p>
				%s <strong>requires PHP %s</strong> and <strong>WordPress %s</strong> in order to work. You\'re running PHP %s and WordPress %s. You\'ll need to upgrade in order to use this plugin. If you\'re not sure how to <a href="http://codex.wordpress.org/Switching_to_PHP5">upgrade to PHP 5</a> you can ask your hosting company for assistance, and if you need help upgrading WordPress you can refer to <a href="http://codex.wordpress.org/Upgrading_WordPress">the Codex</a>.
			</p>
		</div>',
		DHP_NAME,
		DHP_REQUIRED_PHP_VERSION,
		DHP_REQUIRED_WP_VERSION,
		PHP_VERSION,
		esc_html( $wp_version )
	);
}



// Check requirements and instantiate
if( dhp_requirements_met() )
{
	include_once( dirname(__FILE__) . '/php/dhp-core.php' );
}
else
	add_action( 'admin_notices', 'dhp_requirements_not_met' );
?>