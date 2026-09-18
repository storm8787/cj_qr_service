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

/** 서식의 기재 항목 묶음. */
export interface FormSection {
  title: string;
  fields: string[];
}

/**
 * 민원서식 1건.
 *
 * 법령의 별지서식 원본(HWPX)과, 그 안에서 읽어 낸 기재 항목·유의사항을 함께 담는다.
 * 별지서식은 법령의 일부이므로 근거 법령·별지 번호·개정일이 곧 출처다.
 */
export interface MinwonForm {
  id: string;
  title: string;
  /** 근거 법령 (예: 주민등록법 시행규칙) */
  law: string;
  /** 별지 번호 (예: 별지 제7호서식) */
  formNumber: string;
  /** 서식 개정일 (YYYY-MM-DD) */
  revisedAt: string;
  /** 국가법령정보센터 법령 페이지 */
  lawUrl: string;
  /** 앱 루트 기준 상대경로 (예: forms/xxx.hwpx) */
  file: string;
  fileSizeBytes: number;
  pageCount: number;
  summary: string;
  sections: FormSection[];
  /** 서식에 적힌 유의사항 */
  notices: string[];
  /** 수수료 면제 대상 (서식에 적힌 경우) */
  feeExemptions: string[];
  /** 서식에 수수료가 적혀 있으면 그 내용 */
  fee: string;
  /** 서식에 처리기간이 적혀 있으면 그 내용 */
  processingTime: string;
  relatedMinwonIds: string[];
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
