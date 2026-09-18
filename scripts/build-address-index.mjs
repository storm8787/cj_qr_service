#!/usr/bin/env node
/**
 * CSV 주소 원자료 → 검색용 JSON 인덱스 변환.
 *
 * 사용법:
 *   node scripts/build-address-index.mjs [입력CSV] [출력JSON]
 *
 * 기본값:
 *   입력  data/source/address-sample.csv   (개발용 가상 데이터)
 *   출력  public/data/address-index.json
 *
 * 충주시 공식 주소 원자료를 확보하면 같은 열 구성으로 CSV를 만들어 입력 경로만 바꾸면 된다.
 * 열 구성: 시도,시군구,읍면동,리,산,본번,부번,도로명,건물본번,건물부번,건물명,우편번호
 *
 * 대량 주소자료를 index.html 에 넣지 않는다. 항상 별도 JSON으로 만들어 런타임에 받아 온다.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const inputPath = resolve(projectRoot, process.argv[2] ?? 'data/source/address-sample.csv');
const outputPath = resolve(projectRoot, process.argv[3] ?? 'public/data/address-index.json');

/** 개발용 가상 데이터인지 여부. 파일명에 `sample`이 들어가면 가상 데이터로 표시한다. */
const isSample = /sample/i.test(inputPath);

const EXPECTED_HEADER = [
  '시도',
  '시군구',
  '읍면동',
  '리',
  '산',
  '본번',
  '부번',
  '도로명',
  '건물본번',
  '건물부번',
  '건물명',
  '우편번호',
];

/** 따옴표를 지원하는 최소한의 CSV 파서. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

function toInt(value, label, lineNumber) {
  const trimmed = (value ?? '').trim();
  if (trimmed.length === 0) return 0;
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`${lineNumber}행: ${label} 값 "${trimmed}" 은(는) 숫자가 아닙니다.`);
  }
  return Number(trimmed);
}

function main() {
  const text = readFileSync(inputPath, 'utf8').replace(/^﻿/, '');
  const rows = parseCsv(text);
  if (rows.length === 0) throw new Error('CSV가 비어 있습니다.');

  const header = rows[0].map((cell) => cell.trim());
  const missing = EXPECTED_HEADER.filter((name) => !header.includes(name));
  if (missing.length > 0) {
    throw new Error(
      `CSV 머리글에 다음 열이 없습니다: ${missing.join(', ')}\n` +
        `필요한 열: ${EXPECTED_HEADER.join(', ')}`,
    );
  }
  const columnIndex = Object.fromEntries(EXPECTED_HEADER.map((name) => [name, header.indexOf(name)]));

  const records = [];
  const seen = new Set();

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const lineNumber = i + 1;
    const get = (name) => (row[columnIndex[name]] ?? '').trim();

    const record = {
      id: '',
      sido: get('시도'),
      sigungu: get('시군구'),
      emd: get('읍면동'),
      ri: get('리'),
      jibun: {
        san: /^(y|yes|산|true|1)$/i.test(get('산')),
        main: toInt(get('본번'), '본번', lineNumber),
        sub: toInt(get('부번'), '부번', lineNumber),
      },
      roadName: get('도로명'),
      building: {
        main: toInt(get('건물본번'), '건물본번', lineNumber),
        sub: toInt(get('건물부번'), '건물부번', lineNumber),
      },
      buildingName: get('건물명'),
      zipCode: get('우편번호'),
    };

    if (!record.emd && !record.roadName) {
      throw new Error(`${lineNumber}행: 읍면동과 도로명이 모두 비어 있습니다.`);
    }

    const key = [
      record.sigungu,
      record.emd,
      record.ri,
      record.jibun.san ? 'san' : '',
      record.jibun.main,
      record.jibun.sub,
      record.roadName,
      record.building.main,
      record.building.sub,
    ].join('|');

    if (seen.has(key)) continue;
    seen.add(key);

    record.id = `addr-${records.length + 1}`;
    records.push(record);
  }

  // 검색 결과 정렬이 안정적이도록 미리 정렬해 둔다.
  records.sort(
    (a, b) =>
      a.emd.localeCompare(b.emd, 'ko') ||
      a.jibun.main - b.jibun.main ||
      a.jibun.sub - b.jibun.sub,
  );

  const index = {
    source: isSample
      ? '개발용 가상 데이터 (data/source/address-sample.csv). 충주시 공식 주소 원자료로 교체해야 합니다.'
      : `CSV 원자료에서 생성 (${inputPath.replace(projectRoot + '/', '')})`,
    isSample,
    generatedAt: new Date().toISOString().slice(0, 10),
    records,
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(index, null, 2)}\n`, 'utf8');

  const relativeOut = outputPath.replace(projectRoot + '/', '');
  console.log(
    `주소 인덱스 생성 완료: ${relativeOut} (${records.length}건${isSample ? ', 개발용 가상 데이터' : ''})`,
  );
}

try {
  main();
} catch (error) {
  console.error(`주소 인덱스 생성 실패: ${error.message}`);
  process.exit(1);
}
