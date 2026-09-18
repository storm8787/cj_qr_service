import { describe, expect, it } from 'vitest';
import { parseAddressQuery } from '../src/lib/address/parse.ts';
import { searchAddressRecords } from '../src/lib/address/search.ts';
import type { AddressRecord } from '../src/lib/address/types.ts';

function record(
  partial: Partial<AddressRecord> & { emd: string; jibunMain: number; jibunSub?: number },
): AddressRecord {
  return {
    id: partial.id ?? `${partial.emd}-${partial.jibunMain}-${partial.jibunSub ?? 0}`,
    sido: partial.sido ?? '충청북도',
    sigungu: partial.sigungu ?? '충주시',
    emd: partial.emd,
    ri: partial.ri ?? '',
    jibun: {
      san: partial.jibun?.san ?? false,
      main: partial.jibunMain,
      sub: partial.jibunSub ?? 0,
    },
    roadName: partial.roadName ?? '시범대로',
    building: partial.building ?? { main: 1, sub: 0 },
    buildingName: partial.buildingName ?? '',
    zipCode: partial.zipCode ?? '',
  };
}

const records: AddressRecord[] = [
  record({ emd: '연수동', jibunMain: 12 }),
  record({ emd: '연수동', jibunMain: 123 }),
  record({ emd: '연수동', jibunMain: 123, jibunSub: 4, buildingName: '가상아파트' }),
  record({ emd: '연수동', jibunMain: 123, jibunSub: 7 }),
  record({ emd: '연수동', jibunMain: 1123 }),
  record({ emd: '연수동', jibunMain: 312, jibunSub: 1 }),
  record({ emd: '교현동', jibunMain: 123, jibunSub: 4 }),
  record({ emd: '교현동', jibunMain: 45, roadName: '시범대로 1번길', building: { main: 12, sub: 0 } }),
  record({ emd: '봉방동', jibunMain: 7, jibunSub: 2, roadName: '시범대로 1번길', building: { main: 25, sub: 0 } }),
  record({ emd: '살미면', ri: '세성리', jibunMain: 12, jibun: { san: true, main: 12, sub: 0 } }),
  record({ emd: '살미면', ri: '세성리', jibunMain: 12 }),
];

function exactIds(query: string): string[] {
  const { outcome } = searchAddressRecords(records, query);
  if (outcome.kind !== 'ok') return [];
  return outcome.exact.map((match) => match.record.id);
}

describe('검색어 파싱', () => {
  it('지번의 본번과 부번을 분리한다', () => {
    const parsed = parseAddressQuery('연수동 123-4');
    expect(parsed.textTerms).toEqual(['연수동']);
    expect(parsed.numberTerms).toHaveLength(1);
    expect(parsed.numberTerms[0]).toMatchObject({ main: 123, sub: 4, hasSub: true, san: false });
  });

  it('부번이 없으면 hasSub 가 false 다', () => {
    const parsed = parseAddressQuery('연수동 123');
    expect(parsed.numberTerms[0]).toMatchObject({ main: 123, sub: 0, hasSub: false });
  });

  it('산 지번을 인식한다', () => {
    for (const query of ['살미면 산 12', '살미면 산12', '살미면산12']) {
      const parsed = parseAddressQuery(query);
      expect(parsed.numberTerms[0]).toMatchObject({ san: true, main: 12, role: 'jibun' });
    }
  });

  it('도로명과 건물번호를 분리한다', () => {
    const parsed = parseAddressQuery('시범대로 1번길 25');
    expect(parsed.textTerms).toEqual(['시범대로', '1번길']);
    expect(parsed.numberTerms).toHaveLength(1);
    expect(parsed.numberTerms[0]).toMatchObject({ main: 25, role: 'building' });
  });

  it('번지 접미사를 지번 조건으로 본다', () => {
    const parsed = parseAddressQuery('연수동 123번지');
    expect(parsed.numberTerms[0]).toMatchObject({ main: 123, role: 'jibun' });
  });

  it('공백·하이픈 변형·대소문자를 정규화한다', () => {
    const variants = ['연수동 123-4', '연수동123-4', ' 연수동  123‑4 ', '연수동 123–4'];
    const parsedList = variants.map(parseAddressQuery);
    for (const parsed of parsedList) {
      expect(parsed.textTerms).toEqual(['연수동']);
      expect(parsed.numberTerms[0]).toMatchObject({ main: 123, sub: 4 });
    }
  });

  it('붙여 쓴 지역명과 숫자를 분리한다', () => {
    const parsed = parseAddressQuery('연수동123');
    expect(parsed.textTerms).toEqual(['연수동']);
    expect(parsed.numberTerms[0]).toMatchObject({ main: 123 });
  });
});

