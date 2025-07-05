<?php
defined('ABSPATH') || exit;

add_action('rest_api_init', function () {
    register_rest_route('4wp/v1', '/blocks', [
        'methods' => 'GET',
        'callback' => 'get_4wp_blocks_data',
        'permission_callback' => function () {
            return current_user_can('manage_options');
        }
    ]);

    register_rest_route('4wp/v1', '/plugin-install', [
        'methods' => 'POST',
        'callback' => 'install_4wp_plugin',
        'permission_callback' => function () {
            return current_user_can('install_plugins');
        }
    ]);

    register_rest_route('4wp/v1', '/block-toggle', [
        'methods' => 'POST',
        'callback' => 'toggle_4wp_block',
        'permission_callback' => function () {
            return current_user_can('activate_plugins');
        }
    ]);
});

function install_4wp_plugin($request) {
    $url = esc_url_raw($request->get_param('download_url'));
    if (!$url) {
        return new WP_Error('no_url', __('No download URL provided', '4wp-bundle'), ['status' => 400]);
    }

    include_once ABSPATH . 'wp-admin/includes/file.php';
    include_once ABSPATH . 'wp-admin/includes/plugin-install.php';
    include_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
    include_once ABSPATH . 'wp-admin/includes/misc.php';
    include_once ABSPATH . 'wp-admin/includes/class-wp-upgrader-skin.php';

    $upgrader = new Plugin_Upgrader(new WP_Ajax_Upgrader_Skin());
    $result = $upgrader->install($url);

    if (is_wp_error($result)) {
        return $result;
    }

    $plugin_dir = WP_PLUGIN_DIR;
    // Пошук усіх папок, які закінчуються на -main після розпакування
    $dirs = glob($plugin_dir . '/*-main', GLOB_ONLYDIR);
    foreach ($dirs as $dir) {
        $base = basename($dir);
        $target = preg_replace('/-main$/', '', $base);
        $target_dir = $plugin_dir . '/' . $target;
        if (!is_dir($target_dir)) {
            if (!@rename($dir, $target_dir)) {
                return new WP_Error('rename_failed', __('Could not rename plugin folder.', '4wp-bundle'));
            }
        }
    }

    return ['success' => true];
}
function get_4wp_blocks_data() {
    require_once ABSPATH . 'wp-admin/includes/plugin.php';

    $all_plugins = get_plugins();
    $blocks = [];

    foreach ($all_plugins as $plugin_path => $plugin_data) {
        if (strpos($plugin_path, '4wp-') === 0) {
            $blocks[] = [
                'slug' => dirname($plugin_path),
                'name' => $plugin_data['Name'],
                'version' => $plugin_data['Version'],
                'active' => is_plugin_active($plugin_path),
                'path' => $plugin_path
            ];
        }
    }

    $response = wp_remote_get('https://4wp.dev/plugins.json');
    $available = is_wp_error($response) ? [] : json_decode(wp_remote_retrieve_body($response), true);
    return ['installed' => $blocks, 'available' => $available ?: []];
}

function toggle_4wp_block($request) {
    $slug = sanitize_text_field($request->get_param('slug'));
    $action = sanitize_text_field($request->get_param('action'));
    require_once ABSPATH . 'wp-admin/includes/plugin.php';

    foreach (get_plugins() as $path => $data) {
        if (dirname($path) === $slug) {
            if ($action === 'activate') {
                activate_plugin($path);
            } elseif ($action === 'deactivate') {
                deactivate_plugins($path);
            }
            break;
        }
    }

    return get_4wp_blocks_data();
}