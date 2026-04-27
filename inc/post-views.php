<?php
/**
 * 4WP Bundle - Post views tracking.
 *
 * @package 4wp-bundle
 */

defined( 'ABSPATH' ) || exit;

if ( ! defined( 'FORWP_BUNDLE_POST_VIEWS_SETTINGS_OPTION' ) ) {
	define( 'FORWP_BUNDLE_POST_VIEWS_SETTINGS_OPTION', '4wp_bundle_post_views_settings' );
}

if ( ! defined( 'FORWP_BUNDLE_POST_VIEWS_META_KEY' ) ) {
	define( 'FORWP_BUNDLE_POST_VIEWS_META_KEY', '_forwp_post_views_total' );
}

if ( ! defined( 'FORWP_BUNDLE_POST_VIEWS_DB_VERSION' ) ) {
	define( 'FORWP_BUNDLE_POST_VIEWS_DB_VERSION', '1' );
}

if ( ! defined( 'FORWP_BUNDLE_POST_VIEWS_CRON_HOOK' ) ) {
	define( 'FORWP_BUNDLE_POST_VIEWS_CRON_HOOK', 'forwp_bundle_post_views_refresh_cache' );
}

if ( ! defined( 'FORWP_BUNDLE_POST_VIEWS_CRON_INTERVALS' ) ) {
	define(
		'FORWP_BUNDLE_POST_VIEWS_CRON_INTERVALS',
		array(
			15  => '15m',
			30  => '30m',
			60  => 'hourly',
			180 => '3h',
		)
	);
}

/**
 * Return post views table name.
 *
 * @return string
 */
function forwp_bundle_post_views_table_name() {
	global $wpdb;
	return $wpdb->prefix . 'forwp_post_views';
}

/**
 * Return default post types that can be tracked.
 *
 * @return string[]
 */
function forwp_bundle_post_views_get_default_post_types() {
	$objects = get_post_types(
		array(
			'public'  => true,
			'show_ui' => true,
		),
		'objects'
	);

	$defaults = array();
	foreach ( $objects as $slug => $object ) {
		if ( 'attachment' === $slug ) {
			continue;
		}
		if ( empty( $object->name ) ) {
			continue;
		}
		$defaults[] = (string) $slug;
	}

	return $defaults;
}

/**
 * Return public post types for admin settings.
 *
 * @return array<string, string>
 */
function forwp_bundle_post_views_get_public_post_types() {
	$objects = get_post_types(
		array(
			'public'  => true,
			'show_ui' => true,
		),
		'objects'
	);

	$result = array();
	foreach ( $objects as $slug => $object ) {
		if ( 'attachment' === $slug ) {
			continue;
		}
		$label           = isset( $object->labels->singular_name ) ? (string) $object->labels->singular_name : (string) $slug;
		$result[ $slug ] = $label;
	}

	return $result;
}

/**
 * Return default settings.
 *
 * @return array{enabled_post_types: string[], cookie_ttl_hours: int, cache_periods_days: int[], cache_refresh_minutes: int}
 */
function forwp_bundle_post_views_get_default_settings() {
	return array(
		'enabled_post_types' => forwp_bundle_post_views_get_default_post_types(),
		'cookie_ttl_hours'   => 24,
		'cache_periods_days' => array( 7, 30 ),
		'cache_refresh_minutes' => 60,
	);
}

/**
 * Return supported refresh interval values in minutes.
 *
 * @return int[]
 */
function forwp_bundle_post_views_get_allowed_refresh_intervals() {
	return array_keys( FORWP_BUNDLE_POST_VIEWS_CRON_INTERVALS );
}

/**
 * Parse period days list.
 *
 * @param mixed $value Raw value.
 * @return int[]
 */
function forwp_bundle_post_views_parse_period_days( $value ) {
	$periods = array();

	if ( is_string( $value ) ) {
		$value = preg_split( '/[\s,]+/', $value );
	}

	if ( is_array( $value ) ) {
		foreach ( $value as $period ) {
			$days = (int) $period;
			if ( $days < 1 || $days > 365 ) {
				continue;
			}
			$periods[] = $days;
		}
	}

	$periods = array_values( array_unique( $periods ) );
	sort( $periods );

	if ( empty( $periods ) ) {
		$periods = forwp_bundle_post_views_get_default_settings()['cache_periods_days'];
	}

	return $periods;
}

