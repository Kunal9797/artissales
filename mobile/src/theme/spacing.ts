/**
 * Spacing System - 8px Grid
 * Consistent spacing/padding/margins throughout the app
 */

const BASE_UNIT = 8;

export const spacing = {
  // Base spacing units (8px grid)
  xs: BASE_UNIT * 0.5,      // 4px
  sm: BASE_UNIT,            // 8px
  md: BASE_UNIT * 2,        // 16px
  lg: BASE_UNIT * 3,        // 24px
  xl: BASE_UNIT * 4,        // 32px
  '2xl': BASE_UNIT * 5,     // 40px
  '3xl': BASE_UNIT * 6,     // 48px
  '4xl': BASE_UNIT * 8,     // 64px

  // Specific use cases
  screenPadding: BASE_UNIT * 3,      // 24px - Standard screen padding
  cardPadding: BASE_UNIT * 2.5,      // 20px - Card internal padding
  sectionGap: BASE_UNIT * 2,         // 16px - Gap between sections
  itemGap: BASE_UNIT * 1.5,          // 12px - Gap between items in a list

  // Border Radius
  borderRadius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,   // Fully rounded (pills)
  },
} as const;

// Helper function to multiply base unit
export const spacingMultiplier = (multiplier: number): number => {
  return BASE_UNIT * multiplier;
};
