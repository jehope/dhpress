<?php
/******************************************************************************
 ** DHPressProject class  (see below for DHPressMarkerQuery class)
 ** PURPOSE: Encapsulate (some) implementation details of Projects on WordPress
 ** ASSUMES: Running in WordPress environment
 ** NOTES:   Class attempts to do "lazy loading": only retrieve data when needed
 **			 Settings is an array/JSON object, whose structure depends on version;
 **				conversion between them is done by ensureSettings().
 
 **		VERSION 3 (DH Press 2.0+)
 **			"general": {
		        "id": Integer,										// ID of Project
		        "name": String,
		        "version": Integer,									// Must be 3
		        "homeLabel": String,
		        "homeURL": String,
		        "mTitle": String 									// Mote to use for title of Markers, or the_title
		    },
		    "motes": [
		        {
		            "name": String,
		            "type": String, (name of data type)
		            "cf": String, (name of custom field which holds value)
		            "delim": String (containing a character or empty string)
		        }, ...
		    ],
		    "eps": [										// contents of settings depends on type of entry point
		    	{
		            "type": String ("map" | "cards" | "pinboard" | "tree" | "time" | "flow" | "browser"),
		            "label" : String (short and unique across entry points),
									// Map settings are as follows
		            "settings": {
		                "lat": Number,
		                "lon": Number,
		                "zoom": Number,
		                "size": Character,							// "s" | "m" | "l"
		                "layers": [
		                    Index: {
		                		"opacity": Number,
		                        "id": Number,
		                        "name": String,
		                        "mapType": String ("type-Blank", "type-OSM", "type-DHP"),
		                        "mapTypeId": String,
		                    }, ...
		                ],
		                "coordMote": String (name of mote),			// Mote used for geo coord
		                "legends": [							// List of mote Legends/categories
		                    String (name of mote), ...
		                ]
		            }
									// Topic Cards settings are as follows
		            "settings" : {
		            	"titleOn": Boolean,							// true if marker title is to be shown as card title on top
		            	"width" : String,							// card width: "auto", thin", "med-width", "wide"
		            	"height" : String,							// card height: "auto", "short", "med-height", "tall"
						"color": String (name of mote),				// to determine color of card
						"defColor" : String (CSS color to use),		// as default when no mote value
						"bckGrd" : String (CSS color or # hex),
						"content" : [
							// Array of mote names (or the_content) to show in card content
						],
						"filterMotes": [
							// Array of mote names to use to filter cards (Short Text, Number types)
						],
						"sortMotes": [
							// Array of mote names to use to sort cards (Short Text, Number types)
						]
		            }
									// Pinboard settings are as follows
		            "settings" : {
		                "imageURL" : String,						// complete URL to background image
		            	"width" : Number,							// Pixel width of background image
		            	"height" : Number,							// Pixel height of background image
		                "size": Character,							// relative size of markers: "s" | "m" | "l"
		                "icon": String,								// Name of icon marker to use or "disable"
						"coordMote": String (name of mote),			// mote which supplies X-Y coordinate
						"animscript": String,						// URL to animation script
						"animSVG": String,							// URL to SVG file for animation
						"ytvcode": String,							// YouTube video code for animation (if any)
		                "legends": [								// List of mote Legends/categories
		                    String (name of mote), ...
		                ],
		                "layers": [									// List of SVG layers to add on top of image
		                	{ label: String,
		                	  file: String (complete URL)
		                	} , ...
		                ]
		            }
									// Tree settings are as follows
		            "settings" : {
		            	"form" : String,							// Tree form: flat, radial, segment
		            	"width" : Number,							// Pixel width of tree visualization
		            	"height" : Number,							// Pixel height of tree visualization
		            	"head" : String,							// ID of marker which is head/top of tree
		            	"children" : String (name of mote),			// Mote that supplies names of next generation
		            	"fSize" : Number,							// Size of label font in pixels
		            	"radius" : Number,							// Size of circles in pixels (when used)
		            	"padding" : Number,							// Size of padding (in pixels - form dependent)
		                "color": String (name of mote)				// For color of mote
		            }
									// Timeline settings are as follows
		            "settings" : {
						 "date" : String (name of mote),			// mote which provides date range
		                 "color" : String (name of mote),           // mote to determine color of card
		                 "bandHt" : Integer,                        // pixel height of top band rows (also used for fontSize)
		                 "wAxisLbl" : Integer,                      // pixel width of min/max labels on axis
		                 "from" : Date,                             // Earliest date to show in timeline
		                 "to"   : Date,                             // Latest date to show in timeline
		                 "openFrom": Date,                          // Initial window's start (begin date)
		                 "openTo": Date                             // Initial window's start (end date)
             		}
									// Facet Flow settings are as follows
		            "settings" : {
		            	"width" : Number,							// Pixel width of tree visualization
		            	"height" : Number,							// Pixel height of tree visualization
		                "motes": [									// List of mote Legends/categories
		                    String (name of mote), ...
		                ]
             		}
									// Facet Browser settings are as follows
		            "settings" : {
		                "motes": [									// List of mote Legends/categories
		                    String (name of mote), ...
		                ],
		                "dateGrp": "exact"|"month"|"year"|"decade"|"century" // granularity of dates grouped together
             		}

		        }
		    },
		    "views": {
		        "fullscreen": false | true,
		        "miniWidth": Integer,						// Size of visualization window (non-full screen)
		        "miniHeight": Integer,
		    	"post" : {									// For Marker post pages
			        "title": String,						// Title to give Marker modal
			        "content": [ String, ...  ]				// Names of motes to show
		    	},
		    	"select" : {								// For modal when item selected from visualation
			        "width": "tiny" | "small" | "medium" | "large" | "x-large",
			        "widgets": [							// List of 'widgets' to display in selected Marker modal
			        	'scloud' | 'youtube'
			        ],
			        "content": [							// Motes to show when Marker selected in visualization
			            String (mote name || "the_content"), ...
			        ],
			        "link" : [ "disable" | "marker" | name of mote whose tax/category page to link to ],
			        "linkLabel" : String,
			        "linkNewTab": true or false,
			        "link2": [ "disable" | "marker" | name of mote whose tax/category page to link to ],
			        "link2Label" : String
			        "link2NewTab": true or false,
		    	}
		        "transcript" : {
					"audio" 	: Name of mote (that contains last part of URL to audio file)
					"transcript" : Name of mote (that contains URL to textual transcription of original),
					"transcript2" : Name of mote (that contains URL to textual transcription of any translation),
					"timecode" : Name of mote (that contains the timestamp),
					"source"	: Name of mote with common value across excerpts of transcripts (taxonomy category),
					"content"	: [							// Motes to show when tax/archive page shown
			            String (mote name), ...
					]
		        }
		    }
  **/

