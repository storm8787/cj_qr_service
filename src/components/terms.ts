import termsData from '../data/terms.json';
import { el } from '../lib/dom.ts';
import { toSearchKey } from '../lib/normalize.ts';
import { navigate } from '../lib/router.ts';
import type { TermItem } from '../types/index.ts';
import { backLink, pageTitle } from './layout.ts';
import { openModal } from './modal.ts';
import { createSearchBox } from './search-box.ts';

const allTerms = termsData.items as TermItem[];

function matches(term: TermItem, query: string): boolean {
  const key = toSearchKey(query);
  if (key.length === 0) return true;
  return (
    toSearchKey(term.term).includes(key) ||
    term.aliases.some((alias) => toSearchKey(alias).includes(key)) ||
    toSearchKey(term.description).includes(key)
  );
}

function termBody(term: TermItem): HTMLElement {
  return el('div', {}, [
    term.description
      ? el('p', {}, [term.description])
      : el('div', { class: 'notice notice-warn' }, [
          el('strong', { class: 'notice-title' }, ['설명을 싣지 않은 이유']),
          term.pendingReason,
        ]),
    el('dl', { class: 'detail-list' }, [
      el('div', {}, [
        el('dt', {}, ['공식 출처']),
        el('dd', {}, [
          term.sourceUrl
            ? el('a', { href: term.sourceUrl, target: '_blank', rel: 'noopener noreferrer' }, [
                term.sourceUrl,
              ])
            : el('span', { class: 'pending-value' }, ['출처 미확인']),
        ]),
      ]),
      el('div', {}, [
        el('dt', {}, ['최종 확인일']),
        el('dd', {}, [term.verifiedAt || el('span', { class: 'pending-value' }, ['미확인'])]),
      ]),
    ]),
  ]);
}

export function renderTerms(query: string): HTMLElement {
  const listRegion = el('div', {
    role: 'region',
    'aria-live': 'polite',
    'aria-labelledby': 'terms-results-heading',
  });

  function draw(currentQuery: string): void {
    const found = allTerms.filter((term) => matches(term, currentQuery));
    if (found.length === 0) {
      listRegion.replaceChildren(
        el('div', { class: 'notice notice-warn' }, [
          el('strong', { class: 'notice-title' }, [`"${currentQuery}"에 해당하는 용어가 없습니다`]),
          '용어의 일부만 입력해 보시거나, 검색창을 비우고 전체 목록에서 찾아 주세요.',
        ]),
      );
      return;
    }

    listRegion.replaceChildren(
      el('p', { class: 'result-meta' }, [`용어 ${found.length}건`]),
      el(
        'ul',
        { class: 'card-list' },
        found.map((term) => {
          const button = el(
            'button',
            { type: 'button', class: 'item-link', 'aria-haspopup': 'dialog' },
            [
              el('span', { class: 'item-title' }, [term.term]),
              el('span', { class: 'item-summary' }, [
                term.description || '설명 준비 중 — 담당부서 확인 필요',
              ]),
            ],
          );
          button.addEventListener('click', () => {
            openModal({ title: term.term, body: termBody(term), returnFocusTo: button });
          });
          return el('li', {}, [button]);
        }),
      ),
    );
  }

  const searchBox = createSearchBox({
    id: 'terms-search',
    label: '행정용어 찾기',
    hint: '민원 서류에서 본 낱말을 입력해 주세요. 예: 지번, 연면적',
    placeholder: '예: 지번',
    initialValue: query,
    submitLabel: '용어 검색',
    onSubmit: (next) => {
      navigate({ name: 'terms', query: next.trim() }, true);
    },
    onInput: (next) => draw(next.trim()),
  });

  draw(query.trim());

  return el('div', {}, [
    backLink({ name: 'home' }, '처음 화면으로'),
    pageTitle('행정용어 찾기', '민원 서류에 나오는 말을 쉬운 말로 설명합니다.'),
    el('div', { class: 'notice notice-info' }, [
      el('strong', { class: 'notice-title' }, ['설명 원칙']),
      termsData.notice,
    ]),
    searchBox.element,
    el('h2', { id: 'terms-results-heading', class: 'visually-hidden' }, ['용어 목록']),
    listRegion,
  ]);
}
