# 기업마당 정책 수집 운영

개발 서버에 이미 떠 있는 `batch-service`를 재시작한다고 지원 정책이 자동으로 모이지는 않는다.
지금 Jenkins가 올리는 인스턴스는 `SPRING_PROFILES_ACTIVE=dev` 이고 `BATCH_DB_URL` 은 **district** 스키마(`area_boundary`)다. 정책 테이블 `policy` 는 **commercial** 스키마에 있다.

주기 수집을 켜려면 아래를 모두 맞춘 **scheduler 프로세스**가 상업 스키마를 보고 장시간 떠 있어야 한다. 설계·원천 계약은 [batch-service.md](batch-service.md) 「기업마당 정책 수집」을 본다.

## 한 줄 요약

| 질문 | 답 |
| --- | --- |
| 지금 개발 `batch-service`만 올리면 수집되나? | 아니오. `scheduler` 프로파일 + 수집 on + commercial DB + 기업마당 키가 없다 |
| 켜면 언제 돌아가나? | 매일 06:00(수집) / 06:30(만료) Asia/Seoul. 기동 직후 한 번은 돌지 않는다 |
| 화면은 언제 바뀌나? | 수집이 `policy` 를 갱신한 뒤, commercial-service 추천 API 가 그 행을 읽으면 바뀐다 |
| 시드 14건은? | `SEED` 행은 Job 이 지우지 않는다. 기업마당 두 건만 `BIZINFO` 키로 갱신된다 |

## 매일 시나리오

```text
06:00  policyCollectJob
        1. 기업마당 API (hashtags=소상공인, 최대 20페이지)
        2. (source, external_id) 로 upsert. 신규 id 는 Snowflake
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

Workbench에서 **`bosspickseoul_commercial_dev`를 선택한 뒤** 순서대로 실행한다. PowerShell `mysql ... < file.sql` 의 `<` 는 예약 연산자라 실패한다.

1. `BATCH_*` 가 없으면 `backend/scripts/migration/spring-batch-schema-mysql.sql` (분기 적재 때 이미 넣었다면 생략. `IF NOT EXISTS` 가 없어 두 번 실행하면 실패한다)
2. `backend/scripts/migration/policy-ingest-columns-runbook.sql` — `policy.source` / `external_id` / `last_seen_at`
3. `backend/scripts/migration/quartz-schema-mysql.sql` — `QRTZ_*`
4. `backend/service/commercial-service/src/main/resources/db/policy-seed.sql` — 시드 재적재. 식품안심업소·라이브커머스를 `BIZINFO` + `pblancId` 로 재매핑한다

dev 의 commercial-service 는 `ddl-auto: update` 라 엔티티 배포만으로 컬럼이 생길 수 있다. 그래도 **유니크·인덱스 이름과 시드 재매핑은 런북+시드 SQL** 을 따른다. Quartz 테이블은 엔티티가 아니라서 앱이 만들지 않는다 (`initialize-schema: never`).

`bosspickseoul_commercial_prod` 는 같은 서버에 있다. 실행 전에 스키마 이름을 확인한다. prod 스키마 이름을 `BATCH_ALLOWED_SCHEMAS` 에 넣지 않는다.

확인: `backend/scripts/migration/policy-ingest-verify.sql`

## 2. 기업마당 키

키는 **기업마당 정책정보 개방**에서 발급한다. data.go.kr / 서울 열린데이터광장 키와 호환되지 않는다.

- 안내: https://www.bizinfo.go.kr/apiList.do
- 호출: `GET https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do?crtfcKey=...&dataType=json`

HTML 스크래핑·K-Startup·자치구 홈페이지는 1차 범위 밖이다.

## 3. 권장 운영: commercial 을 보는 장기 프로세스

기존 Jenkins `batch-service-dev` 의 `BATCH_DB_URL` 을 commercial 로 바꾸지 않는다. 바꾸면 `area_boundary` 적재가 district 가 아니라 commercial 로 나간다.

분기 적재(`quarterly`)처럼 **별도 JAR** 을 띄운다. `quarterly` 와 달리 이 프로세스는 종료하지 않는다.

```powershell
cd <repo>\backend
$env:SPRING_PROFILES_ACTIVE = "scheduler"
$env:BATCH_DB_URL = "jdbc:mysql://<host>:3306/bosspickseoul_commercial_dev?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Seoul&zeroDateTimeBehavior=convertToNull&rewriteBatchedStatements=true"
$env:DB_USERNAME = "<user>"
$env:DB_PASSWORD = "<password>"
$env:BATCH_ALLOWED_SCHEMAS = "bosspickseoul_commercial_dev"
$env:BATCH_POLICY_ENABLED = "true"
$env:BIZINFO_CRTFC_KEY = "<기업마당 crtfcKey>"
$env:SNOWFLAKE_DATACENTER_ID = "1"
$env:SNOWFLAKE_WORKER_ID = "2"
# 기존 batch-service 와 Eureka 인스턴스가 겹치지 않게 끈다
$env:EUREKA_CLIENT_ENABLED = "false"

