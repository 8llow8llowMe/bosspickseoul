# 분기 적재 배치 사용법

`quarterly` 프로파일 JAR로 개발 DB에 공간 스냅샷과 사실 데이터를 넣는 운영 절차다. 설계·원천 계약은 [batch-service.md](batch-service.md)를 본다.

2026-09-10 기준 개발 DB 진행 상황:

| 단계 | 결과 |
| --- | --- |
| Spring Batch 메타 + `dataset_*` DDL | `bosspickseoul_commercial_dev`에 적용 |
| `--job=spatial` LEGACY 실게시 | `legacy-20233` `READY`, 영역 2,100 (25/425/1650) |
| `CHANGE_COMMERCIAL` `20241`~`20254` | 8분기 실게시. 분기당 1,650행, 거부·중복·미매핑 0 |
| 나머지 14종 | 미적재 |

사실 데이터는 **데이터셋 × 분기 한 건이 실행 단위**다. 같은 명령을 분기만 바꿔 반복하면 된다. 한 번에 전 구간을 도는 스케줄러는 없다.

세 파일이 한 묶음이다.

| 파일 | 역할 |
| --- | --- |
| `scripts/batch/quarterly-import-plan.ps1` | 데이터셋·분기를 받아 실행 명령을 만든다. DB를 건드리지 않는다 |
| `scripts/migration/quarterly-import-coverage.sql` | 15종 × 분기 중 남은 슬롯을 본다 |
| `scripts/migration/quarterly-import-verify.sql` | 방금 돌린 run 의 건수를 본다 |

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

`--source-updated-at`은 ISO-8601 분기 말 UTC다. 1분기 `03-31`, 2분기 `06-30`, 3분기 `09-30`, 4분기 `12-31`이다. 예를 들어 `20242`는 `2024-06-30T00:00:00Z`다. 자리표시를 그대로 넣으면 파싱에서 실패한다. 생성기 스크립트가 이 값을 자동으로 채운다.

대상 범위는 **`20211`~`20254`(20분기)**다. 원천은 2021년 1분기부터 주고, 2026-09-10 확인 기준 최신 분기는 `20254`다. `20261` 이후는 아직 없어 실패하는 것이 정상이며, 원천이 공개하면 같은 방식으로 이어 간다. 레거시 서비스 테이블(`20233`까지)은 이 배치가 건드리지 않는다.

### 실행 명령 만들기

명령을 손으로 만들지 않는다. 생성기가 run-id 규칙, 분기 말 시각, `API`/`ARCHIVE` 선택을 채운다. 출력만 하고 DB나 JAR을 건드리지 않는다.

```powershell
# 저장소 루트에서
$plan = ".\backend\scripts\batch\quarterly-import-plan.ps1"

# 계획만 본다 (15종 × 20분기)
& $plan -SummaryOnly

# 한 데이터셋 전 분기
& $plan -Dataset CHANGE_DISTRICT

# 한 분기 전 데이터셋을 파일로
& $plan -Period 20241 | Set-Content plan-20241.txt
```

출력에서 블록 하나를 골라 **위에서 아래로 한 줄씩** 돌린다. dry-run 로그가 `COMPLETED`가 아니면 그 아래 실게시 줄로 넘어가지 않는다.

채워야 하는 자리는 두 개다. 둘 다 `<` 를 쓰지 않는다. PowerShell이 `<` 를 예약 연산자로 막아 붙여넣기 자체가 실패하기 때문이다.

| 자리표시 | 넣을 값 |
| --- | --- |
| `REPLACE_WITH_PROBE_COUNT` | probe 실행이 알려주는 실제 행 수 (`accepted`) |
| `REPLACE_WITH_RAW_LOCATION` | 그 데이터셋 첫 분기 run 의 `dataset_release.raw_location` |

안 고치고 실행하면 숫자 파싱이나 경로에서 바로 실패한다. 조용히 잘못된 값이 들어가지는 않는다.

### 검증된 대상 (`CHANGE_COMMERCIAL`)

`20241`~`20254` 8분기가 실게시됐다. 분기당 1,650행이 모든 분기에서 같았으므로 이 데이터셋은 probe 없이 `--expected-rows=1650`을 쓴다.

```powershell
java -jar $jar --job=facts --run-id=change-commercial-20242-001 --dataset=CHANGE_COMMERCIAL --period=20242 --source=API --spatial-version=legacy-20233 --schema-version=seoul-v1 --expected-rows=1650 --source-updated-at=2024-06-30T00:00:00Z --dry-run=true
```

건수가 다르면 Job이 실패하고 `dataset_release.accepted_count`에 실제 값이 남는다. 그 값으로 **새 run-id**를 만들어 다시 돈다. 같은 run-id는 재사용하지 않는다.

## 5. 데이터셋 15종 실행 순서

상권 7종 · 행정동 3종 · 자치구 5종이다. 한 종이라도 빠지면 그 화면만 레거시에 남는다. `run_order`는 생성기와 커버리지 SQL이 쓰는 순서이며, 행 수가 작고 안전한 것부터다.

`--expected-rows`는 **그 분기 한 개의 행 수**다. 업종 차원이 있는 매출·점포는 상권 수(1,650)보다 훨씬 크다.

