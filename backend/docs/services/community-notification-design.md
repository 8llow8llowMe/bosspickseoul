# 커뮤니티 알림 설계 (이슈 #474)

## 1. 목적·범위

- 커뮤니티 재방문 동기를 만든다. FE 개편 제안서(`frontend/docs/superpowers/specs/2026-10-01-community-ux-renewal.md` §7)가
  「알림(내 글에 댓글)」을 BE 가 있어야 하는 것으로 지목했고 지금 FE 대안은 없다.
- 대상 알림은 두 가지다 — 「내 글에 댓글이 달렸다」, 「내 댓글에 답글이 달렸다」. 좋아요 알림은 범위 밖이다(§5-3).
- 이 문서는 설계와 1차 범위 확정까지다. 구현은 §12 의 후속 이슈로 나눈다.
- 1차 범위 = **community-service 안에 알림을 저장하고, 목록·안 읽은 수·읽음 처리 API 를 제공하고, 보관 정리를 붙인다.**
  푸시(FCM)는 1차에서 뺀다(§11).

## 2. 현재 구조와 제약

실제 코드로 확인한 전제다. 문서만으로 결론 내지 않았다.

- 댓글 작성 흐름: `CommunityCommentWebController.createComment`(`@PreAuthorize("isAuthenticated()")`) →
  `CommunityCommentWebFacade.createComment` → `CommunityCommandProcessor.createComment`(`@Transactional`).
  Processor 가 부모 댓글을 3중 검증(`validateParentComment`: 게시글 소속·최상위·ACTIVE)하고 Snowflake ID 로 저장한 뒤
  `incrementCommentCountIfActive` 한다.
- **Facade `createComment` 에는 트랜잭션이 없다.** 응답 조립(`toCommentsResponse`)이 auth-service Feign 호출
  (`CommunityWriterSummaryProcessor`)을 포함하기 때문이다. 외부 I/O 를 포함하는 유스케이스는 Facade 가 아니라 Processor 에
  트랜잭션을 둔다는 규칙(`architecture-guide.md` §3)이 이미 적용돼 있다. 알림 설계는 이 경계를 깨지 않아야 한다.
- `CommunityPost`·`CommunityComment` 도메인에 작성자 `memberId` 가 있고, 부모 댓글은 `parentCommentId`(raw FK)로만 이어진다.
  수신자 판정에 필요한 정보는 이미 Processor 손 안에 있다.
- 소프트 삭제 두 경로 — 작성자 삭제 `CommunityCommandProcessor.deleteComment`, 모더레이션 숨김
  `ModerationCommandProcessor.hideTarget`. 둘 다 `deleteIfActive`(ACTIVE → DELETED 조건부 UPDATE)다.
  하드 삭제는 `CommunityCleanupScheduler`(`app.cleanup.community.enabled`, 기본 false, cron 04:40, 보존 30일, 배치 500)가 한다.
- 메시징 인프라: community-service 에는 Kafka·Redis·`@EnableAsync`·Spring `ApplicationEventPublisher` 어느 것도 없다
  (`build.gradle` 의존은 common/persistence/security/storage-core + JPA/Feign/QueryDSL 뿐). Kafka 는 commercial-service
  `ranking` 에만(`RANKING_ENABLED` 기본 false), Redis pub/sub 은 ai-service SSE 에만 있다. 백엔드 전체에서
  `@TransactionalEventListener`·outbox 선례는 없다. 커밋 이후 실행 선례는 storage-core
  `ObjectStorageClient.deleteAfterCommit` 의 `TransactionSynchronizationManager` 하나다.
- 회원 탈퇴: `MemberWebFacade.withdraw` 는 auth DB 마스킹 + 전 세션 무효화 + 프로필 객체 삭제로 끝난다.
  **다른 서비스로 이벤트를 보내지 않는다.** 정책은 「탈퇴 시 타 서비스 데이터는 보존」이고,
  `GET /api/v1/members/summaries` 가 탈퇴 회원을 닉네임 `"탈퇴회원"` 으로 돌려준다(`services/auth-service.md`).
- ID: `SnowflakeIdGenerator.generateId()` 를 Processor 가 호출해 `@Id Long id` 에 직접 넣는다. 응답은 `ResponseId.of` 로 String.
- 게이트웨이: `/api/v1/community/**`·`/api/v1/moderation/**` 가 community-service 로 간다. 리소스 서버는
  `anyRequest().permitAll()` + 메서드 `@PreAuthorize` 구조다.
- 에러코드: 도메인 다음 빈 번호 `COMMUNITY_017`, 검증 다음 빈 번호 `COMMUNITY_123`(`117` 은 타입 불일치, `118~122` 사용 중).
  조회 개수 검증은 기존 `COMMUNITY_119`(1~50)를 그대로 쓴다. 같은 브랜치의 #470·#473 이 이 번호를 먼저 쓰면
  구현 시점의 다음 빈 번호로 옮긴다.
- FE: `firebase ^12.19.0` 의존이 있지만 `src/lib/firebase-messaging.ts` 는 V1 채팅용이다. 호출하는 `/firebase/message/**` 는
  V2 BE 에 없고(`frontend/docs/features/chatting/chatting.md` 「미제공」), `public/firebase-messaging-sw.js` 는 클릭 시
  `/chatting/list` 로 고정돼 있다. BE 어디에도 firebase-admin 의존·토큰 저장소가 없다.
- FE → BE 는 BFF 캐치올 `frontend/app/api/bff/[...path]/route.ts` 를 지난다. 새 경로를 추가해도 BFF 변경은 없다.

## 3. 결정 요약

