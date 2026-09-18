/** Vite `define`으로 주입되는 빌드 채널. */
declare const __BUILD_CHANNEL__: 'development' | 'preview' | 'official';

export type BuildChannel = 'development' | 'preview' | 'official';

export const BUILD_CHANNEL: BuildChannel = __BUILD_CHANNEL__;

/**
 * 개발·검토용 배너를 노출할지 여부.
 * `official` 빌드에서는 상수가 false로 치환되어 배너 코드와 문구가 번들에서 제거된다.
 */
export const IS_PREVIEW_CHANNEL: boolean = BUILD_CHANNEL !== 'official';

export const SERVICE_NAME = '충주시 민원안내';

/**
 * 공식 최종 URL은 설정값으로 관리한다.
 * 확정되기 전에는 빈 문자열로 두고, 화면에는 노출하지 않으며 QR도 만들지 않는다.
 * 확정 후 이 값만 바꾸고 `npm run package:official`을 다시 실행한다.
 */
export const OFFICIAL_SERVICE_URL = '';

/** 브랜드: 충주시 공식 심벌·색상은 승인 자료가 없으므로 텍스트 기반 임시 브랜드를 쓴다. */
export const BRAND = {
  wordmark: '충주시 민원안내',
  /** 가칭임을 명시 */
  disclaimer: '가칭 · 충주시 공식 명칭과 심벌은 확정 후 적용 예정',
} as const;
