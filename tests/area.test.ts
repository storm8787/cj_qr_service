import { describe, expect, it } from 'vitest';
import {
  formatAreaNumber,
  M2_PER_PYEONG,
  m2ToPyeong,
  MAX_AREA_VALUE,
  parseAreaInput,
  pyeongToM2,
  roundTo,
} from '../src/lib/area.ts';

describe('면적 환산 상수', () => {
  it('1평 = 3.305785㎡ 를 쓴다', () => {
    expect(M2_PER_PYEONG).toBe(3.305785);
  });
});

describe('㎡ ↔ 평 양방향 계산', () => {
  it('제곱미터를 평으로 바꾼다', () => {
    expect(m2ToPyeong(3.305785)).toBe(1);
    expect(m2ToPyeong(33.05785)).toBe(10);
    expect(m2ToPyeong(84.95)).toBeCloseTo(25.7, 1);
  });

  it('평을 제곱미터로 바꾼다', () => {
    expect(pyeongToM2(1)).toBe(3.31);
    expect(pyeongToM2(10)).toBe(33.06);
    expect(pyeongToM2(30)).toBeCloseTo(99.17, 2);
  });

  it('왕복 변환의 오차가 작다', () => {
    for (const value of [1, 12.5, 84.95, 330, 10_000]) {
      const roundTrip = pyeongToM2(m2ToPyeong(value, 6), 6);
      expect(Math.abs(roundTrip - value)).toBeLessThan(0.001);
    }
  });

  it('0은 0으로 환산된다', () => {
    expect(m2ToPyeong(0)).toBe(0);
    expect(pyeongToM2(0)).toBe(0);
  });

  it('소수 자릿수를 지정할 수 있다', () => {
    expect(m2ToPyeong(100, 0)).toBe(30);
    expect(m2ToPyeong(100, 4)).toBe(30.25);
  });
});

describe('반올림', () => {
  it('부동소수점 경계값을 올바르게 반올림한다', () => {
    expect(roundTo(1.005, 2)).toBe(1.01);
    expect(roundTo(2.675, 2)).toBe(2.68);
    expect(roundTo(0.1 + 0.2, 2)).toBe(0.3);
  });
});

describe('잘못된 숫자 입력 처리', () => {
  it('빈 값은 empty 오류', () => {
    const result = parseAreaInput('   ');
    expect(result).toMatchObject({ ok: false, error: 'empty' });
  });

  it.each(['abc', '12a', '1.2.3', '１２３㎡', '12 34', '1e5', '+12', '12%', '--5'])(
    '숫자가 아닌 입력 "%s" 을 거부한다',
    (input) => {
      const result = parseAreaInput(input);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe('not-a-number');
    },
  );

  it('음수를 거부한다', () => {
    const result = parseAreaInput('-10');
    expect(result).toMatchObject({ ok: false, error: 'negative' });
  });

  it('비정상적으로 큰 값을 거부한다', () => {
    const result = parseAreaInput(String(MAX_AREA_VALUE + 1));
    expect(result).toMatchObject({ ok: false, error: 'too-large' });
  });

  it('상한값 자체는 허용한다', () => {
    expect(parseAreaInput(String(MAX_AREA_VALUE))).toEqual({ ok: true, value: MAX_AREA_VALUE });
  });

  it('천 단위 쉼표를 허용한다', () => {
    expect(parseAreaInput('1,234.5')).toEqual({ ok: true, value: 1234.5 });
  });

  it('오류 메시지가 구체적이다', () => {
    const result = parseAreaInput('abc');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('숫자');
      expect(result.message.length).toBeGreaterThan(5);
    }
  });
});

describe('표시 포매팅', () => {
  it('천 단위 구분 기호를 넣는다', () => {
    expect(formatAreaNumber(1234.5)).toBe('1,234.5');
  });

  it('불필요한 0을 붙이지 않는다', () => {
    expect(formatAreaNumber(10)).toBe('10');
  });
});
