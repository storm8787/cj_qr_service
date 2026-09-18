import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { minwonDataset, minwonItems, officeItems, projectRoot, termItems } from './helpers/content.ts';

describe('콘텐츠 검증 스크립트', () => {
  it('현재 콘텐츠가 검증을 통과한다', () => {
    expect(() =>
      execFileSync('node', ['scripts/validate-content.mjs', '--strict'], {
        cwd: projectRoot,
        stdio: 'pipe',
      }),
    ).not.toThrow();
  });
});

describe('참고 서비스의 부정확한 설명을 쓰지 않는다', () => {
  const allText = JSON.stringify({ minwonItems, termItems, officeItems });

  it('토지등급을 가격 순위로 설명하지 않는다', () => {
    expect(allText).not.toMatch(/1등급이\s*가장\s*(비싸|높)/);
    expect(allText).not.toMatch(/숫자가?\s*(클수록|커질수록)\s*(저렴|싸)/);
  });

  it('토지등급 항목은 설명 대신 확인 필요 사유를 남긴다', () => {
    const term = termItems.find((t) => t.id === 'toji-deunggeup');
    expect(term).toBeDefined();
    expect(term!.description).toBe('');
    expect(term!.reviewStatus).toBe('review-needed');
    expect(term!.pendingReason.length).toBeGreaterThan(10);
  });

  it('전입세대확인서를 온라인 발급 가능으로 표시하지 않는다', () => {
    const item = minwonItems.find((i) => i.id === 'household-move-in-confirmation');
    expect(item).toBeDefined();
    expect(item!.onlineStatus).toBe('visit-only');
    expect(item!.applicationChannel).not.toContain('online');
  });

  it('여주시 관련 표현이 없다', () => {
    expect(allText).not.toMatch(/여주/);
  });
});

describe('콘텐츠 메타 정보', () => {
  it('모든 항목에 검토상태와 담당부서 확인 여부가 있다', () => {
    for (const item of minwonItems) {
      expect(['draft', 'review-needed', 'approved']).toContain(item.reviewStatus);
      expect(typeof item.needsDepartmentCheck).toBe('boolean');
    }
  });

  it('approved 항목에는 출처 URL과 최종 확인일이 있다', () => {
    for (const item of minwonItems.filter((i) => i.reviewStatus === 'approved')) {
      expect(item.sourceUrl).toMatch(/^https:\/\//);
      expect(item.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(item.officialUrlOrganization.length).toBeGreaterThan(0);
    }
  });

  it('샘플 데이터임이 표시되어 있다', () => {
    expect(minwonDataset.isSample).toBe(true);
    expect(minwonDataset.notice).toMatch(/시범|샘플/);
  });

  it('자주 찾는 민원 목록의 id 가 모두 존재한다', () => {
    for (const id of minwonDataset.featuredIds) {
      expect(minwonItems.some((item) => item.id === id)).toBe(true);
    }
  });

  it('미확인 필드는 unverifiedFields 에 기록되어 있다', () => {
    for (const item of minwonItems) {
      for (const field of ['fee', 'processingTime', 'location', 'contact'] as const) {
        if (item[field].trim().length === 0) {
          expect(item.unverifiedFields).toContain(field);
        }
      }
    }
  });
});

describe('개인정보 수집 금지', () => {
  it('주민등록번호 등 개인정보 입력 필드를 요구하는 콘텐츠가 없다', () => {
    const allText = JSON.stringify(minwonItems);
    expect(allText).not.toMatch(/주민등록번호를?\s*입력/);
  });
});
