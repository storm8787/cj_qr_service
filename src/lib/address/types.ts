/** 지번(본번/부번)을 구조적으로 분리한 형태. */
export interface JibunNumber {
  /** 산 여부 (임야) */
  san: boolean;
  /** 본번 */
  main: number;
  /** 부번. 없으면 0 */
  sub: number;
}

/** 도로명주소의 건물번호(본번/부번). */
export interface BuildingNumber {
  main: number;
  sub: number;
}

/** 검색용 주소 1건. `data/address-index.json`의 원소. */
export interface AddressRecord {
  id: string;
  sido: string;
  sigungu: string;
  /** 법정동·읍·면 */
  emd: string;
  /** 리 (없으면 빈 문자열) */
  ri: string;
  jibun: JibunNumber;
  roadName: string;
  building: BuildingNumber;
  /** 건물명·공동주택명 (없으면 빈 문자열) */
  buildingName: string;
  zipCode: string;
}

/** 주소 인덱스 파일 전체. */
export interface AddressIndex {
  /** 인덱스 생성 방식·출처 설명 */
  source: string;
  /** 가상(개발용) 데이터인지 여부 */
  isSample: boolean;
  generatedAt: string;
  records: AddressRecord[];
}

/**
 * 검색어에서 뽑아낸 숫자 조건 1개.
 * `role`은 이 숫자를 지번으로 볼지 건물번호로 볼지 나타낸다.
 * - `jibun`   : `산 12-3`, `123번지`처럼 지번임이 명시된 경우
 * - `building`: 도로명 토큰 바로 뒤에 온 경우
 * - `either`  : 단정할 수 없어 두 가지 모두로 해석하는 경우
 */
export interface NumberTerm {
  raw: string;
  san: boolean;
  main: number;
  sub: number;
  /** 부번을 입력했는지 (입력하지 않았으면 부번 조건 없음) */
  hasSub: boolean;
  role: 'jibun' | 'building' | 'either';
}

/** 검색어를 파싱한 결과. */
export interface ParsedAddressQuery {
  raw: string;
  /** 지역명·도로명·건물명 등 문자 조건 */
  textTerms: string[];
  /** 구조적으로 분리된 숫자 조건 */
  numberTerms: NumberTerm[];
}

/** 검색 결과 1건. */
export interface AddressMatch {
  record: AddressRecord;
  /** 정확도 점수 (높을수록 우선) */
  score: number;
  /** 어떤 조건이 맞았는지 (화면 설명용) */
  reasons: string[];
}

export type AddressSearchOutcome =
  /** 검색어가 없음 */
  | { kind: 'idle' }
  /** 검색어가 너무 짧음 */
  | { kind: 'too-short'; minLength: number }
  /** 숫자만 입력했고 지역 조건이 없음 → 지역명을 함께 입력하도록 안내 */
  | { kind: 'needs-region'; numbers: number[] }
  /** 조건이 넓어 결과가 과다함 → 추가 조건 요청 */
  | { kind: 'needs-narrowing'; total: number; preview: AddressMatch[] }
  /** 정확한 결과 있음 */
  | { kind: 'ok'; exact: AddressMatch[]; similar: AddressMatch[]; total: number }
  /** 정확한 결과 없음 (유사 결과만) */
  | { kind: 'no-exact'; similar: AddressMatch[] };

export interface AddressSearchResult {
  outcome: AddressSearchOutcome;
  parsed: ParsedAddressQuery;
  /** 어떤 어댑터가 응답했는지 */
  adapterId: string;
}

/**
 * 주소 검색 어댑터.
 * 지금은 로컬 JSON 인덱스만 사용하지만, 향후 공식 주소 API(도로명주소 검색 API 등)를
 * 서버 프록시 뒤에 두고 같은 인터페이스로 갈아끼울 수 있도록 분리한다.
 * **API 키는 브라우저 코드에 포함하지 않는다.**
 */
export interface AddressSearchAdapter {
  readonly id: string;
  readonly label: string;
  /** 사용 가능 여부 (프록시 미설정 시 false) */
  isAvailable(): boolean;
  search(query: string, options?: AddressSearchOptions): Promise<AddressSearchResult>;
}

export interface AddressSearchOptions {
  /** 정확 결과 최대 표시 수 */
  limit?: number;
  /** 이 수를 넘으면 추가 조건을 요청한다 */
  narrowingThreshold?: number;
  /** 최소 검색어 길이 */
  minLength?: number;
}
