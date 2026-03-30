/**
 * 4WP Video Lightbox - frontend: one global overlay, open on trigger click.
 */
( function () {
	let overlay = null;
	let videoEl = null;
	let closeBtn = null;
	let lastTrigger = null;

	function getOverlay() {
		if ( overlay ) return overlay;

		overlay = document.createElement( 'div' );
		overlay.className = 'forwp-video-lightbox-overlay';
		overlay.setAttribute( 'role', 'dialog' );
		overlay.setAttribute( 'aria-modal', 'true' );
		overlay.setAttribute( 'aria-hidden', 'true' );

		const inner = document.createElement( 'div' );
		inner.className = 'forwp-video-lightbox__inner';

		closeBtn = document.createElement( 'button' );
		closeBtn.type = 'button';
		closeBtn.className = 'forwp-video-lightbox__close';
		closeBtn.setAttribute( 'aria-label', 'Close' );
		closeBtn.innerHTML = '&times;';

		videoEl = document.createElement( 'video' );
		videoEl.controls = true;
		videoEl.playsInline = true;
		videoEl.className = 'forwp-video-lightbox__video';

		inner.appendChild( closeBtn );
		inner.appendChild( videoEl );
		overlay.appendChild( inner );
		document.body.appendChild( overlay );

		overlay.addEventListener( 'click', function ( e ) {
			if ( e.target === overlay ) closeLightbox();
		} );
		closeBtn.addEventListener( 'click', closeLightbox );

		document.addEventListener( 'keydown', function ( e ) {
			if ( e.key === 'Escape' && overlay && overlay.getAttribute( 'aria-hidden' ) === 'false' ) {
				closeLightbox();
			}
		} );

		return overlay;
	}

	function openLightbox( videoUrl, posterUrl, trigger ) {
		if ( ! videoUrl ) return;
		const el = getOverlay();
		videoEl.src = videoUrl;
		videoEl.poster = posterUrl || '';
		videoEl.load();
		el.setAttribute( 'aria-hidden', 'false' );
		el.classList.add( 'is-open' );
		lastTrigger = trigger;
		document.body.style.overflow = 'hidden';
		closeBtn.focus();
		videoEl.play().catch( function () {} );
	}

	function closeLightbox() {
		if ( ! overlay ) return;
		overlay.setAttribute( 'aria-hidden', 'true' );
		overlay.classList.remove( 'is-open' );
		videoEl.pause();
		videoEl.removeAttribute( 'src' );
		videoEl.load();
		document.body.style.overflow = '';
		if ( lastTrigger && lastTrigger.focus ) lastTrigger.focus();
		lastTrigger = null;
	}

	document.addEventListener( 'click', function ( e ) {
		const trigger = e.target.closest( '.forwp-video-lightbox-trigger' );
		if ( ! trigger || trigger.classList.contains( 'forwp-video-lightbox-trigger--editor' ) ) return;
		const videoUrl = trigger.getAttribute( 'data-video-url' );
		const posterUrl = trigger.getAttribute( 'data-poster-url' ) || '';
		if ( videoUrl ) {
			e.preventDefault();
			openLightbox( videoUrl, posterUrl, trigger );
		}
	} );
} )();
