/**
 * External dependencies
 */
import type { Awareness } from 'y-protocols/awareness';
import * as Y from 'yjs';

/**
 * Internal dependencies
 */
import type { AttributedChange } from './types';
import { CRDT_RECORD_MAP_KEY } from '../config';

/**
 * User info from awareness state.
 */
interface AwarenessUserInfo {
	id?: number;
	name?: string;
	color?: string;
}

/**
 * Get user info from awareness by client ID.
 */
function getUserInfoFromAwareness(
	awareness: Awareness | undefined,
	clientId: number
): AwarenessUserInfo {
	if ( ! awareness ) {
		return {};
	}

	const states = awareness.getStates();
	const state = states.get( clientId );

	if ( ! state ) {
		return {};
	}

	return {
		id: state.user?.id,
		name: state.user?.name,
		color: state.user?.color,
	};
}

/**
 * Create a snapshot of the current document state.
 *
 * @param ydoc The Yjs document to snapshot.
 * @return Encoded snapshot as Uint8Array.
 */
export function createEncodedSnapshot( ydoc: Y.Doc ): Uint8Array {
	const snapshot = Y.snapshot( ydoc );
	return Y.encodeSnapshotV2( snapshot );
}

/**
 * Decode a snapshot from its encoded form.
 *
 * @param encoded The encoded snapshot.
 * @return The decoded snapshot.
 */
export function decodeSnapshot( encoded: Uint8Array ): Y.Snapshot {
	return Y.decodeSnapshotV2( encoded );
}

/**
 * Clone a Y.Doc by encoding and applying its state to a new document.
 *
 * @param ydoc The document to clone.
 * @return A new document with the same state.
 */
export function cloneYDoc( ydoc: Y.Doc ): Y.Doc {
	const clone = new Y.Doc();
	const state = Y.encodeStateAsUpdateV2( ydoc );
	Y.applyUpdateV2( clone, state );
	return clone;
}

/**
 * Create a DiffAttributionManager for tracking suggestions.
 *
 * The DiffAttributionManager compares two documents:
 * - prevDoc: The baseline/accepted state
 * - nextDoc: The document with suggested changes
 *
 * When suggestionMode is true (default), changes to nextDoc don't flow
 * back to prevDoc, allowing suggestions to accumulate.
 *
 * @param prevDoc The baseline document (accepted state).
 * @param nextDoc The document with suggestions.
 * @return The attribution manager.
 */
export function createSuggestionAttributionManager(
	prevDoc: Y.Doc,
	nextDoc: Y.Doc
): Y.DiffAttributionManager {
	return Y.createAttributionManagerFromDiff( prevDoc, nextDoc );
}

/**
 * Extract human-readable attributed changes from a DiffAttributionManager.
 *
 * @param attributionManager The attribution manager.
 * @param nextDoc            The document with suggestions (for context).
 * @param awareness          Optional awareness instance for user info.
 * @return Array of attributed changes.
 */
export function extractAttributedChanges(
	attributionManager: Y.DiffAttributionManager,
	nextDoc: Y.Doc,
	awareness?: Awareness
): AttributedChange[] {
	const changes: AttributedChange[] = [];

	// Extract insertions from the attribution manager's inserts IdMap
	attributionManager.inserts.forEach( ( attrRange, client ) => {
		const userInfo = getUserInfoFromAwareness( awareness, client );
		changes.push( {
			type: 'insert',
			content: `[inserted content]`,
			authorClientId: client,
			authorUserId: userInfo.id,
			authorName: userInfo.name,
			authorColor: userInfo.color,
			range: {
				start: attrRange.clock,
				end: attrRange.clock + attrRange.len,
			},
		} );
	} );

	// Extract deletions from the attribution manager's deletes IdMap
	attributionManager.deletes.forEach( ( attrRange, client ) => {
		const userInfo = getUserInfoFromAwareness( awareness, client );
		changes.push( {
			type: 'delete',
			content: `[deleted content]`,
			authorClientId: client,
			authorUserId: userInfo.id,
			authorName: userInfo.name,
			authorColor: userInfo.color,
			range: {
				start: attrRange.clock,
				end: attrRange.clock + attrRange.len,
			},
		} );
	} );

	return changes;
}

/**
 * Check if there are any pending changes in the attribution manager.
 *
 * @param attributionManager The attribution manager.
 * @return True if there are pending insertions or deletions.
 */
export function hasPendingChanges(
	attributionManager: Y.DiffAttributionManager
): boolean {
	let hasChanges = false;

	attributionManager.inserts.forEach( () => {
		hasChanges = true;
	} );

	if ( ! hasChanges ) {
		attributionManager.deletes.forEach( () => {
			hasChanges = true;
		} );
	}

	return hasChanges;
}

/**
 * Restore a document to a previous state by applying the state from another document.
 *
 * @param targetDoc The document to restore.
 * @param sourceDoc The document to restore from.
 */
export function restoreFromDoc( targetDoc: Y.Doc, sourceDoc: Y.Doc ): void {
	targetDoc.transact( () => {
		const targetMap = targetDoc.getMap( CRDT_RECORD_MAP_KEY );
		const sourceMap = sourceDoc.getMap( CRDT_RECORD_MAP_KEY );

		// Clear the target document
		for ( const key of targetMap.keys() ) {
			targetMap.delete( key );
		}

		// Copy from source
		for ( const [ key, value ] of sourceMap.entries() ) {
			targetMap.set( key, value );
		}
	} );
}