| 항목 | 결정 | 한 줄 근거 |
|------|------|-----------|
| 생성 위치 | community-service 안에서 직접 저장 | 소비자가 자신뿐이고 브로커·새 서비스 근거가 없다. 서비스 6종 고정 |
| 트랜잭션 | 댓글 커밋 **뒤** 별도 트랜잭션(`REQUIRES_NEW`), 실패는 Facade 가 WARN 으로 격리 | 알림은 부가 기능. 알림 때문에 댓글이 500 이 되면 안 된다 |
| 묶음 | `(수신자, 종류, 대상)` 당 **안 읽은 묶음 행 1개**. 새 이벤트는 그 행을 갱신, 읽은 뒤 이벤트는 새 행 | 「내 글에 새 댓글 3개」 한 줄. 유니크 제약으로 중복 행 방어 |
| 저장 모델 | `community_notification` 단일 테이블 | 이벤트 원장은 필요 없다. 묶음 행이 곧 사용자가 보는 단위 |
| 목록 커서 | `(lastEventAt, lastNotificationId)` 복합, `last_event_at DESC, id DESC` | 갱신된 묶음이 위로 올라와야 한다. 인기순 `(likeCount, id)` 선례 |
| API | `GET /api/v1/community/notifications`, `GET …/unread-count`, `PATCH …/{id}/read`, `PATCH …/read` | 기존 게이트웨이 라우트 안. 전부 인증 필수 |
| 메시지 문구 | BE 는 저장하지 않고 FE 가 종류·닉네임·제목으로 조립 | 닉네임 스냅샷을 소유하지 않는 기존 원칙(auth 실조회·탈퇴 마스킹) |
| 보관 | `last_event_at` 기준 90일 뒤 하드 삭제. 게시글 하드 삭제 때 같이 삭제 | 기존 정리 스케줄러에 작업 하나 추가 |
| 탈퇴·삭제·숨김 | 쓰기 시점에 손대지 않고 **조회 시점 강등**(`targetAvailable=false`, 제목·미리보기 null) | auth 가 탈퇴 이벤트를 주지 않는다. 신고 목록의 「대상만 사라짐」 처리와 같은 정책 |
| 푸시(FCM) | **1차 제외.** 2차는 별도 설계 이슈. 토큰·발송은 auth-service 가 맡는 안을 제안 | BE 에 FCM 기반이 전혀 없고 FE 코드는 레거시 채팅용 |
| 좋아요 알림 | 범위 밖. enum 에 미리 넣지 않는다 | 토글 노이즈·Facade 트랜잭션 구조 문제가 별도 설계를 요구 |

## 4. 대안 비교

### 4-1. 알림을 어디서 만드나

| 안 | 내용 | 비용·위험 | 되돌리기 |
|----|------|----------|---------|
| **A. community-service 직접 저장 (권장)** | 댓글 Processor 가 커밋한 뒤 같은 서비스 안 알림 Processor 가 저장 | 새 테이블 1개, 새 컨트롤러 1개. 외부 의존 없음 | 쉬움 — 테이블·클래스 제거 |
| B. 이벤트 → 별도 알림 서비스 | Kafka 로 `CommentCreated` 발행, 알림 서비스가 소비·저장 | 서비스 6종 고정 위배. community 에 Kafka 의존 추가, 브로커 운영. 소비자가 하나뿐이라 분리 이득 없음 | 어려움 |
| C. auth-service 가 저장 | 알림은 회원 소유 데이터라는 이유 | auth 가 게시글·댓글 개념을 알아야 한다. 댓글 작성 경로에 Feign 쓰기 호출이 들어가 가용성이 묶인다 | 중간 |

A 를 고른다. 다른 소비자(통계·운영 알림 등)가 생기거나 알림 종류가 서비스 경계를 넘을 때 B 를 다시 연다.

### 4-2. 댓글 트랜잭션과의 결합

| 안 | 알림 실패 시 | 비용·위험 |
|----|-------------|----------|
| a. 같은 트랜잭션 | 댓글도 롤백 → 사용자 500 | 가장 단순하지만 묶음 갱신 경합(유니크 위반)이 **댓글 작성을 실패시킨다** |
| **b. 댓글 커밋 뒤 별도 트랜잭션, Facade 가 실패 격리 (권장)** | 댓글 유지, 알림만 유실(WARN + 지표) | 프로세스가 두 트랜잭션 사이에 죽으면 알림 유실. 알림은 best-effort 라 허용 |
| c. `TransactionSynchronization.afterCommit` / `@TransactionalEventListener` | b 와 같음 | afterCommit 안의 DB 쓰기는 `REQUIRES_NEW` 가 필요하고 예외가 `commit()` 호출자로 새어 나간다. 테스트에 트랜잭션 인프라가 필요. 선례는 storage-core 의 파일 삭제뿐 |
| d. Outbox | 유실 없음 | 테이블·폴러·재시도. 소비자가 자신뿐인 지금 과하다 |

b 를 고른다. Facade `createComment` 가 이미 트랜잭션이 없으므로(§2) 「Processor 가 커밋한 뒤 다음 Processor 를 부른다」는
순서가 코드에 그대로 드러난다. 알림 Processor 는 `REQUIRES_NEW` 로 선언해, 누군가 Facade 에 `@Transactional` 을 붙여도
알림 실패가 댓글 트랜잭션을 rollback-only 로 만들지 못하게 한다. c 는 좋아요 알림처럼 **Facade 가 트랜잭션을 가진 경로**
(`CommunityPostWebFacade.togglePostLike` 는 `@Transactional`)에 알림을 붙일 때 다시 검토한다.

### 4-3. 묶음 모델

| 안 | 내용 | 평가 |
|----|------|------|
| 이벤트 행 + 조회 시 집계 | 이벤트마다 행, 목록에서 group by | 읽음 상태를 이벤트마다 관리해야 하고 집계 쿼리가 커서 페이징과 충돌 |
| **수신자별 묶음 행 (권장)** | 안 읽은 묶음 1행을 갱신 | 쓰기 1건·조회 단순. 「안 읽은 묶음 유일」을 유니크 제약으로 보장 |

