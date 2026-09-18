import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * 공식 배포본(dist)을 하위 경로에 올린 상태에서 검사한다.
 * playwright.config.ts 의 baseURL 이 `/minwon/guide/` 이다.
 */

const ROUTES = [
  { hash: '#/', name: '처음 화면' },
  { hash: '#/search?q=%EB%93%B1%EB%B3%B8', name: '민원 검색 결과' },
  { hash: '#/minwon/resident-registration-copy', name: '민원 상세' },
  { hash: '#/terms', name: '행정용어' },
  { hash: '#/address', name: '주소 검색' },
  { hash: '#/area', name: '면적 환산' },
  { hash: '#/office', name: '민원실 안내' },
];

test.describe('하위 경로 배포', () => {
  test('/minwon/guide/ 에서 정상 동작한다', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByRole('heading', { name: '무엇을 도와드릴까요?', level: 1 })).toBeVisible();
    await expect(page.getByRole('banner').getByText('충주시 민원안내')).toBeVisible();
  });

  test('외부 도메인으로 네트워크 요청을 보내지 않는다', async ({ page }) => {
    const external: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.hostname !== '127.0.0.1' && url.protocol !== 'data:') external.push(request.url());
    });
    await page.goto('./#/address');
    await page.getByLabel('주소·지번 검색').fill('연수동 123-4');
    await page.getByRole('button', { name: '주소 검색' }).click();
    await expect(page.getByText('개발용로 25')).toBeVisible();
    expect(external).toEqual([]);
  });

  test('주소 인덱스를 상대경로로 받아 온다', async ({ page }) => {
    const urls: string[] = [];
    page.on('request', (r) => urls.push(r.url()));
    await page.goto('./#/address');
    await page.getByLabel('주소·지번 검색').fill('연수동');
    await page.getByRole('button', { name: '주소 검색' }).click();
    await expect(page.getByText(/정확히 일치하는 주소/)).toBeVisible();
    expect(urls.some((u) => u.includes('/minwon/guide/data/address-index.json'))).toBe(true);
  });
});

test.describe('공식 배포본 구분', () => {
  test('개발·검토용 배너가 없다', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('.dev-banner')).toHaveCount(0);
    await expect(page.getByText('개발·검토용 비공식 페이지')).toHaveCount(0);
  });

  test('문서 제목에 개발용 표시가 없다', async ({ page }) => {
    await page.goto('./');
    await expect(page).toHaveTitle('충주시 민원안내');
  });

  test('미승인 콘텐츠가 노출되지 않는다', async ({ page }) => {
    await page.goto('./#/search?q=%EC%9D%B8%EA%B0%90'); // "인감"
    await expect(page.getByRole('link', { name: /인감증명서 발급/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /인감신고/ })).toBeVisible();
  });
});

test.describe('접근성 자동검사 (axe)', () => {
  for (const route of ROUTES) {
    test(`${route.name} 위반 없음`, async ({ page }) => {
      await page.goto(`./${route.hash}`);
      await expect(page.locator('#page-heading')).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        // 기본적으로 꺼져 있는 실험 규칙 중, 공공 웹서비스에서 중요한 것을 켠다.
        .options({
          rules: {
            'label-content-name-mismatch': { enabled: true }, // WCAG 2.5.3 레이블과 이름 일치
            'focus-order-semantics': { enabled: true },
          },
        })
        .analyze();
      expect(
        results.violations.map((v) => `${v.id}: ${v.nodes.length}건 — ${v.help}`),
      ).toEqual([]);
    });
  }
});

test.describe('키보드 탐색', () => {
  test('첫 Tab 으로 본문 바로가기에 도달하고 본문으로 이동한다', async ({ page }) => {
    await page.goto('./');
    await page.keyboard.press('Tab');
    const skip = page.locator('.skip-link');
    await expect(skip).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main$/);
  });

  test('키보드만으로 민원 상세까지 이동할 수 있다', async ({ page }) => {
    await page.goto('./');
    const firstItem = page.locator('.card-list .item-link').first();
    const title = (await firstItem.locator('.item-title').innerText()).trim();
    await firstItem.focus();
    await expect(firstItem).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(title);
  });

  test('키보드만으로 검색을 실행할 수 있다', async ({ page }) => {
    await page.goto('./');
    const input = page.getByRole('searchbox', { name: '민원 검색' });
    await input.focus();
    await input.pressSequentially('전입신고');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#\/search\?q=/);
    await expect(page.locator('a[href="#/minwon/moving-report"]')).toBeVisible();
  });

  test('용어 모달이 포커스를 가두고 Esc 로 닫히며 포커스가 복귀한다', async ({ page }) => {
    await page.goto('./#/terms');
    const trigger = page.locator('.card-list .item-link').first();
    await trigger.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('button', { name: '닫기' })).toBeFocused();

    // Tab 을 여러 번 눌러도 포커스가 모달 밖으로 나가지 않는다.
    for (let i = 0; i < 8; i += 1) await page.keyboard.press('Tab');
    expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
});

