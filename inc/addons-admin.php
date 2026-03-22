<?php
/**
 * 4WP Bundle - Addons admin page.
 *
 * @package 4wp-bundle
 */

defined( 'ABSPATH' ) || exit;

const FORWP_BUNDLE_ADDONS_NONCE_ACTION = '4wp_bundle_save_addons';

/**
 * Get addons list with title and description from block.json.
 *
 * @return array<string, array{title: string, description: string}>
 */
function forwp_bundle_get_addons_for_admin() {
	$slugs = forwp_bundle_get_addon_slugs();
	$addons_dir = plugin_dir_path( __FILE__ ) . '../addons';
	$result = array();
	foreach ( $slugs as $slug ) {
		$json_path = $addons_dir . '/' . $slug . '/block.json';
		if ( ! file_exists( $json_path ) ) {
			continue;
		}
		$json = wp_json_file_decode( $json_path, array( 'associative' => true ) );
		if ( ! is_array( $json ) ) {
			$result[ $slug ] = array(
				'title'       => $slug,
				'description' => '',
			);
			continue;
		}
		$result[ $slug ] = array(
			'title'       => isset( $json['title'] ) ? (string) $json['title'] : $slug,
			'description' => isset( $json['description'] ) ? (string) $json['description'] : '',
		);
	}
	return $result;
}

/**
 * Handle POST save of addons enabled state.
 */
function forwp_bundle_addons_admin_save() {
	if ( ! isset( $_POST['4wp_bundle_addons_nonce'] ) ) {
		return;
	}
	if ( ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['4wp_bundle_addons_nonce'] ) ), FORWP_BUNDLE_ADDONS_NONCE_ACTION ) ) {
		return;
	}
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$enabled = array();
	if ( ! empty( $_POST['4wp_bundle_addons_enabled'] ) && is_array( $_POST['4wp_bundle_addons_enabled'] ) ) {
		$allowed = forwp_bundle_get_addon_slugs();
		foreach ( array_map( 'sanitize_text_field', wp_unslash( $_POST['4wp_bundle_addons_enabled'] ) ) as $slug ) {
			if ( in_array( $slug, $allowed, true ) ) {
				$enabled[] = $slug;
			}
		}
	}
	update_option( FORWP_BUNDLE_ADDONS_OPTION, $enabled );
	add_settings_error(
		'4wp_bundle_addons',
		'saved',
		__( 'Addons saved.', '4wp-bundle' ),
		'success'
	);
	wp_safe_redirect( add_query_arg( 'settings-updated', '1', wp_get_referer() ?: admin_url( 'admin.php?page=4wp-bundle-addons' ) ) );
	exit;
}

/**
 * Render the Addons admin page.
 */
function render_4wp_bundle_addons_page() {
	forwp_bundle_addons_admin_save();

	$addons = forwp_bundle_get_addons_for_admin();
	$saved   = get_option( FORWP_BUNDLE_ADDONS_OPTION, array() );
	$enabled = is_array( $saved ) ? $saved : array();
	$slugs   = forwp_bundle_get_addon_slugs();
	if ( empty( $enabled ) && ! empty( $slugs ) ) {
		$enabled = $slugs;
	}

	settings_errors( '4wp_bundle_addons' );
	?>
	<div class="wrap">
		<h1><?php esc_html_e( 'Addons', '4wp-bundle' ); ?></h1>
		<p><?php esc_html_e( 'Enable or disable built-in block addons. Disabled addons will not appear in the block editor.', '4wp-bundle' ); ?></p>

		<form method="post" action="">
			<?php wp_nonce_field( FORWP_BUNDLE_ADDONS_NONCE_ACTION, '4wp_bundle_addons_nonce' ); ?>
			<table class="widefat striped" style="max-width: 640px;">
				<thead>
					<tr>
						<th style="width: 2em;"><?php esc_html_e( 'Enable', '4wp-bundle' ); ?></th>
						<th><?php esc_html_e( 'Addon', '4wp-bundle' ); ?></th>
						<th><?php esc_html_e( 'Description', '4wp-bundle' ); ?></th>
					</tr>
				</thead>
				<tbody>
					<?php
					if ( empty( $addons ) ) {
						echo '<tr><td colspan="3">' . esc_html__( 'No addons found. Run build to compile addons.', '4wp-bundle' ) . '</td></tr>';
					} else {
						foreach ( $addons as $slug => $info ) {
							$checked = in_array( $slug, $enabled, true ) ? ' checked="checked"' : '';
							?>
							<tr>
								<td>
									<input type="checkbox"
										name="4wp_bundle_addons_enabled[]"
										value="<?php echo esc_attr( $slug ); ?>"
										id="addon-<?php echo esc_attr( $slug ); ?>"
										<?php echo $checked; ?>
									/>
								</td>
								<td>
									<label for="addon-<?php echo esc_attr( $slug ); ?>"><?php echo esc_html( $info['title'] ); ?></label>
								</td>
								<td><?php echo esc_html( $info['description'] ); ?></td>
							</tr>
							<?php
						}
					}
					?>
				</tbody>
			</table>
			<p class="submit">
				<?php submit_button( __( 'Save', '4wp-bundle' ), 'primary', 'submit', false ); ?>
			</p>
		</form>
	</div>
	<?php
}