### 4-4. 목록 커서

| 안 | 평가 |
|----|------|
| `id` 단일 | 묶음이 갱신돼도 생성 시점 자리에 머문다. 5일 전 글에 오늘 댓글이 와도 아래에 묻힌다 |
| **`(last_event_at, id)` 복합 (권장)** | 갱신된 묶음이 위로 온다. 인기순 `(likeCount, id)` 복합 커서 선례. 인덱스 `(recipient, last_event_at, id)` |
| 삭제 후 재삽입으로 새 id | id 가 바뀌어 FE 가 들고 있던 읽음 대상이 사라진다 |

## 5. 알림 종류와 수신자 규칙

### 5-1. 종류

`domain/enums/CommunityNotificationType implements CodeNameDescribable` — 응답은 `toMetadata()` 로 `{code, name, description}`
(`coding-conventions.md` §11).

| code | displayName | description | 묶음 기준(subject) |
|------|-------------|-------------|------------------|
| `COMMENT_ON_POST` | 내 글에 댓글 | 내가 쓴 글에 새 댓글이 달렸습니다. | `POST` : postId |
| `REPLY_ON_COMMENT` | 내 댓글에 답글 | 내가 쓴 댓글에 답글이 달렸습니다. | `COMMENT` : parentCommentId |

`domain/enums/CommunityNotificationSubjectKind` — `POST`, `COMMENT`. 신고의 `CommunityReportTargetKind` 를 재사용하지 않는다
(의미가 다르고, 신고 enum 변경이 알림에 번지면 안 된다).

### 5-2. 수신자 판정 (행위자 A, 글쓴이 P, 부모 댓글 작성자 C)

| 상황 | 수신자 | 종류 | 비고 |
|------|--------|------|------|
| 최상위 댓글, A ≠ P | P | `COMMENT_ON_POST` | |
| 최상위 댓글, A = P | 없음 | | 자기 글에 자기 댓글 |
| 답글, A ≠ C | C | `REPLY_ON_COMMENT` | |
| 답글, A = C | C 제외 | | 자기 댓글에 자기 답글 |
| 답글, A ≠ P 이고 P ≠ C | P | `COMMENT_ON_POST` | 글쓴이는 자기 글의 대화 전체를 받는다. 묶음이라 알림 수가 늘지 않는다 |
| 답글, P = C | P(=C) 에게 `REPLY_ON_COMMENT` 1건만 | | 같은 사람에게 두 종류를 보내지 않는다 |
| 답글, A = P | P 제외, C 는 위 규칙 | | |

이 표는 `CommunityNotificationCommandProcessorTest` 가 전수 고정한다.

### 5-3. 범위 밖

- 좋아요(`LIKE_ON_POST`/`LIKE_ON_COMMENT`): 토글이라 등록·취소 반복이 알림 churn 을 만들고, 토글 Facade 가 트랜잭션을 가져
  §4-2 의 c 가 필요하다. enum 에 미리 넣지 않는다 — 쓰지 않는 값이 Swagger 에 노출된다.
- 멘션·팔로우·운영 공지: 요구 없음.

### 5-4. 묶음 규칙

- 키 = `(recipient_member_id, notification_type, subject_kind, subject_id)`.
- 새 이벤트가 오면 **안 읽은 묶음 행**이 있는지 조건부 UPDATE 로 먼저 시도한다 —
  `event_count + 1`, `last_actor_member_id`, `last_source_comment_id`, `last_event_at` 갱신. 0건이면 INSERT.
- 읽은(`read_at` 있음) 묶음은 더 갱신하지 않는다. 그 뒤 이벤트는 새 묶음이 된다.
- `event_count` 는 **댓글 수**다(행위자 distinct 수가 아니다). FE 문구는 「'제목' 글에 새 댓글 3개 — 최근 길동님」처럼
  마지막 행위자 + 건수로 쓴다.
- 동시 INSERT 경합은 유니크 제약(§6)이 막는다. 진 쪽은 `DataIntegrityViolationException` 으로 Facade 까지 올라가 WARN 으로
  끝난다 — 묶음 건수가 1 적게 남지만 알림 행 자체는 이긴 쪽이 만들어 두었다. 정확한 건수가 요구되면 UPDATE 1회 재시도를 붙인다.

## 6. 저장 모델 (DDL 초안)

테이블 `community_notification`. dev 는 `ddl-auto: update` 가 만들고, prod 는 런북
`backend/scripts/migration/community-notification-table-runbook.sql` 로 수동 적용한다(기존 `community-post-*-runbook.sql` 관례).

