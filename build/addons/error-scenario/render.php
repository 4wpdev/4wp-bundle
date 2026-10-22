<?php
/**
 * 4WP Error Scenario — server render.
 * Prints the static error page and the scenario JSON; view.js plays it.
 *
 * @package 4wp-bundle
 *
 * @var array         $attributes Block attributes.
 * @var string        $content    Inner HTML.
 * @var WP_Block|null $block      Block instance.
 */

defined( 'ABSPATH' ) || exit;

$defaults = array(
	'code'          => '404',
	'heading'       => 'Page not found',
	'message'       => '',
	'terminalTitle' => 'agent@4wp.dev',
	'startDelay'    => 1500,
	'typingSpeed'   => 18,
	'fullHeight'    => true,
	'steps'         => array(),
);
$a = wp_parse_args( $attributes, $defaults );

$steps = array();
foreach ( (array) $a['steps'] as $step ) {
	if ( ! is_array( $step ) || empty( $step['type'] ) ) {
		continue;
	}
	$type = (string) $step['type'];
	switch ( $type ) {
		case 'log':
			$steps[] = array(
				'type' => 'log',
				'tone' => isset( $step['tone'] ) ? sanitize_key( $step['tone'] ) : 'info',
				'text' => isset( $step['text'] ) ? (string) $step['text'] : '',
			);
			break;
		case 'wait':
		case 'idle':
			$steps[] = array(
				'type' => $type,
				'ms'   => isset( $step['ms'] ) ? max( 0, min( 60000, (int) $step['ms'] ) ) : 1000,
				'text' => isset( $step['text'] ) ? (string) $step['text'] : '',
			);
			break;
		case 'button':
			$steps[] = array(
				'type'      => 'button',
				'linkLabel' => isset( $step['linkLabel'] ) ? (string) $step['linkLabel'] : '',
				'linkUrl'   => ! empty( $step['linkUrl'] ) ? esc_url_raw( $step['linkUrl'] ) : home_url( '/' ),
			);
			break;
		case 'fall':
			$steps[] = array(
				'type'  => 'fall',
				'index' => isset( $step['index'] ) ? max( 0, (int) $step['index'] ) : 1,
			);
			break;
		case 'banner':
			$media_id = isset( $step['mediaId'] ) ? (int) $step['mediaId'] : 0;
			$image    = $media_id ? wp_get_attachment_image_url( $media_id, 'large' ) : '';
			if ( ! $image && ! empty( $step['mediaUrl'] ) ) {
				$image = (string) $step['mediaUrl'];
			}
			$alt = $media_id ? (string) get_post_meta( $media_id, '_wp_attachment_image_alt', true ) : '';
			$steps[] = array(
				'type'      => 'banner',
				'image'     => $image ? esc_url_raw( $image ) : '',
				'alt'       => $alt,
				'title'     => isset( $step['title'] ) ? (string) $step['title'] : '',
				'text'      => isset( $step['text'] ) ? (string) $step['text'] : '',
				'linkUrl'   => ! empty( $step['linkUrl'] ) ? esc_url_raw( $step['linkUrl'] ) : '',
				'linkLabel' => isset( $step['linkLabel'] ) ? (string) $step['linkLabel'] : '',
			);
			break;
	}
}

$config = array(
	'startDelay'  => max( 0, (int) $a['startDelay'] ),
	'typingSpeed' => max( 0, (int) $a['typingSpeed'] ),
	'steps'       => $steps,
);

$classes = 'forwp-error-scenario';
if ( ! empty( $a['fullHeight'] ) && 'false' !== $a['fullHeight'] ) {
	$classes .= ' forwp-error-scenario--full';
}

// Default "back home" link: rendered server-side so it is there before JS runs.
$home_label = 'Back to Home';
$home_url   = home_url( '/' );
foreach ( $steps as $step ) {
	if ( 'button' === $step['type'] ) {
		$home_label = '' !== $step['linkLabel'] ? $step['linkLabel'] : $home_label;
		$home_url   = $step['linkUrl'];
	}
}

$wrapper_attrs = get_block_wrapper_attributes( array( 'class' => $classes ) );
?>
<section <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<div class="forwp-error-scenario__inner">
		<div class="forwp-error-scenario__page">
			<p class="forwp-error-scenario__code" aria-hidden="true"><?php
			foreach ( preg_split( '//u', (string) $a['code'], -1, PREG_SPLIT_NO_EMPTY ) as $char ) {
				echo '<span>' . esc_html( $char ) . '</span>';
			}
			?></p>
			<h1 class="forwp-error-scenario__heading"><?php echo esc_html( $a['heading'] ); ?></h1>
			<?php if ( '' !== $a['message'] ) : ?>
				<p class="forwp-error-scenario__message"><?php echo esc_html( $a['message'] ); ?></p>
			<?php endif; ?>
			<div class="forwp-error-scenario__banner-slot" aria-live="polite"></div>
			<div class="forwp-error-scenario__actions">
				<a class="forwp-error-scenario__home" href="<?php echo esc_url( $home_url ); ?>"><?php echo esc_html( $home_label ); ?></a>
				<button type="button" class="forwp-error-scenario__replay" hidden>&#9654; <?php esc_html_e( 'Play with me once more', '4wp-bundle' ); ?> <b><?php esc_html_e( 'FREE', '4wp-bundle' ); ?></b></button>
			</div>
		</div>
		<div class="forwp-error-scenario__terminal" aria-label="<?php esc_attr_e( 'Agent terminal', '4wp-bundle' ); ?>">
			<div class="forwp-error-scenario__bar">
				<span class="forwp-error-scenario__dots" aria-hidden="true"><i></i><i></i><i></i></span>
				<span class="forwp-error-scenario__title"><?php echo esc_html( $a['terminalTitle'] ); ?></span>
				<button type="button" class="forwp-error-scenario__close" aria-label="<?php esc_attr_e( 'Stop and close terminal', '4wp-bundle' ); ?>">×</button>
			</div>
			<div class="forwp-error-scenario__screen" role="log" aria-live="polite">
				<div class="forwp-error-scenario__splash" aria-hidden="true">
					<pre class="forwp-error-scenario__mascot"> ▐▛███▜▌
▝▜█████▛▘
  ▘▘ ▝▝</pre>
					<div class="forwp-error-scenario__splash-text">
						<strong>4WP Agent</strong> v0.4.04
						<span>RAG · 4wp.dev</span>
						<span>~/404</span>
					</div>
					<p class="forwp-error-scenario__splash-status">booting agent<i>.</i><i>.</i><i>.</i></p>
				</div>
				<ol class="forwp-error-scenario__lines"></ol>
				<span class="forwp-error-scenario__cursor" aria-hidden="true"></span>
			</div>
			<div class="forwp-error-scenario__progress" aria-hidden="true">
				<i class="forwp-error-scenario__progress-fill"></i>
				<span class="forwp-error-scenario__progress-label">scenario running…</span>
				<span class="forwp-error-scenario__progress-pct">0%</span>
			</div>
		</div>
	</div>
	<script type="application/json" class="forwp-error-scenario__data"><?php echo wp_json_encode( $config, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ); ?></script>
</section>
