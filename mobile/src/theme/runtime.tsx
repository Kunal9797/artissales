/**
 * Runtime Theme System (Dev-only)
 * Allows live editing of theme tokens without restarting the app
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { colors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { shadows } from './shadows';
import { roles } from './roles';
import { states } from './states';

// Type definitions for overrides
export interface RoleOverride {
  base?: string;
  bg?: string;
  text?: string;
  border?: string;
}

export interface ThemeOverrides {
  // Role overrides
  roles?: {
    success?: RoleOverride;
    warn?: RoleOverride;
    error?: RoleOverride;
    info?: RoleOverride;
    neutral?: RoleOverride;
    primary?: RoleOverride;
    accent?: RoleOverride;
  };
  // Spacing overrides
  spacing?: {
    unit?: number; // Base spacing unit multiplier
  };
  // Border radius overrides
  borderRadius?: {
    multiplier?: number;
  };
  // Typography overrides
  typography?: {
    scaleMultiplier?: number;
  };
}

// Deep merge utility
function deepMerge<T>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
      result[key] = deepMerge(targetValue || {} as any, sourceValue as any);
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as any;
    }
  }

  return result;
}

// Context for theme overrides
interface ThemeRuntimeContextValue {
  overrides: ThemeOverrides;
  setOverrides: (overrides: ThemeOverrides) => void;
  resetOverrides: () => void;
  mergedTokens: ReturnType<typeof getMergedTokens>;
}

const ThemeRuntimeContext = createContext<ThemeRuntimeContextValue | null>(null);

// Get merged tokens with overrides applied
function getMergedTokens(overrides: ThemeOverrides) {
  const baseRoles = roles;
  const baseSpacing = spacing;
  const baseTypography = typography;

  // Apply role overrides
  const mergedRoles = overrides.roles
    ? deepMerge(baseRoles, overrides.roles as any)
    : baseRoles;

  // Apply spacing overrides
  const spacingMultiplier = overrides.spacing?.unit || 1;
  const mergedSpacing = { ...baseSpacing };
  if (spacingMultiplier !== 1) {
    for (const key in mergedSpacing) {
      if (typeof (mergedSpacing as any)[key] === 'number') {
        (mergedSpacing as any)[key] = (baseSpacing as any)[key] * spacingMultiplier;
      }
    }
  }

  // Apply typography scale overrides
  const typeScaleMultiplier = overrides.typography?.scaleMultiplier || 1;
  const mergedTypography = { ...baseTypography };
  if (typeScaleMultiplier !== 1) {
    for (const key in mergedTypography.styles) {
      const style = (mergedTypography.styles as any)[key];
      if (style.fontSize) {
        (mergedTypography.styles as any)[key] = {
          ...style,
          fontSize: style.fontSize * typeScaleMultiplier,
        };
      }
    }
  }

  // Apply border radius overrides
  const radiusMultiplier = overrides.borderRadius?.multiplier || 1;
  const mergedBorderRadius = { ...mergedSpacing.borderRadius };
  if (radiusMultiplier !== 1) {
    for (const key in mergedBorderRadius) {
      (mergedBorderRadius as any)[key] = (baseSpacing.borderRadius as any)[key] * radiusMultiplier;
    }
  }

  return {
    colors,
    roles: mergedRoles,
    states,
    typography: mergedTypography,
    spacing: {
      ...mergedSpacing,
      borderRadius: mergedBorderRadius,
    },
    shadows,
  };
}

// Provider component
export function ThemeRuntimeProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverridesState] = useState<ThemeOverrides>({});

  const setOverrides = (newOverrides: ThemeOverrides) => {
    setOverridesState(newOverrides);
  };

  const resetOverrides = () => {
    setOverridesState({});
  };

  const mergedTokens = getMergedTokens(overrides);

  const value: ThemeRuntimeContextValue = {
    overrides,
    setOverrides,
    resetOverrides,
    mergedTokens,
  };

  return (
    <ThemeRuntimeContext.Provider value={value}>
      {children}
    </ThemeRuntimeContext.Provider>
  );
}

// Hook to access theme tokens with overrides
export function useThemeTokens() {
  const context = useContext(ThemeRuntimeContext);

  if (!context) {
    // Fallback to base tokens if provider not found
    return {
      colors,
      roles,
      states,
      typography,
      spacing,
      shadows,
    };
  }

  return context.mergedTokens;
}

// Hook to access override controls (for DesignLabScreen)
export function useThemeOverrides() {
  const context = useContext(ThemeRuntimeContext);

  if (!context) {
    throw new Error('useThemeOverrides must be used within ThemeRuntimeProvider');
  }

  return {
    overrides: context.overrides,
    setOverrides: context.setOverrides,
    resetOverrides: context.resetOverrides,
    mergedTokens: context.mergedTokens,
  };
}

// Export function to set overrides (for external use)
export function setThemeOverrides(overrides: ThemeOverrides) {
  // This is handled by the context, but we export it for API consistency
  console.warn('Use useThemeOverrides() hook instead of setThemeOverrides()');
}