/**
 * Normalize settings payload.
 *
 * @param mixed $settings Raw settings.
 * @return array{enabled_post_types: string[], cookie_ttl_hours: int, cache_periods_days: int[], cache_refresh_minutes: int}
 */
function forwp_bundle_post_views_normalize_settings( $settings ) {
	$defaults  = forwp_bundle_post_views_get_default_settings();
	$available = array_keys( forwp_bundle_post_views_get_public_post_types() );
	$output    = $defaults;

	if ( is_array( $settings ) ) {
		if ( isset( $settings['enabled_post_types'] ) && is_array( $settings['enabled_post_types'] ) ) {
			$enabled = array_map( 'sanitize_key', $settings['enabled_post_types'] );
			$enabled = array_values( array_intersect( $enabled, $available ) );
			$output['enabled_post_types'] = $enabled;
		}
		if ( isset( $settings['cookie_ttl_hours'] ) ) {
			$ttl = (int) $settings['cookie_ttl_hours'];
			$ttl = max( 1, min( 24 * 365, $ttl ) );
			$output['cookie_ttl_hours'] = $ttl;
		}
		if ( isset( $settings['cache_periods_days'] ) ) {
			$output['cache_periods_days'] = forwp_bundle_post_views_parse_period_days( $settings['cache_periods_days'] );
		}
		if ( isset( $settings['cache_refresh_minutes'] ) ) {
			$refresh = (int) $settings['cache_refresh_minutes'];
			if ( ! in_array( $refresh, forwp_bundle_post_views_get_allowed_refresh_intervals(), true ) ) {
				$refresh = $defaults['cache_refresh_minutes'];
			}
			$output['cache_refresh_minutes'] = $refresh;
		}
	}

	return $output;
}

/**
 * Return current post views settings.
 *
 * @return array{enabled_post_types: string[], cookie_ttl_hours: int}
 */
function forwp_bundle_post_views_get_settings() {
	$saved = get_option( FORWP_BUNDLE_POST_VIEWS_SETTINGS_OPTION, array() );
	return forwp_bundle_post_views_normalize_settings( $saved );
}

/**
 * Save post views settings.
 *
 * @param mixed $settings Settings payload.
 * @return void
 */
function forwp_bundle_post_views_update_settings( $settings ) {
	update_option(
		FORWP_BUNDLE_POST_VIEWS_SETTINGS_OPTION,
		forwp_bundle_post_views_normalize_settings( $settings )
	);

	forwp_bundle_post_views_sync_cron_schedule();
}

/**
 * Check if addon "post-view" is enabled.
 *
 * @return bool
 */
function forwp_bundle_is_post_view_addon_enabled() {
	if ( ! function_exists( 'forwp_bundle_get_addon_slugs' ) ) {
		return false;
	}

	$slugs = forwp_bundle_get_addon_slugs();
	if ( ! in_array( 'post-view', $slugs, true ) ) {
		return false;
	}

	$saved   = get_option( FORWP_BUNDLE_ADDONS_OPTION, array() );
	$enabled = is_array( $saved ) && ! empty( $saved ) ? $saved : $slugs;

	return in_array( 'post-view', $enabled, true );
}

/**
 * Return currently enabled post types for tracking.
 *
 * @return string[]
 */
function forwp_bundle_post_views_get_trackable_post_types() {
	$settings = forwp_bundle_post_views_get_settings();
	return $settings['enabled_post_types'];
}

/**
 * Return postmeta key for period cache.
 *
 * @param int $days Number of days.
 * @return string
 */
function forwp_bundle_post_views_get_period_meta_key( $days ) {
	$days = max( 1, min( 365, (int) $days ) );
	return '_forwp_post_views_' . $days . 'd';
}

/**
 * Add custom cron intervals for cache refresh.
 *
 * @param array<string, array{interval:int,display:string}> $schedules Existing schedules.
 * @return array<string, array{interval:int,display:string}>
 */
