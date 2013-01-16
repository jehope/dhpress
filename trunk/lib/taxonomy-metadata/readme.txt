=== Taxonomy Metadata ===
Contributors: mitchoyoshitaka, sirzooro
Author: mitcho (Michael Yoshitaka Erlewine), sirzooro
Author URI: http://mitcho.com/
Plugin URI: http://mitcho.com/code/
Donate link: http://tinyurl.com/donatetomitcho
Tags: infrastructure, taxonomy, metadata, API
Requires at least: 3.0
Tested up to: 3.3
Stable tag: 0.3

Infrastructure plugin which implements metadata functionality for taxonomy terms, including for tags and categories.

== Description ==

This plugin implements the metadata infrastructure for taxonomy terms, so you can add custom metadata (by key) to tags, categories, and other taxonomies. The majority of the code is from [sirzooro's submission](http://core.trac.wordpress.org/ticket/10142) to the WordPress Core Trac. The rest of the plugin is simply some hacky glue to make this work without modifying the Core. It *does not* implement any UI for taxonomy term metadata.

The plugin implements the following functions, from which you can build your own custom UI and display code:

`add_term_meta($term_id, $meta_key, $meta_value, $unique)`: Add meta data field to a term.

 * @param int $term_id Post ID.
 * @param string $key Metadata name.
 * @param mixed $value Metadata value.
 * @param bool $unique Optional, default is false. Whether the same key should not be added.
 * @return bool False for failure. True for success.

`delete_term_meta($term_id, $meta_key, $meta_value)`: Remove metadata matching criteria from a term. You can match based on the key, or key and value. Removing based on key and value, will keep from removing duplicate metadata with the same key. It also allows removing all metadata matching key, if needed.

 * @param int $term_id term ID
 * @param string $meta_key Metadata name.
 * @param mixed $meta_value Optional. Metadata value.
 * @return bool False for failure. True for success.

`get_term_meta($term_id, $key, $single)`: Retrieve term meta field for a term.

 * @param int $term_id Term ID.
 * @param string $key The meta key to retrieve.
 * @param bool $single Whether to return a single value.
 * @return mixed Will be an array if $single is false. Will be value of meta data field if $single is true.

`update_term_meta($term_id, $meta_key, $meta_value, $prev_value)`: Update term meta field based on term ID. Use the $prev_value parameter to differentiate between meta fields with the same key and term ID. If the meta field for the term does not exist, it will be added.

 * @param int $term_id Term ID.
 * @param string $key Metadata key.
 * @param mixed $value Metadata value.
 * @param mixed $prev_value Optional. Previous value to check before removing.
 * @return bool False on failure, true if success.

Development of this plugin was supported by the [Massachusetts Institute of Technology Shakespeare Project](http://globalshakespeares.org/).

== Changelog ==

= 0.3 =
* Better Network Activation handling:
	* install necessary tables for each blog on Network Activate
	* if Network Activated, install necessary table when new blogs are created

= 0.2 =
* Made Multisite-compatible, thanks to Matt Wiebe!

= 0.1 =
* Initial upload