describe('지역명 + 숫자 AND 검색', () => {
  it('지역명과 지번을 모두 만족하는 결과만 돌려준다', () => {
    const ids = exactIds('연수동 123-4');
    expect(ids).toEqual(['연수동-123-4']);
  });

  it('다른 동의 같은 지번은 제외한다', () => {
    const ids = exactIds('교현동 123-4');
    expect(ids).toEqual(['교현동-123-4']);
    expect(ids).not.toContain('연수동-123-4');
  });

  it('지역명이 맞아도 지번이 없으면 결과에 포함하지 않는다', () => {
    const ids = exactIds('연수동 999');
    expect(ids).toEqual([]);
  });
});

describe('무관한 숫자 부분일치 방지', () => {
  it('"12"가 "123", "1123", "312-1", "12-3"을 끌어오지 않는다', () => {
    const ids = exactIds('연수동 12');
    expect(ids).toEqual(['연수동-12-0']);
    expect(ids).not.toContain('연수동-123-0');
    expect(ids).not.toContain('연수동-1123-0');
    expect(ids).not.toContain('연수동-312-1');
  });

  it('본번만 입력하면 그 본번의 부번들을 모두 보여 준다', () => {
    const ids = exactIds('연수동 123');
    expect(ids).toEqual(
      expect.arrayContaining(['연수동-123-0', '연수동-123-4', '연수동-123-7']),
    );
    expect(ids).not.toContain('연수동-1123-0');
  });

  it('부번까지 입력하면 그 한 건만 정확한 결과가 된다', () => {
    const { outcome } = searchAddressRecords(records, '연수동 123-4');
    expect(outcome.kind).toBe('ok');
    if (outcome.kind !== 'ok') return;
    expect(outcome.exact).toHaveLength(1);
    // 본번이 같고 부번이 다른 것은 유사 결과로 분리된다.
    expect(outcome.similar.map((m) => m.record.id)).toEqual(
      expect.arrayContaining(['연수동-123-0', '연수동-123-7']),
    );
  });
});

describe('본번·부번 구분', () => {
  it('산 지번과 일반 지번을 구분한다', () => {
    const sanIds = exactIds('세성리 산 12');
    expect(sanIds).toEqual(['살미면-12-0']);
    const { outcome } = searchAddressRecords(records, '세성리 산 12');
    expect(outcome.kind).toBe('ok');
    if (outcome.kind !== 'ok') return;
    expect(outcome.exact[0]!.record.jibun.san).toBe(true);
  });
});

describe('도로명 + 건물번호 검색', () => {
  it('도로명과 건물번호를 함께 만족해야 한다', () => {
    const ids = exactIds('시범대로 1번길 25');
    expect(ids).toEqual(['봉방동-7-2']);
  });

  it('건물명으로도 찾을 수 있다', () => {
    const ids = exactIds('가상아파트');
    expect(ids).toEqual(['연수동-123-4']);
  });
});

describe('안내가 필요한 경우', () => {
  it('숫자만 입력하면 지역명을 요청한다', () => {
    const { outcome } = searchAddressRecords(records, '123');
    expect(outcome.kind).toBe('needs-region');
    if (outcome.kind !== 'needs-region') return;
    expect(outcome.numbers).toEqual([123]);
  });

  it('숫자-숫자만 입력해도 지역명을 요청한다', () => {
    const { outcome } = searchAddressRecords(records, '123-4');
    expect(outcome.kind).toBe('needs-region');
  });

  it('검색어가 비어 있으면 idle', () => {
    expect(searchAddressRecords(records, '   ').outcome.kind).toBe('idle');
  });

  it('한 글자만 입력하면 too-short', () => {
    expect(searchAddressRecords(records, '연').outcome.kind).toBe('too-short');
  });

  it('결과가 너무 많으면 추가 조건을 요청한다', () => {
    const many = Array.from({ length: 80 }, (_, i) =>
      record({ emd: '많은동', jibunMain: i + 1 }),
    );
    const { outcome } = searchAddressRecords(many, '많은동');
    expect(outcome.kind).toBe('needs-narrowing');
    if (outcome.kind !== 'needs-narrowing') return;
    expect(outcome.total).toBe(80);
    expect(outcome.preview.length).toBeLessThanOrEqual(5);
  });

  it('정확한 결과가 없으면 유사 결과를 별도로 돌려준다', () => {
    const { outcome } = searchAddressRecords(records, '연수동 123-9');
    expect(outcome.kind).toBe('no-exact');
    if (outcome.kind !== 'no-exact') return;
    expect(outcome.similar.length).toBeGreaterThan(0);
    for (const match of outcome.similar) {
      expect(match.record.jibun.main).toBe(123);
    }
  });

  it('아무 결과도 없으면 유사 결과도 비어 있다', () => {
    const { outcome } = searchAddressRecords(records, '없는동 555');
    expect(outcome.kind).toBe('no-exact');
    if (outcome.kind !== 'no-exact') return;
    expect(outcome.similar).toEqual([]);
  });
});

describe('정렬', () => {
  it('정확한 결과가 점수 순으로 정렬된다', () => {
    const { outcome } = searchAddressRecords(records, '연수동');
    expect(outcome.kind).toBe('ok');
    if (outcome.kind !== 'ok') return;
    const scores = outcome.exact.map((m) => m.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });
});
