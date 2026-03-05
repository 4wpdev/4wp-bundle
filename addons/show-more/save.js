import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';

export default function save( { attributes } ) {
	const { collapsedHeight, showMoreLabel, showLessLabel, buttonStyle, buttonSize, buttonBackgroundColor, buttonTextColor } = attributes;
	const blockProps = useBlockProps.save( {
		className: 'forwp-show-more',
		style: { '--forwp-collapsed-height': collapsedHeight },
		'data-show-more': showMoreLabel,
		'data-show-less': showLessLabel,
	} );

	const toggleClassName = [
		'forwp-show-more__toggle',
		'wp-block-button__link',
		'wp-element-button',
		buttonSize !== 'medium' && `has-${ buttonSize }-font-size`,
	].filter( Boolean ).join( ' ' );

	const toggleStyle = {};
	if ( buttonBackgroundColor ) toggleStyle.backgroundColor = buttonBackgroundColor;
	if ( buttonTextColor ) toggleStyle.color = buttonTextColor;

	const wrapperClass = `wp-block-button forwp-show-more__button-wrapper${ buttonStyle === 'outline' ? ' is-style-outline' : '' }`;

	return (
		<div { ...blockProps }>
			<div className="forwp-show-more__content">
				<InnerBlocks.Content />
			</div>
			<div className={ wrapperClass }>
				<button type="button" className={ toggleClassName } style={ Object.keys( toggleStyle ).length ? toggleStyle : undefined } aria-expanded="false">
					{ showMoreLabel }
				</button>
			</div>
		</div>
	);
}
