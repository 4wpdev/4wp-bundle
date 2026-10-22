/**
 * 4WP Error Scenario — plays the scenario steps printed by render.php.
 */
import './style-index.css';

const QUERY_PARAMS = [ 'q', 's', 'query', 'search', 'text', 'p' ];
// Restarts allowed before the "usage limit" joke kicks in.
const MAX_RETRIES = 1;
// Replays run 2.5x faster: the joke is already known.
const REPLAY_PACE = 1 / 2.5;
// 10 days 7h 12m 10s.
const LIMIT_RESET_MS = ( ( ( 10 * 24 + 7 ) * 60 + 12 ) * 60 + 10 ) * 1000;

function readContext() {
	const path = window.location.pathname || '/';
	let referrer = 'direct';
	let query = '';

	if ( document.referrer ) {
		try {
			const ref = new URL( document.referrer );
			referrer = ref.host === window.location.host ? 'internal link · ' + ref.pathname : ref.host;
			const key = QUERY_PARAMS.find( ( k ) => ref.searchParams.get( k ) );
			if ( key ) {
				query = ref.searchParams.get( key );
			}
		} catch ( err ) {
			referrer = 'unknown';
		}
	}

	if ( ! query ) {
		query = decodeURIComponent( path )
			.split( '/' )
			.filter( Boolean )
			.join( ' ' )
			.replace( /[-_+.]+/g, ' ' )
			.trim() || 'home';
	}

	const now = new Date();
	const pad = ( n ) => String( n ).padStart( 2, '0' );
	const time = `${ pad( now.getHours() ) }:${ pad( now.getMinutes() ) }:${ pad( now.getSeconds() ) }`;

	return { path, referrer, query: query.slice( 0, 80 ), time };
}

function fill( text, ctx ) {
	return String( text || '' ).replace( /\{(path|referrer|query|time)\}/g, ( m, key ) => ctx[ key ] );
}

function buildBanner( step ) {
	const card = document.createElement( step.linkUrl ? 'a' : 'div' );
	// No image = an SRE note, not a product.
	card.className = 'forwp-error-scenario__banner' + ( step.image ? '' : ' is-note' );
	if ( step.linkUrl ) {
		card.href = step.linkUrl;
	}

	if ( step.image ) {
		const img = document.createElement( 'img' );
		img.src = step.image;
		img.alt = step.alt || '';
		img.loading = 'eager';
		card.appendChild( img );
	}

	const body = document.createElement( 'span' );
	body.className = 'forwp-error-scenario__banner-body';
	if ( step.title ) {
		const title = document.createElement( 'strong' );
		title.className = 'forwp-error-scenario__banner-title';
		title.textContent = step.title;
		body.appendChild( title );
	}
	if ( step.text ) {
		const text = document.createElement( 'span' );
		text.className = 'forwp-error-scenario__banner-text';
		text.textContent = step.text;
		body.appendChild( text );
	}
	if ( step.linkUrl && step.linkLabel ) {
		const cta = document.createElement( 'span' );
		cta.className = 'forwp-error-scenario__banner-cta';
		cta.textContent = step.linkLabel + ' →';
		body.appendChild( cta );
	}
	card.appendChild( body );
	return card;
}

