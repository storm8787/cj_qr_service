import { el } from '../lib/dom.ts';
import type { ApplicationChannel, MinwonItem, OnlineStatus, ReviewStatus } from '../types/index.ts';

/**
 * 온라인 처리 상태 표기.
 * 공식 근거 없이 `온라인 발급`이라고 쓰지 않도록 상태별 문구를 고정한다.
 */
const ONLINE_LABELS: Record<OnlineStatus, { label: string; className: string; detail: string }> = {
  'online-issue': {
    label: '온라인 발급',
    className: 'badge-online',
    detail: '공식 사이트에서 온라인으로 발급·출력까지 할 수 있습니다.',
  },
  'online-apply': {
    label: '온라인 신청',
    className: 'badge-online',
    detail: '공식 사이트에서 온라인으로 신청할 수 있습니다. 결과 수령 방법은 민원별로 다릅니다.',
  },
  'info-only': {
    label: '공식 안내 확인',
    className: 'badge-check',
    detail: '온라인에서는 공식 안내만 확인할 수 있습니다.',
  },
  'visit-only': {
    label: '방문 신청만 가능',
    className: 'badge-visit',
    detail: '공식 안내에서 신청방법이 방문으로 안내되는 민원입니다.',
  },
  'check-required': {
    label: '담당기관 확인 필요',
    className: 'badge-check',
    detail: '온라인 처리 가능 여부를 확인하지 못했습니다. 공식 안내 페이지나 담당기관에 확인해 주세요.',
  },
};

const CHANNEL_LABELS: Record<ApplicationChannel, string> = {
  visit: '방문',
  online: '온라인',
  mail: '우편',
  kiosk: '무인민원발급기',
};

const REVIEW_LABELS: Record<ReviewStatus, { label: string; className: string }> = {
  draft: { label: '작성 중', className: 'badge-review' },
  'review-needed': { label: '담당자 확인 필요', className: 'badge-review' },
  approved: { label: '담당자 확인 완료', className: 'badge-online' },
};

export function onlineStatusInfo(status: OnlineStatus) {
  return ONLINE_LABELS[status];
}

export function onlineStatusBadge(status: OnlineStatus): HTMLElement {
  const info = ONLINE_LABELS[status];
  return el('span', { class: `badge ${info.className}` }, [info.label]);
}

export function channelText(channels: readonly ApplicationChannel[]): string {
  if (channels.length === 0) return '확인 필요';
  return channels.map((c) => CHANNEL_LABELS[c]).join(' · ');
}

export function reviewStatusBadge(status: ReviewStatus): HTMLElement {
  const info = REVIEW_LABELS[status];
  return el('span', { class: `badge ${info.className}` }, [`검토: ${info.label}`]);
}

/** 시범(샘플) 콘텐츠 배지. */
export function sampleBadge(): HTMLElement {
  return el('span', { class: 'badge badge-check' }, ['시범 콘텐츠']);
}

/** 값이 비어 있으면 `확인 필요` 문구를, 있으면 값을 돌려준다. */
export function valueOrPending(value: string, item: MinwonItem, field: string): HTMLElement {
  const pending = value.trim().length === 0 || item.unverifiedFields.includes(field);
  if (value.trim().length === 0) {
    return el('span', { class: 'pending-value' }, [
      '확인 필요 — 공식 안내 페이지 또는 담당부서에서 확인해 주세요.',
    ]);
  }
  return el('span', {}, [
    value,
    pending ? el('span', { class: 'pending-value' }, [' (담당부서 확인 필요)']) : null,
  ]);
}
