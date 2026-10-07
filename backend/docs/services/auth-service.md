# Auth Service Guide

## 서비스 책임

- 회원 인증, 인가, 토큰 발급/재발급, 로그아웃
- 회원 기본 정보 조회/수정

## 주요 컨텍스트

- `auth`
- `member`

## 인증 방식

- `auth-service`는 일반 Resource Server가 아니라 인증/인가 중심 보안 구성을 사용한다.
- 현재 `AuthSecurityConfigurer` 기반 구성을 따른다.

## 대표 API 패턴

- `AuthWebController`, `MemberWebController`, `MemberBookmarkWebController`
- `AuthWebUseCase -> AuthWebFacade`
- `MemberWebUseCase -> MemberWebFacade`

## 인증 API (`/api/v1/auth`)

- `POST /api/v1/auth/login` — 이메일/비밀번호 로그인. 요청 DTO 는 `@Valid` 검증(빈 값/형식 오류는 400,
  실패 카운터에 오르지 않음). 응답 body에 accessToken, `Set-Cookie`로 refresh 쿠키 발급.
  실패 누적 시 이메일 단위로 잠기고(`AUTH_015`, 429 — 기본 5회 / 10분), 같은 IP 의 실패가 상한을
  넘으면 이메일과 무관하게 거절된다(`AUTH_020`, 429 — 기본 10회 / 1시간).
- `POST /api/v1/auth/logout` — **현재 기기 세션만** 로그아웃. 쿠키의 refresh 토큰으로 세션을 특정해
  해당 refresh 만 삭제 + 현재 access 블랙리스트, refresh 쿠키 제거(maxAge=0). 다른 기기 로그인은 유지된다.
  쿠키가 없거나 만료/위조면 세션 삭제는 건너뛰고 access 무효화만 수행한다.
- `POST /api/v1/auth/token/reissue` — 토큰 재발급. `@CookieValue(name = "refreshToken", required = false)`로
  쿠키를 읽으며, 쿠키 미첨부 시에도 컨트롤러 진입 후 도메인 검증(`AUTH_001`)으로 처리한다.

**refresh 쿠키 계약** (`RefreshCookieProvider`):
- `httpOnly=true`, `sameSite=Strict`
- `path=/api/v1/auth` — reissue 와 logout 이 함께 쿠키를 읽는다 (로그아웃이 현재 기기 세션을
  특정하려면 쿠키의 refresh 토큰이 필요). auth 경로 밖으로는 여전히 전송되지 않는다.
- `secure`는 prod 프로필에서만 true
- `maxAge=jwt.refresh-expiration` (초 단위)

**다중 기기 로그인 세션**
- refresh 토큰은 회원당 단일 슬롯이 아니라 **기기(로그인)별 세션 키**로 저장한다. 세션 아이디는
  refresh 토큰의 jti 다. Redis 키 2종 —
  `{prefix}:auth:refreshToken:{memberId}:{sessionId}` (세션별 토큰, TTL=refresh 만료),
  `{prefix}:auth:refreshSessions:{memberId}` (세션 ZSET, score=마지막 갱신 시각).
- 기기 상한은 `auth.session.max-devices`(기본 5). 초과 시 **가장 오래 갱신되지 않은 세션**부터
  밀어내며, 밀려난 기기는 access 만료 시점에 재로그인이 필요하다(`AUTH_001`).
- 회전(reissue)은 새 sessionId 키로 교체하고 이전 키를 즉시 삭제한다 — 같은 jti 로 재발급하면
  iat 가 초 단위라 같은 초 안에서 동일 토큰이 재생성되어 회전이 무력화되기 때문이고,
  이전 토큰의 재사용(탈취 재생)도 이 삭제로 차단된다.
- 무효화 범위: 로그아웃 = 현재 세션만(`revokeCurrentSession`, 관용 처리),
  탈퇴/비밀번호 변경/상태 이상 = 전 기기 세션(`revokeAllSessions`, 실패 전파·롤백).
- **세션 목록/개별 해제**: `GET /auth/sessions` — 기기 세션 목록(deviceInfo/createdAt/lastUsedAt/current,
  마지막 사용 내림차순), `DELETE /auth/sessions/{sessionId}` — 특정 기기 해제(멱등, 해제된 기기의
  access 는 만료까지 유효). 기기 정보는 로그인 요청의 User-Agent 를 정제(제어문자 제거, 150자 절단)해
  세션 메타 키(`{prefix}:auth:refreshSessionMeta:{memberId}:{sessionId}`)에 저장하며 **표시용**이다
  (위조 가능하므로 신뢰가 필요한 판단에는 쓰지 않는다). 회전 시 메타(기기 정보/최초 로그인 시각)는
  새 세션 키로 이어진다. current 판정은 요청 쿠키의 refresh 토큰 jti 비교로 한다.

## Refresh 단일 사용 회전 (P0)

- `JwtTokenStorePort.rotate`는 저장된 토큰 비교, 새 토큰/메타 저장, 이전 토큰/메타 삭제와 세션 인덱스 교체를
  Redis Lua 한 번으로 수행한다. 같은 refresh로 동시에 요청하면 하나만 성공한다. 새 jti를 발급하므로
  같은 초에 회전해도 토큰이 달라지며, 기기 정보와 최초 로그인 시각은 유지된다.
- Redis 세션이 없거나 회전/로그아웃으로 제거됐으면 기존 `AUTH_001`(401), 저장 토큰이 다르면
  `AUTH_002`(401)를 반환한다. JWT 자체 만료는 기존 보안 예외를 유지한다. 로그인 저장과 재발급 조회/회전의
  Redis 장애는 `AUTH_019`(503)로 응답하며 성공 토큰을 내려주지 않는다. API 경로, 응답 DTO, 쿠키 계약은 유지한다.
- 전체 세션 해제도 Lua 안에서 인덱스 조회와 삭제를 끝낸다. 기존 세션의 회전과 경합하더라도 회전된
  refresh가 남지 않는다. 이는 Redis 연산 간 보장이며 DB 회원 상태 변경과 동시 신규 로그인까지의 분산 트랜잭션은 아니다.
- 현재 기기 로그아웃이 먼저 이전 세션을 삭제하면 진행 중인 회전은 실패한다. 회전이 먼저 끝난 뒤
  **이전 refresh 쿠키**로 로그아웃하면 새 jti까지 추적하지는 않는다. 클라이언트는 재발급과 로그아웃을
  직렬화해야 한다. 세션 계보를 통한 후속 토큰 취소는 별도 확장 과제다.
