import { createThemeSetup } from '@sabinmarcu/theme-core';
import { appTheme } from './theme';

export function createAppThemeSetup() {
  return createThemeSetup(appTheme, { id: 'quizdeck-theme' });
}
