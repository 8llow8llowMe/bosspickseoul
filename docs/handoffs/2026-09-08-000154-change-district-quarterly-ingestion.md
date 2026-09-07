---
project: nowdoboss
cwd: D:/ProjectWorkSpace/NowDoBoss-V2/.worktrees/batch-quarterly-ingestion (워크트리 — 기기마다 경로 다름)
branch: feat/batch-quarterly-ingestion
timestamp: 2026-09-08T00:01:54+0900
title: change_district 누락 발견 — 분기 적재 데이터셋은 레거시 팩트 테이블 15종과 1:1이어야 한다
files:
  - backend/service/batch-service/src/main/java/.../dataingestion/domain/model/Dataset.java
  - backend/service/batch-service/src/main/java/.../dataingestion/domain/model/AreaScope.java
  - backend/scripts/data-migration/nowdoboss-to-bosspickseoul-commercial-remaining-runbook.sql
  - backend/docs/services/batch-service.md
---

## 작업 주제: `CHANGE_DISTRICT` 누락과 레거시 팩트 테이블 15종 대조

### 왜 이 문서가 있나

`feat/batch-quarterly-ingestion` 의 분기 적재 파이프라인은 `Dataset` 열거형에 적재 대상
데이터셋을 나열한다. 처음 구현은 **14종**이었고, 레거시 팩트 테이블은 **15종**이다.
빠진 하나가 `change_district` 였다.

이건 컴파일도 되고 테스트도 통과하는 종류의 누락이다. 조용히 「자치구 상권변화지표
화면만 영원히 `20233` 에 남는」 결과로 나타난다. 그래서 목록을 기억이 아니라 문서와
테스트로 고정해 둔다.

---

## 확정된 사실

### 1. 레거시 팩트 테이블은 15종이다 (근거: 마이그레이션 런북)

`Dataset` 열거형은 commercial-service 가 이미 읽는 팩트 테이블과 **1:1** 이어야 한다.
목록의 출처는 v1 → v2 데이터 마이그레이션 런북 두 개다.

- `backend/scripts/data-migration/nowdoboss-to-bosspickseoul-commercial-after-area-runbook.sql`
- `backend/scripts/data-migration/nowdoboss-to-bosspickseoul-commercial-remaining-runbook.sql`
- (탐색용) `nowdoboss-to-bosspickseoul-commercial-remaining-discovery.sql`

| # | 레거시 테이블 | `Dataset` 상수 | 비고 |
| --- | --- | --- | --- |
| 1 | `sales_commercial` | `SALES_COMMERCIAL` | |
| 2 | `store_commercial` | `STORE_COMMERCIAL` | |
| 3 | `foot_traffic_commercial` | `FOOT_TRAFFIC_COMMERCIAL` | |
| 4 | `change_commercial` | `CHANGE_COMMERCIAL` | **테이블이 비어 있다** (아래 2번) |
| 5 | `population_commercial` | `POPULATION_COMMERCIAL` | |
| 6 | `facility_commercial` | `FACILITY_COMMERCIAL` | |
| 7 | `income_commercial` | `CONSUMPTION_COMMERCIAL` | 이름 불일치 (income ↔ consumption) |
| 8 | `sales_administration` | `SALES_ADMINISTRATION` | |
| 9 | `store_administration` | `STORE_ADMINISTRATION` | |
| 10 | `income_administration` | `CONSUMPTION_ADMINISTRATION` | 이름 불일치 |
| 11 | `sales_district` | `SALES_DISTRICT` | |
| 12 | `store_district` | `STORE_DISTRICT` | |
| 13 | `foot_traffic_district` | `FOOT_TRAFFIC_DISTRICT` | |
| 14 | `income_district` | `CONSUMPTION_DISTRICT` | 이름 불일치 |
| 15 | `change_district` | `CHANGE_DISTRICT` | **이번에 추가한 것** |

레거시 이름은 `income_*` 인데 열거형은 `CONSUMPTION_*` 이다. 원천 컬럼이
`EXPNDTR_TOTAMT`(지출_총금액)라 열거형 이름이 더 정확하다. **이름이 달라도 같은
테이블을 가리킨다** — 다른 것으로 착각해 16번째를 만들지 말 것.

이 목록은 `DatasetTest.coversEveryLegacyFactTableAndNothingElse()` 가 통째로 고정한다.
데이터셋을 추가·삭제하면 그 테스트가 먼저 깨진다.

### 2. `change_commercial` 테이블은 지금 비어 있다

`nowdoboss-to-bosspickseoul-commercial-remaining-runbook.sql:14` 에 그대로 적혀 있다.

> `change_commercial`: source table was not found in the nowdoboss source-column inventory.
> If source_exists = 0, load change_commercial later from Open API CSV/Excel.

즉 v1 원본에 `change_commercial` 이 없어서 마이그레이션이 건너뛰었다. **이 배치의 CSV
경로로 채울 수 있는 첫 대상이다.** `change_district` 는 정상 마이그레이션됐다.

정리하면 상권변화지표 두 종의 상태가 반대다.

- `change_commercial` — 열거형에는 있었고, **DB 데이터가 없다**
- `change_district` — DB 데이터는 있고, **열거형에 없었다**

### 3. `CHANGE_DISTRICT` 와 `CONSUMPTION_COMMERCIAL` 은 CSV/ZIP 전용이다

