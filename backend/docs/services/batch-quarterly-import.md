# 분기 적재 배치 사용법

`quarterly` 프로파일 JAR로 개발 DB에 공간 스냅샷과 사실 데이터를 넣는 운영 절차다. 설계·원천 계약은 [batch-service.md](batch-service.md)를 본다.

2026-09-09 개발 DB 실측:

| 단계 | 결과 |
| --- | --- |
| Spring Batch 메타 + `dataset_*` DDL | `bosspickseoul_commercial_dev`에 적용 |
| `--job=spatial` LEGACY dry-run / 실게시 | `legacy-20233` `COMPLETED` |
| `CHANGE_COMMERCIAL` `20241` dry-run | `DRY_RUN`, 1650/1650, rejected·duplicate·unmapped = 0 |

사실 데이터는 **데이터셋 × 분기 한 건이 실행 단위**다. 같은 명령을 분기만 바꿔 반복하면 된다. 한 번에 전 구간을 도는 스케줄러는 없다.

## 1. 선행 DDL (스키마당 1회)

`quarterly`는 `spring.batch.jdbc.initialize-schema: never`라서 앱이 테이블을 만들지 않는다. Workbench에서 **`bosspickseoul_commercial_dev`를 선택한 뒤** 순서대로 실행한다.

1. `backend/scripts/migration/spring-batch-schema-mysql.sql` — `BATCH_*` (Spring Batch 5.2.2)
2. `backend/scripts/migration/quarterly-dataset-schema.sql` — `dataset_*`

PowerShell에서 `mysql ... < file.sql`은 `<`가 예약 연산자라 실패한다. DDL은 Workbench가 맞다.

적용 후 `backend/scripts/migration/quarterly-import-verify.sql`의 「1) 선행 테이블」이 8행이어야 한다. `BATCH_*`는 `IF NOT EXISTS`가 없어서 두 번 실행하면 실패한다.

`bosspickseoul_commercial_prod`는 같은 서버에 있다. 스키마 이름을 실행 전에 확인한다.

## 2. JAR과 환경변수

비밀번호·API 키는 저장소에 적지 않는다. 로컬 터미널에서만 넣는다.

```powershell
cd <repo>\backend
$env:SPRING_PROFILES_ACTIVE = "quarterly"
$env:BATCH_DB_URL = "jdbc:mysql://<host>:3306/bosspickseoul_commercial_dev?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Seoul&zeroDateTimeBehavior=convertToNull&rewriteBatchedStatements=true"
$env:DB_USERNAME = "<user>"
$env:DB_PASSWORD = "<password>"
$env:BATCH_ALLOWED_SCHEMAS = "bosspickseoul_commercial_dev"
$env:BATCH_LEGACY_SPATIAL_SCHEMA = "bosspickseoul_district_dev"
$env:SEOUL_OPEN_DATA_API_KEY = "<data.seoul.go.kr 인증키>"

.\gradlew.bat :service:batch-service:bootJar
$jar = (Get-ChildItem service\batch-service\build\libs\*.jar | Where-Object Name -notlike "*plain*" | Select-Object -First 1).FullName
```

- 서울 키는 **열린데이터광장**(data.seoul.go.kr) 키다. 공공데이터포털 키와 호환되지 않는다.
- `--job=spatial`은 API 키를 쓰지 않는다. `--source=API` 사실 적재만 쓴다.
- 기본 원본 보관 경로는 `backend/data/raw`다. 커밋하지 않는다.
- `BATCH_DB_URL`에 `prod`가 들어가면 `BatchTargetGuard`가 거부한다.

## 3. 공간 스냅샷 (사실 적재보다 먼저)

사실 데이터의 `unmapped` 검증은 `dataset_spatial_release.status = 'READY'`인 영역을 본다. dry-run만으로는 영역이 안 올라간다.

```powershell
java -jar $jar --job=spatial --run-id=spatial-legacy-20233-001 --source=LEGACY --spatial-version=legacy-20233 --source-updated-at=2023-12-31T00:00:00Z --dry-run=true
java -jar $jar --job=spatial --run-id=spatial-legacy-20233-002 --source=LEGACY --spatial-version=legacy-20233 --source-updated-at=2023-12-31T00:00:00Z --dry-run=false
```

