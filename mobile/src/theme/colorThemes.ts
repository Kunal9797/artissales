/**
 * Color Theme Options
 * Different color palettes to choose from
 */

export interface ColorTheme {
  name: string;
  description: string;
  colors: {
    primary: string;
    primaryDark: string;
    primaryLight: string;
  };
}

export const colorThemes: ColorTheme[] = [
  {
    name: 'Corporate Blue + Yellower Gold',
    description: 'Professional blue with yellower gold accents - APPROVED',
    colors: {
      primary: '#3A5A7C',       // Corporate Blue
      primaryDark: '#2C4560',   // Darker Blue
      primaryLight: '#D4A944',  // Yellower Gold (as accent/highlight)
    },
  },
];
