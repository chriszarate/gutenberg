/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	ToolbarDropdownMenu,
	ToolbarGroup,
	BottomSheetSelectControl,
} from '@wordpress/components';
import {
	alignNone,
	positionCenter,
	positionLeft,
	positionRight,
	stretchFullWidth,
	stretchWide,
} from '@wordpress/icons';

/**
 * Internal dependencies
 */
import useAvailableAlignments from './use-available-alignments';

const BLOCK_ALIGNMENTS_CONTROLS = {
	none: {
		icon: alignNone,
		title: __( 'None' ),
	},
	left: {
		icon: positionLeft,
		title: __( 'Align left' ),
	},
	center: {
		icon: positionCenter,
		title: __( 'Align center' ),
	},
	right: {
		icon: positionRight,
		title: __( 'Align right' ),
	},
	wide: {
		icon: stretchWide,
		title: __( 'Wide width' ),
	},
	full: {
		icon: stretchFullWidth,
		title: __( 'Full width' ),
	},
};

const DEFAULT_CONTROL = 'none';

const POPOVER_PROPS = {
	isAlternate: true,
};

function BlockAlignmentUI( {
	value,
	onChange,
	controls,
	isToolbar,
	isCollapsed = true,
	isBottomSheetControl = false,
} ) {
	const enabledControls = useAvailableAlignments( controls );
	const hasEnabledControls = !! enabledControls.length;

	if ( ! hasEnabledControls ) {
		return null;
	}

	function onChangeAlignment( align ) {
		onChange( [ value, 'none' ].includes( align ) ? undefined : align );
	}

	const activeAlignmentControl = BLOCK_ALIGNMENTS_CONTROLS[ value ];
	const defaultAlignmentControl =
		BLOCK_ALIGNMENTS_CONTROLS[ DEFAULT_CONTROL ];

	const toolbarUIComponent = isToolbar ? ToolbarGroup : ToolbarDropdownMenu;
	const UIComponent = isBottomSheetControl
		? BottomSheetSelectControl
		: toolbarUIComponent;

	const commonProps = {
		popoverProps: POPOVER_PROPS,
		label: __( 'Align' ),
		toggleProps: { describedBy: __( 'Change alignment' ) },
	};
	const extraProps = isBottomSheetControl
		? {
				options: enabledControls.map( ( { name: controlName } ) => {
					const control = BLOCK_ALIGNMENTS_CONTROLS[ controlName ];
					return {
						value: controlName,
						label: control.title,
						icon: control.icon,
					};
				} ),
				value: activeAlignmentControl ? value : 'none',
				onChange: ( align ) => onChangeAlignment( align ),
		  }
		: {
				icon: activeAlignmentControl
					? activeAlignmentControl.icon
					: defaultAlignmentControl.icon,
				isCollapsed: isToolbar ? isCollapsed : undefined,
				controls: enabledControls.map( ( { name: controlName } ) => {
					return {
						...BLOCK_ALIGNMENTS_CONTROLS[ controlName ],
						isActive:
							value === controlName ||
							( ! value && controlName === 'none' ),
						onClick: () => onChangeAlignment( controlName ),
					};
				} ),
		  };

	return <UIComponent { ...commonProps } { ...extraProps } />;
}

export default BlockAlignmentUI;