```sql
CREATE TABLE community_notification (
  id                     BIGINT      NOT NULL COMMENT '알림 아이디 (Snowflake)',
  recipient_member_id    BIGINT      NOT NULL COMMENT '수신자 회원 아이디 (FK: member.id)',
  notification_type      VARCHAR(30) NOT NULL COMMENT '알림 종류 (COMMENT_ON_POST / REPLY_ON_COMMENT)',
  subject_kind           VARCHAR(20) NOT NULL COMMENT '묶음 기준 대상 종류 (POST / COMMENT)',
  subject_id             BIGINT      NOT NULL COMMENT '묶음 기준 대상 아이디 (FK: community_post.id 또는 community_comment.id, subject_kind 에 따라 분기)',
  post_id                BIGINT      NOT NULL COMMENT '게시글 아이디 (FK: community_post.id) — 딥링크·정리용',
  last_source_comment_id BIGINT      NOT NULL COMMENT '마지막 유발 댓글 아이디 (FK: community_comment.id)',
  last_actor_member_id   BIGINT      NOT NULL COMMENT '마지막 행위자 회원 아이디 (FK: member.id)',
  event_count            INT         NOT NULL DEFAULT 1 COMMENT '묶인 댓글 수',
  unread_marker          TINYINT     NULL COMMENT '안 읽음 표식. 1=안 읽음, NULL=읽음. 안 읽은 묶음 유일성(유니크) 보장용',
  read_at                DATETIME(6) NULL COMMENT '읽은 시각',
  last_event_at          DATETIME(6) NOT NULL COMMENT '마지막 이벤트 시각 (목록 정렬·커서)',
  created_at             DATETIME(6) NOT NULL COMMENT '생성 시각',
  updated_at             DATETIME(6) NOT NULL COMMENT '수정 시각',
  PRIMARY KEY (id),
  -- 안 읽은 묶음은 키당 1행. 읽은 행은 unread_marker 가 NULL 이라 유니크에 걸리지 않는다 (MySQL 은 NULL 중복 허용).
  UNIQUE KEY uk_community_notification_recipient_type_subject_unread
    (recipient_member_id, notification_type, subject_kind, subject_id, unread_marker),
  -- 내 알림 목록: where recipient + order by last_event_at desc, id desc
  KEY idx_community_notification_recipient_member_id_last_event_at_id (recipient_member_id, last_event_at, id),
  -- 안 읽은 수 / 안 읽은 것만 목록
  KEY idx_community_notification_recipient_unread_last_event_at_id (recipient_member_id, unread_marker, last_event_at, id),
  -- 보관 정리
  KEY idx_community_notification_last_event_at (last_event_at)
) COMMENT = '커뮤니티 알림 (수신자별 묶음 행)';
```

- 인덱스 이름은 `coding-conventions.md` §9-5 규칙. 유니크·두 번째 인덱스는 64자 제한 때문에 축약했다
  (`recipient_type_subject_unread`, `recipient_unread_…`). 엔티티 `@Index` 에 같은 이름을 쓴다.
- `unread_marker` 는 「읽으면 NULL」인 nullable 컬럼이다. §9-2 는 boolean 을 primitive 로 두라고 하지만 이 컬럼의 존재 이유가
  유니크 제약이라 `Boolean`(TRUE / null) 예외를 둔다. 엔티티 `@Comment` 와 이 문서에 이유를 남긴다.
- 연관관계 어노테이션 없음(§9-1). FK 는 전부 raw 컬럼이고 `@Comment` 에 `(FK: …)` 표기.
- 도메인 record `domain/model/CommunityNotification(long id, long recipientMemberId, CommunityNotificationType type,
  CommunityNotificationSubjectKind subjectKind, long subjectId, long postId, long lastSourceCommentId, long lastActorMemberId,
  int eventCount, boolean unread, LocalDateTime readAt, LocalDateTime lastEventAt, LocalDateTime createdAt, LocalDateTime updatedAt)`.
  엔티티 ↔ 도메인은 MapStruct(`CommunityNotificationMapper`), `Boolean unreadMarker` ↔ `boolean unread` 는 매퍼에 명시.

### 6-1. 쿼리 (`coding-conventions.md` §9-6 순서대로)

| 용도 | 수단 |
|------|------|
| 묶음 갱신 | 정적 JPQL `@Modifying(clearAutomatically = true, flushAutomatically = true)` — `update … set eventCount = eventCount + 1, lastActorMemberId, lastSourceCommentId, lastEventAt, updatedAt where recipientMemberId = ? and notificationType = ? and subjectKind = ? and subjectId = ? and unreadMarker = true` |
| 단건 읽음 | 정적 JPQL — `update … set readAt = :now, unreadMarker = null, updatedAt = :now where id = ? and recipientMemberId = ? and unreadMarker = true` |
| 전체 읽음 | 정적 JPQL — 위에서 `id` 조건 제거 |
| 안 읽은 수 | 파생 쿼리 `countByRecipientMemberIdAndUnreadMarkerTrue(long memberId)` |
| 목록(unreadOnly 동적 + 복합 커서) | QueryDSL `CommunityNotificationCustomRepositoryImpl` — `limit(size + 1)`, 조건 `lastEventAt < :cursorAt or (lastEventAt = :cursorAt and id < :cursorId)` |
| 보관 정리 | 파생 쿼리 `findByLastEventAtBefore(LocalDateTime, Limit)` → `deleteAll` (기존 `CommunityCleanupRepositoryAdapter` 와 같은 모양), `deleteByPostIdIn(Collection<Long>)` |

## 7. API 초안

경로 접두 `/api/v1/community/notifications` — 기존 게이트웨이 라우트(`/api/v1/community/**`) 안이라 라우트 추가 없음.
전부 `@PreAuthorize("isAuthenticated()")`, `@SecurityRequirement(name = "bearerAuth")`, 응답 `ResponseEntity<Response<T>>`.
식별자는 전부 `String`(`ResponseId.of`).

| Method | Path | 설명 | 응답 |
|--------|------|------|------|
| GET | `/` | 내 알림 목록. `unreadOnly`(기본 false), `lastNotificationId`(기본 0), `lastEventAt`(ISO-8601, `lastNotificationId != 0` 일 때 필수), `size`(기본 20, 1~50) | `CommunityNotificationListResponse` |
| GET | `/unread-count` | 안 읽은 알림 수 | `CommunityNotificationUnreadCountResponse { unreadCount: long }` |
| PATCH | `/{notificationId}/read` | 단건 읽음. 멱등(이미 읽었어도 200) | `CommunityNotificationReadResponse { notificationId, read: true }` |
| PATCH | `/read` | 내 안 읽은 알림 전체 읽음. 멱등 | `CommunityNotificationReadAllResponse { updatedCount: long }` |

### 7-1. 목록 응답