.\gradlew.bat :service:batch-service:bootJar
$jar = (Get-ChildItem service\batch-service\build\libs\*.jar | Where-Object Name -notlike "*plain*" | Select-Object -First 1).FullName
java -jar $jar
```

기동 직후 로그에서 확인할 것:

- `BatchTargetGuard` 예외가 없다
- Quartz 가 `policyCollectTrigger` / `policyPurgeTrigger` 를 등록했다 (`batch.policy.enabled=true` 일 때만)
- `System.exit` 하지 않고 프로세스가 남아 있다

`BATCH_DB_URL` 에 `prod` 가 들어가거나 allowlist 와 다르면 기동이 거부된다. 예외 메시지에 JDBC URL 은 실리지 않는다.

### 첫 수집을 06:00 전에 보고 싶을 때

기본 cron 은 misfire 를 무시하므로, 낮에 띄워도 그날 06:00을 지나 있으면 **다음날 06:00**까지 기다린다. 스모크만 필요하면 잠시 cron 을 당긴다.

```powershell
$env:BATCH_POLICY_COLLECT_CRON = "0 0/10 * * * ?"   # 10분마다. 확인 후 비운다
$env:BATCH_POLICY_PURGE_CRON = "0 5/10 * * * ?"
```

확인이 끝나면 변수를 제거하고 프로세스를 다시 띄워 06:00/06:30 으로 되돌린다.

## 4. 하지 말아야 할 것

- **기존 `batch-service-dev` 에 `scheduler` 만 추가하고 DB 는 district 로 두기** — `policy` 테이블이 없어 upsert 가 실패한다. `scheduler` 프로파일은 기동 시 `BATCH_ALLOWED_SCHEMAS` 가 없으면 프로세스 자체가 죽는다.
- **기존 인스턴스의 `BATCH_DB_URL` 을 commercial 로 바꾸기** — 영역 좌표 적재 대상이 바뀐다.
- **키 없이 `BATCH_POLICY_ENABLED=true`** — 06:00 Job 이 `POLICY_INGEST_002` 로 실패한다. stale-mark 는 하지 않는다.
- **prod 스키마를 allowlist 에 넣기** — `BatchTargetGuard` 가 `prod` 가 이름에 있으면 거부한다.

Jenkins 컨테이너에 붙이려면 `.env.example` 과 compose 에 넣은 키를 Vault `kv/bosspickseoul/backend/dev/env` 에 **patch** 로 추가한다. `put` 은 나머지를 지운다. 그래도 datasource 가 district 인 한 수집 Job 을 그 컨테이너에서 켜지 않는다.

## 5. 화면에서 보이는 것

수집 전: 시드 14건 기준. 마감이 지난 카드(예: 스마트상점 2026-09-30)는 추천에서 빠진다.

수집 후:

- 기업마당에서 받은 소상공인 공고가 `policy` 에 쌓인다. 업종을 추정하지 않으므로 음식/서비스/소매 상권 모두 전국 공고가 섞일 수 있다
- 프로필은 여전히 최대 5건이다. 프론트 API 계약은 그대로다 ([FE #290](https://github.com/8llow8llowMe/bosspickseoul/issues/290))
- `detailUrl` 은 기업마당 공고 상세(`pblancId`)다
- 원천에서 사라진 공고는 그날 추천에서 사라지고, 30일 뒤 행이 삭제된다

commercial-service 를 재시작할 필요는 없다. 조회는 DB 를 직접 읽는다.

## 6. 꺼기

프로세스를 종료하거나 `BATCH_POLICY_ENABLED=false` 로 다시 띄운다. `false` 면 Quartz 트리거가 등록되지 않는다. `policy` 에 이미 들어간 행은 그대로 두고, 추천 API 는 마감 필터만 적용한다.
