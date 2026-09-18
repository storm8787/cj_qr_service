import { closeIcon, el } from '../lib/dom.ts';

/**
 * 접근성 모달.
 * - 열릴 때 모달 안으로 포커스를 옮기고, 닫으면 원래 요소로 되돌린다.
 * - Tab 순환을 모달 안에 가둔다.
 * - Esc 로 닫는다.
 */
export function openModal(options: {
  title: string;
  body: HTMLElement;
  returnFocusTo: HTMLElement | null;
}): void {
  const previouslyFocused = options.returnFocusTo ?? (document.activeElement as HTMLElement | null);

  const titleId = 'modal-title';
  const closeButton = el(
    'button',
    { type: 'button', class: 'modal-close', 'aria-label': '닫기' },
    [closeIcon()],
  );

  const dialog = el(
    'div',
    {
      class: 'modal',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': titleId,
    },
    [
      closeButton,
      el('h2', { id: titleId }, [options.title]),
      el('div', { class: 'modal-body' }, [options.body]),
    ],
  );

  const backdrop = el('div', { class: 'modal-backdrop' }, [dialog]);

  function close(): void {
    backdrop.remove();
    document.removeEventListener('keydown', onKeyDown, true);
    previouslyFocused?.focus?.();
  }

  function focusables(): HTMLElement[] {
    return [
      ...dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ];
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = focusables();
    if (items.length === 0) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !dialog.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  closeButton.addEventListener('click', close);
  backdrop.addEventListener('mousedown', (event) => {
    if (event.target === backdrop) close();
  });
  document.addEventListener('keydown', onKeyDown, true);

  document.body.appendChild(backdrop);
  closeButton.focus();
}