두 상수의 `service` 값은 빈 문자열 `""` 이다. **Open API 서비스명을 아직 확인하지
못했다는 뜻이고, 버그가 아니다.** 엔드포인트를 추측해 넣으면 조용히 엉뚱한 데이터를
받게 되므로, `ImportRequest` 가 API 실행을 즉시 거부하도록 두었다.

```
Dataset supports archival files only
```

서비스명을 확인하면 열거형에 채우기만 하면 된다. 나머지 12종의 서비스명
(`VwsmTrdarSelngQq` 등)도 **실호출로 검증된 적이 없다** — 열린데이터광장 데이터셋
페이지가 JS 렌더링이라 서비스명·컬럼 목록을 긁을 수 없고, 이 세션에는 API 키가 없었다.
첫 dry-run 이 실질적 첫 검증이다.

### 4. 2024년부터 공간 단위가 바뀌었다 (원천 공지)

- **2024년부터 공간 단위가 「표준단위구역」으로 변경**됐다. `20233` 과 2024년 이후
  분기는 **같은 상권 코드라도 같은 영역이 아니다.** 분기별 릴리스를 `spatial_version`
  으로 분리 보관하는 이유가 이것이다.
- **2026-07-03 부터 2021년 이후 자료만 제공**된다. 2021년 이전 분기는 원천에서 재수집
  불가이므로 **기존 레거시 테이블이 유일한 사본**이다. 이 배치가 레거시 테이블을
  건드리지 않는 결정은 되돌릴 수 없는 손실을 막는 목적도 있다.
- 배포 형태가 연 단위 CSV(2021~2025)이므로 백필 주경로는 CSV/ZIP, Open API 는 최신 분기
  보충용이다.
- 근거: [OA-15572 추정매출-상권](https://data.seoul.go.kr/dataList/OA-15572/S/1/datasetView.do) ·
  [OA-22176 추정매출-자치구](https://data.seoul.go.kr/dataList/OA-22176/S/1/datasetView.do) ·
  [골목상권](https://golmok.seoul.go.kr/)

**연도만으로 공간 기준을 추정하지 말 것.** 원천이 과거 분기를 새 기준으로 재공표할 수
있어서, `spatial_version` 은 항상 명시 인자로 받는다.

---

## 같은 세션에서 함께 고친 것

### `row_number` 는 MySQL 8 예약어다 (치명적이었음)

`ROW_NUMBER` 는 MySQL 8.0.2 부터 예약어다. 백틱 없이 컬럼명으로 썼으니
`CREATE TABLE dataset_staging` 부터 문법 오류이고 staging INSERT 전부가 죽는다.
`source_row_number` 로 바꿨다.

**이게 초록불을 뚫고 살아남은 이유가 중요하다** — `DatasetReleaseJdbcAdapterTest` 는
`JdbcTemplate` 을 목으로 완전히 대체한다. SQL 문자열이 실제로 실행되지 않으므로 문법은
한 번도 검증된 적이 없다. 컬럼명을 고정하는 회귀 테스트를 추가했지만, **SQL 문법·락
동작의 실검증은 개발 DB dry-run 뿐이다.**

### `--expected-rows` 문서가 코드와 반대였다

`--expected-rows` 는 **대상 분기 한 개의 행 수**다. 분기 필터를 지키는 서비스는
`list_total_count` 와 같지만, 전체 시계열을 반환하는 행정동·자치구 `W` 서비스는
`list_total_count` 가 전 분기 합이라 **그대로 쓰면 게시가 100% 실패**한다.

모를 때의 절차: `--dry-run=true` 로 한 번 돌린다 → Job 이 실패해도 검증 감사는 커밋되므로
`dataset_release.accepted_count` 에서 실제 행 수를 읽는다 → **새 `run-id`** 로 다시 돌린다
(`expected_rows` 가 요청 지문에 포함되므로 같은 `run-id` 재사용은 거부된다).

### `AreaScope` 도입

`("COMMERCIAL", "TRDAR_CD")` 처럼 areaType·areaField 를 데이터셋마다 손으로 짝지어
오타 한 번이면 엉뚱한 코드 필드로 적재된다. 또 `SpatialAreaType` 이 application 계층에
같은 상수로 중복돼 있었다. domain 의 `AreaScope` 하나로 합치고 부모 계층
(자치구 → 행정동 → 상권)도 열거형 메서드로 옮겼다.

---

## 남은 작업

1. **`dataset_fact` / `dataset_active_release` 를 읽는 조회 경로가 없다.** 배치는 적재만
   하고 서비스는 여전히 레거시 테이블을 읽는다. 의도된 단계 구분이다.
2. **`spring-batch-test` 가 의존성에 없다.** Job 배선(`@StepScope` 프록시, 실행 컨텍스트
   승격, 재시작)을 부팅 검증하는 테스트를 쓸 수 없다. 첫 dry-run 이 첫 검증이다.
3. **브랜치가 `develop` 보다 79 커밋 뒤였다.** 리베이스 필요.
4. Open API 서비스명 14종 실호출 검증 (위 3번).
5. `_RT` / `_AVRG` 접미사 컬럼의 음수를 거부한다. 2024년 이후 증감률 컬럼이 추가되면
   fail-closed 로 멈춘다. 조용히 오염되는 것보다 낫지만 알고 있어야 한다.

## 이어받을 때 먼저 읽을 것

- `backend/docs/services/batch-service.md` — 실행 절차·원천 변경 사실의 단일 기준
- `backend/scripts/migration/quarterly-dataset-schema.sql` — 새 테이블 DDL
- `DatasetTest` — 데이터셋 계약이 깨지면 여기가 먼저 빨개진다
