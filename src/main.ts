import './styles/main.css';

import { renderAddress } from './components/address.ts';
import { renderArea } from './components/area.ts';
import { renderHome } from './components/home.ts';
import { devBanner, siteFooter, siteHeader } from './components/layout.ts';
import { renderCategory, renderDetail, renderSearch } from './components/minwon.ts';
import { renderOffice } from './components/office.ts';
import { renderTerms } from './components/terms.ts';
import { clear, el } from './lib/dom.ts';
import { onRouteChange, parseRoute, type Route } from './lib/router.ts';
import type { MinwonDataset, MinwonItem } from './types/index.ts';

// 빌드 시점에 걸러진 민원 콘텐츠. 공식 빌드에는 `approved` 항목만 들어 있다.
// (vite.config.ts 의 `chungju-minwon-content` 플러그인 참고)
import { dataset as rawDataset, items as rawItems } from 'virtual:minwon-content';

const dataset = rawDataset as MinwonDataset;
const items = rawItems as MinwonItem[];

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('#app 요소를 찾을 수 없습니다.');

const main = el('main', { id: 'main', tabindex: '-1' }, [el('div', { class: 'container' })]);
const mainInner = main.firstElementChild as HTMLElement;

const shell = el('div', { class: 'shell' }, [
  devBanner(),
  siteHeader(),
  main,
  siteFooter(),
]);

root.appendChild(shell);

function viewFor(route: Route): HTMLElement {
  switch (route.name) {
    case 'home':
      return renderHome(items, dataset);
    case 'search':
      return renderSearch(items, route.query);
    case 'category':
      return renderCategory(items, route.category);
    case 'detail':
      return renderDetail(items, dataset, route.id);
    case 'terms':
      return renderTerms(route.query);
    case 'address':
      return renderAddress();
    case 'area':
      return renderArea();
    case 'office':
      return renderOffice();
  }
}

let firstRender = true;

function render(route: Route): void {
  clear(mainInner);
  mainInner.appendChild(viewFor(route));
  document.documentElement.scrollTop = 0;

  // 화면이 바뀐 사실을 스크린리더 사용자에게 알리기 위해 제목으로 포커스를 옮긴다.
  // 첫 진입 시에는 사용자가 본문 바로가기를 쓸 수 있도록 포커스를 옮기지 않는다.
  if (!firstRender) {
    const heading = mainInner.querySelector<HTMLElement>('#page-heading');
    heading?.focus();
  }
  firstRender = false;
}

onRouteChange(render);
render(parseRoute(window.location.hash));
