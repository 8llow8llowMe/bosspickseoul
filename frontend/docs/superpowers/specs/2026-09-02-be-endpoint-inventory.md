# BE 엔드포인트 인벤토리 재작성 — 미연동 목록 교정 (2026-09-02)

`2026-08-26-be-sync-fe-worklist.md` 의 「미연동 BE 기능 11건」을 폐기하고 다시 뽑았다.
그 목록은 **OpenAPI 스냅샷에서 뽑았기 때문에 두 방향으로 틀렸다.**

## 왜 다시 뽑았나

| 문제                      | 결과                                                                                                 |
| ------------------------- | ---------------------------------------------------------------------------------------------------- |
| 스냅샷이 BE 전부가 아니다 | `@Hidden` 5건이 스냅샷·api-docs 양쪽에 안 나온다 → 후보에 아예 없었다                                |
| 낱말 하나로 사용처를 셌다 | `reports`·`dev`·`images`·`password`·`withdraw` 가 딴 데서 맞아 **미연동인데 연동된 것으로 집계**됐다 |

**집계 방법 (재현용)**

1. BE 컨트롤러에서 직접 추출 — `@RestController` 파일의 클래스 `@RequestMapping` +
   메서드 `@(Get|Post|Put|Patch|Delete)Mapping`. 인자 없는 매핑(`@GetMapping`)도 잡아야 한다.
   결과 **101개**.
2. 검산: 스냅샷 96개 + `@Hidden` 5개 = **101** ✅ (추출 누락 없음)
3. FE 사용 여부 — 경로의 **정적 세그먼트를 순서대로 전부** 요구하는 패턴으로 검색한 뒤
   **28건을 손으로 전수 확인**했다.
   낱말 하나(마지막 세그먼트)만 보면 거짓 히트가 난다. 경로 리터럴 정확 일치만 보면
   반대로 과소검출된다(FE 가 `${BASE}/...`·헬퍼로 조립하므로 69건이 "없음"으로 나온다).

**결과: 미연동 28건** (원래 목록은 11건이었다).

---

## A. 사용자에게 이미 「준비 중」으로 보이는 것 — 최우선

BE 는 끝났는데 FE 가 자리표시자를 렌더한다. **사용자가 기능이 없다고 믿고 있는 상태**라
새 화면을 만드는 일보다 값어치가 크다.

| #   | 기능                       | 엔드포인트                                                              | FE 현재 상태                                                                                                 |
| --- | -------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| A1  | 회원 탈퇴                  | `POST /members/me/withdraw`                                             | `profile-withdraw-page.tsx` — **11줄 자리표시자**(`ProfileUnavailableState`)                                 |
| A2  | 비밀번호 변경·설정·삭제    | `POST`/`DELETE /members/me/password`, `POST /members/me/password/setup` | `profile-change-password-page.tsx` — **11줄 자리표시자**                                                     |
| A3  | 프로필 이미지 업로드·삭제  | `POST`/`DELETE /members/me/profile-image`                               | 프로필 화면이 `profileImageUrl` 을 **표시만** 한다. BE `feature-status.md` 가 "프론트 연결 필요"로 직접 지목 |
| A4  | 게시글 이미지 첨부         | `POST /community/posts/images`                                          | 에디터에 "이미지 첨부 · 준비 중" 문구로 비활성                                                               |
| A5  | 비밀번호 재설정(로그인 전) | `POST /auth/password/reset`, `POST /auth/password/reset/send-code`      | 화면·호출 모두 없음                                                                                          |

⚠️ A1·A2 는 `/profile/settings/*` 라우트와 좌측 내비 항목이 **이미 있다**. 즉 사용자가
메뉴를 눌러 들어와서 "준비 중"을 본다. **원래 11건 목록에 이 다섯 건이 전부 없었다** —
`password`·`withdraw` 라는 낱말이 FE 라우트 문자열에서 맞아 연동된 것으로 집계됐기 때문이다.

## B. 화면이 없어 새로 만들어야 하는 것

