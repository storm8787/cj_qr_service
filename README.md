# 충주시 민원안내 (가칭)

충주시 민원실을 방문하거나 온라인 민원을 이용하는 시민이 **휴대전화에서** 민원 정보를 빠르게 찾을 수 있는
정적 웹서비스입니다.

> **이 저장소는 개발·버전관리·검토용입니다.**
> 최종 시민 대상 서비스는 충주시 공식 홈페이지 서버에서 운영합니다.
> GitHub Pages 는 검토용 미리보기이며, **시민에게 배포할 QR을 GitHub Pages 주소로 만들지 마세요.**

> **명칭·심벌 안내**
> `충주시 민원안내` 는 가칭입니다. 충주시 공식 명칭과 심벌은 확정된 자료가 없어 사용하지 않았고,
> 현재는 텍스트 기반 임시 브랜드를 씁니다.

## 서비스 개요

| 화면 | 내용 |
| --- | --- |
| 첫 화면 | 통합검색, 음성검색(지원 브라우저), 자주 찾는 민원, 분야별 민원, 도움 기능, 공식 사이트 연결 |
| 민원 검색 | 민원명·별칭·관련 키워드 검색. 결과 없음/짧은 검색어 안내 |
| 민원 상세 | 준비서류, 수수료, 처리기간, 신청 자격, 담당 창구, 공식 안내 링크, 출처·최종 확인일·검토상태 |
| 민원서식 안내 | 신청서 기재 항목 미리보기 + 법령 별지서식 원본(HWPX) 내려받기 |
| 행정용어 찾기 | 어려운 행정용어 설명 (근거를 확인한 것만 게시) |
| 주소·지번 검색 | 지역명 + 숫자 AND 검색, 본번/부번 구조 분리 |
| 면적 환산 | ㎡ ↔ 평 (1평 = 3.305785㎡) |
| 민원실 이용안내 | 위치·운영시간·문의처 |

기술 구성: **Vite + TypeScript + 순수 DOM** (프레임워크 없음).
외부 CDN·외부 폰트·외부 UI 라이브러리를 쓰지 않으며, 산출물은 순수 정적 파일입니다.
운영 서버에 Node.js 가 필요하지 않습니다.

## 시작하기

```bash
npm install
npm run dev          # http://127.0.0.1:5173
```

Node 20 이상이 필요합니다(개발 환경에만 필요, 운영 서버에는 불필요).