| 순서 | `Dataset` | 스코프 | 분기 인자 | 분기당 행 수 | 비고 |
| --- | --- | --- | --- | --- | --- |
| 1 | `CHANGE_COMMERCIAL` | 상권 | O | **1,650 (실측)** | 적재 완료 (`20241`~`20254`) |
| 2 | `CHANGE_DISTRICT` | 자치구 | X | 25 (추정) | `ARCHIVE` 흐름을 익히기 좋다 |
| 3 | `FOOT_TRAFFIC_DISTRICT` | 자치구 | X | 25 (추정) | |
| 4 | `CONSUMPTION_DISTRICT` | 자치구 | X | 25 (추정) | |
| 5 | `FOOT_TRAFFIC_COMMERCIAL` | 상권 | O | probe | 분기마다 1,648~1,649로 흔들린다 |
| 6 | `POPULATION_COMMERCIAL` | 상권 | X | probe | |
| 7 | `FACILITY_COMMERCIAL` | 상권 | X | probe | |
| 8 | `CONSUMPTION_COMMERCIAL` | 상권 | X | probe | 소비-상권배후지. 소득 컬럼 없음 |
| 9 | `CONSUMPTION_ADMINISTRATION` | 행정동 | X | probe | |
| 10 | `SALES_DISTRICT` | 자치구 | X | probe | 업종 차원 |
| 11 | `STORE_DISTRICT` | 자치구 | X | probe | 업종 차원 |
| 12 | `SALES_ADMINISTRATION` | 행정동 | O | probe (20241: 17,044) | |
| 13 | `SALES_COMMERCIAL` | 상권 | O | probe (20241: 21,910) | |
| 14 | `STORE_ADMINISTRATION` | 행정동 | O | probe (20241: 35,330) | |
| 15 | `STORE_COMMERCIAL` | 상권 | O | probe (20241: 77,025) | 가장 크다. API 호출 많음 |

「분기당 행 수」의 뜻:

- **실측** — 게시된 run 으로 확인했다. probe 없이 그 값을 쓴다.
- **추정** — 자치구 25개 × 분기로 계산했다. 그 값으로 넣고 틀리면 dry-run 이 실제 건수를 알려준다.
- **probe** — 분기마다 다르다. `--expected-rows=1`로 한 번 돌려 실패 메시지의 `accepted`를 읽고 그 값으로 다시 돈다. `20241` 괄호 값은 샘플 키 `list_total_count`이며 그 분기에만 쓴다.

분기 인자 **O** (6종): `--source=API`를 분기마다 호출한다.

분기 인자 **X** (9종): `list_total_count`가 전 분기 합이라 그대로 쓰면 항상 실패한다. 첫 분기를 `API`로 받아 `dataset_release.raw_location`을 남기고, 나머지 분기는 `--source=ARCHIVE --source-file=<그 디렉터리>`로 재생한다. 22분기를 매번 API로 받으면 약 4,300회지만 재생하면 약 200회다. 서울 API는 인증키당 하루 1,000회다.

```powershell
# 첫 분기만 API
java -jar $jar --job=facts --run-id=population-commercial-20241-001 --dataset=POPULATION_COMMERCIAL --period=20241 --source=API --spatial-version=legacy-20233 --schema-version=seoul-v1 --expected-rows=1 --source-updated-at=2024-03-31T00:00:00Z --dry-run=true

# 이후 분기는 위 run 의 raw_location 재생
java -jar $jar --job=facts --run-id=population-commercial-20242-001 --dataset=POPULATION_COMMERCIAL --period=20242 --source=ARCHIVE --source-file=REPLACE_WITH_RAW_LOCATION --spatial-version=legacy-20233 --schema-version=seoul-v1 --expected-rows=1 --source-updated-at=2024-06-30T00:00:00Z --dry-run=true
```

첫 분기의 probe 가 원본 페이지를 이미 보관하므로, 그 run 의 `raw_location`을 이후 분기가 그대로 재생한다. probe 를 위해 API를 두 번 부르지 않는다.

`raw_location`은 이렇게 읽는다.

```sql
SELECT run_id, raw_location FROM dataset_release
 WHERE dataset = 'POPULATION_COMMERCIAL' AND period_code = '20241'
 ORDER BY acquired_at DESC;
```

## 6. 실행 후 확인

- 방금 돌린 run 의 건수: `quarterly-import-verify.sql` 「3) 최근 사실 적재」
- 남은 슬롯: `quarterly-import-coverage.sql` 「1) 남은 대상」 — `TODO` 행이 다음에 돌릴 대상이다
- 데이터셋별 진행률과 스코프 누락: 같은 파일 「2)」·「3)」

주의할 점:

- dry-run도 `dataset_release` / staging / rejected에 쓴다. `dataset_fact`와 `dataset_active_release`만 건너뛴다.
- `--dry-run=false`가 끝나야 조회 포인터가 바뀐다. 서비스 API는 아직 레거시 테이블을 읽으므로 화면은 바로 바뀌지 않는다(#279).
- Job이 `COMPLETED`가 아니면 다음 분기로 가지 않는다.

## 7. 실패와 재실행

- 같은 `run-id`로 파라미터를 고쳐 재실행하지 않는다. `expected_rows`가 요청 지문에 들어 있다.
- `unmapped_count > 0`이면 공간 버전이 `READY`인지, `--spatial-version`이 게시된 이름과 같은지 본다.
- `BATCH_JOB_INSTANCE`가 없으면 기동 단계에서 실패한다. 1절 DDL을 다시 확인한다.
- 공간 dry-run은 DB에 영역을 쓰지 않는다. 사실 적재 전에 실게시(`dry-run=false`)가 필요하다.
