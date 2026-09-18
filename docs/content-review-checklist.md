# 콘텐츠 검토 체크리스트

이 문서는 충주시 담당부서가 민원 콘텐츠를 확인할 때 쓰는 점검표입니다.
검토가 끝난 항목만 `reviewStatus: "approved"` 로 바꾸며, **공식 배포본에는 `approved` 항목만 포함됩니다.**

## 1. 검토상태

| 값 | 뜻 | 공식 배포본 노출 |
| --- | --- | --- |
| `draft` | 작성 중 | 노출되지 않음 |
| `review-needed` | 담당자 확인 필요 | 노출되지 않음 |
| `approved` | 담당자 확인 완료 | 노출됨 |

`npm run build:official` 은 `scripts/validate-content.mjs --strict` 를 먼저 실행합니다.
`approved` 항목에 `sourceUrl`, `verifiedAt`, `officialUrl`, `officialUrlOrganization` 중 하나라도 빠지면 **빌드가 실패합니다.**

## 2. 항목별 점검 사항

각 민원(`src/data/minwon-items.json`)에 대해 다음을 확인합니다.

- [ ] `title` 이 충주시·정부24에서 쓰는 공식 민원명과 같은가
- [ ] `aliases` 에 시민이 실제로 쓰는 말이 들어 있는가 (예: 등초본, 전입세대열람원)
- [ ] `summary` 가 쉬운 한국어로 쓰였는가
- [ ] `applicationChannel` 이 실제 신청 경로와 일치하는가
- [ ] `onlineStatus` 가 아래 기준에 맞는가
- [ ] `requiredDocuments` 가 현행 안내와 일치하는가
- [ ] `fee` 가 현행 수수료(면제 대상 포함)와 일치하는가
- [ ] `processingTime` 이 현행 처리기간과 일치하는가
- [ ] `location` 이 충주시의 실제 담당 창구명인가
- [ ] `contact` 가 실제 문의처인가
- [ ] `eligibility` 에 신청 자격 제한과 주의사항이 빠짐없이 들어 있는가
- [ ] `officialUrl` 이 열리는가 (링크 깨짐 확인)
- [ ] `sourceUrl` 이 내용을 확인한 근거 페이지인가
- [ ] `verifiedAt` 을 오늘 날짜로 갱신했는가
- [ ] 확인하지 못한 필드를 `unverifiedFields` 에 남겼는가
- [ ] 정식 콘텐츠로 교체했다면 `isSample` 을 `false` 로 바꾸었는가

### `onlineStatus` 판정 기준

공식 근거 없이 `온라인 발급`이라고 쓰지 않습니다.

| 값 | 화면 표기 | 쓰는 경우 |
| --- | --- | --- |
| `online-issue` | 온라인 발급 | 공식 사이트에서 발급·출력까지 끝나는 경우 |
| `online-apply` | 온라인 신청 | 온라인 신청은 되지만 수령은 별도인 경우 |
| `info-only` | 공식 안내 확인 | 온라인에서는 안내만 볼 수 있는 경우 |
| `visit-only` | 방문 신청만 가능 | 공식 안내가 신청방법을 방문으로 정한 경우 |
| `check-required` | 담당기관 확인 필요 | 위 어느 것도 확인하지 못한 경우 |

**확실하지 않으면 `check-required` 를 씁니다.** 추측해서 `online-issue` 로 쓰지 않습니다.

## 3. 참고 서비스에서 확인된 오류 — 반복하지 않을 것

### 3.1 토지등급

참고 서비스는 토지등급을 "1등급이 가장 비싸고 숫자가 클수록 저렴하다"고 설명했습니다.
**이 설명은 공식 근거가 확인되지 않았습니다.**

- 현재 처리: `src/data/terms.json` 의 `toji-deunggeup` 항목은 `description` 을 비우고
  `pendingReason` 에 확인 필요 사유를 적어 두었습니다. 상태는 `review-needed` 입니다.
- 검토 시 확인할 것:
  - 토지(임야)대장에 지금도 토지등급이 표시되는지
  - 표시된다면 그 값이 무엇을 뜻하고 현재 어떤 효력이 있는지
  - 개별공시지가와의 관계
- 근거를 확인하기 전에는 **설명을 싣지 않습니다.**

`scripts/validate-content.mjs` 가 `1등급이 가장 비싸`, `숫자가 클수록 저렴` 같은 표현을 탐지해 빌드를 실패시킵니다.

### 3.2 전입세대확인서

참고 서비스는 전입세대확인서를 등·초본, 건축물대장 등과 함께 "온라인 확인" 가능한 서류로 묶어 표기했습니다.

- 확인 결과(2026-09-18): 정부24 민원안내 `전입세대확인서 열람(발급)`
  (https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13100000305) 의 신청방법은 **방문**입니다.
- 현재 처리: `onlineStatus: "visit-only"`, `applicationChannel: ["visit"]`.
- 검토 시 확인할 것:
  - 신청할 수 있는 이해관계인의 범위
  - 이해관계를 증명하는 서류로 무엇이 인정되는지
  - 수수료와 면제 대상

### 3.3 그 밖에 재확인이 필요한 것

- 민원별 신청 자격 (특히 제3자·대리 신청)
- 준비서류 (민원별 차이가 큼)
- 수수료 (방문/온라인/무인발급기별 차이, 면제 대상)
- 처리기간 (즉시 처리 여부)
- 온라인 발급 가능 여부

## 4. 아직 채우지 못한 항목 (2026-09-18 기준)

### 4.1 `review-needed` 상태의 민원

| id | 민원명 | 필요한 확인 |
| --- | --- | --- |
| `seal-certificate` | 인감증명서 발급 | 공식 안내 페이지 주소, 준비서류, 수수료, 처리기간 |
| `family-relation-certificate` | 가족관계증명서 발급 | 소관 기관, 공식 안내 페이지, 신청 창구 |
| `lease-fixed-date` | 확정일자 부여 신청 | 신청 창구(행정복지센터/등기소/온라인), 준비서류, 수수료 |

### 4.2 `review-needed` 상태의 행정용어

| id | 용어 | 필요한 확인 |
| --- | --- | --- |
| `toji-deunggeup` | 토지등급 | 현행 의미와 효력 (위 3.1 참고) |
| `geonpyeyul` | 건폐율 | 충주시 조례상 지역별 허용 범위 |
| `yongdo-jiyeok` | 용도지역 | 충주시 조례상 용도지역별 제한 |

### 4.3 민원실 정보 (`src/data/offices.json`)

- 충주시청 민원실 주소·운영시간·전화번호
- 읍·면·동 행정복지센터 목록과 연락처

### 4.4 전체 항목에서 비어 있는 필드

거의 모든 민원의 `processingTime`, 다수의 `fee` 와 `contact` 가 비어 있고
`unverifiedFields` 에 기록되어 있습니다. 화면에는 `확인 필요` 로 표시됩니다.
추측해서 채우지 말고, 공식 안내 또는 담당부서 확인 결과로만 채워 주세요.

## 5. 검토 후 절차

```bash
# 1. src/data/*.json 수정
# 2. 검증
node scripts/validate-content.mjs --strict
npm run test

# 3. 미리보기로 확인
npm run build:preview && npm run preview:serve

# 4. 공식 배포본 생성
npm run package:official
```
