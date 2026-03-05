import { __ } from '@wordpress/i18n';
import { useBlockProps, InnerBlocks, InspectorControls, useSetting } from '@wordpress/block-editor';
import { PanelBody, TextControl, SelectControl, ColorPalette, __experimentalUnitControl as UnitControl } from '@wordpress/components';

const HEIGHT_UNITS = [
	{ value: 'px', label: 'px' },
	{ value: 'em', label: 'em' },
	{ value: 'rem', label: 'rem' },
];

const TEMPLATE = [
	[ 'core/group', {}, [
		[ 'core/paragraph', { placeholder: __( 'Add content that can be expanded with Show more…', '4wp-bundle' ) } ],
	] ],
];

export default function Edit( { attributes, setAttributes } ) {
	const { collapsedHeight, showMoreLabel, showLessLabel, buttonStyle, buttonSize, buttonBackgroundColor, buttonTextColor } = attributes;
	const blockProps = useBlockProps( {
		className: 'forwp-show-more',
	} );
	const colorPalette = useSetting( 'color.palette' ) || [];

	const toggleClassName = [
		'forwp-show-more__toggle',
		'wp-block-button__link',
		'wp-element-button',
		buttonSize !== 'medium' && `has-${ buttonSize }-font-size`,
	].filter( Boolean ).join( ' ' );

	const toggleStyle = {};
	if ( buttonBackgroundColor ) toggleStyle.backgroundColor = buttonBackgroundColor;
	if ( buttonTextColor ) toggleStyle.color = buttonTextColor;

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Show More Settings', '4wp-bundle' ) }>
					<UnitControl
						label={ __( 'Collapsed height', '4wp-bundle' ) }
						value={ collapsedHeight }
						units={ HEIGHT_UNITS }
						min={ 20 }
						onChange={ ( value ) => setAttributes( { collapsedHeight: value || '4.5em' } ) }
					/>
					<TextControl
						label={ __( 'Show more label', '4wp-bundle' ) }
						value={ showMoreLabel }
						onChange={ ( value ) => setAttributes( { showMoreLabel: value } ) }
					/>
					<TextControl
						label={ __( 'Show less label', '4wp-bundle' ) }
						value={ showLessLabel }
						onChange={ ( value ) => setAttributes( { showLessLabel: value } ) }
					/>
				</PanelBody>
				<PanelBody title={ __( 'Button', '4wp-bundle' ) }>
					<SelectControl
						label={ __( 'Style', '4wp-bundle' ) }
						value={ buttonStyle }
						options={ [
							{ value: 'fill', label: __( 'Fill', '4wp-bundle' ) },
							{ value: 'outline', label: __( 'Outline', '4wp-bundle' ) },
						] }
						onChange={ ( value ) => setAttributes( { buttonStyle: value } ) }
					/>
					<SelectControl
						label={ __( 'Size', '4wp-bundle' ) }
						value={ buttonSize }
						options={ [
							{ value: 'small', label: __( 'Small', '4wp-bundle' ) },
							{ value: 'medium', label: __( 'Medium', '4wp-bundle' ) },
							{ value: 'large', label: __( 'Large', '4wp-bundle' ) },
						] }
						onChange={ ( value ) => setAttributes( { buttonSize: value } ) }
					/>
					{ colorPalette.length > 0 && (
						<>
							<p className="components-base-control__label">{ __( 'Background color', '4wp-bundle' ) }</p>
							<ColorPalette
								colors={ colorPalette }
								value={ buttonBackgroundColor }
								onChange={ ( value ) => setAttributes( { buttonBackgroundColor: value || '' } ) }
								clearable
							/>
							<p className="components-base-control__label" style={ { marginTop: '1em' } }>{ __( 'Text color', '4wp-bundle' ) }</p>
							<ColorPalette
								colors={ colorPalette }
								value={ buttonTextColor }
								onChange={ ( value ) => setAttributes( { buttonTextColor: value || '' } ) }
								clearable
							/>
						</>
					) }
				</PanelBody>
			</InspectorControls>
			<div { ...blockProps }>
				<div
					className="forwp-show-more__content forwp-show-more__content--preview"
					style={ { '--forwp-collapsed-height': collapsedHeight } }
				>
					<InnerBlocks
						allowedBlocks={ true }
						template={ TEMPLATE }
						templateLock={ false }
					/>
				</div>
				<div className={ `wp-block-button forwp-show-more__button-wrapper${ buttonStyle === 'outline' ? ' is-style-outline' : '' }` }>
					<button type="button" className={ toggleClassName } style={ toggleStyle } disabled>
						{ showMoreLabel }
					</button>
				</div>
			</div>
		</>
	);
}
