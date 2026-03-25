# QA Runbook

## 1. 목적

- 이 문서는 `NowDoBoss-V2/frontend`의 Phase 8 QA 기준 문서다.
- 목표는 배포 전 회귀 검증 절차를 반복 가능하게 고정하는 것이다.
- 자동 검증과 수동 smoke test를 분리해서 기록한다.

## 2. 사전 조건

- `pnpm install`이 완료되어 있다.
- `.env.local`이 [`.env.local.example`](/Users/seonghoho/Documents/projects/nowdoboss/NowDoBoss-V2/frontend/.env.local.example) 기준으로 채워져 있다.
- 백엔드 API와 websocket endpoint가 접근 가능하다.
- 테스트 계정과 커뮤니티/채팅 확인용 샘플 데이터가 준비되어 있다.

## 3. 자동 검증

자동 검증은 아래 한 줄로 실행한다.

```bash
pnpm qa:verify
```

포함 항목:

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`

자동 검증 통과 기준:

- 포맷 오류가 없다.
- ESLint 오류가 없다.
- TypeScript 오류가 없다.
- Next production build가 성공한다.

## 4. 수동 Smoke Test

### 공개 페이지

- `/`
  - hero, CTA, 섹션 간 이동이 정상이다.
  - title/description/canonical이 설정된다.
- `/status`
  - 지역 선택, 카드 렌더, loading/error 상태가 보인다.
- `/recommend`
  - 추천 조건 입력, 결과 카드, 저장 흐름이 정상이다.
- `/community/list`
  - 카테고리 필터, 인기 게시글, 목록 이동이 정상이다.
- `/community/[communityId]`
  - 상세 본문, 댓글, metadata가 정상이다.

### 인증 / 프로필

- `/login`
  - 일반 로그인과 소셜 로그인 버튼이 정상 렌더링된다.
- `/register`
  - 가입 시작 화면과 일반 회원가입 링크가 정상이다.
- `/register/general`
  - 검증 메시지, 제출 흐름, 실패 메시지가 정상이다.
- `/profile/settings/edit`
  - 로그인 상태에서 프로필 조회와 수정이 동작한다.
- `/profile/bookmarks`
  - 북마크 탭 이동과 항목 진입이 정상이다.

### 분석 / 시뮬레이션

- `/analysis`
  - 입력 폼 검증과 제출 흐름이 정상이다.
- `/analysis/result`
  - 직접 진입 또는 새로고침 시 결과 복원이 정상이다.
- `/simulation`
  - 시뮬레이션 입력과 리포트 진입이 정상이다.
- `/simulation/report`
  - 리포트 렌더, 비교 이동, 공유 버튼이 정상이다.
- `/share/[token]`
  - 토큰 유효/무효 상태가 정상 분기된다.

### 커뮤니티

- 게시글 등록, 수정, 삭제가 정상이다.
- 다중 이미지 업로드가 정상이다.
- 댓글 작성, 수정, 삭제가 정상이다.

### 채팅 / 실시간

- `/chatting/list`
  - 인기 채팅방, 전체 목록, 내 채팅방 검색, 생성 모달이 정상이다.
- `/chatting/[roomId]`
  - history 조회, 실시간 수신, Enter 전송, 나가기 흐름이 정상이다.
- Firebase 권한 거부 또는 VAPID 누락 상황에서도 채팅은 동작하고 푸시만 비활성화된다.

## 5. 결과 기록 방식

수동 smoke는 아래 형식으로 기록한다.

```text
날짜:
환경:
검증자:
자동 검증: pass | fail
수동 smoke: pass | fail | partial
차단 이슈:
- ...
```

## 6. 이번 저장소 기준 남은 수동 확인

- 브라우저에서 Kakao SDK가 실제 키로 로드되는지 확인
- Firebase permission granted 환경에서 토큰 발급과 subscribe API 확인
- websocket `/ws`가 운영 또는 스테이징 백엔드와 실제 연결되는지 확인
- 모바일 viewport에서 community/chatting 스크롤 동작 확인
