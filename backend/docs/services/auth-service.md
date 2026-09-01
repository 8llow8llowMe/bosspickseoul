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
  실패 누적 시 이메일 단위로 잠긴다(`AUTH_015`, 429 — 기본 5회 / 10분).
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
- 알려진 한계: 이메일 단위 잠금이라 IP 분산 공격에는 계정별로만 유효하다. IP 기반 rate limit(게이트웨이)은 별도 과제.

| 코드 | HttpStatus | 설명 |
|------|-----------|------|
| `AUTH_006` | 401 | 로그인 실패 (LOGIN_FAILED) — 미존재/비밀번호 불일치 통합 응답 |
| `AUTH_015` | 429 | 로그인 실패 횟수 초과 잠금 (LOGIN_ATTEMPT_LOCKED) — 계정 존재 여부와 무관하게 동일 적용 |

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

**회원 라이프사이클 API** (`/api/v1/members`)
- `PATCH /me` — 닉네임/프로필 이미지 URL 수정
- `POST /me/password` — 비밀번호 변경. 성공 시 세션 revoke(refresh 삭제 + 현재 access 블랙리스트).
- `POST /me/withdraw` — 논리 탈퇴. name/nickname `탈퇴회원` 마스킹 + profileImageUrl/password 제거 +
  status=WITHDRAWN + 세션 revoke. email 유지로 동일 이메일 재가입 차단.
- revoke는 보안 이벤트 경로에서 **실패 시 전파되어 DB 변경과 함께 롤백**된다(무효화 없는 성공 방지).
  로그아웃은 기존대로 관용 처리(`revokeCurrentSession` vs `revokeAllSessions`).
- 알려진 한계: 다른 기기의 기존 access token은 만료까지 유효(재발급은 차단됨). `JWT_ACCESS_EXPIRATION`
  단축(PT30M 권장) 또는 회원 단위 revocation 마커(후속) 참고. 토큰 재발급은 회원 상태를 검증해
  정지/탈퇴 회원의 reissue를 차단하고 refresh를 삭제한다.
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
- 이메일은 전 구간 trim+소문자 정규화(Redis 키/DB 저장 정합). 코드: SecureRandom 8자(I/O/0/1 제외), TTL 5분.
  Redis 키는 3종 — `{prefix}:auth:emailVerificationCode:{email}` (발급 코드, TTL 5분),
  `{prefix}:auth:emailVerificationCooldown:{email}` (재발송 쿨다운 60초),
  `{prefix}:auth:emailVerified:{email}` (인증 완료 플래그, 30분).
- 발송: `spring.mail.*`(SMTP, env `MAIL_HOST/PORT/USERNAME/PASSWORD`) + `authMailTaskExecutor` 비동기,
  로그에는 이메일을 마스킹해 남긴다. 자격증명 미설정이어도 기동은 가능하며 발송 시점에만 실패한다.
  **배포 전 Vault dev/prod secret에 MAIL_* 키 추가 필요.**
- 후속 권장: login 의 **IP 기반** rate limit(게이트웨이), 회원 단위 revocation 마커.
  (send-code 의 IP 상한은 구현 완료 — `AUTH_016`, 위 참조. 계정(이메일) 단위 로그인 실패 잠금도
  구현 완료 — `AUTH_015`, 위 "로그인 실패 횟수 제한 / 잠금" 절 참고)

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
  Redis(`{prefix}:auth:oauthState:{state}`, TTL 10분)에 provider와 함께 저장하고 URL에 포함한다.
- `GET /{provider}/login?code=&state=` — 콜백. state를 GETDEL로 원자 소비(재사용 차단)하고 저장된
  provider와 일치해야 한다(`AUTH_010`). 토큰 교환 → 프로필 조회 → 회원 조회/자동가입 → 일반 로그인과
  동일한 응답(accessToken + refresh 쿠키).
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
- 컨트롤러/파사드가 `@Profile("!prod")` 라 **운영에서는 빈이 등록되지 않아 경로 자체가 404** 다.
  운영 계약 문서(api-reference.md)에는 싣지 않는다. Swagger 에는 "개발용 (prod 미노출)" 태그로 노출된다.
- 운영 유스케이스(`MemberWebUseCase`)와 분리된 `MemberDevSignupUseCase` 를 쓴다 —
  개발 편의 메서드가 운영 계약에 섞이지 않게 하기 위함이다.

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
