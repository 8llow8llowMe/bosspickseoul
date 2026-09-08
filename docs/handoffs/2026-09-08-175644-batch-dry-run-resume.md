---
project: NowDoBoss-V2
cwd: D:/ProjectWorkSpace/NowDoBoss-V2/.claude/worktrees/batch-2024-schema-review (워크트리 — 기기마다 경로 다름)
branch: feat/be/batch-2024-schema-review
timestamp: 2026-09-08T17:56:44+0900
title: 분기 적재 배치 — 개발 DB dry-run 이어서 하기 (스키마 DDL·서울 인증키 필요)
files:
  - backend/service/batch-service/src/main/java/.../dataingestion/domain/model/Dataset.java
  - backend/service/batch-service/src/main/java/.../dataingestion/adapter/out/source/SeoulDatasetSourceAdapter.java
  - backend/service/batch-service/src/main/java/.../dataingestion/adapter/out/source/CsvHeaderAliases.java
  - backend/service/batch-service/src/main/java/.../dataingestion/adapter/out/spatial/LegacySpatialJdbcSourceAdapter.java
  - backend/service/batch-service/src/main/resources/seoul/csv-header-aliases.csv
  - backend/scripts/migration/quarterly-dataset-schema.sql
  - backend/docs/services/batch-service.md
---

## 작업 주제: 분기 적재 배치 — 개발 DB dry-run 이어서 하기

### 요약

