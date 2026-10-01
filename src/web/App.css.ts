import { style } from '@vanilla-extract/css';
import { theme } from '@sabinmarcu/theme/theme';

export const shell = style({
  display: 'grid',
  gap: theme.grid.l,
  inlineSize: 'min(100%, 72rem)',
  marginInline: 'auto',
  padding: theme.grid.xl,
});

export const header = style({
  display: 'grid',
  gap: theme.grid.s,
});

export const title = style({
  margin: 0,
});

export const subtitle = style({
  color: theme.colors.background.text,
  margin: 0,
  maxInlineSize: '65ch',
});

export const tabList = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.grid.xs,
});

export const extrasMenu = style([tabList, {
  marginBlockStart: theme.grid.s,
  paddingInlineStart: theme.grid.m,
  borderInlineStart: `${theme.grid.xs} solid ${theme.colors.primary.muted}`,
}]);

export const tab = style({
  background: theme.colors.background.surface,
  borderInlineStart: `1px solid ${theme.colors.primary.muted}`,
  borderInlineEnd: `1px solid ${theme.colors.primary.muted}`,
  borderBlockStart: `1px solid ${theme.colors.primary.muted}`,
  borderBlockEnd: `1px solid ${theme.colors.primary.muted}`,
  borderRadius: theme.grid.xs,
  color: theme.colors.background.text,
  minBlockSize: theme.grid.xl,
  paddingBlock: theme.grid.xs,
  paddingInline: theme.grid.m,
  selectors: {
    '&[aria-pressed="true"]': {
      background: theme.colors.primary.base,
      color: theme.colors.primary.contrast,
    },
    '&:focus-visible': {
      outline: `${theme.grid.xs} solid ${theme.colors.info.base}`,
      outlineOffset: theme.grid.xs,
    },
  },
});

export const panel = style({
  background: theme.colors.background.surface,
  borderInlineStart: `1px solid ${theme.colors.primary.muted}`,
  borderInlineEnd: `1px solid ${theme.colors.primary.muted}`,
  borderBlockStart: `1px solid ${theme.colors.primary.muted}`,
  borderBlockEnd: `1px solid ${theme.colors.primary.muted}`,
  borderRadius: theme.grid.s,
  display: 'grid',
  gap: theme.grid.m,
  padding: theme.grid.l,
});

export const details = style({
  display: 'grid',
  gap: theme.grid.s,
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 14rem), 1fr))',
  margin: 0,
});

export const detail = style({
  background: theme.colors.background.elevated,
  borderRadius: theme.grid.xs,
  display: 'grid',
  gap: theme.grid.xs,
  minInlineSize: 0,
  padding: theme.grid.m,
});

export const term = style({
  color: theme.colors.primary.emphasis,
  fontWeight: 700,
});

export const definition = style({
  margin: 0,
  overflowWrap: 'anywhere',
});

export const notice = style({
  background: theme.colors.warning.muted,
  borderInlineStart: `2px solid ${theme.colors.warning.base}`,
  borderInlineEnd: `2px solid ${theme.colors.warning.base}`,
  borderBlockStart: `2px solid ${theme.colors.warning.base}`,
  borderBlockEnd: `2px solid ${theme.colors.warning.base}`,
  borderRadius: theme.grid.s,
  color: theme.colors.background.text,
  display: 'grid',
  gap: theme.grid.m,
  padding: theme.grid.l,
});

export const error = style({
  background: theme.colors.error.muted,
  borderInlineStart: `2px solid ${theme.colors.error.base}`,
  borderInlineEnd: `2px solid ${theme.colors.error.base}`,
  borderBlockStart: `2px solid ${theme.colors.error.base}`,
  borderBlockEnd: `2px solid ${theme.colors.error.base}`,
  borderRadius: theme.grid.s,
  display: 'grid',
  gap: theme.grid.m,
  padding: theme.grid.l,
});

export const status = style({
  background: theme.colors.info.muted,
  borderInlineStart: `${theme.grid.xs} solid ${theme.colors.info.base}`,
  padding: theme.grid.m,
});

export const action = style({
  background: theme.colors.primary.base,
  borderInlineStart: 0,
  borderInlineEnd: 0,
  borderBlockStart: 0,
  borderBlockEnd: 0,
  borderRadius: theme.grid.xs,
  color: theme.colors.primary.contrast,
  inlineSize: 'fit-content',
  minBlockSize: theme.grid.xl,
  paddingBlock: theme.grid.xs,
  paddingInline: theme.grid.m,
  selectors: {
    '&:focus-visible': {
      outline: `${theme.grid.xs} solid ${theme.colors.info.base}`,
      outlineOffset: theme.grid.xs,
    },
  },
});

export const list = style({
  display: 'grid',
  gap: theme.grid.s,
  margin: 0,
  paddingInlineStart: theme.grid.l,
});

export const hash = style({
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  overflowWrap: 'anywhere',
});
