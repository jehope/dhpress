=== Term Menu Order ===
Contributors: jameslafferty,billerickson
Tags: developer, menu order, terms, taxonomy, taxonomies, wp_terms, menu_order
Donate link: https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=JSL4JTA4KMZLG
Requires at least: 3.0.1
Tested up to: 3.4.1
Stable tag: 0.4

Creates a 'menu_order' column to specify term order, allowing theme and plugin developers to sort term by menu order.

== Description ==

This plugin is intended as an aid to theme and plugin developers. 

The purpose of the plugin is to allow arbitrary sorting of terms, similar to pages. This allows queries that
fetch terms to use 'menu_order' as a sort order. Here's an example:

`$terms = get_terms('category', array( 'orderby' => 'menu_order' ) );`

[Documentation](https://github.com/billerickson/Term-Menu-Order/wiki) | [Support Forum](https://github.com/billerickson/Term-Menu-Order/issues)

== Installation ==
1. Upload the term-menu-order to /wp-content/plugins/.
1. Activate the plugin through the "Plugins" menu in WordPress.
1. You will now be able to set an 'Order' field for categories, tags and custom taxonomy terms.

== Screenshots ==
1. 'menu_order' available in Quick Edit.
2. 'menu_order' available when adding a new term.
3. 'menu_order' available when editing a term.

== Changelog ==

= 0.4.0 =
* Only delete data when plugin is deleted, not on deactivation
* Other minor bug fixes based on messages in support forum

= 0.3.1 =
* Re-added French language support.
* Added Spanish language support. Thank you to Ivan Vasquez for this contribution!

= 0.3 =
* Updated plugin to make menu_order work (broke in WordPress 3.2).
* Removed script that was breaking quick edit
* Added 'term_menu_order_taxonomies' filter to let you specify which taxonomies it applies to.

= 0.2 = 
* Added French language support. Thank you to Frederick Marcoux for this contribution!

= 0.1.3 =
* Updated autoloader to include try... catch block for handling autoload exceptions.

= 0.1.2 =
* Attached plugin init to 'init' action hook instead of 'after_theme_setup' to catch custom taxonomies added by theme.

= 0.1 =
* First release.

== Upgrade Notice ==
= 0.3.1 =
* Re-integrates French language support.
* Adds Spanish language support.

= 0.3 =
* Update to make menu_order work again
* Removed script that was breaking quick edit.
* Added term_menu_order_taxonomies to apply fix to specific taxonomies only.

= 0.2 =
* Adds French language support.

= 0.1.3
* Bug fix for autoloader error. Error is of the form "Fatal error: Uncaught exception 'LogicException' with message...".

= 0.1.2 =
* Bug fix for custom taxonomies added in the theme.

= 0.1 =
* First release.

== Internationalization (i18n) ==

This plugin has been translated into the languages listed below:

* es_ES - Spanish. Thank you to Ivan Vasquez for contributing!
* fr_FR - French. Thank you to Frederick Marcoux for contributing!

If you're interested in doing a translation into your language, please let me know.
