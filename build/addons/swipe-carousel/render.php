<?php
/**
 * 4WP Swipe Carousel — server render (each inner block = one slide).
 * Output is captured by WordPress (ob) when this file is required.
 *
 * @package 4wp-bundle
 *
 * @var array         $attributes Block attributes.
 * @var string        $content    Inner HTML.
 * @var WP_Block|null $block      Block instance.
 */

defined( 'ABSPATH' ) || exit;

/**
 * Атрибути блоку інколи приходять рядком; у PHP (bool) 'false' === true.
 *
 * @param mixed $v Raw attribute.
 * @return bool
 */
if ( ! function_exists( 'forwp_swipe_carousel_rest_bool' ) ) {
	function forwp_swipe_carousel_rest_bool( $v ) {
		if ( is_bool( $v ) ) {
			return $v;
		}
		if ( is_string( $v ) ) {
			$s = strtolower( trim( $v ) );
			if ( in_array( $s, array( 'false', '0', 'no', 'off', '' ), true ) ) {
				return false;
			}
			if ( in_array( $s, array( 'true', '1', 'yes', 'on' ), true ) ) {
				return true;
			}
		}
		return (bool) $v;
	}
}

if ( empty( $block->inner_blocks ) ) {
	return;
}

$defaults = array(
	'carouselMobile'   => true,
	'carouselTablet'   => true,
	'carouselDesktop'  => false,
	'slidesPerView'    => 1,
	'spaceBetween'     => 16,
	'loop'             => false,
	'autoplay'         => false,
	'autoplayDelay'    => 5000,
	'pagination'       => true,
	'navigation'       => true,
);
$a = wp_parse_args( $attributes, $defaults );

$a['carouselMobile']  = forwp_swipe_carousel_rest_bool( $a['carouselMobile'] );
$a['carouselTablet']  = forwp_swipe_carousel_rest_bool( $a['carouselTablet'] );
$a['carouselDesktop'] = forwp_swipe_carousel_rest_bool( $a['carouselDesktop'] );
$a['loop']            = forwp_swipe_carousel_rest_bool( $a['loop'] );
$a['autoplay']        = forwp_swipe_carousel_rest_bool( $a['autoplay'] );
$a['pagination']      = forwp_swipe_carousel_rest_bool( $a['pagination'] );
$a['navigation']      = forwp_swipe_carousel_rest_bool( $a['navigation'] );

$slides_html = '';
foreach ( $block->inner_blocks as $inner_block ) {
	$inner_html = is_object( $inner_block ) && method_exists( $inner_block, 'render' )
		? $inner_block->render()
		: render_block( $inner_block );
	$slides_html .= '<div class="swiper-slide forwp-swipe-carousel__slide">' . $inner_html . '</div>';
}

$config = array(
	'm'             => (bool) $a['carouselMobile'],
	't'             => (bool) $a['carouselTablet'],
	'd'             => (bool) $a['carouselDesktop'],
	'slidesPerView' => (float) $a['slidesPerView'],
	'spaceBetween'  => (int) $a['spaceBetween'],
	'loop'          => (bool) $a['loop'],
	'autoplay'      => (bool) $a['autoplay'],
	'autoplayDelay' => (int) $a['autoplayDelay'],
	'pagination'    => (bool) $a['pagination'],
	'navigation'    => (bool) $a['navigation'],
);

$no_carousel = ! $a['carouselMobile'] && ! $a['carouselTablet'] && ! $a['carouselDesktop'];
if ( $no_carousel ) {
	$static = '';
	foreach ( $block->inner_blocks as $inner_block ) {
		$inner_html = is_object( $inner_block ) && method_exists( $inner_block, 'render' )
			? $inner_block->render()
			: render_block( $inner_block );
		$static .= '<div class="forwp-swipe-carousel__static-item">' . $inner_html . '</div>';
	}
	echo '<div ' . get_block_wrapper_attributes( array( 'class' => 'forwp-swipe-carousel forwp-swipe-carousel--stacked' ) ) . '>';
	echo '<div class="forwp-swipe-carousel__static">' . $static . '</div></div>';
	return;
}

$wrapper_attrs = get_block_wrapper_attributes(
	array(
		'class'                    => 'forwp-swipe-carousel',
		'data-forwp-swiper-config' => wp_json_encode( $config ),
	)
);

$controls_inner = '';
if ( $a['navigation'] ) {
	$controls_inner .= '<div class="swiper-button-prev forwp-swipe-carousel__nav forwp-swipe-carousel__nav--prev" aria-label="' . esc_attr__( 'Previous slide', '4wp-bundle' ) . '"></div>';
}
if ( $a['pagination'] ) {
	$controls_inner .= '<div class="swiper-pagination forwp-swipe-carousel__pagination"></div>';
}
if ( $a['navigation'] ) {
	$controls_inner .= '<div class="swiper-button-next forwp-swipe-carousel__nav forwp-swipe-carousel__nav--next" aria-label="' . esc_attr__( 'Next slide', '4wp-bundle' ) . '"></div>';
}
$controls = $controls_inner !== '' ? '<div class="forwp-swipe-carousel__controls">' . $controls_inner . '</div>' : '';

// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- inner HTML from render_block(); attrs from get_block_wrapper_attributes().
printf(
	'<div %1$s><div class="swiper forwp-swipe-carousel__swiper"><div class="swiper-wrapper">%2$s</div>%3$s</div></div>',
	$wrapper_attrs,
	$slides_html,
	$controls
);
