import {
  keyframes,
  style,
} from '@vanilla-extract/css';
import { theme } from './theme';

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

export const fileInput = style({
  blockSize: '1px',
  clipPath: 'inset(50%)',
  inlineSize: '1px',
  overflow: 'hidden',
  position: 'absolute',
  whiteSpace: 'nowrap',
});

export const overlay = style({
  alignItems: 'center',
  background: theme.colors.background.elevated,
  color: theme.colors.background.text,
  display: 'grid',
  inset: 0,
  justifyItems: 'center',
  padding: theme.grid.xl,
  position: 'fixed',
  textAlign: 'center',
  zIndex: 1,
});

export const overlayContent = style({
  background: theme.colors.info.muted,
  borderInlineStart: `2px solid ${theme.colors.info.base}`,
  borderInlineEnd: `2px solid ${theme.colors.info.base}`,
  borderBlockStart: `2px solid ${theme.colors.info.base}`,
  borderBlockEnd: `2px solid ${theme.colors.info.base}`,
  borderRadius: theme.grid.s,
  display: 'grid',
  gap: theme.grid.m,
  maxInlineSize: '32rem',
  padding: theme.grid.xl,
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
  padding: 0,
  selectors: {
    '&::backdrop': {
      background: theme.colors.background.elevated,
      opacity: 0.8,
    },
  },
});

export const dialogContent = style({
  display: 'grid',
  gap: theme.grid.m,
  padding: theme.grid.l,
});

export const dialogActions = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.grid.s,
});

export const secondaryAction = style([action, {
  background: theme.colors.background.elevated,
  borderInlineStart: `1px solid ${theme.colors.primary.muted}`,
  borderInlineEnd: `1px solid ${theme.colors.primary.muted}`,
  borderBlockStart: `1px solid ${theme.colors.primary.muted}`,
  borderBlockEnd: `1px solid ${theme.colors.primary.muted}`,
  color: theme.colors.background.text,
}]);

export const error = style({
  background: theme.colors.error.muted,
  borderInlineStart: `2px solid ${theme.colors.error.base}`,
  borderInlineEnd: `2px solid ${theme.colors.error.base}`,
  borderBlockStart: `2px solid ${theme.colors.error.base}`,
  borderBlockEnd: `2px solid ${theme.colors.error.base}`,
  borderRadius: theme.grid.s,
  display: 'grid',
  gap: theme.grid.s,
  padding: theme.grid.m,
});

export const issueList = style({
  margin: 0,
  paddingInlineStart: theme.grid.l,
});

const notificationPopIn = keyframes({
  from: {
    opacity: 0,
    transform: 'translateY(-100%) scale(0.96)',
  },
  to: {
    opacity: 1,
    transform: 'translateY(0) scale(1)',
  },
});

export const notification = style({
  background: theme.colors.info.muted,
  borderInlineStart: `${theme.grid.xs} solid ${theme.colors.info.base}`,
  borderInlineEnd: `${theme.grid.xs} solid ${theme.colors.info.base}`,
  borderBlockStart: `${theme.grid.xs} solid ${theme.colors.info.base}`,
  borderBlockEnd: `${theme.grid.xs} solid ${theme.colors.info.base}`,
  borderRadius: theme.grid.s,
  color: theme.colors.background.text,
  inlineSize: 'fit-content',
  inset: 'auto',
  insetBlockStart: theme.grid.m,
  insetInlineEnd: theme.grid.m,
  margin: 0,
  maxInlineSize: `min(calc(100vw - ${theme.grid.xl}), 32rem)`,
  overflowWrap: 'anywhere',
  padding: theme.grid.m,
  pointerEvents: 'none',
  selectors: {
    '&:popover-open': {
      animation: `${notificationPopIn} 200ms ease-out`,
    },
  },
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      selectors: {
        '&:popover-open': {
          animation: 'none',
        },
      },
    },
  },
});
