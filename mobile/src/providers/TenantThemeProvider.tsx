/**
 * TenantThemeProvider
 * Provides runtime theme overrides for white-label support
 *
 * Reads tenant config from /tenants/{id}.json and applies overrides to:
 * - Role colors (success/warning/error/info/primary/accent)
 * - Spacing unit
 * - Border radius scale
 * - Typography scale
 *
 * Fallback: Default brandTheme from theme/roles.ts
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { roles as brandRoles } from '../theme/roles';
import { spacing as brandSpacing } from '../theme/spacing';
import { typography as brandTypography } from '../theme/typography';

// Tenant config shape
interface TenantConfig {
  tenantId: string;
  name: string;
  description?: string;
  overrides: {
    roles?: {
      success?: typeof brandRoles.success;
      warning?: typeof brandRoles.warning;
      error?: typeof brandRoles.error;
      info?: typeof brandRoles.info;
      primary?: typeof brandRoles.primary;
      accent?: typeof brandRoles.accent;
    };
    spacingUnit?: number;
    radius?: {
      sm?: number;
      md?: number;
      lg?: number;
      xl?: number;
      full?: number;
    };
    typeScale?: {
      xs?: number;
      sm?: number;
      base?: number;
      lg?: number;
      xl?: number;
      '2xl'?: number;
      '3xl'?: number;
    };
  };
}

// Merged theme (brand + tenant overrides)
interface TenantTheme {
  roles: typeof brandRoles;
  spacing: typeof brandSpacing;
  typography: typeof brandTypography;
  tenantId: string | null;
  tenantName: string | null;
}

interface TenantThemeContextType {
  theme: TenantTheme;
  loadTenant: (tenantId: string) => Promise<void>;
  resetToDefault: () => void;
  isCustomTenant: boolean;
}

const TenantThemeContext = createContext<TenantThemeContextType | undefined>(undefined);

export function TenantThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<TenantTheme>({
    roles: brandRoles,
    spacing: brandSpacing,
    typography: brandTypography,
    tenantId: null,
    tenantName: null,
  });

  const [isCustomTenant, setIsCustomTenant] = useState(false);

  const loadTenant = async (tenantId: string) => {
    try {
      // In a real app, this would fetch from API or bundled assets
      // For dev, we'll try to load from /tenants/{tenantId}.json
      const config: TenantConfig = require(`../../tenants/${tenantId}.json`);

      // Merge overrides with brand defaults
      const mergedRoles = {
        ...brandRoles,
        ...config.overrides.roles,
      };

      const mergedSpacing = config.overrides.spacingUnit
        ? {
            ...brandSpacing,
            unit: config.overrides.spacingUnit,
            xs: config.overrides.spacingUnit * 0.5,
            sm: config.overrides.spacingUnit * 1,
            md: config.overrides.spacingUnit * 1.5,
            lg: config.overrides.spacingUnit * 2,
            xl: config.overrides.spacingUnit * 3,
            '2xl': config.overrides.spacingUnit * 4,
            '3xl': config.overrides.spacingUnit * 6,
            screenPadding: config.overrides.spacingUnit * 2,
          }
        : brandSpacing;

      const mergedTypography = config.overrides.typeScale
        ? {
            ...brandTypography,
            fontSize: {
              ...brandTypography.fontSize,
              ...config.overrides.typeScale,
            },
          }
        : brandTypography;

      setTheme({
        roles: mergedRoles,
        spacing: mergedSpacing,
        typography: mergedTypography,
        tenantId: config.tenantId,
        tenantName: config.name,
      });

      setIsCustomTenant(true);
    } catch (error) {
      console.error(`Failed to load tenant config: ${tenantId}`, error);
      // Fallback to brand theme
      resetToDefault();
    }
  };

  const resetToDefault = () => {
    setTheme({
      roles: brandRoles,
      spacing: brandSpacing,
      typography: brandTypography,
      tenantId: null,
      tenantName: null,
    });
    setIsCustomTenant(false);
  };

  return (
    <TenantThemeContext.Provider value={{ theme, loadTenant, resetToDefault, isCustomTenant }}>
      {children}
    </TenantThemeContext.Provider>
  );
}

export function useTenantTheme() {
  const context = useContext(TenantThemeContext);
  if (!context) {
    throw new Error('useTenantTheme must be used within TenantThemeProvider');
  }
  return context;
}
