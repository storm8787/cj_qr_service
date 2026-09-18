import formsData from '../data/forms.json';
import { chevronIcon, el } from '../lib/dom.ts';
import { resolveAppUrl } from '../lib/paths.ts';
import { routeToHash } from '../lib/router.ts';
import type { MinwonForm, MinwonItem } from '../types/index.ts';
import { backLink, pageTitle } from './layout.ts';

const allForms = formsData.items as MinwonForm[];

/** 공식 배포본에는 담당자 확인을 마친 서식만 노출한다. */
export const forms: MinwonForm[] = allForms.filter((form) => form.reviewStatus === 'approved');

export function formsForMinwon(minwonId: string): MinwonForm[] {
  return forms.filter((form) => form.relatedMinwonIds.includes(minwonId));
}

function formatSize(bytes: number): string {
  return `${Math.round(bytes / 1024).toLocaleString('ko-KR')}KB`;
}

/** 서식 근거 한 줄. 별지서식은 법령의 일부이므로 이것이 곧 출처다. */
function citation(form: MinwonForm): string {
  return `${form.law} ${form.formNumber} · 개정 ${form.revisedAt}`;
}

/**
 * HWPX 내려받기 링크.
 * `download` 속성을 붙여 브라우저가 파일로 저장하게 한다.
 */
export function downloadLink(form: MinwonForm, className = 'btn btn-outline'): HTMLAnchorElement {
  const fileName = form.file.split('/').pop() ?? 'form.hwpx';
  return el(
    'a',
    { class: className, href: resolveAppUrl(form.file), download: fileName, type: 'application/vnd.hancom.hwpx' },
    [
      el('span', { class: 'btn-label' }, [
        el('span', { class: 'btn-text' }, ['서식 파일 내려받기']),
        el('span', { class: 'btn-meta' }, [
          `HWPX · ${formatSize(form.fileSizeBytes)} · ${form.pageCount}쪽`,
        ]),
      ]),
    ],
  ) as HTMLAnchorElement;
}

function formListItem(form: MinwonForm): HTMLElement {
  return el('li', {}, [
    el('a', { class: 'item-link', href: routeToHash({ name: 'form', id: form.id }) }, [
      el('span', { class: 'item-title' }, [form.title, chevronIcon()]),
      el('span', { class: 'item-summary' }, [form.summary]),
      el('span', { class: 'badge-row' }, [
        el('span', { class: 'badge badge-visit' }, [form.formNumber]),
        form.processingTime ? el('span', { class: 'badge badge-online' }, [`처리 ${form.processingTime}`]) : null,
      ]),
    ]),
  ]);
}

/** 서식 목록 화면. */
export function renderForms(): HTMLElement {
  return el('div', {}, [
    backLink({ name: 'home' }, '처음 화면으로'),
    pageTitle('민원서식 안내', '자주 쓰는 신청서의 기재 항목을 미리 보고, 서식 파일을 내려받을 수 있습니다.'),

    el('div', { class: 'notice notice-info' }, [
      el('strong', { class: 'notice-title' }, ['서식 출처']),
      formsData.notice,
    ]),

    el('ul', { class: 'card-list' }, forms.map(formListItem)),
  ]);
}

function sectionCard(section: MinwonForm['sections'][number]): HTMLElement {
  return el('div', { class: 'card' }, [
    el('h3', {}, [section.title]),
    el('ul', {}, section.fields.map((field) => el('li', {}, [field]))),
  ]);
}

