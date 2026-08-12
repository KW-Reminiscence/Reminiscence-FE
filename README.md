# Reminiscence-FE

Reminiscence의 단일 Tablet·Guardian 웹 클라이언트입니다. production에서는
`https://reminiscence.leehyowon14.dev`에서 API와 same-origin으로 제공됩니다.

## 주요 경로

| 경로 | 역할 |
| --- | --- |
| `/` | 가족사진, 루틴, 정시·자발 대화를 통합한 Tablet 홈 |
| `/tablet` | `/` 호환 redirect |
| `/conversation` | 사진 기반 회상 대화 |
| `/dashboard/login` | Guardian 로그인 |
| `/dashboard` | Guardian 월별 기록과 이상 탐지 근거 |
| `/demo/*` | 실제 API·개인정보와 분리된 교육용 demo |

Tablet과 Guardian 인증은 server-side JSON session과 `HttpOnly`, `Secure`,
`SameSite=Strict` cookie를 사용합니다. production bundle에는 가족사진을 포함하지
않으며 실제 사진은 인증된 API 응답으로만 전달됩니다.

## 로컬 실행

Node.js 22와 repository의 `packageManager`에 명시된 pnpm을 사용합니다.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Vite는 `/api`를 기본적으로 `http://127.0.0.1:8000`의 Reminiscence-BE로
proxy합니다. 별도 API origin이 필요한 개발 환경에서만
`VITE_API_BASE_URL`을 지정합니다. production image는 빈 base URL을 사용해
same-origin `/api/*`만 호출합니다.

## 품질 게이트

Reminiscence-BE가 형제 directory에 있어야 기본 OpenAPI 계약 경로가
`../Reminiscence-BE/openapi.json`으로 해석됩니다. CI처럼 다른 위치를 쓰려면
`OPENAPI_SCHEMA_PATH`를 지정합니다.

```bash
pnpm api:check
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Playwright는 production build를 preview하고 fake microphone·Tablet viewport로
루틴, 정시·자발 대화, upload 종료 경쟁, offline/stale, Guardian 인증·만료 흐름을
검증합니다.

## Container image

```bash
docker build --tag reminiscence-web:local .
docker run --rm --publish 127.0.0.1:8080:8080 reminiscence-web:local
```

runtime은 non-root `nginx` user와 read-only filesystem을 전제로 합니다.
`/healthz`는 container healthcheck, `/assets/*`는 immutable cache,
`index.html`은 no-cache로 제공됩니다. web container에는 application data나
secret volume을 mount하지 않습니다.

`.github/workflows/ci.yml`은 GitHub-hosted runner에서 계약·test·lint·typecheck·
build·Playwright를 모두 통과한 뒤 ARM64 image를 GHCR에 SHA와 `main` tag로
게시합니다. rpi5에서는 source build를 수행하지 않습니다.