```json
{
  "notifications": {
    "contents": [
      {
        "notificationId": "7312345678901234567",
        "notificationType": { "code": "COMMENT_ON_POST", "name": "내 글에 댓글", "description": "내가 쓴 글에 새 댓글이 달렸습니다." },
        "postId": "7312000000000000001",
        "postTitle": "강남역 상권 어떤가요",
        "targetAvailable": true,
        "commentId": "7312000000000000099",
        "commentPreview": "저도 같은 고민이었는데 ...",
        "actorMemberId": "12",
        "actorNickname": "길동",
        "actorProfileImageUrl": null,
        "eventCount": 3,
        "read": false,
        "lastEventAt": "2026-10-02T10:15:30.123456",
        "createdAt": "2026-10-01T22:03:11.000001"
      }
    ],
    "hasNext": true
  }
}
```

- `notifications` 는 `SliceResponse<CommunityNotificationItem>` — `CommunityPostListResponse.posts` 와 같은 모양.
- 다음 페이지 커서는 마지막 항목의 `lastEventAt` + `notificationId` 를 그대로 되돌려 보낸다.
- `postTitle`·`commentPreview`(최대 100자, 모더레이션 `targetPreview` 와 동일)는 대상이 ACTIVE 가 아니면 `null`.
  `targetAvailable` 은 게시글이 ACTIVE 인지 — FE 가 딥링크를 끄고 「삭제된 글」로 표시하는 기준.
- `actorNickname`·`actorProfileImageUrl` 은 auth 실조회(`CommunityWriterSummaryProcessor`)다. 탈퇴 회원은 `"탈퇴회원"`,
  auth 장애 시 `null` 강등 — 기존 작성자 표시 계약과 동일. FE 는 null 이면 대체 문구.
- 메시지 본문은 내려주지 않는다. FE 가 `notificationType` + `actorNickname` + `eventCount` + `postTitle` 로 조립한다.

### 7-2. 에러코드 (추가분)

| 코드 | 이름 | HttpStatus | 상황 |
|------|------|-----------|------|
| `COMMUNITY_017` | `NOTIFICATION_NOT_FOUND` | 404 | 없는 알림 **또는 남의 알림**(존재 노출 차단, `api-design-guide.md` §7 과 같은 정책) |
| `COMMUNITY_018` | `INVALID_NOTIFICATION_CURSOR` | 400 | `lastNotificationId != 0` 인데 `lastEventAt` 이 없다 |

`size` 범위는 기존 `COMMUNITY_119`, 파라미터 형식 오류는 기존 `COMMUNITY_117`. 새 Bean Validation 필드 코드는 없다.
번호는 초안이다 — 구현 시점에 `CommunityErrorCode` 의 다음 빈 번호를 쓴다(§2).

### 7-3. 헥사고날 배치

패키지 루트 `backend/service/community-service/src/main/java/com/followfollowme/bosspickseoul/domainlayer/community/`.
별도 컨텍스트를 만들지 않고 `community` 컨텍스트 안에 `CommunityNotification*` 접두로 둔다 — 게시글·댓글 포트,
`CommunityErrorCode`, `CommunityExceptionHandler`(advice 범위 `domainlayer`)를 그대로 쓰기 위해서다.

| 계층 | 신규 | 변경 |
|------|------|------|
| `domain/enums` | `CommunityNotificationType`, `CommunityNotificationSubjectKind` | |
| `domain/model` | `CommunityNotification` | |
| `application/exception` | | `CommunityErrorCode` 에 알림 미존재·커서 오류 2종 |
| `application/model` | `CommunityNotificationCriteria(memberId, unreadOnly, lastEventAt, lastNotificationId, size)`, `CommunityNotificationPage(SliceQueryResult<CommunityNotification> slice, Map<Long, CommunityPost> postsById, Map<Long, CommunityComment> commentsById)` | |
| `application/mapper` | `CommunityNotificationMapper`(MapStruct) | |
| `application/port/out` | `CommunityNotificationRepositoryPort` — `boolean appendToUnreadBundle(…)`, `CommunityNotification save(…)`, `SliceQueryResult<CommunityNotification> getNotifications(criteria)`, `long countUnread(memberId)`, `Optional<CommunityNotification> findById(id)`, `boolean markReadIfUnread(id, memberId, now)`, `long markAllRead(memberId, now)` | `CommunityCleanupRepositoryPort` 에 `int hardDeleteExpiredNotifications(threshold, limit)`; `hardDeleteExpiredPosts` 가 알림도 지운다 |
| `application/port/in` | `CommunityNotificationWebUseCase` | |
| `application/service/processor` | `CommunityNotificationCommandProcessor`(`recordCommentCreated` REQUIRES_NEW, `markRead`, `markAllRead`), `CommunityNotificationQueryProcessor`(`getNotifications` readOnly — 목록 + 게시글·댓글 `findAllByIds` 벌크 2회, `countUnread`) | `CommunityCleanupProcessor.cleanupExpiredNotifications` |
| `application/service` | `CommunityNotificationWebFacade` | `CommunityCommentWebFacade.createComment` 에 알림 기록 호출 1줄 + 격리 헬퍼 |
| `adapter/in/web/controller` | `CommunityNotificationWebController` | |
| `adapter/in/web/dto/response` | `CommunityNotificationListResponse`, `CommunityNotificationItem`, `CommunityNotificationUnreadCountResponse`, `CommunityNotificationReadResponse`, `CommunityNotificationReadAllResponse` | |
| `adapter/in/web/presenter` | `CommunityNotificationPresenter` | |
| `adapter/in/scheduler` | | `CommunityCleanupScheduler` 에 `runQuietly("만료 알림", …)` 추가 |
| `adapter/out/persistence` | `entity/CommunityNotificationEntity`, `repository/CommunityNotificationRepository`, `repository/custom/CommunityNotificationCustomRepository(+Impl)`, `CommunityNotificationRepositoryAdapter` | `CommunityCleanupRepositoryAdapter` |
| `global/properties` | | `CommunityCleanupProperties` 에 `notificationRetentionDays` |
| `resources/application.yml` | | `app.cleanup.community.notification-retention-days: ${CLEANUP_COMMUNITY_NOTIFICATION_RETENTION_DAYS:90}` |

