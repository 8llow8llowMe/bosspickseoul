# SEO / Performance Audit

## 1. 목적

- 이 문서는 Phase 8에서 수행한 SEO와 번들 점검 결과를 남긴다.
- 기준 시점: `2026-03-25`

## 2. SEO 점검 결과

### 색인 대상

- `/`
- `/status`
- `/recommend`
- `/community/list`
- `/community/[communityId]`

판단 기준:

- [route-skeletons.ts](/Users/seonghoho/Documents/projects/nowdoboss/NowDoBoss-V2/frontend/src/lib/route-skeletons.ts)에서 `visibility: "index"`로 관리한다.
- [sitemap.ts](/Users/seonghoho/Documents/projects/nowdoboss/NowDoBoss-V2/frontend/app/sitemap.ts)는 정적 공개 경로만 sitemap에 포함한다.

### 비색인 대상

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

### 확인된 상태

- 루트 layout에 공통 `metadataBase`, `canonical`, `Open Graph`, `Twitter` 기본값이 있다.
- 공개 커뮤니티 상세 페이지는 동적 metadata를 생성한다.
- 채팅 상세는 `roomId` fallback metadata와 `noindex`를 유지한다.
- 공유 리포트는 현재 제품 정책상 `noindex`를 유지한다.

### 남은 운영 확인 항목

- `NEXT_PUBLIC_SITE_URL`를 production 도메인으로 설정해야 canonical과 sitemap이 올바르게 생성된다.
- 동적 커뮤니티 상세 경로는 현재 정적 sitemap에 자동 수집되지 않는다.
- preview 환경은 검색엔진 차단 정책을 별도로 유지해야 한다.

## 3. 성능 / 번들 점검 기준

- `pnpm build`가 성공해야 한다.
- 공개 페이지 첫 진입에서 치명적인 hydration 오류가 없어야 한다.
- 실시간, Kakao, Firebase 같은 브라우저 전용 기능은 클라이언트 경계 안에서만 실행되어야 한다.
- 무거운 외부 SDK는 실제 사용하는 화면에서만 초기화되어야 한다.

## 4. 로컬 검증 명령

```bash
pnpm qa:verify
```

검증 범위:

- 포맷 검사
- ESLint
- 타입 검사
- production build

## 5. 로컬 검증 기록

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

## 6. 해석 메모

- 현재 저장소는 App Router 구조와 metadata 정책이 정리되어 있어서, Phase 8의 핵심 리스크는 코드보다 운영 env 정합성에 가깝다.
- 성능 최적화 2차 작업은 bundle analyzer, dynamic import 세분화, 이미지 최적화 중심으로 별도 진행하는 편이 맞다.
