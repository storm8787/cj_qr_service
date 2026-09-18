/**
 * DOM 생성 헬퍼.
 *
 * 사용자 입력이나 데이터 문자열을 `innerHTML`에 넣지 않기 위해
 * 모든 노드를 `createElement` + `textContent`로만 만든다.
 */

type Attributes = Record<string, string | number | boolean | undefined | null>;

export type Child = Node | string | number | null | undefined | false;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attributes = {},
  children: Child[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') {
      node.className = String(value);
    } else if (value === true) {
      node.setAttribute(key, '');
    } else {
      node.setAttribute(key, String(value));
    }
  }
  append(node, children);
  return node;
}

export function append(parent: Node, children: Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    parent.appendChild(
      typeof child === 'string' || typeof child === 'number'
        ? document.createTextNode(String(child))
        : child,
    );
  }
}

export function clear(node: Node): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/**
 * 외부 링크.
 * - 항상 `noopener noreferrer`를 붙인다.
 * - 이동 대상 기관과 새 창 여부를 **눈에 보이는 글자**로 적는다.
 *   별도의 `aria-label`을 붙이면 보이는 글자와 접근성 이름이 달라져
 *   KWCAG 2.2 / WCAG 2.5.3 "레이블과 이름 일치"에 어긋나므로 쓰지 않는다.
 */
export function externalLink(options: {
  href: string;
  label: string;
  organization: string;
  className?: string;
}): HTMLAnchorElement {
  const anchor = el(
    'a',
    {
      class: options.className ?? 'btn btn-outline',
      href: options.href,
      target: '_blank',
      rel: 'noopener noreferrer',
    },
    [
      el('span', { class: 'btn-label' }, [
        el('span', { class: 'btn-text' }, [options.label]),
        el('span', { class: 'btn-meta' }, [`${options.organization} · 새 창으로 열림`]),
      ]),
      externalIcon(),
    ],
  );
  return anchor;
}

/** 직접 만든 단순 SVG 아이콘 (외부 아이콘 CDN을 쓰지 않는다). 장식용이므로 스크린리더에서 제외. */
function svg(paths: string[], viewBox = '0 0 24 24'): SVGSVGElement {
  const node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  node.setAttribute('viewBox', viewBox);
  node.setAttribute('aria-hidden', 'true');
  node.setAttribute('focusable', 'false');
  node.setAttribute('class', 'icon');
  for (const d of paths) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    node.appendChild(path);
  }
  return node;
}

export function externalIcon(): SVGSVGElement {
  return svg(['M14 4h6v6M20 4l-8 8', 'M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4']);
}

export function searchIcon(): SVGSVGElement {
  return svg(['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M16.2 16.2 21 21']);
}

export function micIcon(): SVGSVGElement {
  return svg([
    'M12 4a3 3 0 0 1 3 3v4a3 3 0 0 1-6 0V7a3 3 0 0 1 3-3z',
    'M6 11a6 6 0 0 0 12 0',
    'M12 17v3M9 20h6',
  ]);
}

export function backIcon(): SVGSVGElement {
  return svg(['M15 5l-7 7 7 7']);
}

export function chevronIcon(): SVGSVGElement {
  return svg(['M9 5l7 7-7 7']);
}

export function closeIcon(): SVGSVGElement {
  return svg(['M6 6l12 12M18 6L6 18']);
}