규칙 준수 포인트: Facade 는 out-port 를 직접 주입하지 않는다(`ModerationWebFacade` 선례). 벌크 조회·맵 구성은 Query Processor
책임(§9-7), Facade 는 Feign(작성자 요약)만 트랜잭션 밖에서 덧붙이고 Presenter 로 넘긴다. Presenter 는 `Info/모델 → Response`
변환만 한다.

**조회 시점 강등(§10)의 판단 위치는 Query Processor 다.** 게시글·댓글 `findAllByIds` 는 DELETED 행도 돌려주므로, Processor 가
`CommunityNotificationPage` 의 `postsById`·`commentsById` 에 **ACTIVE 인 것만** 넣는다. Presenter 는 맵에 키가 없으면
`targetAvailable=false`·`postTitle=null`·`commentPreview=null` 로 두는 null 확인만 하고 `status` 를 보지 않는다 — 모더레이션 목록의
`ModerationReportTargets`(「키가 없으면 미리보기 없음」)와 같은 방식이다. Presenter 가 `status == ACTIVE` 를 판단하면 비즈니스 규칙이
Presenter 로 새어 나간다.

## 8. 생성 흐름과 트랜잭션

```text
CommunityCommentWebFacade.createComment            (트랜잭션 없음 — 유지)
 ├─ communityQueryProcessor.getPost(postId)          ACTIVE 검증
 ├─ communityCommandProcessor.createComment(...)     @Transactional  ← 댓글 저장 + commentCount, 여기서 커밋
 ├─ recordNotificationQuietly(post, comment)         try { communityNotificationCommandProcessor.recordCommentCreated(post, comment) }
 │                                                   catch (RuntimeException e) { log.warn("[community-notification] record failed ..."); counter }
 └─ toCommentsResponse(getComments(postId))          auth Feign (기존)
```

`CommunityNotificationCommandProcessor.recordCommentCreated(CommunityPost post, CommunityComment comment)`:

1. `@Transactional(propagation = Propagation.REQUIRES_NEW)`. 호출 시점에 댓글은 이미 커밋돼 있다.
2. `comment.parentCommentId()` 가 있으면 `communityCommentRepositoryPort.findById` 로 부모를 1건 다시 읽는다
   (PK 조회 1회. `CommunityCommandProcessor.validateParentComment` 가 읽은 값은 private 라 재조회가 결합을 안 만든다).
   부모가 없거나 ACTIVE 가 아니면 답글 알림은 건너뛴다(그 사이 삭제된 경우).
3. §5-2 표대로 수신자 0~2명을 정한다.
4. 수신자마다 `appendToUnreadBundle` → 0건이면 `save(new CommunityNotification(snowflakeIdGenerator.generateId(), …, eventCount=1,
   unread=true, lastEventAt=comment.createdAt(), …))`.
5. 결과를 지표로 남긴다 — `community_notification_record_total{type, outcome=created|bundled|skipped|failed}`.

실패 영향:

- 알림 INSERT/UPDATE 실패(유니크 경합·DB 일시 오류) → Facade 가 삼키고 WARN. **댓글은 이미 커밋돼 있어 영향 없다.**
  사용자 응답은 평소와 같은 댓글 목록이다.
- 댓글 트랜잭션 실패 → 알림 Processor 가 호출되지 않는다. 고아 알림은 생기지 않는다.
- 불변 조건: **`CommunityCommentWebFacade.createComment` 에 `@Transactional` 을 두지 않는다.** 이미 Feign 호출 때문에 그래야 하고
  (§2), 두면 `REQUIRES_NEW` 알림이 댓글보다 먼저 커밋돼 댓글 롤백 시 고아 알림이 남는다. Facade 테스트가
  「알림 Processor 가 예외를 던져도 댓글 응답은 성공」을 고정한다.

## 9. 정리·보관

- 보관 기간: `last_event_at` 기준 **90일**(`CLEANUP_COMMUNITY_NOTIFICATION_RETENTION_DAYS`, 기본 90). 읽음 여부로 나누지 않는다 —
  단순함이 우선이고, 안 읽은 채 90일이면 더 보여 줄 가치가 없다.
- 실행: 기존 `CommunityCleanupScheduler.cleanup()` 에 네 번째 `runQuietly` 로 붙는다. 같은 `enabled`·`cron`·`batch-size` 를 쓴다
  (단일 인스턴스 전제도 그대로. 인스턴스를 늘릴 때의 분산 락은 기존 과제와 같다).
- 게시글 하드 삭제(`hardDeleteExpiredPosts`) 때 `deleteByPostIdIn(postIds)` 를 같은 트랜잭션에서 수행해 댓글·이미지와 함께 지운다.
  댓글 하드 삭제 때는 지우지 않는다 — 묶음은 글 단위로 의미가 남고 `commentPreview` 만 null 이 된다.
- 지표: 기존 로그 `{} 정리 완료. affected={}` 에 「만료 알림」 라벨이 추가된다.

## 10. 탈퇴·삭제·숨김 처리

원칙: **쓰기 시점에 알림을 손대지 않고 조회 시점에 강등한다.** auth 가 탈퇴 이벤트를 보내지 않고(§2), 모더레이션 목록도
「신고는 남고 대상만 사라진다」로 처리하는 것과 같은 정책이다.

