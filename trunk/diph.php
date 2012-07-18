<?php
/*
Plugin Name: Digital Public Humanities Toolkit
Plugin URI: http://diph.org/download
Description: diPH is a flexible, repurposable, fully extensible digital public humanities toolkit designed for non-technical users.
Version: 0.1.0
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
add_action('admin_menu', 'myplugin_menu_pages');

function myplugin_menu_pages() {
    // Add the top-level admin menu
    $page_title = 'My Plugin Settings';
    $menu_title = 'My Plugin';
    $capability = 'manage_options';
    $menu_slug = 'myplugin-settings';
    $function = 'myplugin_settings';
    add_menu_page($page_title, $menu_title, $capability, $menu_slug, $function);

    // Add submenu page with same slug as parent to ensure no duplicates
    $sub_menu_title = 'Settings';
    add_submenu_page($menu_slug, $page_title, $sub_menu_title, $capability, $menu_slug, $function);

    // Now add the submenu page for Help
    $submenu_page_title = 'My Plugin Help';
    $submenu_title = 'Help';
    $submenu_slug = 'myplugin-help';
    $submenu_function = 'myplugin_help';
    add_submenu_page($menu_slug, $submenu_page_title, $submenu_title, $capability, $submenu_slug, $submenu_function);

	add_submenu_page('edit.php', 'Custom Post Type Admin', 'Custom Settings', 'edit_posts', 'myplugin-edit', $submenu_function);
}

function myplugin_settings() {
    if (!current_user_can('manage_options')) {
        wp_die('You do not have sufficient permissions to access this page.');
    }

    // Render the HTML for the Settings page or include a file that does
}

function myplugin_help() {
    if (!current_user_can('manage_options')) {
        wp_die('You do not have sufficient permissions to access this page.');
    }

    // Render the HTML for the Help page or include a file that does
}

?>