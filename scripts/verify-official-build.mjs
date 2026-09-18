#!/usr/bin/env node
/**
 * 공식 배포본(dist/) 자동검증.
 *
 * 다음이 남아 있으면 실패한다.
 * - github.io / riseyoo1-alt / 여주시 등 참고 서비스·개발환경 흔적
 * - 외부 CDN 주소, 외부 폰트/스크립트 참조
 * - 미승인 콘텐츠(reviewStatus 가 approved 가 아닌 항목의 id)
 * - TODO / FIXME
 * - 비밀키 형태의 문자열
 * - 개발용 배너 문구, noindex 메타
 * - 소스맵 파일 및 sourceMappingURL 주석
 * - 절대경로(/assets/...)로 시작하는 자원 참조
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = resolve(projectRoot, process.argv[2] ?? 'dist');

const failures = [];
const notes = [];

function listFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

const TEXT_EXTENSIONS = new Set(['.html', '.js', '.css', '.json', '.txt', '.svg', '.webmanifest']);

/** 문자열 검사 규칙. */
const FORBIDDEN = [
  { name: 'GitHub Pages 주소', pattern: /github\.io/i },
  { name: '참고 저장소 계정', pattern: /riseyoo1-alt/i },
  { name: '참고 저장소 이름', pattern: /one-qr-service/i },
  { name: '여주시 표기', pattern: /여주/ },
  { name: '개발용 배너 문구', pattern: /개발·검토용/ },
  { name: 'noindex 메타', pattern: /noindex/i },
  { name: 'TODO 주석', pattern: /\bTODO\b/ },
  { name: 'FIXME 주석', pattern: /\bFIXME\b/ },
  { name: 'sourceMappingURL 주석', pattern: /sourceMappingURL/ },
  { name: 'localhost 주소', pattern: /localhost:\d+/ },
];

/** 외부 CDN·외부 자원 참조. 공식 배포본은 외부 요청이 없어야 한다. */
const EXTERNAL_HOSTS = [
  /fonts\.googleapis\.com/i,
  /fonts\.gstatic\.com/i,
  /cdn\.jsdelivr\.net/i,
  /cdnjs\.cloudflare\.com/i,
  /unpkg\.com/i,
  /ajax\.googleapis\.com/i,
];