| 상황 | 알림 행 | 조회 응답 | 비고 |
|------|---------|----------|------|
| 수신자가 탈퇴 | 그대로 | 조회 불가 — 탈퇴 즉시 전 세션 무효화, 로그인 불가 | 90일 정리로 소멸. auth 탈퇴 이벤트가 생기면 즉시 삭제로 바꿀 수 있는 자리(`deleteByRecipientMemberId`) |
| 행위자가 탈퇴 | 그대로 | `actorNickname="탈퇴회원"`, 프로필 null | auth summaries 기존 계약 |
| 게시글 작성자 삭제(DELETED) | 그대로 | `targetAvailable=false`, `postTitle=null`, `commentPreview=null` | FE 는 딥링크를 끄고 「삭제된 글」 표기 |
| 게시글 모더레이션 숨김(APPROVE_AND_HIDE → DELETED) | 그대로 | 위와 같음 | `ModerationCommandProcessor` 변경 없음 |
| 게시글 하드 삭제(30일 후) | **삭제** | 행 없음 | §9 |
| 댓글 작성자 삭제 / 모더레이션 숨김 | 그대로 | `commentPreview=null`, 글은 그대로 연결 | 묶음의 다른 댓글은 살아 있을 수 있다 |
| 신고 DISMISS | 그대로 | 변화 없음 | |
| 새 댓글 시점에 부모 댓글이 이미 삭제 | 생성 안 함(답글 알림만) | | §8 2번 |

2차 후보(이번 범위 밖): 모더레이션이 숨긴 댓글이 **유일한** 유발 댓글인 안 읽은 묶음(`event_count = 1 and
last_source_comment_id = ?`)을 선제 삭제해, 스팸 댓글이 수신자를 빈 스레드로 유인하지 않게 한다. 쓰기 경로 2곳
(`deleteComment`, `hideTarget`)에 DELETE 1문이 추가되는 변경이라 1차에서 뺐다.

## 11. 푸시(FCM) 결정

**1차에서 제외한다.** 근거:

- BE 에 FCM 기반이 전혀 없다 — firebase-admin 의존, 토큰 저장소, 발송 경로, Firebase 서비스 계정 비밀 어느 것도 없다.
- FE 의 Firebase 코드는 V1 채팅용이다. `/firebase/message/**` 는 BE 에 없어 이미 「미제공」으로 차단돼 있고, 서비스 워커는 클릭 시
  `/chatting/list` 로 간다. Firebase 프로젝트 ID 도 레거시 `nowdoboss` 다. 재사용이 아니라 재구축이다.
- 웹 푸시는 권한 요청 UX·토큰 수명(갱신·기기별·로그아웃·탈퇴)·발송 실패 처리·수신 동의 저장이 한 덩어리다. 인앱 종 아이콘 + 안 읽은 수
  만으로 §1 의 재방문 동기(FE 제안서 §7)는 충족된다.

2차에 넣는다면(별도 설계 이슈에서 다시 검증):

- **토큰 저장 위치 = auth-service.** 토큰은 회원×기기 데이터이고 수명이 로그인 세션과 같다. auth 는 이미 기기 세션
  (`refreshSessions`, deviceInfo)·탈퇴 시 전 세션 무효화·회원 통보 메일(`memberMailNotifyPort`)을 관리한다 — 「회원 연락 채널」 책임이
  이미 auth 에 있다. community 에 두면 푸시를 쓰려는 다음 서비스마다 토큰 테이블과 Firebase 비밀이 복제된다.
- **발송도 auth-service** 가 내부 API(`POST /api/v1/members/{memberId}/push-messages`, `@Hidden`, 내부망)로 맡는다. community 는
  알림 커밋 뒤 전용 `ThreadPoolTaskExecutor`(`communityNotificationPushTaskExecutor`, 이름 규칙 `api-design-guide.md` §7)에서
  Feign 으로 넘기고 실패는 로그만 남긴다. 서킷 인스턴스는 기존 `auth-service`.
- FE: 토큰 등록 `POST /api/v1/members/me/push-tokens`, 해제 `DELETE …/{token}`, 수신 동의는 회원 설정으로. 서비스 워커의 클릭 대상은
  페이로드의 `postId` 로 딥링크.
- 여기까지가 「auth-service 만 JWT 를 발급한다」는 고정 결정과 충돌하지 않는지(FCM 토큰은 JWT 가 아니다), auth 의 책임 비대화를
  감수할지는 열린 질문 §15 로 둔다.

## 12. 단계 계획

각 단계가 끝나도 서비스는 동작한다. PR 은 rebase merge 라 커밋마다 `[BE]`/`[FE]` prefix 를 지킨다.

| 단계 | PR | 내용 | 끝났을 때 |
|------|----|------|----------|
| 0 | `[BE] docs` | 이 문서 추가, `README.md` 목록 등재 | 설계 합의 |
| 1 | `[BE] feat` | 엔티티·포트·어댑터·매퍼·도메인 enum, `CommunityNotificationCommandProcessor.recordCommentCreated`, Facade 1줄 + 격리, 정리 배치, 런북 SQL, 테스트 | 댓글을 달면 알림 행이 쌓인다. 외부 노출 없음 |
| 2 | `[BE] feat` | Query Processor·Facade·Controller·Presenter·DTO, 에러코드 2종, Swagger, `api-reference.md`·`services/community-service.md` 갱신 | API 4종 사용 가능 |
| 3 | `[FE] feat` | 헤더 종 아이콘 + 안 읽은 수 배지(마운트·포커스·60초 폴링), 알림 목록 화면(무한 스크롤·읽음·전체 읽음·딥링크) | 사용자가 알림을 본다 |
| 4 | `[BE] docs` → `[BE] feat` | 푸시 설계 이슈(토큰 위치·동의 UX·Firebase 프로젝트 확정) → 구현 | 선택 |
| 5 | `[BE] feat` | 좋아요 알림(§4-2 c 방식), 숨김 댓글 선제 삭제(§10) | 선택 |

