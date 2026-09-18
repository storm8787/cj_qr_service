import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

/**
 * 빌드 채널
 * - development : `npm run dev`
 * - preview     : GitHub Pages 개발·검토용 (`npm run build:preview`)
 * - official    : 충주시 공식 서버 배포용 (`npm run build:official`)
 */
export type BuildChannel = 'development' | 'preview' | 'official';

function resolveChannel(mode: string): BuildChannel {
  if (mode === 'official') return 'official';
  if (mode === 'preview') return 'preview';
  return 'development';
}

const VIRTUAL_CONTENT_ID = 'virtual:minwon-content';
const RESOLVED_CONTENT_ID = '\0' + VIRTUAL_CONTENT_ID;

const contentSourcePath = fileURLToPath(new URL('./src/data/minwon-items.json', import.meta.url));

/**
 * 민원 콘텐츠를 빌드 시점에 걸러서 주입한다.
 * 공식 배포본에는 `approved` 콘텐츠만 번들에 포함한다(미승인 콘텐츠는 파일 자체에 남지 않는다).
 */
function contentPlugin(channel: BuildChannel): Plugin {
  return {
    name: 'chungju-minwon-content',
    resolveId(id) {
      return id === VIRTUAL_CONTENT_ID ? RESOLVED_CONTENT_ID : null;
    },
    load(id) {
      if (id !== RESOLVED_CONTENT_ID) return null;
      const raw = JSON.parse(readFileSync(contentSourcePath, 'utf8')) as {
        dataset: unknown;
        items: Array<{ reviewStatus: string }>;
      };
      const items = channel === 'official'
        ? raw.items.filter((item) => item.reviewStatus === 'approved')
        : raw.items;
      return `export const dataset = ${JSON.stringify(raw.dataset)};\n` +
        `export const items = ${JSON.stringify(items)};\n`;
    },
    configureServer(server) {
      server.watcher.add(contentSourcePath);
      server.watcher.on('change', (file) => {
        if (file !== contentSourcePath) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED_CONTENT_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      });
    },
  };
}

/**
 * CSP는 빌드 산출물에만 넣는다.
 * (개발 서버는 Vite가 HMR용 인라인 스크립트를 주입하므로 동일 정책을 적용할 수 없다.)
 *
 * `frame-ancestors` 는 <meta> 로 전달하면 브라우저가 무시하므로 넣지 않는다.
 * 클릭재킹 차단이 필요하면 충주시 서버에서 응답 헤더로 내려야 한다.
 * (docs/vendor-handoff-guide.md 참고)
 */
const BUILD_CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "form-action 'none'",
  "base-uri 'none'",
].join('; ');

/** 개발·검토용 빌드에만 검색엔진 수집 차단 메타와 제목 표시를 넣는다. */
function htmlChannelPlugin(channel: BuildChannel): Plugin {
  return {
    name: 'chungju-minwon-html-channel',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const metas: string[] = [];
        if (channel !== 'development') {
          metas.push(`<meta http-equiv="Content-Security-Policy" content="${BUILD_CSP}" />`);
        }
        if (channel !== 'official') {
          metas.push('<meta name="robots" content="noindex, nofollow, noarchive" />');
        }
        let out = html.replace('<!--@channel-meta-->', metas.join('\n    '));
        if (channel !== 'official') {
          const label = channel === 'preview' ? '개발·검토용' : '개발 서버';
          out = out.replace(/<title>(.*?)<\/title>/, `<title>[${label}] $1</title>`);
        }
        return out;
      },
    },
  };
}

/**
 * 개발·검토용 빌드에만 넣는 수집 차단 파일.
 *
 * - `robots.txt` : public/robots.txt(공식 서버용)를 전체 수집 차단본으로 덮어쓴다.
 * - `_headers`   : Netlify 가 **배포 폴더 안에서** 읽는 헤더 파일.
 *   저장소 루트의 `netlify.toml` 은 Git 연동 배포에만 적용되므로,
 *   `dist-preview` 폴더를 드래그앤드롭으로 올리는 경우를 위해 폴더 안에도 넣어 둔다.
 *   (다른 호스팅이나 충주시 공식 서버에서는 그냥 무시되는 평범한 텍스트 파일이다.)
 *
 * 공식 빌드에는 둘 다 넣지 않는다.
 */
function previewNoindexPlugin(channel: BuildChannel): Plugin {
  return {
    name: 'chungju-minwon-preview-noindex',
    apply: 'build',
    generateBundle() {
      if (channel === 'official') return;
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source:
          '# 개발·검토용 미리보기입니다. 검색엔진 수집을 차단합니다.\n' +
          'User-agent: *\nDisallow: /\n',
      });
      this.emitFile({
        type: 'asset',
        fileName: '_headers',
        source:
          '# 개발·검토용 미리보기 전용 헤더 (Netlify 드래그앤드롭 배포용)\n' +
          '/*\n' +
          '  X-Robots-Tag: noindex, nofollow, noarchive\n' +
          '  X-Content-Type-Options: nosniff\n' +
          '  Referrer-Policy: strict-origin-when-cross-origin\n' +
          "  Content-Security-Policy: frame-ancestors 'none'\n",
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const channel = resolveChannel(mode);
  const isOfficial = channel === 'official';

  return {
    // 어떤 하위 경로(/minwon/guide/ 등)에 올려도 작동하도록 상대경로로 고정한다.
    base: './',
    define: {
      __BUILD_CHANNEL__: JSON.stringify(channel),
    },
    plugins: [contentPlugin(channel), htmlChannelPlugin(channel), previewNoindexPlugin(channel)],
    build: {
      outDir: isOfficial ? 'dist' : 'dist-preview',
      emptyOutDir: true,
      // 공식 배포본에는 소스맵을 포함하지 않는다.
      sourcemap: !isOfficial,
      target: 'es2020',
      assetsDir: 'assets',
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
    server: {
      host: '127.0.0.1',
      port: 5173,
    },
  };
});
