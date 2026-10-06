import { globalStyle } from '@vanilla-extract/css';
import { setupTheme } from '@sabinmarcu/theme/contracts/theme';
import { theme } from '@sabinmarcu/theme/theme';
import { defaultRemSize } from '@sabinmarcu/theme/generators/grid.constants';
import { monoLisaText } from './fonts/MonoLisaText.css';

setupTheme({
  grid: defaultRemSize,
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
  breakpoint: {
    mobile: 700,
    tablet: 1000,
    screen: 1600,
    large: 1900,
    huge: 3800,
  },
});

globalStyle(':root', {
  fontFamily: `${monoLisaText}, sans-serif`,
  colorScheme: 'light dark',
  background: theme.colors.background.page,
  color: theme.colors.background.text,
});

globalStyle('*, *::before, *::after', {
  boxSizing: 'border-box',
});

globalStyle('body', {
  margin: 0,
  minBlockSize: '100vh',
  background: theme.colors.background.page,
});

globalStyle('button, input, select, textarea', {
  font: 'inherit',
});
