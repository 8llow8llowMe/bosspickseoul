# 기업마당 정책 수집 운영

개발 서버의 상시 `batch-service` 는 `BATCH_DB_URL` 로 **district** 를 본다. `policy` 테이블은 **commercial** 에 있다.
새 `scheduler-service` 를 만들지 않는다. 같은 프로세스가 `COMMERCIAL_DB_URL` 을 두 번째 DataSource 로 붙인다.

- 분기 적재·영역 좌표·Quartz/`BATCH_*` 메타 → `BATCH_DB_URL` (district)
- 정책 upsert/stale-mark/purge → `COMMERCIAL_DB_URL` (commercial)

Vault 에 `COMMERCIAL_DB_URL` 은 이미 있다. `BATCH_DB_URL` 과 전역 `SPRING_PROFILES_ACTIVE` 는 바꾸지 않는다.

설계·원천 계약은 [batch-service.md](batch-service.md) 「기업마당 정책 수집」을 본다.

## 한 줄 요약

| 질문 | 답 |
| --- | --- |
| district 와 commercial 을 한 인스턴스가 같이 보나? | 예. 기본 DS 는 district, 정책 DS 는 commercial |
| 지금 개발 `batch-service` 만 재시작하면 수집되나? | 아니오. DDL + Vault 키를 넣은 뒤 재기동해야 한다 |
| 새 서비스를 만드나? | 아니오. Jenkins `batch-service-dev` 에 켠다 |
| 켜면 언제 돌아가나? | 매일 06:00(수집) / 06:30(만료) Asia/Seoul. 기동 직후 한 번은 돌지 않는다 |
| 화면은 언제 바뀌나? | 수집이 commercial `policy` 를 갱신한 뒤, commercial-service 추천 API 가 그 행을 읽으면 바뀐다 |
| 시드 14건은? | `SEED` 행은 Job 이 지우지 않는다. 기업마당 두 건만 `BIZINFO` 키로 갱신된다 |

## 매일 시나리오

```text
06:00  policyCollectJob
        1. 기업마당 API (hashtags=소상공인, 최대 20페이지)
        2. COMMERCIAL_DB_URL 의 policy 에 (source, external_id) 로 upsert
        3. 채택 건수가 직전 BIZINFO 건수의 50% 미만이거나 API 실패면
           이미 있는 행을 "원천에서 사라짐" 처리하지 않는다
        4. 게이트를 통과하면, 이번 수집에서 안 보인 BIZINFO 행만
           apply_end_at 을 어제로 둔다 → 추천 조회에서 즉시 빠진다
        SEED 행은 이 단계의 대상이 아니다

06:30  policyPurgeJob
        last_seen_at 이 30일을 넘긴 BIZINFO 행만 DELETE
        (추천에서 숨긴 뒤 유예가 지난 행)

사용자   GET /api/v1/policies 와 상권 프로필 policyRecommendations
        계약은 그대로. 최대 5건, 마감 안 지난 것만.
        업종·자치구 코드는 1차 수집이 NULL 이라 전업종·전국으로 매칭된다.
        자치구 전용 시드(강남·송파 등)가 정렬에서 먼저 나온다.
```

실패해도 화면이 한순간에 비지 않는 이유: 원천 장애나 너무 적은 건수는 stale-mark 를 생략한다. 어제까지 보이던 BIZINFO 카드가 유지된다.

## 1. 선행 DDL (스키마당 1회)

PowerShell `mysql ... < file.sql` 의 `<` 는 예약 연산자라 실패한다. Workbench에서 스키마를 고른 뒤 실행한다.

**commercial (`bosspickseoul_commercial_dev`)**

1. `backend/scripts/migration/policy-ingest-columns-runbook.sql` — `policy.source` / `external_id` / `last_seen_at`
2. `backend/service/commercial-service/src/main/resources/db/policy-seed.sql` — 시드 재적재. 식품안심업소·라이브커머스를 `BIZINFO` + `pblancId` 로 재매핑한다
3. 확인: `backend/scripts/migration/policy-ingest-verify.sql`

dev 의 commercial-service 는 `ddl-auto: update` 라 엔티티 배포만으로 컬럼이 생길 수 있다. 유니크·인덱스 이름과 시드 재매핑은 런북+시드 SQL 을 따른다.

**district (`bosspickseoul_district_dev`) — 상시 batch-service 의 `BATCH_DB_URL`**

1. `BATCH_*` 가 없으면 `backend/scripts/migration/spring-batch-schema-mysql.sql` (`IF NOT EXISTS` 가 없어 두 번 실행하면 실패한다)
2. `backend/scripts/migration/quartz-schema-mysql.sql` — `QRTZ_*`. Quartz 는 기본 DataSource 를 쓰므로 **district** 에 만든다. 앱이 만들지 않는다 (`initialize-schema: never`)
3. 확인: `backend/scripts/migration/policy-ingest-verify-district.sql`

`bosspickseoul_commercial_prod` / `bosspickseoul_district_prod` 는 같은 서버에 있다. 실행 전에 스키마 이름을 확인한다. prod 스키마 이름을 `BATCH_ALLOWED_SCHEMAS` 에 넣지 않는다.

