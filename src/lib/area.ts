/**
 * 면적 환산 (㎡ ↔ 평).
 *
 * 1평 = 400/121 ㎡ = 3.3057851239669... ㎡
 * 요구사항에 따라 상수는 소수 6자리인 3.305785 를 사용한다.
 */
export const M2_PER_PYEONG = 3.305785;

/** 입력 검증 실패 사유. */
export type AreaInputError =
  | 'empty'
  | 'not-a-number'
  | 'negative'
  | 'too-large';

export type AreaParseResult =
  | { ok: true; value: number }
  | { ok: false; error: AreaInputError; message: string };

/** 허용 최대 입력값. 충주시 전체 면적(약 9.8억 ㎡)보다 크며, 실수 입력을 걸러내는 상한. */
export const MAX_AREA_VALUE = 1_000_000_000;

const ERROR_MESSAGES: Record<AreaInputError, string> = {
  empty: '면적을 입력해 주세요.',
  'not-a-number': '숫자만 입력할 수 있습니다. 예: 84 또는 84.5',
  negative: '0보다 큰 값을 입력해 주세요. 음수는 면적이 될 수 없습니다.',
  'too-large': `${MAX_AREA_VALUE.toLocaleString('ko-KR')} 이하의 값을 입력해 주세요.`,
};

/**
 * 사용자 입력 문자열을 면적 값으로 변환한다.
 * 천 단위 쉼표는 허용하고, 그 밖의 문자가 섞이면 거부한다.
 */
export function parseAreaInput(raw: string): AreaParseResult {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: 'empty', message: ERROR_MESSAGES.empty };
  }

  const withoutGrouping = trimmed.replace(/,/g, '');

  // 지수 표기(1e9)·기호(+)·공백 혼입을 막기 위해 형태를 먼저 제한한다.
  if (!/^-?\d+(\.\d+)?$/.test(withoutGrouping)) {
    return { ok: false, error: 'not-a-number', message: ERROR_MESSAGES['not-a-number'] };
  }

  const value = Number(withoutGrouping);
  if (!Number.isFinite(value)) {
    return { ok: false, error: 'not-a-number', message: ERROR_MESSAGES['not-a-number'] };
  }
  if (value < 0) {
    return { ok: false, error: 'negative', message: ERROR_MESSAGES.negative };
  }
  if (value > MAX_AREA_VALUE) {
    return { ok: false, error: 'too-large', message: ERROR_MESSAGES['too-large'] };
  }
  return { ok: true, value };
}

/**
 * 부동소수점 오차를 줄인 반올림.
 * `(1.005).toFixed(2)`가 `1.00`이 되는 문제를 피하기 위해 지수 표기로 자리를 옮긴다.
 */
export function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return NaN;
  const shifted = Number(`${value}e${decimals}`);
  if (!Number.isFinite(shifted)) return Number(value.toFixed(decimals));
  return Number(`${Math.round(shifted)}e${-decimals}`);
}

/** 제곱미터 → 평. */
export function m2ToPyeong(m2: number, decimals = 2): number {
  return roundTo(m2 / M2_PER_PYEONG, decimals);
}

/** 평 → 제곱미터. */
export function pyeongToM2(pyeong: number, decimals = 2): number {
  return roundTo(pyeong * M2_PER_PYEONG, decimals);
}

/** 화면 표시용 숫자 포매팅 (천 단위 구분, 불필요한 0 제거). */
export function formatAreaNumber(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '-';
  return value.toLocaleString('ko-KR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}
