<?php

//if uninstall not called from WordPress exit
if ( !defined( 'WP_UNINSTALL_PLUGIN' ) )
	exit ();

// Remove the 'menu_order' column
global $wpdb;
$sql = "ALTER TABLE `{$wpdb->terms}` DROP COLUMN `menu_order`;";
$wpdb->query( $sql );
	
