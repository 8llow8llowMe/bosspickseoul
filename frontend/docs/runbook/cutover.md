# Cutover Runbook

목적: 운영 전환에 필요한 환경변수·전환 순서·롤백 절차와 SEO/번들 점검 결과를 하나의 문서에서 관리한다.
원출처: `../_archive/cutover-runbook.md`, `../_archive/seo-performance-audit.md`

## 1. 환경변수·전환 순서·롤백

> 원출처: `../_archive/cutover-runbook.md`

### 1. 목적

- 이 문서는 `NowDoBoss-V2/frontend`를 실제 서비스로 전환할 때 필요한 준비 절차를 정리한다.
- 목표는 운영 전환 전 체크 항목과 롤백 절차를 고정해서, 사람에 따라 누락되는 설정을 줄이는 것이다.

### 2. 필수 환경변수

기준 파일: [`.env.local.example`](/Users/seonghoho/Documents/projects/nowdoboss/NowDoBoss-V2/frontend/.env.local.example)

필수:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_KAKAOMAP_API_KEY`
- `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

조건부 필수:

- `NEXT_PUBLIC_WS_URL`
  - 백엔드 websocket 경로가 기본 규칙 `ws(s)://{API host}/ws`와 다를 때 설정한다.
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
  - Analytics를 운영에서 유지할 때 설정한다.
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
  - 브라우저 푸시를 실제 운영에서 켤 때 설정한다.

### 3. 전환 전 체크

- production 값으로 `NEXT_PUBLIC_SITE_URL`이 설정되어 있다.
- 백엔드 CORS와 websocket origin 허용 목록에 프론트 도메인이 반영되어 있다.
- Kakao JavaScript 키와 Kakao Map 키의 도메인 허용 설정이 완료되어 있다.
- Firebase Web App 설정과 Messaging sender ID가 운영 도메인 기준으로 유효하다.
- 서비스 워커 파일 `/firebase-messaging-sw.js`가 배포 산출물에 포함된다.
- `robots.txt`, `sitemap.xml`, canonical이 production 도메인을 가리킨다.
- `pnpm qa:verify`가 통과한다.
- [qa.md](./qa.md) 기준 수동 smoke가 완료된다.

### 4. 권장 전환 순서

1. 스테이징 또는 preview 환경에 production과 동일한 env를 주입한다.
2. `pnpm qa:verify`를 실행한다.
3. 공개 페이지와 인증, 커뮤니티, 채팅 smoke test를 수동으로 실행한다.
4. `robots.txt`, `sitemap.xml`, 주요 canonical URL을 실제 응답으로 확인한다.
5. 운영 배포를 실행한다.
6. 도메인 또는 라우팅 전환을 적용한다.
7. 전환 직후 로그인, 분석, 커뮤니티, 채팅 핵심 여정을 다시 확인한다.

### 5. 전환 직후 확인

- 홈, status, recommend, community list 응답이 200이다.
- 로그인 후 profile, analysis, simulation 이동이 정상이다.
- community detail metadata가 production 도메인으로 나온다.
- chatting list/detail이 websocket 연결 오류 없이 열린다.
- push 권한 허용 환경에서 token 발급과 topic subscribe가 된다.

### 6. 롤백 기준

아래 중 하나라도 발생하면 롤백을 우선 검토한다.

- 로그인 또는 토큰 재발급이 실패한다.
- 분석/시뮬레이션 저장 또는 리포트 조회가 깨진다.
- 커뮤니티 등록/상세가 지속적으로 실패한다.
- websocket 연결 실패로 채팅이 unusable 상태다.
- `NEXT_PUBLIC_SITE_URL` 오설정으로 canonical/robots/sitemap이 잘못 노출된다.

### 7. 롤백 절차

1. 기존 프론트 배포 대상으로 트래픽을 되돌린다.
2. CDN 또는 reverse proxy 캐시를 비운다.
3. 문제 재현 경로와 영향을 문서화한다.
4. 수정 후 preview 환경에서 같은 체크리스트를 다시 검증한다.

### 8. 현재 남아 있는 외부 의존 항목

- 실제 production 도메인 값
- 운영 백엔드 websocket endpoint 확인
- Firebase VAPID 키
- 운영 배포 대상과 도메인 전환 방식

