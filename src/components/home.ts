import officialLinks from '../data/official-links.json';
import { chevronIcon, el, externalLink } from '../lib/dom.ts';
import { groupByCategory } from '../lib/minwon-search.ts';
import { navigate, routeToHash } from '../lib/router.ts';
import type { MinwonDataset, MinwonItem, OfficialLink } from '../types/index.ts';
import { pageTitle } from './layout.ts';
import { createSearchBox } from './search-box.ts';
import { onlineStatusBadge, sampleBadge } from './status.ts';

const links = officialLinks.items as OfficialLink[];

function minwonListItem(item: MinwonItem): HTMLElement {
  return el('li', {}, [
    el('a', { class: 'item-link', href: routeToHash({ name: 'detail', id: item.id }) }, [
      el('span', { class: 'item-title' }, [item.title, chevronIcon()]),
      el('span', { class: 'item-summary' }, [item.summary]),
      el('span', { class: 'badge-row' }, [
        onlineStatusBadge(item.onlineStatus),
        el('span', { class: 'badge badge-visit' }, [item.category]),
      ]),
    ]),
  ]);
}

export function renderHome(items: readonly MinwonItem[], dataset: MinwonDataset): HTMLElement {
  const featured = dataset.featuredIds
    ? dataset.featuredIds
        .map((id) => items.find((item) => item.id === id))
        .filter((item): item is MinwonItem => item !== undefined)
    : items.slice(0, 6);

  const searchBox = createSearchBox({
    id: 'home-search',
    label: '민원 검색',
    hint: '민원 이름이나 평소 부르는 말로 찾을 수 있습니다. 예: 등본, 전입신고, 토지대장',
    placeholder: '예: 주민등록등본',
    withVoice: true,
    onSubmit: (query) => navigate({ name: 'search', query: query.trim() }),
  });

  const categories = groupByCategory(items);

  return el('div', {}, [
    pageTitle('무엇을 도와드릴까요?', '찾으시는 민원을 검색하거나 아래 목록에서 골라 주세요.'),

    el('section', { 'aria-labelledby': 'search-heading' }, [
      el('h2', { id: 'search-heading', class: 'visually-hidden' }, ['민원 검색하기']),
      searchBox.element,
    ]),

    el('section', { 'aria-labelledby': 'featured-heading' }, [
      el('div', { class: 'section-head' }, [
        el('h2', { id: 'featured-heading' }, ['자주 찾는 민원']),
      ]),
      el('ul', { class: 'card-list' }, featured.map(minwonListItem)),
    ]),

    el('section', { 'aria-labelledby': 'category-heading' }, [
      el('div', { class: 'section-head' }, [el('h2', { id: 'category-heading' }, ['분야별 민원'])]),
      el(
        'div',
        { class: 'chip-row' },
        categories.map((group) =>
          el('a', { class: 'chip', href: routeToHash({ name: 'category', category: group.category }) }, [
            `${group.category} (${group.items.length})`,
          ]),
        ),
      ),
    ]),

    el('section', { 'aria-labelledby': 'tools-heading' }, [
      el('div', { class: 'section-head' }, [el('h2', { id: 'tools-heading' }, ['도움 기능'])]),
      el('div', { class: 'tile-grid' }, [
        el('a', { class: 'tile', href: routeToHash({ name: 'office' }) }, [
          '민원실 이용안내',
          el('span', { class: 'tile-desc' }, ['위치 · 운영시간 · 문의처']),
        ]),
        el('a', { class: 'tile', href: routeToHash({ name: 'forms' }) }, [
          '민원서식 안내',
          el('span', { class: 'tile-desc' }, ['기재 항목 · 서식 내려받기']),
        ]),
        el('a', { class: 'tile', href: routeToHash({ name: 'terms', query: '' }) }, [
          '행정용어 찾기',
          el('span', { class: 'tile-desc' }, ['어려운 말 쉽게 보기']),
        ]),
        el('a', { class: 'tile', href: routeToHash({ name: 'address' }) }, [
          '주소·지번 검색',
          el('span', { class: 'tile-desc' }, ['지번 · 도로명 찾기']),
        ]),
        el('a', { class: 'tile', href: routeToHash({ name: 'area' }) }, [
          '면적 환산',
          el('span', { class: 'tile-desc' }, ['㎡ ↔ 평 계산']),
        ]),
      ]),
    ]),

    el('section', { 'aria-labelledby': 'links-heading' }, [
      el('div', { class: 'section-head' }, [el('h2', { id: 'links-heading' }, ['공식 사이트 바로가기'])]),
      el(
        'ul',
        { class: 'card-list' },
        links.map((link) =>
          el('li', {}, [
            externalLink({
              href: link.url,
              label: link.label,
              organization: link.organization,
              className: 'item-link',
            }),
            el('p', { class: 'section-note' }, [link.description]),
          ]),
        ),
      ),
    ]),

    dataset.isSample
      ? el('section', { 'aria-labelledby': 'sample-heading' }, [
          el('div', { class: 'notice notice-warn' }, [
            el('strong', { class: 'notice-title', id: 'sample-heading' }, ['시범 콘텐츠 안내']),
            dataset.notice,
          ]),
        ])
      : null,

    el('p', { class: 'section-note' }, [
      dataset.isSample ? sampleBadge() : null,
      ` 콘텐츠 최종 갱신일: ${dataset.updatedAt}`,
    ]),
  ]);
}

export { minwonListItem };
