<?php

// Set up custom taxonomies for CSV Importer custom-taxonomies.csv example. You
// can copy-and-paste the code below to your theme's functions.php file.

add_action('init', 'csv_importer_taxonomies', 0);

function csv_importer_taxonomies() {
    register_taxonomy('art', 'post', array(
        'hierarchical' => true,
        'label' => 'Art',
    ));
    register_taxonomy('country', 'post', array(
        'hierarchical' => false,
        'label' => 'Country',
    ));
}

?>
