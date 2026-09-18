/**
 * 음성검색 (Web Speech API).
 *
 * - 브라우저가 지원할 때만 버튼을 노출한다. 미지원 시 일반 검색은 그대로 동작한다.
 * - 음성 데이터를 이 서비스의 서버로 보내거나 저장하지 않는다.
 *   (인식은 브라우저/OS가 처리한다. 브라우저 구현에 따라 브라우저 제공사 서버를 거칠 수 있으므로
 *    마이크 사용 전 그 사실을 화면에 안내한다.)
 */

interface SpeechRecognitionResultLike {
  readonly length: number;
  item(index: number): { readonly 0: { transcript: string } };
  [index: number]: { readonly 0: { transcript: string } };
}

interface SpeechRecognitionEventLike extends Event {
  readonly results: SpeechRecognitionResultLike;
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getConstructor(): SpeechRecognitionConstructor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isVoiceSearchSupported(): boolean {
  return getConstructor() !== null;
}

export type VoiceErrorKind = 'not-allowed' | 'no-speech' | 'network' | 'aborted' | 'unknown';

export interface VoiceHandlers {
  onResult(transcript: string): void;
  onError(kind: VoiceErrorKind, message: string): void;
  onStart?(): void;
  onEnd?(): void;
}

const ERROR_MESSAGES: Record<VoiceErrorKind, string> = {
  'not-allowed':
    '마이크 사용이 허용되지 않았습니다. 브라우저 주소창의 자물쇠 아이콘에서 마이크 권한을 허용한 뒤 다시 시도해 주세요. 검색창에 직접 입력해도 됩니다.',
  'no-speech': '음성이 인식되지 않았습니다. 조용한 곳에서 다시 말해 주시거나 검색창에 직접 입력해 주세요.',
  network: '음성인식 중 네트워크 오류가 발생했습니다. 검색창에 직접 입력해 주세요.',
  aborted: '음성 입력이 중단되었습니다.',
  unknown: '음성인식에 실패했습니다. 검색창에 직접 입력해 주세요.',
};

function toErrorKind(raw: string): VoiceErrorKind {
  switch (raw) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'not-allowed';
    case 'no-speech':
      return 'no-speech';
    case 'network':
      return 'network';
    case 'aborted':
      return 'aborted';
    default:
      return 'unknown';
  }
}

/** 음성 인식 세션 1회. 반환값의 `stop()`으로 중단할 수 있다. */
export function startVoiceSearch(handlers: VoiceHandlers): { stop(): void } | null {
  const Ctor = getConstructor();
  if (!Ctor) {
    handlers.onError('unknown', '이 브라우저는 음성검색을 지원하지 않습니다.');
    return null;
  }

  const recognition = new Ctor();
  recognition.lang = 'ko-KR';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const first = event.results[0];
    const transcript = first?.[0]?.transcript?.trim() ?? '';
    if (transcript.length > 0) handlers.onResult(transcript);
    else handlers.onError('no-speech', ERROR_MESSAGES['no-speech']);
  };
  recognition.onerror = (event) => {
    const kind = toErrorKind(event.error);
    handlers.onError(kind, ERROR_MESSAGES[kind]);
  };
  recognition.onend = () => handlers.onEnd?.();

  try {
    recognition.start();
    handlers.onStart?.();
  } catch {
    handlers.onError('unknown', ERROR_MESSAGES.unknown);
    return null;
  }

  return {
    stop() {
      try {
        recognition.abort();
      } catch {
        /* 이미 종료된 경우 무시 */
      }
    },
  };
}
