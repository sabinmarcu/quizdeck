import { style } from '@vanilla-extract/css';
import { theme } from '@sabinmarcu/theme/theme';

const focusOutline = {
  outline: `${theme.grid.xs} solid ${theme.colors.info.base}`,
  outlineOffset: theme.grid.xs,
};

const statusColors = {
  '&[data-outcome="correctly_answered"]': { color: theme.colors.success.base },
  '&[data-outcome="incorrectly_answered"]': { color: theme.colors.error.base },
};

export const root = style({
  background: theme.colors.background.surface,
  borderInlineStart: `1px solid ${theme.colors.primary.muted}`,
  borderInlineEnd: `1px solid ${theme.colors.primary.muted}`,
  borderBlockStart: `1px solid ${theme.colors.primary.muted}`,
  borderBlockEnd: `1px solid ${theme.colors.primary.muted}`,
  borderRadius: theme.grid.s,
  display: 'grid',
  gap: theme.grid.l,
  minInlineSize: 0,
  padding: theme.grid.l,
});

export const controls = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.grid.m,
  minInlineSize: 0,
});

export const search = style({
  display: 'grid',
  flex: '1 1 18rem',
  gap: theme.grid.xs,
  minInlineSize: 0,
});

export const input = style({
  background: theme.colors.background.elevated,
  borderInlineStart: `1px solid ${theme.colors.primary.muted}`,
  borderInlineEnd: `1px solid ${theme.colors.primary.muted}`,
  borderBlockStart: `1px solid ${theme.colors.primary.muted}`,
  borderBlockEnd: `1px solid ${theme.colors.primary.muted}`,
  borderRadius: theme.grid.xs,
  color: theme.colors.background.text,
  inlineSize: '100%',
  minBlockSize: theme.grid.xl,
  minInlineSize: 0,
  paddingBlock: theme.grid.xs,
  paddingInline: theme.grid.s,
  selectors: {
    '&:focus-visible': focusOutline,
  },
});

export const filter = style({
  display: 'grid',
  flex: '1 1 14rem',
  gap: theme.grid.xs,
  minInlineSize: 0,
});

export const select = style({
  background: theme.colors.background.elevated,
  borderInlineStart: `1px solid ${theme.colors.primary.muted}`,
  borderInlineEnd: `1px solid ${theme.colors.primary.muted}`,
  borderBlockStart: `1px solid ${theme.colors.primary.muted}`,
  borderBlockEnd: `1px solid ${theme.colors.primary.muted}`,
  borderRadius: theme.grid.xs,
  color: theme.colors.background.text,
  minBlockSize: theme.grid.xl,
  minInlineSize: 0,
  paddingBlock: theme.grid.xs,
  paddingInline: theme.grid.s,
  selectors: {
    '&:focus-visible': focusOutline,
  },
});

export const buttonRow = style({
  alignItems: 'end',
  display: 'flex',
  flex: '1 1 auto',
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
    '&:focus-visible': focusOutline,
    '&:disabled': {
      cursor: 'not-allowed',
      opacity: 0.65,
    },
  },
});

export const secondaryButton = style({
  background: theme.colors.background.elevated,
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
    '&:focus-visible': focusOutline,
    '&:disabled': {
      cursor: 'not-allowed',
      opacity: 0.65,
    },
  },
});

export const counts = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.grid.m,
  margin: 0,
});

export const results = style({
  display: 'grid',
  gap: theme.grid.s,
  listStyle: 'none',
  margin: 0,
  padding: 0,
});

export const rowButton = style({
  background: theme.colors.background.elevated,
  borderInlineStart: `1px solid ${theme.colors.primary.muted}`,
  borderInlineEnd: `1px solid ${theme.colors.primary.muted}`,
  borderBlockStart: `1px solid ${theme.colors.primary.muted}`,
  borderBlockEnd: `1px solid ${theme.colors.primary.muted}`,
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
    ...statusColors,
    '&[data-outcome]:not([data-outcome="unanswered"])': {
      background: theme.colors.background.surface,
    },
    '&[aria-current="true"]': {
      borderColor: theme.colors.primary.base,
    },
    '&:focus-visible': focusOutline,
  },
});

export const rowMeta = style({
  color: theme.colors.primary.emphasis,
  fontWeight: 700,
  selectors: statusColors,
});

export const question = style({
  display: 'grid',
  gap: theme.grid.l,
  minInlineSize: 0,
});

export const questionHeading = style({
  margin: 0,
  overflowWrap: 'anywhere',
  selectors: statusColors,
});

export const questionText = style({
  margin: 0,
  overflowWrap: 'anywhere',
});

export const answerList = style({
  display: 'grid',
  gap: theme.grid.m,
  listStyle: 'none',
  margin: 0,
  padding: 0,
});

export const answer = style({
  background: theme.colors.background.elevated,
  borderInlineStart: `1px solid ${theme.colors.primary.muted}`,
  borderInlineEnd: `1px solid ${theme.colors.primary.muted}`,
  borderBlockStart: `1px solid ${theme.colors.primary.muted}`,
  borderBlockEnd: `1px solid ${theme.colors.primary.muted}`,
  borderRadius: theme.grid.xs,
  color: theme.colors.background.text,
  display: 'grid',
  gap: theme.grid.s,
  inlineSize: '100%',
  minBlockSize: theme.grid.xl,
  minInlineSize: 0,
  padding: theme.grid.m,
  textAlign: 'start',
  selectors: {
    '&[data-correct]': {
      background: theme.colors.background.surface,
    },
    '&[data-correct="true"]': {
      color: theme.colors.success.base,
      borderColor: theme.colors.success.base,
    },
    '&[data-correct="false"]': {
      color: theme.colors.error.base,
      borderColor: theme.colors.error.base,
    },
    '&:focus-visible': focusOutline,
    '&:disabled': {
      cursor: 'not-allowed',
      opacity: 1,
    },
  },
});

export const answerLabel = style({
  fontWeight: 700,
  overflowWrap: 'anywhere',
});

export const feedback = style({
  borderInlineStart: `${theme.grid.xs} solid currentColor`,
  display: 'grid',
  gap: theme.grid.xs,
  paddingInlineStart: theme.grid.m,
});

export const feedbackText = style({
  margin: 0,
  overflowWrap: 'anywhere',
});

export const empty = style({
  background: theme.colors.info.muted,
  borderInlineStart: `${theme.grid.xs} solid ${theme.colors.info.base}`,
  margin: 0,
  padding: theme.grid.m,
  selectors: {
    ...statusColors,
    '&[data-outcome]': {
      background: theme.colors.background.surface,
      borderInlineStartColor: 'currentColor',
    },
  },
});

export const dialog = style({
  background: theme.colors.background.surface,
  borderInlineStart: `1px solid ${theme.colors.primary.muted}`,
  borderInlineEnd: `1px solid ${theme.colors.primary.muted}`,
  borderBlockStart: `1px solid ${theme.colors.primary.muted}`,
  borderBlockEnd: `1px solid ${theme.colors.primary.muted}`,
  borderRadius: theme.grid.s,
  color: theme.colors.background.text,
  inlineSize: 'min(100% - 2rem, 36rem)',
  maxBlockSize: 'calc(100% - 2rem)',
  minInlineSize: 0,
  padding: theme.grid.l,
});

export const dialogContent = style({
  display: 'grid',
  gap: theme.grid.m,
  minInlineSize: 0,
});

export const dialogActions = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.grid.s,
});

export const shortcutHelp = style({
  display: 'grid',
  gap: theme.grid.s,
  margin: 0,
  paddingInlineStart: theme.grid.l,
});
