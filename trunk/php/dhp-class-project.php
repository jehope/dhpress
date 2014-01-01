<?php
/******************************************************************************
 ** DH Press Project Class
 ** PURPOSE: Encapsulate (some) implementation details of Projects on WordPress
 ** ASSUMES: Running in WordPress environment
 ** NOTES:   Class attempts to do "lazy loading": only retrieve data when needed
 **			 settings is an array/JSON object of this structure
 **			"project-details": {
		        "id": Integer,
		        "name": String,
		        "marker-custom-fields": [ String, ... ]
		    },
		    "motes": [
		        Index: {
		            "name": String,
		            "type": String (name of type),
		            "custom-fields": String,
		            "delim": String (containing a character or empty string)
		        }, ...
		    ],
		    "entry-points": [
		    	Integer (index) : {
		            "type": String ("map" or "transcript"),
		            "settings": {				// depends on type -- map is as follows
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
		                "marker-layer": String (name of mote),
		                "filter-data": [
		                    Index : String (name of note), ...
		                ]
		            }
		        }
		    },
		    "views": {
		        "post-view-content": [ String (name of mote), ...  ],
		        "map-fullscreen": false | true,
		        "map-width": Integer,
		        "map-height": Integer,
		        "post-view-title": String,
		        "title": String (name of mote),
		        "modal-ep": [			// Entry-point(s) to dispay in selected Marker modal
		        	Integer (index) : 'transcript' | 'map'
		        ],
		        "content": [
		            Integer (index): String (mote name), ...
		        ],
		        "link": "no-link",
		        "link2": "no-link"
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
	} // dhp_get_map_type()


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

    	// PURPOSE: Ensure that Project Settings have been loaded; read if not
    private function ensureSettings()
    {
    	if ($this->id == -1) {
    		trigger_error("Project ID not set");
    	}
    	if (is_null($this->settings)) {
    		$settingsString = get_post_meta($this->id, 'project_settings', true);
    		$this->settings = json_decode($settingsString, true);
    		if (is_null($this->settings)) {
	    		trigger_error("Cannot decode project settings as JSON");
    		}
    	}
    }

} // class DHPressProject