function forwp_bundle_post_views_cron_schedules( $schedules ) {
	foreach ( FORWP_BUNDLE_POST_VIEWS_CRON_INTERVALS as $minutes => $label ) {
		$key               = 'forwp_pv_' . (int) $minutes . 'm';
		$schedules[ $key ] = array(
			'interval' => (int) $minutes * MINUTE_IN_SECONDS,
			'display'  => sprintf(
				/* translators: %d: minutes count. */
				__( '4WP Post Views every %d minutes', '4wp-bundle' ),
				(int) $minutes
			),
		);
	}

	return $schedules;
}
add_filter( 'cron_schedules', 'forwp_bundle_post_views_cron_schedules' );

/**
 * Sync cron schedule for post views cache refresh.
 *
 * @return void
 */
function forwp_bundle_post_views_sync_cron_schedule() {
	$timestamp = wp_next_scheduled( FORWP_BUNDLE_POST_VIEWS_CRON_HOOK );
	$settings  = forwp_bundle_post_views_get_settings();
	$minutes   = (int) $settings['cache_refresh_minutes'];
	$schedule  = 'forwp_pv_' . $minutes . 'm';
	$is_enabled = forwp_bundle_is_post_view_addon_enabled();

	if ( ! $is_enabled ) {
		if ( $timestamp ) {
			wp_clear_scheduled_hook( FORWP_BUNDLE_POST_VIEWS_CRON_HOOK );
		}
		return;
	}

	$event = function_exists( 'wp_get_scheduled_event' )
		? wp_get_scheduled_event( FORWP_BUNDLE_POST_VIEWS_CRON_HOOK )
		: null;

	if ( $timestamp && is_object( $event ) && isset( $event->schedule ) && $event->schedule !== $schedule ) {
		wp_clear_scheduled_hook( FORWP_BUNDLE_POST_VIEWS_CRON_HOOK );
		$timestamp = false;
	}

	if ( ! $timestamp ) {
		wp_schedule_event( time() + MINUTE_IN_SECONDS, $schedule, FORWP_BUNDLE_POST_VIEWS_CRON_HOOK );
	}
}

/**
 * Rebuild post views meta cache from tracking table.
 *
 * @return void
 */
function forwp_bundle_post_views_rebuild_meta_cache() {
	global $wpdb;

	$settings   = forwp_bundle_post_views_get_settings();
	$post_types = forwp_bundle_post_views_get_trackable_post_types();
	$table_name = forwp_bundle_post_views_table_name();

	if ( empty( $post_types ) ) {
		return;
	}

	$type_placeholders = implode( ',', array_fill( 0, count( $post_types ), '%s' ) );
	$total_sql         = $wpdb->prepare(
		"SELECT post_id, COUNT(*) AS views
		FROM {$table_name}
		WHERE post_type IN ({$type_placeholders})
		GROUP BY post_id",
		$post_types
	);
	$total_rows        = $wpdb->get_results( $total_sql, ARRAY_A );

	if ( is_array( $total_rows ) ) {
		foreach ( $total_rows as $row ) {
			$post_id = isset( $row['post_id'] ) ? (int) $row['post_id'] : 0;
			if ( $post_id <= 0 ) {
				continue;
			}
			$views = isset( $row['views'] ) ? (int) $row['views'] : 0;
			update_post_meta( $post_id, FORWP_BUNDLE_POST_VIEWS_META_KEY, $views );
		}
	}

	foreach ( $settings['cache_periods_days'] as $days ) {
		$days     = (int) $days;
		$from     = gmdate( 'Y-m-d H:i:s', time() - ( $days * DAY_IN_SECONDS ) );
		$meta_key = forwp_bundle_post_views_get_period_meta_key( $days );
		forwp_bundle_post_views_reset_period_meta( $meta_key, $post_types );
		$sql      = $wpdb->prepare(
			"SELECT post_id, COUNT(*) AS views
			FROM {$table_name}
			WHERE post_type IN ({$type_placeholders}) AND viewed_at >= %s
			GROUP BY post_id",
			array_merge( $post_types, array( $from ) )
		);
		$rows     = $wpdb->get_results( $sql, ARRAY_A );

		if ( ! is_array( $rows ) ) {
			continue;
		}

		foreach ( $rows as $row ) {
			$post_id = isset( $row['post_id'] ) ? (int) $row['post_id'] : 0;
			if ( $post_id <= 0 ) {
				continue;
			}
			$views = isset( $row['views'] ) ? (int) $row['views'] : 0;
			update_post_meta( $post_id, $meta_key, $views );
		}
	}
}

