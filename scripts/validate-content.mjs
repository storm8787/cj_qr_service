#!/usr/bin/env node
/**
 * 콘텐츠 검증.
 *
 *   node scripts/validate-content.mjs            # 형식 검증
 *   node scripts/validate-content.mjs --strict   # 공식 배포 전 검증 (approved 항목 필수조건 포함)
 *
 * `approved` 항목에 출처 URL이나 최종 확인일이 빠져 있으면 빌드를 실패시킨다.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const strict = process.argv.includes('--strict');

const REVIEW_STATUSES = new Set(['draft', 'review-needed', 'approved']);
const ONLINE_STATUSES = new Set([
  'online-apply',
  'online-issue',
  'info-only',
  'visit-only',
  'check-required',
]);
const CHANNELS = new Set(['visit', 'online', 'mail', 'kiosk']);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** 참고 서비스에서 확인된 부정확한 서술이 다시 들어오지 않도록 막는다. */
const FORBIDDEN_CLAIMS = [
  {
    pattern: /1등급이\s*가장\s*(비싸|높)/,
    reason: '토지등급을 가격 순위로 단정하는 설명은 공식 근거가 확인되지 않았습니다.',
  },
  {
    pattern: /숫자가?\s*(클수록|커질수록)\s*(저렴|싸)/,
    reason: '토지등급을 가격 순위로 단정하는 설명은 공식 근거가 확인되지 않았습니다.',
  },
  {
    pattern: /여주시/,
    reason: '참고 서비스(여주시) 관련 표현은 사용하지 않습니다.',
  },
];

const errors = [];
const warnings = [];

function fail(where, message) {
  errors.push(`[오류] ${where}: ${message}`);
}

function warn(where, message) {
  warnings.push(`[확인] ${where}: ${message}`);
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(projectRoot, relativePath), 'utf8'));
}

