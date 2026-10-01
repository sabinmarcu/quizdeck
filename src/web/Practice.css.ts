import { style } from '@vanilla-extract/css';
import { theme } from '@sabinmarcu/theme/theme';

const focusOutline = {
  outline: `${theme.grid.xs} solid ${theme.colors.info.base}`,
  outlineOffset: theme.grid.xs,
};

const borderedSurface = {
  background: theme.colors.background.surface,
  borderBlockEnd: `1px solid ${theme.colors.primary.muted}`,
  borderBlockStart: `1px solid ${theme.colors.primary.muted}`,
  borderInlineEnd: `1px solid ${theme.colors.primary.muted}`,
  borderInlineStart: `1px solid ${theme.colors.primary.muted}`,
  borderRadius: theme.grid.s,
  color: theme.colors.background.text,
};

export const root = style({
  ...borderedSurface,
  display: 'grid',
  gap: theme.grid.l,
  gridTemplateColumns: 'minmax(0, 1fr)',
  overflowWrap: 'anywhere',
  minInlineSize: 0,
  padding: theme.grid.l,
});

export const header = style({
  display: 'grid',
  gap: theme.grid.s,
});

export const heading = style({
  margin: 0,
  overflowWrap: 'anywhere',
});

export const metadata = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.grid.m,
  margin: 0,
});

export const controls = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.grid.s,
});

export const button = style({
  background: theme.colors.primary.base,
  borderInlineStart: 0,
  borderInlineEnd: 0,
  borderBlockStart: 0,
  borderBlockEnd: 0,
  borderRadius: theme.grid.xs,
  color: theme.colors.primary.contrast,
  minBlockSize: theme.grid.xl,
  paddingBlock: theme.grid.xs,
  paddingInline: theme.grid.m,
  selectors: {
    '&:disabled': {
      cursor: 'not-allowed',
      opacity: 0.65,
    },
    '&:focus-visible': focusOutline,
  },
});

export const secondaryButton = style({
  background: theme.colors.background.elevated,
  borderBlockEnd: `1px solid ${theme.colors.primary.muted}`,
  borderBlockStart: `1px solid ${theme.colors.primary.muted}`,
  borderInlineEnd: `1px solid ${theme.colors.primary.muted}`,
  borderInlineStart: `1px solid ${theme.colors.primary.muted}`,
  borderRadius: theme.grid.xs,
  color: theme.colors.background.text,
  minBlockSize: theme.grid.xl,
  paddingBlock: theme.grid.xs,
  paddingInline: theme.grid.m,
  selectors: {
    '&:disabled': {
      cursor: 'not-allowed',
      opacity: 0.65,
    },
    '&:focus-visible': focusOutline,
  },
});

export const history = style({
  display: 'grid',
  gap: theme.grid.s,
  listStyle: 'none',
  margin: 0,
  padding: 0,
});

export const historyRow = style({
  ...borderedSurface,
  display: 'grid',
  gap: theme.grid.s,
  padding: theme.grid.m,
});

export const question = style({
  display: 'grid',
  gap: theme.grid.l,
  minInlineSize: 0,
});

export const answers = style({
  display: 'grid',
  gap: theme.grid.s,
  listStyle: 'none',
  margin: 0,
  padding: 0,
});

export const answer = style({
  background: theme.colors.background.elevated,
  borderBlockEnd: `1px solid ${theme.colors.primary.muted}`,
  borderBlockStart: `1px solid ${theme.colors.primary.muted}`,
  borderInlineEnd: `1px solid ${theme.colors.primary.muted}`,
  borderInlineStart: `1px solid ${theme.colors.primary.muted}`,
  borderRadius: theme.grid.xs,
  color: theme.colors.background.text,
  display: 'grid',
  gap: theme.grid.xs,
  inlineSize: '100%',
  minBlockSize: theme.grid.xl,
  minInlineSize: 0,
  padding: theme.grid.m,
  textAlign: 'start',
  selectors: {
    '&[aria-pressed="true"]': {
      borderColor: theme.colors.info.base,
    },
    '&:disabled': {
      cursor: 'not-allowed',
      opacity: 1,
    },
    '&:focus-visible': focusOutline,
  },
});

export const answerLabel = style({
  fontWeight: 700,
  overflowWrap: 'anywhere',
});

export const notice = style({
  background: theme.colors.info.muted,
  borderInlineStart: `${theme.grid.xs} solid ${theme.colors.info.base}`,
  margin: 0,
  padding: theme.grid.m,
});

export const error = style({
  background: theme.colors.error.muted,
  borderInlineStart: `${theme.grid.xs} solid ${theme.colors.error.base}`,
  margin: 0,
  padding: theme.grid.m,
});

export const shortcutHelp = style({
  ...borderedSurface,
  display: 'grid',
  gap: theme.grid.s,
  padding: theme.grid.m,
});

export const reportList = style({
  display: 'grid',
  gap: theme.grid.l,
  listStyle: 'none',
  margin: 0,
  padding: 0,
});

export const reportQuestion = style({
  ...borderedSurface,
  display: 'grid',
  gap: theme.grid.m,
  minInlineSize: 0,
  padding: theme.grid.m,
  selectors: {
    '&[data-outcome="correctly_answered"]': {
      borderColor: theme.colors.success.base,
    },
    '&[data-outcome="incorrectly_answered"]': {
      borderColor: theme.colors.error.base,
    },
  },
});

export const outcome = style({
  fontWeight: 700,
  selectors: {
    '&[data-outcome="correctly_answered"]': { color: theme.colors.success.base },
    '&[data-outcome="incorrectly_answered"]': { color: theme.colors.error.base },
  },
});

export const reportChoice = style({
  background: theme.colors.background.elevated,
  borderInlineStart: `${theme.grid.xs} solid ${theme.colors.primary.muted}`,
  display: 'grid',
  gap: theme.grid.xs,
  minInlineSize: 0,
  overflowWrap: 'anywhere',
  padding: theme.grid.m,
  selectors: {
    '&[data-correct="true"]': {
      background: theme.colors.background.surface,
      borderInlineStartColor: theme.colors.success.base,
      color: theme.colors.success.base,
    },
    '&[data-correct="false"]': {
      background: theme.colors.background.surface,
      borderInlineStartColor: theme.colors.error.base,
      color: theme.colors.error.base,
    },
  },
});

export const reportText = style({
  margin: 0,
  overflowWrap: 'anywhere',
});
