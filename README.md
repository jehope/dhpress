# DH Press - Digital Humanities Toolkit

Contributors: gaelicmichael, jehope, bgaston  
Project Manager: Pamella Lach  
Donate link: http://dhpress.org/  
Tags: plugin, map, open layers, markers, humanities, toolkit, video, historical, tours  
Requires at least: 3.4  
Tested up to: 3.8  
Stable tag: 2.0  
License: GPLv2 or later  
License URI: http://www.gnu.org/licenses/gpl-2.0.html  

### This is a legacy repository. For DH Press versions 2.5 onwards, go to [https://github.com/Digital-Innovation-Lab/dhpress](https://github.com/Digital-Innovation-Lab/dhpress)
 
DHPress is a flexible, repurposable, fully extensible digital public humanities toolkit designed for non-technical users.  
  
== Description ==

The digital public humanities toolkit, DH Press (formerly, diPH) is built on the WordPress platform and its plugin-based architecture.

DH Press is a flexible, repurposable, fully extensible digital public humanities toolkit designed for non-technical users. It enables administrative users to build web-based community projects that combine interactive historical maps, tags, categories, metadata, and multimedia objects (including videos, web pages, images, placemarkers, and virtual walking tours). WordPress’s plugin architecture allows for open and unlimited enhancement of features and functionalities.

Building DH Press on WordPress offers the following important benefits: 
	1) its CMS provides a stable and robust core, 
	2) it allows us to tap into a broad community of developers and users and to contribute new plugins to the WordPress community, and 
	3) it facilities agile development through plugin modification. 
	
Thus, building DH Press on top of the WordPress CMS results in a truly sustainable, open-source, and extensible toolkit that can be used and re-used across the globe.

== Installation ==

1. Download the [latest release](https://github.com/jehope/dhpress/releases).  
2. Install the zip on your plugins page or upload unzipped to the '/wp-content/plugins/' directory.
3. Activate the plugin through the 'Plugins' menu in WordPress


== Using a development version ==

At your own risk:  

1. Download zip
2. Rename trunk folder to 'dhpress-vX.X.X'
3. Upload renamed folder to the '/wp-content/plugins/' directory 
4. Activate the plugin through the 'Plugins' menu in WordPress 


== Frequently Asked Questions ==

= How do I get a project to show up =

Go to DHPress > New Project and create a new project to get started


== Changelog ==

Posted on [release page](https://github.com/jehope/dhpress/releases).

= 2.0 =
* Entirely new Admin edit panel
* TopicCards visualization
* Multiple Entry Points
* and much more...

= 1.9.4 =
* Implemented Leaflet on Map preview page
* Deleted OpenLayers files
* Minor error fixes

= 1.9.0 =
* Removed OpenLayers and implemented [Leaflet](http://leafletjs.org) mapping API on project pages.

= 1.8.0 = 
* Created settings page with kiosk mode features
* Set base maps to have 20 zoom levels by default
* Updated OpenLayers to 2.13
* Switched to Zurb Foundation for frontend html
* For more details see past [pull requests](https://github.com/jehope/dhpress/pulls?direction=desc&page=1&sort=created&state=closed)

= 1.7.0 = 
* Include two side by side transcripts
* Code cleanup and restructuring

= 1.6.0 = 
* Filter compares terms based on ID not name. 
* Fixed term assignment when legends are created.
* Added show all checkbox to legends.

= 1.5.0 = 
* Updated views for modals, links can be customized.
* Two transcripts can be included side by side(modal only).

= 1.4.0 =
* Filter markers based on project.
* Category aliases enabled.

= 1.3.0 = 
* Included CSV Importer into the DHPress install process

= 1.2.0=
* Naming convention changed to dhp
* Category creation updated to be more stable
* Branding icons added

= 1.1.1=
* Beta release candidate overhaul

= 1.0.1=
* Stable beta release candidate

= 0.1 =
* Initial build of diph plugin. No functionality enabled yet