/** 비밀키 형태의 문자열. */
const SECRET_PATTERNS = [
  { name: 'AWS 액세스 키', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'GitHub 토큰', pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/ },
  { name: 'Google API 키', pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: 'Slack 토큰', pattern: /\bxox[abprs]-[0-9A-Za-z-]{10,}\b/ },
  { name: 'PEM 개인키', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'serviceKey 파라미터', pattern: /serviceKey\s*[=:]\s*['"][^'"]{10,}/i },
  { name: 'apiKey 하드코딩', pattern: /\bapi[_-]?key\s*[:=]\s*['"][^'"]{8,}['"]/i },
];

function checkFile(file) {
  const rel = relative(distDir, file);
  const ext = extname(file).toLowerCase();

  if (ext === '.map') {
    failures.push(`소스맵 파일이 포함되어 있습니다: ${rel}`);
    return;
  }
  if (!TEXT_EXTENSIONS.has(ext)) return;

  const text = readFileSync(file, 'utf8');

  for (const rule of FORBIDDEN) {
    if (rule.pattern.test(text)) failures.push(`${rel}: ${rule.name} 문자열이 남아 있습니다.`);
  }
  for (const host of EXTERNAL_HOSTS) {
    if (host.test(text)) failures.push(`${rel}: 외부 CDN 참조가 남아 있습니다 (${host}).`);
  }
  for (const rule of SECRET_PATTERNS) {
    if (rule.pattern.test(text)) failures.push(`${rel}: ${rule.name} 형태의 문자열이 검출되었습니다.`);
  }
}

function checkIndexHtml() {
  const indexPath = join(distDir, 'index.html');
  const html = readFileSync(indexPath, 'utf8');

  // 상대경로 확인: src/href 가 `/` 로 시작하면 하위 디렉터리 배포 시 깨진다.
  const refs = [...html.matchAll(/\s(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
  for (const ref of refs) {
    if (ref.startsWith('/') && !ref.startsWith('//')) {
      failures.push(`index.html: 절대경로 참조가 있습니다 (${ref}). 상대경로로 바꿔야 합니다.`);
    }
    if (/^https?:\/\//i.test(ref)) {
      failures.push(`index.html: 외부 절대 URL 참조가 있습니다 (${ref}).`);
    }
  }

  if (!/<meta http-equiv="Content-Security-Policy"/i.test(html)) {
    failures.push('index.html: CSP 메타 태그가 없습니다.');
  }
  if (!/<a class="skip-link"/.test(html)) {
    failures.push('index.html: 본문 바로가기 링크가 없습니다.');
  }
  if (/<title>\[/.test(html)) {
    failures.push('index.html: 제목에 개발용 표시가 남아 있습니다.');
  }
}

function checkUnapprovedContent() {
  const source = JSON.parse(readFileSync(resolve(projectRoot, 'src/data/minwon-items.json'), 'utf8'));
  const unapproved = source.items.filter((item) => item.reviewStatus !== 'approved');
  if (unapproved.length === 0) {
    notes.push('미승인 콘텐츠가 없습니다.');
    return;
  }

  const bundleText = listFiles(distDir)
    .filter((file) => TEXT_EXTENSIONS.has(extname(file).toLowerCase()))
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');

  for (const item of unapproved) {
    if (bundleText.includes(item.id) || bundleText.includes(item.title)) {
      failures.push(
        `미승인 콘텐츠가 배포본에 포함되어 있습니다: ${item.id} (${item.title}, ${item.reviewStatus})`,
      );
    }
  }
  notes.push(`미승인 콘텐츠 ${unapproved.length}건이 배포본에서 제외되었습니다.`);
}

/**
 * 외부 미리보기 호스팅(Netlify 등) 전용 파일이 공식 배포본에 섞이지 않았는지 확인한다.
 * 이 파일들에는 `noindex` 헤더가 들어 있어 공식 서버에 올라가면 안 된다.
 */
function checkPreviewOnlyFiles() {
  const names = new Set(listFiles(distDir).map((f) => relative(distDir, f)));
  for (const name of ['_headers', '_redirects']) {
    if (names.has(name)) {
      failures.push(`미리보기 전용 파일이 공식 배포본에 포함되어 있습니다: ${name}`);
    }
  }
}

/** approved 서식의 HWPX 파일이 배포본에 실제로 들어갔는지 확인한다. */
function checkFormFiles() {
  const data = JSON.parse(readFileSync(resolve(projectRoot, 'src/data/forms.json'), 'utf8'));
  const present = new Set(listFiles(distDir).map((f) => relative(distDir, f).split(sep).join('/')));

  for (const form of data.items) {
    if (form.reviewStatus !== 'approved') {
      if (present.has(form.file)) {
        failures.push(`미승인 서식 파일이 배포본에 포함되어 있습니다: ${form.file}`);
      }
      continue;
    }
    if (!present.has(form.file)) {
      failures.push(`approved 서식 파일이 배포본에 없습니다: ${form.file}`);
    }
  }
  const approved = data.items.filter((f) => f.reviewStatus === 'approved').length;
  notes.push(`민원서식 ${approved}건의 파일이 배포본에 포함되었습니다.`);
}

function checkRobots() {
  const files = listFiles(distDir).map((f) => relative(distDir, f));
  if (files.includes('robots.txt')) {
    const robots = readFileSync(join(distDir, 'robots.txt'), 'utf8');
    if (/Disallow:\s*\/\s*$/m.test(robots)) {
      failures.push('robots.txt: 공식 배포본에서 전체 수집 차단(Disallow: /)이 설정되어 있습니다.');
    }
  }
}

function main() {
  let files;
  try {
    files = listFiles(distDir);
  } catch {
    console.error(`공식 빌드 검증 실패: ${distDir} 를 찾을 수 없습니다. 먼저 npm run build:official 을 실행해 주세요.`);
    process.exit(1);
  }

  for (const file of files) checkFile(file);
  checkIndexHtml();
  checkUnapprovedContent();
  checkPreviewOnlyFiles();
  checkFormFiles();
  checkRobots();

  console.log(`공식 빌드 검증 대상: ${files.length}개 파일 (${relative(projectRoot, distDir)})`);
  for (const note of notes) console.log(`  - ${note}`);

  if (failures.length > 0) {
    console.error('\n공식 빌드 검증 실패:');
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log('공식 빌드 검증 통과');
}

main();
