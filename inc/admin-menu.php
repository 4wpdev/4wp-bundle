<?php
defined('ABSPATH') || exit;

add_action('admin_menu', function () {
    add_menu_page(
        __('4WP Bundle', '4wp-bundle'),
        __('4WP Bundle', '4wp-bundle'),
        'manage_options',
        '4wp-bundle',
        'render_4wp_bundle_blocks',
        'dashicons-screenoptions',
        30
    );

    // Blocks submenu - always first
    add_submenu_page('4wp-bundle', __('Documentation', '4wp-bundle'), __('Blocks', '4wp-bundle'), 'manage_options', '4wp-bundle', 'render_4wp_bundle_blocks');
}, 10);

// Documentation submenu - always last
add_action('admin_menu', function () {
    add_submenu_page(
        '4wp-bundle',
        __('Documentation', '4wp-bundle'),
        __('Documentation', '4wp-bundle'),
        'manage_options',
        '4wp-bundle-help',
        'render_4wp_bundle_help'
    );
}, 100);

function render_4wp_bundle_blocks() {
    echo '<div id="4wp-bundle-admin-app"></div>';

    wp_enqueue_script(
        '4wp-bundle-admin-js',
        plugin_dir_url(__FILE__) . '../build/index.js',
        [ 'wp-element', 'wp-components', 'wp-api-fetch' ],
        null,
        true
    );

    wp_enqueue_style('wp-components');
}

function render_4wp_bundle_help() {
    include plugin_dir_path(__FILE__) . 'page-help.php';
}