/**
 * Reset period-based meta cache to zero before recalculation.
 *
 * @param string   $meta_key   Meta key.
 * @param string[] $post_types Post types.
 * @return void
 */
function forwp_bundle_post_views_reset_period_meta( $meta_key, $post_types ) {
	global $wpdb;

	if ( '' === $meta_key || empty( $post_types ) ) {
		return;
	}

	$type_placeholders = implode( ',', array_fill( 0, count( $post_types ), '%s' ) );
	$sql               = $wpdb->prepare(
		"UPDATE {$wpdb->postmeta} pm
		INNER JOIN {$wpdb->posts} p ON p.ID = pm.post_id
		SET pm.meta_value = '0'
		WHERE pm.meta_key = %s
			AND p.post_type IN ({$type_placeholders})",
		array_merge( array( $meta_key ), $post_types )
	);

	$wpdb->query( $sql );
}

/**
 * Cron callback: refresh all post view caches.
 *
 * @return void
 */
function forwp_bundle_post_views_refresh_cache_cron() {
	if ( ! forwp_bundle_is_post_view_addon_enabled() ) {
		return;
	}
	forwp_bundle_post_views_rebuild_meta_cache();
}
add_action( FORWP_BUNDLE_POST_VIEWS_CRON_HOOK, 'forwp_bundle_post_views_refresh_cache_cron' );

/**
 * Create/upgrade table on plugin activation.
 *
 * @return void
 */
function forwp_bundle_post_views_activate() {
	global $wpdb;

	require_once ABSPATH . 'wp-admin/includes/upgrade.php';

	$table_name      = forwp_bundle_post_views_table_name();
	$charset_collate = $wpdb->get_charset_collate();
	$sql             = "CREATE TABLE {$table_name} (
		id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
		post_id bigint(20) unsigned NOT NULL,
		post_type varchar(32) NOT NULL,
		user_id bigint(20) unsigned DEFAULT NULL,
		ip_hash char(64) DEFAULT '' NOT NULL,
		user_agent varchar(255) DEFAULT '' NOT NULL,
		referrer_url varchar(255) DEFAULT '' NOT NULL,
		request_url varchar(255) DEFAULT '' NOT NULL,
		viewed_at datetime NOT NULL,
		PRIMARY KEY  (id),
		KEY post_id (post_id),
		KEY post_type (post_type),
		KEY viewed_at (viewed_at),
		KEY post_period (post_id, viewed_at)
	) {$charset_collate};";

	dbDelta( $sql );

	if ( false === get_option( FORWP_BUNDLE_POST_VIEWS_SETTINGS_OPTION, false ) ) {
		update_option( FORWP_BUNDLE_POST_VIEWS_SETTINGS_OPTION, forwp_bundle_post_views_get_default_settings() );
	}

	update_option( '4wp_bundle_post_views_db_version', FORWP_BUNDLE_POST_VIEWS_DB_VERSION );
	forwp_bundle_post_views_sync_cron_schedule();
	forwp_bundle_post_views_rebuild_meta_cache();
}

/**
 * Ensure table exists after plugin updates without manual reactivation.
 *
 * @return void
 */
function forwp_bundle_post_views_maybe_upgrade() {
	$current = (string) get_option( '4wp_bundle_post_views_db_version', '' );
	if ( FORWP_BUNDLE_POST_VIEWS_DB_VERSION !== $current ) {
		forwp_bundle_post_views_activate();
	}
}
add_action( 'init', 'forwp_bundle_post_views_maybe_upgrade', 5 );
add_action( 'init', 'forwp_bundle_post_views_sync_cron_schedule', 25 );

/**
 * Maybe track singular post view.
 *
 * @return void
 */
