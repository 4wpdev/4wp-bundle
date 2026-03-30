import { __ } from '@wordpress/i18n';
import { useBlockProps, InnerBlocks, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

const TEMPLATE = [
	[ 'core/group', { layout: { type: 'flex', justifyContent: 'center' } }, [
		[ 'core/paragraph', { placeholder: __( 'Add trigger content (e.g. image + "Play now" text)', '4wp-bundle' ) } ],
	] ],
];

export default function Edit( { attributes, setAttributes } ) {
	const { videoUrl, posterUrl } = attributes;
	const blockProps = useBlockProps( {
		className: 'forwp-video-lightbox-trigger forwp-video-lightbox-trigger--editor',
	} );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Video lightbox', '4wp-bundle' ) } initialOpen={ true }>
					<TextControl
						label={ __( 'Video URL', '4wp-bundle' ) }
						value={ videoUrl }
						onChange={ ( value ) => setAttributes( { videoUrl: value || '' } ) }
						help={ __( 'URL of the video that opens in the lightbox when the trigger is clicked.', '4wp-bundle' ) }
					/>
					<TextControl
						label={ __( 'Poster image URL (optional)', '4wp-bundle' ) }
						value={ posterUrl }
						onChange={ ( value ) => setAttributes( { posterUrl: value || '' } ) }
					/>
				</PanelBody>
			</InspectorControls>
			<div { ...blockProps }>
				<div className="forwp-video-lightbox-trigger__label">
					{ __( 'Click trigger — opens video lightbox', '4wp-bundle' ) }
				</div>
				<InnerBlocks
					allowedBlocks={ true }
					template={ TEMPLATE }
					templateLock={ false }
				/>
			</div>
		</>
	);
}
