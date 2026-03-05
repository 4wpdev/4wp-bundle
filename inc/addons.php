<?php
/**
 * 4WP Bundle - built-in block addons.
 *
 * @package 4wp-bundle
 */

defined( 'ABSPATH' ) || exit;

add_action( 'init', 'forwp_bundle_register_addons' );

function forwp_bundle_register_addons() {
	$addon_path = plugin_dir_path( __FILE__ ) . '../build/addons/show-more';

	if ( ! file_exists( $addon_path . '/block.json' ) ) {
		return;
	}

	register_block_type( $addon_path );
}
