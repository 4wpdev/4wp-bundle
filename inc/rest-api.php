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

    register_rest_route('4wp/v1', '/plugin-update', [
        'methods' => 'POST',
        'callback' => 'update_4wp_plugin',
        'permission_callback' => function () {
            return current_user_can('update_plugins');
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

function update_4wp_plugin($request) {
    $slug = sanitize_text_field($request->get_param('slug'));
    $download_url = esc_url_raw($request->get_param('download_url'));
    
    if (!$slug) {
        return new WP_Error('no_slug', __('No plugin slug provided', '4wp-bundle'), ['status' => 400]);
    }
    
    if (!$download_url) {
        return new WP_Error('no_url', __('No download URL provided', '4wp-bundle'), ['status' => 400]);
    }

    require_once ABSPATH . 'wp-admin/includes/plugin.php';
    
    // Find the plugin file path
    $plugin_path = null;
    $plugin_dir_name = null;
    foreach (get_plugins() as $path => $data) {
        if (dirname($path) === $slug) {
            $plugin_path = $path;
            $plugin_dir_name = dirname($path);
            break;
        }
    }
    
    if (!$plugin_path) {
        return new WP_Error('plugin_not_found', __('Plugin not found', '4wp-bundle'), ['status' => 404]);
    }

    // Check if plugin is active (we'll need to reactivate it after update)
    $was_active = is_plugin_active($plugin_path);

    include_once ABSPATH . 'wp-admin/includes/file.php';
    include_once ABSPATH . 'wp-admin/includes/plugin-install.php';
    include_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
    include_once ABSPATH . 'wp-admin/includes/misc.php';
    include_once ABSPATH . 'wp-admin/includes/class-wp-upgrader-skin.php';

    // Use Plugin_Upgrader for updating
    // For custom URLs, we use install() which will overwrite existing plugin
    $upgrader = new Plugin_Upgrader(new WP_Ajax_Upgrader_Skin());
    
    // Install/update the plugin (install() will overwrite if plugin exists)
    $result = $upgrader->install($download_url, [
        'overwrite_package' => true
    ]);

    if (is_wp_error($result)) {
        return $result;
    }

    // Handle -main folder renaming (same as install)
    $plugin_dir = WP_PLUGIN_DIR;
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

    // Reactivate if it was active before
    // Need to find the plugin path again after update (might have changed)
    $updated_plugin_path = null;
    foreach (get_plugins() as $path => $data) {
        if (dirname($path) === $slug) {
            $updated_plugin_path = $path;
            break;
        }
    }
    
    if ($was_active && $updated_plugin_path && !is_plugin_active($updated_plugin_path)) {
        activate_plugin($updated_plugin_path);
    }

    return get_4wp_blocks_data();
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

    $available = [];
    $response = wp_remote_get(
        'https://raw.githubusercontent.com/4wpdev/4wpdev/main/plugins.json',
        [
            'timeout' => 10,
        ]
    );

    if ( ! is_wp_error( $response ) ) {
        $status = wp_remote_retrieve_response_code( $response );
        if ( $status >= 200 && $status < 300 ) {
            $decoded = json_decode( wp_remote_retrieve_body( $response ), true );
            // GitHub JSON has structure: {"plugins": [...], "bundle": {...}, "lastUpdated": "..."}
            if ( is_array( $decoded ) && isset( $decoded['plugins'] ) && is_array( $decoded['plugins'] ) ) {
                $available = $decoded['plugins'];
                // Map repository URLs to download_url format for compatibility
                foreach ( $available as &$plugin ) {
                    // If download_url is explicitly provided in JSON, use it (for GitHub Releases support)
                    if ( ! isset( $plugin['download_url'] ) && isset( $plugin['repository'] ) ) {
                        // Convert GitHub repository URL to download URL (main branch fallback)
                        // e.g., https://github.com/4wpdev/4wp-icons -> https://github.com/4wpdev/4wp-icons/archive/refs/heads/main.zip
                        $plugin['download_url'] = rtrim( $plugin['repository'], '/' ) . '/archive/refs/heads/main.zip';
                    }
                    // Generate README URL from repository if not explicitly provided
                    if ( ! isset( $plugin['readme_url'] ) && isset( $plugin['repository'] ) ) {
                        // Convert GitHub repository URL to README URL
                        // e.g., https://github.com/4wpdev/4wp-icons -> https://github.com/4wpdev/4wp-icons#readme
                        $plugin['readme_url'] = rtrim( $plugin['repository'], '/' ) . '#readme';
                    }
                    // Generate documentation URL if not explicitly provided
                    if ( ! isset( $plugin['documentation_url'] ) && isset( $plugin['slug'] ) ) {
                        // Generate documentation URL: https://4wp.dev/plugin/{slug}/
                        $plugin['documentation_url'] = 'https://4wp.dev/plugin/' . $plugin['slug'] . '/';
                    }
                    // Map name to title if title doesn't exist (for frontend compatibility)
                    if ( isset( $plugin['name'] ) && ! isset( $plugin['title'] ) ) {
                        $plugin['title'] = $plugin['name'];
                    }
                    
                    // Check if update is available by comparing versions
                    $plugin['has_update'] = false;
                    $plugin['has_downgrade'] = false;
                    $plugin['update_version'] = null;
                    $plugin['downgrade_version'] = null;
                    if ( isset( $plugin['slug'] ) && isset( $plugin['version'] ) ) {
                        foreach ( $blocks as $installed_block ) {
                            if ( $installed_block['slug'] === $plugin['slug'] ) {
                                // Compare versions: if available version is greater than installed
                                if ( version_compare( $plugin['version'], $installed_block['version'], '>' ) ) {
                                    $plugin['has_update'] = true;
                                    $plugin['update_version'] = $plugin['version'];
                                    $plugin['installed_version'] = $installed_block['version'];
                                } elseif ( version_compare( $installed_block['version'], $plugin['version'], '>' ) ) {
                                    // Local version is newer than repository version - suggest downgrade/rollback
                                    $plugin['has_downgrade'] = true;
                                    $plugin['downgrade_version'] = $plugin['version'];
                                    $plugin['installed_version'] = $installed_block['version'];
                                }
                                break;
                            }
                        }
                    }
                }
                unset( $plugin ); // Break reference
            } elseif ( is_array( $decoded ) ) {
                // Fallback for direct array format (backward compatibility)
                $available = $decoded;
            }
        }
    }
    
    // Add downgrade info to installed blocks
    foreach ( $blocks as &$block ) {
        $available_block = null;
        foreach ( $available as $avail ) {
            if ( isset( $avail['slug'] ) && $avail['slug'] === $block['slug'] ) {
                $available_block = $avail;
                break;
            }
        }
        
        if ( $available_block ) {
            if ( isset( $available_block['has_downgrade'] ) && $available_block['has_downgrade'] ) {
                $block['has_downgrade'] = true;
                $block['downgrade_version'] = $available_block['downgrade_version'];
                $block['repository_version'] = $available_block['version'];
            }
            if ( isset( $available_block['has_update'] ) && $available_block['has_update'] ) {
                $block['has_update'] = true;
                $block['update_version'] = $available_block['update_version'];
            }
        }
    }
    unset( $block ); // Break reference

    return rest_ensure_response( [ 'installed' => $blocks, 'available' => $available ] );
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