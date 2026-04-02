/**
 * WordPress dependencies
 */
import { type Y } from '@wordpress/sync';

/**
 * Internal dependencies
 */
import {
	isYArray,
	isYMap,
	isYText,
	type YMapRecord,
	type YMap,
	type YText,
} from './crdt-utils';

/**
 * Walk a Y.Text's delta (produced with a DiffAttributionManager) and convert
 * it to an HTML string with suggestion markup:
 *
 * - Suggested insertions: `<ins class="wp-suggestion-insert">`
 * - Suggested deletions: `<del class="wp-suggestion-delete">`
 * - Unchanged content: output as-is
 *
 * @param ytext The Y.Text to render.
 * @param am    The DiffAttributionManager providing attribution data.
 * @return HTML string with suggestion markup.
 */
export function yTextToSuggestionHTML(
	ytext: YText,
	am: Y.DiffAttributionManager
): string {
	const delta = ( ytext as Y.Type ).toDelta( am );
	const json = delta.toJSON();
	const children = json.children;

	if ( ! children || children.length === 0 ) {
		return '';
	}

	const parts: string[] = [];

	for ( const op of children ) {
		if ( 'insert' in op && typeof op.insert === 'string' ) {
			const text = op.insert;
			const attribution = ( op as any ).attribution;

			if ( attribution && 'delete' in attribution ) {
				parts.push(
					`<del class="wp-suggestion-delete">${ text }</del>`
				);
			} else if ( attribution && 'insert' in attribution ) {
				parts.push(
					`<ins class="wp-suggestion-insert">${ text }</ins>`
				);
			} else {
				parts.push( text );
			}
		}
	}

	return parts.join( '' );
}

/**
 * Recursively serialize a Y.Type value to its plain JavaScript equivalent,
 * using the DiffAttributionManager to render suggestion markup for Y.Text
 * types. This is a variant of the standard `serialize` / `yMapToJSON` that
 * produces suggestion-aware HTML.
 *
 * @param value The value to serialize.
 * @param am    The DiffAttributionManager.
 * @return The plain JavaScript equivalent with suggestion markup.
 */
export function serializeWithSuggestions(
	value: unknown,
	am: Y.DiffAttributionManager
): unknown {
	if ( isYMap( value ) ) {
		return serializeWithSuggestions(
			( value as YMap< YMapRecord > ).getAttrs(),
			am
		);
	}

	if ( isYArray( value ) ) {
		return serializeWithSuggestions(
			( value as Y.Type ).toArray(),
			am
		);
	}

	if ( isYText( value ) ) {
		return yTextToSuggestionHTML( value as YText, am );
	}

	// Serializable primitives.
	const primitives = [ 'boolean', 'bigint', 'number', 'string', 'undefined' ];
	if ( primitives.includes( typeof value ) ) {
		return value;
	}

	if ( Array.isArray( value ) ) {
		return value.map( ( item ) => serializeWithSuggestions( item, am ) );
	}

	if ( value && typeof value === 'object' ) {
		return Object.fromEntries(
			Object.entries( value ).map( ( [ k, v ] ) => [
				k,
				serializeWithSuggestions( v, am ),
			] )
		);
	}

	return null;
}

/**
 * Convert a YMap to a plain JavaScript object using suggestion-aware
 * serialization. Y.Text values are rendered with `<ins>`/`<del>` markup
 * based on the DiffAttributionManager's attribution data.
 *
 * @param ymap The YMap to convert.
 * @param am   The DiffAttributionManager.
 * @return The plain JavaScript equivalent with suggestion markup.
 */
export function yMapToJSONWithSuggestions< T extends YMapRecord >(
	ymap: YMap< T >,
	am: Y.DiffAttributionManager
): T {
	return serializeWithSuggestions( ymap.getAttrs(), am ) as T;
}