test.describe('민원 상세 표기', () => {
  test('전입세대확인서는 방문 신청만 가능으로 표시된다', async ({ page }) => {
    await page.goto('./#/minwon/household-move-in-confirmation');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('전입세대확인서');
    await expect(page.getByText('방문 신청만 가능').first()).toBeVisible();
    await expect(page.getByRole('link', { name: /온라인 발급/ })).toHaveCount(0);
  });

  test('외부 링크에 이동 대상 기관과 새 창 안내가 있다', async ({ page }) => {
    await page.goto('./#/minwon/resident-registration-copy');
    const link = page.getByRole('link', { name: /정부24 · 새 창으로 열림/ });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(link).toHaveAttribute('target', '_blank');
  });

  test('콘텐츠 출처와 최종 확인일을 보여 준다', async ({ page }) => {
    await page.goto('./#/minwon/resident-registration-copy');
    await expect(page.getByText('콘텐츠 최종 확인일')).toBeVisible();
    await expect(page.getByText('2026-09-18').first()).toBeVisible();
  });
});

test.describe('주소 검색 화면', () => {
  test('숫자만 입력하면 지역명을 요청한다', async ({ page }) => {
    await page.goto('./#/address');
    await page.getByLabel('주소·지번 검색').fill('123');
    await page.getByRole('button', { name: '주소 검색' }).click();
    await expect(page.getByText('지역명을 함께 입력해 주세요')).toBeVisible();
  });

  test('무관한 숫자가 결과에 섞이지 않는다', async ({ page }) => {
    await page.goto('./#/address');
    await page.getByLabel('주소·지번 검색').fill('연수동 12');
    await page.getByRole('button', { name: '주소 검색' }).click();
    await expect(page.getByText(/정확히 일치하는 주소/)).toBeVisible();
    const cards = page.locator('.address-card:not(.similar)');
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText('연수동 12');
  });

  test('결과 변경이 aria-live 영역에서 일어난다', async ({ page }) => {
    await page.goto('./#/address');
    const region = page.locator('#address-results');
    await expect(region).toHaveAttribute('aria-live', 'polite');
  });
});

test.describe('면적 환산', () => {
  test('㎡ 를 평으로 바꾼다', async ({ page }) => {
    await page.goto('./#/area');
    await page.getByLabel(/면적 입력/).fill('84.95');
    await expect(page.locator('.calc-result .value')).toContainText('25.7 평');
  });

  test('방향을 바꾸면 평을 ㎡ 로 바꾼다', async ({ page }) => {
    await page.goto('./#/area');
    await page.getByLabel('평 → ㎡').check();
    await page.getByLabel(/면적 입력/).fill('10');
    await expect(page.locator('.calc-result .value')).toContainText('33.06 ㎡');
  });

  test('숫자가 아닌 입력에 구체적인 오류 메시지를 보여 준다', async ({ page }) => {
    await page.goto('./#/area');
    const input = page.getByLabel(/면적 입력/);
    await input.fill('백평');
    await expect(page.getByRole('alert')).toContainText('숫자만 입력할 수 있습니다');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  test('음수를 거부한다', async ({ page }) => {
    await page.goto('./#/area');
    await page.getByLabel(/면적 입력/).fill('-5');
    await expect(page.getByRole('alert')).toContainText('0보다 큰 값');
  });
});

test.describe('검색 결과 안내', () => {
  test('결과가 없으면 원인을 알 수 있는 안내를 보여 준다', async ({ page }) => {
    await page.goto('./#/search?q=%EC%9A%B0%EC%A3%BC%EC%84%A0'); // "우주선"
    await expect(page.getByText(/결과가 없습니다/)).toBeVisible();
    await expect(page.getByText('이런 민원을 찾으시나요?')).toBeVisible();
  });

  test('검색 결과 영역이 aria-live 다', async ({ page }) => {
    await page.goto('./#/search?q=%EB%93%B1%EB%B3%B8');
    await expect(page.locator('#search-results')).toHaveAttribute('aria-live', 'polite');
  });
});

test.describe('레이아웃', () => {
  test('가로 스크롤이 생기지 않는다', async ({ page }) => {
    for (const route of ROUTES) {
      await page.goto(`./${route.hash}`);
      await expect(page.locator('#page-heading')).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${route.name} 에서 가로 스크롤 발생`).toBeLessThanOrEqual(1);
    }
  });

  test('200% 확대에서도 내용이 잘리지 않는다', async ({ page }) => {
    await page.goto('./');
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '32px';
    });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('주요 조작 요소의 터치 영역이 충분하다', async ({ page }) => {
    await page.goto('./');
    const targets = page.locator('.tile, .item-link, .btn');
    const count = await targets.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i += 1) {
      const box = await targets.nth(i).boundingBox();
      if (!box) continue;
      expect(box.height, `요소 ${i} 높이 부족`).toBeGreaterThanOrEqual(44);
    }
  });
});
