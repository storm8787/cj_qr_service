import { hasHangul, normalizeText } from '../normalize.ts';
import type { BuildingNumber, JibunNumber, NumberTerm, ParsedAddressQuery } from './types.ts';

/**
 * 주소 검색어 파싱.
 *
 * 목표:
 * - 숫자를 문자열 부분일치로 쓰지 않기 위해, 검색어에서 숫자 조건을 **구조적으로** 뽑아낸다.
 * - `산 12-3`, `산12-3` → 산 지번 본번 12 / 부번 3
 * - `123번지`          → 지번 본번 123 (부번 조건 없음)
 * - `국원대로 1번길 25` → 도로명 토큰 `국원대로`, `1번길` + 건물번호 25
 * - `연수동 123`       → 지역명 `연수동` + 숫자 123 (지번/건물번호 양쪽 후보)
 */

function splitNumber(token: string): { main: number; sub: number; hasSub: boolean } | null {
  const match = /^(\d+)(?:-(\d+))?$/.exec(token);
  if (!match) return null;
  const main = Number(match[1]);
  if (!Number.isFinite(main)) return null;
  const hasSub = match[2] !== undefined;
  return { main, sub: hasSub ? Number(match[2]) : 0, hasSub };
}

/** 도로명의 일부인 숫자 토큰(`123번길`, `2로`, `4길`). 숫자 조건으로 분리하지 않는다. */
const ROAD_NAME_TOKEN = /^\d+(번길|번가|길|로|대로|가)$/;

/** 지번임을 명시하는 접미사. */
const JIBUN_SUFFIX = /^(\d+(?:-\d+)?)(번지|번)$/;

/** 도로명 접미사. 이 토큰 뒤에 오는 숫자는 건물번호로 본다. */
const ROAD_SUFFIX = /(로|길|대로|번길|번가)$/;

/** 검색 조건으로 의미가 없는 단위어. */
const UNIT_WORDS = /^(호|번지|번|동|층|리|가)$/;

export function parseAddressQuery(raw: string): ParsedAddressQuery {
  const normalized = normalizeText(raw);

  const spaced = normalized
    // `연수동산12` → `연수동 산 12`
    .replace(/([가-힣])산(?=\s*\d)/g, '$1 산 ')
    // `산12-3` → `산 12-3`
    .replace(/(^|\s)산\s*(?=\d)/g, '$1산 ')
    // `연수동123` → `연수동 123`
    .replace(/([가-힣])(?=\d)/g, '$1 ')
    // `123 연수동` 형태로 붙어 온 경우 분리. 단 `1번길`, `2로`, `123번지`는 유지한다.
    .replace(/(\d)([가-힣])/g, (full, digits: string, hangul: string) =>
      ROAD_NAME_TOKEN.test(`${digits}${hangul}`) || /^(번|호)$/.test(hangul)
        ? full
        : `${digits} ${hangul}`,
    );

  const tokens = spaced.split(/\s+/).filter((t) => t.length > 0);

  const textTerms: string[] = [];
  const numberTerms: NumberTerm[] = [];

  let pendingSan = false;
  let previousWasRoad = false;

  for (const token of tokens) {
    if (token === '산') {
      pendingSan = true;
      previousWasRoad = false;
      continue;
    }

    const jibunSuffix = JIBUN_SUFFIX.exec(token);
    if (jibunSuffix) {
      const parts = splitNumber(jibunSuffix[1]!);
      if (parts) {
        numberTerms.push({ raw: token, san: pendingSan, role: 'jibun', ...parts });
        pendingSan = false;
        previousWasRoad = false;
        continue;
      }
    }

    if (ROAD_NAME_TOKEN.test(token)) {
      textTerms.push(token);
      previousWasRoad = true;
      pendingSan = false;
      continue;
    }

    const parts = splitNumber(token);
    if (parts) {
      const role: NumberTerm['role'] = pendingSan ? 'jibun' : previousWasRoad ? 'building' : 'either';
      numberTerms.push({ raw: token, san: pendingSan, role, ...parts });
      pendingSan = false;
      previousWasRoad = false;
      continue;
    }

    if (UNIT_WORDS.test(token)) {
      previousWasRoad = false;
      continue;
    }

    if (hasHangul(token) || /^[a-z]+$/.test(token)) {
      textTerms.push(token);
      previousWasRoad = ROAD_SUFFIX.test(token);
      pendingSan = false;
      continue;
    }

    previousWasRoad = false;
  }

  return { raw, textTerms, numberTerms };
}

/** 지번을 사람이 읽는 형태로 만든다. */
export function formatJibun(jibun: JibunNumber): string {
  const prefix = jibun.san ? '산 ' : '';
  return jibun.sub > 0 ? `${prefix}${jibun.main}-${jibun.sub}` : `${prefix}${jibun.main}`;
}

/** 건물번호를 사람이 읽는 형태로 만든다. */
export function formatBuildingNumber(building: BuildingNumber): string {
  return building.sub > 0 ? `${building.main}-${building.sub}` : `${building.main}`;
}
