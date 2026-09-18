/**
 * 검색어·색인어 정규화 유틸.
 *
 * 참고 서비스는 `replace(/\s+/g,'').toLowerCase()` 정도만 적용해
 * 하이픈 변형(‑ – — −), 전각 문자, 결합형 한글(NFD)을 서로 다른 문자열로 취급했다.
 * 여기서는 정규화 규칙을 한 곳에 모아 검색 로직과 색인 생성 스크립트가 같은 규칙을 쓰게 한다.
 */

/** 유니코드 하이픈/대시 변형을 ASCII 하이픈으로 통일한다. */
const HYPHEN_VARIANTS = /[‐‑‒–—―−﹘﹣－~]/g;

/** 검색에서 의미가 없는 구두점. 하이픈은 지번 구분자라 제외한다. */
const PUNCTUATION = /[.,·ㆍ/\\()[\]{}'"`^*+?!:;|<>@#$%&=_]/g;

/**
 * 공통 정규화: NFC 결합, 전각→반각, 하이픈 통일, 좌우 공백 제거, 연속 공백 1칸.
 * 대소문자는 소문자로 맞춘다.
 */
export function normalizeText(input: string): string {
  return input
    .normalize('NFKC')
    .replace(HYPHEN_VARIANTS, '-')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 민원명·별칭 비교용 키.
 * 공백과 구두점을 모두 제거해 `가족 관계 증명서`와 `가족관계증명서`를 같게 만든다.
 */
export function toSearchKey(input: string): string {
  return normalizeText(input).replace(PUNCTUATION, '').replace(/[\s-]/g, '');
}

/** 공백으로 분리된 토큰 목록. 빈 토큰은 제거한다. */
export function tokenize(input: string): string[] {
  const normalized = normalizeText(input).replace(PUNCTUATION, ' ');
  return normalized.split(/\s+/).filter((token) => token.length > 0);
}

/** 문자열이 숫자(또는 `본번-부번`)만으로 이루어졌는지 확인한다. */
export function isNumericToken(token: string): boolean {
  return /^\d+(-\d+)?$/.test(token);
}

/** 한글 음절이 하나라도 들어 있는지 확인한다. */
export function hasHangul(input: string): boolean {
  return /[가-힣ᄀ-ᇿ㄰-㆏]/.test(input);
}
