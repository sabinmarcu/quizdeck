import { homedir } from 'node:os';
import path from 'node:path';
import { z } from 'zod';

export namespace resolveProgressStoragePath {
  export interface Options {
    platform?: NodeJS.Platform;
    home?: string;
    env?: Readonly<NodeJS.ProcessEnv>;
  }
}

export function resolveProgressStoragePath(
  options: resolveProgressStoragePath.Options = {},
): string {
  const platform = options.platform ?? process.platform;
  const home = options.home ?? homedir();
  const env = options.env ?? process.env;
  const paths = platform === 'win32' ? path.win32 : path.posix;
  const isAbsoluteDataPath = (value: string) => paths.isAbsolute(value)
    && (platform !== 'win32' || path.win32.parse(value).root.length > 1);
  const configured = platform === 'win32' ? env.LOCALAPPDATA : env.XDG_DATA_HOME;
  const base = configured && isAbsoluteDataPath(configured)
    ? configured
    : paths.join(home, ...(platform === 'win32' ? ['AppData', 'Local'] : ['.local', 'share']));
  const absoluteBase = z.string().refine(isAbsoluteDataPath, 'Progress storage requires an absolute application-data path').parse(base);
  return paths.join(absoluteBase, 'claude-certification', 'progress.sqlite');
}