- 실 Redis 검증: Redis 포트를 `AUTH_TEST_REDIS_PORT`, 원격/WSL 호스트라면 `AUTH_TEST_REDIS_HOST`에 지정하고
  `./gradlew :service:auth-service:test --tests '*RedisJwtTokenStoreAdapterIntegrationTest' --rerun-tasks` 실행.
  동시 회전, 재사용, TTL, 토큰 불일치, 메타 승계, 로그아웃 선행, 전체 해제와 회전 경합을 검증한다.
  환경변수가 없으면 이 통합 테스트만 건너뛰며 각 테스트는 UUID 접두어의 키만 생성·정리한다.

## 현재 구현 주의점

- 다른 서비스와 달리 인증 자체를 담당하므로 보안 흐름을 단순 조회 서비스처럼 취급하지 않는다.
- 토큰/쿠키/Redis 키 설계는 운영 정책과 같이 움직이므로 문서와 설정을 함께 본다.

## 인증/회원 보안 정책 (2026-07 보완)

**블랙리스트 자체 검증**
- auth-service는 게이트웨이를 우회해 직접 호출되므로, `JwtAuthFilter`(security-core)가
  `AccessTokenBlacklistVerifier` 훅으로 로그아웃된 access 토큰(jti)을 직접 차단한다 → `SECURITY_007`.
  jti가 없는 토큰은 `SECURITY_003`으로 거부한다(영구 revoke 불가 토큰 차단).
- 구현은 `RedisJwtTokenStoreAdapter`(기존 블랙리스트 키 재사용). Redis 장애 시 정책은
  `jwt.blacklist-fail-open`(env `JWT_BLACKLIST_FAIL_OPEN`, 기본 false=fail-closed `SECURITY_008` 503)로
  게이트웨이와 동일 키로 정렬한다.

**회원 단위 revocation 마커 (전 기기 access 무효화)**
- jti 블랙리스트는 **토큰 하나**만 무효화한다. 비밀번호 변경/제거/재설정/탈퇴는 refresh 를 전부
  지우지만 블랙리스트에 오르는 건 요청을 보낸 기기의 access 뿐이라, 다른 기기의 access 는 만료까지
  통했다. 그 구멍을 회원별 워터마크로 막는다.
- Redis 키 `{prefix}:auth:memberRevokedAt:{memberId}` = 무효화 시각(epoch seconds),
  TTL = access 만료(`JWT_ACCESS_EXPIRATION`). 그 시점이면 옛 토큰이 전부 자연 만료되므로 더 둘 이유가
  없다. 토큰 수만큼 키를 만들지 않고 회원당 키 하나라 저장 비용이 일정하다.
- **기록 위치는 `RedisJwtTokenStoreAdapter.deleteAllSessions` 안**이다. 호출부가 4곳(탈퇴/비밀번호
  변경/비밀번호 재설정/상태 이상 reissue)이라 밖에 두면 언젠가 한 곳이 빠진다. **세션 삭제 뒤에**
  기록한다 — 마커를 먼저 쓰면 삭제 전까지의 틈에 동시 재발급이 성공해 마커보다 늦은 iat 를 가진
  토큰이 살아남는다.
- **검증 지점은 두 곳**이고 둘 다 적용해야 전 서비스에 일관된다.
  - 리소스 서비스(commercial/district/community/ai): 게이트웨이 `JwtAuthApiGatewayFilter` +
    `MemberRevocationChecker` → `JWT_005`. 리소스 서비스는 자체 블랙리스트 검증을 하지 않고
    게이트웨이를 신뢰하는 구조라, 여기에 없으면 리소스 서비스 전체가 빠진다.
  - auth-service(게이트웨이 우회): security-core `JwtAuthFilter` + `MemberRevocationVerifier`
    → `SECURITY_007`.
  - 게이트웨이는 WebFlux 라 security-core(서블릿)에 의존할 수 없어 비교식이 갈라진다. 두 쪽 판정이
    어긋나면 무효화 시점이 서비스마다 달라지므로 양쪽 모두 테스트로 규칙을 고정했다.
- 게이트웨이 조회는 `StringRedisTemplate` 을 쓴다. 쓰는 쪽이 평문 문자열이라 기존
  `RedisTemplate<String, Object>`(JSON 직렬화)로 읽으면 값이 어긋난다. 블랙리스트 체커가 그 템플릿으로도
  멀쩡한 것은 `hasKey` 만 보고 값을 읽지 않기 때문이다.
- **경계: `iat == revokedAt` 은 무효로 본다.** iat 가 초 단위라 같은 초에 발급된 토큰이 revoke 보다
  앞선 것인지 알 수 없다. 통과시키면 revoke 직전 발급 토큰이 access 만료까지 살아남아 이 기능이
  막으려던 구멍이 그대로 남고, 거절하면 같은 초에 재로그인한 사용자가 한 번 더 로그인하면 된다.
  iat 클레임이 없는 토큰(0)도 같은 규칙으로 걸린다.
- 판정 불가(Redis 장애·손상된 값)는 블랙리스트와 같은 `jwt.blacklist-fail-open` 정책을 따른다
  (기본 fail-closed → 503).

**로그인 실패 횟수 제한 / 잠금 (brute-force 방어)**
- `GeneralLoginProcessor`가 로그인 실패마다 이메일 단위 카운터를 올리고, 임계값 도달 시 잠근다 →
  `AUTH_015 LOGIN_ATTEMPT_LOCKED`(429). 성공 시 카운터/잠금을 즉시 초기화한다.
- 임계값/잠금 시간은 프로퍼티: `auth.login.max-failure-count`(env `AUTH_LOGIN_MAX_FAILURE_COUNT`, 기본 5),
  `auth.login.lock-duration`(env `AUTH_LOGIN_LOCK_DURATION`, 기본 `PT10M`). 실패 카운터 TTL 도 같은 값을 쓴다
  (실패가 뜸하게 흩어지면 카운터가 자연 소멸해 정상 사용자를 잠그지 않는다).
- 구현: `LoginAttemptStorePort` / `RedisLoginAttemptStoreAdapter`. Redis 키 2종 —
  `{prefix}:auth:loginFail:{email}` (누적 실패 횟수, TTL=잠금 시간, 첫 실패에서만 TTL 설정),
  `{prefix}:auth:loginLock:{email}` (잠금 플래그, TTL=잠금 시간). 잠금이 걸리면 카운터는 삭제한다.
