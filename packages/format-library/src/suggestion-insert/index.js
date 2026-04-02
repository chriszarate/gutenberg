/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

const name = 'core/suggestion-insert';
const title = __( 'Suggested insertion' );

/**
 * Read-only format type for suggested insertions. This format wraps text that
 * has been proposed as an addition by a user in suggesting mode. It is not
 * directly editable — users interact with suggestions via accept/reject
 * actions.
 */
export const suggestionInsert = {
	name,
	title,
	tagName: 'ins',
	className: 'wp-suggestion-insert',
	// No edit component — this format is applied programmatically by the
	// suggestion rendering pipeline, not by user toolbar actions.
	edit() {
		return null;
	},
};