### 모든 명령

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run typecheck` | TypeScript 타입 검사 |
| `npm test` | 단위 테스트 (vitest) |
| `npm run test:e2e` | 브라우저 E2E·접근성 테스트 (Playwright + axe) |
| `npm run build:preview` | 개발·검토용 빌드 → `dist-preview/` |
| `npm run build:official` | 공식 배포본 빌드 + 자동검증 → `dist/` |
| `npm run package:official` | 공식 빌드 후 전달용 ZIP → `release/chungju-minwon-guide.zip` |
| `npm run check` | 타입 검사 + 테스트 + 양쪽 빌드 |
| `npm run build:address-index` | CSV → 주소 인덱스 JSON 생성 |
| `npm run preview:serve` | 개발·검토용 빌드 결과 확인 |

## 폴더 구조

```text
.
├── index.html                    # 진입 HTML (Vite 엔트리)
├── src/
│   ├── components/               # 화면 구성 (DOM 생성)
│   ├── data/                     # 민원·용어·민원실·링크 데이터 (화면 코드와 분리)
│   ├── lib/                      # 검색·환산·라우팅 등 순수 로직
│   │   └── address/              # 주소 검색 (파싱 / 검색 / 어댑터)
│   ├── styles/
│   ├── types/
│   └── main.ts
├── public/
│   ├── forms/*.hwpx              # 법령 별지서식 원본
│   ├── data/address-index.json   # 생성물 (git 에 올리지 않음)
│   ├── favicon.svg
│   └── robots.txt
├── data/source/address-sample.csv  # 개발용 가상 주소 원자료
├── scripts/
│   ├── build-address-index.mjs   # CSV → 검색용 JSON
│   ├── validate-content.mjs      # 콘텐츠 검증 (빌드 차단)
│   ├── verify-official-build.mjs # 공식 배포본 자동검증
│   ├── package-official.mjs      # 전달용 ZIP 생성
│   └── serve-static.mjs          # 하위 경로 배포 확인용 정적 서버
├── tests/                        # 단위 테스트 + tests/e2e (Playwright)
├── docs/
│   ├── reference-audit.md        # 참고 서비스 분석 결과
│   ├── content-review-checklist.md
│   ├── deployment-guide.md
│   └── vendor-handoff-guide.md
├── .github/workflows/
├── vercel.json                   # Vercel 미리보기 배포 설정
└── netlify.toml                  # Netlify 미리보기 배포 설정
```

## 콘텐츠 수정방법

민원 데이터는 화면 코드와 완전히 분리되어 있습니다.

| 파일 | 내용 |
| --- | --- |
| `src/data/minwon-items.json` | 민원 목록 |
| `src/data/terms.json` | 행정용어 |
| `src/data/forms.json` | 민원서식 (기재 항목·유의사항·수수료) |
| `src/data/offices.json` | 민원실 안내 |
| `src/data/official-links.json` | 공식 사이트 링크 |

민원 1건의 형태:

```jsonc
{
  "id": "resident-registration-copy",
  "category": "주민등록",
  "title": "주민등록표 등본(초본) 발급",
  "aliases": ["주민등록등본", "등본", "초본"],
  "keywords": ["세대원", "주소이력"],
  "summary": "…",
  "applicationChannel": ["visit", "online", "kiosk"],
  "onlineStatus": "online-issue",     // 아래 표 참고
  "requiredDocuments": ["…"],
  "fee": "…",
  "processingTime": "",               // 비어 있으면 unverifiedFields 에 넣을 것
  "location": "…",
  "contact": "",
  "eligibility": ["…"],
  "officialUrl": "https://…",
  "officialUrlOrganization": "정부24", // 외부 링크에 기관명 표기
  "sourceUrl": "https://…",           // approved 이면 필수
  "verifiedAt": "2026-09-18",         // approved 이면 필수
  "reviewStatus": "approved",         // draft | review-needed | approved
  "needsDepartmentCheck": true,
  "unverifiedFields": ["processingTime", "contact"],
  "isSample": true
}
```

`onlineStatus` 값 — **공식 근거 없이 `온라인 발급`이라고 쓰지 않습니다.**

| 값 | 화면 표기 |
| --- | --- |
| `online-issue` | 온라인 발급 |
| `online-apply` | 온라인 신청 |
| `info-only` | 공식 안내 확인 |
| `visit-only` | 방문 신청만 가능 |
| `check-required` | 담당기관 확인 필요 |

수정 후:

```bash
node scripts/validate-content.mjs --strict
npm test
```

**`approved` 항목에 `sourceUrl` 또는 `verifiedAt` 이 없으면 빌드가 실패합니다.**
공식 배포본에는 `approved` 콘텐츠만 포함됩니다.

자세한 검토 절차는 [`docs/content-review-checklist.md`](docs/content-review-checklist.md) 를 참고하세요.

## 민원서식 추가·교체 방법

서식 파일은 **법령의 별지서식 원본(HWPX)** 입니다.
별지서식은 법령의 일부라 저작권법 제7조에 따라 보호 대상에서 제외되므로 그대로 실을 수 있습니다.

1. 국가법령정보센터에서 최신 별지서식(HWPX)을 내려받아 `public/forms/` 에 넣습니다.
   파일명은 소문자·하이픈만 씁니다 (`^forms/[a-z0-9-]+\.hwpx$` 를 검증합니다).
2. `src/data/forms.json` 에 항목을 추가합니다.

   ```jsonc
   {
     "id": "jeonip-singo",
     "title": "전입신고서 (세대 모두 이동)",
     "law": "주민등록법 시행령",          // approved 이면 필수
     "formNumber": "별지 제15호서식",      // approved 이면 필수
     "revisedAt": "2024-12-03",           // 서식 첫 줄의 <개정 …> 을 그대로
     "lawUrl": "https://www.law.go.kr/법령/주민등록법시행령",
     "file": "forms/jeonip-singoseo.hwpx",
     "fileSizeBytes": 76043,              // 실제 파일 크기와 일치해야 함
     "pageCount": 2,
     "sections": [ { "title": "…", "fields": ["…"] } ],
     "notices": ["…"],                    // 서식에 적힌 유의사항
     "feeExemptions": [],
     "fee": "",                           // 서식에 적혀 있으면 그대로
     "processingTime": "",
     "relatedMinwonIds": ["moving-report"],
     "verifiedAt": "2026-09-18",
     "reviewStatus": "approved"
   }
   ```

3. 검증합니다. 파일 누락·크기 불일치·존재하지 않는 `relatedMinwonIds` 는 **빌드를 실패시킵니다.**

   ```bash
   node scripts/validate-content.mjs --strict
   npm test
   ```

서식 안의 기재 항목은 HWPX 를 풀어서 읽을 수 있습니다 (ZIP + XML 구조).

```bash
unzip -p public/forms/<파일>.hwpx Contents/section0.xml \
  | grep -o '<hp:t>[^<]*</hp:t>' | sed 's/<[^>]*>//g'
```

> 서식은 개정됩니다. 교체할 때 `revisedAt` 과 `verifiedAt` 을 함께 갱신해 주세요.

## 주소 데이터 교체방법

현재 포함된 주소는 **개발용 가상 데이터**입니다. 실제 주소가 아닙니다.

1. 충주시 공식 주소 원자료를 아래 열 구성의 CSV로 준비합니다.

   ```csv
   시도,시군구,읍면동,리,산,본번,부번,도로명,건물본번,건물부번,건물명,우편번호
   충청북도,충주시,○○동,,N,123,4,○○로,25,0,○○아파트,27300
   ```

   - `산` 열: 임야면 `Y`, 아니면 `N`
   - `부번`, `건물부번`: 없으면 비워 둡니다(0으로 저장됩니다)

2. 변환합니다.

   ```bash
   node scripts/build-address-index.mjs data/source/chungju-address.csv public/data/address-index.json
   ```

3. 빌드합니다. 파일명에 `sample` 이 없으면 인덱스의 `isSample` 이 `false` 가 됩니다.
   그 뒤 `src/components/address.ts` 의 "개발용 가상 주소 데이터" 안내를 제거하면 됩니다.

대량 주소자료는 `index.html` 에 넣지 않고 항상 별도 JSON 으로 두어 런타임에 받아 옵니다.

향후 공식 주소 API 를 쓰려면 `src/lib/address/adapters.ts` 의 `ProxyApiAdapter` 를 사용합니다.
**API 키는 브라우저 코드에 넣지 않습니다.** 서버 프록시 구성은
[`docs/deployment-guide.md`](docs/deployment-guide.md) 의 "확장사항" 절을 참고하세요.

## 테스트방법

```bash
npm test          # 단위 테스트
npm run test:e2e  # 브라우저 테스트 (공식 빌드 필요)
```

단위 테스트가 다루는 것:

- 민원명·별칭·키워드 검색, 여러 단어 AND 검색
- 띄어쓰기·구두점·전각문자·하이픈 변형 정규화
- 주소의 지역명 + 숫자 AND 검색
- 지번 본번·부번 구분, 산 지번 구분
- 무관한 숫자 부분일치 방지 (`12` 가 `123`·`1123`·`312-1` 을 끌어오지 않음)
- ㎡ ↔ 평 양방향 계산, 반올림 경계값
- 잘못된 숫자 입력(문자·음수·과대값·지수표기) 처리
- CSV → 주소 인덱스 변환
- 콘텐츠 검증 규칙 (참고 서비스의 부정확한 설명 재유입 차단 포함)

E2E 테스트가 다루는 것 (360 / 768 / 1280px 세 화면폭):

- 하위 경로(`/minwon/guide/`) 배포 동작, 외부 도메인 요청 0건
- 개발용·공식용 빌드 차이 (배너·제목·미승인 콘텐츠 제외)
- axe 접근성 자동검사 (주요 7개 화면)
- 키보드 탐색: 본문 바로가기, 검색 실행, 상세 이동, 모달 포커스 가둠·복귀
- 주소 검색·면적 환산 동작과 오류 메시지
- 가로 스크롤 없음, 200% 확대, 터치 영역 44px 이상

`npm run test:e2e` 는 Playwright 가 내려받은 Chromium 을 씁니다.
환경에 이미 Chromium 이 있으면 `CHROMIUM_PATH=/경로/chromium npm run test:e2e` 로 지정할 수 있습니다.

## GitHub Pages 미리보기 배포방법

1. 저장소 **Settings → Pages → Build and deployment → Source** 를 `GitHub Actions` 로 설정합니다.
2. **Settings → Environments → `github-pages` → Deployment branches and tags** 에 `main` 이 있는지 확인합니다.
   (배포 job 이 단계 없이 즉시 실패하면 대부분 이 설정 때문입니다)
3. **Actions** 탭에서 `개발·검토용 미리보기 배포` → **Run workflow** 로 첫 배포를 실행합니다.
4. 이후 `main` 브랜치에 푸시하면 `.github/workflows/preview.yml` 이 자동 실행됩니다.

작업 브랜치별 미리보기는 GitHub Pages 대신 Vercel·Netlify 를 씁니다(아래 참고).
여러 브랜치가 Pages 에 동시에 배포하면 어느 내용이 올라가 있는지 알 수 없게 되기 때문입니다.

자세한 절차와 주의사항은 [`docs/deployment-guide.md`](docs/deployment-guide.md) 를 참고하세요.

## Vercel · Netlify 미리보기 배포방법

GitHub Pages 외에 Vercel 과 Netlify 에도 같은 미리보기 빌드를 올릴 수 있습니다.
설정 파일이 저장소에 들어 있어 별도 입력 없이 연결만 하면 됩니다.

| 플랫폼 | 설정 파일 | 방법 |
| --- | --- | --- |
| Vercel | [`vercel.json`](vercel.json) | Add New → Project → 저장소 선택 → Deploy |
| Netlify (Git) | [`netlify.toml`](netlify.toml) | Add new site → Import an existing project → 저장소 선택 |
| Netlify (드래그앤드롭) | `dist-preview/_headers` (빌드 시 자동 생성) | `npm run build:preview` 후 `dist-preview` 폴더를 [app.netlify.com/drop](https://app.netlify.com/drop) 에 끌어다 놓기 |

공통 설정: 빌드 명령 `npm run build:preview`, 게시 폴더 `dist-preview`, Node 22.

세 곳 모두 개발·검토용 배너, `noindex` 메타, 수집 차단 `robots.txt`,
`X-Robots-Tag: noindex` 응답 헤더가 적용됩니다.
Serverless Function·Edge Function·rewrite 규칙 등 **플랫폼 전용 기능은 쓰지 않으므로**,
공식 배포본(`dist`)을 충주시 서버로 그대로 이관하는 데 아무런 영향이 없습니다.

> 미리보기는 `dist-preview`, 공식 배포본은 `dist` 로 폴더를 분리했습니다.
> 미리보기 빌드에는 배너와 `noindex` 가 들어 있어 공식 서버에 올리면 안 되기 때문입니다.
> 자세한 이유는 [`docs/deployment-guide.md`](docs/deployment-guide.md) 의 "출력 폴더가 `dist` 가 아닌 이유" 를 참고하세요.

미리보기 배포본에는 다음이 적용됩니다.

- 화면 상단 `개발·검토용 비공식 페이지` 배너
- 문서 제목 `[개발·검토용] 충주시 민원안내`
- `<meta name="robots" content="noindex, nofollow, noarchive">`
- `robots.txt` 전체 수집 차단

## 공식 배포본 생성방법

```bash
npm run package:official
```

→ `dist/` 와 `release/chungju-minwon-guide.zip` 이 만들어집니다.

공식 배포본은 다음을 만족합니다.

- 개발용 배너·`noindex` 없음, 소스맵 없음
- `approved` 콘텐츠만 포함 (미승인 항목은 번들에 아예 들어가지 않음)
- `github.io`, 참고 저장소 주소, 여주시 명칭·자산 없음
- 외부 CDN 요청 0건 — GitHub 에 연결되지 않아도 모든 기능 동작
- `dist/` 폴더만 복사하면 독립적으로 작동

`scripts/verify-official-build.mjs` 가 위 항목을 자동으로 검사하고, 하나라도 걸리면 빌드를 실패시킵니다.

## 충주시 서버 하위경로 업로드방법

`dist/` 안의 내용을 원하는 경로에 그대로 올리면 됩니다. 서버 rewrite 설정이 필요 없습니다.

```bash
# 하위 경로 동작 확인
npm run build:official
node scripts/serve-static.mjs dist 4173 /minwon/guide
# http://127.0.0.1:4173/minwon/guide/
```

운영업체에 전달할 내용은 [`docs/vendor-handoff-guide.md`](docs/vendor-handoff-guide.md) 에 정리되어 있습니다.

## 최종 URL 변경방법

`src/lib/config.ts` 의 `OFFICIAL_SERVICE_URL` 한 곳만 바꾸고 다시 패키징합니다.

```ts
export const OFFICIAL_SERVICE_URL = ''; // 확정 전에는 빈 문자열
```

**공식 URL 이 확정되기 전에는 QR 이미지를 만들지 않습니다.**

## 개인정보 및 보안

- 개인정보를 입력받거나 저장하지 않습니다. 주민등록번호 입력 기능이 없습니다.
- 검색어를 서버로 보내지 않습니다. 모든 검색은 브라우저 안에서 처리됩니다.
- 광고·추적 스크립트가 없고, 쿠키를 쓰지 않습니다.
- 사용자 입력을 `innerHTML` 에 넣지 않습니다. 모든 DOM 은 `createElement` + `textContent` 로 만듭니다.
- 외부 링크에 `rel="noopener noreferrer"` 를 적용합니다.
- 빌드 산출물에 CSP 메타 태그를 넣습니다. 인라인 스크립트가 없습니다.
- 공식 배포본에서 소스맵을 제외합니다.
- `.gitignore` 가 `.env`, `*.pem`, `*.key` 등을 차단하고,
  자동검증 스크립트가 배포본에서 키 형태 문자열을 탐지합니다.
- 음성검색은 브라우저의 Web Speech API 를 쓰며, 이 서비스의 서버로 음성을 보내거나 저장하지 않습니다.

## 웹 접근성

KWCAG 2.2 와 KRDS 의 취지를 반영해 다음을 적용했습니다.

- 조작 요소를 모두 `button` / `a` 로 구현 (`div` + 클릭 이벤트 없음)
- 모든 입력에 연결된 `label`, 도움말은 `aria-describedby`
- 본문 바로가기 링크, 명확한 `:focus-visible` 표시
- 검색결과 변경을 `aria-live` 로 알림, 화면 전환 시 `h1` 로 포커스 이동
- 모달의 포커스 가둠·Esc 닫기·포커스 복귀
- 색상만으로 상태를 구분하지 않음 (모든 배지에 글자 병기)
- 구체적인 오류 메시지 (`role="alert"`)
- 200% 확대 시 내용 손실 없음, 터치 영역 44px 이상
- 장식용 SVG 는 `aria-hidden` 으로 제외, 외부 아이콘 CDN 미사용
- 자동재생 없음, `prefers-reduced-motion` 지원
- `meta viewport` 에 확대 제한을 두지 않음

**인증을 받았다고 표현하지 않습니다.** 자동검사 결과와 수동 키보드 테스트 결과만 보고합니다.

## 알려진 제한사항

1. **주소 데이터가 가상 데이터입니다.** 실제 충주시 주소가 아닙니다. 교체가 필요합니다.
2. **민원 콘텐츠가 시범 데이터입니다.** 정부24 민원안내 페이지를 근거로 작성했으며,
   충주시 담당부서 확인을 거쳐야 정식 콘텐츠가 됩니다.
3. **대부분의 `processingTime` 과 일부 `fee`·`contact` 가 비어 있습니다.**
   추측해서 채우지 않았고, 화면에 `확인 필요` 로 표시됩니다.
4. **민원 3건(인감증명서 발급, 가족관계증명서 발급, 확정일자 부여 신청)과 용어 3건
   (토지등급, 건폐율, 용도지역)이 `review-needed` 입니다.** 공식 배포본에서 제외됩니다.
5. **민원실 위치·운영시간·전화번호가 비어 있습니다.** 충주시 공식 자료 확인이 필요합니다.
6. **음성검색은 Web Speech API 를 지원하는 브라우저에서만 동작합니다.**
   미지원 브라우저에서는 버튼이 나타나지 않고 일반 검색을 그대로 씁니다.
   인식 처리 방식은 브라우저 구현에 따르며, 브라우저 제공사 서버를 거칠 수 있어 마이크 사용 전 안내합니다.
7. **서비스워커/PWA 를 적용하지 않았습니다.** 오래된 민원정보가 캐시될 위험 때문입니다.
8. **`frame-ancestors` 는 `<meta>` CSP 로 적용되지 않습니다.** 필요하면 서버 응답 헤더로 설정해야 합니다.
9. **충주시 공식 색상·심벌을 쓰지 않았습니다.** 승인 자료 확보 후 적용해야 합니다.

## 라이선스

소스코드는 [MIT 라이선스](LICENSE)입니다. 공공기관이 제약 없이 재사용·수정·재배포할 수 있으며,
저작자 표시만 유지하면 됩니다.

콘텐츠(민원 안내 문구·데이터)는 코드와 별개이며, 정부24 등 외부 기관 자료를 인용한 부분은
해당 기관의 이용 조건을 따릅니다.

## 참고 서비스

기능과 정보구조 참고를 위해 공개 저장소 `riseyoo1-alt/one-qr-service` 를 분석했습니다.
해당 저장소에는 **명시적 라이선스가 없어** 소스코드·이미지·문구를 일절 복사하지 않고 전부 새로 작성했습니다.
분석 결과와 개선 내역은 [`docs/reference-audit.md`](docs/reference-audit.md) 에 있습니다.
