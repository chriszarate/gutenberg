export { SuggestionModeManager } from './suggestion-mode-manager';
export {
	cloneYDoc,
	createEncodedSnapshot,
	createSuggestionAttributionManager,
	decodeSnapshot,
	extractAttributedChanges,
	hasPendingChanges,
	restoreFromDoc,
} from './attribution-utils';
export type {
	AttributedChange,
	ISuggestionModeManager,
	SuggestionModeChangeCallback,
	SuggestionModeManagerOptions,
	SuggestionModeState,
} from './types';
