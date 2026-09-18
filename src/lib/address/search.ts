import { normalizeText } from '../normalize.ts';
import { parseAddressQuery } from './parse.ts';
import type {
  AddressMatch,
  AddressRecord,
  AddressSearchOptions,
  AddressSearchOutcome,
  NumberTerm,
  ParsedAddressQuery,
} from './types.ts';

export const DEFAULT_OPTIONS: Required<AddressSearchOptions> = {
  limit: 30,
  narrowingThreshold: 60,
  minLength: 2,
};

/** 레코드의 문자 필드를 정규화해 캐시한다. */
interface RecordText {
  emd: string;
  ri: string;
  roadName: string;
  buildingName: string;
  sigungu: string;
  /** 위 필드를 모두 붙인 값 (정규화된 소문자, 공백 제거) */
  all: string;
}

const textCache = new WeakMap<AddressRecord, RecordText>();

function recordText(record: AddressRecord): RecordText {
  const cached = textCache.get(record);
  if (cached) return cached;
  const emd = normalizeText(record.emd);
  const ri = normalizeText(record.ri);
  const roadName = normalizeText(record.roadName);
  const buildingName = normalizeText(record.buildingName);
  const sigungu = normalizeText(record.sigungu);
  const value: RecordText = {
    emd,
    ri,
    roadName,
    buildingName,
    sigungu,
    all: [emd, ri, roadName, buildingName, sigungu].join(' ').replace(/\s+/g, ''),
  };
  textCache.set(record, value);
  return value;
}

/** 문자 조건 1개가 레코드에 맞는지. 숫자는 여기서 비교하지 않는다. */
function matchesTextTerm(record: AddressRecord, term: string): boolean {
  const text = recordText(record);
  const needle = term.replace(/\s+/g, '');
  if (needle.length === 0) return true;
  return (
    text.emd.includes(needle) ||
    text.ri.includes(needle) ||
    text.roadName.includes(needle) ||
    text.buildingName.includes(needle) ||
    text.sigungu.includes(needle) ||
    text.all.includes(needle)
  );
}

type NumberMatchLevel =
  /** 본번·부번까지 모두 일치 */
  | 'exact'
  /** 본번은 일치하지만 부번이 다름 → 유사 결과 */
  | 'main-only'
  /** 일치하지 않음 */
  | 'none';

/**
 * 숫자 조건을 지번과 비교한다.
 * **문자열 부분일치를 쓰지 않는다.** 본번은 정수 동등 비교, 부번은 입력했을 때만 비교한다.
 */
function matchJibun(record: AddressRecord, term: NumberTerm): NumberMatchLevel {
  if (record.jibun.san !== term.san) return 'none';
  if (record.jibun.main !== term.main) return 'none';
  if (!term.hasSub) {
    // 부번을 입력하지 않았다면 본번이 같은 지번 전체가 정확한 결과다.
    return 'exact';
  }
  return record.jibun.sub === term.sub ? 'exact' : 'main-only';
}

/** 숫자 조건을 건물번호와 비교한다. */
function matchBuilding(record: AddressRecord, term: NumberTerm): NumberMatchLevel {
  if (term.san) return 'none';
  if (record.building.main !== term.main) return 'none';
  if (!term.hasSub) return 'exact';
  return record.building.sub === term.sub ? 'exact' : 'main-only';
}

interface NumberTermOutcome {
  level: NumberMatchLevel;
  reason: string;
}

function matchNumberTerm(record: AddressRecord, term: NumberTerm): NumberTermOutcome {
  const candidates: Array<{ level: NumberMatchLevel; reason: string }> = [];
  if (term.role === 'jibun' || term.role === 'either') {
    candidates.push({ level: matchJibun(record, term), reason: `지번 ${term.raw}` });
  }
  if (term.role === 'building' || term.role === 'either') {
    candidates.push({ level: matchBuilding(record, term), reason: `건물번호 ${term.raw}` });
  }
  const exact = candidates.find((c) => c.level === 'exact');
  if (exact) return { level: 'exact', reason: exact.reason };
  const partial = candidates.find((c) => c.level === 'main-only');
  if (partial) return { level: 'main-only', reason: `${partial.reason} (본번만 일치)` };
  return { level: 'none', reason: '' };
}

/** 정확도 점수. 앞자리 일치·건물명 일치 등에 가중치를 둔다. */
function scoreRecord(record: AddressRecord, parsed: ParsedAddressQuery): number {
  const text = recordText(record);
  let score = 0;
  for (const term of parsed.textTerms) {
    const needle = term.replace(/\s+/g, '');
    if (text.emd === needle || text.ri === needle) score += 40;
    else if (text.emd.startsWith(needle) || text.ri.startsWith(needle)) score += 28;
    else if (text.roadName === needle) score += 36;
    else if (text.roadName.startsWith(needle)) score += 24;
    else if (text.buildingName.startsWith(needle)) score += 20;
    else if (text.buildingName.includes(needle)) score += 12;
    else score += 6;
  }
  for (const term of parsed.numberTerms) {
    const outcome = matchNumberTerm(record, term);
    if (outcome.level === 'exact') score += term.hasSub ? 45 : 30;
    else if (outcome.level === 'main-only') score += 10;
  }
  // 부번이 없는 지번(본번만 있는 땅)을 살짝 앞세워 목록이 안정적으로 보이게 한다.
  if (record.jibun.sub === 0) score += 1;
  return score;
}

