export type ObjectId = string;
export type ObjectType = string;

export interface ObjectRecord extends Record< string, any > {
	id?: ObjectId;
}

export type AwarenessEventListener = ( params: {
	added: number[];
	removed: number[];
	updated: number[];
} ) => void;

export interface AwarenessManager {
	addListener: (
		eventType: 'update' | 'change',
		listener: AwarenessEventListener
	) => void;
	getStates: () => Map< number, Record< string, unknown > > | null;
	removeStates: () => void;
	setLocalState: ( field: string, value: unknown ) => void;
}

export interface SyncProvider< RecordType = ObjectRecord > {
	bootstrap: (
		type: ObjectType,
		record: ObjectRecord,
		onChange: ( changes: Partial< RecordType > ) => void
	) => Promise< void >;

	destroy: ( type: ObjectType, id: ObjectId ) => Promise< void >;

	update: (
		type: ObjectType,
		record: ObjectRecord,
		changes: Partial< RecordType >,
		origin: string
	) => void;

	awarenessManager?: AwarenessManager;
}
