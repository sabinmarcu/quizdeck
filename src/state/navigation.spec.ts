import {
  describe,
  expect,
  it,
} from 'vitest';
import {
  navigationAction,
  nextFocus,
} from './navigation';

describe('shell input ownership', () => {
  it('does not navigate or activate while editing or composing text', () => {
    for (const key of ['j', 'k', 'Enter', '?', 'gg']) {
      expect(navigationAction({
        key,
        editing: true,
      })).toBeNull();
      expect(navigationAction({
        key,
        composing: true,
      })).toBeNull();
    }
  });

  it('does not hijack platform modifiers or turn modified characters into movement', () => {
    expect(navigationAction({
      key: 'j',
      ctrl: true,
    })).toBeNull();
    expect(navigationAction({
      key: 'j',
      meta: true,
    })).toBeNull();
    expect(navigationAction({
      key: 'j',
      alt: true,
    })).toBeNull();
  });

  it('keeps focus inside section boundaries and separate from activation or scrolling', () => {
    expect(nextFocus(0, 'previous')).toBe(0);
    expect(nextFocus(2, 'next')).toBe(2);
    expect(nextFocus(1, 'activate')).toBe(1);
    expect(nextFocus(1, 'pageDown')).toBe(1);
    expect(nextFocus(1, 'pageUp')).toBe(1);
  });
});
