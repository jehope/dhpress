=== CSV Importer ===
Contributors: dvkob
Donate link: https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=4YJEU5U2Y4LTS&lc=US&item_name=Support%20CSV%20Importer%20development&currency_code=USD&bn=PP%2dDonationsBF%3abtn_donateCC_LG%2egif%3aNonHosted
Tags: csv, import, batch, spreadsheet, excel
Requires at least: 2.0.2
Tested up to: 3.2.1
Stable tag: 0.3.6

Import posts from CSV files into WordPress.


== Description ==

This plugin imports posts from CSV (Comma Separated Value) files into your
WordPress blog. It can prove extremely useful when you want to import a bunch
of posts from an Excel document or the like - simply export your document into
a CSV file and the plugin will take care of the rest.

= Features =

*   Imports post title, body, excerpt, tags, date, categories etc.
*   Supports custom fields, custom taxonomies and comments
*   Deals with Word-style quotes and other non-standard characters using
    WordPress' built-in mechanism (same one that normalizes your input when you
    write your posts)
*   Columns in the CSV file can be in any order, provided that they have correct
    headings
*   Multilanguage support


== Screenshots ==

1.  Plugin's interface


== Installation ==

Installing the plugin:

1.  Unzip the plugin's directory into `wp-content/plugins`.
1.  Activate the plugin through the 'Plugins' menu in WordPress.
1.  The plugin will be available under Tools -> CSV Importer on
    WordPress administration page.


== Usage ==

Click on the CSV Importer link on your WordPress admin page, choose the
file you would like to import and click Import. The `examples` directory
inside the plugin's directory contains several files that demonstrate
how to use the plugin. The best way to get started is to import one of
these files and look at the results.

CSV is a tabular format that consists of rows and columns. Each row in
a CSV file represents a post; each column identifies a piece of information
that comprises a post.

= Basic post information =

*   `csv_post_title` - title of the post
*   `csv_post_post` - body of the post
*   `csv_post_type` - `post`, `page` or a custom post type.
    __New in version 0.3.2__
    In prior versions, importing rows as pages could be specified on a
    per-file basis using the plugins UI. In 0.3.2, `csv_post_type` column
    was added to support custom post types as well.
    Refer to the WordPress
    [documentation on custom post types][custom_post_types] for more info
    on how to set up custom post types.
*   `csv_post_excerpt` - post excerpt
*   `csv_post_categories` - a comma separated list of category names or ids.
    __New in version 0.3.5__
    It's also possible to assign posts to non-existing subcategories, using
    &gt; to denote category relationships, e.g. `Animalia > Chordata > Mammalia`.
    If any of the categories in the chain does not exist, the plugin will
    automatically create it. It's also possible to specify the parent category
    using an id, as in `42 > Primates > Callitrichidae`, where `42` is an
    existing category id.
*   `csv_post_tags` - a comma separated list of tags.
*   `csv_post_date` - about any English textual description of a date and time.
    For example, `now`, `11/16/2009 0:00`, `1999-12-31 23:55:00`, `+1 week`,
    `next Thursday`, `last year` are all valid descriptions. For technical
    details, consult PHP's `strtotime()` function [documentation][strtotime].

[custom_post_types]: http://codex.wordpress.org/Custom_Post_Types
[strtotime]: http://php.net/manual/en/function.strtotime.php

= Custom fields =

Any column that doesn't start with `csv_` is considered to be a custom field
name. The data in that column will be imported as the custom fields value.

= General remarks =

