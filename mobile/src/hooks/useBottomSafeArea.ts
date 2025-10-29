/**
 * useBottomSafeArea Hook
 *
 * Returns the appropriate bottom padding to account for device safe area insets.
 * Automatically adapts to different Android navigation types:
 * - Gesture navigation (0-16px)
 * - 3-button navigation (48px)
 * - Tablet navigation (56px)
 * - iOS home indicator (34px)
 *
 * @param extraSpacing - Additional spacing to add beyond the safe area (default: 12px)
 * @returns Bottom padding value in pixels
 *
 * @example
 * const bottomPadding = useBottomSafeArea(12);
 * <View style={[styles.footer, { paddingBottom: bottomPadding }]}>
 */

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const useBottomSafeArea = (extraSpacing: number = 12): number => {
  const insets = useSafeAreaInsets();

  // Return safe area bottom inset + extra spacing for visual breathing room
  // On devices with gesture nav: insets.bottom = 0, result = 12px
  // On devices with 3-button nav: insets.bottom = 48, result = 60px
  // On devices with tablet nav: insets.bottom = 56, result = 68px
  return insets.bottom + extraSpacing;
};
