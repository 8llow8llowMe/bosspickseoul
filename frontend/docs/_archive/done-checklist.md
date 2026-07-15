# Done Checklist

## 1. 기능 단위 완료 기준

각 기능 또는 라우트는 아래 조건을 모두 만족해야 `완료`로 본다.

- URL 진입이 정상 동작한다.
- 빈 화면, 로딩, 에러 상태가 존재한다.
- 주요 API 호출이 레거시와 동일하게 동작한다.
- 인증이 필요한 화면은 로그인 상태 분기가 맞다.
- 모바일과 데스크톱에서 레이아웃이 무너지지 않는다.
- `docs/design-guide.md` 기준을 어기지 않는다.
- 공개 페이지는 `docs/seo-guide.md` 기준을 어기지 않는다.
- 브라우저 전용 코드가 SSR 오류를 일으키지 않는다.

## 2. 화면 체크리스트

- [ ] 헤더/푸터 노출 규칙이 맞다
- [ ] 제목, 본문, 버튼 계층이 가이드와 맞다
- [ ] spacing, radius, color가 토큰 기준으로 정리됐다
- [ ] 이미지와 아이콘 경로가 정상이다
- [ ] 뒤로가기/링크 이동 흐름이 맞다
- [ ] query parameter, dynamic route 파싱이 정상이다

## 3. 상태/데이터 체크리스트

- [ ] React Query key와 refetch 조건이 적절하다
- [ ] Zustand store 초기화가 서버 렌더를 깨지 않는다
- [ ] `localStorage`/`sessionStorage` 접근 시점이 안전하다
- [ ] cookie 읽기/쓰기 흐름이 기존과 호환된다
- [ ] 환경변수가 `NEXT_PUBLIC_*` 체계로 정리됐다

## 4. 외부 SDK 체크리스트

아래 항목은 해당 기능이 있을 때만 확인한다.

- [ ] Kakao SDK가 클라이언트에서만 로드된다
- [ ] Firebase Messaging이 브라우저 환경에서만 초기화된다
- [ ] 서비스 워커 등록이 effect 안에서 실행된다
- [ ] websocket/STOMP 연결 해제 처리까지 포함된다

## 5. Tooling 체크리스트

- [ ] 패키지 매니저가 `pnpm`으로 통일됐다
- [ ] `pnpm-lock.yaml` 기준으로 의존성이 관리된다
- [ ] `Prettier` 설정 파일이 존재한다
- [ ] `format` 또는 `format:check` 스크립트가 존재한다
- [ ] 변경 파일이 `Prettier` 기준으로 포맷됐다

## 6. QA 체크리스트

- [ ] 콘솔 에러가 없다
- [ ] hydration 경고가 없다
- [ ] `pnpm qa:verify`가 통과했다
- [ ] 핵심 버튼과 폼이 수동 테스트를 통과했다
- [ ] Phase 8 작업이면 `docs/qa-runbook.md`와 `docs/cutover-runbook.md`가 최신 상태다
- [ ] 새 공통 규칙이 생겼다면 관련 문서를 업데이트했다
- [ ] `docs/migration-inventory.md` 상태가 갱신됐다

## 7. SEO 체크리스트

공개 페이지 또는 외부 공유 대상 페이지일 때 확인한다.

- [ ] `title`과 `description`이 페이지 목적에 맞다
- [ ] canonical URL이 설정됐다
- [ ] Open Graph 정보가 설정됐다
- [ ] 비공개 페이지는 `noindex` 정책이 맞다
- [ ] `NEXT_PUBLIC_SITE_URL` 기준 절대 URL이 production 값으로 검증됐다
- [ ] 제목 구조와 시맨틱 마크업이 과도하게 깨지지 않는다
- [ ] 색인 대상 페이지에 빈 metadata가 남아 있지 않다

## 8. Phase Gate

다음 Phase로 넘어가기 전 아래 기준을 지킨다.

- Main/Auth/Profile 이전 후:
  - 로그인, 로그아웃, 회원가입, 프로필 조회까지 정상 동작
- Status/Recommend 이전 후:
  - 지도/차트가 포함된 조회 화면 패턴 정착
- Analysis/Simulation 이전 후:
  - 핵심 수익 모델/리포트 흐름 검증
- Chatting 이전 전:
  - 인증, 알림, 세션 관련 공통 유틸 완료
