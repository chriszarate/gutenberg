/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import { store as coreStore } from '@wordpress/core-data';
import { focus } from '@wordpress/dom';

export default function SitePreview() {
	const siteUrl = useSelect( ( select ) => {
		const { getEntityRecord } = select( coreStore );
		const siteData = getEntityRecord( 'root', '__unstableBase' );
		return siteData?.home;
	}, [] );

	// If theme is block based, return the Editor, otherwise return the site preview.
	return (
		<iframe
			src={ siteUrl }
			title={ __( 'Site Preview' ) }
			style={ {
				display: 'block',
				width: '100%',
				height: '100%',
				backgroundColor: '#fff',
			} }
			onLoad={ ( event ) => {
				// Hide the admin bar in the front-end preview.
				const document = event.target.contentDocument;
				document.getElementById( 'wpadminbar' ).remove();
				document
					.getElementsByTagName( 'html' )[ 0 ]
					.setAttribute( 'style', 'margin-top: 0 !important;' );
				document
					.getElementsByTagName( 'body' )[ 0 ]
					.classList.remove( 'admin-bar' );
				// Make interactive elements unclickable.
				const focusableElements = focus.focusable.find( document );
				focusableElements.forEach( ( element ) => {
					element.style.pointerEvents = 'none';
					element.tabIndex = -1;
					element.setAttribute( 'aria-hidden', 'true' );
				} );
			} }
		/>
	);
}
