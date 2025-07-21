/**
 * WordPress dependencies
 */
import { applyFilters } from '@wordpress/hooks';

/**
 * Internal dependencies
 */
import type { SyncProvider } from './types';

/**
 * Exports
 */
export * from './block-serializer';
export * from './types';

let syncProvider: SyncProvider;

/**
 * Returns the current sync provider, filterable by external code.
 *
 * If no sync provider is set, it returns a fallback no-op sync provider.
 *
 * @return The current sync provider.
 */
export function getSyncProvider(): SyncProvider {
	if ( syncProvider ) {
		return syncProvider;
	}

	const fallbackNoOpSyncProvider = {
		bootstrap: async () => {},
		destroy: async () => {},
		update: () => {},
	};

	syncProvider =
		( applyFilters(
			'core.getSyncProvider',
			null
		) as SyncProvider | null ) ?? fallbackNoOpSyncProvider;

	return syncProvider;
}
