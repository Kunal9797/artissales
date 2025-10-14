/**
 * Theme Serialization & Validation Utilities
 * For import/export and validation of theme overrides
 */

import { ThemeOverrides } from './runtime';

// Validate hex color format (#RRGGBB or #RRGGBBAA)
export function isValidHex(hex: string): boolean {
  if (!hex) return false;
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
  return hexRegex.test(hex);
}

// Convert hex to RGB
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!isValidHex(hex)) return null;

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

// Calculate relative luminance (WCAG formula)
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Calculate contrast ratio between two colors
export function getContrastRatio(color1: string, color2: string): number | null {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return null;

  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

// Validate contrast ratio meets WCAG AA standards (4.5:1 for normal text)
export function validateContrast(
  textColor: string,
  bgColor: string,
  minRatio: number = 4.5
): { valid: boolean; ratio: number | null; warning?: string } {
  const ratio = getContrastRatio(textColor, bgColor);

  if (ratio === null) {
    return {
      valid: false,
      ratio: null,
      warning: 'Invalid color format',
    };
  }

  const valid = ratio >= minRatio;

  return {
    valid,
    ratio,
    warning: valid
      ? undefined
      : `Contrast ratio ${ratio.toFixed(2)}:1 is below recommended ${minRatio}:1 (WCAG AA)`,
  };
}

// Serialize overrides to JSON
export function serializeThemeOverrides(overrides: ThemeOverrides): string {
  return JSON.stringify(overrides, null, 2);
}

// Deserialize JSON to overrides (with validation)
export function deserializeThemeOverrides(json: string): {
  overrides: ThemeOverrides | null;
  errors: string[];
} {
  const errors: string[] = [];

  try {
    const parsed = JSON.parse(json);

    // Validate structure
    if (typeof parsed !== 'object' || parsed === null) {
      errors.push('Invalid JSON: root must be an object');
      return { overrides: null, errors };
    }

    // Validate role colors if present
    if (parsed.roles) {
      for (const roleKey in parsed.roles) {
        const role = parsed.roles[roleKey];
        if (typeof role !== 'object') continue;

        for (const colorKey of ['base', 'bg', 'text', 'border']) {
          const color = role[colorKey];
          if (color && !isValidHex(color)) {
            errors.push(`Invalid hex color: roles.${roleKey}.${colorKey} = "${color}"`);
          }
        }

        // Validate text/bg contrast
        if (role.text && role.bg) {
          const contrast = validateContrast(role.text, role.bg);
          if (contrast.warning) {
            errors.push(`roles.${roleKey}: ${contrast.warning}`);
          }
        }
      }
    }

    // Validate spacing unit
    if (parsed.spacing?.unit !== undefined) {
      const unit = parsed.spacing.unit;
      if (typeof unit !== 'number' || unit <= 0 || unit > 3) {
        errors.push('spacing.unit must be a number between 0 and 3');
      }
    }

    // Validate border radius multiplier
    if (parsed.borderRadius?.multiplier !== undefined) {
      const multiplier = parsed.borderRadius.multiplier;
      if (typeof multiplier !== 'number' || multiplier <= 0 || multiplier > 3) {
        errors.push('borderRadius.multiplier must be a number between 0 and 3');
      }
    }

    // Validate typography scale multiplier
    if (parsed.typography?.scaleMultiplier !== undefined) {
      const multiplier = parsed.typography.scaleMultiplier;
      if (typeof multiplier !== 'number' || multiplier <= 0 || multiplier > 2) {
        errors.push('typography.scaleMultiplier must be a number between 0 and 2');
      }
    }

    return {
      overrides: parsed as ThemeOverrides,
      errors,
    };
  } catch (error) {
    errors.push(`JSON parse error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { overrides: null, errors };
  }
}

// Generate contrast report for all roles
export function generateContrastReport(overrides: ThemeOverrides): string[] {
  const warnings: string[] = [];

  if (!overrides.roles) return warnings;

  for (const roleKey in overrides.roles) {
    const role = (overrides.roles as any)[roleKey];
    if (!role) continue;

    if (role.text && role.bg) {
      const contrast = validateContrast(role.text, role.bg);
      if (contrast.warning) {
        warnings.push(`${roleKey}: ${contrast.warning}`);
      }
    }
  }

  return warnings;
}

// Format validation errors for display
export function formatValidationErrors(errors: string[]): string {
  if (errors.length === 0) return '';
  return '⚠️ Validation Issues:\n' + errors.map((e) => `  • ${e}`).join('\n');
}
