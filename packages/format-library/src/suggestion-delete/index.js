/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

const name = 'core/suggestion-delete';
const title = __( 'Suggested deletion' );

/**
 * Read-only format type for suggested deletions. This format wraps text that
 * has been proposed for removal by a user in suggesting mode. The text is
 * rendered with strikethrough styling. It is not directly editable — users
 * interact with suggestions via accept/reject actions.
 */
export const suggestionDelete = {
	name,
	title,
	tagName: 'del',
	className: 'wp-suggestion-delete',
	// No edit component — this format is applied programmatically by the
	// suggestion rendering pipeline, not by user toolbar actions.
	edit() {
		return null;
	},
};
