/**
 * 4WP Show More - frontend toggle interactivity.
 */
document.addEventListener( 'DOMContentLoaded', () => {
	document.querySelectorAll( '.forwp-show-more' ).forEach( ( wrapper ) => {
		const content = wrapper.querySelector( '.forwp-show-more__content' );
		const toggle = wrapper.querySelector( '.forwp-show-more__toggle' );

		if ( ! content || ! toggle ) return;

		const showMore = wrapper.dataset.showMore || 'Show more';
		const showLess = wrapper.dataset.showLess || 'Show less';

		toggle.addEventListener( 'click', () => {
			const isExpanded = wrapper.classList.toggle( 'is-expanded' );
			toggle.setAttribute( 'aria-expanded', isExpanded );
			toggle.textContent = isExpanded ? showLess : showMore;
		} );
	} );
} );
