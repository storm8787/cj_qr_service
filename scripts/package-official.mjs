#!/usr/bin/env node
/**
 * 공식 배포본 전달용 ZIP 생성.
 *
 *   node scripts/package-official.mjs
 *   → release/chungju-minwon-guide.zip
 *
 * 외부 의존성 없이 Node 표준 모듈(zlib)만으로 ZIP을 만든다.
 * ZIP 안에는 dist/ 의 파일과 운영업체용 안내문(README-업로드안내.txt)이 들어간다.
 */
import { deflateRawSync } from 'node:zlib';
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = resolve(projectRoot, 'dist');
const releaseDir = resolve(projectRoot, 'release');
const zipPath = join(releaseDir, 'chungju-minwon-guide.zip');

/* ---------- 최소 ZIP 작성기 ---------- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** DOS 시간 형식으로 변환. 재현 가능한 산출물을 위해 고정 시각을 쓴다. */
function dosDateTime(date) {
  const time =
    (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

function createZip(entries, date) {
  const { time, day } = dosDateTime(date);
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, 'utf8');
    const compressed = deflateRawSync(entry.data, { level: 9 });
    const useDeflate = compressed.length < entry.data.length;
    const payload = useDeflate ? compressed : entry.data;
    const method = useDeflate ? 8 : 0;
    const crc = crc32(entry.data);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0x0800, 6); // UTF-8 파일명 플래그
    localHeader.writeUInt16LE(method, 8);
    localHeader.writeUInt16LE(time, 10);
    localHeader.writeUInt16LE(day, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(payload.length, 18);
    localHeader.writeUInt32LE(entry.data.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuffer, payload);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt16LE(time, 12);
    centralHeader.writeUInt16LE(day, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(payload.length, 20);
    centralHeader.writeUInt32LE(entry.data.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30); // extra
    centralHeader.writeUInt16LE(0, 32); // comment
    centralHeader.writeUInt16LE(0, 34); // disk
    centralHeader.writeUInt16LE(0, 36); // internal attrs
    // external attrs (rw-r--r--). `<< 16` 은 32비트 부호 있는 정수라 음수가 되므로 `>>> 0` 으로 되돌린다.
    centralHeader.writeUInt32LE((0o100644 << 16) >>> 0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuffer);
    offset += localHeader.length + nameBuffer.length + payload.length;
  }

  const centralBuffer = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralBuffer, end]);
}

/* ---------- 수집 ---------- */

function listFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

const HANDOFF_NOTE = `충주시 민원안내 (가칭) — 홈페이지 운영업체 전달용 안내

1. 이 ZIP 안의 "dist" 폴더 내용을 그대로 웹 서버에 올려 주세요.
   - 폴더째 올려도 되고, 하위 경로(예: /minwon/guide/)에 올려도 동작합니다.
   - 파일 경로는 모두 상대경로입니다. 폴더 구조를 바꾸지 말아 주세요.

2. 기본 진입 파일: index.html

3. MIME 타입 설정
   - .html  → text/html; charset=utf-8
   - .css   → text/css; charset=utf-8
   - .js    → text/javascript; charset=utf-8  (type="module" 로 불러옵니다)
   - .json  → application/json; charset=utf-8
   - .svg   → image/svg+xml

4. 캐시 설정 권고
   - assets/ 아래 파일: 파일명에 해시가 있으므로 장기 캐시 가능
     Cache-Control: public, max-age=31536000, immutable
   - index.html, data/*.json: 내용이 갱신되므로 짧게
     Cache-Control: no-cache

5. 서버 재작성(rewrite) 설정이 필요하지 않습니다. 화면 이동은 주소의 # 뒤부분만 사용합니다.

6. 점검 항목
   - index.html 이 열리는지
   - 화면 상단에 "개발·검토용" 문구가 없는지
   - 민원 검색, 주소 검색, 면적 환산이 동작하는지
   - 브라우저 개발자도구 네트워크 탭에 외부 도메인 요청이 없는지

7. 롤백
   - 업로드 전 기존 폴더를 통째로 백업해 두고, 문제가 생기면 백업 폴더로 되돌려 주세요.

자세한 내용은 docs/vendor-handoff-guide.md 를 참고해 주세요.
`;

function main() {
  let files;
  try {
    files = listFiles(distDir);
  } catch {
    console.error('dist 폴더가 없습니다. 먼저 npm run build:official 을 실행해 주세요.');
    process.exit(1);
  }

  if (files.length === 0) {
    console.error('dist 폴더가 비어 있습니다.');
    process.exit(1);
  }

  const entries = files.map((file) => ({
    name: `dist/${relative(distDir, file).split(sep).join('/')}`,
    data: readFileSync(file),
  }));

  entries.push({
    name: 'README-업로드안내.txt',
    data: Buffer.from(HANDOFF_NOTE, 'utf8'),
  });

  const zip = createZip(entries, new Date('2020-01-01T00:00:00Z'));

  mkdirSync(releaseDir, { recursive: true });
  writeFileSync(zipPath, zip);

  const totalBytes = entries.reduce((sum, entry) => sum + entry.data.length, 0);
  console.log(
    `전달용 ZIP 생성 완료: ${relative(projectRoot, zipPath)} ` +
      `(${entries.length}개 파일, 원본 ${(totalBytes / 1024).toFixed(1)}KB → 압축 ${(zip.length / 1024).toFixed(1)}KB)`,
  );
}

main();
