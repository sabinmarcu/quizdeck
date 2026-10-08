import {
  globalStyle,
  style,
} from '@vanilla-extract/css';
import { theme } from './theme';

const content = {
  minInlineSize: 0,
  overflowWrap: 'anywhere' as const,
};

export const block = style({
  ...content,
  display: 'grid',
  gap: theme.grid.s,
});

export const inline = style({
  ...content,
});

globalStyle(`${block} :is(p, h3, h4, h5, h6)`, {
  margin: 0,
  overflowWrap: 'anywhere',
});

globalStyle(`${block} :is(ul, ol)`, {
  display: 'grid',
  gap: theme.grid.xs,
  margin: 0,
  paddingInlineStart: theme.grid.l,
});

globalStyle(`${block} :is(ul, ol) :is(ul, ol)`, {
  marginBlockStart: theme.grid.xs,
});

globalStyle(`${block} blockquote`, {
  borderInlineStart: `${theme.grid.xs} solid ${theme.colors.primary.muted}`,
  margin: 0,
  paddingInlineStart: theme.grid.m,
});

globalStyle(`:is(${block},${inline}) pre`, {
  background: theme.colors.background.elevated,
  margin: 0,
  maxInlineSize: '100%',
  overflowInline: 'auto',
  padding: theme.grid.s,
});

globalStyle(`:is(${block},${inline}) :not(pre) > code`, {
  background: theme.colors.background.elevated,
  overflowWrap: 'anywhere',
  paddingInline: theme.grid.xs,
});

globalStyle(`${inline} :not(pre) > code`, {
  background: theme.colors.background.depressed,
});

globalStyle(`${block} a`, {
  color: 'inherit',
  textDecorationThickness: 'max(1px, 0.08em)',
  textUnderlineOffset: '0.16em',
});

globalStyle(`${block} a:focus-visible`, {
  outline: `${theme.grid.xs} solid currentColor`,
  outlineOffset: theme.grid.xs,
});
