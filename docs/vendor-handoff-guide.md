# 홈페이지 운영업체 전달 안내

충주시 민원안내(가칭) 정적 페이지를 충주시 웹 서버에 올릴 때 필요한 내용만 정리했습니다.

## 1. 전달 파일

`release/chungju-minwon-guide.zip`

압축을 풀면 다음이 나옵니다.

```text
dist/
├── index.html
├── favicon.svg
├── robots.txt
├── assets/
│   ├── index-<해시>.js
│   └── style-<해시>.css
└── data/
    └── address-index.json
README-업로드안내.txt
```

## 2. 업로드 위치

`dist/` **안의 내용**을 원하는 경로에 그대로 올립니다.

- 루트에 올리는 경우: `https://<도메인>/` → `index.html` 이 루트에 오도록
- 하위 경로에 올리는 경우: `https://<도메인>/minwon/guide/` → 그 폴더 안에 `index.html`

두 경우 모두 별도 설정 없이 동작합니다. **폴더 구조와 파일명을 바꾸지 마세요.**

## 3. 기본 진입 파일

`index.html`

디렉터리 기본 문서(DirectoryIndex / index 파일) 설정에 `index.html` 이 포함되어 있어야 합니다.

## 4. MIME 타입

| 확장자 | Content-Type |
| --- | --- |
| `.html` | `text/html; charset=utf-8` |
| `.js` | `text/javascript; charset=utf-8` |
| `.css` | `text/css; charset=utf-8` |
| `.json` | `application/json; charset=utf-8` |
| `.svg` | `image/svg+xml` |
| `.txt` | `text/plain; charset=utf-8` |

자바스크립트는 `<script type="module">` 로 불러옵니다. `.js` 의 MIME 타입이 틀리면 화면이 뜨지 않습니다.

## 5. 캐시 설정 권고

| 대상 | 권고 |
| --- | --- |
| `assets/` 아래 파일 | `Cache-Control: public, max-age=31536000, immutable` (파일명에 해시가 있음) |
| `index.html` | `Cache-Control: no-cache` |
| `data/address-index.json` | `Cache-Control: no-cache` 또는 짧은 max-age |
| `robots.txt` | 짧은 max-age |

민원 내용이 갱신되면 `index.html` 과 `data/` 는 즉시 새 파일을 받아야 하므로 장기 캐시를 걸지 마세요.

## 6. 상대경로 유지

- 모든 자원이 상대경로로 참조됩니다. 경로 재작성(rewrite)·리다이렉트 규칙을 추가하지 마세요.
- 화면 이동은 주소의 `#` 뒷부분만 사용합니다. SPA 용 fallback 설정이 필요 없습니다.
- 서버에서 HTML을 가공하거나 스크립트를 주입하지 마세요. 페이지에 CSP가 설정되어 있어 인라인 스크립트는 차단됩니다.

### 선택: 응답 헤더로 추가하면 좋은 보안 설정

페이지 안의 `<meta>` CSP로는 적용되지 않는 항목입니다. 서버 설정이 가능하면 추가해 주세요.

```text
Content-Security-Policy: frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

없어도 페이지는 정상 동작합니다.

## 7. 업로드 후 점검 항목

- [ ] `https://<도메인>/<경로>/` 가 열린다
- [ ] 화면 상단에 **"개발·검토용"** 문구가 **없다**
- [ ] 문서 제목이 `충주시 민원안내` 이다 (앞에 `[개발·검토용]` 이 붙어 있지 않다)
- [ ] 첫 화면에서 민원 검색이 동작한다
- [ ] 민원을 눌렀을 때 상세 화면이 열린다
- [ ] 주소·지번 검색에서 결과가 나온다 (주소 데이터가 로드됨)
- [ ] 면적 환산이 계산된다
- [ ] 브라우저 개발자도구 → 네트워크 탭에 **외부 도메인 요청이 없다**
- [ ] 브라우저 개발자도구 → 콘솔에 오류가 없다
- [ ] 휴대전화(세로 화면)에서 가로 스크롤이 생기지 않는다

## 8. 롤백 방법

1. 업로드 **전에** 기존 폴더를 통째로 백업합니다.
   예: `guide` → `guide_backup_YYYYMMDD`
2. 문제가 생기면 새 폴더를 지우고 백업 폴더 이름을 원래대로 되돌립니다.
3. 캐시가 남아 있으면 `index.html` 의 캐시를 비우거나 CDN 캐시를 무효화합니다.

파일만 교체하는 구조라 데이터베이스 변경이나 서버 재시작은 필요 없습니다.

## 9. 문의

콘텐츠(민원 내용, 수수료, 처리기간) 관련 문의는 충주시 담당부서로,
파일·업로드 관련 문의는 이 페이지를 전달한 담당자에게 해 주세요.
