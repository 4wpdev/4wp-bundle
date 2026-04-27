/**
 * 4WP Show More - frontend toggle interactivity.
 */
const initShowMoreBlocks = () => {
	document.querySelectorAll( '.forwp-show-more' ).forEach( ( wrapper ) => {
		const content = wrapper.querySelector( '.forwp-show-more__content' );
		const toggle = wrapper.querySelector( '.forwp-show-more__toggle' );

		if ( ! content || ! toggle ) return;
		if ( wrapper.dataset.forwpShowMoreInit === '1' ) return;
		wrapper.dataset.forwpShowMoreInit = '1';

		const showMore = wrapper.dataset.showMore || 'Show more';
		const showLess = wrapper.dataset.showLess || 'Show less';

		toggle.addEventListener( 'click', () => {
			const isExpanded = wrapper.classList.toggle( 'is-expanded' );
			toggle.setAttribute( 'aria-expanded', isExpanded );
			toggle.textContent = isExpanded ? showLess : showMore;
		} );
	} );
};

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', initShowMoreBlocks );
} else {
	initShowMoreBlocks();
}
