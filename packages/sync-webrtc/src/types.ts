/**
 * WordPress dependencies
 */
import type { ObjectId, ObjectType } from '@wordpress/sync';

/**
 * External dependencies
 */
import type * as Y from 'yjs';

export interface ConnectDocResult {
	destroy: () => void;
}

export type ConnectDoc = (
	id: ObjectId,
	type: ObjectType,
	ydoc: Y.Doc
) => Promise< ConnectDocResult >;

export type DocsMap = Record<
	ObjectType,
	Record<
		ObjectId,
		{
			ydoc: Y.Doc;
			prevContentClientId: number;
			destroy: () => void;
		}
	>
>;