1·2 를 한 PR 로 합쳐도 되지만, 1 이 `CommunityCommentWebFacade`·`CommunityCleanup*` 처럼 다른 작업과 겹치는 파일을 건드리므로
작게 먼저 머지하는 편이 충돌 비용이 적다.

## 13. 호환성

- 공개 API: 추가만 있다. 기존 댓글 작성 응답·에러코드 불변. 댓글 작성 지연은 PK 조회 ≤1회 + UPDATE/INSERT ≤2건 증가.
- DB: 테이블 1개 추가. 기존 테이블 변경 없음. prod 는 런북 수동 적용(dev 는 ddl-auto).
- 게이트웨이: 변경 없음(`/api/v1/community/**`).
- FE 계약: BFF 캐치올이 그대로 전달한다. 새 타입은 `src/types/community.ts` 에 추가.
- 에러코드 대역 문서(`api-reference.md`)와 엔드포인트 수는 구현 PR 에서 갱신한다(+4종).
- 설정: `CLEANUP_COMMUNITY_NOTIFICATION_RETENTION_DAYS` 는 기본값이 있어 배포 env 추가가 필수는 아니다.

## 14. 위험과 검증

| 위험 | 영향 | 검증·완화 |
|------|------|----------|
| 묶음 갱신 경합 → 유니크 위반 | 건수 1 누락, 알림 자체는 존재 | `CommunityRepositoryMySqlConcurrencyTest` 에 「같은 글에 동시 댓글 2건 → 묶음 1행, 댓글 2건 모두 성공」 추가. 지표 `outcome=failed` 알람 후보 `increase(community_notification_record_total{outcome="failed"}[10m]) > 0` |
| Facade 에 트랜잭션이 붙어 격리가 깨짐 | 알림 실패가 댓글을 500 으로 | `CommunityCommentWebFacadeTest` — 알림 Processor 가 던져도 응답 성공. 이 문서 §8 불변 조건 |
| 커스텀 리포지터리 조건 누락(§9-6 「컴파일로 검증되지 않는다」) | unreadOnly·커서 경계 오류 | `@CommunityDataJpaTest` H2 슬라이스(이미 있다 — `community-service.md` 「JPA 슬라이스 테스트」). 커스텀 구현이 새 빈을 생성자로 받으면 `DataJpaSliceTestConfig` 에 추가한다. 커서 동률(`lastEventAt` 같고 id 다름) 케이스 포함 |
| 수신자 규칙 오류(자기 알림, 중복 수신) | 사용자 불신 | `CommunityNotificationCommandProcessorTest` 가 §5-2 표 전수 고정 |
| 목록 N+1 | 지연 | 게시글·댓글 `findAllByIds` 2회 + auth 1회로 고정. 리뷰에서 `for`/`stream` 안 Port 호출 금지(§9-7) |
| 안 읽은 수 폴링 부하 | DB count 쿼리 | `(recipient, unread_marker)` 인덱스 커버. 60초 + 포커스 시만. `http_server_requests_seconds_count{uri="/api/v1/community/notifications/unread-count"}` 로 관찰 |
| 정리 배치 다중 인스턴스 중복 | 중복 삭제 시도(멱등이라 데이터 손상 없음) | 기존 단일 인스턴스 전제 동일. 인스턴스 증설 시 분산 락 과제 |
| 로그 노출 | 없음 | 로그는 `[community-notification]` 접두 + id·코드만. 본문·닉네임은 찍지 않는다 |

## 15. 열린 질문 (FE·운영과 합의)

1. 답글이 달리면 글쓴이에게도 알릴지(현재 안: 알린다, `COMMENT_ON_POST` 묶음에 흡수).
2. 보관 90일이 적절한지. 읽은 알림을 더 짧게(예: 30일) 지울지.
3. 알림 개별 삭제(`DELETE /{id}`)가 필요한지. 1차는 읽음만 제공한다.
4. 안 읽은 수 표시 상한(`99+`)과 폴링 주기(60초 + 포커스). SSE 는 community 에 redis-core 가 없어 다중 인스턴스에서 불리하다 —
   도입 시점을 따로 정한다.
5. FE 문구 템플릿 — `eventCount` 는 댓글 수이지 사람 수가 아니다. 「'제목' 글에 새 댓글 N개 — 최근 OO님」 형태로 갈지.
6. 푸시: Firebase 프로젝트(`nowdoboss` 레거시) 재사용 여부, 토큰·발송을 auth-service 에 두는 안에 동의하는지, 수신 동의 UX·기본값.
7. 좋아요 알림 도입 여부와 토글 노이즈 규칙(예: 취소 후 재등록은 알리지 않음).
8. 모더레이션 숨김 댓글이 유발한 안 읽은 알림을 선제 삭제할지(§10 2차 후보).
9. 다중 인스턴스 전환 시 정리 배치 락 — 기존 정리 과제와 함께 결정.

## 16. 함께 고칠 문서 (구현 PR 에서)

- `backend/docs/services/community-service.md` — 「알림」 절(API·묶음 규칙·강등 정책·정리) 추가, 에러코드 표
- `backend/docs/api-reference.md` — community-service 알림 4종, 에러코드 대역, 엔드포인트 수
- `backend/docs/service-inventory.md` — Community Service 책임에 「알림」
- `backend/docs/modules.md` — community-service 주요 API 에 `/api/v1/community/notifications`
- `backend/docs/feature-status.md` — 구현 후 현황
- `backend/docs/observability-guide.md` — `community_notification_record_total`, `[community-notification]` 로그
- `frontend/docs/features/community/community.md` — 알림 진입점·목록 화면, `frontend/docs/superpowers/specs/2026-10-01-community-ux-renewal.md` §7 「알림」 행을 「BE 제공」으로
