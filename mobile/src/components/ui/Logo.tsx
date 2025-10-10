/**
 * Logo Component
 * Displays the Artis logo in various variants and sizes
 */

import React from 'react';
import { Image, StyleSheet, ImageStyle } from 'react-native';

type LogoVariant = 'full' | 'icon-dark' | 'icon-light' | 'trans-artis';
type LogoSize = 'small' | 'medium' | 'large';

interface LogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  style?: ImageStyle;
}

const logoAssets = {
  full: require('../../../assets/images/logo-dark-bg.png'),
  'icon-dark': require('../../../assets/images/artis-logo-transparent-dark.png'),
  'icon-light': require('../../../assets/images/artis-logo.png'),
  'trans-artis': require('../../../assets/images/trans-artis.png'),
};

const sizeMap = {
  small: { width: 32, height: 32 },
  medium: { width: 48, height: 48 },
  large: { width: 64, height: 64 },
};

export const Logo: React.FC<LogoProps> = ({
  variant = 'icon-light',
  size = 'medium',
  style,
}) => {
  // For 'full' variant, don't apply size constraints, let style prop control it
  const sizeStyle = variant === 'full' ? {} : sizeMap[size];

  return (
    <Image
      source={logoAssets[variant]}
      style={[styles.logo, sizeStyle, style]}
      resizeMode="contain"
    />
  );
};

const styles = StyleSheet.create({
  logo: {
    // Base styles if needed
  },
});
