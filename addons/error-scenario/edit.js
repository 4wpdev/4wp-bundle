import { __, sprintf } from '@wordpress/i18n';
import { useRef, useState } from '@wordpress/element';
import { useBlockProps, InspectorControls, MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	TextareaControl,
	SelectControl,
	RangeControl,
	ToggleControl,
	Button,
	Notice,
} from '@wordpress/components';
import { LOG_TONES, SETTING_KEYS, createStep, normalizeStep, normalizeSteps } from './scenario';

const STEP_LABELS = {
	log: __( 'Log line', '4wp-bundle' ),
	wait: __( 'Wait', '4wp-bundle' ),
	banner: __( 'Banner', '4wp-bundle' ),
	idle: __( 'Wait for reaction', '4wp-bundle' ),
	button: __( 'Button', '4wp-bundle' ),
	fall: __( 'Drop a character', '4wp-bundle' ),
};

const TONE_OPTIONS = LOG_TONES.map( ( tone ) => ( { value: tone, label: tone } ) );

function StepFields( { step, onChange } ) {
	const set = ( patch ) => onChange( { ...step, ...patch } );

	if ( step.type === 'log' ) {
		return (
			<div className="forwp-error-scenario__step-row">
				<SelectControl
					label={ __( 'Tone', '4wp-bundle' ) }
					value={ step.tone }
					options={ TONE_OPTIONS }
					onChange={ ( tone ) => set( { tone } ) }
					__nextHasNoMarginBottom
				/>
				<TextControl
					className="forwp-error-scenario__grow"
					label={ __( 'Text', '4wp-bundle' ) }
					value={ step.text }
					onChange={ ( text ) => set( { text } ) }
					__nextHasNoMarginBottom
				/>
			</div>
		);
	}

	if ( step.type === 'wait' ) {
		return (
			<TextControl
				type="number"
				label={ __( 'Pause (ms)', '4wp-bundle' ) }
				value={ step.ms }
				min={ 0 }
				step={ 100 }
				onChange={ ( v ) => set( { ms: Math.max( 0, Number( v ) || 0 ) } ) }
				__nextHasNoMarginBottom
			/>
		);
	}

	if ( step.type === 'idle' ) {
		return (
			<div className="forwp-error-scenario__step-row">
				<TextControl
					type="number"
					label={ __( 'No reaction for (ms)', '4wp-bundle' ) }
					value={ step.ms }
					min={ 0 }
					step={ 500 }
					onChange={ ( v ) => set( { ms: Math.max( 0, Number( v ) || 0 ) } ) }
					__nextHasNoMarginBottom
				/>
				<TextControl
					className="forwp-error-scenario__grow"
					label={ __( 'Line when the visitor reacts (scenario stops)', '4wp-bundle' ) }
					value={ step.text }
					onChange={ ( text ) => set( { text } ) }
					__nextHasNoMarginBottom
				/>
			</div>
		);
	}

	if ( step.type === 'button' ) {
		return (
			<div className="forwp-error-scenario__step-row">
				<TextControl
					className="forwp-error-scenario__grow"
					label={ __( 'Button label', '4wp-bundle' ) }
					value={ step.linkLabel }
					onChange={ ( linkLabel ) => set( { linkLabel } ) }
					__nextHasNoMarginBottom
				/>
				<TextControl
					label={ __( 'Link URL', '4wp-bundle' ) }
					value={ step.linkUrl }
					onChange={ ( linkUrl ) => set( { linkUrl } ) }
					__nextHasNoMarginBottom
				/>
			</div>
		);
	}

	if ( step.type === 'fall' ) {
		return (
			<TextControl
				type="number"
				label={ __( 'Character position in the code (0 = first)', '4wp-bundle' ) }
				value={ step.index }
				min={ 0 }
				onChange={ ( v ) => set( { index: Math.max( 0, parseInt( v, 10 ) || 0 ) } ) }
				__nextHasNoMarginBottom
			/>
		);
	}

	// banner
	return (
		<div className="forwp-error-scenario__banner-fields">
			<MediaUploadCheck>
				<MediaUpload
					allowedTypes={ [ 'image' ] }
					value={ step.mediaId || undefined }
					onSelect={ ( media ) => set( { mediaId: media.id, mediaUrl: media.url } ) }
					render={ ( { open } ) => (
						<div className="forwp-error-scenario__media">
							{ step.mediaUrl ? (
								<button type="button" className="forwp-error-scenario__thumb" onClick={ open }>
									<img src={ step.mediaUrl } alt="" />
								</button>
							) : (
								<Button variant="secondary" onClick={ open }>
									{ __( 'Choose image', '4wp-bundle' ) }
								</Button>
							) }
							{ step.mediaUrl && (
								<Button isSmall isDestructive variant="link" onClick={ () => set( { mediaId: 0, mediaUrl: '' } ) }>
									{ __( 'Remove image', '4wp-bundle' ) }
								</Button>
							) }
						</div>
					) }
				/>
			</MediaUploadCheck>
			<TextControl
				label={ __( 'Title', '4wp-bundle' ) }
				value={ step.title }
				onChange={ ( title ) => set( { title } ) }
				__nextHasNoMarginBottom
			/>
			<TextareaControl
				label={ __( 'Text', '4wp-bundle' ) }
				value={ step.text }
				rows={ 2 }
				onChange={ ( text ) => set( { text } ) }
				__nextHasNoMarginBottom
			/>
			<div className="forwp-error-scenario__step-row">
				<TextControl
					className="forwp-error-scenario__grow"
					label={ __( 'Link URL', '4wp-bundle' ) }
					type="url"
					value={ step.linkUrl }
					onChange={ ( linkUrl ) => set( { linkUrl } ) }
					__nextHasNoMarginBottom
				/>
				<TextControl
					label={ __( 'Button label', '4wp-bundle' ) }
					value={ step.linkLabel }
					onChange={ ( linkLabel ) => set( { linkLabel } ) }
					__nextHasNoMarginBottom
				/>
			</div>
		</div>
	);
}