- **계정 열거 방지**: 카운터/잠금은 **계정 존재 여부와 무관하게 이메일 키만으로** 동작한다. 미존재 이메일도
  동일하게 카운팅되고 같은 임계값에서 같은 `AUTH_015`로 잠기므로, 잠금 응답이 "이 이메일은 가입돼 있다"는
  신호가 되지 않는다. 잠금 검사는 회원 조회보다 먼저 수행해 잠긴 이메일에는 DB 조회/bcrypt 비용도 주지 않는다.
  이메일은 전 구간과 동일하게 trim+소문자 정규화 후 키로 쓰므로 대소문자/공백으로 카운터를 우회할 수 없다.
- **Redis 장애 시 정책: fail-open**(잠금 없이 로그인은 계속 동작, ERROR 로그로 감지). 이 저장소는 비밀번호 검증을
  대체하는 게 아니라 시도 횟수를 세는 보조 장치이므로, fail-closed 로 전원 로그인 불가를 만드는 쪽이 사고가 더 크다.
  (`jwt.blacklist-fail-open`의 기본 fail-closed 와는 성격이 다르다 — 그쪽은 revoke 된 토큰을 놓치면 인증 자체가 깨진다.)
**로그인 실패 IP 상한 (credential stuffing 방어)**
- 이메일 단위 잠금만으로는 **계정마다 임계값 미만으로만 시도하며 이메일을 갈아끼우는** 공격을 막지
  못한다. 어느 계정도 잠기지 않아 시도 횟수에 사실상 상한이 없다. 그래서 IP 축을 함께 둔다 →
  `AUTH_020 LOGIN_IP_RATE_LIMITED`(429).
- 임계값/윈도우: `auth.login.ip-max-fail-count`(env `AUTH_LOGIN_IP_MAX_FAIL_COUNT`, 기본 10),
  `auth.login.ip-window`(env `AUTH_LOGIN_IP_WINDOW`, 기본 `PT1H`). 이미 운영 중인 이메일 발송 IP
  상한(`AUTH_016`)과 같은 수치·같은 고정 윈도우 방식이다.
- Redis 키 `{prefix}:auth:loginFailIp:{ip}` — 첫 실패에서만 TTL 을 걸어 고정 윈도우로 만든다.
  매 실패마다 갱신하면 공격이 이어지는 동안 윈도우가 끝나지 않아 IP 가 영구히 막힌다.
- **검사 순서는 IP 상한 → 이메일 잠금 → 회원 조회.** 이미 상한에 걸린 IP 에는 DB 조회/bcrypt 비용도
  주지 않는다. 클라이언트 IP 는 발송 상한과 동일하게 `ClientIpResolver`(X-Forwarded-For → X-Real-IP
  → remoteAddr)로 얻는다.
- **실패에만 카운트한다.** 성공 로그인은 IP 카운터를 초기화하지도 않는다 — 자기 계정 로그인 한 번으로
  상한을 리셋할 수 있으면 상한이 무의미해진다. 윈도우 만료로만 풀린다.
- IP 를 못 얻으면(헤더도 remoteAddr 도 빈 비정상 경로) 상한을 적용하지 않는다. 빈 문자열을 키로 쓰면
  IP 미상 요청들이 한 카운터를 공유해 서로를 잠근다.
- 메시지는 `AUTH_015` 와 같은 톤이라 응답으로 어느 축에 걸렸는지 구분되지 않는다.
- Redis 장애 시 정책은 이메일 잠금과 동일하게 **fail-open**(ERROR 로그).

| 코드 | HttpStatus | 설명 |
|------|-----------|------|
| `AUTH_006` | 401 | 로그인 실패 (LOGIN_FAILED) — 미존재/비밀번호 불일치 통합 응답 |
| `AUTH_015` | 429 | 로그인 실패 횟수 초과 잠금 (LOGIN_ATTEMPT_LOCKED) — 계정 존재 여부와 무관하게 동일 적용 |
| `AUTH_020` | 429 | 로그인 실패 IP 상한 초과 (LOGIN_IP_RATE_LIMITED) — 이메일과 무관하게 IP 단위로 적용 |

**계정 열거 방지**
- 로그인 실패는 미존재/비밀번호 불일치 구분 없이 `AUTH_006 LOGIN_FAILED`(401)로 통합.
  미존재 이메일에도 더미 bcrypt를 1회 수행해 응답 시간 차이(타이밍 채널)도 제거한다.
  실패 횟수 잠금(`AUTH_015`)도 미존재 이메일에 동일하게 적용된다(위 절 참고).
- 탈퇴/정지 상태는 비밀번호가 일치할 때만 노출한다(`MEMBER_004`/`MEMBER_005`).
- 인증코드 발송은 가입 여부와 무관하게 항상 200 — 기가입 이메일에는 코드 대신 안내 메일을 발송해
  메일박스 소유자만 상태를 알 수 있다. 가입 시 중복(`MEMBER_001` 409)은 이메일 인증(메일박스 소유 증명)
  이후에만 도달 가능하므로 열거 벡터가 아니다.

**회원 상태 검사**
- `MemberQueryProcessor.getActiveMember()`가 회원 스코프 API(/me, 북마크, 수정/탈퇴/비밀번호)
  진입 시 ACTIVE 상태를 공통 검증한다. 탈퇴/정지 회원의 만료 전 토큰 접근을 차단.

**내부 회원 요약 API** (`/api/v1/members/summaries`)
- `GET /summaries?memberIds=1,2,3` — 커뮤니티 등 내부 서비스가 작성자 표시(닉네임/프로필 URL)에 쓰는
  일괄 조회. Feign 전용 계약이라 `@Hidden` 이며, 공개 정보만 내려주므로 인증을 걸지 않는다
  (auth 는 permitAll + 메서드 단위 `@PreAuthorize` 구조 — 이 API 는 어노테이션을 붙이지 않는다).
- 미존재 ID 는 결과에서 빠지고, 탈퇴 회원은 저장 시점에 마스킹된 닉네임("탈퇴회원")이 그대로 나간다.
  프로필 이미지 URL 은 직접 업로드 키 > 소셜 URL 우선순위로 Presenter 가 조립한다 (내 정보와 동일).
- 요청 ID 는 distinct 후 최대 100건 — 초과는 `MEMBER_100`(400).

