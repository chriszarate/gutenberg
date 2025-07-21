/**
 * External dependencies
 */

/**
 * WordPress dependencies
 */
import { addFilter } from '@wordpress/hooks';
import type { SyncProvider } from '@wordpress/sync';

/**
 * Internal dependencies
 */
import { createWebRTCConnection } from './create-webrtc-connection';
import { createSyncProvider } from './provider';

/**
 * Export dependencies
 */

// Browser window
declare global {
	interface Window {
		__experimentalCollaborativeEditingSecret?: string;
		wp: {
			ajax: {
				settings: {
					url: string;
				};
			};
		};
	}
}

addFilter(
	'core.getSyncProvider',
	'wordpress-sync-webrtc/get-sync-provider',
	( provider: SyncProvider | null ): SyncProvider => {
		// Do not override an already defined sync provider.
		if ( provider ) {
			return provider;
		}

		return createSyncProvider(
			null,
			createWebRTCConnection( {
				password:
					window?.__experimentalCollaborativeEditingSecret as string,
				signaling: [ window?.wp?.ajax?.settings?.url ],
			} )
		);
	},
	10
);
