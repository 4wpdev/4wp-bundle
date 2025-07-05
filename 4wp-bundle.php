<?php
/**
 * Plugin Name: 4WP Bundle
 * Description: Core bundle to support and manage 4WP Blocks ecosystem.
 * Tags: core, bundle, 4wp, blocks 
 * Version: 1.0.1
 * Author: 4wp.dev
 * Author URI: https://4wp.dev
 * Text Domain: 4wp-bundle
 * Domain Path: /languages
 * Requires at least: 5.0
 * Tested up to: 6.4
 * Requires PHP: 7.4
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Network: false
 */

namespace Forwp\Bundle;
class Menu {
    
}

// Prevent direct access
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Load plugin textdomain for translations
add_action('plugins_loaded', function() {
    load_plugin_textdomain(
        '4wp-bundle',
        false,
        dirname(plugin_basename(__FILE__)) . '/languages'
    );
});

require_once plugin_dir_path(__FILE__) . 'inc/admin-menu.php';
require_once plugin_dir_path(__FILE__) . 'inc/rest-api.php';

add_action('admin_notices', function() {
    // Check if plugin is in a folder with -main in its name
    // This is to ensure compatibility with the 4WP Bundle plugin structure
    // If the plugin is installed in a folder named "4wp-bundle-main", we recommend renaming it to "4wp-bundle" for best compatibility.
    $plugin_dir = basename(dirname(__FILE__));
    if (strpos($plugin_dir, '4wp-bundle-main') === 0) {
        echo '<div class="notice notice-warning"><p>';
        echo esc_html__('4WP Bundle is installed in a folder with "-main" in its name. For best compatibility, please rename the folder to "4wp-bundle".', '4wp-bundle');
        echo '</p></div>';
    }
});