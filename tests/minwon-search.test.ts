import { describe, expect, it } from 'vitest';
import { groupByCategory, searchMinwon } from '../src/lib/minwon-search.ts';
import { normalizeText, toSearchKey, tokenize } from '../src/lib/normalize.ts';
import type { MinwonItem } from '../src/types/index.ts';
import { minwonItems } from './helpers/content.ts';

function titles(query: string, items: readonly MinwonItem[] = minwonItems): string[] {
  const outcome = searchMinwon(items, query);
  return outcome.kind === 'ok' ? outcome.hits.map((hit) => hit.item.title) : [];
}

describe('정규화', () => {
  it('공백과 대소문자를 정리한다', () => {
    expect(normalizeText('  주민등록   등본  ')).toBe('주민등록 등본');
    expect(normalizeText('GOV24')).toBe('gov24');
  });

  it('전각 문자를 반각으로 바꾼다', () => {
    expect(normalizeText('１２３')).toBe('123');
  });

  it('하이픈 변형을 통일한다', () => {
    for (const dash of ['-', '‑', '–', '—', '−', '~']) {
      expect(normalizeText(`123${dash}4`)).toBe('123-4');
    }
  });

  it('검색 키에서 공백과 구두점을 제거한다', () => {
    expect(toSearchKey('가족 관계 증명서')).toBe('가족관계증명서');
    expect(toSearchKey('등본·초본')).toBe('등본초본');
    expect(toSearchKey('주민등록표 등본(초본) 발급')).toBe('주민등록표등본초본발급');
  });

  it('토큰을 나눈다', () => {
    expect(tokenize('연수동 123-4')).toEqual(['연수동', '123-4']);
    expect(tokenize('등본·초본 발급')).toEqual(['등본', '초본', '발급']);
  });
});

describe('민원명 검색', () => {
  it('민원명 일부로 찾는다', () => {
    expect(titles('전입신고')).toContain('전입신고');
  });

  it('민원명 전체로 찾는다', () => {
    expect(titles('주민등록표 등본(초본) 발급')).toContain('주민등록표 등본(초본) 발급');
  });

  it('띄어쓰기가 달라도 같은 결과를 준다', () => {
    expect(titles('주민등록 등본')).toEqual(titles('주민등록등본'));
  });

  it('특수문자가 섞여도 찾는다', () => {
    expect(titles('등본·초본')).toEqual(expect.arrayContaining(['주민등록표 등본(초본) 발급']));
  });
});

describe('별칭·키워드 검색', () => {
  it('별칭으로 찾는다', () => {
    expect(titles('등초본')).toContain('주민등록표 등본(초본) 발급');
    expect(titles('전입세대열람원')).toContain('전입세대확인서 열람(발급)');
    expect(titles('이사 신고')).toContain('전입신고');
  });

  it('관련 키워드로 찾는다', () => {
    expect(titles('전세사기')).toContain('전입세대확인서 열람(발급)');
    expect(titles('연면적')).toContain('건축물대장 등본(초본) 발급(열람)');
  });

  it('별칭으로 찾으면 어디서 찾았는지 알려 준다', () => {
    const outcome = searchMinwon(minwonItems, '등초본');
    expect(outcome.kind).toBe('ok');
    if (outcome.kind !== 'ok') return;
    expect(outcome.hits[0]!.matchedOn).toContain('다른 이름');
  });
});

describe('여러 단어 검색', () => {
  it('모든 단어를 만족하는 항목만 남긴다 (AND)', () => {
    const result = titles('토지 대장');
    expect(result).toContain('토지(임야)대장 등본 발급(열람)');
  });

  it('한 단어라도 맞지 않으면 제외한다', () => {
    expect(titles('토지 우주선')).toEqual([]);
  });
});

describe('빈 결과·짧은 검색어 안내', () => {
  it('검색어가 없으면 idle', () => {
    expect(searchMinwon(minwonItems, '').kind).toBe('idle');
  });

  it('한 글자면 too-short', () => {
    const outcome = searchMinwon(minwonItems, '등');
    expect(outcome.kind).toBe('too-short');
    if (outcome.kind !== 'too-short') return;
    expect(outcome.minLength).toBe(2);
  });

  it('결과가 없으면 원인을 알 수 있는 안내와 대안을 준다', () => {
    const outcome = searchMinwon(minwonItems, '없는민원이름입니다');
    expect(outcome.kind).toBe('empty');
    if (outcome.kind !== 'empty') return;
    expect(outcome.suggestions.length).toBeGreaterThan(0);
  });
});

describe('정렬', () => {
  it('민원명 정확 일치를 가장 앞에 둔다', () => {
    const outcome = searchMinwon(minwonItems, '전입신고');
    expect(outcome.kind).toBe('ok');
    if (outcome.kind !== 'ok') return;
    expect(outcome.hits[0]!.item.title).toBe('전입신고');
  });
});

describe('분야별 묶기', () => {
  it('분야별로 나눈다', () => {
    const groups = groupByCategory(minwonItems);
    expect(groups.length).toBeGreaterThan(1);
    const total = groups.reduce((sum, group) => sum + group.items.length, 0);
    expect(total).toBe(minwonItems.length);
  });
});
