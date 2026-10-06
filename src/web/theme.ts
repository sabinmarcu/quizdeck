import { themeDefinition } from '@sabinmarcu/theme';
import {
  breakpointGenerator,
  extendTheme,
} from '@sabinmarcu/theme-core';
import type { ThemeInputs } from '@sabinmarcu/theme-core';

export const appTheme = extendTheme(themeDefinition, {
  breakpoint: breakpointGenerator([
    ['mobile', 700],
    ['tablet', 1000],
    ['screen', 1600],
    ['large', 1900],
    ['huge', 3800],
  ]),
});

export const theme = appTheme.contract;
export const themeInputs = {
  colors: {
    primary: {
      light: 'oklch(0.40373 0.0640115 223.389)',
      dark: 'oklch(0.777342 0.0959518 201.327)',
    },
    secondary: {
      light: '#7463a8',
      dark: '#7463a8',
    },
    info: {
      light: '#147a9b',
      dark: '#147a9b',
    },
    success: {
      light: 'oklch(0.566949 0.186535 141.006)',
      dark: 'oklch(0.933016 0.151375 133.751)',
    },
    warning: {
      light: '#a35b00',
      dark: '#a35b00',
    },
    error: {
      light: 'oklch(0.515237 0.153135 41.7626)',
      dark: 'oklch(0.790554 0.120899 24.4543)',
    },
    background: {
      light: 'oklch(0.959253 0.021711 239.498)',
      dark: 'oklch(0.280681 0.0721388 251.097)',
    },
  },
  grid: 16,
} satisfies ThemeInputs<typeof appTheme>;

// Size queries cannot use variables; match the configured eight-point grid in rems.
const gridRem = themeInputs.grid / 16;
export const queryGrid = {
  m: `${gridRem}rem`,
  s: `${gridRem / 2}rem`,
  xl: `${gridRem * 2}rem`,
};