| #   | 기능                     | 엔드포인트                                                                                                                              | 비고                                                                                                                                                          |
| --- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | 운영자 신고 처리         | `GET /moderation/reports`, `PATCH /moderation/reports/{reportId}`                                                                       | 운영자 화면이 필요하다. 일반 사용자 화면과 권한 경계가 다르므로 착수 전 기획 확인                                                                             |
| B2  | 분석 인기 순위           | `GET /analysis-rankings`                                                                                                                | BE 이슈 #92(Kafka + Redis ZSET)로 만든 기능                                                                                                                   |
| B3  | 자치구 상세 지표 **5종** | `GET /districts/{code}/change-indicators`, `/foot-traffic`, `/sales/top-administrations`, `/sales/top-services`, `/stores/top-services` | **`/status` 는 `/districts/top-ten` 하나만 쓴다.** BE 의 자치구 API 가 화면보다 훨씬 넓다. 원래 목록엔 `change-indicators` 하나만 있었다                      |
| B4  | 지역 코드 조회           | `GET /regions/code-lookup`, `GET /regions/commercials/{code}/administration`                                                            | 이름↔코드 역방향 조회. 후자는 원래 목록에 없었다                                                                                                              |
| B5  | 지원 정책 전원 목록      | `GET /policies`                                                                                                                         | **데이터는 이미 확보**했다(PR #192 가 프로필 응답의 `policyRecommendations` 로 요약 섹션을 그린다). 5건을 넘겨 보려면 이 직접 호출이 필요하다 — 우선순위 낮음 |

## C. `@Hidden` — 착수 전 BE 합의가 먼저다 (4건)

| 엔드포인트                           | 상태                                      |
| ------------------------------------ | ----------------------------------------- |
| `GET /commercials/candidates`        | 미연동                                    |
| `GET /commercials/heatmap`           | 미연동                                    |
| `GET /commercials/heatmap-composite` | 미연동                                    |
| `GET /commercials/compare-preview`   | 미연동                                    |
| `GET /commercials/{code}/profile`    | **이미 FE 가 3곳에서 사용 중**(계약 없이) |

이 5건은 `io.swagger.v3.oas.annotations.Hidden` 이 붙어 api-docs 에 나오지 않는다.
계약이 없으면 FE 는 응답을 실측해 타입을 손으로 적어야 하고, BE 가 필드를 바꿔도
대조로 잡히지 않는다 — 실제로 `/profile` 에서 두 번 표류했다(BE 이슈 **#193**).

⚠️ **district-service 에 같은 이름의 구현이 따로 있다**: `GET /map/commercials/candidates`,
`/map/commercials/heatmap`, `/map/commercials/compare-preview`, `/map/candidate-presets`
(이쪽은 문서화돼 있고 역시 미연동). **어느 쪽이 정본인지 BE 확인이 필요하다** —
모르고 붙이면 중복 구현이 된다. 원래 목록은 `/map/*` 쪽만 보고 있었다.

## D. 연동하지 않는다

| 엔드포인트                 | 이유                                                             |
| -------------------------- | ---------------------------------------------------------------- |
| `POST /members/signup/dev` | `@Profile("!prod")` — QA 편의용이다. 프로덕트 화면에 넣지 않는다 |

---

## 원래 목록과의 차이 정리

**새로 드러난 것 (12건)**: A1 · A2(3개) · A3(2개) · A5(2개) ·
`/districts/{}/foot-traffic` · `/sales/top-administrations` · `/sales/top-services` ·
`/stores/top-services` · `/regions/commercials/{}/administration` ·
`@Hidden` 4건 — 그리고 `@Hidden`인 `/profile` 은 **이미 쓰고 있는데 계약이 없다**는 사실.

**끝난 것 (2건)**: `POST /community/posts/drafts/commercial-comparisons`(PR #189) ·
지원 정책(PR #192, 프로필 경유).

**권장 착수 순서**: A1 → A2 → A3 → A4 → A5 → B2 → B3 → B1 → B4 → B5.
A 묶음은 사용자가 이미 "없는 기능"으로 겪고 있고, BE 가 끝나 있어 FE 작업만 남았다.
C 묶음은 BE 답(#193)을 받은 뒤에 착수한다.
