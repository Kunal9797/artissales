/**
 * Design Token Type Definitions
 * Central type definitions for all theme tokens including roles and states
 */

import { colors } from './colors';
import { roles } from './roles';
import { states } from './states';
import { typography } from './typography';
import { spacing } from './spacing';
import { shadows } from './shadows';

// Base color types
export type ColorKey = keyof typeof colors;
export type ColorValue = typeof colors[ColorKey];

// Role token types
export type RoleKey = keyof typeof roles;
export type RoleVariant = 'base' | 'bg' | 'text' | 'border';
export type RoleValue = typeof roles[RoleKey];

// State token types
export type StateKey = keyof typeof states;
export type StateValue = typeof states[StateKey];

// Typography types
export type TypographyKey = keyof typeof typography;
export type TypographyValue = typeof typography[TypographyKey];

// Spacing types
export type SpacingKey = keyof typeof spacing;
export type SpacingValue = typeof spacing[SpacingKey];

// Shadow types
export type ShadowKey = keyof typeof shadows;
export type ShadowValue = typeof shadows[ShadowKey];

// Complete theme type
export interface Theme {
  colors: typeof colors;
  roles: typeof roles;
  states: typeof states;
  typography: typeof typography;
  spacing: typeof spacing;
  shadows: typeof shadows;
}

// Helper types for component props
export interface RoleProps {
  /**
   * Semantic role for the component (success, error, warn, info, neutral, primary, accent)
   */
  role?: RoleKey;
}

export interface StateProps {
  /**
   * Interaction state for the component (focus, pressed, disabled, hover, loading)
   */
  state?: StateKey;
}

// Component variant types for consistent API
export type ComponentSize = 'small' | 'medium' | 'large';
export type ComponentVariant = 'solid' | 'outline' | 'ghost' | 'text';

// Status types for badges, indicators
export type StatusType = 'success' | 'warn' | 'error' | 'info' | 'neutral';

// Re-export for convenience
export type { ColorKey as Color };
export type { RoleKey as Role };
export type { StateKey as State };
