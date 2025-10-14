/**
 * Typography System
 * Consistent text styles across the app
 */

export const typography = {
  // Font Families
  fontFamily: {
    regular: 'System',       // Default system font
    medium: 'System',
    semiBold: 'System',
    bold: 'System',
  },

  // Font Weights
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
  },

  // Font Sizes
  fontSize: {
    xs: 12 as number,
    sm: 14 as number,
    base: 16 as number,
    lg: 18 as number,
    xl: 20 as number,
    '2xl': 24 as number,
    '3xl': 28 as number,
    '4xl': 32 as number,
  },

  // Line Heights
  lineHeight: {
    tight: 1.2 as number,
    normal: 1.5 as number,
    relaxed: 1.75 as number,
  },

  // Predefined Text Styles
  styles: {
    // Headers
    h1: {
      fontSize: 32 as number,
      fontWeight: '700' as const,
      lineHeight: 40 as number,
    },
    h2: {
      fontSize: 28 as number,
      fontWeight: '700' as const,
      lineHeight: 36 as number,
    },
    h3: {
      fontSize: 24 as number,
      fontWeight: '600' as const,
      lineHeight: 32 as number,
    },
    h4: {
      fontSize: 20 as number,
      fontWeight: '600' as const,
      lineHeight: 28 as number,
    },

    // Body Text
    bodyLarge: {
      fontSize: 18 as number,
      fontWeight: '400' as const,
      lineHeight: 28 as number,
    },
    body: {
      fontSize: 16 as number,
      fontWeight: '400' as const,
      lineHeight: 24 as number,
    },
    bodySmall: {
      fontSize: 14 as number,
      fontWeight: '400' as const,
      lineHeight: 20 as number,
    },

    // Labels
    label: {
      fontSize: 14 as number,
      fontWeight: '500' as const,
      lineHeight: 20 as number,
    },
    labelSmall: {
      fontSize: 12 as number,
      fontWeight: '500' as const,
      lineHeight: 16 as number,
    },

    // Buttons
    button: {
      fontSize: 16 as number,
      fontWeight: '600' as const,
      lineHeight: 24 as number,
    },
    buttonSmall: {
      fontSize: 14 as number,
      fontWeight: '600' as const,
      lineHeight: 20 as number,
    },

    // Captions
    caption: {
      fontSize: 12 as number,
      fontWeight: '400' as const,
      lineHeight: 16 as number,
    },
  },
};
