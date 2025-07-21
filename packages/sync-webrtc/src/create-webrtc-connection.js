/**
 * External dependencies
 */

/**
 * Internal dependencies
 */
import { WebrtcProviderWithHttpSignaling } from './webrtc-http-stream-signaling';

/**
 * Function that creates a new WebRTC Connection.
 *
 * @param {Object}        config           The object ID.
 *
 * @param {Array<string>} config.signaling
 * @param {string}        config.password
 * @return {import('./types').ConnectDoc} Promise that resolves when the connection is established.
 */
export function createWebRTCConnection( { signaling, password } ) {
	return function (
		/** @type {import("@wordpress/sync").ObjectId} */ objectId,
		/** @type {import("@wordpress/sync").ObjectType} */ objectType,
		/** @type {import("yjs").Doc} */ doc
	) {
		const roomName = `${ objectType }-${ objectId }`;
		new WebrtcProviderWithHttpSignaling( roomName, doc, {
			signaling,
			// @ts-ignore
			password,
		} );

		return Promise.resolve( {
			destroy: () => {
				// No explicit destroy method in WebrtcProviderWithHttpSignaling.
			},
		} );
	};
}