`batch-service` 의 분기 적재 파이프라인이 **2024년 이후 원천 및 실제 개발 DB 스키마와 어긋나 있던
부분**을 실호출·실조회로 확인해 고쳤다. 코드 작업과 문서는 끝났고 **PR [#260](https://github.com/8llow8llowMe/bosspickseoul/pull/260) 은 열려 있다.**
남은 것은 **개발 DB dry-run 하나**이며, 그것을 위해 선행 DDL 적용과 서울 인증키가 필요하다.

- 브랜치 `feat/be/batch-2024-schema-review`, 커밋 10개, push 완료.
- 이슈 [#259](https://github.com/8llow8llowMe/bosspickseoul/issues/259) (이번 작업), [#245](https://github.com/8llow8llowMe/bosspickseoul/issues/245) (선행, 열려 있음).
- `./gradlew :service:batch-service:check` 통과, 테스트 **61건** 초록 (기존 48 + 신규 13).

### 내린 결정

- **서비스명 15종을 실호출로 확정하고 테스트로 고정했다.** 「소득소비-상권」(`VwsmTrdarNcmCnsmpQq`)은
  500 을 반환해 폐지된 것으로 보고, 후속인 「소비-상권배후지」(`VwsmTrdhlNcmCnsmpQq`)를 채택했다.
  자치구 상권변화지표는 `VwsmSignguIxQq` 다. `DatasetTest` 가 15종 서비스명 전체를 고정한다.
- **API 숫자를 평문 십진수로 정규화한다.** 서울 API 는 모든 지표를 JSON 숫자(`5.03135509E8`)로 준다.
  `asText()` 그대로면 payload 에 지수 표기가 남아 CSV 경로(`503135509`)와 같은 값이 달라진다.
  BigDecimal 로 디코딩해 두 경로가 같은 문자열을 적재하게 했다.
- **CSV 헤더 별칭 표는 yml 이 아니라 리소스 파일에 둔다.** 사용자가 `application-quarterly.yml` 에
  170줄을 나열한 것을 "너무 더럽다"고 했다. classpath `seoul/csv-header-aliases.csv` 로 옮기고
  헤더 정규화(공백·`~` → `_`, `률` → `율`)로 컬럼당 한 줄만 두게 했다. yml 은 오버라이드 자리만.
- **별칭 없는 한글 헤더는 fail-closed.** 통과시키면 API 경로가 만들 수 없는 키가 payload 에 들어가고
  접미사 기반 숫자 검증도 건너뛴다. 헤더 이름을 나열하고 멈춘다.
- **`--source=ARCHIVE` 를 추가했다.** 이전 API 실행이 보관한 `page-<start>.json` 을 재생한다.
  분기 인자를 무시하는 서비스 9종을 22분기 백필하면 호출 약 4,300회인데(인증키 일 1,000회 제한),
  첫 분기만 API 로 받고 나머지를 재생하면 약 200회다. API 와 재생이 같은 `PageSession` 을 쓴다.
- **`--job=spatial --source=LEGACY` 를 추가했다.** 2024년 표준단위구역 GeoJSON 이 없어서 사실 데이터
  dry-run 이 `unmapped` 에서 전부 실패하는 상태였다. 레거시 `area_boundary` + `commercial_region_mapping`
  에서 스냅샷을 만들어 그 막힘을 푼다. **폴리곤은 20233 기준**이므로 버전명에 `legacy-20233` 처럼 남긴다.

### 개발 DB 실조회로 확인한 것 (2026-09-08)

접속해서 **읽기 전용 조회만** 했다. 쓰기·DDL 은 하지 않았다.

| 확인 | 결과 |
| --- | --- |
| `area_boundary` 위치 | **`bosspickseoul_district_dev`** (팩트는 `bosspickseoul_commercial_dev`) |
| 영역 수 | 자치구 25 · 행정동 425 · 상권 1,650 (합 2,100) |
| `boundary_geo_json` 형태 | 2,100건 전부 맨 링 `[[lng,lat],...]` — 중첩 링·geometry 객체 없음 |
| 링이 열린 행 | **80건** — 링을 닫는 처리가 실제로 필요 |
| `commercial_region_mapping` | 1,650행이 상권 1,650개를 정확히 덮음, 양방향 누락 0 |
| 행정동 → 자치구(앞 5자리) | 425건 전부 부모 존재 |
| 팩트 코드 → 영역 | `sales_commercial`·`change_district` 누락 0 → `unmapped` 0 예상 |
| `BATCH_*` 메타 테이블 | `commercial_dev` 에 **0개**, `district_dev` 에는 있음 |
| `dataset_*` 테이블 | `commercial_dev` 에 **0개** (아직 미적용) |
| 레거시 분기 범위 | `20191` ~ `20233` (19분기) |
| `change_commercial` | **0행** (비어 있음, 첫 적재 대상) |
| `income_commercial` 소득 컬럼 | 30,983행 **전부 값 있음** — 2024년 이후 원천엔 없는 값 |

이 조회로 **코드가 틀렸던 것 하나**를 잡았다: LEGACY 소스가 스키마 없이 조회해서 배치 스키마
(`commercial_dev`)를 찾고 있었고, 그러면 빈 결과가 된다. `BATCH_LEGACY_SPATIAL_SCHEMA` 설정을
추가했고, 조회가 비면 그 설정을 가리키며 멈춘다.

### 남은 작업

1. **서울 열린데이터광장 인증키 발급.** ⚠️ **공공데이터포털(data.go.kr) 키가 아니다.**
   배치가 부르는 주소가 `openapi.seoul.go.kr:8088/{인증키}/json/...` 이고 두 포털 키는 호환되지 않는다.
   data.seoul.go.kr 로그인 → 「나의 정보 → 인증키 신청」. 영숫자 문자열이 나온다.
   코드가 `[a-zA-Z0-9]+` 로 검증하므로 특수문자가 섞이면 거부된다.

2. **`bosspickseoul_commercial_dev` 에 선행 DDL 적용.** (아직 안 함 — 공유 DB 쓰기라 승인 대기 중이었다)
   - (a) spring-batch-core jar 의 `org/springframework/batch/core/schema-mysql.sql`
     — `quarterly` 프로파일이 `initialize-schema: never` 라서 없으면 **기동 단계에서 죽는다.**
   - (b) `backend/scripts/migration/quarterly-dataset-schema.sql`
   - 확인: `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='bosspickseoul_commercial_dev' AND table_name='BATCH_JOB_INSTANCE';` → 1

3. **공간 스냅샷 dry-run → 실게시.** `--source=LEGACY`, `BATCH_LEGACY_SPATIAL_SCHEMA=bosspickseoul_district_dev`.
   기대값: 영역 2,100건, `expectedCounts` 25/425/1650 통과.

4. **사실 데이터 dry-run.** 첫 대상은 **`CHANGE_COMMERCIAL 20241`** 을 권한다. 레거시 테이블이 비어
   있어 충돌 소지가 없고, `VwsmTrdarIxQq` 는 분기 인자를 존중하며 분기당 1,650행으로 작다.
   `--expected-rows=1650`. **여기서 SQL 문법과 락 동작이 처음 검증된다.**

5. 위가 통과하면 이슈 #245 의 미체크 항목 두 개 중 「개발 DB dry-run」을 닫을 수 있다.

6. (더 나중) 2024년 표준단위구역 폴리곤 확보. 서울시 shapefile → WGS84 GeoJSON 변환(ogr2ogr 등) 후
   `--source=GEOJSON` 으로 새 버전 게시. 그래야 지도가 2024년 이후 영역을 그린다.

7. (더 나중) `dataset_fact` / `dataset_active_release` 를 읽는 조회 경로 전환.
   그때 `income_commercial` 의 소득 2개 컬럼은 null 또는 「제공 종료」 처리가 필요하다.

### 주의사항

- **DB 접속 정보는 이 문서에 적지 않았다.** 저장소에 커밋되는 문서다. 사용자가 채팅으로 준 값을
  다시 받거나, 팀 비밀 저장소에서 꺼내 환경변수(`DB_USERNAME`/`DB_PASSWORD`)로 넘긴다.
  서버는 Main Server 의 MySQL **9.1.0**, 계정은 `followfollowme` 다.
- **`bosspickseoul_commercial_prod` 가 같은 서버에 있다.** 절대 건드리지 말 것.
  `BatchTargetGuard` 가 스키마명에 `prod` 가 들어가면 거부하지만, 손으로 SQL 을 칠 때는 보호가 없다.
- **dry-run 도 DB 에 쓴다.** `dataset_release`·`dataset_staging`·`dataset_rejected_row` 에 감사 기록이
  남는다. `dataset_fact` 게시와 포인터 전환만 건너뛴다. "아무것도 안 쓴다"가 아니다.
- **`--expected-rows` 를 모르면 dry-run 이 게시 단계에서 실패하는 것이 정상 절차다.** 이제 예외
  메시지에 `expected/input/accepted/rejected/duplicate/unmapped` 가 찍히므로 거기서 실제 건수를
  읽어 **새 `run-id`** 로 다시 돌린다. `expected_rows` 가 요청 지문에 포함돼 같은 run-id 재사용은 거부된다.
- **분기 인자를 무시하는 서비스가 15종 중 9종이다.** 접미사(`Qq`/`W`)로 구분되지 않는다.
  표는 `backend/docs/services/batch-service.md` 의 「원천 실호출 결과」에 있다.
- **CSV 헤더 별칭의 한글 쪽 표기는 배포 CSV 로 대조하지 않았다.** 실패하면 실행이 헤더 이름을
  알려주므로, 검사를 느슨하게 하지 말고 `seoul/csv-header-aliases.csv` 에 줄을 추가한다.
- **`spring-batch-test` 가 의존성에 없다.** Job 배선(@StepScope 프록시, 실행 컨텍스트 승격, 재시작)을
  부팅해 검증하는 테스트를 못 쓴다. 첫 dry-run 이 그 첫 검증이다.
- 이 워크트리 경로(`.claude/worktrees/`)는 Windows 경로 길이 문제를 일으킨 적이 있다. 집에서는
  `git worktree add` 로 짧은 형제 경로(`D:/ProjectWorkSpace/NDB-batch` 등)를 쓰는 편이 안전하다.
- **같은 날 앞선 인계 두 개의 파일명 타임스탬프를 이 세션에서 정정했다**(19:00 → 16:00, 21:30 → 17:00).
  처음에 미래 시각을 붙여서 이 문서가 최신으로 정렬되지 않았기 때문이다. 내용은 그대로다.

### 이어받을 때 먼저 읽을 것

1. `backend/docs/services/batch-service.md` — 실행 절차·원천 실호출 표·개발 DB 실측 표의 단일 기준
2. `backend/scripts/migration/quarterly-dataset-schema.sql` — 머리말에 선행 조건이 적혀 있다
3. `docs/handoffs/2026-09-08-160000-batch-2024-source-verified.md` — 원천 실호출 경위
4. `docs/handoffs/2026-09-08-170000-batch-legacy-spatial-and-archive-replay.md` — ARCHIVE·LEGACY 도입 경위
5. `docs/handoffs/2026-09-08-000154-change-district-quarterly-ingestion.md` — 데이터셋 15종 대조표
   (단 「확정된 사실 3」의 "서비스명 미확인"은 이번에 해소됐다)
