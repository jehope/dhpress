<?php
/**
	 * //add order to taxonomies
	 * code by Zack Tollman http://www.wphub.com/sorting-categories-custom-sort-order/
	 *
	 * @package diPH Toolkit
	 * @author diPH Team
	 * @link http://diph.org/download/
	 * 
	 */

add_action('category_add_form_fields', 'category_metabox_add', 10, 1);
add_action('category_edit_form_fields', 'category_metabox_edit', 10, 1);
add_action('created_category', 'save_category_meta_data', 10, 1);	
add_action('edited_category', 'save_category_meta_data', 10, 1);

function category_metabox_add($tag) 
{ ?>
	<div class="form-field">
		<label for="tax-order"><?php _e('Order') ?></label>
		<input name="tax-order" id="tax-order" type="text" value="" size="40" aria-required="true" />
		<p class="description"><?php _e('Determines the order in which the term is displayed.'); ?></p>
	</div>
<?php } 	

function category_metabox_edit($tag) 
{
?>
	<tr class="form-field">
		<th scope="row" valign="top">
			<label for="tax-order"><?php _e('Order'); ?></label>
		</th>
		<td>
			<input name="tax-order" id="tax-order" type="text" value="<?php echo get_term_meta($tag->term_id, 'tax-order', true); ?>" size="40" aria-required="true" />
			<p class="description"><?php _e('Determines the order in which the term is displayed.'); ?></p>
		</td>
	</tr>
<?php
}

function save_category_meta_data($term_id)
{
    if (isset($_POST['tax-order'])) 
		update_term_meta( $term_id, 'tax-order', $_POST['tax-order']);       
}

add_filter('get_terms', 'custom_term_sort', 10, 3);

function custom_term_sort($terms, $taxonomies, $args)
{		
	// Controls behavior when get_terms is called at unusual times resulting in a terms array without objects
	$empty = false;
	
	// Create collector arrays
	$ordered_terms = array();
	$unordered_terms = array();

	// Add taxonomy order to terms
	foreach($terms as $term)
	{
		// Only set tax_order if value is an object
		if(is_object($term))
		{
			if($taxonomy_sort = get_term_meta($term->term_id, 'tax-order', true))
			{
				$term->tax_order = (int) $taxonomy_sort;
				$ordered_terms[] = $term;
			}
			else
			{
				$term->tax_order = (int) 0;
				$unordered_terms[] = $term;
			}
		}
		else
			$empty = true;
	}
	
	// Only sort by tax_order if there are items to sort, otherwise return the original array
	if(!$empty && count($ordered_terms) > 0)
		quickSort($ordered_terms);
	else
		return $terms;

	// Combine the newly ordered items with the unordered items and return
	return array_merge($ordered_terms, $unordered_terms);	
}

function quickSort(&$array)
{
	$cur = 1;
	$stack[1]['l'] = 0;
	$stack[1]['r'] = count($array)-1;
	
	do
	{
		$l = $stack[$cur]['l'];
		$r = $stack[$cur]['r'];
		$cur--;
	
		do
		{
			$i = $l;
			$j = $r;
			$tmp = $array[(int)( ($l+$r)/2 )];
		
			// partion the array in two parts.
			// left from $tmp are with smaller values,
			// right from $tmp are with bigger ones
			do
			{
				while( $array[$i]->tax_order < $tmp->tax_order )
				$i++;
			
				while( $tmp->tax_order < $array[$j]->tax_order )
			 	$j--;
			
				// swap elements from the two sides
				if( $i <= $j)
				{
					 $w = $array[$i];
					 $array[$i] = $array[$j];
					 $array[$j] = $w;
			
			 		$i++;
			 		$j--;
				}
			
			}while( $i <= $j );
			
			if( $i < $r )
			{
				$cur++;
				$stack[$cur]['l'] = $i;
				$stack[$cur]['r'] = $r;
			}
			$r = $j;
			
		}while( $l < $r );
			
	}while( $cur != 0 );
}
?>