**회원 라이프사이클 API** (`/api/v1/members`)
- `PATCH /me` — 닉네임/프로필 이미지 URL 수정
- `POST /me/password` — 비밀번호 변경. 성공 시 세션 revoke(refresh 삭제 + 현재 access 블랙리스트).
- `POST /me/withdraw` — 논리 탈퇴. name/nickname `탈퇴회원` 마스킹 + profileImageUrl/password 제거 +
  status=WITHDRAWN + 세션 revoke. email 유지로 동일 이메일 재가입 차단. 남은 email 과 동의 이력은
  **탈퇴 후 1년 뒤 파기**한다(아래 "가입 동의와 만 14세 이상 확인" 절의 보관·파기 참고, 파기 작업은 후속 이슈).
- revoke는 보안 이벤트 경로에서 **실패 시 전파되어 DB 변경과 함께 롤백**된다(무효화 없는 성공 방지).
  로그아웃은 기존대로 관용 처리(`revokeCurrentSession` vs `revokeAllSessions`).
- 다른 기기의 기존 access token 도 **즉시 무효화된다** — 전 기기 세션 해제 시 회원 단위 revocation
  마커를 남기고, 그 이전에 발급된 access 는 게이트웨이/auth-service 양쪽에서 거절된다
  (위 "회원 단위 revocation 마커" 절 참고). 토큰 재발급은 회원 상태도 검증해 정지/탈퇴 회원의
  reissue를 차단하고 refresh를 삭제한다.
- `member.email`은 DB unique 제약(`uk_member_email`) — 동시 가입 중복은 409로 변환. 기존 DB에는
  `backend/scripts/migration/member-email-unique-index-runbook.sql` 수동 적용 필요(ddl-auto는 미보장).

**이메일 인증 (가입 필수)** (`/api/v1/auth`)
- `POST /email/send-code` — 인증코드 발송. **IP 발송 상한**(`AUTH_016`, 429 — 기본 10회/1시간,
  `auth.email-send.ip-max-send-count`/`ip-window`) → 이메일 60초 쿨다운(`AUTH_003`, 429) 순으로
  가입 여부 판별보다 먼저 적용되고, 응답은 항상 200(기가입 이메일은 안내 메일 발송).
  IP 상한은 이메일 키 쿨다운으로 못 막는 "한 IP 가 여러 이메일로 뿌리는" 남용 방어다.
  클라이언트 IP 는 `ClientIpResolver`(X-Forwarded-For → X-Real-IP → remoteAddr)로 얻고
  Redis `{prefix}:auth:emailSendIp:{ip}` 고정 윈도우 카운터(장애 시 fail-open)로 센다.
- `POST /email/verify-code` — 코드 검증(`AUTH_004`/`AUTH_005`). 성공 시 30분간 가입 가능.
  **5회 오입력 시 코드 무효화 + `AUTH_018`** (비밀번호 재설정 `AUTH_017`과 동일한 브루트포스 방어,
  실패 카운터 키 `{prefix}:auth:emailVerificationFail:{email}`, TTL=코드 TTL).
- 가입(`POST /members/signup`)은 인증 플래그가 없으면 `MEMBER_006`(400)로 거부하고, 성공 시 플래그를 소비한다.
  필수 동의·만 14세 이상 확인 검사가 인증 플래그 검사보다 먼저라, 동의로 거절된 요청은 플래그를 소비하지 않는다.
- 이메일은 전 구간 trim+소문자 정규화(Redis 키/DB 저장 정합). 코드: SecureRandom 8자(I/O/0/1 제외), TTL 5분.
  Redis 키는 3종 — `{prefix}:auth:emailVerificationCode:{email}` (발급 코드, TTL 5분),
  `{prefix}:auth:emailVerificationCooldown:{email}` (재발송 쿨다운 60초),
  `{prefix}:auth:emailVerified:{email}` (인증 완료 플래그, 30분).
- 발송: `spring.mail.*`(SMTP, env `MAIL_HOST/PORT/USERNAME/PASSWORD`) + `authMailTaskExecutor` 비동기,
  로그에는 이메일을 마스킹해 남긴다. 자격증명 미설정이어도 기동은 가능하며 발송 시점에만 실패한다.
  **배포 전 Vault dev/prod secret에 MAIL_* 키 추가 필요.**
- 후속 권장 항목은 모두 구현 완료다 — send-code 의 IP 상한(`AUTH_016`), 계정 단위 로그인 실패
  잠금(`AUTH_015`), **login 의 IP 기반 rate limit**(`AUTH_020`, 위 "로그인 실패 IP 상한" 절),
  **회원 단위 revocation 마커**(위 "회원 단위 revocation 마커" 절).

**계정 정책 (의도적으로 제공하지 않는 것)**
- **이메일 변경 기능은 제공하지 않는다.** 이메일은 로그인 식별자이자 DB unique 키(`uk_member_email`)로
  사실상 계정의 PK 역할이다. 소셜 자동 연결(`AUTH_008`)·재가입 차단·이메일 인증 이력이 모두 이메일에
  묶여 있어, 변경을 허용하면 이 보증들이 전부 흔들린다. 이메일을 바꾸려면 새 계정 가입이 정책이다.
- **탈퇴 시 타 서비스 데이터는 보존한다.** 개인정보(이름/닉네임/프로필/비밀번호)는 auth 에서만 보관하며
  탈퇴 시 마스킹·제거된다. 커뮤니티 게시글/분석 보관함/시뮬레이션 이력에는 memberId 만 남고
  개인 식별 정보가 없어 그대로 둔다. 보관함·이력은 인증 필수라 탈퇴 후 접근 자체가 불가하다.
  (추후 커뮤니티에 작성자 닉네임 표시를 도입하면, 탈퇴 회원은 마스킹된 값("탈퇴회원")이 그대로
  노출되도록 auth 조회 계약을 유지할 것.)

**비밀번호 재설정 (일반 계정 전용)** (`/api/v1/auth`)
- `POST /password/reset/send-code` — 재설정 코드 발송 (미인증). **응답은 항상 200** 이고 분기는
  메일 내용으로만 전달한다: 일반 계정=재설정 코드 / 미가입=미가입 안내 / 소셜 전용(password null)=
  소셜 로그인 이용 안내. 응답으로 구분하면 계정 열거 벡터가 되기 때문이다.
- `POST /password/reset` — `{email, code, newPassword}`. 성공 시 비밀번호 교체 + **전 기기 세션
  무효화**(deleteAllSessions — 탈취범이 유지 중인 세션 차단). 코드 불일치 `AUTH_004`, 만료/미발급
  `AUTH_005`, **5회 오입력 시 코드 무효화 + `AUTH_017`**(브루트포스 방어).
