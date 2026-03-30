import { InnerBlocks } from '@wordpress/block-editor';

/**
 * Dynamic block: inner blocks persist; PHP render builds Swiper markup on the front.
 */
export default function save() {
	return <InnerBlocks.Content />;
}
