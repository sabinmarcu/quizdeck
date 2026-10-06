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
  grid: 16,
  colors: {
    background: {
      light: '#f4f7fb',
      dark: '#18202c',
    },
    primary: {
      light: '#304f91',
      dark: '#8faeea',
    },
    secondary: '#7463a8',
    info: '#147a9b',
    success: {
      light: '#155132',
      dark: '#b5ffd0',
    },
    warning: '#a35b00',
    error: {
      light: '#7f1d1d',
      dark: '#ffb4b4',
    },
  },
} satisfies ThemeInputs<typeof appTheme>;

// Size queries cannot use variables; match the configured eight-point grid in rems.
const gridRem = themeInputs.grid / 16;
export const queryGrid = {
  m: `${gridRem}rem`,
  s: `${gridRem / 2}rem`,
  xl: `${gridRem * 2}rem`,
};