function forwp_bundle_track_post_view() {
	if ( ! forwp_bundle_is_post_view_addon_enabled() ) {
		return;
	}
	if ( is_admin() || ! is_singular() || is_preview() || is_feed() || is_robots() || is_trackback() ) {
		return;
	}
	if ( wp_doing_ajax() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
		return;
	}

	$post_id = (int) get_queried_object_id();
	if ( $post_id <= 0 ) {
		return;
	}

	$post_type = get_post_type( $post_id );
	if ( ! is_string( $post_type ) || '' === $post_type ) {
		return;
	}

	$trackable_post_types = forwp_bundle_post_views_get_trackable_post_types();
	if ( ! in_array( $post_type, $trackable_post_types, true ) ) {
		return;
	}

	$cookie_name = 'forwp_pv_' . $post_id;
	if ( isset( $_COOKIE[ $cookie_name ] ) ) {
		return;
	}

	$tracked = forwp_bundle_insert_post_view( $post_id, $post_type );
	if ( ! $tracked || headers_sent() ) {
		return;
	}

	$settings = forwp_bundle_post_views_get_settings();
	$expires  = time() + ( $settings['cookie_ttl_hours'] * HOUR_IN_SECONDS );
	setcookie(
		$cookie_name,
		'1',
		array(
			'expires'  => $expires,
			'path'     => defined( 'COOKIEPATH' ) ? COOKIEPATH : '/',
			'domain'   => defined( 'COOKIE_DOMAIN' ) ? COOKIE_DOMAIN : '',
			'secure'   => is_ssl(),
			'httponly' => true,
			'samesite' => 'Lax',
		)
	);
}
add_action( 'template_redirect', 'forwp_bundle_track_post_view', 20 );

/**
 * Insert view row and update total counter.
 *
 * @param int    $post_id   Post ID.
 * @param string $post_type Post type slug.
 * @return bool
 */