/** 서식 상세 화면. */
export function renderFormDetail(id: string, items: readonly MinwonItem[]): HTMLElement {
  const form = forms.find((candidate) => candidate.id === id);
  if (!form) {
    return el('div', {}, [
      backLink({ name: 'forms' }, '민원서식 목록으로'),
      pageTitle('서식을 찾을 수 없습니다'),
      el('div', { class: 'notice notice-warn' }, [
        '주소가 잘못되었거나, 검토 중이어서 공개되지 않은 서식일 수 있습니다.',
      ]),
    ]);
  }

  const related = form.relatedMinwonIds
    .map((minwonId) => items.find((item) => item.id === minwonId))
    .filter((item): item is MinwonItem => item !== undefined);

  return el('div', {}, [
    backLink({ name: 'forms' }, '민원서식 목록으로'),
    pageTitle(form.title, form.summary),

    el('div', { class: 'badge-row' }, [
      el('span', { class: 'badge badge-visit' }, [form.formNumber]),
      el('span', { class: 'badge badge-online' }, [`개정 ${form.revisedAt}`]),
      form.processingTime ? el('span', { class: 'badge badge-online' }, [`처리기간 ${form.processingTime}`]) : null,
    ]),

    el('div', { class: 'card' }, [
      el('h2', {}, ['서식 내려받기']),
      downloadLink(form),
      el('p', { class: 'section-note' }, [
        'HWPX 파일입니다. 한글 프로그램이나 한컴오피스 뷰어에서 열 수 있습니다. ' +
          '파일을 열 수 없으면 아래 기재 항목을 보고 창구에 비치된 서식에 직접 적으셔도 됩니다.',
      ]),
    ]),

    el('section', { 'aria-labelledby': 'form-fields-heading' }, [
      el('h2', { id: 'form-fields-heading' }, ['무엇을 적나요']),
      ...form.sections.map(sectionCard),
    ]),

    form.notices.length > 0
      ? el('section', { 'aria-labelledby': 'form-notice-heading' }, [
          el('h2', { id: 'form-notice-heading' }, ['유의사항']),
          el('div', { class: 'notice notice-warn' }, [
            el('ul', {}, form.notices.map((n) => el('li', {}, [n]))),
          ]),
        ])
      : null,

    form.fee || form.feeExemptions.length > 0
      ? el('section', { 'aria-labelledby': 'form-fee-heading' }, [
          el('h2', { id: 'form-fee-heading' }, ['수수료']),
          el('div', { class: 'card' }, [
            form.fee
              ? el('p', {}, [form.fee])
              : el('p', { class: 'pending-value' }, ['서식에 수수료가 적혀 있지 않습니다. 공식 안내 페이지에서 확인해 주세요.']),
            form.feeExemptions.length > 0
              ? el('div', {}, [
                  el('h3', {}, ['수수료 면제 대상']),
                  el('ul', {}, form.feeExemptions.map((x) => el('li', {}, [x]))),
                ])
              : null,
          ]),
        ])
      : null,

    related.length > 0
      ? el('section', { 'aria-labelledby': 'form-related-heading' }, [
          el('h2', { id: 'form-related-heading' }, ['이 서식을 쓰는 민원']),
          el(
            'ul',
            { class: 'card-list' },
            related.map((item) =>
              el('li', {}, [
                el('a', { class: 'item-link', href: routeToHash({ name: 'detail', id: item.id }) }, [
                  el('span', { class: 'item-title' }, [item.title, chevronIcon()]),
                ]),
              ]),
            ),
          ),
        ])
      : null,

    el('div', { class: 'card' }, [
      el('h2', {}, ['서식 출처']),
      el('dl', { class: 'detail-list' }, [
        el('div', {}, [el('dt', {}, ['근거']), el('dd', {}, [citation(form)])]),
        el('div', {}, [
          el('dt', {}, ['법령 확인']),
          el('dd', {}, [
            el('a', { href: form.lawUrl, target: '_blank', rel: 'noopener noreferrer' }, [
              `국가법령정보센터에서 ${form.law} 보기 (새 창으로 열림)`,
            ]),
          ]),
        ]),
        el('div', {}, [el('dt', {}, ['콘텐츠 최종 확인일']), el('dd', {}, [form.verifiedAt])]),
      ]),
      el('p', { class: 'section-note' }, [
        '서식은 개정될 수 있습니다. 제출 전에 국가법령정보센터에서 최신본을 확인해 주세요.',
      ]),
    ]),
  ]);
}

/** 민원 상세에 붙일 "관련 서식" 구역. 관련 서식이 없으면 null. */
export function relatedFormsSection(minwonId: string): HTMLElement | null {
  const related = formsForMinwon(minwonId);
  if (related.length === 0) return null;

  return el('section', { 'aria-labelledby': 'minwon-forms-heading' }, [
    el('h2', { id: 'minwon-forms-heading' }, ['민원서식']),
    el(
      'ul',
      { class: 'card-list' },
      related.map((form) =>
        el('li', {}, [
          el('a', { class: 'item-link', href: routeToHash({ name: 'form', id: form.id }) }, [
            el('span', { class: 'item-title' }, [form.title, chevronIcon()]),
            el('span', { class: 'item-summary' }, [`${citation(form)} — 기재 항목 보기`]),
          ]),
          el('p', { class: 'form-download-row' }, [downloadLink(form, 'btn btn-quiet')]),
        ]),
      ),
    ),
  ]);
}