- 저장소는 회원가입 인증과 **키 분리** (`PasswordResetStorePort` / `RedisPasswordResetStoreAdapter`) —
  `{prefix}:auth:passwordResetCode|passwordResetCooldown|passwordResetFail:{email}`.
  공유하면 재설정 코드로 회원가입이 통과하거나 그 반대가 된다. 코드 TTL 5분 / 쿨다운 60초는
  회원가입 인증과 동일하고, 코드 생성기는 공용(`VerificationCodeGenerator`).
- IP 발송 상한 카운터(`emailSendIp`)는 회원가입 발송과 **공유**한다 — "이 IP 가 메일을 몇 번
  보냈나"는 API 구분 없이 센다.
- 새 비밀번호 검증 코드 대역: `AUTH_106~108` (member 비밀번호 정책과 동일 규칙).

**계정 연결/전환 (일반 ↔ 소셜)** — 프론트 연동은 `docs/auth-account-frontend-guide.md` 참고
- **일반 → +소셜 (자동 연결)**: 일반 계정이 있는 이메일로 소셜 로그인하면 그 계정에 provider 가
  연결되고(`OAuthLoginProcessor.resolveExistingMember` — `withProvider`), 이후 두 로그인 수단 모두
  사용 가능하다. 양쪽 다 메일함 소유가 증명된 상태(소셜=provider 이메일 검증, 일반=가입 시 이메일
  인증)라 자동 연결이 안전하다. 연결 순간 **통보 메일**(`sendSocialLinkedNotice`)을 발송해
  본인이 아닌 연결을 즉시 감지할 수 있게 한다.
- **소셜 → +이메일 (비밀번호 최초 설정)**: `POST /members/me/password/setup` (인증 필수) —
  password 가 null 인 계정만 허용(`MEMBER_008` 로 중복 설정 거부), 설정 후 이메일 로그인도 가능.
  로그인 수단 "추가"라 세션은 무효화하지 않는다 (변경/재설정과 다른 점).
- **소셜 전용 전환(비밀번호 제거)**: `DELETE /members/me/password` (인증 필수) — 연결된 계정
  (password 있음 + provider 있음)만 허용한다. 일반 전용 계정은 `MEMBER_009` 거부(마지막 로그인
  수단 제거 방지), 이미 소셜 전용이면 `MEMBER_007`. 성공 시 password=null 저장 + **전 기기 세션
  무효화**(로그인 수단이 줄어드는 보안 이벤트) + 전환 통보 메일(`sendPasswordRemovedNotice`).
  전환 후에도 "비밀번호 최초 설정"으로 이메일 로그인을 복구할 수 있다.
- `/members/me` 응답에 `hasPassword` 를 노출한다 — FE 가 (일반 / 소셜 전용 / 연결됨) 상태를
  구분해 비밀번호 메뉴(변경·설정·전환)를 분기하는 기준이다.

