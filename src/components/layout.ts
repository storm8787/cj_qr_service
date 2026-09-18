import { BRAND, IS_PREVIEW_CHANNEL } from '../lib/config.ts';
import { backIcon, el } from '../lib/dom.ts';
import { routeToHash, type Route } from '../lib/router.ts';

/**
 * 개발·검토용 배너.
 * `official` 빌드에서는 `IS_PREVIEW_CHANNEL`이 정적 false가 되어
 * 이 함수의 문구가 번들에서 제거된다.
 */
export function devBanner(): HTMLElement | null {
  if (!IS_PREVIEW_CHANNEL) return null;
  return el('div', { class: 'dev-banner', role: 'note' }, [
    el('div', { class: 'container' }, [
      el('strong', {}, ['개발·검토용 비공식 페이지']),
      el('p', {}, [
        '충주시 공식 서비스가 아닙니다. 콘텐츠 검토용 미리보기이며, 이 주소로 QR을 만들지 마세요.',
      ]),
    ]),
  ]);
}

export function siteHeader(): HTMLElement {
  return el('header', { class: 'site-header' }, [
    el('div', { class: 'container' }, [
      el('a', { class: 'brand', href: '#/' }, [
        el('span', { class: 'brand-mark' }, [BRAND.wordmark]),
        el('span', { class: 'brand-sub' }, [BRAND.disclaimer]),
      ]),
    ]),
  ]);
}

export function siteFooter(): HTMLElement {
  return el('footer', { class: 'site-footer' }, [
    el('div', { class: 'container' }, [
      el('p', {}, [
        '이 서비스는 민원 안내만 제공합니다. 주민등록번호·이름·주소·전화번호를 입력받거나 저장하지 않으며, 검색어를 서버로 보내지 않습니다.',
      ]),
      el('p', {}, [
        '표시된 준비서류·수수료·처리기간은 변경될 수 있습니다. 신청 전에 각 민원의 공식 안내 페이지에서 최신 내용을 확인해 주세요.',
      ]),
    ]),
  ]);
}

/** 뒤로 가기 링크. 브라우저 히스토리 대신 명시적 경로를 쓴다. */
export function backLink(route: Route, label: string): HTMLElement {
  return el('a', { class: 'back-link', href: routeToHash(route) }, [backIcon(), label]);
}

/** 페이지 제목 영역. 라우트가 바뀔 때 `h1`으로 포커스를 옮겨 스크린리더에 알린다. */
export function pageTitle(text: string, description?: string): HTMLElement {
  return el('div', { class: 'page-title' }, [
    el('h1', { id: 'page-heading', tabindex: '-1' }, [text]),
    description ? el('p', { class: 'section-note' }, [description]) : null,
  ]);
}