class DHPressProject
{
	    // OBJECT PROPERTIES
		//======================
    private $id;						// ID of Project (-1 = unset)
    private $settings;					// Settings object for Project (null = unset)

    	// CLASS METHODS
		//======================

    	// PURPOSE: Determine name of "root" taxonomic term for project
	static public function ProjectIDToRootTaxName($projectID)
    {
		return 'dhp_tax_'.$projectID;
    }

    	// PURPOSE: Determine project ID given name of "root" taxonomic term
	static public function RootTaxNameToProjectID($rootTaxName)
    {
    	$pieces = explode("dhp_tax_", $rootTaxName);
		return $pieces[1];
    }

	    // PUBLIC OBJECT METHODS
		//======================

    	// PURPOSE: Create new, empty Project
    public function __construct($projectID)
    {
    	if (sizeof(func_get_args()) == 1 && !is_null($projectID)) {
	        $this->id = $projectID;
	    } else {
	    	$this->id = -1;
	    }
        $this->settings = null;
    }

    public function setID($projectID)
    {
    	$this->id = $projectID;
    }

    public function getID()
    {
    	return $this->id;
    }

    	// RETURNS: Root taxonomic name for this Project
    public function getRootTaxName()
    {
    	return DHPressProject::ProjectIDToRootTaxName($this->id);
    }

    	// PURPOSE: Force Project object to reload settings
    public function resetSettings()
    {
    	$settings = null;
    }

