import {
  formatAreaNumber,
  M2_PER_PYEONG,
  m2ToPyeong,
  parseAreaInput,
  pyeongToM2,
} from '../lib/area.ts';
import { el } from '../lib/dom.ts';
import { backLink, pageTitle } from './layout.ts';

type Direction = 'm2-to-pyeong' | 'pyeong-to-m2';

/**
 * 면적 환산 화면.
 * - 라디오 버튼으로 방향을 고른다(키보드 화살표로 전환 가능).
 * - 결과는 `aria-live`로 알린다.
 * - 오류 메시지는 입력과 `aria-describedby`로 연결한다.
 */
export function renderArea(): HTMLElement {
  let direction: Direction = 'm2-to-pyeong';

  const input = el('input', {
    type: 'text',
    id: 'area-input',
    name: 'area',
    inputmode: 'decimal',
    autocomplete: 'off',
    'aria-describedby': 'area-hint area-error',
    placeholder: '예: 84.95',
  }) as HTMLInputElement;

  const unitLabel = el('span', { id: 'area-unit' }, ['제곱미터(㎡)']);
  const errorText = el('p', { id: 'area-error', class: 'error-text', role: 'alert' });
  const resultValue = el('p', { class: 'value' }, ['-']);
  const resultFormula = el('p', { class: 'formula' }, ['숫자를 입력하면 결과가 표시됩니다.']);

  const resultBox = el(
    'div',
    { class: 'calc-result', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' },
    [resultValue, resultFormula],
  );

  function update(): void {
    const parsed = parseAreaInput(input.value);
    if (!parsed.ok) {
      input.setAttribute('aria-invalid', parsed.error === 'empty' ? 'false' : 'true');
      errorText.textContent = parsed.error === 'empty' ? '' : parsed.message;
      resultValue.textContent = '-';
      resultFormula.textContent =
        parsed.error === 'empty' ? '숫자를 입력하면 결과가 표시됩니다.' : parsed.message;
      return;
    }

    input.setAttribute('aria-invalid', 'false');
    errorText.textContent = '';

    if (direction === 'm2-to-pyeong') {
      const pyeong = m2ToPyeong(parsed.value);
      resultValue.textContent = `${formatAreaNumber(pyeong)} 평`;
      resultFormula.textContent =
        `${formatAreaNumber(parsed.value)}㎡ ÷ ${M2_PER_PYEONG} = ${formatAreaNumber(pyeong)}평 ` +
        '(소수점 셋째 자리에서 반올림)';
    } else {
      const m2 = pyeongToM2(parsed.value);
      resultValue.textContent = `${formatAreaNumber(m2)} ㎡`;
      resultFormula.textContent =
        `${formatAreaNumber(parsed.value)}평 × ${M2_PER_PYEONG} = ${formatAreaNumber(m2)}㎡ ` +
        '(소수점 셋째 자리에서 반올림)';
    }
  }

  function directionRadio(value: Direction, label: string): HTMLElement {
    const id = `area-dir-${value}`;
    const radio = el('input', {
      type: 'radio',
      name: 'area-direction',
      id,
      value,
      checked: value === direction,
    }) as HTMLInputElement;
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      direction = value;
      unitLabel.textContent = value === 'm2-to-pyeong' ? '제곱미터(㎡)' : '평';
      update();
    });
    return el('span', { class: 'chip' }, [radio, el('label', { for: id }, [label])]);
  }

  const form = el('form', { class: 'search-form', novalidate: true }, [
    el('fieldset', {}, [
      el('legend', {}, ['환산 방향']),
      el('div', { class: 'chip-row' }, [
        directionRadio('m2-to-pyeong', '㎡ → 평'),
        directionRadio('pyeong-to-m2', '평 → ㎡'),
      ]),
    ]),
    el('div', { class: 'field' }, [
      el('label', { for: 'area-input' }, [
        '면적 입력 (',
        unitLabel,
        ')',
      ]),
      el('p', { class: 'hint', id: 'area-hint' }, [
        '숫자만 입력할 수 있습니다. 소수점과 천 단위 쉼표를 쓸 수 있습니다.',
      ]),
      input,
      errorText,
    ]),
  ]);

  form.addEventListener('submit', (event) => event.preventDefault());
  input.addEventListener('input', update);

  return el('div', {}, [
    backLink({ name: 'home' }, '처음 화면으로'),
    pageTitle('면적 환산', '제곱미터와 평을 서로 바꿉니다.'),
    form,
    resultBox,
    el('div', { class: 'notice notice-info' }, [
      el('strong', { class: 'notice-title' }, ['환산 기준']),
      `이 서비스는 1평 = ${M2_PER_PYEONG}㎡ 를 적용합니다. 공적장부에 기재되는 법정 단위는 제곱미터(㎡)입니다. ` +
        '환산값은 참고용이며, 정확한 면적은 토지대장·건축물대장에서 확인해 주세요.',
    ]),
  ]);
}
