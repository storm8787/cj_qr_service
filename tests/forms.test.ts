import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { MinwonForm } from '../src/types/index.ts';
import { minwonItems, projectRoot, readJson } from './helpers/content.ts';

const formsData = readJson<{ notice: string; updatedAt: string; items: MinwonForm[] }>(
  'src/data/forms.json',
);
const forms = formsData.items;

describe('민원서식 데이터', () => {
  it('서식이 등록되어 있다', () => {
    expect(forms.length).toBeGreaterThan(0);
  });

  it('id 가 중복되지 않는다', () => {
    const ids = forms.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('연결된 민원이 모두 실제로 존재한다', () => {
    const minwonIds = new Set(minwonItems.map((item) => item.id));
    for (const form of forms) {
      for (const id of form.relatedMinwonIds) {
        expect(minwonIds, `${form.id} → ${id}`).toContain(id);
      }
    }
  });
});

describe('서식 파일', () => {
  it.each(forms.map((f) => [f.id, f] as const))('%s — 파일이 존재하고 크기가 일치한다', (_id, form) => {
    const path = resolve(projectRoot, 'public', form.file);
    expect(existsSync(path)).toBe(true);
    expect(statSync(path).size).toBe(form.fileSizeBytes);
  });

  it('모든 파일이 .hwpx 이고 forms/ 아래에 있다', () => {
    for (const form of forms) {
      expect(form.file).toMatch(/^forms\/[a-z0-9-]+\.hwpx$/);
    }
  });

  it('HWPX 는 ZIP 컨테이너다 (매직 바이트 PK)', async () => {
    const { readFileSync } = await import('node:fs');
    for (const form of forms) {
      const head = readFileSync(resolve(projectRoot, 'public', form.file)).subarray(0, 2);
      expect(head.toString('latin1'), form.id).toBe('PK');
    }
  });
});

describe('서식 출처 — 별지서식은 법령이 곧 출처다', () => {
  const approved = forms.filter((f) => f.reviewStatus === 'approved');

  it('approved 서식에 근거 법령·별지 번호·개정일이 있다', () => {
    for (const form of approved) {
      expect(form.law.length, form.id).toBeGreaterThan(0);
      expect(form.formNumber, form.id).toMatch(/별지 제\d+호서식/);
      expect(form.revisedAt, form.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(form.lawUrl, form.id).toMatch(/^https:\/\/www\.law\.go\.kr\//);
      expect(form.verifiedAt, form.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('approved 서식에 기재 항목이 들어 있다', () => {
    for (const form of approved) {
      expect(form.sections.length, form.id).toBeGreaterThan(0);
      for (const section of form.sections) {
        expect(section.title.length).toBeGreaterThan(0);
        expect(section.fields.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('서식에서 확인된 수수료·처리기간이 민원에 반영되었다', () => {
  function item(id: string) {
    const found = minwonItems.find((i) => i.id === id);
    expect(found, id).toBeDefined();
    return found!;
  }

  it('전입세대확인서 — 별지 제15호서식의 법정 수수료가 들어갔다', () => {
    const target = item('household-move-in-confirmation');
    expect(target.fee).toContain('300원');
    expect(target.fee).toContain('400원');
    expect(target.processingTime).toContain('즉시');
    expect(target.unverifiedFields).not.toContain('fee');
    expect(target.unverifiedFields).not.toContain('processingTime');
  });

  it.each([
    ['land-register-copy', '500원'],
    ['cadastral-map-copy', '700원'],
    ['boundary-coordinate-register', '300원'],
    ['real-estate-comprehensive-certificate', '1,500원'],
  ])('%s — 별지 제71호서식의 법정 수수료가 들어갔다', (id, amount) => {
    const target = item(id);
    expect(target.fee).toContain(amount);
    expect(target.fee).toContain('별지 제71호서식');
    expect(target.processingTime).toContain('즉시');
    expect(target.unverifiedFields).not.toContain('fee');
    expect(target.unverifiedFields).not.toContain('processingTime');
  });

  it('수수료를 채운 민원은 근거 서식을 문구에 밝힌다', () => {
    for (const id of [
      'household-move-in-confirmation',
      'land-register-copy',
      'cadastral-map-copy',
      'boundary-coordinate-register',
      'real-estate-comprehensive-certificate',
    ]) {
      expect(item(id).fee, id).toMatch(/별지 제\d+호서식/);
    }
  });
});

describe('서식 내용 정확성', () => {
  it('전입신고 유의사항에 14일과 과태료가 들어 있다', () => {
    const form = forms.find((f) => f.id === 'jeonip-singo')!;
    const text = form.notices.join(' ');
    expect(text).toContain('14일');
    expect(text).toContain('5만 원');
  });

  it('전입세대확인서 서식에 위임장 구역이 있다', () => {
    const form = forms.find((f) => f.id === 'jeonip-sedae-hwaginseo')!;
    expect(form.sections.some((s) => s.title.includes('위임장'))).toBe(true);
  });

  it('지적공부 서식 하나가 토지·지적 민원 4건을 커버한다', () => {
    const form = forms.find((f) => f.id === 'jijeok-budongsan-yeollam-balgeup')!;
    expect(form.relatedMinwonIds).toHaveLength(4);
  });

  it('등·초본 서식에 수수료 면제 대상이 들어 있다', () => {
    const form = forms.find((f) => f.id === 'jumin-deungchobon-gyobu')!;
    expect(form.feeExemptions.length).toBeGreaterThan(5);
    expect(form.feeExemptions.join(' ')).toContain('수급자');
  });
});