		// PURPOSE:	To determine all the names of custom fields associated with the Project
		// RETURNS: Array of all unique custom fields of all marker posts associated with the Project
    	// WARNING: This will reset and lose the current post
		// TO DO:	A faster way to do this? Create a sorted array/list?
    public function getAllCustomFieldNames()
    {
			//loop through all markers in Project adding to array
		$custom_field_array = array();

		$args = array(	'post_type' => 'dhp-markers',
						'meta_key' => 'project_id',
						'meta_value' => $this->id,
						'posts_per_page' => -1 );
		$loop = new WP_Query( $args );
		while ( $loop->have_posts() ) : $loop->the_post();

			$marker_id = get_the_ID();
			$temp_custom_field_keys = get_post_custom_keys($marker_id);

			foreach($temp_custom_field_keys as $key => $value) {
				$valuet = trim($value);
					// exclude WP internal fields
	     		if ( $valuet{0} == '_' )
	      			continue;
				array_push($custom_field_array, $value);
			}

		endwhile;
		wp_reset_query();

		$unique_custom_fields = array_unique($custom_field_array);
		return $unique_custom_fields;
	} // getAllCustomFieldNames()


		// getCustomFieldUniqueValues($custom_field_name,$project_id)
		// PURPOSE: Calculate the unique values for a custom field in all markers of a project
		// INPUT:	$custom_name = the field name within a marker
		// RETURNS:	Array of unique values
		// TO DO:	A faster way to do this? Create a sorted array/list?
	public function getCustomFieldUniqueValues($custom_field_name)
	{
			//loop through all markers in project & add to array
		$moteArray = array();
		$projectObj = get_post($this->id);
		$dhp_tax_name = $this->getRootTaxName();

		$args = array('post_type' => 'dhp-markers',
					'meta_key' => 'project_id',
					'meta_value'=>$this->id,
					'posts_per_page' => -1 );
		$tempMetaArray = array();
		$loop = new WP_Query( $args );
		while ( $loop->have_posts() ) : $loop->the_post();
			$tempMetaValue = get_post_meta(get_the_ID(), $custom_field_name, true);

			array_push($tempMetaArray, $tempMetaValue);
		endwhile;
		wp_reset_query();

		$result = array_unique($tempMetaArray);
		return $result;
	} // getCustomFieldUniqueValues()


	// PURPOSE: Get unique values of a custom field (w/delimiter) associated with a project
	// INPUT:	$custom_name = name of the custom field (specified by mote) for which we are creating values
	//			$delim = character separator for values in field (if any), or null if none
	// RETURNS:	Array of unique values for the custom field
	// TO DO:	A more efficient way of doing this? Sorted array?

	public function getCustomFieldUniqueDelimValues($custom_name, $delim)
	{
			// Loop through all markers in project
		$moteArray = array();

		$loop = $this->setAllMarkerLoop();
		while ( $loop->have_posts() ) : $loop->the_post();
			$marker_id = get_the_ID();

				// Get the value in this marker for the custom field
			$moteValue = get_post_meta($marker_id, $custom_name, true);

			if ($delim && $delim != '') {
				$valueArray = explode($delim, $moteValue);
				foreach ($valueArray as $value) {
		   		 	array_push($moteArray, $value);
				}
			} else {
	   		 	array_push($moteArray, $moteValue);
			}
		endwhile;
		wp_reset_query();

		$result = array_unique($moteArray);
		return $result;
	} // getCustomFieldUniqueDelimValues()


    	// RETURNS: EntryPoint settings array of given type
	public function getEntryPointByName($typeName)
	{
		$this->ensureSettings();

		foreach($this->settings->eps as $eps) {
			if($eps->type == $typeName) {
				return $eps;
			}
		}
		return null;
	} // getEntryPointByName()


    	// RETURNS: EntryPoint settings array at index, or null if $index > number of EP entries
		// INPUT:   $index = 0..n-1
	public function getEntryPointByIndex($index)
	{
		$this->ensureSettings();

		$eps = $this->settings->eps;
		if ($index >= count($eps)) {
			return null;
		}
		return $eps[$index];
	} // getEntryPointByIndex()


    	// RETURNS: All EntryPoint settings in Project
	public function getAllEntryPoints()
	{
		$this->ensureSettings();
		return $this->settings->eps;
	} // getAllEntryPoints()


		// RETURNS: Object array in settings whose name is $moteName
	public function getMoteByName($moteName)
	{ 
		$this->ensureSettings();

		foreach($this->settings->motes as $mote) {
			if($mote->name==$moteName) {
				return $mote;
			}
		}
		return null;
	} // getMoteByName()

