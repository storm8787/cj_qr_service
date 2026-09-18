import { defineConfig, devices } from '@playwright/test';

/**
 * 공식 배포본(dist)을 하위 경로(/minwon/guide/)에 올린 상태로 검사한다.
 * 실제 운영 환경과 같은 조건(상대경로, 하위 디렉터리)에서 동작을 확인하기 위해서다.
 */
const PORT = 4173;
const MOUNT = '/minwon/guide';

/**
 * 실행 환경에 이미 설치된 Chromium 을 쓰고 싶을 때 `CHROMIUM_PATH` 로 경로를 넘긴다.
 * (Playwright 가 내려받는 버전과 다른 빌드만 있는 환경 대응)
 */
const launchOptions = process.env.CHROMIUM_PATH
  ? { executablePath: process.env.CHROMIUM_PATH }
  : {};

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}${MOUNT}/`,
    trace: 'retain-on-failure',
    launchOptions,
  },
  projects: [
    {
      name: 'mobile-360',
      use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 740 }, launchOptions },
    },
    {
      name: 'tablet-768',
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 }, launchOptions },
    },
    {
      name: 'desktop-1280',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, launchOptions },
    },
  ],
  webServer: {
    command: `node scripts/serve-static.mjs dist ${PORT} ${MOUNT}`,
    url: `http://127.0.0.1:${PORT}${MOUNT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
