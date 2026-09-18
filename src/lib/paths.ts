/**
 * 배포 경로 해석.
 *
 * 이 서비스는 `/`, `/minwon/guide/`, 개발 서버 등 어디에 올려도 동작해야 하고
 * 코드에 특정 도메인·경로를 하드코딩하지 않아야 한다.
 * 그래서 번들된 스크립트 자신의 위치(`import.meta.url`)에서 앱 루트를 역산한다.
 *
 * - 빌드 산출물: `…/minwon/guide/assets/index-abc123.js` → 루트 `…/minwon/guide/`
 * - 개발 서버:   `…/src/lib/paths.ts`                    → 루트 `…/`
 */
function computeAppRoot(): string {
  try {
    // 번들러가 이 URL을 빌드 시점에 확정하지 않도록 둔다 (런타임 위치를 그대로 써야 한다).
    const here = new URL(/* @vite-ignore */ '.', import.meta.url).href;
    return here.replace(/(?:assets|src\/lib)\/$/, '');
  } catch {
    // import.meta.url을 쓸 수 없는 환경에서는 문서 기준 상대경로로 되돌린다.
    return typeof document === 'undefined' ? './' : document.baseURI;
  }
}

let cachedRoot: string | null = null;

/** 앱 루트 절대 URL (항상 `/`로 끝난다). */
export function appRoot(): string {
  cachedRoot ??= computeAppRoot();
  return cachedRoot;
}

/** 앱 루트 기준 상대경로를 절대 URL로 바꾼다. */
export function resolveAppUrl(relativePath: string): string {
  const clean = relativePath.replace(/^\.?\//, '');
  try {
    return new URL(clean, appRoot()).href;
  } catch {
    return `./${clean}`;
  }
}
