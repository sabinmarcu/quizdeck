import {
  globalStyle,
  style,
} from '@vanilla-extract/css';
import { theme } from '@sabinmarcu/theme/theme';
import { gridGenerator } from '@sabinmarcu/theme/generators/grid';
import { defaultRemSize } from '@sabinmarcu/theme/generators/grid.constants';
import { shellMaxInlineSize } from './App.css';

// Size queries cannot use CSS variables; derive spacing from the theme's grid generator.
const queryGrid = gridGenerator()(defaultRemSize);
const arrowGutter = `calc(${queryGrid.xl} + ${queryGrid.m} + ${queryGrid.s})`;
const sideNavigationWidth = `calc(${shellMaxInlineSize} + 2 * ${arrowGutter})`;
const sideNavigationQuery = `quizdeck-viewport (min-width: ${sideNavigationWidth})`;
const pageRailWidth = `calc(2 * (${queryGrid.xl} + ${queryGrid.m}) + ${queryGrid.s})`;
const pageRailGutter = `calc(${pageRailWidth} + ${queryGrid.s})`;
const pageNavigationWidth = `calc(${shellMaxInlineSize} + 2 * ${pageRailGutter})`;
const pageNavigationQuery = `quizdeck-viewport (min-width: ${pageNavigationWidth})`;

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
  position: 'relative',
});

export const detailRoot = style({
  display: 'grid',
  gap: theme.grid.l,
  minInlineSize: 0,
});

export const detailLayout = style({
  alignItems: 'center',
  display: 'grid',
  gap: theme.grid.l,
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  minInlineSize: 0,
  position: 'relative',
  '@container': {
    [sideNavigationQuery]: {
      gridTemplateColumns: 'minmax(0, 1fr)',
    },
  },
});

export const secondaryActions = style({
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.grid.s,
  inlineSize: '100%',
  justifySelf: 'center',
  minInlineSize: 0,
});

globalStyle(`${secondaryActions} > button`, {
  minBlockSize: `calc(${theme.grid.xl} + ${theme.grid.m})`,
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

export const pagination = style({
  alignItems: 'end',
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  gap: theme.grid.m,
  minInlineSize: 0,
  '@container': {
    [theme.breakpoint['gt-mobile']]: {
      gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
    },
  },
});

export const itemsPerPage = style({
  display: 'grid',
  inlineSize: 'min(100%, 8rem)',
  gap: theme.grid.xs,
  minInlineSize: 0,
});

export const pageNumber = style([itemsPerPage, {
  justifySelf: 'center',
}]);

globalStyle(`${pageNumber} > input`, {
  textAlign: 'center',
});

export const pageInput = style([input, {
  inlineSize: 'min(100%, 8rem)',
  minBlockSize: `calc(${theme.grid.xl} + ${theme.grid.m})`,
  selectors: {
    '&[aria-invalid="true"]': {
      borderColor: theme.colors.error.base,
    },
  },
}]);

export const paginationError = style({
  color: theme.colors.error.base,
  margin: 0,
});

export const paginationStatus = style({
  justifySelf: 'end',
  margin: 0,
  minInlineSize: 0,
  textAlign: 'end',
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

export const pageButton = style([secondaryButton, {
  fontSize: theme.grid.xl,
  inlineSize: '100%',
  minBlockSize: `calc(${theme.grid.xl} + ${theme.grid.m})`,
  minInlineSize: 0,
  padding: theme.grid.xs,
}]);

export const pageNavigation = style({
  display: 'grid',
  gap: theme.grid.s,
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  minInlineSize: 0,
  '@container': {
    [pageNavigationQuery]: {
      gridTemplateColumns: `${pageRailWidth} minmax(0, 1fr) ${pageRailWidth}`,
      insetBlock: 0,
      insetInline: `calc(-1 * (${theme.grid.xl} + ${pageRailWidth}))`,
      pointerEvents: 'none',
      position: 'absolute',
    },
  },
});

export const pageRail = style({
  display: 'grid',
  gap: theme.grid.s,
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  minInlineSize: 0,
  '@container': {
    [pageNavigationQuery]: {
      alignSelf: 'start',
      blockSize: 'min(70dvh, 100%)',
      insetBlockStart: theme.grid.l,
      pointerEvents: 'auto',
      position: 'sticky',
    },
  },
});

export const previousPages = style({
  gridColumn: 1,
});

export const nextPages = style({
  gridColumn: 2,
  '@container': {
    [pageNavigationQuery]: {
      gridColumn: 3,
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
  background: theme.colors.background.surface,
  borderInlineStart: `1px solid ${theme.colors.primary.muted}`,
  borderInlineEnd: `1px solid ${theme.colors.primary.muted}`,
  borderBlockStart: `1px solid ${theme.colors.primary.muted}`,
  borderBlockEnd: `1px solid ${theme.colors.primary.muted}`,
  borderRadius: theme.grid.s,
  display: 'grid',
  gap: theme.grid.l,
  gridColumn: '1 / -1',
  minInlineSize: 0,
  padding: theme.grid.l,
});

export const navigationArrow = style({
  alignItems: 'center',
  background: theme.colors.background.elevated,
  borderInlineStart: `1px solid ${theme.colors.primary.muted}`,
  borderInlineEnd: `1px solid ${theme.colors.primary.muted}`,
  borderBlockStart: `1px solid ${theme.colors.primary.muted}`,
  borderBlockEnd: `1px solid ${theme.colors.primary.muted}`,
  borderRadius: theme.grid.xs,
  color: theme.colors.background.text,
  display: 'grid',
  fontSize: theme.grid.xl,
  inlineSize: '100%',
  justifyContent: 'center',
  minBlockSize: `calc(${theme.grid.xl} + ${theme.grid.m})`,
  minInlineSize: 0,
  padding: theme.grid.xs,
  selectors: {
    '&:focus-visible': focusOutline,
    '&:disabled': {
      cursor: 'not-allowed',
      opacity: 0.65,
    },
  },
  '@container': {
    [sideNavigationQuery]: {
      inlineSize: `calc(${theme.grid.xl} + ${theme.grid.m})`,
      insetBlockStart: '50%',
      position: 'absolute',
      transform: 'translateY(-50%)',
    },
  },
});

export const previousArrow = style({
  gridColumn: 1,
  gridRow: 2,
  '@container': {
    [sideNavigationQuery]: {
      gridColumn: 'auto',
      gridRow: 'auto',
      insetInlineEnd: `calc(100% + ${theme.grid.xl})`,
    },
  },
});

export const nextArrow = style({
  gridColumn: 2,
  gridRow: 2,
  '@container': {
    [sideNavigationQuery]: {
      gridColumn: 'auto',
      gridRow: 'auto',
      insetInlineStart: `calc(100% + ${theme.grid.xl})`,
    },
  },
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
