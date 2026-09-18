import { el, externalLink } from '../lib/dom.ts';
import { searchMinwon } from '../lib/minwon-search.ts';
import { navigate, routeToHash } from '../lib/router.ts';
import type { MinwonDataset, MinwonItem } from '../types/index.ts';
import { minwonListItem } from './home.ts';
import { backLink, pageTitle } from './layout.ts';
import { createSearchBox } from './search-box.ts';
import {
  channelText,
  onlineStatusBadge,
  onlineStatusInfo,
  reviewStatusBadge,
  sampleBadge,
  valueOrPending,
} from './status.ts';

/** 검색 결과 화면. */
export function renderSearch(items: readonly MinwonItem[], query: string): HTMLElement {
  const resultsRegion = el('div', {
    id: 'search-results',
    role: 'region',
    'aria-live': 'polite',
    'aria-atomic': 'false',
    'aria-labelledby': 'results-heading',
  });

  const searchBox = createSearchBox({
    id: 'result-search',
    label: '민원 검색',
    hint: '민원 이름, 평소 부르는 말, 관련 낱말로 찾을 수 있습니다.',
    placeholder: '예: 전입신고',
    initialValue: query,
    withVoice: true,
    onSubmit: (next) => navigate({ name: 'search', query: next.trim() }),
  });

  renderResults(resultsRegion, items, query);

  return el('div', {}, [
    backLink({ name: 'home' }, '처음 화면으로'),
    pageTitle('민원 검색'),
    searchBox.element,
    el('h2', { id: 'results-heading', class: 'visually-hidden' }, ['검색 결과']),
    resultsRegion,
  ]);
}

function renderResults(
  container: HTMLElement,
  items: readonly MinwonItem[],
  query: string,
): void {
  const outcome = searchMinwon(items, query);

  switch (outcome.kind) {
    case 'idle':
      container.replaceChildren(
        el('div', { class: 'notice notice-info' }, [
          el('strong', { class: 'notice-title' }, ['검색어를 입력해 주세요']),
          '찾으시는 민원 이름이나 평소 부르는 말을 입력하면 관련 민원을 보여 드립니다. 예: 등본, 이사, 토지대장',
        ]),
      );
      return;

    case 'too-short':
      container.replaceChildren(
        el('div', { class: 'notice notice-warn' }, [
          el('strong', { class: 'notice-title' }, ['검색어가 너무 짧습니다']),
          `${outcome.minLength}글자 이상 입력해 주세요. 공백과 기호는 글자 수에서 제외됩니다.`,
        ]),
      );
      return;

    case 'empty':
      container.replaceChildren(
        el('div', { class: 'notice notice-warn' }, [
          el('strong', { class: 'notice-title' }, [`"${outcome.query}"에 대한 결과가 없습니다`]),
          el('ul', {}, [
            el('li', {}, ['민원 이름의 일부만 입력해 보세요. 예: "주민등록등본" 대신 "등본"']),
            el('li', {}, ['띄어쓰기를 바꾸어 보세요. 띄어쓰기는 검색에 영향을 주지 않습니다.']),
            el('li', {}, ['아직 등록되지 않은 민원일 수 있습니다. 정부24에서 함께 확인해 주세요.']),
          ]),
        ]),
        el('h3', {}, ['이런 민원을 찾으시나요?']),
        el('ul', { class: 'card-list' }, outcome.suggestions.map(minwonListItem)),
      );
      return;

    case 'ok':
      container.replaceChildren(
        el('p', { class: 'result-meta' }, [`검색 결과 ${outcome.hits.length}건`]),
        el(
          'ul',
          { class: 'card-list' },
          outcome.hits.map((hit) => {
            const node = minwonListItem(hit.item);
            if (!hit.matchedOn.includes('민원명')) {
              node
                .querySelector('.item-link')
                ?.appendChild(
                  el('span', { class: 'section-note' }, [`${hit.matchedOn.join(', ')}에서 찾음`]),
                );
            }
            return node;
          }),
        ),
      );
  }
}

/** 분야별 목록 화면. */
export function renderCategory(items: readonly MinwonItem[], category: string): HTMLElement {
  const matched = items.filter((item) => item.category === category);
  return el('div', {}, [
    backLink({ name: 'home' }, '처음 화면으로'),
    pageTitle(`${category} 민원`, `${matched.length}건`),
    matched.length === 0
      ? el('div', { class: 'notice notice-warn' }, [
          '이 분야에 등록된 민원이 없습니다. 처음 화면에서 다른 분야를 선택해 주세요.',
        ])
      : el('ul', { class: 'card-list' }, matched.map(minwonListItem)),
  ]);
}

function documentList(values: readonly string[]): HTMLElement {
  if (values.length === 0) {
    return el('span', { class: 'pending-value' }, [
      '확인 필요 — 공식 안내 페이지 또는 담당부서에서 확인해 주세요.',
    ]);
  }
  return el('ul', {}, values.map((value) => el('li', {}, [value])));
}

