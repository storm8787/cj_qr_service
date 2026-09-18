import { LocalIndexAdapter, pickAdapter, ProxyApiAdapter } from '../lib/address/adapters.ts';
import { formatJibunAddress, formatRoadAddress } from '../lib/address/search.ts';
import type { AddressMatch, AddressSearchAdapter } from '../lib/address/types.ts';
import { el } from '../lib/dom.ts';
import { backLink, pageTitle } from './layout.ts';
import { createSearchBox } from './search-box.ts';

/**
 * 어댑터 선택.
 * 공식 주소 API 프록시가 설정되면 `ProxyApiAdapter`가 먼저 선택되도록 순서만 바꾸면 된다.
 * (현재는 프록시 미설정이라 `isAvailable()`이 false이고 로컬 인덱스가 쓰인다.)
 */
const adapters: AddressSearchAdapter[] = [new ProxyApiAdapter(null), new LocalIndexAdapter()];

function addressCard(match: AddressMatch, similar = false): HTMLElement {
  return el('li', {}, [
    el('div', { class: similar ? 'address-card similar' : 'address-card' }, [
      match.record.buildingName
        ? el('p', { class: 'address-name' }, [match.record.buildingName])
        : null,
      el('p', { class: 'address-line' }, [
        el('span', { class: 'address-label' }, ['도로명']),
        formatRoadAddress(match.record),
      ]),
      el('p', { class: 'address-line' }, [
        el('span', { class: 'address-label' }, ['지번']),
        formatJibunAddress(match.record),
      ]),
      match.record.zipCode
        ? el('p', { class: 'address-line' }, [
            el('span', { class: 'address-label' }, ['우편번호']),
            match.record.zipCode,
          ])
        : null,
      el('p', { class: 'section-note' }, [`일치 조건: ${match.reasons.join(' · ')}`]),
    ]),
  ]);
}

export function renderAddress(): HTMLElement {
  const results = el('div', {
    id: 'address-results',
    role: 'region',
    'aria-live': 'polite',
    'aria-labelledby': 'address-results-heading',
  });

  const datasetNotice = el('div', { class: 'notice notice-warn' }, [
    el('strong', { class: 'notice-title' }, ['개발용 가상 주소 데이터']),
    '현재 검색되는 주소는 검색 규칙을 확인하기 위한 가상 데이터입니다. 충주시 공식 주소 원자료를 확보한 뒤 교체해야 합니다. 교체 방법은 README의 "주소 데이터 교체방법"을 참고해 주세요.',
  ]);

  let requestSeq = 0;

  async function run(query: string): Promise<void> {
    const seq = ++requestSeq;
    const trimmed = query.trim();

    if (trimmed.length === 0) {
      results.replaceChildren(
        el('div', { class: 'notice notice-info' }, [
          el('strong', { class: 'notice-title' }, ['검색어를 입력해 주세요']),
          '지역명과 번지를 함께 입력하면 정확하게 찾을 수 있습니다. 예: 연수동 123-4, 국원대로 1번길 25',
        ]),
      );
      return;
    }

    let outcomeNode: HTMLElement;
    try {
      const adapter = pickAdapter(adapters);
      const { outcome } = await adapter.search(trimmed);
      if (seq !== requestSeq) return;
      outcomeNode = renderOutcome(outcome);
    } catch (error) {
      if (seq !== requestSeq) return;
      const message = error instanceof Error ? error.message : '주소 검색 중 오류가 발생했습니다.';
      outcomeNode = el('div', { class: 'notice notice-alert' }, [
        el('strong', { class: 'notice-title' }, ['주소를 검색할 수 없습니다']),
        message,
      ]);
    }
    results.replaceChildren(outcomeNode);
  }

  const searchBox = createSearchBox({
    id: 'address-search',
    label: '주소·지번 검색',
    hint: '지역명과 번지를 함께 입력해 주세요. 숫자만 입력하면 결과가 너무 많아 찾기 어렵습니다. 예: 연수동 123-4',
    placeholder: '예: 연수동 123-4',
    submitLabel: '주소 검색',
    withVoice: true,
    onSubmit: (query) => {
      void run(query);
    },
  });

  void run('');

  return el('div', {}, [
    backLink({ name: 'home' }, '처음 화면으로'),
    pageTitle('주소·지번 검색', '지역명과 번지를 함께 입력하면 정확한 결과만 보여 드립니다.'),
    datasetNotice,
    searchBox.element,
    el('h2', { id: 'address-results-heading', class: 'visually-hidden' }, ['주소 검색 결과']),
    results,
  ]);
}

function renderOutcome(
  outcome: Awaited<ReturnType<AddressSearchAdapter['search']>>['outcome'],
): HTMLElement {
  switch (outcome.kind) {
    case 'idle':
      return el('div', { class: 'notice notice-info' }, ['검색어를 입력해 주세요.']);

    case 'too-short':
      return el('div', { class: 'notice notice-warn' }, [
        el('strong', { class: 'notice-title' }, ['검색어가 너무 짧습니다']),
        `${outcome.minLength}글자 이상 입력해 주세요.`,
      ]);

    case 'needs-region':
      return el('div', { class: 'notice notice-warn' }, [
        el('strong', { class: 'notice-title' }, ['지역명을 함께 입력해 주세요']),
        `숫자 ${outcome.numbers.join(', ')}만으로는 같은 번지가 지역마다 있어 결과를 좁힐 수 없습니다. ` +
          '읍·면·동 이름이나 도로명을 함께 입력해 주세요. 예: 연수동 123',
      ]);

    case 'needs-narrowing':
      return el('div', {}, [
        el('div', { class: 'notice notice-warn' }, [
          el('strong', { class: 'notice-title' }, [`결과가 ${outcome.total}건으로 너무 많습니다`]),
          '번지(예: 123-4)나 도로명, 건물명을 함께 입력해 조건을 좁혀 주세요.',
        ]),
        el('h3', {}, ['일부 결과 미리보기']),
        el('ul', { class: 'card-list' }, outcome.preview.map((match) => addressCard(match))),
      ]);

    case 'no-exact':
      return el('div', {}, [
        el('div', { class: 'notice notice-warn' }, [
          el('strong', { class: 'notice-title' }, ['정확히 일치하는 주소가 없습니다']),
          outcome.similar.length > 0
            ? '입력하신 번지와 본번이 같은 주소를 아래에 보여 드립니다. 부번(예: -4)을 확인해 주세요.'
            : '지역명 철자와 번지를 다시 확인해 주세요. 지번과 도로명주소는 번호가 다릅니다.',
        ]),
        outcome.similar.length > 0
          ? el('div', {}, [
              el('h3', {}, ['비슷한 주소']),
              el('ul', { class: 'card-list' }, outcome.similar.map((m) => addressCard(m, true))),
            ])
          : null,
      ]);

    case 'ok':
      return el('div', {}, [
        el('p', { class: 'result-meta' }, [
          `정확히 일치하는 주소 ${outcome.total}건` +
            (outcome.exact.length < outcome.total ? ` (${outcome.exact.length}건 표시)` : ''),
        ]),
        el('ul', { class: 'card-list' }, outcome.exact.map((match) => addressCard(match))),
        outcome.similar.length > 0
          ? el('div', {}, [
              el('h3', {}, ['비슷한 주소']),
              el('ul', { class: 'card-list' }, outcome.similar.map((m) => addressCard(m, true))),
            ])
          : null,
      ]);
  }
}
