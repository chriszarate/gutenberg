/**
 * External dependencies
 */
import type { Awareness } from 'y-protocols/awareness';
import type * as Y from 'yjs';

/**
 * Represents the current state of suggestion mode for an entity.
 */
export interface SuggestionModeState {
	/** Whether suggestion mode is currently active */
	isActive: boolean;
	/** Encoded snapshot of document state when suggestion mode started */
	baselineSnapshot: Uint8Array | null;
	/** Timestamp when suggestion mode was started */
	startedAt: number | null;
	/** Yjs client ID of the user who started suggestion mode */
	startedBy: number | null;
}

/**
 * Represents a single attributed change detected between the baseline
 * snapshot and the current document state.
 */
export interface AttributedChange {
	/** Type of change */
	type: 'insert' | 'delete';
	/** The content that was inserted or deleted */
	content: string | unknown;
	/** Yjs client ID of the author */
	authorClientId: number;
	/** WordPress user ID of the author (if available from awareness) */
	authorUserId?: number;
	/** Display name of the author (if available from awareness) */
	authorName?: string;
	/** Color assigned to the author (from awareness) */
	authorColor?: string;
	/** Character range within the text (for text changes) */
	range?: { start: number; end: number };
	/** Block client ID this change belongs to (for block-level context) */
	blockClientId?: string;
	/** Path to the changed property within the block */
	path?: string[];
}

/**
 * Options for creating a SuggestionModeManager.
 */
export interface SuggestionModeManagerOptions {
	/** The Yjs document to track suggestions for */
	ydoc: Y.Doc;
	/** The awareness instance for user info */
	awareness?: Awareness;
}

/**
 * Callback for suggestion mode state changes.
 */
export type SuggestionModeChangeCallback = (
	state: SuggestionModeState
) => void;

/**
 * Interface for the SuggestionModeManager.
 */
export interface ISuggestionModeManager {
	/** Start suggestion mode - takes a baseline snapshot */
	start(): void;

	/** Check if suggestion mode is currently active */
	isActive(): boolean;

	/** Get the current suggestion mode state */
	getState(): SuggestionModeState;

	/** Get all attributed changes since the baseline snapshot */
	getAttributedChanges(): AttributedChange[];

	/** Accept all suggestions - discard the baseline snapshot */
	acceptAll(): void;

	/** Reject all suggestions - restore document from baseline snapshot */
	rejectAll(): void;

	/** Subscribe to suggestion mode state changes */
	onStateChange( callback: SuggestionModeChangeCallback ): () => void;

	/** Clean up resources */
	destroy(): void;
}
