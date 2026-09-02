# A2 비밀번호 변경·최초 설정·소셜 전용 전환 — 설계 명세

- 작성: 2026-09-02
- 대상 이슈: 없음(인벤토리 `2026-09-02-be-endpoint-inventory.md` 의 **A2**)
- 브랜치: `feature/fe/member-password` (base `develop` = `974e5cd6`)
- **상태: 설계 완료, 구현 한 줄도 시작하지 않음**

## 다른 PC 에서 이어받는 방법

```bash
git fetch --all --prune
git checkout feature/fe/member-password   # 이 명세가 커밋돼 있는 브랜치
cd frontend && pnpm install
```

- 워크트리(`.worktrees/bosspick-password`)는 **작성 기기에만 있다.** 그냥 브랜치를
  체크아웃해서 작업하면 된다.
- `.env.local` 은 저장소에 없다. **이 작업에는 필요 없다** — dev 서버를 띄울 일이 없고
  (로그인이 필요해 실호출 검증이 불가능하다) 유닛 테스트와 `qa:verify` 만 돌린다.
- 시작 시점 기준: `origin/develop` = `974e5cd6`, **열린 FE PR 0건.**
  움직였는지 `git rev-parse --short origin/develop` 로 확인할 것
  (branch protection 이 꺼져 있어 develop 이 되돌려진 전례가 있다).

## 1. 목표와 범위

`/profile/settings/change-password` 가 **11줄 자리표시자**
(`ProfileUnavailableState`, "비밀번호 변경 기능은 아직 준비 중이에요")인데 좌측 내비에
항목이 있고 라우트도 있다. 즉 **사용자가 메뉴를 눌러 들어와 없는 기능을 본다.**
백엔드는 세 동작 모두 끝나 있다.

**범위**: 비밀번호 변경 · 최초 설정 · 소셜 전용 전환(비밀번호 제거) 세 동작과 그 화면.

**범위 밖**: 비밀번호 **재설정**(로그인 전 흐름, `POST /auth/password/reset`,
`/auth/password/reset/send-code`)은 인벤토리의 **A5** 로 따로 있다. 화면이 다르고
(로그인 전) 흐름도 이메일 인증을 거치므로 섞지 않는다.

## 2. 백엔드 계약 (확인 완료)

세 엔드포인트 모두 `bearerAuth`, 응답은 `Response<Void>` 다.
`auth-member.json` 스냅샷에 **문서화돼 있다**(`@Hidden` 아님) — 계약을 신뢰할 수 있다.

| 동작           | 메서드·경로                              | 요청 본문                        |
| -------------- | ---------------------------------------- | -------------------------------- |
| 변경           | `POST /api/v1/members/me/password`       | `currentPassword`, `newPassword` |
| 최초 설정      | `POST /api/v1/members/me/password/setup` | `newPassword`                    |
| 소셜 전용 전환 | `DELETE /api/v1/members/me/password`     | 없음                             |

`newPassword` 제약(스냅샷): **8~20자, 영문자·숫자·특수문자 포함.**

### 오류 코드 (BE `MemberErrorCode` 원문)

| 코드         | HTTP | 메시지                                                           |
| ------------ | ---- | ---------------------------------------------------------------- |
| `MEMBER_007` | 400  | 소셜 로그인 계정은 비밀번호를 사용하지 않습니다.                 |
| `MEMBER_008` | 400  | 이미 비밀번호가 설정된 계정입니다. 비밀번호 변경을 이용해주세요. |
| `MEMBER_009` | 400  | 소셜 로그인이 연결된 계정만 비밀번호를 제거할 수 있습니다.       |

## 3. 계정 상태가 화면을 가른다

`GET /members/me` 응답의 **`provider`** (소셜 제공자, 일반 계정이면 `null`) 와
**`hasPassword`** 로 판정한다. 스냅샷에 "provider 와 조합해 계정 상태를 구분한다" 고
적혀 있는 그대로다.

