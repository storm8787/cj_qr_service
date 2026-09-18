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

배포는 **`main` 브랜치에서만** 이루어집니다. 작업 브랜치별 미리보기가 필요하면 Vercel·Netlify 를 쓰세요(아래 2-1).

### 설정 절차 (저장소 관리자가 1회 수행)

1. GitHub 저장소 → **Settings** 탭
2. 왼쪽 메뉴 **Pages**
3. **Build and deployment → Source** 를 `Deploy from a branch` 에서 **`GitHub Actions`** 로 변경
   (저장 버튼 없이 즉시 적용됩니다)
4. **Settings → Environments → `github-pages` → Deployment branches and tags** 에
   **`main` 이 허용 목록에 있는지 확인**합니다. 없으면 추가합니다. ← 아래 "자주 겪는 문제" 참고
5. **Actions** 탭 → 왼쪽에서 `개발·검토용 미리보기 배포` 선택 → **Run workflow** 로 첫 배포 실행
6. 완료되면 Settings → Pages 상단에 `https://<계정>.github.io/<저장소>/` 주소가 표시됩니다

### 자주 겪는 문제

**배포(`GitHub Pages 배포 (검토용)`) job 이 몇 초 만에 단계 하나 없이 실패한다**

`github-pages` 환경의 **배포 브랜치 정책**이 그 브랜치를 허용하지 않는 경우입니다.
빌드 job 은 전부 성공했는데 배포 job 만 즉시 실패하는 것이 특징입니다.

Pages 를 처음 켤 때 GitHub 이 **그 시점의 기본 브랜치**를 허용 목록에 넣습니다.
나중에 기본 브랜치를 바꾸면 이 목록은 자동으로 따라오지 않습니다.

> 해결: **Settings → Environments → `github-pages` → Deployment branches and tags**
> 에서 `main` 을 추가(또는 `No restriction` 으로 변경)합니다.

**그 밖에**

- `workflow_dispatch`(수동 실행) 버튼은 워크플로 파일이 **기본 브랜치에 있을 때만** Actions 탭에 나타납니다.
- 저장소가 비공개이면 GitHub Pages 공개에 요금제 제약이 있을 수 있습니다.
  Settings → Pages 에서 안내되는 내용을 확인해 주세요.
- **이 주소는 검토용입니다.** 시민 배포용 QR을 이 주소로 만들지 마세요.

미리보기 배포본은 `robots.txt` 로 전체 수집을 차단하고 `noindex, nofollow, noarchive` 메타를 넣습니다.

## 2-1. Vercel · Netlify 미리보기 배포

GitHub Pages 외에 Vercel 과 Netlify 에서도 같은 미리보기 빌드를 올릴 수 있습니다.
**세 곳 모두 같은 `npm run build:preview` 산출물을 씁니다.** 플랫폼 전용 기능은 쓰지 않습니다.

| 항목 | 값 |
| --- | --- |
| 빌드 명령 | `npm run build:preview` |
| 출력(게시) 폴더 | `dist-preview` |
| 설치 명령 | `npm ci` |
| Node 버전 | 22 |

### Vercel

설정 파일: [`vercel.json`](../vercel.json)

1. Vercel 에서 **Add New → Project** → 이 GitHub 저장소를 선택
2. Framework Preset 은 **Other** 로 둡니다 (`vercel.json` 이 빌드 설정을 덮어씁니다)
3. Deploy — 이후 push 할 때마다 자동 배포됩니다

### Netlify (Git 연동)

설정 파일: [`netlify.toml`](../netlify.toml)

1. Netlify 에서 **Add new site → Import an existing project** → 이 GitHub 저장소를 선택
2. 빌드 명령과 게시 폴더는 `netlify.toml` 에서 자동으로 읽힙니다
3. Deploy — 이후 push 할 때마다 자동 배포됩니다

### Netlify (드래그앤드롭)

GitHub 연동 없이 폴더만 올리는 방법입니다.

```bash
npm run build:preview
```

생성된 **`dist-preview` 폴더를** [app.netlify.com/drop](https://app.netlify.com/drop) 에 끌어다 놓습니다.

`netlify.toml` 은 저장소 루트에 있어 드래그앤드롭에는 적용되지 않으므로,
빌드가 `dist-preview/_headers` 파일을 함께 만들어 폴더 안에 넣습니다.
Netlify 는 이 파일을 읽어 수집 차단 헤더를 적용합니다.
(`vite.config.ts` 의 `previewNoindexPlugin` 참고)

### 미리보기 3곳에 공통으로 적용되는 것

- 화면 상단 `개발·검토용 비공식 페이지` 배너
- 문서 제목 `[개발·검토용] 충주시 민원안내`
- `<meta name="robots" content="noindex, nofollow, noarchive">`
- `robots.txt` 전체 수집 차단
- `X-Robots-Tag: noindex, nofollow, noarchive` 응답 헤더 (Vercel·Netlify)

**어느 주소로도 시민 배포용 QR을 만들지 마세요.**

### 출력 폴더가 `dist` 가 아닌 이유

외부 미리보기는 `dist-preview` 를 씁니다. `dist` 는 **공식 배포본 전용**입니다.

미리보기 빌드에는 개발·검토용 배너와 `noindex` 가 들어 있어서, 그대로 충주시 공식 서버에 올리면
요구사항(공식 배포본에서 개발용 배너 제거)에 어긋납니다. 두 산출물이 같은 폴더 이름을 쓰면
섞여 올라갈 위험이 있어 분리했습니다.
`scripts/verify-official-build.mjs` 가 `dist` 에 `_headers`·`noindex`·배너 문구가 있으면 빌드를 실패시킵니다.

두 산출물은 **형식이 완전히 같습니다.** 둘 다 상대경로 기반 순수 정적 파일이고,
플랫폼 전용 기능(Serverless Function, Edge Function, Forms, Image CDN, rewrite 규칙)을 쓰지 않습니다.
따라서 `npm run package:official` 로 만든 `dist` 를 충주시 서버에 그대로 이관할 수 있습니다.

### 저장소를 비공개로 두고 싶을 때

Vercel·Netlify 는 비공개 저장소도 연결할 수 있고, 배포 주소에 비밀번호를 걸 수 있습니다
(Netlify: Site settings → Access control → Password protection / Vercel: Deployment Protection).
검토용 주소가 외부에 노출되면 곤란한 경우 이 설정을 함께 켜 주세요.

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
