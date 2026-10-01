import { createServer } from 'node:http';
import {
  readFile,
  realpath,
  stat,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UsageError } from 'clipanion';

const host = '127.0.0.1';
const port = 4173;

const contentTypes: Record<string, string> = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};
export function webAssetDirectory(): string {
  return fileURLToPath(new URL('../../dist/web/', import.meta.url));
}

export async function serveWeb(stdout: NodeJS.WritableStream): Promise<number> {
  const assets = webAssetDirectory();
  let assetRoot: string;
  try {
    const index = path.resolve(assets, 'index.html');
    const indexStats = await stat(index);
    if (!indexStats.isFile()) {
      throw new Error('index.html is not a file');
    }
    assetRoot = await realpath(assets);
  } catch {
    throw new UsageError(`Built web assets are missing at ${assets}. Run yarn build first.`);
  }

  const server = createServer(async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      response.end();
      return;
    }

    let pathname: string;
    try {
      pathname = decodeURIComponent(new URL(request.url ?? '/', `http://${host}:${port}`).pathname);
    } catch {
      response.writeHead(404);
      response.end();
      return;
    }
    if (pathname.includes('\\') || pathname.split('/').includes('..')) {
      response.writeHead(404);
      response.end();
      return;
    }

    const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const candidate = path.resolve(assetRoot, requested);
    const candidateRelative = path.relative(assetRoot, candidate);
    if (candidateRelative === '..' || candidateRelative.startsWith('..\\')
      || candidateRelative.startsWith('../') || path.isAbsolute(candidateRelative)) {
      response.writeHead(404);
      response.end();
      return;
    }

    let asset: string;
    try {
      const fileStats = await stat(candidate);
      if (!fileStats.isFile()) {
        throw new Error('Not a file');
      }
      asset = await realpath(candidate);
    } catch {
      response.writeHead(404);
      response.end();
      return;
    }
    const assetRelative = path.relative(assetRoot, asset);
    if (assetRelative === '..' || assetRelative.startsWith('..\\')
      || assetRelative.startsWith('../') || path.isAbsolute(assetRelative)) {
      response.writeHead(404);
      response.end();
      return;
    }

    try {
      const body = await readFile(asset);
      const extension = asset.slice(asset.lastIndexOf('.')).toLowerCase();
      response.writeHead(200, {
        'Content-Type': contentTypes[extension] ?? 'application/octet-stream',
        'Content-Length': body.byteLength,
        'X-Content-Type-Options': 'nosniff',
      });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch {
      response.writeHead(404);
      response.end();
    }
  });

  await new Promise<void>((resolveListening, rejectListening) => {
    const onError = (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        rejectListening(new UsageError(`http://${host}:${port} is already in use. Stop the existing server and try again.`));
        return;
      }
      rejectListening(error);
    };
    server.once('error', onError);
    server.listen(port, host, () => {
      server.off('error', onError);
      resolveListening();
    });
  });
  stdout.write(`Web app available at http://${host}:${port}\n`);

  return new Promise<number>((resolveExit) => {
    let closing = false;
    const close = () => {
      if (closing) {
        return;
      }
      closing = true;
      process.off('SIGINT', close);
      process.off('SIGTERM', close);
      server.close(() => resolveExit(0));
    };
    process.once('SIGINT', close);
    process.once('SIGTERM', close);
  });
}
