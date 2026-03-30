/**
 * 4WP Swipe Carousel — stable runtime init.
 */
import './style-index.css';
import Swiper from 'swiper';
import { Autoplay, Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const DEBUG = false;

function logDebug( message, payload = {} ) {
	if ( ! DEBUG || typeof console === 'undefined' || ! console.log ) {
		return;
	}
	let serialized = '';
	try {
		serialized = JSON.stringify( payload );
	} catch ( err ) {
		serialized = '[unserializable]';
	}
	console.log( `[4WP Swipe Carousel] ${ message } ${ serialized }` );
}

function viewportWidth() {
	return Math.max( 1, window.innerWidth || document.documentElement?.clientWidth || 320 );
}

function clampMobileGutenbergCoverWidths( root ) {
	// Mobile-only fix for absurd cover background widths (e.g. 10M+ px) inside transformed/flex Swiper.
	if ( viewportWidth() >= 768 ) {
		return;
	}

	const now = Date.now();
	const last = Number( root?.dataset?.forwpCoverClampLastMs || 0 );
	if ( now - last < 300 ) {
		return;
	}
	if ( root?.dataset ) {
		root.dataset.forwpCoverClampLastMs = String( now );
	}

	if ( ! root?.querySelectorAll ) {
		return;
	}

	const targets = root.querySelectorAll(
		'.wp-block-cover, .wp-block-cover__background, .wp-block-cover__image-background, .wp-block-cover__inner-container'
	);

	const capPx = Math.max( 1, Math.min( viewportWidth(), 4096 ) ); // viewport is the real truth on mobile

	targets.forEach( ( el ) => {
		// Force cover and its background to follow the viewport width in px.
		// This avoids "100%" being computed from a broken (10M+) parent width.
		el.style.setProperty( 'width', capPx + 'px', 'important' );
		el.style.setProperty( 'max-width', capPx + 'px', 'important' );
		el.style.setProperty( 'min-width', '0', 'important' );
		el.style.setProperty( 'box-sizing', 'border-box', 'important' );

		if ( el.classList.contains( 'wp-block-cover__background' ) ) {
			// Background is usually absolutely positioned; lock its horizontal span.
			el.style.setProperty( 'left', '0', 'important' );
			el.style.setProperty( 'right', '0', 'important' );
		}

		if ( el.classList.contains( 'wp-block-cover' ) ) {
			el.style.setProperty( 'overflow', 'hidden', 'important' );
		}
	} );
}

const MAX_ABSURD_SWIPER_WIDTH = 5000;

function measureSaneSwiperWidth( el ) {
	const vp = viewportWidth();
	const rectW = el ? el.getBoundingClientRect().width : 0;
	const clientW = el ? el.clientWidth : 0;
	const parent = el?.parentElement;
	const parentRectW = parent ? parent.getBoundingClientRect().width : 0;

	const candidates = [ rectW, clientW, parentRectW, vp ];
	const sane = candidates.find(
		( w ) => Number.isFinite( w ) && w > 0 && w < MAX_ABSURD_SWIPER_WIDTH
	);
	return Math.floor( sane || vp );
}

function getWidthOverrideIfNeeded( el ) {
	const vp = viewportWidth();
	if ( vp >= 768 ) {
		return null;
	}

	const clientW = el?.clientWidth;
	const rectW = el?.getBoundingClientRect ? el.getBoundingClientRect().width : 0;
	const containerIsAbsurd =
		( Number.isFinite( clientW ) && clientW > MAX_ABSURD_SWIPER_WIDTH ) ||
		( Number.isFinite( rectW ) && rectW > MAX_ABSURD_SWIPER_WIDTH ) ||
		! Number.isFinite( clientW ) ||
		clientW === 0;

	if ( ! containerIsAbsurd ) {
		return null;
	}

	return measureSaneSwiperWidth( el );
}

function enabledAtCurrentViewport( config ) {
	const w = viewportWidth();
	if ( w < 768 ) {
		return !! config.m;
	}
	if ( w < 1024 ) {
		return !! config.t;
	}
	return !! config.d;
}

function parseConfig( root ) {
	const raw = root.getAttribute( 'data-forwp-swiper-config' ) || '';
	if ( ! raw ) {
		return null;
	}

	const decodeHtmlEntities = ( input ) =>
		input
			.replaceAll( '&quot;', '"' )
			.replaceAll( '&#34;', '"' )
			.replaceAll( '&apos;', "'" )
			.replaceAll( '&#39;', "'" )
			.replaceAll( '&amp;', '&' );

	try {
		return JSON.parse( raw );
	} catch ( firstErr ) {
		try {
			return JSON.parse( decodeHtmlEntities( raw ) );
		} catch ( secondErr ) {
			if ( typeof console !== 'undefined' && console.warn ) {
				console.warn( '[4WP Swipe Carousel] Invalid config JSON', { raw } );
			}
			return null;
		}
	}
}

function toNumber( value, fallback ) {
	const n = Number( value );
	return Number.isFinite( n ) ? n : fallback;
}

function destroyIfAny( root, el ) {
	if ( el?.swiper && ! el.swiper.destroyed ) {
		el.swiper.destroy( true, true );
	}
	root.classList.remove( 'forwp-swipe-carousel--init-failed' );
}

function applyStackMode( root, el ) {
	destroyIfAny( root, el );
	root.classList.add( 'forwp-swipe-carousel--runtime-disabled' );
	root.dataset.forwpSwiperReady = '1';
	clampMobileGutenbergCoverWidths( root );
	logDebug( 'stack mode', { id: root.id || null } );
}

function applySwiperMode( root, el, config ) {
	root.classList.remove( 'forwp-swipe-carousel--runtime-disabled' );
	root.classList.remove( 'forwp-swipe-carousel--init-failed' );

	// On mobile we must not trust Swiper's measured container width (it can become absurd on this theme).
	// Use sanity-checked candidates; in worst case it falls back to viewport width.
	const widthOverride = viewportWidth() < 768 ? measureSaneSwiperWidth( el ) : null;
	if ( widthOverride ) {
		// Help Swiper + layout agree on container width (not only params.width).
		el.style.width = widthOverride + 'px';
		el.style.maxWidth = widthOverride + 'px';
	}

	// If already initialized — just refresh.
	if ( el?.swiper && ! el.swiper.destroyed ) {
		if ( widthOverride ) {
			// Swiper caches width in its params; override when container width is broken.
			el.swiper.params.width = widthOverride;
			el.style.width = widthOverride + 'px';
			el.style.maxWidth = widthOverride + 'px';
		}
		el.swiper.update();
		clampMobileGutenbergCoverWidths( root );
		requestAnimationFrame( () => clampMobileGutenbergCoverWidths( root ) );
		root.dataset.forwpSwiperReady = '1';
		return;
	}

	clampMobileGutenbergCoverWidths( root );

	const modules = [];
	if ( config.pagination ) {
		modules.push( Pagination );
	}
	if ( config.navigation ) {
		modules.push( Navigation );
	}
	if ( config.autoplay ) {
		modules.push( Autoplay );
	}

	const slidesPerView = Math.min( 3, Math.max( 1, toNumber( config.slidesPerView, 1 ) ) );
	const spaceBetween = toNumber( config.spaceBetween, 16 );

	const params = {
		modules,
		breakpointsBase: 'window',
		...( widthOverride ? { width: widthOverride } : {} ),
		loop: !! config.loop,
		slidesPerView,
		spaceBetween,
		autoHeight: slidesPerView === 1,
		roundLengths: true,
		allowTouchMove: true,
		simulateTouch: true,
		followFinger: true,
		touchRatio: 1,
		nested: true,
		touchStartPreventDefault: false,
		watchOverflow: true,
		observer: true,
		observeParents: true,
		resizeObserver: true,
		pagination: config.pagination
			? {
					el: root.querySelector( '.forwp-swipe-carousel__pagination' ),
					clickable: true,
			  }
			: false,
		navigation: config.navigation
			? {
					prevEl: root.querySelector( '.forwp-swipe-carousel__nav--prev' ),
					nextEl: root.querySelector( '.forwp-swipe-carousel__nav--next' ),
			  }
			: false,
		autoplay: config.autoplay
			? {
					delay: toNumber( config.autoplayDelay, 5000 ),
					disableOnInteraction: true,
			  }
			: false,
	};

	try {
		new Swiper( el, params );
		root.dataset.forwpSwiperReady = '1';
		requestAnimationFrame( () => clampMobileGutenbergCoverWidths( root ) );
		logDebug( 'swiper initialized', {
			id: root.id || null,
			slidesPerView,
			spaceBetween,
			viewport: viewportWidth(),
		} );
	} catch ( err ) {
		root.classList.add( 'forwp-swipe-carousel--init-failed' );
		root.dataset.forwpSwiperReady = '1';
		logDebug( 'init failed', { id: root.id || null, error: String( err ) } );
		if ( typeof console !== 'undefined' && console.error ) {
			console.error( '[4WP Swipe Carousel] Init failed', err );
		}
	}
}

function initOne( root ) {
	const config = parseConfig( root );
	if ( ! config ) {
		return;
	}

	const el = root.querySelector( '.forwp-swipe-carousel__swiper' );
	if ( ! el ) {
		return;
	}

	const hasAnyEnabled = !! config.m || !! config.t || !! config.d;
	const viewport = viewportWidth();
	const enabledNow = enabledAtCurrentViewport( config );
	logDebug( 'initOne state', {
		id: root.id || null,
		viewport,
		config,
		hasAnyEnabled,
		enabledNow,
	} );
	if ( ! hasAnyEnabled ) {
		applyStackMode( root, el );
		return;
	}

	if ( enabledNow ) {
		applySwiperMode( root, el, config );
	} else {
		applyStackMode( root, el );
	}
}

function bootAll() {
	document.querySelectorAll( '[data-forwp-swiper-config]' ).forEach( initOne );
}

function scheduleBoot() {
	bootAll();
	requestAnimationFrame( () => {
		bootAll();
		requestAnimationFrame( bootAll );
	} );
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', scheduleBoot );
} else {
	scheduleBoot();
}

window.addEventListener( 'load', scheduleBoot );
window.setTimeout( scheduleBoot, 1000 );
window.setTimeout( scheduleBoot, 3000 );

let resizeRaf = null;
window.addEventListener( 'resize', () => {
	if ( resizeRaf ) {
		cancelAnimationFrame( resizeRaf );
	}
	resizeRaf = requestAnimationFrame( scheduleBoot );
} );