*   WordPress pages [don't have categories or tags][pages].
*   Most columns are optional. Either `csv_post_title`, `csv_post_post` or
    `csv_post_excerpt` are sufficient to create a post. If all of these
    columns are empty in a row, the plugin will skip that row.
*   The plugin will attempt to reuse existing categories or tags; if an
    existing category or tag cannot be found, the plugin will create it.
*   To specify a category that has a greater than sign (>) in the name, use
    the HTML entity `&gt;`

[pages]: http://codex.wordpress.org/Pages

= Advanced usage =

*   `csv_post_author` - numeric user id or login name. If not specified or
    user does not exist, the plugin will assign the posts to the user
    performing the import.
*   `csv_post_slug` - post slug used in permalinks.
*   `csv_post_parent` - post parent id.

== Custom taxonomies ==

__New in version 0.3.0__

Once custom taxonomies are set up in your theme's functions.php file or
by using a 3rd party plugin, `csv_ctax_(taxonomy name)` columns can be 
used to assign imported data to the taxonomies.

__Non-hierarchical taxonomies__

The syntax for non-hierarchical taxonomies is straightforward and is essentially
the same as the `csv_post_tags` syntax.

__Hierarchical taxonomies__

The syntax for hierarchical taxonomies is more complicated. Each hierarchical
taxonomy field is a tiny two-column CSV file, where _the order of columns
matters_. The first column contains the name of the parent term and the second
column contains the name of the child term. Top level terms have to be preceded
either by an empty string or a 0 (zero).

Sample `examples/custom-taxonomies.csv` file included with the plugin
illustrates custom taxonomy support. To see how it works, make sure to set up
custom taxonomies from `functions.inc.php`.

Make sure that the quotation marks used as text delimiters in `csv_ctax_`
columns are regular ASCII double quotes, not typographical quotes like “
(U+201C) and ” (U+201D).

== Comments ==

__New in version 0.3.1__

An example file with comments is included in the `examples` directory.
In short, comments can be imported along with posts by specifying columns
such as `csv_comment_*_author`, `csv_comment_*_content` etc, where * is
a comment ID number. This ID doesn't go into WordPress. It is only there
to have the connection information in the CSV file.


== Frequently Asked Questions ==

> I have quotation marks and commas as values in my CSV file. How do I tell CSV
Importer to use a different separator?

It doesn't really matter what kind of separator you use if your file is
properly escaped. To see what I mean by proper escaping, take a look at
`examples/sample.csv` file which has cells with quotation marks and commas.

If the software you use for exporting to CSV is unable to escape quotation
marks and commas, you might want to give [OpenOffice Calc][calc] a try.

[calc]: http://www.openoffice.org/

> How can I import characters with diacritics, Cyrillic or Han characters?

Make sure to save your CSV file with utf-8 encoding.

Prior to version 6.0.4, MySQL [did not support][5] some rare Han characters. As
a workaround, you can insert characters such as &#x2028e; (U+2028E) by
converting them to HTML entities - &amp;\#x2028e;

[5]: http://dev.mysql.com/doc/refman/5.1/en/faqs-cjk.html#qandaitem-24-11-1-13

> I cannot import anything - the plugin displays "Imported 0 posts in 0.01
seconds."

Update to version 0.3.1 or greater. Previous versions required write access to
the /tmp directory and the plugin failed if access was denied by PHP's safe
mode or other settings.

> I'm importing a file, but not all rows in it are imported and I don't see
a confirmation message. Why?

WordPress can be many things, but one thing it's not is blazing fast. The
reason why not all rows are imported and there's no confirmation message is
that the plugin times out during execution - PHP decides that it has been
running too long and terminates it.

There are a number of solutions you can try. First, make sure that you're not
using any plugins that may slow down post insertion. For example, a Twitter
plugin might attempt to tweet every post you import - not a very good idea
if you have 200 posts. Second, you can break up a file into smaller chunks that
take less time to import and therefore will not cause the plugin to time out.
Third, you can try adjusting PHP's `max_execution_time` option that sets how
long scripts are allowed to run. Description of how to do it is beyond the
scope of this FAQ - you should search the web and/or use your web host's help
to find out how. However, putting the following line in `.htaccess` file inside
public_html directory works for some people:

    # Sets max execution time to 2 minutes. Adjust as necessary.
    php_value max_execution_time 120

The problem can be approached from another angle, namely instead of giving
scripts more time to run making them run faster. There's not much I can do to
speed up the plugin (you can contact me at dvkobozev at gmail.com if you like
to prove me wrong), so you can try to speed up WordPress. It is a pretty broad
topic, ranging from database optimizations to PHP accelerators such as APC,
eAccelerator or XCache, so I'm afraid you're on your own here.

> I receive the following error when I try to import my CSV file: "Invalid CSV
file: header length and/or row lengths do not match". What's wrong with your
plugin/my file?

Short answer: update to version 0.2.0 or later. Longer answer: the number of
fields (values) in rows in your file does not match the number of columns.
Version 0.2.0 pads such rows with empty values (if there are more columns than
cells in a row) or discards extra fields (if there are less columns than cells
in a row).

> I'm getting the following error: `Parse error: syntax error, unexpected
T_STRING, expecting T_OLD_FUNCTION or T_FUNCTION or T_VAR or '}' in .../public_html/wp-content/plugins/csv-importer/File_CSV_DataSource/DataSource.php
on line 61`. What gives?

This plugin requires PHP5, while you probably have PHP4 or older. Update your
PHP installation or ask your hosting provider to do it for you.


== Credits ==

This plugin uses [php-csv-parser][3] by Kazuyoshi Tlacaelel.
It was inspired by JayBlogger's [CSV Import][4] plugin.

Contributors:

*   Kevin Hagerty (post_author support)
*   Edir Pedro (root category option and tableless HTML markup)
*   Frank Loeffler (comments support)
*   Micah Gates (subcategory syntax)
*   David Hollander (deprecation warnings, linebreak handling)

[3]: http://code.google.com/p/php-csv-parser/
[4]: http://www.jayblogger.com/the-birth-of-my-first-plugin-import-csv/


== Changelog ==

= 0.3.7 =
*   Make hierarchical custom taxonomy line splitting more robust
*   Fix deprecation warnings

= 0.3.6 =
*   Fix category cleanup bug

= 0.3.5 =
*   Added 'greater-than' category syntax
*   Updated the docs

= 0.3.4 =
*   Added csv_post_parent column
*   Updated the docs
*   Got rid of a deprecation warning

= 0.3.3 =
*   Fixes incompatibility with versions of WordPress prior to 3.0 introduced
    in previous release.

= 0.3.2 =
*   Added ability to specify custom post type.

= 0.3.1 =
*   Import comments.
*   Updated php-csv-parser - the plugin should no longer create files in /tmp.

= 0.3.0 =
*   Custom taxonomies.

= 0.2.4 =
*   Root category selection, cleaner HTML.

= 0.2.3 =
*   Slight speed increase, support for post_author and post_name.

= 0.2.2 =
*   Bugfix release to deal with BOM that may occur in UTF-8 encoded files.

= 0.2.1 =
*   Ability to import rows as pages, not posts.
*   Starting with this version, you can also specify category ids instead of
    names.

= 0.2.0 =
*   Ability to handle CSV files where the number of cells in rows does not
    match the number of columns
*   Smart date parsing
*   Code cleanup.

= 0.1.3 =
*   New option to import posts with published status.

= 0.1.2 =
*   Added support for post excerpts.

= 0.1.1 =
*   Code cleanup
*   Changed column names for CSV input. Sorry if it breaks anything for you,
    folks, but it had to be done in order to allow for custom fields such as
    `title` ([All in One SEO Pack][1] uses those, for example).

= v0.1.0 =
*   Initial version of the plugin

[1]: http://wordpress.org/extend/plugins/all-in-one-seo-pack/


== Upgrade Notice ==

= 0.3.7 =
More robust handling of hierarchical custom taxonomies; removed deprecation
warnings.

= 0.3.6 =
Fix for 'Invalid argument supplied for foreach() on line 268' error message

= 0.3.5 =
Subcategory creation support. Documentation update.

= 0.3.4 =
Post parent support. Documentation update.

= 0.3.3 =
Fixes "Call to undefined function post_type_exists()" error for versions of
Wordpress prior to 3.0

= 0.3.2 =
Adds support for custom post types. Option to import pages has been removed from
the interface. To import a page, add csv_post_type column to your csv file and
set it to "page".

= 0.3.1 =
Adds support for comments

= 0.3.0 =
Adds support for custom taxonomies