function play( root ) {
	const dataEl = root.querySelector( '.forwp-error-scenario__data' );
	if ( ! dataEl || root.dataset.forwpScenarioReady ) {
		return;
	}
	root.dataset.forwpScenarioReady = '1';

	let config;
	try {
		config = JSON.parse( dataEl.textContent );
	} catch ( err ) {
		return;
	}

	const terminal = root.querySelector( '.forwp-error-scenario__terminal' );
	const screen = root.querySelector( '.forwp-error-scenario__screen' );
	const lines = root.querySelector( '.forwp-error-scenario__lines' );
	const slot = root.querySelector( '.forwp-error-scenario__banner-slot' );
	const closeBtn = root.querySelector( '.forwp-error-scenario__close' );
	const homeBtn = root.querySelector( '.forwp-error-scenario__home' );
	const replayBtn = root.querySelector( '.forwp-error-scenario__replay' );
	const progressFill = root.querySelector( '.forwp-error-scenario__progress-fill' );
	const progressLabel = root.querySelector( '.forwp-error-scenario__progress-label' );
	const progressPct = root.querySelector( '.forwp-error-scenario__progress-pct' );
	const reduced = window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
	const typingSpeed = reduced ? 0 : Number( config.typingSpeed ) || 0;
	const ctx = readContext();
	const state = { stopped: false, engaged: false, retries: 0 };

	// Every delay goes through pace(): replays play faster.
	const pace = ( ms ) => ( state.retries ? ms * REPLAY_PACE : ms );
	const sleep = ( ms ) => new Promise( ( resolve ) => window.setTimeout( resolve, pace( ms ) ) );

	const scrollDown = () => {
		screen.scrollTop = screen.scrollHeight;
	};

	// Progress bar under the terminal: shows the scenario is still playing.
	const setProgress = ( share, ms, label ) => {
		if ( ! progressFill ) {
			return;
		}
		const pct = Math.round( Math.min( 1, share ) * 100 );
		progressFill.style.transitionDuration = ( reduced ? 0 : ms ) + 'ms';
		progressFill.style.width = pct + '%';
		progressPct.textContent = pct + '%';
		if ( label ) {
			progressLabel.textContent = label;
		}
	};

	const stop = () => {
		state.stopped = true;
		root.classList.add( 'is-done' );
		setProgress( 1, 300, state.engaged ? 'stopped · user engaged ✓' : 'scenario complete ✓' );
	};

	const printLine = async ( text, tone ) => {
		const li = document.createElement( 'li' );
		li.className = 'forwp-error-scenario__line is-' + ( tone || 'info' );
		lines.appendChild( li );
		if ( ! typingSpeed ) {
			li.textContent = text;
			scrollDown();
			return;
		}
		for ( let i = 1; i <= text.length; i++ ) {
			if ( state.stopped ) {
				li.textContent = text;
				return;
			}
			li.textContent = text.slice( 0, i );
			scrollDown();
			await sleep( typingSpeed );
		}
	};

	const swapSlot = async ( el ) => {
		const old = slot.firstElementChild;
		if ( old ) {
			old.classList.add( 'is-leaving' );
			await sleep( reduced ? 0 : 300 );
			old.remove();
		}
		slot.appendChild( el );
		requestAnimationFrame( () => el.classList.add( 'is-in' ) );
	};

	// The home link is already on the page (render.php); the step only highlights it.
	const showButton = async () => {
		if ( homeBtn ) {
			homeBtn.classList.add( 'is-pulse' );
		}
	};

	const dropChar = async ( step ) => {
		const chars = root.querySelectorAll( '.forwp-error-scenario__code span' );
		const ch = chars[ Math.min( step.index, chars.length - 1 ) ];
		if ( ch ) {
			ch.classList.add( 'is-falling' );
			await sleep( reduced ? 0 : 1400 );
		}
	};

	const showBanner = async ( step ) => {
		const card = buildBanner( step );
		const engage = () => {
			state.engaged = true;
		};
		// Real movement only: a banner sliding in under a resting cursor is not engagement.
		card.addEventListener( 'pointermove', ( e ) => {
			if ( e.movementX || e.movementY ) {
				engage();
			}
		} );
		card.addEventListener( 'focusin', engage );
		card.addEventListener( 'click', engage );

		state.engaged = false;
		await swapSlot( card );
	};

	const waitIdle = async ( step ) => {
		const until = Date.now() + pace( step.ms );
		while ( Date.now() < until ) {
			if ( state.stopped ) {
				return;
			}
			if ( state.engaged ) {
				if ( step.text ) {
					await printLine( fill( step.text, ctx ), 'ok' );
				}
				stop();
				return;
			}
			await sleep( 100 );
		}
	};

	closeBtn.addEventListener( 'click', () => {
		stop();
		terminal.classList.add( 'is-closed' );
	} );

	const formatLeft = ( ms ) => {
		const t = Math.max( 0, Math.floor( ms / 1000 ) );
		const d = Math.floor( t / 86400 );
		const h = Math.floor( ( t % 86400 ) / 3600 );
		const m = Math.floor( ( t % 3600 ) / 60 );
		return `${ d }d ${ h }h ${ m }m ${ t % 60 }s`;
	};

	// Usage limit, styled like the native agent UIs: a CLI notice in the terminal,
	// a chat-app quota banner on the page and a disabled replay button with the countdown.
	const showLimit = () => {
		const until = Date.now() + LIMIT_RESET_MS;
		const timers = [];

		const cli = document.createElement( 'li' );
		cli.className = 'forwp-error-scenario__line forwp-error-scenario__limit';
		cli.setAttribute( 'role', 'alert' );
		cli.innerHTML =
			'<span class="forwp-error-scenario__limit-cmd">&gt; /play-again</span>' +
			'<span class="forwp-error-scenario__limit-out">⎿  404 usage limit reached · resets in <b></b></span>' +
			'<span class="forwp-error-scenario__limit-hint">   /upgrade to increase your 404 limit.</span>';
		timers.push( cli.querySelector( 'b' ) );
		lines.appendChild( cli );

		const quota = document.createElement( 'div' );
		quota.className = 'forwp-error-scenario__quota';
		quota.setAttribute( 'role', 'status' );
		quota.innerHTML =
			'<span class="forwp-error-scenario__quota-icon" aria-hidden="true">i</span>' +
			'<span class="forwp-error-scenario__quota-body"><strong>You’ve reached your 404 limit</strong>' +
			'<span>Free replays reset in <b></b>.</span></span>' +
			'<a class="forwp-error-scenario__quota-cta" href="/">Upgrade</a>';
		timers.push( quota.querySelector( 'b' ) );
		swapSlot( quota );

		if ( replayBtn ) {
			replayBtn.hidden = false;
			replayBtn.disabled = true;
			replayBtn.classList.add( 'is-in', 'is-locked' );
			replayBtn.innerHTML = 'Play again in <b></b>';
			timers.push( replayBtn.querySelector( 'b' ) );
		}

		const tick = () => {
			const text = formatLeft( until - Date.now() );
			timers.forEach( ( el ) => {
				el.textContent = text;
			} );
		};
		tick();
		window.setInterval( tick, 1000 );
		scrollDown();
	};

	const reset = () => {
		lines.textContent = '';
		slot.textContent = '';
		if ( homeBtn ) {
			homeBtn.classList.remove( 'is-pulse' );
		}
		root.querySelectorAll( '.forwp-error-scenario__code span.is-falling' ).forEach( ( ch ) => ch.classList.remove( 'is-falling' ) );
		root.classList.remove( 'is-done' );
		state.stopped = false;
		state.engaged = false;
		setProgress( 0, 0, 'scenario running…' );
	};

	// Neon "play again" next to Home: restarts the scenario.
	const offerReplay = () => {
		if ( replayBtn ) {
			replayBtn.hidden = false;
			requestAnimationFrame( () => replayBtn.classList.add( 'is-in' ) );
		}
	};

	if ( replayBtn ) {
		replayBtn.addEventListener( 'click', () => {
			replayBtn.hidden = true;
			replayBtn.classList.remove( 'is-in' );
			state.retries++;
			reset();
			run( 0 );
		} );
	}

	const run = async ( delay ) => {
		await sleep( delay );
		if ( state.stopped ) {
			return;
		}
		if ( ! root.classList.contains( 'is-running' ) ) {
			root.classList.add( 'is-running' );
			await sleep( reduced ? 0 : 400 );
		}
		if ( state.retries ) {
			await printLine( `$ agent retry --attempt ${ state.retries + 1 }`, 'muted' );
		}

		const steps = config.steps || [];
		for ( let i = 0; i < steps.length; i++ ) {
			const step = steps[ i ];
			if ( state.stopped ) {
				return;
			}
			const share = ( i + 1 ) / steps.length;
			if ( step.type === 'wait' || step.type === 'idle' ) {
				setProgress( share, pace( step.ms ) );
			}
			if ( step.type === 'log' ) {
				await printLine( fill( step.text, ctx ), step.tone );
				await sleep( typingSpeed ? 260 : 120 );
			} else if ( step.type === 'wait' ) {
				await sleep( step.ms );
			} else if ( step.type === 'banner' ) {
				await showBanner( step );
			} else if ( step.type === 'idle' ) {
				await waitIdle( step );
			} else if ( step.type === 'button' ) {
				await showButton();
			} else if ( step.type === 'fall' ) {
				await dropChar( step );
			}
			setProgress( share, 250 );
		}
		stop();
		if ( terminal.classList.contains( 'is-closed' ) ) {
			return;
		}
		if ( state.retries < MAX_RETRIES ) {
			offerReplay();
		} else {
			showLimit();
		}
	};

	run( config.startDelay || 0 );
}

/**
 * Full height = viewport minus everything else on the page (header, footer,
 * template gaps, admin bar), so header + block + footer fill exactly one screen.
 */
function fitHeight( root ) {
	if ( ! root.classList.contains( 'forwp-error-scenario--full' ) ) {
		return;
	}
	const own = root.getBoundingClientRect().height;
	const bar = document.getElementById( 'wpadminbar' );
	const rest = document.documentElement.scrollHeight - own + ( bar ? bar.offsetHeight : 0 );
	root.style.setProperty( '--forwp-es-offset', Math.max( 0, Math.round( rest ) ) + 'px' );
}

function fitAll() {
	document.querySelectorAll( '.forwp-error-scenario:not(.forwp-error-scenario--editor)' ).forEach( fitHeight );
}

let fitRaf = null;
window.addEventListener( 'resize', () => {
	if ( fitRaf ) {
		cancelAnimationFrame( fitRaf );
	}
	fitRaf = requestAnimationFrame( fitAll );
} );
window.addEventListener( 'load', fitAll );

function bootAll() {
	fitAll();
	document.querySelectorAll( '.forwp-error-scenario:not(.forwp-error-scenario--editor)' ).forEach( play );
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', bootAll );
} else {
	bootAll();
}
