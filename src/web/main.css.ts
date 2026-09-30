import { gridContract } from '@sabinmarcu/theme/contracts/grid';
import { defaultRemSize } from '@sabinmarcu/theme/generators/grid.constants';
import { theme } from '@sabinmarcu/theme/theme';
import {
  globalStyle,
  style,
} from '@vanilla-extract/css';

gridContract[1](defaultRemSize);

globalStyle(':root', {
  fontFamily: 'system-ui, sans-serif',
  colorScheme: 'light dark',
});

globalStyle('body', {
  margin: 0,
});

export const main = style({
  maxInlineSize: '48rem',
  marginInline: 'auto',
  padding: theme.grid.xl,
});
