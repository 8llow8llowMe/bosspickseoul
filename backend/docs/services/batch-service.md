# 분기 데이터 적재

## 구현 범위와 호환성 결정

`quarterly` 프로파일의 `commercialAnalysisImportJob`은 데이터셋·분기 한 건을 실행 단위로 삼는다. 스케줄러는 데이터셋별 제공 여부를 확인해 같은 Job을 반복 실행한다. CSV/ZIP 백필과 서울 Open API 수집을 동일한 검증·게시 경로로 처리한다.

원본 보관 → chunk staging → 자연키/필수값/분기/공간 코드 검증 → 불변 release 게시 → 해당 데이터셋·분기·공간 버전 포인터 전환 순서다. 게시 트랜잭션은 분기 전체를 교체하며 이전 release를 삭제하지 않는다. 같은 runId 재시도는 staging부터 다시 읽고, 이미 게시된 runId는 변경하지 않는다.

기존 `20233` 분석 테이블, `commercial_region_mapping`, `area_boundary`는 이 배치가 수정하지 않는다. 현재 서비스는 공간 버전 없는 조인과 같은 코드의 분기 간 증감률을 사용한다. 따라서 새 기준 데이터를 기존 테이블에 바로 게시하는 것은 과거 데이터 보존과 양립하지 않는다. 새 데이터는 `dataset_release`, `dataset_fact`, `dataset_active_release`, `dataset_spatial_*`에서 조회할 수 있게 보관한다. 서비스 노출 전에는 지도/지역/추세 조회를 공간 버전 기준으로 전환해야 한다. 원천의 재공표로 과거 분기도 새 공간 기준을 사용할 수 있으므로 연도만으로 기준을 추정하지 않는다.

## 원천 변경 사실 (2026-09-07 확인)

