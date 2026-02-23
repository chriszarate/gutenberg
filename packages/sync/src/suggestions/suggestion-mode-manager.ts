/**
 * External dependencies
 */
import type { Awareness } from 'y-protocols/awareness';
import * as Y from 'yjs';

/**
 * Internal dependencies
 */
import type {
	AttributedChange,
	ISuggestionModeManager,
	SuggestionModeChangeCallback,
	SuggestionModeManagerOptions,
	SuggestionModeState,
} from './types';
import {
	cloneYDoc,
	createSuggestionAttributionManager,
	extractAttributedChanges,
	restoreFromDoc,
} from './attribution-utils';
import {
	CRDT_SUGGESTION_META_MAP_KEY,
	SUGGESTION_BASELINE_KEY,
	SUGGESTION_STARTED_AT_KEY,
	SUGGESTION_STARTED_BY_KEY,
} from '../config';

/**
 * Origin string for suggestion mode changes.
 */
const SUGGESTION_MODE_ORIGIN = 'suggestionMode';

/**
 * Manages suggestion mode for a single entity's CRDT document.
 *
 * Uses Yjs 14's DiffAttributionManager to track changes between a baseline
 * document and the current document. When suggestion mode is active:
 * - A clone of the document is created as the baseline (prevDoc)
 * - The DiffAttributionManager tracks insertions and deletions
 * - Changes can be accepted (apply to baseline) or rejected (revert to baseline)
 */
export class SuggestionModeManager implements ISuggestionModeManager {
	private ydoc: Y.Doc;
	private awareness?: Awareness;
	private suggestionMetaMap: Y.Map< unknown >;
	private stateChangeCallbacks: Set< SuggestionModeChangeCallback >;
	private observer: ( event: Y.YEvent< Y.Map< unknown > > ) => void;

	// The DiffAttributionManager and baseline doc (only created when active)
	private attributionManager?: Y.DiffAttributionManager;
	private baselineDoc?: Y.Doc;

	constructor( options: SuggestionModeManagerOptions ) {
		this.ydoc = options.ydoc;
		this.awareness = options.awareness;
		this.stateChangeCallbacks = new Set();

		// Get or create the suggestion meta map
		this.suggestionMetaMap = this.ydoc.getMap( CRDT_SUGGESTION_META_MAP_KEY );

		// Set up observer for state changes
		this.observer = () => {
			const state = this.getState();
			for ( const callback of this.stateChangeCallbacks ) {
				callback( state );
			}
		};
		this.suggestionMetaMap.observe( this.observer );

		// Check if we need to restore attribution manager from persisted state
		this.restoreFromPersistedState();
	}

	/**
	 * Restore attribution manager if suggestion mode was previously active.
	 */
	private restoreFromPersistedState(): void {
		if ( this.suggestionMetaMap.has( SUGGESTION_BASELINE_KEY ) ) {
			// Suggestion mode was active before - we need to recreate the baseline
			// For now, we just mark it as needing restoration
			// The baseline state is stored as encoded update, not snapshot
			const encodedBaseline = this.suggestionMetaMap.get(
				SUGGESTION_BASELINE_KEY
			) as Uint8Array | undefined;

			if ( encodedBaseline ) {
				this.baselineDoc = new Y.Doc();
				Y.applyUpdateV2( this.baselineDoc, encodedBaseline );
				this.attributionManager = createSuggestionAttributionManager(
					this.baselineDoc,
					this.ydoc
				);
			}
		}
	}

	/**
	 * Start suggestion mode by creating a baseline copy of the current
	 * document state.
	 */
	start(): void {
		if ( this.isActive() ) {
			return;
		}

		// Clone the current document as the baseline
		this.baselineDoc = cloneYDoc( this.ydoc );

		// Create the DiffAttributionManager
		this.attributionManager = createSuggestionAttributionManager(
			this.baselineDoc,
			this.ydoc
		);

		// Store the baseline state in the meta map so it syncs to other clients
		const encodedBaseline = Y.encodeStateAsUpdateV2( this.baselineDoc );

		this.ydoc.transact( () => {
			this.suggestionMetaMap.set( SUGGESTION_BASELINE_KEY, encodedBaseline );
			this.suggestionMetaMap.set( SUGGESTION_STARTED_AT_KEY, Date.now() );
			this.suggestionMetaMap.set(
				SUGGESTION_STARTED_BY_KEY,
				this.ydoc.clientID
			);
		}, SUGGESTION_MODE_ORIGIN );
	}

