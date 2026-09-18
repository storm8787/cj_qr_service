import officesData from '../data/offices.json';
import officialLinks from '../data/official-links.json';
import { el, externalLink } from '../lib/dom.ts';
import type { OfficeItem, OfficialLink } from '../types/index.ts';
import { backLink, pageTitle } from './layout.ts';
import { reviewStatusBadge } from './status.ts';

const offices = officesData.items as OfficeItem[];
const links = officialLinks.items as OfficialLink[];

function pending(label: string): HTMLElement {
  return el('span', { class: 'pending-value' }, [`${label} 확인 필요`]);
}

function officeCard(office: OfficeItem): HTMLElement {
  return el('li', {}, [
    el('div', { class: 'card' }, [
      el('h3', {}, [office.name]),
      el('div', { class: 'badge-row' }, [reviewStatusBadge(office.reviewStatus)]),
      el('dl', { class: 'detail-list' }, [
        el('div', {}, [
          el('dt', {}, ['위치']),
          el('dd', {}, [office.address || pending('주소')]),
        ]),
        el('div', {}, [
          el('dt', {}, ['운영시간']),
          el('dd', {}, [
            office.hours.length > 0
              ? el('ul', {}, office.hours.map((line) => el('li', {}, [line])))
              : pending('운영시간'),
          ]),
        ]),
        el('div', {}, [
          el('dt', {}, ['전화']),
          el('dd', {}, [
            office.phone
              ? el('a', { href: `tel:${office.phone.replace(/[^0-9+]/g, '')}` }, [office.phone])
              : pending('전화번호'),
          ]),
        ]),
        el('div', {}, [el('dt', {}, ['안내']), el('dd', {}, [office.note])]),
      ]),
    ]),
  ]);
}

export function renderOffice(): HTMLElement {
  const cityLink = links.find((link) => link.id === 'chungju-city');

  return el('div', {}, [
    backLink({ name: 'home' }, '처음 화면으로'),
    pageTitle('민원실 이용안내', '방문 전에 운영시간과 담당 창구를 확인해 주세요.'),

    el('div', { class: 'notice notice-warn' }, [
      el('strong', { class: 'notice-title' }, ['확인 전 항목이 있습니다']),
      officesData.notice,
    ]),

    el('section', { 'aria-labelledby': 'office-list-heading' }, [
      el('h2', { id: 'office-list-heading' }, ['민원실 목록']),
      el('ul', { class: 'card-list' }, offices.map(officeCard)),
    ]),

    el('div', { class: 'card' }, [
      el('h2', {}, ['방문 전 확인사항']),
      el('ul', {}, [
        el('li', {}, ['민원 종류에 따라 담당 창구와 필요한 서류가 다릅니다.']),
        el('li', {}, ['본인이 아닌 사람이 대신 신청하려면 위임장 등 추가 서류가 필요할 수 있습니다.']),
        el('li', {}, ['점심시간 운영 여부와 공휴일 운영 여부를 미리 확인해 주세요.']),
        el('li', {}, ['온라인으로 처리할 수 있는 민원은 방문하지 않아도 됩니다. 각 민원 상세에서 확인해 주세요.']),
      ]),
    ]),

    cityLink
      ? el('div', { class: 'card' }, [
          el('h2', {}, ['공식 안내 확인']),
          externalLink({
            href: cityLink.url,
            label: '충주시 공식 홈페이지에서 부서·연락처 확인',
            organization: cityLink.organization,
            className: 'btn btn-outline',
          }),
        ])
      : null,
  ]);
}