		// RETURNS: Name of Custom Field corresponding to mote
		// ASSUMES: Only 1 custom field
	public function getCustomFieldForMote($moteName)
	{
		$mote = $this->getMoteByName($moteName);
		if ($mote == null) {
			return null;
		}
		return $mote->cf;
	} // getCustomFieldForMote()

		// RETURNS: true if the Select Modal contains $viewType
	public function selectModalHas($viewType)
	{
		$this->ensureSettings();
		if($this->settings->views->select->widgets) {
			foreach($this->settings->views->select->widgets as $vt) {
				if ($vt === $viewType) {
					return true;
				}
			}			
		}
		
		return false;
	} // selectModalHas()


		// RETURNS: All Mote settings in Project
	public function getAllMotes()
	{ 
		$this->ensureSettings();
		return $this->settings->motes;
	} // getAllMotes()


		// RETURNS: Settings array object
	public function getAllSettings()
	{
		$this->ensureSettings();
		return $this->settings;
	}


		// PURPOSE: Prepare WP query to cycle through all of Project's Markers
	public function setAllMarkerLoop()
	{
		$args = array(	'post_type' => 'dhp-markers',
						'meta_key' => 'project_id',
						'meta_value'=>$this->id,
						'posts_per_page' => -1 );
		$loop = new WP_Query( $args );
		return $loop;
	} // setAllMarkerLoop()


	    // PRIVATE OBJECT METHODS
		//======================

	static private function doCloneObject($value)
	{
		if (is_null($value)) {
			return null;
		}
		if (is_integer($value) || is_integer($value) || is_bool($value)) {
			return $value;
		}
		if (is_string($value)) {
			if ($value == '') {
				return '';
			}
			return sprintf("%s", $value);
		}
		return clone($value);
	} // doCloneObject()

	static private function doCloneArray($value)
	{
		if (is_null($value)) {
			return array();
		}
		return new ArrayObject($value);
	} // doCloneObject()


    	// PURPOSE: Ensure that Project Settings have been loaded; read if not
		//			Translate to new format of Project Settings if in old format
		// NOTE:    Calling functions must handle case when project is newly created
		//				and does not have any settings.
    private function ensureSettings()
    {
    	if ($this->id == -1) {
    		trigger_error("Project ID not set");
    	}
    		// Do we need to read the settings?
    	if (is_null($this->settings)) {
    		$settingsString = get_post_meta($this->id, 'project_settings', true);
    		if (empty($settingsString)) {
    			return;
    		}
    		$this->settings = json_decode($settingsString, false);
    		if (is_null($this->settings)) {
	    		trigger_error("Cannot decode project settings as JSON");
    		}

	 		$settingsArray = $this->settings;

	 		if ($settingsArray->general->version != 3) {
	    		trigger_error("Unknown project settings format");
	 		}
    	} // if need to read settings
    } // ensureSettings()

} // class DHPressProject


/******************************************************************************
 ** DHPressMarkerQuery class
 ** PURPOSE: Contain common variables and methods for gathering marker data
 **/

class DHPressMarkerQuery
{
	    // OBJECT PROPERTIES
		//======================

    public $projID;
    public $projObj;
    public $projSettings;
    public $rootTaxName;

    public $audio;
    public $video;
    public $transcript;
    public $transcript2;
    public $timecode;
    public $titleMote;

    public $selectContent;

    public $linkParent;
    public $linkParent2;
    public $childTerms;
    public $childTerms2;


	    // PUBLIC OBJECT METHODS
		//======================

