import { __ } from '@wordpress/i18n';
import { useBlockProps, InnerBlocks, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, ToggleControl, RangeControl, ButtonGroup, Button } from '@wordpress/components';

const SLIDES_PRESETS = [
	{ value: 1, label: '1' },
	{ value: 1.25, label: __( '1 + ¼', '4wp-bundle' ) },
	{ value: 1.4, label: __( '1 + 0.4', '4wp-bundle' ) },
	{ value: 1.5, label: __( '1 + ½', '4wp-bundle' ) },
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		carouselMobile,
		carouselTablet,
		carouselDesktop,
		slidesPerView,
		spaceBetween,
		loop,
		autoplay,
		autoplayDelay,
		pagination,
		navigation,
	} = attributes;

	const blockProps = useBlockProps( {
		className: 'forwp-swipe-carousel forwp-swipe-carousel--editor',
	} );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Carousel on screen sizes', '4wp-bundle' ) } initialOpen={ true }>
					<p style={ { fontSize: '12px', color: '#757575', marginTop: 0 } }>
						{ __( 'Width &lt; 768px = mobile, 768px–1023px = tablet, ≥ 1024px = desktop.', '4wp-bundle' ) }
					</p>
					<ToggleControl
						label={ __( 'Swipe carousel on mobile', '4wp-bundle' ) }
						checked={ carouselMobile }
						onChange={ ( v ) => setAttributes( { carouselMobile: v } ) }
					/>
					<ToggleControl
						label={ __( 'Swipe carousel on tablet', '4wp-bundle' ) }
						checked={ carouselTablet }
						onChange={ ( v ) => setAttributes( { carouselTablet: v } ) }
					/>
					<ToggleControl
						label={ __( 'Swipe carousel on desktop', '4wp-bundle' ) }
						checked={ carouselDesktop }
						onChange={ ( v ) => setAttributes( { carouselDesktop: v } ) }
					/>
				</PanelBody>
				<PanelBody title={ __( 'Slides', '4wp-bundle' ) }>
					<p style={ { fontSize: '12px', color: '#757575', marginTop: 0 } }>
						{ __(
							'Use a value slightly above 1 (e.g. 1.4) to show one full slide and a “peek” of the next so swiping is obvious. Whole numbers show exact slide counts.',
							'4wp-bundle'
						) }
					</p>
					<p className="components-base-control__label" style={ { marginBottom: '8px' } }>
						{ __( 'Quick presets', '4wp-bundle' ) }
					</p>
					<ButtonGroup style={ { marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '4px' } }>
						{ SLIDES_PRESETS.map( ( p ) => (
							<Button
								key={ p.value }
								isSmall
								variant={ Math.abs( slidesPerView - p.value ) < 0.01 ? 'primary' : 'secondary' }
								onClick={ () => setAttributes( { slidesPerView: p.value } ) }
							>
								{ p.label }
							</Button>
						) ) }
					</ButtonGroup>
					<RangeControl
						label={ __( 'Slides per view', '4wp-bundle' ) }
						help={ __( 'Decimals = peek of the next slide (Swiper). Example: 1.5 ≈ one full + half of the next.', '4wp-bundle' ) }
						value={ slidesPerView }
						onChange={ ( v ) => {
							const n = v == null ? 1 : Number( v );
							const clamped = Math.min( 3, Math.max( 1, n ) );
							setAttributes( { slidesPerView: Math.round( clamped * 100 ) / 100 } );
						} }
						min={ 1 }
						max={ 3 }
						step={ 0.05 }
					/>
					<RangeControl
						label={ __( 'Space between slides (px)', '4wp-bundle' ) }
						value={ spaceBetween }
						onChange={ ( v ) => setAttributes( { spaceBetween: v == null ? 0 : v } ) }
						min={ 0 }
						max={ 48 }
					/>
					<ToggleControl
						label={ __( 'Loop', '4wp-bundle' ) }
						checked={ loop }
						onChange={ ( v ) => setAttributes( { loop: v } ) }
					/>
				</PanelBody>
				<PanelBody title={ __( 'Autoplay', '4wp-bundle' ) }>
					<ToggleControl
						label={ __( 'Autoplay', '4wp-bundle' ) }
						checked={ autoplay }
						onChange={ ( v ) => setAttributes( { autoplay: v } ) }
					/>
					{ autoplay && (
						<RangeControl
							label={ __( 'Delay (ms)', '4wp-bundle' ) }
							value={ autoplayDelay }
							onChange={ ( v ) => setAttributes( { autoplayDelay: v == null ? 5000 : v } ) }
							min={ 2000 }
							max={ 15000 }
							step={ 500 }
						/>
					) }
				</PanelBody>
				<PanelBody title={ __( 'Controls', '4wp-bundle' ) }>
					<ToggleControl
						label={ __( 'Pagination dots', '4wp-bundle' ) }
						checked={ pagination }
						onChange={ ( v ) => setAttributes( { pagination: v } ) }
					/>
					<ToggleControl
						label={ __( 'Prev / next arrows', '4wp-bundle' ) }
						checked={ navigation }
						onChange={ ( v ) => setAttributes( { navigation: v } ) }
					/>
				</PanelBody>
			</InspectorControls>
			<div { ...blockProps }>
				<div className="forwp-swipe-carousel__editor-hint">
					{ __( 'Each block below is one slide. Add Groups (your column rows), Covers, etc.', '4wp-bundle' ) }
				</div>
				<div className="forwp-swipe-carousel__editor-inner">
					<InnerBlocks
						allowedBlocks={ true }
						renderAppender={ InnerBlocks.ButtonBlockAppender }
					/>
				</div>
			</div>
		</>
	);
}
