import { globalStyle } from '@vanilla-extract/css';
import { theme } from './theme';
import { monoLisaText } from './fonts/MonoLisaText.css';

globalStyle(':root', {
  fontFamily: `${monoLisaText}, sans-serif`,
  background: theme.colors.background.page,
  color: theme.colors.background.text,
});

globalStyle('*, *::before, *::after', {
  boxSizing: 'border-box',
});

globalStyle('body', {
  containerName: 'quizdeck-viewport',
  containerType: 'inline-size',
  margin: 0,
  minBlockSize: '100vh',
  background: theme.colors.background.page,
});

globalStyle('button, input, select, textarea', {
  font: 'inherit',
});

