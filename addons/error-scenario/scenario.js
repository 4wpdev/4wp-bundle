/**
 * 4WP Error Scenario — step schema shared by editor and front.
 */

export const STEP_TYPES = [ 'log', 'wait', 'banner', 'idle', 'button', 'fall' ];

export const LOG_TONES = [ 'info', 'muted', 'ok', 'warn', 'error' ];

export const SETTING_KEYS = [ 'code', 'heading', 'message', 'terminalTitle', 'startDelay', 'typingSpeed', 'fullHeight' ];

function toMs( value, fallback ) {
	const n = Number( value );
	return Number.isFinite( n ) && n >= 0 ? Math.min( 60000, Math.round( n ) ) : fallback;
}

function toStr( value ) {
	return typeof value === 'string' ? value : '';
}

export function createStep( type ) {
	switch ( type ) {
		case 'wait':
			return { type: 'wait', ms: 800 };
		case 'idle':
			return { type: 'idle', ms: 3000, text: '→ user engaged ✓ stopping rotation' };
		case 'banner':
			return { type: 'banner', mediaId: 0, mediaUrl: '', title: '', text: '', linkUrl: '', linkLabel: '' };
		case 'button':
			return { type: 'button', linkLabel: "Let's start again from Home", linkUrl: '/' };
		case 'fall':
			return { type: 'fall', index: 1 };
		default:
			return { type: 'log', tone: 'info', text: '' };
	}
}

/**
 * Bring any (imported) step to the known shape; unknown types are dropped.
 *
 * @param {Object} raw Step from attributes or an imported JSON file.
 * @return {Object|null}
 */
export function normalizeStep( raw ) {
	if ( ! raw || typeof raw !== 'object' || ! STEP_TYPES.includes( raw.type ) ) {
		return null;
	}
	switch ( raw.type ) {
		case 'wait':
			return { type: 'wait', ms: toMs( raw.ms, 800 ) };
		case 'idle':
			return { type: 'idle', ms: toMs( raw.ms, 3000 ), text: toStr( raw.text ) };
		case 'banner':
			return {
				type: 'banner',
				mediaId: Number.isInteger( raw.mediaId ) && raw.mediaId > 0 ? raw.mediaId : 0,
				mediaUrl: toStr( raw.mediaUrl ),
				title: toStr( raw.title ),
				text: toStr( raw.text ),
				linkUrl: toStr( raw.linkUrl ),
				linkLabel: toStr( raw.linkLabel ),
			};
		case 'button':
			return { type: 'button', linkLabel: toStr( raw.linkLabel ), linkUrl: toStr( raw.linkUrl ) };
		case 'fall':
			return { type: 'fall', index: Number.isInteger( raw.index ) && raw.index >= 0 ? raw.index : 1 };
		default:
			return {
				type: 'log',
				tone: LOG_TONES.includes( raw.tone ) ? raw.tone : 'info',
				text: toStr( raw.text ),
			};
	}
}

export function normalizeSteps( list ) {
	return Array.isArray( list ) ? list.map( normalizeStep ).filter( Boolean ) : [];
}