function checkForbidden(where, text) {
  for (const rule of FORBIDDEN_CLAIMS) {
    if (rule.pattern.test(text)) fail(where, `${rule.reason} (검출: ${rule.pattern})`);
  }
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateMinwon() {
  const data = readJson('src/data/minwon-items.json');
  const { dataset, items } = data;

  if (!dataset || !isNonEmptyString(dataset.name)) fail('dataset', 'name 이 없습니다.');
  if (!DATE.test(dataset?.updatedAt ?? '')) fail('dataset', 'updatedAt 형식이 YYYY-MM-DD 가 아닙니다.');
  if (!Array.isArray(items) || items.length === 0) {
    fail('items', '민원 항목이 없습니다.');
    return { approvedCount: 0, total: 0 };
  }

  const ids = new Set();
  let approvedCount = 0;

  for (const item of items) {
    const where = `민원 "${item.id ?? '(id 없음)'}"`;

    if (!isNonEmptyString(item.id)) fail(where, 'id 가 없습니다.');
    else if (ids.has(item.id)) fail(where, 'id 가 중복됩니다.');
    else ids.add(item.id);

    for (const field of ['category', 'title', 'summary']) {
      if (!isNonEmptyString(item[field])) fail(where, `${field} 가 비어 있습니다.`);
    }
    for (const field of ['aliases', 'keywords', 'requiredDocuments', 'eligibility', 'unverifiedFields']) {
      if (!Array.isArray(item[field])) fail(where, `${field} 가 배열이 아닙니다.`);
    }

    if (!REVIEW_STATUSES.has(item.reviewStatus)) {
      fail(where, `reviewStatus 값이 올바르지 않습니다: ${item.reviewStatus}`);
    }
    if (!ONLINE_STATUSES.has(item.onlineStatus)) {
      fail(where, `onlineStatus 값이 올바르지 않습니다: ${item.onlineStatus}`);
    }
    if (!Array.isArray(item.applicationChannel) || item.applicationChannel.length === 0) {
      fail(where, 'applicationChannel 이 비어 있습니다.');
    } else {
      for (const channel of item.applicationChannel) {
        if (!CHANNELS.has(channel)) fail(where, `applicationChannel 값이 올바르지 않습니다: ${channel}`);
      }
    }

    // 온라인 상태와 신청 경로가 서로 모순되지 않는지 확인한다.
    const hasOnlineChannel = (item.applicationChannel ?? []).includes('online');
    if ((item.onlineStatus === 'online-apply' || item.onlineStatus === 'online-issue') && !hasOnlineChannel) {
      fail(where, `onlineStatus 가 ${item.onlineStatus} 인데 applicationChannel 에 online 이 없습니다.`);
    }
    if (item.onlineStatus === 'visit-only' && hasOnlineChannel) {
      fail(where, 'onlineStatus 가 visit-only 인데 applicationChannel 에 online 이 들어 있습니다.');
    }

    // 값이 비어 있는 필드는 unverifiedFields 에 명시되어야 한다.
    for (const field of ['fee', 'processingTime', 'location', 'contact']) {
      if (!isNonEmptyString(item[field]) && !(item.unverifiedFields ?? []).includes(field)) {
        fail(where, `${field} 가 비어 있는데 unverifiedFields 에 "${field}" 가 없습니다.`);
      }
    }

    checkForbidden(where, JSON.stringify(item));

    if (item.reviewStatus === 'approved') {
      approvedCount += 1;
      if (!isNonEmptyString(item.sourceUrl)) {
        fail(where, 'approved 항목에 공식 출처 URL(sourceUrl)이 없습니다.');
      }
      if (!DATE.test(item.verifiedAt ?? '')) {
        fail(where, 'approved 항목에 최종 확인일(verifiedAt, YYYY-MM-DD)이 없습니다.');
      }
      if (!isNonEmptyString(item.officialUrl)) {
        fail(where, 'approved 항목에 공식 안내 페이지(officialUrl)가 없습니다.');
      }
      if (isNonEmptyString(item.officialUrl) && !isNonEmptyString(item.officialUrlOrganization)) {
        fail(where, '외부 링크가 있으면 이동 대상 기관(officialUrlOrganization)을 표기해야 합니다.');
      }
      for (const url of [item.sourceUrl, item.officialUrl]) {
        if (isNonEmptyString(url) && !url.startsWith('https://')) {
          fail(where, `URL 은 https 여야 합니다: ${url}`);
        }
      }
    } else {
      warn(where, `reviewStatus=${item.reviewStatus} — 공식 배포본에서 제외됩니다.`);
    }
  }

  return { approvedCount, total: items.length };
}

function validateTerms() {
  const data = readJson('src/data/terms.json');
  for (const term of data.items) {
    const where = `용어 "${term.id}"`;
    if (!isNonEmptyString(term.term)) fail(where, 'term 이 비어 있습니다.');
    if (!REVIEW_STATUSES.has(term.reviewStatus)) fail(where, 'reviewStatus 값이 올바르지 않습니다.');
    checkForbidden(where, JSON.stringify(term));

    const hasDescription = isNonEmptyString(term.description);
    if (!hasDescription && !isNonEmptyString(term.pendingReason)) {
      fail(where, '설명이 없으면 pendingReason 으로 이유를 남겨야 합니다.');
    }
    if (term.reviewStatus === 'approved') {
      if (!hasDescription) fail(where, 'approved 인데 설명이 비어 있습니다.');
      if (!isNonEmptyString(term.sourceUrl)) fail(where, 'approved 항목에 sourceUrl 이 없습니다.');
      if (!DATE.test(term.verifiedAt ?? '')) fail(where, 'approved 항목에 verifiedAt 이 없습니다.');
    }
  }
}

function validateOffices() {
  const data = readJson('src/data/offices.json');
  for (const office of data.items) {
    const where = `민원실 "${office.id}"`;
    if (!isNonEmptyString(office.name)) fail(where, 'name 이 비어 있습니다.');
    if (!REVIEW_STATUSES.has(office.reviewStatus)) fail(where, 'reviewStatus 값이 올바르지 않습니다.');
    checkForbidden(where, JSON.stringify(office));
    if (office.reviewStatus === 'approved') {
      if (!isNonEmptyString(office.sourceUrl)) fail(where, 'approved 항목에 sourceUrl 이 없습니다.');
      if (!DATE.test(office.verifiedAt ?? '')) fail(where, 'approved 항목에 verifiedAt 이 없습니다.');
    }
  }
}

/**
 * 민원서식 검증.
 * 별지서식은 법령의 일부이므로 근거 법령·별지 번호·개정일이 곧 출처다.
 * approved 서식은 이 셋과 실제 파일이 모두 있어야 한다.
 */
function validateForms(minwonIds) {
  const data = readJson('src/data/forms.json');
  const ids = new Set();

  for (const form of data.items) {
    const where = `서식 "${form.id ?? '(id 없음)'}"`;

    if (!isNonEmptyString(form.id)) fail(where, 'id 가 없습니다.');
    else if (ids.has(form.id)) fail(where, 'id 가 중복됩니다.');
    else ids.add(form.id);

    for (const field of ['title', 'summary', 'file']) {
      if (!isNonEmptyString(form[field])) fail(where, `${field} 가 비어 있습니다.`);
    }
    for (const field of ['sections', 'notices', 'feeExemptions', 'relatedMinwonIds']) {
      if (!Array.isArray(form[field])) fail(where, `${field} 가 배열이 아닙니다.`);
    }
    if (!REVIEW_STATUSES.has(form.reviewStatus)) {
      fail(where, `reviewStatus 값이 올바르지 않습니다: ${form.reviewStatus}`);
    }

    // 연결된 민원이 실제로 존재해야 한다.
    for (const minwonId of form.relatedMinwonIds ?? []) {
      if (!minwonIds.has(minwonId)) {
        fail(where, `relatedMinwonIds 의 "${minwonId}" 민원이 존재하지 않습니다.`);
      }
    }

    // 서식 파일이 실제로 있어야 하고, 크기가 기록과 맞아야 한다.
    if (isNonEmptyString(form.file)) {
      if (!form.file.endsWith('.hwpx')) fail(where, 'file 은 .hwpx 여야 합니다.');
      const filePath = resolve(projectRoot, 'public', form.file);
      if (!existsSync(filePath)) {
        fail(where, `서식 파일이 없습니다: public/${form.file}`);
      } else {
        const actual = statSync(filePath).size;
        if (form.fileSizeBytes !== actual) {
          fail(where, `fileSizeBytes(${form.fileSizeBytes}) 가 실제 파일 크기(${actual}) 와 다릅니다.`);
        }
      }
    }

    checkForbidden(where, JSON.stringify(form));

    if (form.reviewStatus === 'approved') {
      for (const field of ['law', 'formNumber', 'lawUrl']) {
        if (!isNonEmptyString(form[field])) {
          fail(where, `approved 서식에 ${field} 가 없습니다. 별지서식은 근거 법령이 곧 출처입니다.`);
        }
      }
      if (!DATE.test(form.revisedAt ?? '')) {
        fail(where, 'approved 서식에 개정일(revisedAt, YYYY-MM-DD)이 없습니다.');
      }
      if (!DATE.test(form.verifiedAt ?? '')) {
        fail(where, 'approved 서식에 최종 확인일(verifiedAt)이 없습니다.');
      }
      if (isNonEmptyString(form.lawUrl) && !form.lawUrl.startsWith('https://')) {
        fail(where, `lawUrl 은 https 여야 합니다: ${form.lawUrl}`);
      }
      if ((form.sections ?? []).length === 0) {
        fail(where, 'approved 서식에 기재 항목(sections)이 없습니다.');
      }
    } else {
      warn(where, `reviewStatus=${form.reviewStatus} — 공식 배포본에서 제외됩니다.`);
    }
  }
  return data.items.length;
}

function validateLinks() {
  const data = readJson('src/data/official-links.json');
  for (const link of data.items) {
    const where = `링크 "${link.id}"`;
    if (!isNonEmptyString(link.organization)) {
      fail(where, '외부 링크에는 이동 대상 기관(organization)을 표기해야 합니다.');
    }
    if (!String(link.url ?? '').startsWith('https://')) fail(where, 'URL 은 https 여야 합니다.');
    checkForbidden(where, JSON.stringify(link));
  }
}

const summary = validateMinwon();
validateTerms();
validateOffices();
validateLinks();
const minwonIds = new Set(
  readJson('src/data/minwon-items.json').items.map((item) => item.id),
);
const formCount = validateForms(minwonIds);

if (strict && summary.approvedCount === 0) {
  fail('공식 배포', 'approved 상태의 민원이 한 건도 없습니다. 공식 배포본이 비어 있게 됩니다.');
}

for (const line of warnings) console.warn(line);
for (const line of errors) console.error(line);

console.log(
  `콘텐츠 검증 ${errors.length === 0 ? '통과' : '실패'} — ` +
    `민원 ${summary.total}건 중 approved ${summary.approvedCount}건, 서식 ${formCount}건` +
    `${strict ? ' (strict 모드)' : ''}`,
);

if (errors.length > 0) process.exit(1);