## 2. 기업마당 키

키는 **기업마당 정책정보 개방**에서 발급한다. data.go.kr / 서울 열린데이터광장 키와 호환되지 않는다.

- 안내: https://www.bizinfo.go.kr/apiList.do
- 호출: `GET https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do?crtfcKey=...&dataType=json`

HTML 스크래핑·K-Startup·자치구 홈페이지는 1차 범위 밖이다.

## 3. 권장 운영: 기존 Jenkins `batch-service-dev`

Vault `kv/bosspickseoul/backend/dev/env` 에 **patch** 로 아래만 추가·변경한다. `put` 은 나머지를 지운다.

| 키 | 값 | 비고 |
| --- | --- | --- |
| `BATCH_POLICY_ENABLED` | `true` | 수집 Quartz 트리거 등록 |
| `BIZINFO_CRTFC_KEY` | 기업마당 `crtfcKey` | 채팅/커밋에 넣지 않는다 |
| `BATCH_ALLOWED_SCHEMAS` | `bosspickseoul_commercial_dev` | Guard 가 **commercial** URL 만 검사한다 |
| `COMMERCIAL_DB_URL` | (이미 있음) | 변경하지 않는다 |
| `BATCH_DB_URL` | district 유지 | 변경하지 않는다 |
| `SPRING_PROFILES_ACTIVE` | `dev` 유지 | 전역 값이다. `dev,scheduler` 로 바꾸지 않는다 |

DDL 을 넣은 뒤 batch-service 만 재배포한다. `scheduler` 프로파일은 필수가 아니다. `BATCH_POLICY_ENABLED=true` 이면 `dev` 프로파일에서도 Quartz 가 켜진다.

기동 직후 로그에서 확인할 것:

- `Policy ingest must use COMMERCIAL_DB_URL` / `BATCH_ALLOWED_SCHEMAS` 예외가 없다
- Quartz 가 `policyCollectTrigger` / `policyPurgeTrigger` 를 등록했다
- 프로세스가 종료하지 않는다 (`quarterly` 만 `System.exit`)

`COMMERCIAL_DB_URL` 에 `prod` 가 들어가거나 allowlist 와 다르거나 `BATCH_DB_URL` 과 같으면 기동이 거부된다. 예외 메시지에 JDBC URL 은 실리지 않는다.

### 첫 수집을 06:00 전에 보고 싶을 때

기본 cron 은 misfire 를 무시하므로, 낮에 띄워도 그날 06:00을 지나 있으면 **다음날 06:00**까지 기다린다. 스모크만 필요하면 Vault 에 잠시 넣는다.

```text
BATCH_POLICY_COLLECT_CRON=0 0/10 * * * ?
BATCH_POLICY_PURGE_CRON=0 5/10 * * * ?
```

확인이 끝나면 두 키를 비우고 다시 띄워 06:00/06:30 으로 되돌린다.

## 4. 하지 말아야 할 것

- **새 `scheduler-service` 모듈을 만들기** — Eureka/포트/Jenkins 가 늘고, 정책 수집은 여전히 batch Job 이다.
- **기존 인스턴스의 `BATCH_DB_URL` 을 commercial 로 바꾸기** — 영역 좌표 적재 대상이 바뀐다.
- **전역 `SPRING_PROFILES_ACTIVE` 를 `dev,scheduler` 로 바꾸기** — Vault 를 공유하는 다른 서비스에도 프로파일이 붙는다.
- **키 없이 `BATCH_POLICY_ENABLED=true`** — 06:00 Job 이 `POLICY_INGEST_002` 로 실패한다. stale-mark 는 하지 않는다.
- **prod 스키마를 allowlist 에 넣기** — Guard 가 `prod` 가 이름에 있으면 거부한다.
- **QRTZ_* 를 commercial 에만 만들고 district 에는 안 만들기** — 상시 인스턴스의 Quartz 는 district 를 본다.

## 5. 화면에서 보이는 것

수집 전: 시드 14건 기준. 마감이 지난 카드(예: 스마트상점 2026-09-30)는 추천에서 빠진다.

수집 후:

- 기업마당에서 받은 소상공인 공고가 commercial `policy` 에 쌓인다. 업종을 추정하지 않으므로 음식/서비스/소매 상권 모두 전국 공고가 섞일 수 있다
- 프로필은 여전히 최대 5건이다. 프론트 API 계약은 그대로다 ([FE #290](https://github.com/8llow8llowMe/bosspickseoul/issues/290))
- `detailUrl` 은 기업마당 공고 상세(`pblancId`)다
- 원천에서 사라진 공고는 그날 추천에서 사라지고, 30일 뒤 행이 삭제된다

commercial-service 를 재시작할 필요는 없다. 조회는 DB 를 직접 읽는다.

## 6. 끄기

Vault 에서 `BATCH_POLICY_ENABLED=false` 로 두고 batch-service 를 다시 띄운다. Quartz 트리거가 등록되지 않는다. `policy` 에 이미 들어간 행은 그대로 두고, 추천 API 는 마감 필터만 적용한다.