- 서울 열린데이터광장 상권분석서비스는 **2024년부터 공간 단위를 표준단위구역으로 변경**했다. 즉 `20233`과 2024년 이후 분기는 같은 상권 코드라도 같은 영역을 가리키지 않는다. 이것이 분기별 적재를 `spatial_version`으로 분리해 보관하는 이유다.
- 같은 공지에 따라 **2026-07-03부터 2021년 이후 자료만 제공**된다. 2021년 이전 분기는 원천에서 재수집할 수 없으므로 기존 테이블의 과거 데이터가 유일한 사본이다. 이 배치가 레거시 테이블을 건드리지 않는 결정은 되돌릴 수 없는 손실을 막는 목적도 있다.
- 연 단위 CSV(2021~2025년)가 배포되므로 백필 경로는 CSV/ZIP이 기본이고 Open API는 최신 분기 보충용이다.
- 근거: [상권분석서비스(추정매출-상권) OA-15572](https://data.seoul.go.kr/dataList/OA-15572/S/1/datasetView.do), [상권분석서비스(추정매출-자치구) OA-22176](https://data.seoul.go.kr/dataList/OA-22176/S/1/datasetView.do), [우리마을가게 상권분석서비스](https://golmok.seoul.go.kr/)

## 데이터셋 목록

`Dataset`은 commercial-service가 이미 읽는 레거시 팩트 테이블 15종과 1:1로 대응한다. 한 종이라도 빠지면 그 화면만 `20233`에 남으므로 `DatasetTest`가 목록 전체를 고정한다.

`service`가 빈 데이터셋(`CONSUMPTION_COMMERCIAL`, `CHANGE_DISTRICT`)은 Open API 계약을 아직 등록하지 않은 것이며, 엔드포인트를 추측하지 않고 CSV/ZIP만 허용한다. API 실행을 시도하면 `ImportRequest`가 즉시 거부한다. 서비스명을 확인하면 열거형에 채우면 된다.

레거시 `change_commercial` 테이블은 v1 마이그레이션에서 원천을 찾지 못해 **비어 있다**(`nowdoboss-to-bosspickseoul-commercial-remaining-runbook.sql` 참고). 이 배치의 CSV 경로로 채울 수 있는 첫 대상이다.

## 책임과 검증 계획

- 수집 Adapter: API 페이지 제한, 타임아웃, 오류 응답, 원본 checksum, UTF-8/CP949 CSV 및 ZIP 스트리밍 검증.
- 서울 API 중 일부 행정동·자치구 서비스는 분기 경로 인자를 무시하고 전체 시계열을 반환하므로,
  원격 페이지 커서와 대상 분기 채택 건수를 분리해 스트리밍 필터링한다.
- Application: 분기 형식, 데이터셋 계약, 누락과 0 구분, 원천 스키마 변경 실패, 공간 버전 연결 검증.
- Persistence Adapter: staging chunk 저장, 중복과 공간 코드 검증, 게시 트랜잭션, 게시 동시성 및 불변 이력 검증.
- 실행 구성: 기본 dryRun, 명시 DB URL와 schema allowlist, Job 종료 코드, 외부 스케줄러 실행 안내.

행 검증은 fail-closed다. 거부 행이 한 건이라도 있으면 게시하지 않고 Job이 실패한다. 2024년 이후 원천이 컬럼이나 코드 체계를 또 바꾸면 조용히 잘못된 값이 들어가는 대신 `dataset_rejected_row`에 근거를 남기고 멈춘다.

추가 라이브러리 없이 기존 Spring Batch/JDBC/Jackson/JUnit을 사용한다. 실제 개발 DB 변경과 공공 API 키 사용은 이번 로컬 구현·테스트에 포함하지 않는다.

## 남은 작업

- `dataset_fact` / `dataset_active_release`를 읽는 조회 경로가 아직 없다. 배치는 적재만 하고 서비스는 여전히 레거시 테이블을 읽는다.
- `spring-batch-test`가 의존성에 없어 Job 배선(@StepScope 프록시, 실행 컨텍스트 승격, 재시작)을 부팅해 검증하는 테스트가 없다. 첫 dry-run은 개발 DB에서 직접 확인해야 한다.
- Persistence 테스트는 `JdbcTemplate`을 목으로 대체하므로 SQL 문법과 락 동작은 개발 DB dry-run에서만 검증된다.

## 실행 예시

먼저 `quarterly-dataset-schema.sql`을 명시한 개발 스키마에 적용하고 공간 스냅샷을 검증한다.

```text
SPRING_PROFILES_ACTIVE=quarterly BATCH_DB_URL=jdbc:mysql://host:3306/bosspickseoul_commercial_dev \
BATCH_ALLOWED_SCHEMAS=bosspickseoul_commercial_dev SEOUL_OPEN_DATA_API_KEY=... \
java -jar batch-service.jar --job=spatial --run-id=spatial-2026-09-06 \
  --source-file=seoul-spatial-v2024.geojson --spatial-version=seoul-v2024 --dry-run=true
```

검증 결과를 확인한 뒤 같은 입력을 새 `run-id`로 `--dry-run=false` 실행한다. 사실 데이터는 데이터셋마다 별도 실행한다.

```text
java -jar batch-service.jar --job=facts --run-id=sales-commercial-20262-001 \
  --dataset=SALES_COMMERCIAL --period=20262 --source=API \
  --spatial-version=seoul-v2024 --schema-version=seoul-v1 \
  --expected-rows=<대상 분기 행 수> --source-updated-at=<ISO-8601> --dry-run=true
```

`--expected-rows`는 **대상 분기 한 개의 행 수**다. 분기 필터를 지키는 서비스는 `list_total_count`가 그 값과 같지만, 전체 시계열을 반환하는 행정동·자치구 서비스는 `list_total_count`가 모든 분기의 합이므로 그대로 쓰면 게시가 항상 실패한다. 값을 모를 때는 `--dry-run=true`로 한 번 실행한다. 검증 감사는 게시가 거부돼도 커밋되므로 Job이 실패해도 `dataset_release.accepted_count`에서 실제 행 수를 읽을 수 있다. 다만 `expected_rows`는 요청 지문에 포함되므로, 값을 고쳐 다시 실행할 때는 **새 `run-id`** 를 써야 한다.

`--dry-run=false`는 새 run ID로 다시 실행해야 하며, 같은 분기의 이전 release는 삭제하지 않는다. `20233`은 기존 서비스 테이블에서 계속 읽고, 새 release는 공간 버전 인식 조회가 배포될 때까지 기존 API의 기본값으로 사용하지 않는다.
