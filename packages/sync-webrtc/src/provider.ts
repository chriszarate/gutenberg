/**
 * WordPress dependencies
 */
import type {
	ObjectId,
	ObjectRecord,
	ObjectType,
	SyncProvider,
} from '@wordpress/sync';

/**
 * External dependencies
 */
import * as Y from 'yjs';

/**
 * Internal dependencies
 */
import { syncConfigs } from './config';
import type { ConnectDoc, ConnectDocResult, DocsMap } from './types';

/**
 * Create a sync provider.
 *
 * @param {ConnectDoc | null} connectLocal  Connect the document to a local database.
 * @param {ConnectDoc | null} connectRemote Connect the document to a remote sync connection.
 * @return {SyncProvider} Sync provider.
 */
export const createSyncProvider = (
	connectLocal: ConnectDoc | null,
	connectRemote: ConnectDoc | null
): SyncProvider => {
	const docs: DocsMap = {};

	/**
	 * Fetch data from local database or remote source.
	 *
	 * @param {ObjectType}   objectType    Object type to load.
	 * @param {ObjectRecord} record        Initial data to apply to the document.
	 * @param {Function}     handleChanges Callback to call when data changes.
	 */
	async function bootstrap(
		objectType: ObjectType,
		record: ObjectRecord,
		handleChanges: Function
	): Promise< void > {
		if ( ! syncConfigs[ objectType ] ) {
			return;
		}

		const objectId = syncConfigs[ objectType ].getObjectId( record );
		if ( ! objectId ) {
			throw new Error(
				`No object ID found for object type: ${ objectType }`
			);
		}

		const doc = new Y.Doc( { meta: new Map() } );

		const updateHandler: ( _update: Uint8Array, origin: any ) => void = (
			_update,
			origin
		): void => {
			if ( origin !== 'gutenberg' ) {
				const data = syncConfigs[ objectType ].fromCRDTDoc( doc );
				handleChanges( data );
			}
		};
		doc.on( 'update', updateHandler );

		let connectLocalResult: ConnectDocResult | null = null;

		if ( connectLocal ) {
			// connect to locally saved database.
			connectLocalResult = await connectLocal(
				objectId,
				objectType,
				doc
			);
		}

		let connectRemoteResult: ConnectDocResult | null = null;

		// Once the database syncing is done, start the remote syncing
		if ( connectRemote ) {
			connectRemoteResult = await connectRemote(
				objectId,
				objectType,
				doc
			);
		}

		docs[ objectType ] = docs[ objectType ] || {};
		docs[ objectType ][ objectId ] = {
			ydoc: doc,
			prevContentClientId: 0,
			destroy: () => {
				connectLocalResult?.destroy?.();
				connectRemoteResult?.destroy?.();

				doc.off( 'update', updateHandler );
				doc.destroy();
				delete docs[ objectType ][ objectId ];
			},
		};

		update( objectType, record, record, 'gutenberg' );
	}

	/**
	 * Fetch data from local database or remote source.
	 *
	 * @param {ObjectType}   objectType Object type to load.
	 * @param {ObjectRecord} record     Record ID to load.
	 * @param {any}          data       Updates to make.
	 * @param {any}          origin     The source of change.
	 */
	function update(
		objectType: ObjectType,
		record: ObjectRecord,
		data: any,
		origin: any
	) {
		const objectId = syncConfigs[ objectType ]?.getObjectId( record );
		if ( ! objectId || ! docs[ objectType ]?.[ objectId ] ) {
			return;
		}

		const docDef = docs[ objectType ]?.[ objectId ];
		docDef.ydoc.transact( () => {
			syncConfigs[ objectType ].applyChangesToDoc( docDef.ydoc, data );
		}, origin );
	}

	/**
	 * Stop updating a document and destroy it.
	 *
	 * @param {ObjectType} objectType Object type to load.
	 * @param {ObjectId}   objectId   Object ID to load.
	 */
	async function destroy( objectType: ObjectType, objectId: ObjectId ) {
		docs[ objectType ]?.[ objectId ]?.destroy();
	}

	return {
		bootstrap,
		destroy,
		update,
	};
};
