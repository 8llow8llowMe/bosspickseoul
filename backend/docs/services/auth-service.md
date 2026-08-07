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

- `POST /api/v1/auth/login` — 이메일/비밀번호 로그인. 응답 body에 accessToken, `Set-Cookie`로 refresh 쿠키 발급.
- `POST /api/v1/auth/logout` — 로그아웃. refresh 삭제 + access 블랙리스트, refresh 쿠키 제거(maxAge=0).
- `POST /api/v1/auth/token/reissue` — 토큰 재발급. `@CookieValue(name = "refreshToken", required = false)`로
  쿠키를 읽으며, 쿠키 미첨부 시에도 컨트롤러 진입 후 도메인 검증(`AUTH_002`)으로 처리한다.

**refresh 쿠키 계약** (`RefreshCookieProvider`):
- `httpOnly=true`, `sameSite=Strict`
- `path=/api/v1/auth/token/reissue` — **reissue 전용 스코프**. 다른 경로에는 쿠키가 전송되지 않으므로
  로그아웃 등 다른 API가 쿠키 값을 읽는 설계를 하면 안 된다.
- `secure`는 prod 프로필에서만 true
- `maxAge=jwt.refresh-expiration` (초 단위)

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

**계정 열거 방지**
- 로그인 실패는 미존재/비밀번호 불일치 구분 없이 `AUTH_006 LOGIN_FAILED`(401)로 통합.
  미존재 이메일에도 더미 bcrypt를 1회 수행해 응답 시간 차이(타이밍 채널)도 제거한다.
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
  로그아웃은 기존대로 관용 처리(`revokeToken` vs `revokeAllSessions`).
- 알려진 한계: 다른 기기의 기존 access token은 만료까지 유효(재발급은 차단됨). `JWT_ACCESS_EXPIRATION`
  단축(PT30M 권장) 또는 회원 단위 revocation 마커(후속) 참고. 토큰 재발급은 회원 상태를 검증해
  정지/탈퇴 회원의 reissue를 차단하고 refresh를 삭제한다.
- `member.email`은 DB unique 제약(`uk_member_email`) — 동시 가입 중복은 409로 변환. 기존 DB에는
  `backend/scripts/migration/member-email-unique-index-runbook.sql` 수동 적용 필요(ddl-auto는 미보장).

**이메일 인증 (가입 필수)** (`/api/v1/auth`)
- `POST /email/send-code` — 인증코드 발송. 60초 쿨다운(`AUTH_003`, 429)이 가입 여부 판별보다 먼저 적용되고,
  응답은 항상 200(기가입 이메일은 안내 메일 발송).
- `POST /email/verify-code` — 코드 검증(`AUTH_004`/`AUTH_005`). 성공 시 30분간 가입 가능.
- 가입(`POST /members/signup`)은 인증 플래그가 없으면 `MEMBER_006`(400)로 거부하고, 성공 시 플래그를 소비한다.
- 이메일은 전 구간 trim+소문자 정규화(Redis 키/DB 저장 정합). 코드: SecureRandom 8자(I/O/0/1 제외), TTL 5분.
  Redis 키는 3종 — `{prefix}:auth:emailVerificationCode:{email}` (발급 코드, TTL 5분),
  `{prefix}:auth:emailVerificationCooldown:{email}` (재발송 쿨다운 60초),
  `{prefix}:auth:emailVerified:{email}` (인증 완료 플래그, 30분).
- 발송: `spring.mail.*`(SMTP, env `MAIL_HOST/PORT/USERNAME/PASSWORD`) + `authMailTaskExecutor` 비동기,
  로그에는 이메일을 마스킹해 남긴다. 자격증명 미설정이어도 기동은 가능하며 발송 시점에만 실패한다.
  **배포 전 Vault dev/prod secret에 MAIL_* 키 추가 필요.**
- 후속 권장: send-code/login의 IP 기반 rate limit(게이트웨이), 회원 단위 revocation 마커.

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
