<?php
/**
 * 4WP Bundle - built-in block addons.
 *
 * @package 4wp-bundle
 */

defined( 'ABSPATH' ) || exit;

if ( ! defined( 'FORWP_BUNDLE_ADDONS_OPTION' ) ) {
	define( 'FORWP_BUNDLE_ADDONS_OPTION', '4wp_bundle_addons_enabled' );
}

add_action( 'init', 'forwp_bundle_register_addons' );

/**
 * Discover addon slugs: subdirs of addons/ that contain block.json.
 *
 * @return string[]
 */
function forwp_bundle_get_addon_slugs() {
	$addons_dir = plugin_dir_path( __FILE__ ) . '../addons';
	if ( ! is_dir( $addons_dir ) ) {
		return array();
	}
	$slugs = array();
	foreach ( scandir( $addons_dir ) as $entry ) {
		if ( $entry === '.' || $entry === '..' ) {
			continue;
		}
		$path = $addons_dir . '/' . $entry;
		if ( is_dir( $path ) && file_exists( $path . '/block.json' ) ) {
			$slugs[] = $entry;
		}
	}
	return $slugs;
}

/**
 * Register only enabled addons. If option is empty, all discovered addons are enabled.
 */
function forwp_bundle_register_addons() {
	$slugs = forwp_bundle_get_addon_slugs();
	if ( empty( $slugs ) ) {
		return;
	}

	$saved = get_option( FORWP_BUNDLE_ADDONS_OPTION, array() );
	$enabled = is_array( $saved ) && ! empty( $saved )
		? $saved
		: $slugs;

	$build_base = plugin_dir_path( __FILE__ ) . '../build/addons';
	foreach ( $slugs as $slug ) {
		if ( ! in_array( $slug, $enabled, true ) ) {
			continue;
		}
		$addon_path = $build_base . '/' . $slug;
		if ( ! file_exists( $addon_path . '/block.json' ) ) {
			continue;
		}
		register_block_type( $addon_path );
	}
}
