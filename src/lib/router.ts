/**
 * 해시 기반 라우터.
 *
 * 공식 서버의 어떤 하위 경로에 올려도, 서버 rewrite 설정 없이 동작해야 하므로
 * History API 대신 해시를 쓴다. (운영업체에 추가 설정을 요구하지 않는다.)
 */

export type Route =
  | { name: 'home' }
  | { name: 'search'; query: string }
  | { name: 'detail'; id: string }
  | { name: 'category'; category: string }
  | { name: 'terms'; query: string }
  | { name: 'address' }
  | { name: 'area' }
  | { name: 'office' };

export function parseRoute(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '');
  if (raw.length === 0) return { name: 'home' };

  const [path = '', queryString = ''] = raw.split('?');
  const params = new URLSearchParams(queryString);
  const segments = path.split('/').filter((s) => s.length > 0);
  const [head, second] = segments;

  switch (head) {
    case 'search':
      return { name: 'search', query: params.get('q') ?? '' };
    case 'minwon':
      return second ? { name: 'detail', id: decodeURIComponent(second) } : { name: 'home' };
    case 'category':
      return second
        ? { name: 'category', category: decodeURIComponent(second) }
        : { name: 'home' };
    case 'terms':
      return { name: 'terms', query: params.get('q') ?? '' };
    case 'address':
      return { name: 'address' };
    case 'area':
      return { name: 'area' };
    case 'office':
      return { name: 'office' };
    default:
      return { name: 'home' };
  }
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/';
    case 'search':
      return `#/search?q=${encodeURIComponent(route.query)}`;
    case 'detail':
      return `#/minwon/${encodeURIComponent(route.id)}`;
    case 'category':
      return `#/category/${encodeURIComponent(route.category)}`;
    case 'terms':
      return route.query ? `#/terms?q=${encodeURIComponent(route.query)}` : '#/terms';
    case 'address':
      return '#/address';
    case 'area':
      return '#/area';
    case 'office':
      return '#/office';
  }
}

export function navigate(route: Route, replace = false): void {
  const hash = routeToHash(route);
  if (replace) {
    const url = new URL(window.location.href);
    url.hash = hash;
    window.history.replaceState(null, '', url.href);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else if (window.location.hash === hash) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = hash;
  }
}

export function onRouteChange(handler: (route: Route) => void): void {
  window.addEventListener('hashchange', () => handler(parseRoute(window.location.hash)));
}
