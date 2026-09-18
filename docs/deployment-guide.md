# 배포 가이드

## 0. 운영 구조

```text
GitHub에서 개발
  → GitHub Pages에서 개발·검토용 미리보기        (npm run build:preview)
  → 정적 배포 파일 생성                          (npm run build:official)
  → 충주시 홈페이지 운영업체에 ZIP 전달           (npm run package:official)
  → 충주시 공식 도메인에 업로드
  → 최종 QR은 충주시 공식 주소로 제작
```

**GitHub Pages 는 최종 운영 환경이 아닙니다.** 시민에게 배포할 QR을 GitHub Pages 주소로 만들지 마세요.

## 1. 빌드 채널

| 명령 | 채널 | 출력 | 특징 |
| --- | --- | --- | --- |
| `npm run dev` | `development` | (메모리) | Vite 개발 서버 |
| `npm run build:preview` | `preview` | `dist-preview/` | 개발용 배너, `noindex`, 제목에 `[개발·검토용]`, 전체 수집 차단 `robots.txt`, 소스맵 포함 |
| `npm run build:official` | `official` | `dist/` | 배너 없음, 소스맵 없음, `approved` 콘텐츠만, 자동검증 실행 |

채널은 `vite.config.ts` 의 `__BUILD_CHANNEL__` 로 주입되고, `src/lib/config.ts` 의 `IS_PREVIEW_CHANNEL` 이
정적 상수가 되므로 공식 빌드에서는 개발용 배너 코드와 문구가 번들에서 제거됩니다.

## 2. GitHub Pages 미리보기 배포

`.github/workflows/preview.yml` 이 다음을 수행합니다.

1. `npm ci`
2. `npm run typecheck`, `npm run test`
3. `npm run build:preview`
4. `dist-preview/` 를 GitHub Pages 에 배포

저장소 설정에서 **Settings → Pages → Source 를 "GitHub Actions"** 로 바꾸면 워크플로가 동작합니다.
Pages 공개는 저장소 관리자가 직접 설정해야 합니다.

미리보기 배포본은 `robots.txt` 로 전체 수집을 차단하고 `noindex, nofollow, noarchive` 메타를 넣습니다.

## 3. 공식 배포본 생성

```bash
npm run package:official
```

수행 내용:

1. `scripts/build-address-index.mjs` — 주소 인덱스 생성
2. `scripts/validate-content.mjs --strict` — 콘텐츠 검증 (실패 시 중단)
3. `vite build --mode official` — `dist/` 생성
4. `scripts/verify-official-build.mjs` — 산출물 자동검증
5. `scripts/package-official.mjs` — `release/chungju-minwon-guide.zip` 생성

### 자동검증 항목 (`verify-official-build.mjs`)

| 검사 | 실패 조건 |
| --- | --- |
| GitHub Pages 흔적 | `github.io` 문자열 |
| 참고 저장소 흔적 | `riseyoo1-alt`, `one-qr-service` |
| 여주시 자산 | `여주` 문자열 |
| 외부 CDN | Google Fonts, jsDelivr, cdnjs, unpkg 등 |
| 미승인 콘텐츠 | `reviewStatus` 가 `approved` 아닌 항목의 id/제목 |
| 미완성 표시 | `TODO`, `FIXME` |
| 비밀정보 | AWS/GitHub/Google/Slack 키 형태, PEM 개인키, `serviceKey=`, `apiKey:` |
| 개발용 배너 | `개발·검토용` 문자열, `noindex` |
| 소스맵 | `.map` 파일, `sourceMappingURL` 주석 |
| 절대경로 | `index.html` 의 `/`로 시작하는 `src`/`href`, 외부 절대 URL |
| 필수 요소 | CSP 메타, 본문 바로가기 링크 |
| robots.txt | 전체 수집 차단(`Disallow: /`)이 남아 있는 경우 |

## 4. 하위 경로 배포 확인

공식 배포본은 `/`, `/minwon/`, `/minwon/guide/` 어디에 올려도 동작해야 합니다.

```bash
npm run build:official
node scripts/serve-static.mjs dist 4173 /minwon/guide
# http://127.0.0.1:4173/minwon/guide/ 에서 확인
```

동작 원리:

- `vite.config.ts` 의 `base: './'` — 모든 자원을 상대경로로 참조
- `src/lib/paths.ts` — 번들 스크립트 자신의 위치(`import.meta.url`)에서 앱 루트를 역산해
  `data/address-index.json` 을 찾습니다. 도메인·경로를 하드코딩하지 않습니다.
- 해시 라우팅(`#/minwon/...`) — 서버 rewrite 설정이 필요 없습니다.

E2E 테스트(`npm run test:e2e`)도 이 하위 경로 조건에서 실행됩니다.

## 5. 최종 공식 URL 설정

`src/lib/config.ts` 의 `OFFICIAL_SERVICE_URL` 로 관리합니다.

```ts
export const OFFICIAL_SERVICE_URL = ''; // 확정 전에는 빈 문자열
```

- **확정 전에는 QR 이미지를 만들지 않습니다.**
- 확정되면 이 값을 채우고 `npm run package:official` 을 다시 실행합니다.
- QR 제작은 이 값이 채워진 뒤, 충주시 담당부서 확인을 거쳐 진행합니다.

## 6. 주소 데이터 교체

현재 `data/source/address-sample.csv` 는 **개발용 가상 데이터**입니다.

```bash
# 1. 충주시 공식 주소 원자료를 아래 열 구성의 CSV로 준비
#    시도,시군구,읍면동,리,산,본번,부번,도로명,건물본번,건물부번,건물명,우편번호
# 2. 변환
node scripts/build-address-index.mjs data/source/chungju-address.csv public/data/address-index.json
# 3. 빌드
npm run package:official
```

파일명에 `sample` 이 들어가지 않으면 인덱스의 `isSample` 이 `false` 가 되고,
화면의 "개발용 가상 주소 데이터" 안내를 지울 수 있습니다
(`src/components/address.ts` 의 `datasetNotice`).

## 7. 확장사항: 공식 주소 API 프록시

도로명주소 검색 API 등 공식 API는 승인키가 필요합니다.
**승인키를 브라우저 코드에 넣으면 그대로 노출되므로 넣지 않습니다.**

권장 구성:

```text
브라우저 ──(상대경로)──▶ 충주시 서버의 프록시 엔드포인트 ──(승인키 포함)──▶ 공식 주소 API
                          예: /minwon/guide/api/address
```

- 승인키는 서버 환경변수로만 보관합니다.
- 프록시는 검색어만 전달하고, 개인정보를 기록하지 않습니다.
- 프런트엔드는 `src/lib/address/adapters.ts` 의 `ProxyApiAdapter` 에 엔드포인트 상대경로를 넘기고,
  `src/components/address.ts` 의 `adapters` 배열 순서만 바꾸면 됩니다.
- 프록시가 없으면 `isAvailable()` 이 `false` 여서 자동으로 로컬 인덱스가 쓰입니다.

이 기능은 **별도 확장사항**이며, 1차 버전 범위에 들어 있지 않습니다.

## 8. 1차 버전에서 하지 않는 것

- **서비스워커 / PWA**: 오래된 민원정보가 캐시될 수 있어 적용하지 않았습니다.
- **분석·광고·추적 스크립트**: 넣지 않습니다.
- **쿠키**: 사용하지 않습니다.
- **QR 이미지 생성**: 공식 URL 확정 전에는 만들지 않습니다.
