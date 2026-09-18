import { resolveAppUrl } from '../paths.ts';
import { searchAddressRecords } from './search.ts';
import type {
  AddressIndex,
  AddressSearchAdapter,
  AddressSearchOptions,
  AddressSearchResult,
} from './types.ts';

/**
 * 로컬 JSON 인덱스 어댑터.
 * `data/address-index.json`을 상대경로로 한 번만 받아서 메모리에서 검색한다.
 * 외부 서버·API 키를 쓰지 않으므로 공식 서버에 그대로 올려도 동작한다.
 */
export class LocalIndexAdapter implements AddressSearchAdapter {
  readonly id = 'local-index';
  readonly label = '내장 주소 인덱스';

  #index: AddressIndex | null = null;
  #loading: Promise<AddressIndex> | null = null;

  isAvailable(): boolean {
    return true;
  }

  async load(): Promise<AddressIndex> {
    if (this.#index) return this.#index;
    if (!this.#loading) {
      this.#loading = fetch(resolveAppUrl('data/address-index.json'), { cache: 'no-cache' })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`주소 인덱스를 불러오지 못했습니다. (HTTP ${response.status})`);
          }
          const data = (await response.json()) as AddressIndex;
          if (!Array.isArray(data.records)) {
            throw new Error('주소 인덱스 형식이 올바르지 않습니다.');
          }
          this.#index = data;
          return data;
        })
        .catch((error: unknown) => {
          this.#loading = null;
          throw error;
        });
    }
    return this.#loading;
  }

  async search(query: string, options?: AddressSearchOptions): Promise<AddressSearchResult> {
    const index = await this.load();
    const { outcome, parsed } = searchAddressRecords(index.records, query, options);
    return { outcome, parsed, adapterId: this.id };
  }
}

/**
 * 공식 주소 API 어댑터 (확장 예정).
 *
 * 도로명주소 검색 API 등 공식 API는 승인키가 필요하다.
 * **승인키를 브라우저 코드에 넣으면 그대로 노출되므로 여기에 넣지 않는다.**
 * 충주시 서버에 작은 프록시 엔드포인트를 두고, 이 어댑터가 그 상대경로만 호출하도록
 * 구성하는 것을 전제로 한다. 프록시가 없으면 `isAvailable()`이 false이고
 * 화면은 로컬 인덱스 어댑터로 계속 동작한다.
 *
 * 자세한 설계는 `docs/deployment-guide.md`의 "확장사항: 공식 주소 API 프록시" 참고.
 */
export class ProxyApiAdapter implements AddressSearchAdapter {
  readonly id = 'proxy-api';
  readonly label = '공식 주소 API (서버 프록시)';

  /** 프록시 엔드포인트의 상대경로. 미설정이면 비활성. */
  readonly #endpoint: string | null;

  constructor(endpoint: string | null = null) {
    this.#endpoint = endpoint;
  }

  isAvailable(): boolean {
    return this.#endpoint !== null;
  }

  async search(): Promise<AddressSearchResult> {
    throw new Error(
      '공식 주소 API 프록시가 설정되지 않았습니다. 현재는 내장 주소 인덱스로 검색합니다.',
    );
  }
}

/** 사용 가능한 첫 어댑터를 고른다. */
export function pickAdapter(adapters: AddressSearchAdapter[]): AddressSearchAdapter {
  const available = adapters.find((adapter) => adapter.isAvailable());
  if (!available) throw new Error('사용할 수 있는 주소 검색 어댑터가 없습니다.');
  return available;
}