    	// PURPOSE: Initialize all fields relating to querying markers in this project
    public function __construct($projectID)
    {
    	$this->projID = $projectID;

    		// Get Project related settings
    	$projObj = $this->projObj = new DHPressProject($projectID);
		$projSettings = $this->projSettings = $projObj->getAllSettings();
		$this->rootTaxName  = $projObj->getRootTaxName();

			// Initialize placeholders for various feature variables
		$this->filters = null;
		$this->audio = null;
		$this->video = null;
		$this->transcript = null;
		$this->transcript2 = null;
		$this->timecode = null;

			// By default, a marker's content is the set of data needed by select modal, but some
			//	views may need to augment this
		$this->selectContent = array();
		if ($projSettings->views->select->content) {
			foreach ($projSettings->views->select->content as $theMote) {
				array_push($this->selectContent, $theMote);
			}
		}

			// If a marker is selected and leads to a transcript in modal, need those values also
		if ($projObj->selectModalHas("scloud")) {
			$this->audio = $projSettings->views->transcript->audio;
				// Translate from Mote Name to Custom Field name
			if (!is_null($this->audio) && ($this->audio !== '') && ($this->audio !== 'disable')) {
				$this->audio = $projObj->getCustomFieldForMote($this->audio);
			} else {
				$this->audio = null;
			}
		}
		if ($projObj->selectModalHas("youtube")) {
			$this->video = $projSettings->views->transcript->video;
				// Translate from Mote Name to Custom Field name
			if (!is_null($this->video) && ($this->video !== '') && ($this->video !== 'disable')) {
				$this->video = $projObj->getCustomFieldForMote($this->video);
			} else {
				$this->video = null;
			}
		}
			// Only check for transcript data if there is audio or video
		if ($this->audio || $this->video) {
			if ($projSettings->views->transcript->transcript !== '') {
				$this->transcript = $projObj->getCustomFieldForMote($projSettings->views->transcript->transcript);
			}
			if ($projSettings->views->transcript->transcripts2 !== '') {
				$this->transcript2= $projObj->getCustomFieldForMote($projSettings->views->transcript->transcript2);
			}
			if ($projSettings->views->transcript->timecode !== '') {
				$this->timecode   = $projObj->getCustomFieldForMote($projSettings->views->transcript->timecode);
			}
		}

			// Link parent enables linking to either the Post page for this Marker,
			//	or to the category/taxonomy which includes this Marker
		$this->linkParent = $projSettings->views->select->link;
		if ($this->linkParent) {
			if ($this->linkParent=='marker') {
				$this->childTerms = 'marker';
			} elseif ($this->linkParent=='disable') {
				$this->childTerms = 'disable';
			}
				// Link to mote value
			elseif (strpos($this->linkParent, '(Mote)') !== FALSE) {
				$linkMoteName = str_replace(' (Mote)', '', $this->linkParent);
				$this->childTerms = $projObj->getMoteByName($linkMoteName);
			} else {
					// translate into category/term ID
				$parent_id = get_term_by('name', $this->linkParent, $this->rootTaxName);
					// find all category terms
				$this->childTerms = get_term_children($parent_id->term_id, $this->rootTaxName);
			}
		}

		$this->linkParent2 = $this->projSettings->views->select->link2;
		if ($this->linkParent2) {
			if ($this->linkParent2=='marker') {
				$this->childTerms2 = 'marker';
			} elseif ($linkParent2=='disable') {
				$this->childTerms2 = 'disable';
			}
				// Link to mote value
			elseif (strpos($this->linkParent2, '(Mote)') !== FALSE) {
				$link2MoteName = str_replace(' (Mote)', '', $this->linkParent2);
				$this->childTerms2 = $projObj->getMoteByName($link2MoteName);
			} else {
				$parent_id2 = get_term_by('name', $this->linkParent2, $this->rootTaxName);
				$this->childTerms2 = get_term_children($parent_id2->term_id, $this->rootTaxName);
			}
		}

			// Determine source of marker post's title field
		$this->titleMote = $projSettings->general->mTitle;
		if ($this->titleMote != 'the_title') {
			$temp_mote = $projObj->getMoteByName($this->titleMote);
			if (is_null($temp_mote)) {
				trigger_error("Modal view title assigned to unknown mote");
			}
			$this->titleMote = $temp_mote->cf;
		}
    } // __construct


	// PURPOSE:	Get link to category page based on category value, if one of $terms appears in $link_terms
	// INPUT:	$link_terms = array of taxonomic terms
	//			$terms = array of terms associated with a particular Marker
	// RETURNS: PermaLink for marker's term (from $terms) that appears in $link_terms
	// ASSUMES:	That strings in $terms have been HTML-escaped

