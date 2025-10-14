/**
 * Spacing System - 8px Grid
 * Consistent spacing/padding/margins throughout the app
 */

const BASE_UNIT = 8;

export const spacing = {
  // Base spacing units (8px grid)
  xs: BASE_UNIT * 0.5 as number,      // 4px
  sm: BASE_UNIT as number,            // 8px
  md: BASE_UNIT * 2 as number,        // 16px
  lg: BASE_UNIT * 3 as number,        // 24px
  xl: BASE_UNIT * 4 as number,        // 32px
  '2xl': BASE_UNIT * 5 as number,     // 40px
  '3xl': BASE_UNIT * 6 as number,     // 48px
  '4xl': BASE_UNIT * 8 as number,     // 64px

  // Specific use cases
  screenPadding: BASE_UNIT * 3 as number,      // 24px - Standard screen padding
  cardPadding: BASE_UNIT * 2.5 as number,      // 20px - Card internal padding
  sectionGap: BASE_UNIT * 2 as number,         // 16px - Gap between sections
  itemGap: BASE_UNIT * 1.5 as number,          // 12px - Gap between items in a list

  // Border Radius
  borderRadius: {
    none: 0 as number,
    sm: 4 as number,
    md: 8 as number,
    lg: 12 as number,
    xl: 16 as number,
    full: 9999 as number,   // Fully rounded (pills)
  },
};

// Helper function to multiply base unit
export const spacingMultiplier = (multiplier: number): number => {
  return BASE_UNIT * multiplier;
};