| `hasPassword` | `provider` | 상태                      | 화면                                      |
| ------------- | ---------- | ------------------------- | ----------------------------------------- |
| `true`        | `null`     | 일반 계정                 | **변경** 폼만                             |
| `true`        | 소셜       | 소셜 연결 + 비밀번호 있음 | **변경** 폼 + 「소셜 전용으로 전환」      |
| `false`       | 소셜       | 소셜 전용                 | **최초 설정** 폼(현재 비밀번호 입력 없음) |
| `false`       | `null`     | 있을 수 없음              | 방어적으로 안내만 띄우고 폼을 주지 않는다 |

⚠️ **`provider`·`hasPassword` 는 이미 클라이언트에 도착한다.**
`app/api/auth/me/route.ts` 가 `data.dataBody` 를 **통째로** 넘기고(화이트리스트 없음)
`auth-store` 가 그걸 `memberInfo` 에 넣는다. **FE 의 `MemberInfo` 타입에만 두 필드가 빠져
있다** — `policyRecommendations`(#192)·`commercialComparisonReport`(#188)와 같은 종류의
누락이고 이번이 세 번째다. 타입에 추가만 하면 된다.

## 4. 핵심 위험 — 세 동작의 세션 영향이 다르다

BE `MemberWebUseCase` 시그니처가 근거다. `tokenId` 를 받는 것은 토큰을 무효화한다.

| 동작      | UseCase                                                     | BE 동작                                 | FE 처리                            |
| --------- | ----------------------------------------------------------- | --------------------------------------- | ---------------------------------- |
| 변경      | `changePassword(memberId, tokenId, …)`                      | 재로그인 필요, 전 기기 토큰 재발급 차단 | **세션 파괴 → 로그인 화면**        |
| 전환      | `removePassword(memberId, tokenId)`                         | 전 기기 로그아웃                        | **세션 파괴 → 홈**                 |
| 최초 설정 | `setupPassword(memberId, newPassword)` — **`tokenId` 없음** | 토큰을 건드리지 않음                    | **세션 유지** → 토스트 + 상태 갱신 |

**설정만 세션을 유지한다.** 세 동작을 한 핸들러에 몰면 이 차이를 실수하기 쉬우므로
라우트를 BE 모양대로 나눈다.

### A1(#195)에서 세운 규칙을 그대로 적용한다

- **전용 라우트여야 한다.** BFF 범용 프록시(`app/api/bff/[...path]`)는 토큰만 주입하고
  **서버 세션을 남긴다** — 세션을 바꿔야 하는 동작은 `app/api/auth/*` 전용 라우트로.
- **성공했을 때만 세션을 파괴한다.** 실패 시 지우면 "로그아웃됐는데 비밀번호는 그대로"가
  되어 사용자가 성공했다고 오해하고 재시도도 못 한다.
- **상태코드와 본문을 둘 다 본다.** 이 백엔드는 200 에 `success: false` 를 싣는 경우가
  있다(`isApiSuccess` 가 그 때문에 있다).
- 성공 후 정리 순서(로그아웃·탈퇴와 동일): `clearMemberBookmarksQuery` +
  `clearMemberInfoQuery` → `clearSession()`(zustand) → 이동 → 토스트.
  `ToastProvider` 는 루트 레이아웃에 있어 이동 후에도 살아 있다.

## 5. 오류 코드는 「화면이 낡았다」는 신호다

`MEMBER_007`·`008`·`009` 는 **화면이 계정 상태로 이미 걸러낸 경우**다. 그래도 왔다면
들고 있는 `memberInfo` 가 낡았다는 뜻이다(다른 탭에서 바꿨거나 소셜을 연결/해제했거나).

→ 일반 오류 문구로 흘리지 말고 **정보를 다시 불러오라는 안내**로 처리한다.
`clearMemberInfoQuery` + `auth-store.hydrate()` 로 상태를 다시 받고 화면을 다시 가른다.

## 6. 비밀번호 규칙은 정본 한 곳

`PASSWORD_PATTERN` 이 이미 있다 — `src/components/auth/register-machine.ts`,
주석에 "백엔드 비밀번호 제약과 정확히 동일(register.md D4-3)" 로 못박혀 있다.

```
^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+\[\]{};:'",.<>/?\\|])\S{8,20}$
```

프로필 화면이 `components/auth/…` 를 import 하는 것은 이상하므로
**`src/lib/auth/password-rules.ts` 로 옮기고 `register-machine` 이 거기서 가져온다.**
규칙을 두 벌 만들면 한쪽이 거부하는 값을 다른 쪽이 통과시킨다.

## 7. 화면 설계

`SectionStack` / `SectionPanel` / `Form` / `Field` / `FieldLabel` / `TextInput` /
`SectionNotice` / `ActionRow`(`profile-ui.tsx`) + `Button`(`ui/button`) 을 쓴다.
A1 의 `profile-withdraw-page.tsx` 가 그대로 참고할 선례다.

- **변경 폼**: 현재 비밀번호 · 새 비밀번호 · 새 비밀번호 확인.
  규칙 위반이나 확인 불일치면 버튼 비활성 + 그 이유를 적는다.
  제출 전에 **"변경하면 모든 기기에서 다시 로그인해야 해요"** 를 알린다.
- **최초 설정 폼**: 새 비밀번호 · 확인. **현재 비밀번호 입력란을 두지 않는다**(없다).
  "설정 후에는 이메일 로그인과 소셜 로그인을 모두 쓸 수 있어요" 를 적는다.
- **소셜 전용 전환**: 별도 패널. 결과를 먼저 알린다 —
  **"이메일 로그인을 더 이상 쓸 수 없고, 모든 기기에서 로그아웃돼요."**
  A1 의 마찰 판단을 따른다: 되돌리기 어려우므로 **확인 입력**(예: `소셜 전용` 또는
  이메일 타이핑)을 요구하고 다이얼로그는 두지 않는다.
  단, 되돌릴 수 있는 동작이다(다시 최초 설정 가능) → A1(영구)보다 마찰을 낮춰도 된다.
  **판단 필요**: 체크박스 한 개로 충분할 수 있다. 구현자가 정하고 근거를 커밋에 남긴다.
- 자리표시자 문구("준비 중")가 남지 않아야 한다.

## 8. 파일 계획

| 파일                                                      | 변경                                                               |
| --------------------------------------------------------- | ------------------------------------------------------------------ |
| `src/lib/auth/password-rules.ts`                          | **신규** — `PASSWORD_PATTERN` 정본                                 |
| `src/components/auth/register-machine.ts`                 | 위에서 import (재정의 제거)                                        |
| `src/types/auth.ts`                                       | `MemberInfo` 에 `provider: string \| null`, `hasPassword: boolean` |
| `src/lib/auth/member-password-state.ts`                   | **신규** — 계정 상태 판정(§3 표)과 오류코드 해석                   |
| `app/api/auth/password/route.ts`                          | **신규** — `POST`(변경) · `DELETE`(전환). 성공 시에만 세션 파괴    |
| `app/api/auth/password/setup/route.ts`                    | **신규** — `POST`. **세션 유지**                                   |
| `src/lib/api/member-password.ts`                          | **신규** — 클라이언트 래퍼 3개                                     |
| `src/components/profile/profile-change-password-page.tsx` | 자리표시자 → 실제 화면                                             |
| `app/(shell)/profile/profile-v2-contract.test.ts`         | 단언 갱신(아래 §10)                                                |

## 9. 테스트 계획

저장소 규약: **jsdom 없이 node + `renderToStaticMarkup` 문자열 assertion**, 콜로케이션
`*.test.ts`. 라우트 테스트는 `app/**/*.test.ts` 가 vitest include 에 있으므로 라우트 옆에 둔다
(`app/api/auth/withdraw/route.test.ts` 가 선례 — `@/lib/env.server`·`@/lib/auth/session` 을
mock 하고 `fetch` 를 `vi.stubGlobal` 로 갈아끼운다).

- **상태 판정**: §3 의 4조합 + 오류코드 3종이 「상태 재조회」로 해석되는지
- **비밀번호 규칙**: `register-machine` 과 프로필 화면이 **같은 상수**를 쓰는지
  (두 곳에서 import 한 값이 동일 객체인지 단언)
- **라우트**: 변경 성공 시 세션 파괴 / 변경 실패 시 세션 유지 /
  **설정 성공 시 세션 유지**(이게 핵심) / 세션 없으면 401 / 200+`success:false` 도 실패
- **화면**: 상태별로 보이는 폼이 갈리는지 · 규칙 위반·확인 불일치 시 버튼 비활성 ·
  전환 패널이 결과를 먼저 알리는지 · "준비 중" 문구가 없는지

## 10. 자리표시자 계약 테스트 갱신

`app/(shell)/profile/profile-v2-contract.test.ts` 가
`profile-change-password-page.tsx` 에 대해 「`useMutation` 을 쓰지 않는다」를 단언한다.
자리표시자 시절의 전제다. **지우지 말고, 막아야 할 것을 다시 적는다** — 이 파일에 선례가
두 개 있다(B2 시뮬레이션 이력, A1 탈퇴):

```ts
expect(source).not.toContain('/member/password/change') // V1 경로
expect(source).not.toContain('@/lib/api/profile')
expect(source).toContain('@/lib/api/member-password') // 전용 라우트 경유 강제
```

`it.each` 목록에서 `profile-change-password-page.tsx` 를 빼고
`profile-edit-page.tsx` 만 남긴다(그것만 아직 자리표시자다).

## 11. 검증 한계

**실호출 검증은 불가능하다.** 로그인이 필요하고, 변경에 성공하면 그 계정이 재로그인을
강제당한다. 소셜 전용 전환은 이메일 로그인을 잃는다.

- 유닛 테스트 + `pnpm qa:verify`(format·lint·typecheck·build) 까지가 한계다.
- 실호출을 하려면 `POST /members/signup/dev`(`@Profile("!prod")`, prod 미노출)로
  **버릴 계정**을 만들어 태운다. 본 계정으로 하지 말 것.
- `/profile/**` 는 로그인이 필요해 브라우저 확인도 계정이 있어야 한다.

## 12. PR 규약 (어기면 조용히 망가짐)

- base 는 **항상 `develop`**(스택 PR 금지)
- **`--label frontend-web` 이 배포 게이트다.** 없으면 머지해도 Jenkins 가 조용히 건너뛴다
- `--assignee seonghoho`
- 머지 전 `gh pr checks <번호>` 로 CI 확인(처음엔 `UNSTABLE` 일 수 있다)
- 머지는 **merge commit**(squash 아님) — 커밋 메시지의 판단 근거를 살린다
- `gh pr merge --delete-branch` 는 워크트리가 develop 을 점유 중이면 로컬 정리 단계에서
  실패한다. `--delete-branch` 를 빼고 머지 후 `git push origin --delete <브랜치>` 가 편하다
- `pnpm qa:verify` 가 `next-env.d.ts` 를 더럽힌다 → 커밋 전 `git checkout --` 로 되돌린다

## 13. 참고

- 인벤토리 정본: `frontend/docs/superpowers/specs/2026-09-02-be-endpoint-inventory.md`
- A1 선례(전용 라우트·마찰·계약 테스트 갱신): PR #195, `app/api/auth/withdraw/route.ts`,
  `src/components/profile/profile-withdraw-page.tsx`
- 로그아웃 선례(세션 정리 순서): `app/api/auth/logout/route.ts`,
  `src/components/layout/site-header.tsx`
- 미해결 BE 이슈: #193(`@Hidden` 계약 부재) · #190(dev 커뮤니티 글쓰기 404) — **A2 와 무관**
- A2 다음 순서: A3 프로필 이미지(`POST`/`DELETE /members/me/profile-image`) →
  A4 게시글 이미지 → A5 비밀번호 재설정