	/**
	 * Check if suggestion mode is currently active.
	 */
	isActive(): boolean {
		return (
			this.attributionManager !== undefined &&
			this.baselineDoc !== undefined
		);
	}

	/**
	 * Get the current suggestion mode state.
	 */
	getState(): SuggestionModeState {
		const encodedBaseline = this.suggestionMetaMap.get(
			SUGGESTION_BASELINE_KEY
		) as Uint8Array | undefined;
		const startedAt = this.suggestionMetaMap.get(
			SUGGESTION_STARTED_AT_KEY
		) as number | undefined;
		const startedBy = this.suggestionMetaMap.get(
			SUGGESTION_STARTED_BY_KEY
		) as number | undefined;

		return {
			isActive: this.isActive(),
			baselineSnapshot: encodedBaseline ?? null,
			startedAt: startedAt ?? null,
			startedBy: startedBy ?? null,
		};
	}

	/**
	 * Get the DiffAttributionManager for rendering attributed content.
	 * This can be passed to Y.Text.toDelta() and similar methods.
	 *
	 * @return The attribution manager, or undefined if not in suggestion mode.
	 */
	getAttributionManager(): Y.DiffAttributionManager | undefined {
		return this.attributionManager;
	}

	/**
	 * Get all attributed changes since the baseline.
	 *
	 * @return Array of attributed changes, or empty array if not in suggestion mode.
	 */
	getAttributedChanges(): AttributedChange[] {
		if ( ! this.attributionManager ) {
			return [];
		}

		return extractAttributedChanges(
			this.attributionManager,
			this.ydoc,
			this.awareness
		);
	}

	/**
	 * Accept all suggestions by updating the baseline to match current state.
	 * The current document state becomes the new accepted state.
	 */
	acceptAll(): void {
		if ( ! this.isActive() ) {
			return;
		}

		// Clean up the attribution manager and baseline doc
		this.attributionManager?.destroy();
		this.attributionManager = undefined;
		this.baselineDoc?.destroy();
		this.baselineDoc = undefined;

		// Clear the meta map
		this.ydoc.transact( () => {
			this.suggestionMetaMap.delete( SUGGESTION_BASELINE_KEY );
			this.suggestionMetaMap.delete( SUGGESTION_STARTED_AT_KEY );
			this.suggestionMetaMap.delete( SUGGESTION_STARTED_BY_KEY );
		}, SUGGESTION_MODE_ORIGIN );
	}

	/**
	 * Reject all suggestions by restoring the document to the baseline state.
	 */
	rejectAll(): void {
		if ( ! this.isActive() || ! this.baselineDoc ) {
			return;
		}

		// Restore the main document from baseline
		restoreFromDoc( this.ydoc, this.baselineDoc );

		// Clean up
		this.attributionManager?.destroy();
		this.attributionManager = undefined;
		this.baselineDoc?.destroy();
		this.baselineDoc = undefined;

		// Clear the meta map
		this.ydoc.transact( () => {
			this.suggestionMetaMap.delete( SUGGESTION_BASELINE_KEY );
			this.suggestionMetaMap.delete( SUGGESTION_STARTED_AT_KEY );
			this.suggestionMetaMap.delete( SUGGESTION_STARTED_BY_KEY );
		}, SUGGESTION_MODE_ORIGIN );
	}

	/**
	 * Subscribe to suggestion mode state changes.
	 *
	 * @param callback Function to call when state changes.
	 * @return Unsubscribe function.
	 */
	onStateChange( callback: SuggestionModeChangeCallback ): () => void {
		this.stateChangeCallbacks.add( callback );
		return () => {
			this.stateChangeCallbacks.delete( callback );
		};
	}

	/**
	 * Clean up resources.
	 */
	destroy(): void {
		this.suggestionMetaMap.unobserve( this.observer );
		this.stateChangeCallbacks.clear();
		this.attributionManager?.destroy();
		this.baselineDoc?.destroy();
	}
}
