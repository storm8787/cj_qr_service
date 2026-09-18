import { el, micIcon, searchIcon } from '../lib/dom.ts';
import { isVoiceSearchSupported, startVoiceSearch } from '../lib/voice.ts';

export interface SearchBoxOptions {
  id: string;
  label: string;
  hint: string;
  placeholder: string;
  initialValue?: string;
  submitLabel?: string;
  /** 음성검색 버튼을 붙일지 (지원 브라우저에서만 실제로 표시된다) */
  withVoice?: boolean;
  onSubmit(query: string): void;
  /** 입력할 때마다 호출 (주소 검색처럼 즉시 반응이 필요한 화면용) */
  onInput?(query: string): void;
}

export interface SearchBoxHandle {
  element: HTMLElement;
  input: HTMLInputElement;
  focus(): void;
}

/**
 * 검색 입력 + (지원 시) 음성검색 버튼.
 *
 * - `label`은 `for`로 입력과 연결한다. placeholder만 쓰지 않는다.
 * - 음성검색은 Web Speech API를 지원하는 브라우저에서만 버튼이 나타난다.
 *   지원하지 않아도 일반 검색은 그대로 쓸 수 있다.
 */
export function createSearchBox(options: SearchBoxOptions): SearchBoxHandle {
  const inputId = `${options.id}-input`;
  const hintId = `${options.id}-hint`;
  const statusId = `${options.id}-voice-status`;

  const input = el('input', {
    type: 'search',
    id: inputId,
    name: options.id,
    value: options.initialValue ?? '',
    placeholder: options.placeholder,
    'aria-describedby': hintId,
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    enterkeyhint: 'search',
  }) as HTMLInputElement;

  const submitButton = el('button', { type: 'submit', class: 'btn' }, [
    searchIcon(),
    options.submitLabel ?? '검색',
  ]);

  const voiceStatus = el('p', {
    id: statusId,
    class: 'section-note',
    role: 'status',
    'aria-live': 'polite',
  });

  const row = el('div', { class: 'search-row' }, [submitButton]);

  const voiceSupported = options.withVoice === true && isVoiceSearchSupported();
  let session: { stop(): void } | null = null;

  if (voiceSupported) {
    const voiceButton = el(
      'button',
      {
        type: 'button',
        class: 'btn btn-outline',
        'aria-describedby': statusId,
        'aria-pressed': 'false',
      },
      [micIcon(), '음성으로 검색'],
    ) as HTMLButtonElement;

    const setListening = (listening: boolean) => {
      voiceButton.setAttribute('aria-pressed', listening ? 'true' : 'false');
      voiceButton.lastChild!.textContent = listening ? '음성 입력 중지' : '음성으로 검색';
    };

    voiceButton.addEventListener('click', () => {
      if (session) {
        session.stop();
        session = null;
        setListening(false);
        voiceStatus.textContent = '음성 입력을 멈췄습니다.';
        return;
      }
      voiceStatus.textContent =
        '마이크 사용을 허용하면 음성 인식이 시작됩니다. 음성은 이 서비스의 서버에 저장되거나 전송되지 않습니다.';
      session = startVoiceSearch({
        onStart: () => {
          setListening(true);
          voiceStatus.textContent = '듣고 있습니다. 찾으시는 민원 이름을 말씀해 주세요.';
        },
        onResult: (transcript) => {
          input.value = transcript;
          voiceStatus.textContent = `인식된 내용: ${transcript}`;
          options.onInput?.(transcript);
          options.onSubmit(transcript);
        },
        onError: (_kind, message) => {
          voiceStatus.textContent = message;
        },
        onEnd: () => {
          session = null;
          setListening(false);
        },
      });
    });

    row.appendChild(voiceButton);
  }

  const form = el('form', { class: 'search-form', role: 'search', novalidate: true }, [
    el('div', { class: 'field' }, [
      el('label', { for: inputId }, [options.label]),
      el('p', { class: 'hint', id: hintId }, [options.hint]),
      input,
    ]),
    row,
    voiceSupported
      ? voiceStatus
      : el('p', { class: 'section-note' }, [
          '이 브라우저는 음성검색을 지원하지 않습니다. 검색창에 직접 입력해 주세요.',
        ]),
  ]);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    options.onSubmit(input.value);
  });

  if (options.onInput) {
    input.addEventListener('input', () => options.onInput?.(input.value));
  }

  return {
    element: form,
    input,
    focus: () => input.focus(),
  };
}
