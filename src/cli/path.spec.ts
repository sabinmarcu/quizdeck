import {
  describe,
  expect,
  it,
} from 'vitest';
import { resolveProgressStoragePath } from './path';

describe('platform progress storage locations', () => {
  it('uses absolute XDG data storage independently of the working directory', () => {
    expect(resolveProgressStoragePath({
      platform: 'linux',
      home: '/home/study',
      env: { XDG_DATA_HOME: '/var/study-data' },
    })).toBe('/var/study-data/quizdeck/progress.sqlite');
  });

  it('falls back to the home data directory for missing or relative XDG paths', () => {
    for (const env of [{}, { XDG_DATA_HOME: 'relative-data' }]) {
      expect(resolveProgressStoragePath({
        platform: 'linux',
        home: '/home/study',
        env,
      }))
        .toBe('/home/study/.local/share/quizdeck/progress.sqlite');
    }
  });

  it('uses Windows local application data rather than roaming data', () => {
    expect(resolveProgressStoragePath({
      platform: 'win32',
      home: 'C:\\Users\\Study',
      env: {
        LOCALAPPDATA: 'D:\\LocalData',
        APPDATA: 'E:\\RoamingData',
      },
    })).toBe('D:\\LocalData\\quizdeck\\progress.sqlite');
  });

  it('uses native Windows separators in the home fallback for missing or invalid LOCALAPPDATA', () => {
    for (const env of [
      {},
      { LOCALAPPDATA: 'relative-data' },
      { LOCALAPPDATA: 'C:relative-data' },
      { LOCALAPPDATA: '\\Data' },
    ]) {
      expect(resolveProgressStoragePath({
        platform: 'win32',
        home: 'C:\\Users\\Study',
        env,
      }))
        .toBe('C:\\Users\\Study\\AppData\\Local\\quizdeck\\progress.sqlite');
    }
  });

  it('accepts a fully qualified UNC data root without depending on the current drive', () => {
    expect(resolveProgressStoragePath({
      platform: 'win32',
      home: 'C:\\Users\\Study',
      env: { LOCALAPPDATA: '\\\\server\\share\\Data' },
    })).toBe('\\\\server\\share\\Data\\quizdeck\\progress.sqlite');
  });

  it('rejects a relative fallback home instead of creating a cwd-dependent database', () => {
    expect(() => resolveProgressStoragePath({
      platform: 'linux',
      home: 'relative-home',
      env: {},
    })).toThrow();
  });
});