## 2. SEO/번들 점검

> 원출처: `../_archive/seo-performance-audit.md`

### 1. 목적

- 이 문서는 Phase 8에서 수행한 SEO와 번들 점검 결과를 남긴다.
- 기준 시점: `2026-03-25`

### 2. SEO 점검 결과

#### 색인 대상

- `/`
- `/status`
- `/recommend`
- `/community/list`
- `/community/[communityId]`

판단 기준:

- [route-skeletons.ts](/Users/seonghoho/Documents/projects/nowdoboss/NowDoBoss-V2/frontend/src/lib/route-skeletons.ts)에서 `visibility: "index"`로 관리한다.
- [sitemap.ts](/Users/seonghoho/Documents/projects/nowdoboss/NowDoBoss-V2/frontend/app/sitemap.ts)는 정적 공개 경로만 sitemap에 포함한다.

#### 비색인 대상

- `/login`
- `/register`
- `/register/general`
- `/account-deleted`
- `/member/loading/[provider]`
- `/profile/**`
- `/analysis/**`
- `/simulation/**`
- `/chatting/**`
- `/share/[token]`

판단 기준:

- [robots.ts](/Users/seonghoho/Documents/projects/nowdoboss/NowDoBoss-V2/frontend/app/robots.ts)에서 주요 비공개 경로를 disallow 한다.
- 각 비공개 페이지는 [metadata.ts](/Users/seonghoho/Documents/projects/nowdoboss/NowDoBoss-V2/frontend/src/lib/metadata.ts)의 `index: false`를 사용한다.

#### 확인된 상태

- 루트 layout에 공통 `metadataBase`, `canonical`, `Open Graph`, `Twitter` 기본값이 있다.
- 공개 커뮤니티 상세 페이지는 동적 metadata를 생성한다.
- 채팅 상세는 `roomId` fallback metadata와 `noindex`를 유지한다.
- 공유 리포트는 현재 제품 정책상 `noindex`를 유지한다.

#### 남은 운영 확인 항목

- `NEXT_PUBLIC_SITE_URL`를 production 도메인으로 설정해야 canonical과 sitemap이 올바르게 생성된다.
- 동적 커뮤니티 상세 경로는 현재 정적 sitemap에 자동 수집되지 않는다.
- preview 환경은 검색엔진 차단 정책을 별도로 유지해야 한다.

### 3. 성능 / 번들 점검 기준

- `pnpm build`가 성공해야 한다.
- 공개 페이지 첫 진입에서 치명적인 hydration 오류가 없어야 한다.
- 실시간, Kakao, Firebase 같은 브라우저 전용 기능은 클라이언트 경계 안에서만 실행되어야 한다.
- 무거운 외부 SDK는 실제 사용하는 화면에서만 초기화되어야 한다.

### 4. 로컬 검증 명령

```bash
pnpm qa:verify
```

검증 범위:

- 포맷 검사
- ESLint
- 타입 검사
- production build

### 5. 로컬 검증 기록

이 문서는 `pnpm qa:verify` 재실행 후 결과를 업데이트한다.

- `format:check`: pass
- `lint`: pass
- `typecheck`: pass
- `build`: pass

`pnpm build` 기준 route summary:

- static: `/`, `/status`, `/recommend`, `/community/list` 포함 총 27개 라우트
- dynamic: `/chatting/[roomId]`, `/community/[communityId]`, `/member/loading/[provider]`, `/share/[token]`

runtime 응답 확인:

- `/robots.txt`
  - auth, profile, analysis, simulation, chatting, share 경로가 disallow 된다.
- `/sitemap.xml`
  - `/`, `/status`, `/recommend`, `/community/list`가 포함된다.
- `/`
  - title, description, canonical, Open Graph, Twitter metadata 응답이 확인됐다.

### 6. 해석 메모

- 현재 저장소는 App Router 구조와 metadata 정책이 정리되어 있어서, Phase 8의 핵심 리스크는 코드보다 운영 env 정합성에 가깝다.
- 성능 최적화 2차 작업은 bundle analyzer, dynamic import 세분화, 이미지 최적화 중심으로 별도 진행하는 편이 맞다.
