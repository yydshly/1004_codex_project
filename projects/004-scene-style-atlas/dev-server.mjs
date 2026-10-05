import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.mjs', 'application/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.md', 'text/markdown; charset=utf-8'],
  ['.glb', 'model/gltf-binary'],
  ['.gltf', 'model/gltf+json'],
  ['.bin', 'application/octet-stream'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.avif', 'image/avif'],
  ['.ico', 'image/x-icon'],
]);

function parseArguments(args) {
  const options = { host: '127.0.0.1', port: 8044, help: false };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--help' || argument === '-h') {
      options.help = true;
      continue;
    }
    const equals = argument.indexOf('=');
    const key = equals === -1 ? argument : argument.slice(0, equals);
    if (key !== '--host' && key !== '--port') {
      throw new Error(`Unknown argument: ${argument}`);
    }
    const value = equals === -1 ? args[++index] : argument.slice(equals + 1);
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${key}`);
    }
    if (key === '--host') {
      options.host = value;
    } else {
      if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535) {
        throw new Error('Port must be an integer between 1 and 65535.');
      }
      options.port = Number(value);
    }
  }
  return options;
}

function isWithinRoot(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
}

function sendText(request, response, status, message, additionalHeaders = {}) {
  const body = `${message}\n`;
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...additionalHeaders,
  });
  response.end(request.method === 'HEAD' ? undefined : body);
}

async function start() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log('Usage: node dev-server.mjs [--host 127.0.0.1] [--port 8044]');
    return;
  }
  const projectDirectory = path.dirname(fileURLToPath(import.meta.url));
  const staticRoot = await realpath(path.join(projectDirectory, 'demo'));

  const server = createServer(async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      sendText(request, response, 405, 'Method not allowed.', { Allow: 'GET, HEAD' });
      return;
    }

    let pathname;
    try {
      const requestUrl = new URL(request.url ?? '/', 'http://localhost');
      pathname = decodeURIComponent(requestUrl.pathname);
      if (pathname.includes('\0') || pathname.includes(':')) {
        throw new Error('Invalid path.');
      }
    } catch {
      sendText(request, response, 400, 'Invalid request path.');
      return;
    }

    const candidate = path.resolve(staticRoot, `.${pathname}`);
    if (!isWithinRoot(staticRoot, candidate)) {
      sendText(request, response, 403, 'Path outside static root.');
      return;
    }

    try {
      let resolvedPath = await realpath(candidate);
      if (!isWithinRoot(staticRoot, resolvedPath)) {
        sendText(request, response, 403, 'Path outside static root.');
        return;
      }
      let fileStat = await stat(resolvedPath);
      if (fileStat.isDirectory()) {
        resolvedPath = await realpath(path.join(resolvedPath, 'index.html'));
        if (!isWithinRoot(staticRoot, resolvedPath)) {
          sendText(request, response, 403, 'Path outside static root.');
          return;
        }
        fileStat = await stat(resolvedPath);
      }
      if (!fileStat.isFile()) {
        sendText(request, response, 404, 'File not found.');
        return;
      }

      response.writeHead(200, {
        'Content-Type': MIME_TYPES.get(path.extname(resolvedPath).toLowerCase()) ?? 'application/octet-stream',
        'Content-Length': fileStat.size,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      if (request.method === 'HEAD') {
        response.end();
        return;
      }
      const stream = createReadStream(resolvedPath);
      stream.on('error', () => response.destroy());
      response.on('close', () => stream.destroy());
      stream.pipe(response);
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
        sendText(request, response, 404, 'File not found.');
      } else if (error.code === 'EACCES' || error.code === 'EPERM' || error.code === 'ELOOP') {
        sendText(request, response, 403, 'File access denied.');
      } else {
        console.error('Static request failed:', error.message);
        sendText(request, response, 500, 'Unable to read file.');
      }
    }
  });

  server.on('error', (error) => {
    console.error(error.code === 'EADDRINUSE'
      ? `Port ${options.port} is already in use. Try --port with another port.`
      : `Preview server failed: ${error.message}`);
    process.exitCode = 1;
  });
  server.listen(options.port, options.host, () => {
    const displayHost = options.host.includes(':') ? `[${options.host}]` : options.host;
    console.log(`Scene style atlas: http://${displayHost}:${options.port}/`);
    console.log(`Static root: ${staticRoot}`);
  });
}

start().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
