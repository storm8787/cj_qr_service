import { normalizeText, toSearchKey, tokenize } from './normalize.ts';
import type { MinwonItem } from '../types/index.ts';

export interface MinwonSearchHit {
  item: MinwonItem;
  score: number;
  /** 어느 필드에서 맞았는지 (별칭으로 찾은 경우 화면에 알려 준다) */
  matchedOn: string[];
}

export type MinwonSearchOutcome =
  | { kind: 'idle' }
  | { kind: 'too-short'; minLength: number }
  | { kind: 'empty'; query: string; suggestions: MinwonItem[] }
  | { kind: 'ok'; hits: MinwonSearchHit[] };

const MIN_LENGTH = 2;

interface IndexedItem {
  item: MinwonItem;
  titleKey: string;
  aliasKeys: string[];
  keywordKeys: string[];
  categoryKey: string;
  summaryKey: string;
}

function buildIndex(items: readonly MinwonItem[]): IndexedItem[] {
  return items.map((item) => ({
    item,
    titleKey: toSearchKey(item.title),
    aliasKeys: item.aliases.map(toSearchKey),
    keywordKeys: item.keywords.map(toSearchKey),
    categoryKey: toSearchKey(item.category),
    summaryKey: toSearchKey(item.summary),
  }));
}

const indexCache = new WeakMap<readonly MinwonItem[], IndexedItem[]>();

function getIndex(items: readonly MinwonItem[]): IndexedItem[] {
  let index = indexCache.get(items);
  if (!index) {
    index = buildIndex(items);
    indexCache.set(items, index);
  }
  return index;
}

/** 한 항목에 대한 단일 토큰 점수. 0이면 불일치. */
function scoreToken(entry: IndexedItem, token: string): { score: number; field: string } {
  if (entry.titleKey === token) return { score: 100, field: '민원명' };
  if (entry.titleKey.startsWith(token)) return { score: 70, field: '민원명' };
  if (entry.titleKey.includes(token)) return { score: 55, field: '민원명' };

  for (const alias of entry.aliasKeys) {
    if (alias === token) return { score: 65, field: '다른 이름' };
    if (alias.includes(token)) return { score: 45, field: '다른 이름' };
  }
  for (const keyword of entry.keywordKeys) {
    if (keyword === token) return { score: 40, field: '관련 키워드' };
    if (keyword.includes(token)) return { score: 28, field: '관련 키워드' };
  }
  if (entry.categoryKey.includes(token)) return { score: 22, field: '분야' };
  if (entry.summaryKey.includes(token)) return { score: 14, field: '설명' };
  return { score: 0, field: '' };
}

/**
 * 민원 검색.
 * 띄어쓰기·구두점을 정규화해 비교하고, 여러 단어를 입력하면 모두 만족하는 항목만 남긴다.
 */
export function searchMinwon(
  items: readonly MinwonItem[],
  query: string,
): MinwonSearchOutcome {
  const normalized = normalizeText(query);
  if (normalized.length === 0) return { kind: 'idle' };

  const compact = toSearchKey(query);
  if (compact.length < MIN_LENGTH) return { kind: 'too-short', minLength: MIN_LENGTH };

  // 공백·구두점을 지운 전체 검색어(`가족 관계 증명서` → `가족관계증명서`)를 먼저 맞춰 보고,
  // 맞지 않으면 단어별 AND 검색으로 넘어간다.
  const tokens = tokenize(query).map(toSearchKey).filter((t) => t.length > 0);

  const index = getIndex(items);
  const hits: MinwonSearchHit[] = [];

  for (const entry of index) {
    // 붙여 쓴 전체 검색어가 맞으면 그것만으로 충분하다.
    const whole = scoreToken(entry, compact);
    if (whole.score > 0) {
      hits.push({ item: entry.item, score: whole.score + 10, matchedOn: [whole.field] });
      continue;
    }

    if (tokens.length < 2) continue;

    // 여러 단어: 모든 토큰이 어딘가에서 맞아야 한다 (AND).
    let total = 0;
    const fields = new Set<string>();
    let allMatched = true;
    for (const token of tokens) {
      const result = scoreToken(entry, token);
      if (result.score === 0) {
        allMatched = false;
        break;
      }
      total += result.score;
      fields.add(result.field);
    }
    if (allMatched) {
      hits.push({
        item: entry.item,
        score: Math.round(total / tokens.length),
        matchedOn: [...fields],
      });
    }
  }

  if (hits.length === 0) {
    return {
      kind: 'empty',
      query: normalized,
      // 결과가 없을 때 무엇을 시도해 볼 수 있는지 보여 주기 위한 대표 민원
      suggestions: items.slice(0, 4),
    };
  }

  hits.sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title, 'ko'));
  return { kind: 'ok', hits };
}

/** 분야별 목록. 데이터 순서를 유지한다. */
export function groupByCategory(items: readonly MinwonItem[]): Array<{
  category: string;
  items: MinwonItem[];
}> {
  const groups = new Map<string, MinwonItem[]>();
  for (const item of items) {
    const list = groups.get(item.category) ?? [];
    list.push(item);
    groups.set(item.category, list);
  }
  return [...groups.entries()].map(([category, list]) => ({ category, items: list }));
}
