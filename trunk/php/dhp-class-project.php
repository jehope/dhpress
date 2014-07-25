<?php
/******************************************************************************
 ** DH Press Project Class
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
		            "type": String ("map" | "cards" | "pinboard" ),
		            "label" : String (short and unique across entry points),

		            "settings": {									// Map settings are as follows
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

		            "settings" : {									// Topic Cards settings are as follows
						"title": String (name of mote),				// to display on top of card
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

		            "settings" : {									// Pinboard settings are as follows
		                "imageURL" : String,						// complete URL to background image
		            	"width" : Number,							// Pixel width of background image
		            	"height" : Number,							// Pixel height of background image
		                "size": Character,							// relative size of markers: "s" | "m" | "l"
		                "icon": String,								// Name of icon marker to use or "disable"
						"coordMote": String (name of mote),			// mote which supplies X-Y coordinate
		                "legends": [								// List of mote Legends/categories
		                    String (name of mote), ...
		                ],
		                "layers": [									// List of SVG layers to add on top of image
		                	{ label: String,
		                	  file: String (complete URL)
		                	} , ...
		                ]
		            }

		            "settings" : {									// Tree settings are as follows
		            	"form" : String,							// Tree form: flat, radial, segment
		            	"width" : Number,							// Pixel width of tree visualization
		            	"height" : Number,							// Pixel height of tree visualization
		            	"head" : String,							// ID of marker which is head/top of tree
		            	"children" : String (name of mote),			// Mote that supplies names of next generation
		            	"label" : String (name of mote),			// Mote that supplies text for label
		            	"fSize" : Number,							// Size of label font in pixels
		            	"radius" : Number,							// Size of circles in pixels (when used)
		            	"padding" : Number,							// Size of padding (in pixels - form dependent)
		                "color": String (name of mote)				// For color of mote
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
			        "title": String (name of mote),
			        "width": "tiny" | "small" | "medium" | "large" | "x-large",
			        "widgets": [							// List of 'widgets' to display in selected Marker modal
			        	'transcript'
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
				$valueArray = split($delim, $moteValue);
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