기대: 영역 2,100건, 자치구 25 / 행정동 425 / 상권 1,650. 로그 `COMPLETED` 후 검증 SQL 「2) 공간 스냅샷」이 `READY`여야 한다.

`LEGACY` 폴리곤은 20233 기준이다. 서울시 영역 shapefile 3종을 `backend/scripts/spatial/seoul_area_shapefiles_to_geojson.py`로 변환해 `--source=GEOJSON --source-file=<파일> --spatial-version=<새 버전 이름>`으로 게시할 수 있다. 다운로드·변환·검증·대조 절차는 `batch-service.md` 「GEOJSON 파일 만들기」(이슈 #278). 게시 전에 현재 배포 shapefile(2023-10-20 파일)이 `legacy-20233`과 실제로 다른지 대조해야 한다.

## 4. 사실 데이터 — 한 분기씩

통과 조건: dry-run `COMPLETED`이고 `dataset_release`에서 `expected_rows = input_count = accepted_count`, 거부·중복·미매핑 0. 그다음 **새 run-id**로 `--dry-run=false`.

`--source-updated-at`은 ISO-8601이다. `<ISO-8601>` 자리표시 그대로 넣으면 파싱에서 실패한다. 분기 말 UTC를 쓴다.

| `period` | `--source-updated-at` |
| --- | --- |
| `20241` | `2024-03-31T00:00:00Z` |
| `20242` | `2024-06-30T00:00:00Z` |
| `20243` | `2024-09-30T00:00:00Z` |
| `20244` | `2024-12-31T00:00:00Z` |
| `20251` | `2025-03-31T00:00:00Z` |
| `20252` | `2025-06-30T00:00:00Z` |
| `20253` | `2025-09-30T00:00:00Z` |
| `20254` | `2025-12-31T00:00:00Z` |
| `20261` | `2026-03-31T00:00:00Z` |
| `20262` | `2026-06-30T00:00:00Z` |

원천이 아직 안 준 분기는 실패하는 것이 정상이다. API가 주는 최신 분기까지만 돌린다. 2021년 1분기(`20211`)부터 받을 수 있다. 우선순위는 **20241 이후**다. 레거시 서비스 테이블(`20233`까지)은 이 배치가 건드리지 않는다.

### 검증된 첫 대상 (`CHANGE_COMMERCIAL` / `20241`)

dry-run은 2026-09-09에 통과했다. 다음 명령이 실게시(아직 안 함)다.

```powershell
java -jar $jar --job=facts --run-id=change-commercial-20241-002 --dataset=CHANGE_COMMERCIAL --period=20241 --source=API --spatial-version=legacy-20233 --schema-version=seoul-v1 --expected-rows=1650 --source-updated-at=2024-03-31T00:00:00Z --dry-run=false
```

같은 데이터셋의 다음 분기 예:

```powershell
java -jar $jar --job=facts --run-id=change-commercial-20242-001 --dataset=CHANGE_COMMERCIAL --period=20242 --source=API --spatial-version=legacy-20233 --schema-version=seoul-v1 --expected-rows=1650 --source-updated-at=2024-06-30T00:00:00Z --dry-run=true
```

`20242` 건수가 1650이 아니면 Job이 실패하고 `dataset_release.accepted_count`에 실제 값이 남는다. 그 값으로 **새 run-id**를 만들어 다시 돈다. 같은 run-id는 재사용하지 않는다.

## 5. 데이터셋 순서와 `--expected-rows`

`--expected-rows`는 **그 분기 한 개의 행 수**다. 업종 차원이 있는 매출·점포는 상권 수(1,650)보다 훨씬 크다.

| `Dataset` | 분기 인자 | 20241 참고 행 수 | 비고 |
| --- | --- | --- | --- |
| `CHANGE_COMMERCIAL` | O | **1650 (실측)** | 첫 적재 대상. 레거시 테이블이 비어 있음 |
| `FOOT_TRAFFIC_COMMERCIAL` | O | 1,648~1,649 | 분기마다 1 차이 날 수 있음 |
| `SALES_COMMERCIAL` | O | 21,910 | 업종 차원 |
| `STORE_COMMERCIAL` | O | 77,025 | 업종 차원, API 호출 많음 |
| `SALES_ADMINISTRATION` | O | 17,044 | |
| `STORE_ADMINISTRATION` | O | 35,330 | |
| `POPULATION_COMMERCIAL` | X | 분기 행만 | 첫 분기 `API`, 이후 `ARCHIVE` |
| `FACILITY_COMMERCIAL` | X | 분기 행만 | 동일 |
| `CONSUMPTION_COMMERCIAL` | X | 분기 행만 | 소비-상권배후지. 소득 컬럼 없음 |
| `CONSUMPTION_ADMINISTRATION` | X | 분기 행만 | |
| `SALES_DISTRICT` | X | 분기 행만 | 자치구 25개 규모 |
| `STORE_DISTRICT` | X | 분기 행만 | |
| `FOOT_TRAFFIC_DISTRICT` | X | 25 | 25구 × 분기 |
| `CONSUMPTION_DISTRICT` | X | 25 | |
| `CHANGE_DISTRICT` | X | 25 | 접미사 `Qq`지만 시계열 전체 반환 |

분기 인자 **O**: `--source=API`를 분기마다 호출한다. 20241 참고 값을 `--expected-rows`로 넣고, 다르면 dry-run 실패 건수로 고친다.

분기 인자 **X**: `list_total_count`는 전 분기 합이라 `--expected-rows`로 쓰면 항상 실패한다. 첫 분기를 `API`로 받아 `dataset_release.raw_location`을 남기고, 나머지 분기는 `--source=ARCHIVE --source-file=<그 디렉터리>`로 재생한다. 서울 API는 인증키당 하루 1,000회다.

```powershell
java -jar $jar --job=facts --run-id=population-commercial-20241-001 --dataset=POPULATION_COMMERCIAL --period=20241 --source=API --spatial-version=legacy-20233 --schema-version=seoul-v1 --expected-rows=<이 분기 행 수> --source-updated-at=2024-03-31T00:00:00Z --dry-run=true

java -jar $jar --job=facts --run-id=population-commercial-20242-001 --dataset=POPULATION_COMMERCIAL --period=20242 --source=ARCHIVE --source-file=<20241 raw_location> --spatial-version=legacy-20233 --schema-version=seoul-v1 --expected-rows=<20242 행 수> --source-updated-at=2024-06-30T00:00:00Z --dry-run=true
```

권장 순서: 공간 게시 → `CHANGE_COMMERCIAL` 2024+ 분기 → 행 수가 작은 지표 → 매출·점포(호출 많음) → 분기 인자 무시 9종(`API` 1회 + `ARCHIVE`).

## 6. 실행 후 확인

Workbench에서 `quarterly-import-verify.sql` 「3) 최근 사실 적재」와 「4) 커버리지」를 본다.

- dry-run도 `dataset_release` / staging / rejected에 쓴다. `dataset_fact`와 `dataset_active_release`만 건너뛴다.
- `--dry-run=false`가 끝나야 조회 포인터가 바뀐다. 서비스 API는 아직 레거시 테이블을 읽으므로 화면은 바로 바뀌지 않는다(#279).
- Job이 `COMPLETED`가 아니면 다음 분기로 가지 않는다.

## 7. 실패와 재실행

- 같은 `run-id`로 파라미터를 고쳐 재실행하지 않는다. `expected_rows`가 요청 지문에 들어 있다.
- `unmapped_count > 0`이면 공간 버전이 `READY`인지, `--spatial-version`이 게시된 이름과 같은지 본다.
- `BATCH_JOB_INSTANCE`가 없으면 기동 단계에서 실패한다. 1절 DDL을 다시 확인한다.
- 공간 dry-run은 DB에 영역을 쓰지 않는다. 사실 적재 전에 실게시(`dry-run=false`)가 필요하다.
