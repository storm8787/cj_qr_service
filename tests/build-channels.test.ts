import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { projectRoot } from './helpers/content.ts';

/**
 * 개발·검토용 빌드와 공식 배포용 빌드의 차이를 고정한다.
 * 외부 미리보기(GitHub Pages / Vercel / Netlify)에 올라가는 산출물에는
 * 반드시 개발·검토용 표시와 수집 차단이 들어 있어야 하고,
 * 공식 배포본에는 그 어느 것도 들어 있으면 안 된다.
 */

const previewDir = resolve(projectRoot, 'dist-preview');
const officialDir = resolve(projectRoot, 'dist');

function run(script: string): void {
  execFileSync('npm', ['run', script], { cwd: projectRoot, stdio: 'pipe' });
}

function read(dir: string, file: string): string {
  return readFileSync(resolve(dir, file), 'utf8');
}

describe('빌드 채널 분리', () => {
  beforeAll(() => {
    run('build:preview');
    run('build:official');
  }, 240_000);

  describe('개발·검토용 빌드 (dist-preview)', () => {
    it('화면에 개발·검토용 배너 문구가 들어 있다', () => {
      const bundle = read(previewDir, 'index.html') + listBundleText(previewDir);
      expect(bundle).toContain('개발·검토용 비공식 페이지');
    });

    it('noindex 메타와 제목 표시가 있다', () => {
      const html = read(previewDir, 'index.html');
      expect(html).toContain('noindex, nofollow, noarchive');
      expect(html).toMatch(/<title>\[개발·검토용\]/);
    });

    it('robots.txt 가 전체 수집을 차단한다', () => {
      expect(read(previewDir, 'robots.txt')).toMatch(/Disallow:\s*\/\s*$/m);
    });

    it('Netlify 드래그앤드롭 배포용 _headers 가 들어 있다', () => {
      const headers = read(previewDir, '_headers');
      expect(headers).toContain('X-Robots-Tag: noindex, nofollow, noarchive');
      expect(headers).toContain('/*');
    });
  });

  describe('공식 배포용 빌드 (dist)', () => {
    it('개발·검토용 배너 문구가 없다', () => {
      const bundle = read(officialDir, 'index.html') + listBundleText(officialDir);
      expect(bundle).not.toContain('개발·검토용');
    });

    it('noindex 가 없고 제목에 표시가 없다', () => {
      const html = read(officialDir, 'index.html');
      expect(html).not.toContain('noindex');
      expect(html).toContain('<title>충주시 민원안내</title>');
    });

    it('robots.txt 가 수집을 허용한다', () => {
      expect(read(officialDir, 'robots.txt')).toMatch(/Allow:\s*\//);
    });

    it('미리보기 전용 파일(_headers, _redirects)이 없다', () => {
      expect(existsSync(resolve(officialDir, '_headers'))).toBe(false);
      expect(existsSync(resolve(officialDir, '_redirects'))).toBe(false);
    });

    it('소스맵이 없다', () => {
      const bundle = listBundleText(officialDir);
      expect(bundle).not.toContain('sourceMappingURL');
    });
  });

  describe('호스팅 설정 파일', () => {
    it('vercel.json 이 미리보기 빌드를 가리킨다', () => {
      const config = JSON.parse(read(projectRoot, 'vercel.json')) as {
        buildCommand: string;
        outputDirectory: string;
        headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
      };
      expect(config.buildCommand).toBe('npm run build:preview');
      expect(config.outputDirectory).toBe('dist-preview');

      const rootRule = config.headers.find((rule) => rule.source === '/(.*)');
      expect(rootRule).toBeDefined();
      const robots = rootRule!.headers.find((h) => h.key === 'X-Robots-Tag');
      expect(robots?.value).toContain('noindex');
    });

    it('netlify.toml 이 미리보기 빌드를 가리키고 수집을 차단한다', () => {
      const toml = read(projectRoot, 'netlify.toml');
      expect(toml).toContain('command = "npm run build:preview"');
      expect(toml).toContain('publish = "dist-preview"');
      expect(toml).toContain('X-Robots-Tag = "noindex, nofollow, noarchive"');
    });

    it('호스팅 설정이 플랫폼 전용 기능을 쓰지 않는다', () => {
      const toml = read(projectRoot, 'netlify.toml');
      // Netlify Functions / Edge Functions / Forms / Identity / Image CDN 미사용
      expect(toml).not.toMatch(/^\s*\[functions\]/m);
      expect(toml).not.toMatch(/^\s*\[\[edge_functions\]\]/m);
      expect(toml).not.toMatch(/^\s*\[\[plugins\]\]/m);

      const vercel = read(projectRoot, 'vercel.json');
      // Serverless / Edge / Cron / Image Optimization 미사용
      for (const key of ['functions', 'crons', 'rewrites', 'images', 'routes']) {
        expect(vercel).not.toContain(`"${key}"`);
      }
    });
  });
});

/** 해당 폴더의 JS/CSS 번들 내용을 하나로 합친다. */
function listBundleText(dir: string): string {
  const assetsDir = resolve(dir, 'assets');
  if (!existsSync(assetsDir)) return '';
  return readdirSync(assetsDir)
    .filter((name) => name.endsWith('.js') || name.endsWith('.css'))
    .map((name) => readFileSync(resolve(assetsDir, name), 'utf8'))
    .join('\n');
}
