/**
 * Interaction State Tokens
 * Defines visual changes for interactive states (focus, pressed, disabled)
 */

import { colors } from './colors';

export const states = {
  // Focus State - keyboard navigation, accessibility
  focus: {
    // Border/outline for focused elements
    border: colors.accent,
    borderWidth: 2,
    // Optional background tint for focused elements
    bgTint: 'rgba(212, 169, 68, 0.1)', // 10% accent color
    // Shadow for focus ring
    shadow: {
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 2,
    },
  },

  // Pressed/Active State - button press, touch feedback
  pressed: {
    // Opacity for press feedback
    opacity: 0.7,
    // Scale for subtle press animation
    scale: 0.98,
    // Background tint for pressed state
    bgTint: 'rgba(0, 0, 0, 0.1)', // 10% darker
  },

  // Disabled State - inactive elements
  disabled: {
    // Reduced opacity for disabled elements
    opacity: 0.4,
    // Background color for disabled elements
    bg: colors.surface,
    // Text color for disabled elements
    text: colors.text.tertiary,
    // Border color for disabled elements
    border: colors.border.light,
  },

  // Hover State (for web/desktop)
  hover: {
    // Background tint for hover
    bgTint: 'rgba(0, 0, 0, 0.05)', // 5% darker
    // Scale for subtle hover animation
    scale: 1.02,
    // Opacity for hover feedback
    opacity: 0.9,
  },

  // Loading State
  loading: {
    // Opacity for loading state
    opacity: 0.6,
    // Background overlay
    overlay: colors.overlayLight,
  },
} as const;

export type StateKey = keyof typeof states;

/**
 * Helper function to apply state styles to a base style
 * Usage: applyState(baseStyle, 'pressed')
 */
export const applyState = (baseStyle: any, state: StateKey): any => {
  switch (state) {
    case 'pressed':
      return {
        ...baseStyle,
        opacity: states.pressed.opacity,
        transform: [{ scale: states.pressed.scale }],
      };

    case 'disabled':
      return {
        ...baseStyle,
        opacity: states.disabled.opacity,
        backgroundColor: states.disabled.bg,
        borderColor: states.disabled.border,
      };

    case 'focus':
      return {
        ...baseStyle,
        borderColor: states.focus.border,
        borderWidth: states.focus.borderWidth,
        ...states.focus.shadow,
      };

    case 'hover':
      return {
        ...baseStyle,
        opacity: states.hover.opacity,
        transform: [{ scale: states.hover.scale }],
      };

    case 'loading':
      return {
        ...baseStyle,
        opacity: states.loading.opacity,
      };

    default:
      return baseStyle;
  }
};
