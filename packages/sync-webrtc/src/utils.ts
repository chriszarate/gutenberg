/**
 * WordPress dependencies
 */
import { applyFilters } from '@wordpress/hooks';

/**
 * External dependencies
 */
import * as Y from 'yjs';
import * as string from 'lib0/string';
import * as sha256 from 'lib0/hash/sha256';

function createYjsDocument( content: string ) {
	// Initial pull of the document. Generate a consistent new clientid.
	const newClientId = new Uint32Array(
		sha256.digest( string.encodeUtf8( content ) ).buffer
	);

	return {
		startRange: 0,
		endRange: 0,
		version: '1',
		state: Y.encodeStateAsUpdateV2( new Y.Doc() ),
		newClientId,
	};
}

export const defaultYdocTransformer = ( ydoc: Y.Doc ) => {
	const json = ydoc.getMap( 'document' ).toJSON();
	if ( json.title?.raw ) {
		json.title = json.title.raw;
	}
	return json;
};

export function parseContentYdoc(
	content: string,
	applyChangesToDoc: ( ydoc: Y.Doc, data: any ) => void
): Y.Doc | null {
	const { state, newClientId, startRange, endRange } =
		createYjsDocument( content );
	const blockContent =
		content.slice( 0, startRange ) + content.slice( endRange );

	// Replay actions in a consistent manner, so that every client performs the same actions to
	// retrieve a certain document.
	// It is important that this is a fresh document - don't use the document from the sync package!
	const ydoc = new Y.Doc( { meta: new Map() } );
	const knownUpdateGuids: Set< string > = new Set();

	ydoc.meta.set( 'knownRemoteUpdates', knownUpdateGuids );
	if ( state.length > 0 ) {
		Y.applyUpdateV2( ydoc, state );
	}
	// Changing the Yjs clientid may lead to very weird bugs if done incorrectly.
	// Please handle the following code-portion with great care!
	const prevClientId = ydoc.clientID;
	const newClientIdAsNumber = Number( newClientId );
	ydoc.clientID = newClientIdAsNumber;
	const prevClock = ( ydoc.store.clients.get( newClientIdAsNumber ) || [
		{ id: { clock: 0 } },
	] )[ 0 ].id.clock;
	const blocks = applyFilters( 'core.parseBlocks', null, blockContent );
	applyChangesToDoc( ydoc, {
		blocks,
	} );
	ydoc.clientID = prevClientId;
	const newClock = ( ydoc.store.clients.get( newClientIdAsNumber ) ?? [
		{ id: { clock: 0 } },
	] )[ 0 ].id.clock;
	if ( prevClock !== newClock ) {
		// eslint-disable-next-line no-console
		console.info(
			'[Yjs Collab] Yjs document was updated to reflect changes to the HTML document.'
		);
	}
	return ydoc;
}
