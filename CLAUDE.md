# CLAUDE.md

마크다운(`.md`) 파일을 읽어 블로그 웹사이트로 변환하는 프로젝트. 프레임워크·번들러 없이 순수 HTML / CSS / JavaScript(ES modules)만 사용한다.

## 핵심 원칙

- **프레임워크 금지**: React, Vue, Tailwind, jQuery 등 사용하지 않는다. 빌드 도구(webpack, vite 등)도 쓰지 않는다.
- **의존성 최소화**: 마크다운 파싱은 직접 구현하거나, 필요 시 단일 파일 라이브러리(예: marked)를 `vendor/`에 복사해 사용한다. 새 의존성을 추가하기 전에 사용자에게 확인한다.
- **디자인**: 깔끔하고 읽기 좋은 것이 최우선. 본문 폭 65~75자(`max-width: 70ch` 안팎), 줄 간격 1.7 이상, 충분한 여백.
- **다크모드 필수**: 모든 색상은 CSS 변수로 정의한다. 하드코딩된 색상 값을 컴포넌트 CSS에 쓰지 않는다.
- **모바일 우선(mobile-first)**: 기본 스타일은 모바일 기준, `min-width` 미디어쿼리로 확장한다. 가로 스크롤이 생기면 버그다.
- **접근성**: 시맨틱 태그(`header`, `main`, `article`, `nav`), 이미지 `alt`, 키보드 포커스 표시, 충분한 명도 대비(WCAG AA).

## 동작 방식

1. 글은 `posts/*.md`에 둔다. 각 파일 상단에 YAML front matter를 넣는다.
   ```md
   ---
   title: 글 제목
   date: 2026-01-31
   tags: [javascript, css]
   summary: 목록에 보일 한 줄 요약
   draft: false
   ---
   ```
2. `scripts/build.mjs`(Node 내장 모듈만 사용)가 `posts/`를 읽어 `posts/index.json`(메타데이터 목록)을 생성한다. 정적 호스팅에서는 디렉터리 목록을 읽을 수 없기 때문이다.
3. 브라우저에서 `fetch`로 `index.json`과 각 `.md`를 불러와 클라이언트에서 HTML로 렌더링한다.
4. 라우팅은 해시 기반(`#/`, `#/post/<slug>`)을 사용해 서버 설정 없이 어디서나 동작하게 한다.
5. `draft: true`인 글은 목록에서 제외한다. 날짜 기준 내림차순 정렬.

## 디렉터리 구조 (목표)

```
my-blog/
├── index.html          # 단일 진입점 (SPA 셸)
├── css/
│   ├── tokens.css      # 색상·간격·폰트 CSS 변수 (라이트/다크)
│   ├── base.css        # 리셋, 타이포그래피
│   └── components.css  # 헤더, 카드, 코드블록, 태그 등
├── js/
│   ├── main.js         # 엔트리, 초기화
│   ├── router.js       # 해시 라우터
│   ├── markdown.js     # 마크다운 → HTML 변환
│   ├── frontmatter.js  # front matter 파서
│   └── theme.js        # 다크모드 토글
├── posts/              # 마크다운 글 + index.json (생성물)
├── scripts/build.mjs   # index.json 생성
└── CLAUDE.md
```

## 마크다운 지원 범위

제목(h1–h6), 문단, 굵게/기울임/취소선, 링크, 이미지, 인라인 코드, 펜스 코드블록(언어 표시), 순서/비순서 목록, 인용문, 수평선, 표(GFM), 체크박스 목록.
- **보안**: 변환 결과를 `innerHTML`에 넣기 전에 반드시 HTML 이스케이프한다. 원본 마크다운 내의 raw HTML은 기본적으로 허용하지 않는다. 링크의 `javascript:` 스킴은 차단한다.

## 다크모드

- `:root`에 라이트 팔레트, `[data-theme="dark"]`에 다크 팔레트를 정의한다.
- 초기값은 `prefers-color-scheme`을 따르고, 사용자가 토글하면 `localStorage`에 저장한다(접근 실패 시 try/catch로 무시).
- 깜빡임(FOUC) 방지를 위해 테마 적용 스크립트는 `<head>`의 인라인 스크립트로 CSS보다 먼저 실행한다.
- 코드블록·인용문·표·링크 색상도 다크 팔레트에서 별도로 확인한다.

## 코드 컨벤션

- JavaScript: ES modules(`type="module"`), `const`/`let`, 세미콜론 사용, 2칸 들여쓰기, 함수는 작게. 전역 변수 금지.
- CSS: 클래스 기반(BEM 느슨하게), 요소 선택자 남용 금지, 색상·간격은 변수로, 단위는 `rem`/`ch` 선호.
- HTML: `lang="ko"`, viewport meta 필수, 한글 가독성을 위해 `word-break: keep-all`, `overflow-wrap: break-word`.
- 폰트: 시스템 폰트 스택 우선(`Pretendard`, `-apple-system`, `Noto Sans KR`, sans-serif). 외부 폰트 사용 시 `font-display: swap`.
- 주석은 "왜"가 필요한 곳에만 한국어로 간결하게.

## 실행 / 테스트

`fetch`는 `file://`에서 동작하지 않으므로 로컬 서버가 필요하다.

```bash
node scripts/build.mjs        # posts/index.json 생성
python -m http.server 8000    # 또는: npx serve .
```

변경 후 확인할 것:
- 라이트/다크 양쪽에서 목록·글 상세 화면
- 모바일 폭(375px)에서 가로 스크롤·코드블록·표 넘침 여부
- 존재하지 않는 글 주소(404 화면), 빈 `posts/` 상태
- 브라우저 콘솔 에러 없음

## 작업 시 주의

- 새 글 추가는 `posts/`에 `.md`만 넣고 `build.mjs`를 다시 실행하면 되도록 유지한다. 코드 수정이 필요하면 설계 결함이다.
- 파일 경로는 Windows 환경(PowerShell)이지만 코드 내 경로는 항상 `/`를 쓴다.
- 사용자에게 보이는 UI 문구는 한국어.
