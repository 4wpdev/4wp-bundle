import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';

export default function save( { attributes } ) {
	const { videoUrl, posterUrl } = attributes;
	const blockProps = useBlockProps.save( {
		className: 'forwp-video-lightbox-trigger',
		'data-video-url': videoUrl || '',
		'data-poster-url': posterUrl || '',
	} );

	return (
		<div { ...blockProps }>
			<InnerBlocks.Content />
		</div>
	);
}
