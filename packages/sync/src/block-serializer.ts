interface BlockLike {
	attributes: Record< string, object >;
	innerBlocks: BlockLike[];
	isValid?: boolean;
	validationIssues?: unknown;
	originalContent?: string;
}

const serialisableBlocksCache = new WeakMap();

function makeBlockAttributesSerializable(
	attributes: BlockLike[ 'attributes' ]
) {
	const newAttributes = { ...attributes };
	for ( const [ key, value ] of Object.entries( attributes ) ) {
		if ( Object.prototype.hasOwnProperty.call( value, 'valueOf' ) ) {
			newAttributes[ key ] = value.valueOf();
		}
	}
	return newAttributes;
}

export function makeBlocksSerializable(
	blocks: BlockLike[]
): Record< string, any >[] {
	if ( serialisableBlocksCache.has( blocks ) ) {
		return serialisableBlocksCache.get( blocks );
	}

	const serialized = blocks.map( ( block: BlockLike ) => {
		const { innerBlocks, attributes, ...rest } = block;

		// Delete computed properties.
		delete rest.validationIssues;
		delete rest.originalContent;
		delete rest.isValid;

		return {
			...rest,
			attributes: makeBlockAttributesSerializable( attributes ),
			innerBlocks: makeBlocksSerializable( innerBlocks ),
		};
	} );

	serialisableBlocksCache.set( blocks, serialized );

	return serialized;
}