**소셜 로그인 (카카오/네이버)** (`/api/v1/auth`)
- `GET /{provider}/authorize` — 인가 URL 생성. CSRF 방어용 일회성 `state`(SecureRandom 16바이트 hex)를
  Redis(`{prefix}:auth:oauthState:{state}`, TTL 10분)에 provider·소셜 첫 가입 동의와 함께 저장하고 URL에 포함한다.
  동의는 쿼리 `termsAgreed`·`privacyAgreed`·`ageOver14Confirmed`(생략 시 false)로 받는다 (#494, 아래 "가입 동의" 절).
  값은 JSON 한 덩어리(`{"provider":"KAKAO","termsAgreed":true,...}`)를 String 키 하나에 둔다 — Hash 면 GETDEL 이 안 먹는다.
- `GET /{provider}/login?code=&state=` — 콜백. state를 GETDEL로 원자 소비(재사용 차단)하고 저장된
  provider와 일치해야 한다(`AUTH_010`). 토큰 교환 → 프로필 조회 → 회원 조회/자동가입 → 일반 로그인과
  동일한 응답(accessToken + refresh 쿠키). 자동가입(신규 회원)일 때만 state 에 실린 동의를 검사해 이력으로 남긴다.
- 계정 정책: 이메일 미제공 동의 시 `AUTH_009`(400). 동일 이메일의 일반 계정은 소셜로 자동 연결,
  다른 provider 기가입이면 `AUTH_008`(409). 탈퇴/정지 회원은 소셜 로그인도 차단.
  소셜 계정(password null)의 비밀번호 변경은 `MEMBER_007`(400).
- 소셜 로그인 추가 에러코드: 지원하지 않는 provider 경로는 `AUTH_007 UNSUPPORTED_OAUTH_PROVIDER`(400),
  프로필(닉네임) 미제공 동의는 `AUTH_011 OAUTH_PROFILE_REQUIRED`(400), provider 측 이메일 미인증은
  `AUTH_012 OAUTH_EMAIL_UNVERIFIED`(400), 인가 코드 교환/인증 실패는 `AUTH_013 OAUTH_AUTHORIZATION_FAILED`(400),
  provider 통신 불가(서킷 오픈 포함)는 `AUTH_014 OAUTH_PROVIDER_UNAVAILABLE`(502).
- 구조: 도메인 enum `member/domain/enums/OAuthProvider`(회원 속성) + `Member.provider` 컬럼(nullable).
  provider별 구현은 `OAuthAuthorizationUrlProvider`/`OAuthMemberQueryPort`(supports() 키 라우팅,
  adapter는 `OAuthMemberQueryResult`로 변환) + HTTP Interface(WebClient, 응답 타임아웃 10초).
- `/members/me` 응답에 `provider` 필드가 추가되어 FE가 소셜 계정 여부를 구분한다.
- TripMarble 대비 개선: state CSRF 방어 추가, enum의 adapter→domain 재배치, fetcher가 타 컨텍스트
  도메인을 직접 조립하던 것을 QueryResult 계약으로 교정, 이메일 정규화/미동의 처리.
- **배포 전 Vault dev/prod secret에 OAUTH_KAKAO_*/OAUTH_NAVER_* 6개 키 추가 필요**
  (client-id/client-secret/redirect-uri — redirect-uri는 provider 콘솔 등록값과 일치).

## 개발 편의 API (prod 미노출)

- `POST /api/v1/members/signup/dev` — **이메일 인증 없이 즉시 회원가입** (테스트 계정 생성 전용).
  정규화/중복 검증(`MEMBER_001` 409)/비밀번호 규칙은 일반 가입과 동일하고, 인증 게이트만 건너뛴다.
  응답으로 `{memberId, email}` 을 돌려줘 바로 로그인 테스트로 이어갈 수 있다.
- 바디는 일반 가입과 같아서 필수 동의 3종(`termsAgreed`·`privacyAgreed`·`ageOver14Confirmed`)도 받고
  (`MEMBER_114~116`), 가입되면 일반 가입과 같은 동의 이력을 남긴다. **dev 기본값으로 채우지 않는다** —
  체크하지 않은 동의를 서버가 "동의함" 으로 적는 경로가 코드에 생기면 이력 전체의 신뢰가 깨지고, 개발 계정만
  이력 모양이 다르면 이력을 읽는 쪽이 운영에서 생기지 않는 경우를 다루게 된다.
- 컨트롤러/파사드가 `@Profile("!prod")` 라 **운영에서는 빈이 등록되지 않아 경로 자체가 404** 다.
  운영 계약 문서(api-reference.md)에는 싣지 않는다. Swagger 에는 "개발용 (prod 미노출)" 태그로 노출된다.
- 운영 유스케이스(`MemberWebUseCase`)와 분리된 `MemberDevSignupUseCase` 를 쓴다 —
  개발 편의 메서드가 운영 계약에 섞이지 않게 하기 위함이다.

## 가입 동의와 만 14세 이상 확인 (#494)

프론트 연동 계약(요청 필드·에러코드·소셜 재시도 흐름)은 `docs/auth-account-frontend-guide.md` §0 이 정본이다.

**무엇을 받는가**
- 이용약관 동의 · 개인정보 처리방침 동의 · 만 14세 이상 확인, 셋 다 필수. 일반 가입·개발용 가입은 요청 바디
  (`termsAgreed`/`privacyAgreed`/`ageOver14Confirmed`), 소셜 첫 가입은 `GET /{provider}/authorize` 쿼리로 받는다.
- 강제는 두 겹이다. web 경계의 `@AssertTrue` 가 요청 형식을 막고(`MEMBER_114`/`115`/`116`), 가입 프로세서의 가드가
  "동의 행은 실제 동의를 반영한다" 는 불변식을 지킨다(`MEMBER_010` 동의 누락 / `MEMBER_011` 만 14세 미만 — DTO 를 거치지
  않는 호출자 방어). `@AssertTrue` 는 null 을 유효로 보므로 DTO 필드는 primitive `boolean` 이다. 래퍼면 필드를 빼고
  보낸 요청이 통과한다.
- 동의 누락과 만 14세 미만은 코드를 나눈다. 합치면 프론트가 어느 체크박스를 강조할지 알 수 없다.

**동의 이력 `member_consent`**
- 컬럼: `id`(Snowflake), `member_id`(FK: member.id), `consent_type`(`TERMS`/`PRIVACY`/`AGE_OVER_14`), `document_version`,
  `agreed_at`, `created_at`/`updated_at`. 인덱스 `idx_member_consent_member_id`.
- 가입 1건당 3행, **같은 `agreed_at`**. 판은 `TERMS`=이용약관 판, `PRIVACY`=처리방침 판, `AGE_OVER_14`=**이용약관 판**
  (만 14세 미만 가입 불가를 규정한 문서가 이용약관이다).
- 한 번 남긴 행은 고치지 않는다. 문서 개정 뒤 재동의가 생기면 새 행을 쌓는다 — 그래서 `(member_id, consent_type)` 에
  unique 를 걸지 않는다. 항목별 최신 동의는 `agreed_at` 최대값.
- 생성 규칙은 `MemberConsentProcessor.recordSignupConsents` 한 곳에 있다. 일반 가입(`MemberGeneralSignupProcessor`),
  개발용 가입, 소셜 첫 가입(`OAuthLoginProcessor` → `SignupConsentRecordPort` → `SignupConsentRecordAdapter`)이 모두
  이것을 탄다. 경로마다 복제하면 항목이 늘 때 한쪽만 옛 규칙으로 남고, 감사 이력이라 나중에 복구할 수 없다.
  일반·개발용 가입은 지금 판 설정과 지금 시각을, 소셜 첫 가입은 `/authorize` 때 고정한 판·시각을 넘긴다(아래 "소셜 첫 가입").
- 트랜잭션은 호출자 것에 합류한다(`MemberWebFacade.generalSignup`, `MemberDevSignupFacade.devSignup`,
  `OAuthLoginProcessor.login`). 회원 행과 동의 행은 함께 커밋되거나 함께 사라진다. `AuthWebFacade.oauthLogin` 은
  provider HTTP 왕복 때문에 트랜잭션이 없으므로 거기서 기록하지 않는다. 이 배치는 `SignupConsentTransactionBoundaryTest` 가
  리플렉션으로 고정한다 — 이력을 남기는 쪽에 `REQUIRES_NEW` 같은 것이 붙으면 원자성이 조용히 깨지기 때문이다.
- `consent_type` 은 `@Enumerated(STRING)` + `@JdbcTypeCode(SqlTypes.VARCHAR)` 로 `varchar(30)` 에 고정한다. Hibernate 6 의
  MySQL 방언은 `@Enumerated(STRING)` 만 있으면 네이티브 `enum(...)` 을 만들어 dev(ddl-auto)와 prod 런북(VARCHAR)이 갈리고,
  ENUM 이면 항목을 늘릴 때 ddl-auto=update 가 컬럼을 고치지 않아 새 항목 INSERT 가 실패한다. 다른 enum 컬럼은 이번에 바꾸지 않았다.
- prod 는 `ddl-auto: none` — 배포 전 `backend/scripts/migration/member-consent-table-runbook.sql` 수동 적용 필요.
  테이블이 없으면 prod 가입이 INSERT 에서 실패한다. 런북은 `information_schema` 로 `consent_type` 이 실제로 varchar(30)
  인지 확인하는 쿼리와, 고정 전에 dev 에 ENUM 으로 생긴 테이블을 고치는 ALTER 를 함께 둔다(`CREATE TABLE IF NOT EXISTS` 는
  모양이 다른 기존 테이블을 그냥 넘어간다). `MemberConsentSchemaContractTest` 가 Hibernate MySQL 방언이 DB 연결 없이 내는
  DDL 을 런북과 컬럼·타입·길이·NOT NULL 단위로 대조하고, enum 저장 형식(STRING + VARCHAR)을 어노테이션으로 고정한다.

**문서 판 설정**
- `legal.terms-version`(현재 `"1.0"`), `legal.privacy-version`(현재 `"1.2"`) — local·dev·prod yml 에 같은 값으로 둔다.
  정본은 프론트 `frontend/src/lib/legal/{terms-of-service,privacy-policy}.ts` 의 `version`. 개정하면 같은 배포에 함께 바꾼다.
- 비밀값이 아니고 프론트 코드와 함께 움직이는 값이라 Vault env 가 아니라 yml 에 직접 적는다. `1.10` 이 숫자 `1.1` 로
  읽히지 않게 따옴표로 감싼다. 세 프로필 값이 같은지는 `LegalPropertiesTest` 가 본다.
- 판이 비거나 `document_version` 컬럼 길이(20자, `MemberConsent.DOCUMENT_VERSION_MAX_LENGTH`)보다 길면 기동을 막는다
  (`LegalProperties`). 기본값으로 메우면 개정 뒤 설정이 빠졌을 때 옛 판이 조용히 이력에 남고, 길면 기동은 되고 이후 모든
  가입이 INSERT 에서 실패한다(일반 가입은 이메일 인증까지 다시 받아야 한다).
- 후속: 일반 가입은 서버의 현재 판으로 이력을 남긴다. 사용자가 화면에서 본 판(FE `version`)을 요청에 함께 보내 서버 판과
  대조하는 것은 FE 계약이 바뀌므로 이번에는 하지 않았다. 개정 배포 순간 FE 와 BE 가 잠깐 어긋나면 그 사이 가입은 보지 않은
  판으로 남을 수 있다 — 판을 요청에 실어 불일치면 거부(재동의 유도)하는 방식을 후속으로 검토한다.

**소셜 첫 가입**
- 동의는 콜백이 아니라 `/authorize` 에서 받아 state 와 함께 Redis 에 둔다. OAuth 인가코드가 1회용이라, 콜백에서 동의
  누락으로 거부하면 같은 코드로 재시도할 수 없기 때문이다. 동의 없이 `/authorize` 를 부르는 것은 허용한다 — 인가 전에는
  신규인지 알 수 없고 기존 회원 로그인에는 동의가 필요 없다.
- 콜백에서 **신규 회원을 만들 때만** 동의를 본다. 문서 동의가 없거나 모자라면 `AUTH_021`, 만 14세 이상 확인이 없으면
  `AUTH_022`(둘 다 400)로 거부하고 회원을 만들지 않는다. 일반 가입 코드와 나눈 이유는 이 코드가 "폼 재제출" 이 아니라
  "동의를 받아 `/authorize` 부터 다시" 를 뜻하기 때문이다.
- **판·시각은 동의한 순간(`/authorize`) 기준이다.** `/authorize` 는 동의 플래그와 함께 그 시점의 문서 판(terms·privacy)과
  동의 시각을 state JSON 에 싣고(`OAuthConsentSnapshot`), 콜백은 그 값으로 이력을 남긴다. 콜백 시점의 설정을 쓰면 state
  TTL(10분) 안에 개정판이 배포됐을 때 사용자가 보지 않은 판이 기록된다. Redis 값 예:
  `{"provider":"KAKAO","termsAgreed":true,"privacyAgreed":true,"ageOver14Confirmed":true,"termsVersion":"1.0","privacyVersion":"1.2","agreedAt":"2026-10-06T09:30:15.123456"}`.
- 배포 직후 TTL(10분) 안에는 옛 형식 state(맨 provider 문자열, 또는 판·시각이 없는 JSON)가 남아 있을 수 있다. 무효로 버리지
  않고 "동의 없음" 으로 읽어 기존 회원 로그인은 통과시키고, 신규는 `AUTH_021` 로 동의부터 다시 받게 한다
  (`RedisOAuthStateStoreAdapter.deserialize`). 판을 모르는 동의는 이력으로 남길 수 없기 때문이다.

**소셜 state 와 login CSRF — 이번 변경이 키우는 위험 (#527)**
- state 가 브라우저에 묶여 있지 않다. 서버는 "우리가 발급한 state 인가" 만 보고 "이 브라우저가 시작한 인가인가" 는 보지 않는다.
  그래서 공격자가 자기가 만든 `/authorize` URL(동의 true)을 피해자에게 밟게 하면, 피해자가 provider 인가를 마치는 순간 피해자
  이메일로 계정이 생기고 **피해자 이름으로 동의 이력이 남는다.** login CSRF 구조 자체는 이전부터 있었지만, 이번 변경 전에는
  결과가 "피해자 계정 생성" 에 그쳤고 이제는 피해자가 하지 않은 동의의 기록이 더해진다.
- 배포 순서가 이 위험을 키운다. 이 BE 변경이 FE 동의 화면(#495)보다 먼저 나가면, 소셜 버튼을 눌러 카카오 앱 동의까지 마쳤지만
  `AUTH_021` 로 막혀 우리 회원은 아닌 사용자가 생긴다. 이들은 provider 쪽 승인이 이미 끝나 있어 인가 화면이 거의 바로
  넘어가므로, 제3자가 동의 true 를 실은 인가 URL 하나로 그들 이름의 계정과 동의 이력을 만들기 쉬워진다.
- 막는 방법은 state 를 BFF 의 HttpOnly 쿠키에 묶는 것이다(`/authorize` 때 쿠키를 심고, 콜백은 쿠키의 state 와 쿼리의 state 가
  같을 때만 받는다). 후속 이슈는 **#527** 이고, **#495 와 같은 릴리스 또는 그보다 먼저** 나가야 한다.

**기존 회원**
- 소급 동의를 받지 않는다. 이력이 없는 회원은 "동의 도입 전 가입" 으로 보고, 로그인·소셜 로그인·계정 연결은 동의와
  무관하게 통과한다. 재동의 화면을 띄우지 않는다.

**만 14세 이상 확인 — 근거와 한계**
- 근거: 개인정보 보호법 제22조의2 는 만 14세 미만 아동의 개인정보를 법정대리인 동의 없이 처리하지 못하게 한다. 이
  서비스에는 법정대리인 동의 흐름이 없어서 만 14세 미만은 받지 않는다(이용약관 「회원가입과 이용계약의 성립」,
  개인정보 처리방침 「만 14세 미만 아동의 개인정보」).
- 방식은 **자기신고 체크박스**다. 생년월일을 받으면 쓰지도 않는 개인정보가 늘어 최소수집 원칙과 부딪히고, 본인확인
  연동은 서비스 규모에 비해 과하다. 소셜 provider 의 연령대도 쓰지 않는다 — 카카오 `age_range` 는 `10~14`·`15~19`
  같은 구간이고 네이버는 10년 단위라 만 14세 경계를 가르지 못하며, 둘 다 사용자가 제공을 거부할 수 있는 선택 항목이다.
- 한계: 자기신고라 허위 신고를 막지 못한다. 서비스가 할 수 있는 것은 "물어봤고 확인받았다" 를 이력(`AGE_OVER_14`)으로
  입증하는 것과, 만 14세 미만 가입 사실을 알게 되면 지체 없이 삭제하고 이용을 제한하는 것(처리방침에 명시)이다.
- `AGE_OVER_14` 는 문서에 대한 동의가 아니라 사실에 대한 자기신고라 **철회 대상이 아니다.** 동의 철회·재동의 흐름을 만들
  때 이 항목은 빼야 한다.

**탈퇴 회원 보관·파기**
- 탈퇴 회원의 email(재가입 차단용)과 동의 이력은 **탈퇴 후 1년** 보관한 뒤 파기한다. 기간은
  `legal.withdrawn-retention: P365D`(local·dev·prod)로 고정했다. 1년은 운영 정책으로 정한 값이며 동의 이력의 증거
  보관 기간과 재가입 차단 기간을 겸한다 — 파기 뒤에는 같은 이메일로 다시 가입할 수 있다.
- **실제 파기 작업(이메일 익명화·이력 삭제 배치)은 후속 이슈다.** 이 이슈는 기간을 설정과 문서에 정하는 데까지만 한다.
  후속 작업이 알아야 할 것:
  - `member` 에 탈퇴 시각 컬럼이 없다. `updated_at` 은 탈퇴 뒤 다른 갱신이 있으면 움직이므로, 기산점이 필요하면
    탈퇴 시각 컬럼을 먼저 둔다.
  - email 은 `uk_member_email` unique 라 지우지 말고 회원별로 겹치지 않는 값으로 익명화한다. 동의 이력은
    `member_id` 로 지운다(`idx_member_consent_member_id`).
- 프론트 개인정보 처리방침 1.2(시행 2026-10-14)가 동의 이력을 처리 항목(제3조)·보유 기간(제2조 "탈퇴 후에도
  보관")·탈퇴 처리(제6조)에 적었다. **1년이라는 기간은 아직 적지 않았다** — 파기 작업(#508)이 없어 지킬 수 없는
  약속이 되기 때문이다. 파기 작업이 들어오면 처리방침에 이 설정과 같은 기간을 적어 판을 올린다.

## 상권 북마크 시스템 (신규)

**엔드포인트** (`/api/v1/members/me/bookmarks`):
- `POST /` — 북마크 추가 (`targetType`, `targetCode`, `targetName`)
- `DELETE /{bookmarkId}` — 북마크 삭제
- `GET /` — 북마크 목록 (커서 페이지네이션, `lastBookmarkId` 기준)

**DB 테이블** `member_bookmark`:
- `id` (Snowflake), `member_id`, `target_type` (COMMERCIAL/ADMINISTRATION/DISTRICT), `target_code`, `target_name`, `created_at`
- `UNIQUE(member_id, target_type, target_code)` — 중복 북마크 방지
- `commercial_region_mapping` FK 없음 — 서비스 간 DB 분리 원칙

**핵심 파일 (`domainlayer/member/`)**:
- `domain/enums/MemberBookmarkTargetType.java`
- `adapter/out/persistence/entity/MemberBookmarkEntity.java`
- `adapter/out/persistence/repository/MemberBookmarkRepository.java` — Spring Data 파생 쿼리 기반 커서 페이지네이션 (QueryDSL 없음)
- `application/service/MemberBookmarkWebFacade.java`
- `adapter/in/web/controller/MemberBookmarkWebController.java`
- `adapter/in/web/exception/MemberExceptionHandler.java` — `@RestControllerAdvice`, `MemberException`·`BookmarkException` 통합 처리

## 검증 에러코드 대역 (Bean Validation)

요청 검증 실패는 도메인별 1xx 대역 코드로 응답한다. 필드별 코드의 단일 기준점은 각 `*ValidationMessage` 카탈로그다.

| 대역 | 코드 | 설명 |
|------|------|------|
| AUTH | `AUTH_100` | 검증 실패 폴백 (INVALID_REQUEST) |
| AUTH | `AUTH_101`~`AUTH_104` | 필드별 검증 코드 (`AuthValidationMessage` — 이메일 필수/형식, 비밀번호 필수, 인증코드 필수) |
| AUTH | `AUTH_105` | 요청 파라미터 형식 오류 (PARAMETER_TYPE_INVALID) |
| MEMBER | `MEMBER_100` | 검증 실패 폴백 (INVALID_REQUEST) |
| MEMBER | `MEMBER_101`~`MEMBER_112` | 필드별 검증 코드 (`MemberValidationMessage` — 이메일/비밀번호/이름/닉네임/프로필 URL 등) |
| MEMBER | `MEMBER_113` | 요청 파라미터 형식 오류 (PARAMETER_TYPE_INVALID) |
| MEMBER | `MEMBER_114`~`MEMBER_116` | 가입 필수 동의 (이용약관 / 개인정보 처리방침 / 만 14세 이상 확인). `113` 이 먼저 배포돼 그 뒤에 이어 붙였다 |
| BOOKMARK | `BOOKMARK_001`~`BOOKMARK_003` | 도메인 에러 (중복 409 / 미존재 404 / 타인 북마크 403) |
| BOOKMARK | `BOOKMARK_1xx` | 필드별 검증 코드 (`BookmarkValidationMessage` — 대상 타입/코드/이름, 조회 개수) |

## 프로필 이미지 (MinIO)

- `POST /api/v1/members/me/profile-image` (multipart `imageFile`, 인증 필수) — 업로드 후 즉시 반영.
  기존 이미지가 있으면 교체하고 이전 객체는 삭제한다.
- `DELETE /api/v1/members/me/profile-image` (인증 필수) — 이미지 제거 + 객체 삭제
- **`PATCH /api/v1/members/me` 는 더 이상 `profileImageUrl` 을 받지 않는다.** 임의 URL 주입을 막기 위해
  이미지는 전용 API 로만 변경한다. 이 PATCH 는 닉네임만 수정한다.
- 저장 형태: `member.profile_image_key` 에 **오브젝트 키**를 저장하고, 소셜 제공자 이미지는 기존
  `profile_image_url`(외부 URL)에 남는다. 표시 우선순위는 key > url 이며 조립은 `MemberPresenter` 책임이다.
- 탈퇴 시 `withdraw()` 가 두 필드를 비우고, 저장된 객체는 커밋 이후 삭제된다.
- 상세 계약과 에러코드(`STORAGE_001`~`STORAGE_007`)는 `docs/file-upload-guide.md` 참고.