	private function getTermByParent($link_terms, $terms)
	{
		foreach ($terms as $term) {
			$real_term = get_term_by('id', $term, $this->rootTaxName);
			$intersect = array_intersect(array($real_term->term_id), $link_terms);
			if ($intersect) {
				 $term_link = get_term_link($real_term);
				 return $term_link;
			}
		}
	} // getTermByParent()

    	// RETURN: properties array for the marker
    function getMarkerProperties($markerID)
    {
			// Most data goes into properties field
		$thisFeaturesProperties = array();

			// Audio transcript features?
		if (!is_null($this->audio)) {
			$audio_val = get_post_meta($markerID, $this->audio, true);
			$thisFeaturesProperties["audio"] = $audio_val;
		}
		if (!is_null($this->video)) {
			$video_val = get_post_meta($markerID, $this->video, true);
			$thisFeaturesProperties["video"] = $video_val;
		}
		if (!is_null($this->transcript)) {
			$transcript_val = get_post_meta($markerID, $this->transcript, true);
			$thisFeaturesProperties["transcript"]  = $transcript_val;
		}
		if (!is_null($this->transcript2)) {
			$transcript2_val = get_post_meta($markerID, $this->transcript2, true);
			$thisFeaturesProperties["transcript2"] = $transcript2_val;
		}
		if (!is_null($this->timecode)) {
			$timecode_val = get_post_meta($markerID, $this->timecode, true);
			$thisFeaturesProperties["timecode"]    = $timecode_val;
		}

			// Get all of the legend/category values associated with this marker post
		$args = array('fields' => 'ids');
		$post_terms = wp_get_post_terms($markerID, $this->rootTaxName, $args);
		$term_array = array();
		foreach ($post_terms as $term) {
				// Convert tax category names into IDs
			array_push($term_array, intval($term));
		}
		$thisFeaturesProperties["categories"]  = $term_array;

		$content_att = array();

			// Gather all values to be displayed in modal if marker selected
			// Should not apply filters to post content because DH Press markup gets inserted!
		if (count($this->selectContent)) {
			foreach ($this->selectContent as $contentMoteName ) {
				if ($contentMoteName == 'the_content') {
					$usedMote = false;
					$content_val = get_post_field('post_content', $markerID);
				} elseif ($contentMoteName == 'the_title') {
					$usedMote = false;
					$content_val = get_the_title();
				} else {
					$usedMote = true;
					$content_mote = $this->projObj->getMoteByName($contentMoteName);
					$contentCF = $content_mote->cf;
					if($contentCF =='the_content') {
						$content_val = get_post_field('post_content', $markerID);
					} elseif ($contentCF=='the_title') {
						$content_val = get_the_title();
					} else {
						$content_val = get_post_meta($markerID, $contentCF, true);
					}
				}
				if (!is_null($content_val) && ($content_val !== '')) {
						// Do we need to wrap data?
					if ($usedMote && $content_mote->type == 'Image') {
						$content_val = '<img src="'.addslashes($content_val).'" />';
					}
					$content_att[$contentMoteName] = $content_val;
				}
			} // foreach
			$thisFeaturesProperties["content"]     = $content_att;
		}

			// Does item link to its own Marker page, Taxonomy page, or Mote value?
		if ($this->linkParent && $this->childTerms && $this->childTerms != 'disable') {
			if ($this->childTerms=='marker') {
				$term_links = get_permalink();
			} elseif (strpos($link_parent, '(Mote)') !== FALSE) {
				$term_links = get_post_meta($markerID, $this->childTerms->cf, true);
			} else {
				$term_links = $this->getTermByParent($this->childTerms, $post_terms);
			}
			if ($term_links) {
				$thisFeaturesProperties["link"] = addslashes($term_links);
			}
		}

		if ($this->linkParent2 && $this->childTerms2 && $this->childTerms2 != 'disable') {
			if ($this->childTerms2=='marker') {
				$term_links = get_permalink();
			} elseif (strpos($this->linkParent2, '(Mote)') !== FALSE) {
				$term_links = get_post_meta($markerID, $this->childTerms2->cf, true);
			} else {
				$term_links = $this->getTermByParent($this->childTerms2, $post_terms);
			}
			if ($term_links) {
				$thisFeaturesProperties["link2"] = addslashes($term_links);
			}
		}

		return $thisFeaturesProperties;
    } // getMarkerProperties()

} // class DHPressMarkerQuery