/** 민원 상세 화면. */
export function renderDetail(
  items: readonly MinwonItem[],
  dataset: MinwonDataset,
  id: string,
): HTMLElement {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) {
    return el('div', {}, [
      backLink({ name: 'home' }, '처음 화면으로'),
      pageTitle('민원을 찾을 수 없습니다'),
      el('div', { class: 'notice notice-warn' }, [
        '주소가 잘못되었거나, 검토 중이어서 공개되지 않은 민원일 수 있습니다. 처음 화면에서 다시 검색해 주세요.',
      ]),
      el('p', {}, [el('a', { class: 'btn', href: routeToHash({ name: 'home' }) }, ['처음 화면으로'])]),
    ]);
  }

  const online = onlineStatusInfo(item.onlineStatus);

  const actions: HTMLElement[] = [];
  if (item.officialUrl) {
    actions.push(
      externalLink({
        href: item.officialUrl,
        label:
          item.onlineStatus === 'online-issue'
            ? '온라인 발급 페이지 열기'
            : item.onlineStatus === 'online-apply'
              ? '온라인 신청 페이지 열기'
              : '공식 안내 확인하기',
        organization: item.officialUrlOrganization || '공식 사이트',
        className: 'btn btn-outline',
      }),
    );
  } else {
    actions.push(
      el('div', { class: 'notice notice-warn' }, [
        el('strong', { class: 'notice-title' }, ['공식 안내 페이지 미확정']),
        '이 민원의 공식 안내 페이지 주소를 확인하지 못했습니다. 정부24에서 민원명을 검색하거나 담당 창구에 문의해 주세요.',
      ]),
    );
  }

  return el('div', {}, [
    backLink({ name: 'category', category: item.category }, `${item.category} 목록으로`),
    pageTitle(item.title, item.summary),

    el('div', { class: 'badge-row' }, [
      onlineStatusBadge(item.onlineStatus),
      reviewStatusBadge(item.reviewStatus),
      item.isSample ? sampleBadge() : null,
    ]),

    el('div', { class: 'notice notice-info' }, [
      el('strong', { class: 'notice-title' }, [`신청방법: ${online.label}`]),
      online.detail,
    ]),

    item.reviewStatus !== 'approved'
      ? el('div', { class: 'notice notice-alert' }, [
          el('strong', { class: 'notice-title' }, ['담당자 확인 전 콘텐츠입니다']),
          '이 항목은 아직 충주시 담당부서 확인을 거치지 않았습니다. 공식 배포본에는 표시되지 않습니다.',
        ])
      : null,

    el('div', { class: 'card' }, [
      el('dl', { class: 'detail-list' }, [
        el('div', {}, [
          el('dt', {}, ['신청 경로']),
          el('dd', {}, [channelText(item.applicationChannel)]),
        ]),
        el('div', {}, [
          el('dt', {}, ['담당 창구 또는 기관']),
          el('dd', {}, [valueOrPending(item.location, item, 'location')]),
        ]),
        el('div', {}, [
          el('dt', {}, ['준비서류']),
          el('dd', {}, [
            documentList(item.requiredDocuments),
            item.unverifiedFields.includes('requiredDocuments') && item.requiredDocuments.length > 0
              ? el('p', { class: 'pending-value' }, [
                  '민원별 추가 서류가 있을 수 있습니다. 공식 안내 페이지에서 확인해 주세요.',
                ])
              : null,
          ]),
        ]),
        el('div', {}, [
          el('dt', {}, ['수수료']),
          el('dd', {}, [valueOrPending(item.fee, item, 'fee')]),
        ]),
        el('div', {}, [
          el('dt', {}, ['처리기간']),
          el('dd', {}, [valueOrPending(item.processingTime, item, 'processingTime')]),
        ]),
        el('div', {}, [
          el('dt', {}, ['신청 자격 · 유의사항']),
          el('dd', {}, [documentList(item.eligibility)]),
        ]),
        el('div', {}, [
          el('dt', {}, ['문의처']),
          el('dd', {}, [valueOrPending(item.contact, item, 'contact')]),
        ]),
        el('div', {}, [
          el('dt', {}, ['다른 이름']),
          el('dd', {}, [item.aliases.length > 0 ? item.aliases.join(', ') : '-']),
        ]),
      ]),
    ]),

    el('div', { class: 'card' }, [el('h2', {}, ['공식 안내']), ...actions]),

    el('div', { class: 'card' }, [
      el('h2', {}, ['콘텐츠 출처']),
      el('dl', { class: 'detail-list' }, [
        el('div', {}, [
          el('dt', {}, ['공식 출처']),
          el('dd', {}, [
            item.sourceUrl
              ? el('a', { href: item.sourceUrl, target: '_blank', rel: 'noopener noreferrer' }, [
                  item.sourceUrl,
                ])
              : el('span', { class: 'pending-value' }, ['출처 미확인']),
          ]),
        ]),
        el('div', {}, [
          el('dt', {}, ['콘텐츠 최종 확인일']),
          el('dd', {}, [item.verifiedAt || el('span', { class: 'pending-value' }, ['미확인'])]),
        ]),
        el('div', {}, [
          el('dt', {}, ['담당부서 확인 필요 여부']),
          el('dd', {}, [item.needsDepartmentCheck ? '필요' : '해당 없음']),
        ]),
      ]),
      dataset.isSample
        ? el('p', { class: 'section-note' }, [
            '이 콘텐츠는 시범 데이터입니다. 충주시 담당부서 확인 후 정식 콘텐츠로 교체해야 합니다.',
          ])
        : null,
    ]),
  ]);
}