function forwp_bundle_insert_post_view( $post_id, $post_type ) {
	global $wpdb;

	$table_name = forwp_bundle_post_views_table_name();
	$ip         = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
	$ip_hash    = '' !== $ip ? hash( 'sha256', $ip . wp_salt( 'nonce' ) ) : '';
	$user_agent = isset( $_SERVER['HTTP_USER_AGENT'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) ) : '';
	$referrer   = isset( $_SERVER['HTTP_REFERER'] ) ? esc_url_raw( wp_unslash( $_SERVER['HTTP_REFERER'] ) ) : '';
	$request    = isset( $_SERVER['REQUEST_URI'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '';
	$viewed_at  = current_time( 'mysql', true );
	$user_id    = is_user_logged_in() ? get_current_user_id() : 0;

	$inserted = $wpdb->insert(
		$table_name,
		array(
			'post_id'      => $post_id,
			'post_type'    => $post_type,
			'user_id'      => $user_id,
			'ip_hash'      => substr( $ip_hash, 0, 64 ),
			'user_agent'   => substr( $user_agent, 0, 255 ),
			'referrer_url' => substr( $referrer, 0, 255 ),
			'request_url'  => substr( $request, 0, 255 ),
			'viewed_at'    => $viewed_at,
		),
		array( '%d', '%s', '%d', '%s', '%s', '%s', '%s', '%s' )
	);

	if ( false === $inserted ) {
		return false;
	}

	$current_total = (int) get_post_meta( $post_id, FORWP_BUNDLE_POST_VIEWS_META_KEY, true );
	update_post_meta( $post_id, FORWP_BUNDLE_POST_VIEWS_META_KEY, $current_total + 1 );
	$settings = forwp_bundle_post_views_get_settings();
	foreach ( $settings['cache_periods_days'] as $days ) {
		$meta_key      = forwp_bundle_post_views_get_period_meta_key( (int) $days );
		$current_views = (int) get_post_meta( $post_id, $meta_key, true );
		update_post_meta( $post_id, $meta_key, $current_views + 1 );
	}

	return true;
}

/**
 * Return total views from cached post meta.
 *
 * @param int $post_id Post ID.
 * @return int
 */
function forwp_bundle_get_post_views_total( $post_id ) {
	return (int) get_post_meta( $post_id, FORWP_BUNDLE_POST_VIEWS_META_KEY, true );
}

/**
 * Return views count for period in days.
 *
 * @param int $post_id Post ID.
 * @param int $days    Days in range.
 * @return int
 */
function forwp_bundle_get_post_views_for_period( $post_id, $days = 7 ) {
	$days = max( 1, min( 365, (int) $days ) );
	$settings = forwp_bundle_post_views_get_settings();
	if ( in_array( $days, $settings['cache_periods_days'], true ) ) {
		return (int) get_post_meta( $post_id, forwp_bundle_post_views_get_period_meta_key( $days ), true );
	}

	global $wpdb;
	$from = gmdate( 'Y-m-d H:i:s', time() - ( $days * DAY_IN_SECONDS ) );

	$table_name = forwp_bundle_post_views_table_name();
	$sql        = $wpdb->prepare(
		"SELECT COUNT(*) FROM {$table_name} WHERE post_id = %d AND viewed_at >= %s",
		$post_id,
		$from
	);

	return (int) $wpdb->get_var( $sql );
}

/**
 * Return popular posts for period.
 *
 * @param array{post_type?: string, days?: int, limit?: int} $args Query args.
 * @return array<int, array{post_id: int, views: int}>
 */
function forwp_bundle_get_popular_posts( $args = array() ) {
	global $wpdb;

	$post_type = isset( $args['post_type'] ) ? sanitize_key( (string) $args['post_type'] ) : '';
	$days      = isset( $args['days'] ) ? max( 1, min( 365, (int) $args['days'] ) ) : 7;
	$limit     = isset( $args['limit'] ) ? max( 1, min( 100, (int) $args['limit'] ) ) : 10;
	$from      = gmdate( 'Y-m-d H:i:s', time() - ( $days * DAY_IN_SECONDS ) );
	$table     = forwp_bundle_post_views_table_name();

	if ( '' !== $post_type ) {
		$sql = $wpdb->prepare(
			"SELECT post_id, COUNT(*) AS views
			FROM {$table}
			WHERE viewed_at >= %s AND post_type = %s
			GROUP BY post_id
			ORDER BY views DESC
			LIMIT %d",
			$from,
			$post_type,
			$limit
		);
	} else {
		$sql = $wpdb->prepare(
			"SELECT post_id, COUNT(*) AS views
			FROM {$table}
			WHERE viewed_at >= %s
			GROUP BY post_id
			ORDER BY views DESC
			LIMIT %d",
			$from,
			$limit
		);
	}

	$rows = $wpdb->get_results( $sql, ARRAY_A );
	if ( ! is_array( $rows ) ) {
		return array();
	}

	return array_map(
		static function( $row ) {
			return array(
				'post_id' => isset( $row['post_id'] ) ? (int) $row['post_id'] : 0,
				'views'   => isset( $row['views'] ) ? (int) $row['views'] : 0,
			);
		},
		$rows
	);
}

/**
 * Configure query args to sort posts by popular period meta.
 *
 * @param array<string, mixed> $args Query args.
 * @param int                  $days Days in period.
 * @return array<string, mixed>
 */
function forwp_bundle_prepare_popular_query_args( $args, $days = 7 ) {
	$days              = max( 1, min( 365, (int) $days ) );
	$args['forwp_popular_days'] = $days;
	$args['meta_key']  = forwp_bundle_post_views_get_period_meta_key( $days );
	$args['orderby']   = 'meta_value_num';
	$args['order']     = 'DESC';
	$args['meta_type'] = 'NUMERIC';

	return $args;
}

/**
 * Support classic WP_Query sorting by passing forwp_popular_days.
 *
 * @param WP_Query $query Query object.
 * @return void
 */
function forwp_bundle_post_views_pre_get_posts( $query ) {
	if ( ! $query instanceof WP_Query ) {
		return;
	}

	$days = (int) $query->get( 'forwp_popular_days' );
	if ( $days <= 0 ) {
		return;
	}

	$args = forwp_bundle_prepare_popular_query_args( array(), $days );
	$query->set( 'meta_key', $args['meta_key'] );
	$query->set( 'orderby', $args['orderby'] );
	$query->set( 'order', $args['order'] );
	$query->set( 'meta_type', $args['meta_type'] );
	$query->set( 'forwp_popular_days', $days );
}
add_action( 'pre_get_posts', 'forwp_bundle_post_views_pre_get_posts', 999 );

/**
 * Enable custom query var for popularity sorting.
 *
 * @param string[] $vars Query vars.
 * @return string[]
 */
function forwp_bundle_post_views_query_vars( $vars ) {
	$vars[] = 'forwp_popular_days';
	return $vars;
}
add_filter( 'query_vars', 'forwp_bundle_post_views_query_vars' );

/**
 * Query Loop integration through block class, e.g. "forwp-popular-7d".
 *
 * @param array<string, mixed> $query Block query vars.
 * @param WP_Block             $block Block instance.
 * @return array<string, mixed>
 */
function forwp_bundle_query_loop_popular_vars( $query, $block ) {
	$class_name = '';
	if ( isset( $block->parsed_block['attrs']['className'] ) ) {
		$class_name = (string) $block->parsed_block['attrs']['className'];
	}

	if ( '' === $class_name ) {
		return $query;
	}

	if ( ! preg_match( '/forwp-popular-(\d+)d/', $class_name, $matches ) ) {
		return $query;
	}

	$days = isset( $matches[1] ) ? (int) $matches[1] : 0;
	if ( $days <= 0 ) {
		return $query;
	}

	return forwp_bundle_prepare_popular_query_args( $query, $days );
}
add_filter( 'query_loop_block_query_vars', 'forwp_bundle_query_loop_popular_vars', 999, 2 );

/**
 * Pre-shape core/query block attrs for builders that override query vars.
 *
 * @param array<string, mixed>      $parsed_block Parsed block data.
 * @param array<string, mixed>|null $source_block Source block.
 * @param WP_Block|null             $parent_block Parent block.
 * @return array<string, mixed>
 */
function forwp_bundle_query_loop_popular_render_block_data( $parsed_block, $source_block = null, $parent_block = null ) {
	if ( ! is_array( $parsed_block ) || ! isset( $parsed_block['blockName'] ) || 'core/query' !== $parsed_block['blockName'] ) {
		return $parsed_block;
	}

	$class_name = '';
	if ( isset( $parsed_block['attrs']['className'] ) ) {
		$class_name = (string) $parsed_block['attrs']['className'];
	}
	if ( '' === $class_name || ! preg_match( '/forwp-popular-(\d+)d/', $class_name, $matches ) ) {
		return $parsed_block;
	}

	$days = isset( $matches[1] ) ? (int) $matches[1] : 0;
	if ( $days <= 0 ) {
		return $parsed_block;
	}

	$meta_key = forwp_bundle_post_views_get_period_meta_key( $days );

	if ( ! isset( $parsed_block['attrs'] ) || ! is_array( $parsed_block['attrs'] ) ) {
		$parsed_block['attrs'] = array();
	}
	if ( ! isset( $parsed_block['attrs']['query'] ) || ! is_array( $parsed_block['attrs']['query'] ) ) {
		$parsed_block['attrs']['query'] = array();
	}

	$parsed_block['attrs']['query']['orderBy']  = 'meta_value_num';
	$parsed_block['attrs']['query']['order']    = 'desc';
	$parsed_block['attrs']['query']['metaKey']  = $meta_key;
	$parsed_block['attrs']['query']['meta_key'] = $meta_key;
	$parsed_block['attrs']['query']['metaType'] = 'NUMERIC';
	$parsed_block['attrs']['query']['meta_type'] = 'NUMERIC';
	$parsed_block['attrs']['query']['forwp_popular_days'] = $days;

	return $parsed_block;
}
add_filter( 'render_block_data', 'forwp_bundle_query_loop_popular_render_block_data', 20, 3 );

/**
 * Append views counter to single post content as a reliable fallback.
 *
 * @param string $content Post content HTML.
 * @return string
 */
function forwp_bundle_append_post_views_to_content( $content ) {
	$is_enabled = (bool) apply_filters( 'forwp_bundle_enable_post_views_content_fallback', false );
	if ( ! $is_enabled ) {
		return $content;
	}

	if ( is_admin() || ! is_singular( 'post' ) || ! in_the_loop() || ! is_main_query() ) {
		return $content;
	}

	$post_id = get_the_ID();
	if ( ! $post_id ) {
		return $content;
	}

	$views = forwp_bundle_get_post_views_total( (int) $post_id );
	$line  = sprintf(
		'<p class="forwp-post-view-fallback" style="margin-top:16px;opacity:.85;">%s <strong>%s</strong></p>',
		esc_html__( 'Views:', '4wp-bundle' ),
		esc_html( number_format_i18n( $views ) )
	);

	return $content . $line;
}
add_filter( 'the_content', 'forwp_bundle_append_post_views_to_content', 30 );
