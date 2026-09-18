/** 콘텐츠 검토 상태. 공식 배포본에는 `approved`만 포함된다. */
export type ReviewStatus = 'draft' | 'review-needed' | 'approved';

/** 신청 경로. */
export type ApplicationChannel = 'visit' | 'online' | 'mail' | 'kiosk';

/**
 * 온라인 처리 가능 여부.
 * 공식 근거 없이 `온라인 발급`이라고 쓰지 않기 위해 상태를 세분화한다.
 */
export type OnlineStatus =
  /** 온라인으로 신청까지 가능 (결과물은 별도 절차) */
  | 'online-apply'
  /** 온라인으로 발급·출력까지 가능 */
  | 'online-issue'
  /** 온라인에서는 공식 안내만 확인 가능 */
  | 'info-only'
  /** 방문 신청만 가능 */
  | 'visit-only'
  /** 담당기관 확인이 필요함 */
  | 'check-required';

/** 민원 1건. 화면 코드와 분리된 데이터 파일(`src/data/minwon-items.json`)의 원소. */
export interface MinwonItem {
  id: string;
  category: string;
  title: string;
  aliases: string[];
  keywords: string[];
  summary: string;
  applicationChannel: ApplicationChannel[];
  onlineStatus: OnlineStatus;
  requiredDocuments: string[];
  fee: string;
  processingTime: string;
  /** 담당 창구 */
  location: string;
  /** 문의처 안내 */
  contact: string;
  /** 신청 자격·유의사항 */
  eligibility: string[];
  /** 시민에게 보여줄 공식 안내 페이지 */
  officialUrl: string;
  /** 공식 안내 페이지를 운영하는 기관명 (외부 이동 버튼에 표기) */
  officialUrlOrganization: string;
  /** 콘텐츠 작성 근거가 된 출처 URL */
  sourceUrl: string;
  /** 콘텐츠 최종 확인일 (YYYY-MM-DD) */
  verifiedAt: string;
  reviewStatus: ReviewStatus;
  /** 충주시 담당부서 확인이 필요한지 여부 */
  needsDepartmentCheck: boolean;
  /**
   * 아직 공식 근거로 확인하지 못한 필드 이름 목록.
   * 화면에서 `확인 필요` 배지로 표시한다.
   */
  unverifiedFields: string[];
  /** 데이터 교체 전까지 노출되는 시범 콘텐츠인지 여부 */
  isSample: boolean;
}

/** 데이터셋 메타 정보. */
export interface MinwonDataset {
  name: string;
  /** 데이터셋 전체가 시범(샘플) 상태인지 */
  isSample: boolean;
  notice: string;
  updatedAt: string;
  /** 첫 화면 `자주 찾는 민원`에 올릴 항목 id 목록 */
  featuredIds: string[];
}

/** 행정용어 설명 1건. */
export interface TermItem {
  id: string;
  term: string;
  aliases: string[];
  /** 확인된 설명. 근거가 없으면 빈 문자열로 두고 `pendingReason`을 채운다. */
  description: string;
  /** 설명을 싣지 못한 이유 (예: 공식 근거 미확인) */
  pendingReason: string;
  sourceUrl: string;
  verifiedAt: string;
  reviewStatus: ReviewStatus;
}

/** 민원실 안내 1건. */
export interface OfficeItem {
  id: string;
  name: string;
  address: string;
  /** 요일별 운영시간 문자열 */
  hours: string[];
  phone: string;
  note: string;
  sourceUrl: string;
  verifiedAt: string;
  reviewStatus: ReviewStatus;
}

/** 외부 공식 사이트 링크. */
export interface OfficialLink {
  id: string;
  label: string;
  organization: string;
  url: string;
  description: string;
}
