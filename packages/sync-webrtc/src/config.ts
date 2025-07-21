/**
 * WordPress dependencies
 */
import { makeBlocksSerializable } from '@wordpress/sync';
import type { ObjectId, ObjectRecord } from '@wordpress/sync';

/**
 * External dependencies
 */
import * as Y from 'yjs';
import * as fun from 'lib0/function';
import * as math from 'lib0/math';
import { v4 as uuidv4 } from 'uuid';

/**
 * Internal dependencies
 */
import { defaultYdocTransformer, parseContentYdoc } from './utils';

// only sync what is necessary!
const filteredAttributes = new Set( [
	'content',
	'selection',
	'excerpt',
	'date',
	'date_gmt',
	'format',
	'generated_slug',
	'link',
	'meta',
	'modified',
	'modified_gmt',
	'slug',
	'status',
	'sticky',
	'tags',
	'template',
	'_links',
	'id',
	'password',
	'featured_media',
] );

export const syncConfigs: Record< ObjectId, ObjectRecord > = {
	'postType/Posts': {
		applyChangesToDoc: ( ydoc: Y.Doc, changes: any ) => {
			const content = changes.content?.raw || changes.content;
			const parsedYdoc =
				typeof content === 'string'
					? parseContentYdoc(
							content,
							syncConfigs[ 'postType/Posts' ].applyChangesToDoc
					  )
					: null; // Note: always use the same 'postType' as this object's config.syncObjectType
			if ( parsedYdoc !== null ) {
				// parse content which contains a ydoc, and apply it to the current ydoc. The rest of the attributes can be ignored.
				Y.transact(
					ydoc,
					() => {
						// apply remote changes
						Y.applyUpdate(
							ydoc,
							Y.encodeStateAsUpdate( parsedYdoc )
						);
					},
					'applyChangesToDoc',
					false
				);
			} else {
				// local changes happened. Apply the differences to the ydoc
				const ycontent = ydoc.getMap( 'document' );
				ydoc.transact( () => {
					Object.entries( changes ).forEach(
						( [ key, value ]: [ string, any ] ) => {
							if ( typeof value !== 'function' ) {
								if ( key === 'blocks' && value ) {
									const blocks =
										makeBlocksSerializable( value );

									// This is a rudimentary diff implementation similar to the y-prosemirror diffing
									// approach.
									// A better implementation would also diff the textual content and represent it
									// using a Y.Text type.
									// However, at this time it makes more sense to keep this algorithm generic to
									// support all kinds of block types.
									// Ideally, we ensure that block data structure have a consistent data format.
									// E.g.:
									//   - textual content (using rich-text formatting?) may always be stored under `block.text`
									//   - local information that shouldn't be shared (e.g. clientId or isDragging) is stored under `block.private`
									if (
										! ycontent.has( key ) ||
										ycontent.get( key ) instanceof Array
									) {
										// @todo remove the array check
										ycontent.set( key, new Y.Array() );
									}

									const yblocks = ycontent.get(
										key
									) as Y.Array< Y.Map< any > >;
									const numOfCommonEntries = math.min(
										blocks.length,
										yblocks.length
									);
									let left = 0;
									let right = 0;

									const blocksEqual = (
										gblock: any,
										yblock: any
									) => {
										if ( yblock.toJSON ) {
											yblock = yblock.toJSON();
										}
										// we must not sync clientId, as this can't be generated consistenctly and
										// hence will lead to merge conflicts.
										const overwrites = {
											innerBlocks: null,
											clientId: null,
										};
										const res = fun.equalityDeep(
											Object.assign(
												{},
												gblock,
												overwrites
											),
											Object.assign(
												{},
												yblock,
												overwrites
											)
										);
										const inners = gblock.innerBlocks || [];
										const yinners =
											yblock.innerBlocks || [];
										return (
											res &&
											inners.length === yinners.length &&
											inners.every(
												( block: any, i: number ) =>
													blocksEqual(
														block,
														yinners[ i ]
													)
											)
										);
									};
									// skip equal blocks from left
									for (
										;
										left < numOfCommonEntries &&
										blocksEqual(
											blocks[ left ],
											yblocks.get( left )
										);
										left++
									) {
										/* nop */
									}
									// skip equal blocks from right
									for (
										;
										right < numOfCommonEntries - left &&
										blocksEqual(
											blocks[ blocks.length - right - 1 ],
											yblocks.get(
												yblocks.length - right - 1
											)
										);
										right++
									) {
										/* nop */
									}
									const numOfUpdatesNeeded =
										numOfCommonEntries - left - right;
									const numOfInsertionsNeeded = math.max(
										0,
										blocks.length - yblocks.length
									);
									const numOfDeletionsNeeded = math.max(
										0,
										yblocks.length - blocks.length
									);
									// updates
									for (
										let i = 0;
										i < numOfUpdatesNeeded;
										i++, left++
									) {
										const block = blocks[ left ];
										const yblock = yblocks.get( left );
										Object.entries( block ).forEach(
											( [ k, v ] ) => {
												if (
													! fun.equalityDeep(
														block[ k ],
														yblock.get( k )
													)
												) {
													yblock.set( k, v );
												}
											}
										);
										yblock.forEach( ( _v, k ) => {
											if ( ! block.hasOwnProperty( k ) ) {
												yblock.delete( k );
											}
										} );
									}
									// deletes
									yblocks.delete(
										left,
										numOfDeletionsNeeded
									);
									// inserts
									for (
										let i = 0;
										i < numOfInsertionsNeeded;
										i++, left++
									) {
										yblocks.insert( left, [
											new Y.Map(
												Object.entries( blocks[ left ] )
											),
										] );
									}
									const knownClientIds = new Set();
									// remove duplicate clientids
									for ( let j = 0; j < yblocks.length; j++ ) {
										const yblock = yblocks.get( j );
										if (
											knownClientIds.has(
												yblock.get( 'clientId' )
											)
										) {
											yblock.set( 'clientId', uuidv4() );
										}
										knownClientIds.add(
											yblock.get( 'clientId' )
										);
									}
								} else if (
									! filteredAttributes.has( key ) &&
									! fun.equalityDeep(
										ycontent.get( key ),
										value
									)
								) {
									ycontent.set( key, value );
								}
							}
						}
					);
				}, 'gutenberg' );
			}
		},
		fromCRDTDoc: defaultYdocTransformer,
		getObjectId: ( { id }: ObjectRecord ) => id,
	},
};
