/**
 * Theme Configuration & Feature Flags
 *
 * Controls theme behavior and allows testing different color strategies.
 * Modify these flags to switch between color modes globally.
 */

export const themeConfig = {
  /**
   * Use new antique gold accent (#C9A961) instead of yellow-gold (#D4A944)
   *
   * true  = Antique gold (softer, more sophisticated)
   * false = Yellow-gold (current/original)
   */
  useNewAccentColor: true,

  /**
   * Use category-specific colors for features (Hybrid approach)
   *
   * true  = Each feature gets its own color (green attendance, orange sales, etc.)
   * false = Monochrome (all features use accent color)
   */
  useCategoryColors: true,

  /**
   * Show feature color controls in Kitchen Sink/Design Lab
   * Set to false in production to hide experimental controls
   */
  showColorControls: true,
} as const;

/**
 * Runtime configuration (can be modified for testing)
 * Use this for dynamic theme switching in dev/testing mode
 */
export const runtimeConfig = {
  // Copy of themeConfig that can be modified at runtime
  useNewAccentColor: themeConfig.useNewAccentColor,
  useCategoryColors: themeConfig.useCategoryColors,
};

/**
 * Reset runtime config to defaults
 */
export const resetThemeConfig = () => {
  runtimeConfig.useNewAccentColor = themeConfig.useNewAccentColor;
  runtimeConfig.useCategoryColors = themeConfig.useCategoryColors;
};
