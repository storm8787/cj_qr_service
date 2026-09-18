import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { searchAddressRecords } from '../src/lib/address/search.ts';
import type { AddressIndex } from '../src/lib/address/types.ts';
import { projectRoot } from './helpers/content.ts';

function buildIndex(csv: string): AddressIndex {
  const dir = mkdtempSync(join(tmpdir(), 'addr-'));
  const input = join(dir, 'source.csv');
  const output = join(dir, 'index.json');
  writeFileSync(input, csv, 'utf8');
  execFileSync('node', ['scripts/build-address-index.mjs', input, output], {
    cwd: projectRoot,
    stdio: 'pipe',
  });
  return JSON.parse(readFileSync(output, 'utf8')) as AddressIndex;
}

const HEADER = '시도,시군구,읍면동,리,산,본번,부번,도로명,건물본번,건물부번,건물명,우편번호';

describe('CSV → 주소 인덱스 변환', () => {
  it('본번과 부번을 숫자로 분리해 저장한다', () => {
    const index = buildIndex(
      `${HEADER}\n충청북도,충주시,연수동,,N,123,4,시범대로,25,0,가상아파트,27300\n`,
    );
    expect(index.records).toHaveLength(1);
    const record = index.records[0]!;
    expect(record.jibun).toEqual({ san: false, main: 123, sub: 4 });
    expect(record.building).toEqual({ main: 25, sub: 0 });
    expect(record.buildingName).toBe('가상아파트');
  });

  it('산 표기를 불리언으로 바꾼다', () => {
    const index = buildIndex(`${HEADER}\n충청북도,충주시,살미면,세성리,Y,12,0,가상길,4,0,,27300\n`);
    expect(index.records[0]!.jibun.san).toBe(true);
  });

  it('부번이 비어 있으면 0으로 채운다', () => {
    const index = buildIndex(`${HEADER}\n충청북도,충주시,연수동,,N,123,,시범대로,25,,,27300\n`);
    expect(index.records[0]!.jibun.sub).toBe(0);
    expect(index.records[0]!.building.sub).toBe(0);
  });

  it('중복 행을 제거한다', () => {
    const row = '충청북도,충주시,연수동,,N,123,4,시범대로,25,0,,27300';
    const index = buildIndex(`${HEADER}\n${row}\n${row}\n`);
    expect(index.records).toHaveLength(1);
  });

  it('숫자가 아닌 본번은 오류로 처리한다', () => {
    expect(() =>
      buildIndex(`${HEADER}\n충청북도,충주시,연수동,,N,일이삼,4,시범대로,25,0,,27300\n`),
    ).toThrow();
  });

  it('머리글이 다르면 오류로 처리한다', () => {
    expect(() => buildIndex('a,b,c\n1,2,3\n')).toThrow();
  });

  it('파일명에 sample 이 들어가면 가상 데이터로 표시한다', () => {
    const index = buildIndex(`${HEADER}\n충청북도,충주시,연수동,,N,1,0,시범대로,1,0,,27300\n`);
    // 임시 파일명은 source.csv 이므로 isSample 은 false 다.
    expect(index.isSample).toBe(false);
  });
});

describe('기본 개발용 인덱스', () => {
  it('저장소의 가상 데이터로 만든 인덱스는 sample 로 표시된다', () => {
    execFileSync('node', ['scripts/build-address-index.mjs'], { cwd: projectRoot, stdio: 'pipe' });
    const index = JSON.parse(
      readFileSync(resolve(projectRoot, 'public/data/address-index.json'), 'utf8'),
    ) as AddressIndex;
    expect(index.isSample).toBe(true);
    expect(index.records.length).toBeGreaterThan(0);
  });

  it('생성된 인덱스로 AND 검색이 동작한다', () => {
    const index = JSON.parse(
      readFileSync(resolve(projectRoot, 'public/data/address-index.json'), 'utf8'),
    ) as AddressIndex;

    const { outcome } = searchAddressRecords(index.records, '연수동 123-4');
    expect(outcome.kind).toBe('ok');
    if (outcome.kind !== 'ok') return;
    expect(outcome.exact).toHaveLength(1);
    expect(outcome.exact[0]!.record.emd).toBe('연수동');
    expect(outcome.exact[0]!.record.jibun).toEqual({ san: false, main: 123, sub: 4 });
  });

  it('"연수동 12"가 123·1123·312-1 을 끌어오지 않는다', () => {
    const index = JSON.parse(
      readFileSync(resolve(projectRoot, 'public/data/address-index.json'), 'utf8'),
    ) as AddressIndex;

    const { outcome } = searchAddressRecords(index.records, '연수동 12');
    expect(outcome.kind).toBe('ok');
    if (outcome.kind !== 'ok') return;
    for (const match of outcome.exact) {
      expect(match.record.jibun.main).toBe(12);
    }
  });
});