function compareMatches(a: AddressMatch, b: AddressMatch): number {
  if (b.score !== a.score) return b.score - a.score;
  const emd = a.record.emd.localeCompare(b.record.emd, 'ko');
  if (emd !== 0) return emd;
  if (a.record.jibun.main !== b.record.jibun.main) return a.record.jibun.main - b.record.jibun.main;
  return a.record.jibun.sub - b.record.jibun.sub;
}

/**
 * 로컬 인덱스 기반 주소 검색.
 *
 * 규칙 (요구사항 5.4):
 * 1. 입력된 지역명 조건과 숫자 조건을 **모두** 만족해야 정확한 결과다 (AND).
 * 2. 숫자는 본번/부번으로 분리해 정수 비교한다. 문자열 부분일치를 쓰지 않는다.
 * 3. 숫자만 입력하면 지역명을 함께 입력하도록 안내한다.
 * 4. 정확한 결과가 없으면 유사 결과를 별도로 돌려준다.
 * 5. 결과가 과다하면 추가 조건을 요청한다.
 */
export function searchAddressRecords(
  records: readonly AddressRecord[],
  query: string,
  options: AddressSearchOptions = {},
): { outcome: AddressSearchOutcome; parsed: ParsedAddressQuery } {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const parsed = parseAddressQuery(query);
  const trimmed = normalizeText(query);

  if (trimmed.length === 0) {
    return { outcome: { kind: 'idle' }, parsed };
  }
  if (parsed.textTerms.length === 0 && parsed.numberTerms.length === 0) {
    return { outcome: { kind: 'too-short', minLength: opts.minLength }, parsed };
  }
  if (trimmed.replace(/\s+/g, '').length < opts.minLength) {
    return { outcome: { kind: 'too-short', minLength: opts.minLength }, parsed };
  }

  // 숫자만 입력한 경우: 지역명 없이 숫자를 검색하면 무관한 결과가 쏟아진다.
  if (parsed.textTerms.length === 0 && parsed.numberTerms.length > 0) {
    return {
      outcome: {
        kind: 'needs-region',
        numbers: parsed.numberTerms.map((t) => t.main),
      },
      parsed,
    };
  }

  const exact: AddressMatch[] = [];
  const similar: AddressMatch[] = [];

  for (const record of records) {
    // 문자 조건은 전부 만족해야 한다 (AND).
    const textOk = parsed.textTerms.every((term) => matchesTextTerm(record, term));
    if (!textOk) continue;

    if (parsed.numberTerms.length === 0) {
      exact.push({
        record,
        score: scoreRecord(record, parsed),
        reasons: parsed.textTerms.map((t) => `지역·도로명 "${t}"`),
      });
      continue;
    }

    const outcomes = parsed.numberTerms.map((term) => matchNumberTerm(record, term));
    const allExact = outcomes.every((o) => o.level === 'exact');
    const anyMiss = outcomes.some((o) => o.level === 'none');
    const reasons = [
      ...parsed.textTerms.map((t) => `지역·도로명 "${t}"`),
      ...outcomes.filter((o) => o.reason).map((o) => o.reason),
    ];

    if (allExact) {
      exact.push({ record, score: scoreRecord(record, parsed), reasons });
    } else if (!anyMiss) {
      // 본번은 맞고 부번만 다른 경우 → 유사 결과
      similar.push({ record, score: scoreRecord(record, parsed), reasons });
    }
  }

  exact.sort(compareMatches);
  similar.sort(compareMatches);

  if (exact.length > opts.narrowingThreshold) {
    return {
      outcome: {
        kind: 'needs-narrowing',
        total: exact.length,
        preview: exact.slice(0, 5),
      },
      parsed,
    };
  }

  if (exact.length === 0) {
    if (similar.length === 0) {
      return { outcome: { kind: 'no-exact', similar: [] }, parsed };
    }
    return { outcome: { kind: 'no-exact', similar: similar.slice(0, opts.limit) }, parsed };
  }

  return {
    outcome: {
      kind: 'ok',
      exact: exact.slice(0, opts.limit),
      similar: similar.slice(0, 10),
      total: exact.length,
    },
    parsed,
  };
}

/** 검색 결과 1건을 도로명주소 문자열로 만든다. */
export function formatRoadAddress(record: AddressRecord): string {
  const number = record.building.sub > 0
    ? `${record.building.main}-${record.building.sub}`
    : `${record.building.main}`;
  return `${record.sido} ${record.sigungu} ${record.roadName} ${number}`;
}

/** 검색 결과 1건을 지번주소 문자열로 만든다. */
export function formatJibunAddress(record: AddressRecord): string {
  const area = record.ri ? `${record.emd} ${record.ri}` : record.emd;
  const san = record.jibun.san ? '산 ' : '';
  const number = record.jibun.sub > 0
    ? `${record.jibun.main}-${record.jibun.sub}`
    : `${record.jibun.main}`;
  return `${record.sido} ${record.sigungu} ${area} ${san}${number}`;
}