export default function Edit( { attributes, setAttributes } ) {
	const { code, heading, message, terminalTitle, startDelay, typingSpeed, fullHeight, steps } = attributes;
	const fileInput = useRef();
	const [ importError, setImportError ] = useState( '' );

	const blockProps = useBlockProps( {
		className: 'forwp-error-scenario forwp-error-scenario--editor',
	} );

	const list = Array.isArray( steps ) ? steps : [];
	const setSteps = ( next ) => setAttributes( { steps: next } );
	const updateStep = ( index, step ) => setSteps( list.map( ( s, i ) => ( i === index ? step : s ) ) );
	const removeStep = ( index ) => setSteps( list.filter( ( s, i ) => i !== index ) );
	const duplicateStep = ( index ) =>
		setSteps( [ ...list.slice( 0, index + 1 ), { ...list[ index ] }, ...list.slice( index + 1 ) ] );
	const moveStep = ( index, dir ) => {
		const to = index + dir;
		if ( to < 0 || to >= list.length ) {
			return;
		}
		const next = [ ...list ];
		[ next[ index ], next[ to ] ] = [ next[ to ], next[ index ] ];
		setSteps( next );
	};

	const exportJson = () => {
		const data = { version: 1, steps: list };
		SETTING_KEYS.forEach( ( key ) => {
			data[ key ] = attributes[ key ];
		} );
		const blob = new Blob( [ JSON.stringify( data, null, '\t' ) ], { type: 'application/json' } );
		const url = URL.createObjectURL( blob );
		const a = document.createElement( 'a' );
		a.href = url;
		a.download = 'error-scenario.json';
		a.click();
		URL.revokeObjectURL( url );
	};

	const importJson = ( event ) => {
		const file = event.target.files && event.target.files[ 0 ];
		event.target.value = '';
		if ( ! file ) {
			return;
		}
		file.text().then( ( text ) => {
			try {
				const data = JSON.parse( text );
				const imported = normalizeSteps( Array.isArray( data ) ? data : data.steps );
				if ( ! imported.length ) {
					throw new Error( 'empty' );
				}
				const patch = { steps: imported };
				if ( ! Array.isArray( data ) ) {
					SETTING_KEYS.forEach( ( key ) => {
						if ( typeof data[ key ] === typeof attributes[ key ] ) {
							patch[ key ] = data[ key ];
						}
					} );
				}
				setAttributes( patch );
				setImportError( '' );
			} catch ( err ) {
				setImportError( __( 'This file is not a valid scenario JSON.', '4wp-bundle' ) );
			}
		} );
	};

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Error page', '4wp-bundle' ) } initialOpen={ true }>
					<TextControl label={ __( 'Code', '4wp-bundle' ) } value={ code } onChange={ ( v ) => setAttributes( { code: v } ) } />
					<TextControl label={ __( 'Heading', '4wp-bundle' ) } value={ heading } onChange={ ( v ) => setAttributes( { heading: v } ) } />
					<TextareaControl label={ __( 'Message', '4wp-bundle' ) } value={ message } onChange={ ( v ) => setAttributes( { message: v } ) } />
					<ToggleControl
						label={ __( 'Full viewport height', '4wp-bundle' ) }
						checked={ fullHeight }
						onChange={ ( v ) => setAttributes( { fullHeight: v } ) }
					/>
				</PanelBody>
				<PanelBody title={ __( 'Terminal', '4wp-bundle' ) }>
					<TextControl
						label={ __( 'Window title', '4wp-bundle' ) }
						value={ terminalTitle }
						onChange={ ( v ) => setAttributes( { terminalTitle: v } ) }
					/>
					<RangeControl
						label={ __( 'Start delay (ms)', '4wp-bundle' ) }
						value={ startDelay }
						onChange={ ( v ) => setAttributes( { startDelay: v == null ? 1500 : v } ) }
						min={ 0 }
						max={ 6000 }
						step={ 100 }
					/>
					<RangeControl
						label={ __( 'Typing speed (ms per character, 0 = instant)', '4wp-bundle' ) }
						value={ typingSpeed }
						onChange={ ( v ) => setAttributes( { typingSpeed: v == null ? 18 : v } ) }
						min={ 0 }
						max={ 80 }
					/>
					<p style={ { fontSize: '12px', color: '#757575' } }>
						{ __( 'Variables in log lines: {path}, {referrer}, {query}, {time}.', '4wp-bundle' ) }
					</p>
				</PanelBody>
				<PanelBody title={ __( 'Scenario file', '4wp-bundle' ) }>
					{ importError && (
						<Notice status="error" isDismissible onRemove={ () => setImportError( '' ) }>
							{ importError }
						</Notice>
					) }
					<div style={ { display: 'flex', gap: '8px', flexWrap: 'wrap' } }>
						<Button variant="secondary" onClick={ exportJson }>
							{ __( 'Export JSON', '4wp-bundle' ) }
						</Button>
						<Button variant="secondary" onClick={ () => fileInput.current && fileInput.current.click() }>
							{ __( 'Import JSON', '4wp-bundle' ) }
						</Button>
						<input ref={ fileInput } type="file" accept="application/json,.json" hidden onChange={ importJson } />
					</div>
				</PanelBody>
			</InspectorControls>
			<div { ...blockProps }>
				<div className="forwp-error-scenario__editor-head">
					<span className="forwp-error-scenario__editor-code">{ code }</span>
					<span>
						<strong>{ heading }</strong>
						<br />
						{ sprintf(
							/* translators: %d: number of steps */
							__( 'Scenario: %d steps. Plays on the front end; edit the steps below.', '4wp-bundle' ),
							list.length
						) }
					</span>
				</div>
				<ol className="forwp-error-scenario__steps">
					{ list.map( ( raw, index ) => {
						const step = normalizeStep( raw ) || createStep( 'log' );
						return (
							<li key={ index } className={ `forwp-error-scenario__step forwp-error-scenario__step--${ step.type }` }>
								<div className="forwp-error-scenario__step-head">
									<span className="forwp-error-scenario__step-label">
										{ index + 1 }. { STEP_LABELS[ step.type ] }
									</span>
									<span className="forwp-error-scenario__step-actions">
										<Button isSmall icon="arrow-up-alt2" label={ __( 'Move up', '4wp-bundle' ) } disabled={ index === 0 } onClick={ () => moveStep( index, -1 ) } />
										<Button isSmall icon="arrow-down-alt2" label={ __( 'Move down', '4wp-bundle' ) } disabled={ index === list.length - 1 } onClick={ () => moveStep( index, 1 ) } />
										<Button isSmall icon="admin-page" label={ __( 'Duplicate', '4wp-bundle' ) } onClick={ () => duplicateStep( index ) } />
										<Button isSmall isDestructive icon="trash" label={ __( 'Delete', '4wp-bundle' ) } onClick={ () => removeStep( index ) } />
									</span>
								</div>
								<StepFields step={ step } onChange={ ( next ) => updateStep( index, next ) } />
							</li>
						);
					} ) }
				</ol>
				<div className="forwp-error-scenario__add">
					{ Object.keys( STEP_LABELS ).map( ( type ) => (
						<Button key={ type } variant="secondary" icon="plus-alt2" onClick={ () => setSteps( [ ...list, createStep( type ) ] ) }>
							{ STEP_LABELS[ type ] }
						</Button>
					) ) }
				</div>
			</div>
		</>
	);
}
