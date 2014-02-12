<?php
/******************************************************************************
 ** DH Press Project Class
 ** PURPOSE: Encapsulate (some) implementation details of Projects on WordPress
 ** ASSUMES: Running in WordPress environment
 ** NOTES:   Class attempts to do "lazy loading": only retrieve data when needed
 **			 Settings is an array/JSON object, whose structure depends on version;
 **				conversion between them is done by ensureSettings().

 **		VERSION 1 (first iteration of DH Press)
 **			"project-details": {
		        "id": Integer,
		        "name": String,
		        "marker-custom-fields": [ String, ... ],
		        "home-label": String,
		        "home-url": String,
		        "max-inactive": Number (in minutes)
		    },
		    "motes": [
		        Index: {
		            "name": String,
		            "type": String (name of type),
		            "custom-fields": String,
		            "delim": String (containing a character or empty string)
		        }, ...
		    ],
		    "entry-points": [										// contents of settings depends on type of entry point
		    	Integer (index) : {
		            "type": String ("map" or "transcript"),
		            "settings": {									// map settings are as follows
		                "lat": Number,
		                "lon": Number,
		                "zoom": Number,
		                "opacity": Number,
		                "layers": [
		                    Index: {
		                        "id": Number,
		                        "name": String,
		                        "mapType": String ("type-OSM" or "type-CDLA"),
		                        "mapTypeId": String,
		                    }, ...
		                ],
		                "marker-layer": String (name of mote),		// Mote used for geo coord
		                "filter-data": [
		                    Index : String (name of note), ...
		                ]
		            } -- or --
		            "settings": {									// transcript settings are
						"audio" : Name of mote (that contains last part of URL to audio file)
						"transcript" : Name of mote (that contains URL to textual transcription of original),
						"transcript2" : Name of mote (that contains URL to textual transcription of any translation),
						"timecode" : Name of mote (that contains the timecode)
		            }
		        }
		    },
		    "views": {
		        "map-fullscreen": false | true,
		        "map-width": Integer,
		        "map-height": Integer,
		        "post-view-title": String,
		        "title": String (name of mote),
		        "post-view-content": [ String (name of mote), ...  ],
		        "modal-ep": [			// Entry-point(s) to display in selected Marker modal
		        	Integer (index) : 'transcript' | 'map'
		        ],
		        "content": [			// Motes to show when Marker selected in visualization
		            Integer (index): String (mote name), ...
		        ],
		        "link": Name of mote,
		        "link-label" : String,
		        "link2": Name of mote,
		        "link-label2" : String
		    } 
 
 **		VERSION 2 (latest iteration of DH Press)
 **			"project-details": {
		        "id": Integer,										// ID of Project
		        "name": String,
		        "version": Integer,									// Should = 2
		        "marker-custom-fields": [ String, ... ],			// list of custom fields <=> motes
		        "home-label": String,
		        "home-url": String,
		        "max-inactive": Number (in minutes)
		    },
		    "motes": [
		        Index: {
		            "name": String,
		            "type": String, (name of data type)
		            "custom-fields": String, (name of custom field which holds value)
		            "delim": String (containing a character or empty string)
		        }, ...
		    ],
		    "entry-points": [										// contents of settings depends on type of entry point
		    	Integer (index) : {
		            "type": String ("map" or "..."),
		            "settings": {									// map settings are as follows
		                "lat": Number,
		                "lon": Number,
		                "zoom": Number,
		                "opacity": Number,
		                "layers": [
		                    Index: {
		                        "id": Number,
		                        "name": String,
		                        "mapType": String ("type-OSM" or "type-DHP"),
		                        "mapTypeId": String,
		                    }, ...
		                ],
		                "marker-layer": String (name of mote),		// Mote used for geo coord
		                "filter-data": [							// List of mote Legends/categories
		                    Index : String (name of note), ...
		                ]
		            } -- or -- ...
		        }
		    },
		    "views": {
		        "viz-fullscreen": false | true,
		        "viz-width": Integer,						// Size of visualization window (non-full screen)
		        "viz-height": Integer,
		    	"post" : {									// For Marker post pages
			        "title": String,						// Title to give Marker modal
			        "content": [ String, ...  ]				// Names of motes to show
		    	},
		    	"select" : {								// For modal when item selected from visualation
			        "title": String (name of mote),
			        "width": "tiny" | "small" | "medium" | "large" | "x-large",
			        "view-type": [							// Types of views to display in selected Marker modal
			        	Integer (index) : 'transcript' | 'map'
			        ],
			        "content": [							// Motes to show when Marker selected in visualization
			            Integer (index): String (mote name), ...
			        ],
			        "link" : [ "no-link" | "marker" | name of mote whose tax/category page to link to ],
			        "link2": [ "no-link" | "marker" | name of mote whose tax/category page to link to ],
			        "link-label" : String,
			        "link2-label" : String
		    	}
		        "transcript" : {
					"audio" 	: Name of mote (that contains last part of URL to audio file)
					"transcript" : Name of mote (that contains URL to textual transcription of original),
					"transcript2" : Name of mote (that contains URL to textual transcription of any translation),
					"timecode" : Name of mote (that contains the timecode),
					"source"	: Name of mote with common value across excerpts of transcripts (taxonomy category),
					"content"	: [							// Motes to show when tax/archive page shown
			            Integer (index): String (mote name), ...
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
	     		if ( '_' == $valuet{0} )
	      			continue;
				array_push($custom_field_array, $value);
			}

		endwhile;
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

		// $args = array( 'post_type' => 'dhp-markers', 'meta_key' => 'project_id','meta_value'=>$project_id, 'posts_per_page' => -1 );		
		// $loop = new WP_Query( $args );
		$loop = $this->setAllMarkerLoop();
		while ( $loop->have_posts() ) : $loop->the_post();
			$marker_id = get_the_ID();
			//$temp_post = get_post($marker_id);

				// Get the value in this marker for the custom field
			$tempMoteValue = get_post_meta($marker_id, $custom_name, true);

			if($delim) {
				$tempMoteArray = split($delim,$tempMoteValue);
			} else {
				$tempMoteArray = array($tempMoteValue);
			}

			foreach ($tempMoteArray as &$value) {
	   		 	array_push($moteArray,$value);
			}
			
		endwhile;

		$result = array_unique($moteArray);
		return $result;
	} // getCustomFieldUniqueDelimValues()


    	// RETURNS: EntryPoint settings array of given type
	public function getEntryPointByName($typeName)
	{
		$this->ensureSettings();

		foreach($this->settings['entry-points'] as $eps) {
			if($eps['type'] == $typeName) {
				return $eps;
			}
		}
		return null;
	} // getEntryPointByName()


    	// RETURNS: All EntryPoint settings in Project
	public function getAllEntryPoints()
	{
		$this->ensureSettings();
		return $this->settings['entry-points'];
	} // getAllEntryPoints()


		// RETURNS: Object array in settings whose name is $moteName
	public function getMoteByName($moteName)
	{ 
		$this->ensureSettings();

		foreach($this->settings['motes'] as $mote)
			if($mote['name']==$moteName)
				return $mote;
	} // getMoteByName()

		// RETURNS: Name of Custom Field corresponding to mote
		// ASSUMES: Only 1 custom field
	public function getCustomFieldForMote($moteName)
	{
		$mote = $this->getMoteByName($moteName);
		return $mote['custom-fields'];
	} // getCustomFieldForMote()

		// RETURNS: true if the Select Modal contains $viewType
	public function selectModalHas($viewType)
	{
		$this->ensureSettings();

		foreach($this->settings['views']['select']['view-type'] as $vt) {
			if ($vt === $viewType) {
				return true;
			}
		}
		return false;
	} // selectModalHas()


		// RETURNS: Map type ID for layer whose type is typeName in epList
	public function getMapLayerTypeID($typeName, $layerList)
	{
		$this->ensureSettings();

		foreach($layerList as $layer) {
			if($layer['mapType'] == $typeName) {
				$map_id = get_post_meta($layer['id'],'dhp_map_typeid');
				return $map_id[0];
			}
		}
		return null;
	} // getMapLayerTypeID()


		// RETURNS: All Mote settings in Project
	public function getAllMotes()
	{ 
		$this->ensureSettings();
		return $this->settings['motes'];
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

	static private function doClone($value)
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
	} // doClone()


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
    		if (empty($settingsStrings)) {
    			return;
    		}
    		$this->settings = json_decode($settingsString, true);
    		if (is_null($this->settings)) {
	    		trigger_error("Cannot decode project settings as JSON");
    		}

	 		$settingsArray = $this->settings;
	 			// Do we need to convert to new format?
	 		if (is_null($settingsArray['project-details']['version'])) {
	 			$newSettings = array();
	 			$newSettings['project-details'] = new ArrayObject($settingsArray['project-details']);
	 			$newSettings['project-details']['version'] = 2;

	 			$newSettings['motes'] = new ArrayObject($settingsArray['motes']);

	 				// prepare views setting for values
	 			$newSettings['views'] = array();
	 			$newSettings['views']['transcript'] = array();
				$newSettings['views']['transcript']['audio']       = '';
				$newSettings['views']['transcript']['transcript']  = '';
				$newSettings['views']['transcript']['transcript2'] = '';
				$newSettings['views']['transcript']['timecode']    = '';
				$newSettings['views']['transcript']['source']  	   = '';
				$newSettings['views']['transcript']['content']     = array();

	 			$newSettings['entry-points'] = array();

	 			foreach ($settingsArray['entry-points'] as $epSetting) {
	 					// Just copy map settings over
	 				if ($epSetting['type'] == 'map') {
	 					array_push($newSettings['entry-points'], new ArrayObject($epSetting));

	 					// Must copy transcript settings to new variables
	 				} elseif ($epSetting['type'] == 'transcript') {
						$newSettings['views']['transcript']['audio']       = DHPressProject::doClone($epSetting['settings']['audio']);
						$newSettings['views']['transcript']['transcript']  = DHPressProject::doClone($epSetting['settings']['transcript']);
						$newSettings['views']['transcript']['transcript2'] = DHPressProject::doClone($epSetting['settings']['transcript2']);
						$newSettings['views']['transcript']['timecode']    = DHPressProject::doClone($epSetting['settings']['timecode']);

	 				} else {
	    				trigger_error("Unknown entry point type: ".$epSetting['type']);
	 				}
	 			}

				$newSettings['views']['viz-fullscreen'] = $settingsArray['views']['map-fullscreen'];
				$newSettings['views']['viz-width']      = $settingsArray['views']['map-width'];
				$newSettings['views']['viz-height']     = $settingsArray['views']['map-height'];

				$newSettings['views']['post']     		= array();
				$newSettings['views']['post']['title']	= DHPressProject::doClone($settingsArray['views']['post-view-title']);
				$newSettings['views']['post']['content']= new ArrayObject($settingsArray['views']['post-view-content']);

				$newSettings['views']['select']     	= array();
				$newSettings['views']['select']['title']= DHPressProject::doClone($settingsArray['views']['title']);
				$newSettings['views']['select']['view-type']= new ArrayObject($settingsArray['views']['modal-ep']);
				$newSettings['views']['select']['content']= new ArrayObject($settingsArray['views']['post-view-content']);
				$newSettings['views']['select']['link'] = DHPressProject::doClone($settingsArray['views']['link']);
				$newSettings['views']['select']['link2']= DHPressProject::doClone($settingsArray['views']['link2']);
				$newSettings['views']['select']['link-label'] = DHPressProject::doClone($settingsArray['views']['link-label']);
				$newSettings['views']['select']['link2-label']= DHPressProject::doClone($settingsArray['views']['link2-label']);

	 				// Save new settings format
	 			$this->settings = $newSettings;

	 		} elseif ($settingsArray['project-details']['version'] != 2) {
	    		trigger_error("Unknown project settings format");
	 		}
    	} // if need to read settings
    } // ensureSettings()

} // class DHPressProject
