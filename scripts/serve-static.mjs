#!/usr/bin/env node
/**
 * 정적 파일 서버 (테스트·점검용).
 *
 *   node scripts/serve-static.mjs <폴더> <포트> [마운트경로]
 *   예) node scripts/serve-static.mjs dist 4173 /minwon/guide
 *
 * 공식 배포본이 하위 경로에서도 동작하는지 확인하기 위해 마운트 경로를 지정할 수 있다.
 * 운영 서버가 아니라 검증용이다.
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.argv[2] ?? 'dist');
const port = Number(process.argv[3] ?? 4173);
const mount = (process.argv[4] ?? '').replace(/\/+$/, '');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  let pathname = decodeURIComponent(url.pathname);

  if (mount) {
    if (pathname === mount) {
      res.writeHead(301, { Location: `${mount}/` });
      res.end();
      return;
    }
    if (!pathname.startsWith(`${mount}/`)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found (마운트 경로 밖)');
      return;
    }
    pathname = pathname.slice(mount.length);
  }

  // 경로 탈출 방지
  const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  let filePath = join(root, safePath);
  if (!filePath.startsWith(root)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, 'index.html');
  }
  if (!existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  res.writeHead(200, {
    'Content-Type': MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  createReadStream(filePath).pipe(res);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`정적 서버 실행: http://127.0.0.1:${port}${mount}/ (root=${root})`);
});
