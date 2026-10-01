# 분기 적재 배치 사용법

`quarterly` 프로파일 JAR로 개발 DB에 공간 스냅샷과 사실 데이터를 넣는 운영 절차다. 설계·원천 계약은 [batch-service.md](batch-service.md)를 본다.

**처음 돌리면 [batch-quarterly-import-walkthrough.md](batch-quarterly-import-walkthrough.md) 를 먼저 본다.** 그쪽은 명령을 순서대로 따라가는 절차고, 이 문서는 그 절차가 왜 그렇게 생겼는지와 원천 계약을 다룬다.

2026-09-10 기준 개발 DB 진행 상황:

| 단계 | 결과 |
| --- | --- |
| Spring Batch 메타 + `dataset_*` DDL | `bosspickseoul_commercial_dev`에 적용 |
| `--job=spatial` LEGACY 실게시 | `legacy-20233` `READY`, 영역 2,100 (25/425/1650) |
| `CHANGE_COMMERCIAL` `20241`~`20261` | `dataset_fact` 실게시. typed 이관(`--job=project`)은 분기마다 별도 |
| 나머지 14종 | `dataset_fact` 미적재. `--job=project` 코드는 15종 모두 받는다 |

사실 데이터는 **데이터셋 × 분기 한 건이 실행 단위**다. 같은 명령을 분기만 바꿔 반복하면 된다. 한 번에 전 구간을 도는 스케줄러는 없다.

**자동 최신화와의 경계 (이슈 #445).** 상시 batch-service 가 켜져 있으면(`BATCH_DATASET_REFRESH_ENABLED=true`) 매일 05:00 에 **마지막 게시 분기 다음 분기부터 원천 최신까지**만 같은 Job 으로 적재한다. 그보다 앞의 빈 분기(백필), 첫 분기(`NO_BASELINE`), 공간 버전 교체 재게시, `IMPLAUSIBLE` 로 멈춘 분기는 이 문서의 수동 절차가 맡는다. 자동 run-id 는 `auto-` 로 시작하므로 수동 run-id(`<dataset>-<분기>-<attempt>`)와 겹치지 않는다. 같은 슬롯을 수동으로 먼저 게시하면 자동 쪽은 다음 분기로 넘어간다. 자동 쪽이 `IMPLAUSIBLE`·dry-run 실패로 멈춘 분기는 commercial `dataset_refresh_state` 의 `last_fetch_raw_location`(이미 받은 보관본)을 `--source=ARCHIVE --source-file=...` 로 재생하면 API 를 다시 쓰지 않는다(보관본은 `batch-raw` 볼륨이라 `batch-service-job` 에서 같은 경로로 읽힌다). 자동 최신화는 `automation-from`(기본 `20234`) 이후 분기만 게시·재이관하므로 20211~20233 레거시 분기의 게시·이관은 계속 수동이다. 마지막 게시가 20232 이하인 데이터셋은 자동 쪽이 `BELOW_AUTOMATION_FLOOR` 로 건너뛰니 먼저 수동으로 20233 까지 채운다. 절차·판단 순서는 [batch-service.md](batch-service.md) 「분기 적재 자동 최신화」.

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
3. `backend/scripts/migration/change-commercial-spatial-version.sql` — `change_commercial.spatial_version` (이관 Job 전)
4. `backend/scripts/migration/fact-tables-spatial-version.sql` — 나머지 14개 팩트 테이블 `spatial_version` + `income_commercial` 소득 컬럼 NULL (이관 Job 전)
5. `backend/scripts/migration/income-administration-expense-detail-columns.sql` — `income_administration` 소비 세부 10항목 (이슈 #415, 아래 「9. 행정동 소비 세부 항목 재이관」 전)
6. `backend/scripts/migration/pension-income-district-table.sql` — `pension_income_district` 국민연금 자치구 평균소득 (이슈 #415 2차, 아래 「11. 국민연금 자치구 평균소득 적재」 전)

PowerShell에서 `mysql ... < file.sql`은 `<`가 예약 연산자라 실패한다. DDL은 Workbench가 맞다.

적용 후 `backend/scripts/migration/quarterly-import-verify.sql`의 「1) 선행 테이블」이 8행이어야 한다. `BATCH_*`는 `IF NOT EXISTS`가 없어서 두 번 실행하면 실패한다.

`bosspickseoul_commercial_prod`는 같은 서버에 있다. 스키마 이름을 실행 전에 확인한다.

## 2. JAR과 환경변수

비밀번호·API 키는 저장소에 적지 않는다. 로컬에서 돌릴 때는 터미널에서만 넣는다. 개발서버 Docker 호스트에서 돌릴 때는 Vault 가 만든 `.env.runtime` 을 쓴다 — 아래 「10. 개발서버에서 실행」.

이 절과 3~9·11절의 `java -jar $jar ...` 는 로컬 JAR 기준이다. 개발서버에서는 같은 옵션을 `docker compose run ... batch-service-job` 뒤에 그대로 붙인다.

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
- 기본 원본 보관 경로는 `backend/data/raw`다. 커밋하지 않는다. 개발서버 컨테이너는 named volume 의 `/app/data/raw` 다(10절).
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

대상 범위는 **`20211`~`20261`(21분기)**다. 원천은 2021년 1분기부터 주고, 2026-09-11 기준 최신 분기는 `20261`이다. 그 이후 분기는 아직 없어 실패하는 것이 정상이며, 원천이 공개하면 `quarterly-import-coverage.sql`의 `quarter_range`와 `quarterly-import-plan.ps1`의 `$allPeriods`에 분기를 추가해 이어 간다. 레거시 서비스 테이블(`20233`까지)은 이 배치가 건드리지 않는다.

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
| `REPLACE_WITH_RAW_LOCATION` | 재생할 run 의 `dataset_release.raw_location`. 어느 run 인지는 그 줄 바로 위 주석이 SQL 로 알려준다 |

`-ReplayPublish` 를 주면 한 슬롯에서 API 를 한 번만 부른다. 처음 받은 run 이 원본 페이지를 보관하므로 뒤따르는 run 을 그 디렉터리 재생으로 찍는다. 행 수를 아는 데이터셋은 API 2회가 1회로, probe 가 붙는 데이터셋은 3회가 1회로 준다. 이미 `ARCHIVE` 인 줄은 바뀌지 않는다. 서울 API 가 인증키당 하루 1,000회라 `STORE_COMMERCIAL` 같은 큰 데이터셋에서 차이가 크다.

안 고치고 실행하면 숫자 파싱이나 경로에서 바로 실패한다. 조용히 잘못된 값이 들어가지는 않는다.

### 검증된 대상 (`CHANGE_COMMERCIAL`)

`20241`~`20261` 분기가 `dataset_fact`에 실게시됐다. 실제 게시 현황은 `quarterly-import-coverage.sql`이 정본이다. 분기당 1,650행이 모든 분기에서 같았으므로 이 데이터셋은 probe 없이 `--expected-rows=1650`을 쓴다. 화면 조회 정본은 아래 「8. typed 이관」을 한 뒤에 `change_commercial` 컬럼이다.

```powershell
java -jar $jar --job=facts --run-id=change-commercial-20242-001 --dataset=CHANGE_COMMERCIAL --period=20242 --source=API --spatial-version=legacy-20233 --schema-version=seoul-v1 --expected-rows=1650 --source-updated-at=2024-06-30T00:00:00Z --dry-run=true
```

건수가 다르면 Job이 실패하고 `dataset_release.accepted_count`에 실제 값이 남는다. 그 값으로 **새 run-id**를 만들어 다시 돈다. 같은 run-id는 재사용하지 않는다.

## 5. 데이터셋 15종 실행 순서

상권 7종 · 행정동 3종 · 자치구 5종이다. 한 종이라도 빠지면 그 화면만 레거시에 남는다. `run_order`는 생성기와 커버리지 SQL이 쓰는 순서이며, 행 수가 작고 안전한 것부터다.

`--expected-rows`는 **그 분기 한 개의 행 수**다. 업종 차원이 있는 매출·점포는 상권 수(1,650)보다 훨씬 크다.

| 순서 | `Dataset` | 스코프 | 분기 인자 | 분기당 행 수 | 비고 |
| --- | --- | --- | --- | --- | --- |
| 1 | `CHANGE_COMMERCIAL` | 상권 | O | **1,650 (실측)** | 적재 완료 (`20241`~`20261`) |
| 2 | `CHANGE_DISTRICT` | 자치구 | X | 25 (추정) | `ARCHIVE` 흐름을 익히기 좋다 |
| 3 | `FOOT_TRAFFIC_DISTRICT` | 자치구 | X | 25 (추정) | |
| 4 | `CONSUMPTION_DISTRICT` | 자치구 | X | 25 (추정) | |
| 5 | `FOOT_TRAFFIC_COMMERCIAL` | 상권 | O | probe | 분기마다 1,648~1,649로 흔들린다 |
| 6 | `POPULATION_COMMERCIAL` | 상권 | X | probe | |
| 7 | `FACILITY_COMMERCIAL` | 상권 | X | probe | |
| 8 | `CONSUMPTION_COMMERCIAL` | 상권 | X | — | **`20234` 까지만 게시. 이후 분기는 원천이 전부 0이라 적재하지 않는다** |
| 9 | `CONSUMPTION_ADMINISTRATION` | 행정동 | X | probe | 총액 + 세부 10항목. 게시된 10개 분기는 **재이관만** 필요하다 (아래 「9. 행정동 소비 세부 항목 재이관」) |
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
- `--dry-run=false`가 끝나야 `dataset_active_release` 포인터가 바뀐다. 화면은 아래 「8. typed 이관」이 끝나야 해당 팩트 테이블을 본다. JSON 조회 경로는 없다.
- Job이 `COMPLETED`가 아니면 다음 분기로 가지 않는다.

## 7. 실패와 재실행

- 같은 `run-id`로 파라미터를 고쳐 재실행하지 않는다. `expected_rows`가 요청 지문에 들어 있다.
- `unmapped_count > 0`이면 공간 버전이 `READY`인지, `--spatial-version`이 게시된 이름과 같은지 본다.
- `BATCH_JOB_INSTANCE`가 없으면 기동 단계에서 실패한다. 1절 DDL을 다시 확인한다.
- 공간 dry-run은 DB에 영역을 쓰지 않는다. 사실 적재 전에 실게시(`dry-run=false`)가 필요하다.

## 8. typed 이관 (`--job=project`)

`dataset_fact`는 원천 보관이다. 조회는 기존 팩트 테이블 컬럼만 읽는다. 선행으로 `change-commercial-spatial-version.sql`과 `fact-tables-spatial-version.sql`을 적용한다.

이미 게시한 데이터셋×분기마다 한 번 돌린다. 같은 `(period_code, spatial_version)` 행을 지우고 다시 넣는다. 15종 모두 받는다.

```powershell
java -jar $jar --job=project --run-id=project-change-commercial-20241-001 --dataset=CHANGE_COMMERCIAL --period=20241 --spatial-version=legacy-20233 --dry-run=true
java -jar $jar --job=project --run-id=project-change-commercial-20241-002 --dataset=CHANGE_COMMERCIAL --period=20241 --spatial-version=legacy-20233 --dry-run=false

java -jar $jar --job=project --run-id=project-foot-traffic-commercial-20241-001 --dataset=FOOT_TRAFFIC_COMMERCIAL --period=20241 --spatial-version=legacy-20233 --dry-run=true
java -jar $jar --job=project --run-id=project-foot-traffic-commercial-20241-002 --dataset=FOOT_TRAFFIC_COMMERCIAL --period=20241 --spatial-version=legacy-20233 --dry-run=false
```

나머지 데이터셋도 `--dataset`만 바꿔 같은 순서로 돈다. `SALES_*` / `STORE_*` / `POPULATION_COMMERCIAL` / `FACILITY_COMMERCIAL` / `CONSUMPTION_*` / `CHANGE_DISTRICT`.

15종 x 전 분기를 손으로 조합하지 않는다. 명령은 생성기가 만든다.

```powershell
.\quarterly-import-plan.ps1 -Job project | Set-Content project.txt
.\quarterly-import-plan.ps1 -Job project -Dataset SALES_COMMERCIAL -Period 20261
```

`runId`가 유일한 식별 job 파라미터다. dry-run과 게시는 run-id를 다르게 쓴다(`-001` / `-002`). 같은 run-id로 두 번 돌리면 Spring Batch가 두 번째 실행을 거부한다.

확인:

```sql
SELECT period_code, spatial_version, COUNT(*) AS rows_total
  FROM change_commercial
 GROUP BY period_code, spatial_version
 ORDER BY period_code;

SELECT period_code, commercial_code, change_indicator_code, average_opened_months
  FROM change_commercial
 WHERE commercial_code = '3001491' AND spatial_version = 'legacy-20233'
 ORDER BY period_code;

SELECT period_code, spatial_version, COUNT(*) AS rows_total
  FROM foot_traffic_commercial
 GROUP BY period_code, spatial_version
 ORDER BY period_code;
```

남은 슬롯과 이관 여부는 `quarterly-import-coverage.sql` 「5) typed 이관 진행률」로 본다. 아무 행도 안 나오면 다 끝난 것이고, 뜨는 행이 남은 상태다.

- `NOT_PROJECTED` — 적재만 되고 이관이 안 돌았다. 화면에 아직 안 나온다.
- `ROW_COUNT_MISMATCH` — 팩트 테이블 행 수가 게시한 `accepted_count` 와 다르다. 레거시 행이 그대로 남아 있거나 이관이 중간에 끊긴 경우다. 그 슬롯을 다시 이관한다.

행이 있다는 것만으로 이관 완료로 보면 안 된다. `fact-tables-spatial-version.sql` 의 DEFAULT 때문에 `20211`~`20233` 구간은 이관을 한 번도 안 돌려도 `legacy-20233` 행이 이미 있다. 그래서 5)는 건수를 대조한다.

`service_type`은 원천 payload에 없는 파생 컬럼이라 이관이 `service_category`에서 `service_code`로 찾아 채운다. `service_category`에 없는 새 업종 코드는 NULL로 남고, 이관 로그가 미해석 건수와 코드 샘플을 남긴다. NULL이 남으면 자치구 업종 Top-N이 그만큼 비고 상권 동종업종 피어 조회에서 그 업종이 빠지므로, `quarterly-import-coverage.sql` 「6) service_type 미해석 점검」으로 확인하고 빠진 코드를 `service_category`에 넣은 뒤 그 슬롯을 다시 이관한다.

`CONSUMPTION_COMMERCIAL`은 소득뿐 아니라 **소비까지 원천이 끊겼다.** 2026-09-15 전수 실측 기준 `20241` 분기부터 모든 행의 모든 지출 항목이 0이고, `20211`~`20234`도 22개 분기 값이 전부 같은 스냅샷 하나다(근거: [batch-service.md](batch-service.md) 「2024년 이후 컬럼 차이」). 그래서 **`20234` 이후 분기는 게시하지 않는다.** 이미 게시된 `20241`~`20261` 슬롯의 0 행은 화면에서 "0원"으로 보이므로 정리 대상이다.

게시 차단은 요청 객체 생성 시점에 걸린다. `--job=facts`(`ImportRequest`)와 `--job=project`(`ProjectionRequest`) **양쪽 모두** `20234` 이후 분기를 거부하고, `--dry-run=true` 도 똑같이 막힌다(요청을 만들지 못하므로 Job 이 시작되지 않는다). 실제로 `income_commercial` 에 INSERT 하는 것은 `--job=project` 쪽이라 이관만 뚫려 있으면 이미 스테이징된 릴리스를 재투영해 0 행이 다시 게시된다. 이미 게시된 0 행을 지우는 경로는 배치에 없다 — **수동 SQL 로 정리한다.**

`monthly_average_income_amount` / `income_bracket_code`는 조회 도메인에서 제거했다. DB 컬럼은 남아 있지만 채우지 않고 읽지도 않는다.

컬럼 DDL만으로는 화면이 바뀌지 않는다. 게시한 분기마다 `--job=project`를 돌린 뒤 commercial-service를 배포한다.

## 9. 행정동 소비 세부 항목 재이관 (이슈 #415)

`income_administration` 이 총액만 들고 있던 것을 세부 10항목까지 넓혔다. 상권 소비가 끊겨 행정동 소비가 대체 원천이 되므로 총액만으로는 항목별 화면을 채울 수 없다. 컬럼 구성과 이름을 정한 근거는 [batch-service.md](batch-service.md) 「2024년 이후 컬럼 차이」다.

### API 재호출은 필요 없다 — 재적재가 아니라 재이관이다

**이미 게시된 `dataset_fact` payload 에 세부 10항목이 전부 들어 있다.** 개발 DB 에서 `CONSUMPTION_ADMINISTRATION` `20261` 행정동 `11110515` 의 payload 키를 뽑아 확인했다(2026-09-17).

```text
EXPNDTR_TOTAMT, FDSTFFS_EXPNDTR_TOTAMT, CLTHS_FTWR_EXPNDTR_TOTAMT, LVSPL_EXPNDTR_TOTAMT,
MCP_EXPNDTR_TOTAMT, TRNSPORT_EXPNDTR_TOTAMT, EDC_EXPNDTR_TOTAMT, PLESR_EXPNDTR_TOTAMT,
LSR_CLTUR_EXPNDTR_TOTAMT, ETC_EXPNDTR_TOTAMT, FD_EXPNDTR_TOTAMT
```

`requiredMetrics` 가 총액만 요구하던 시점에 게시한 릴리스인데도 11개가 그대로 있다. `requiredMetrics` 는 **행 검증의 필수 항목**이지 payload 에 담을 항목의 목록이 아니며, staging 은 원천 행의 컬럼을 전부 보관하기 때문이다([batch-service.md](batch-service.md) 의 "레거시가 버린 컬럼이 payload JSON 에 그대로 남는다" 가 이 데이터셋에도 해당한다).

**운영 지식으로 남길 것**: 요구 필드만 늘리는 변경은 `--source=API` / `--source=ARCHIVE` 재적재가 아니라 **`--job=project` 재이관으로 끝난다.** 서울 API 하루 1,000회 제한을 쓸 이유가 없다. 원천이 주는 컬럼 자체가 늘어난 경우에만 재적재가 필요하다.

### 대상 분기

`dataset_release` 에 게시된 10개 분기다.

```text
20234 20241 20242 20243 20244 20251 20252 20253 20254 20261
```

`20211`~`20233` 은 이 데이터셋으로 게시된 적이 없다. 그 구간은 상권 네이티브 소비(`income_commercial`)가 살아 있어 행정동 대체 원천이 필요 없으므로 이번 범위에서 적재하지 않는다. 필요해지면 그때 `--job=facts` 로 적재한다.

### 실행

선행으로 `scripts/migration/income-administration-expense-detail-columns.sql` 을 적용한다(1절 5번). 컬럼이 없으면 이관 INSERT 가 `Unknown column` 으로 실패한다.

명령은 생성기가 만든다. 파라미터는 이번 변경으로 손볼 것이 없다.

```powershell
$plan = ".\backend\scripts\batch\quarterly-import-plan.ps1"
& $plan -Job project -Dataset CONSUMPTION_ADMINISTRATION `
        -Period 20234,20241,20242,20243,20244,20251,20252,20253,20254,20261 |
    Set-Content project-consumption-administration.txt
```

출력은 분기마다 dry-run 한 줄과 실게시 한 줄이다. 위에서 아래로 한 줄씩 돌리고, dry-run 로그가 `COMPLETED` 가 아니면 그 아래 줄로 넘어가지 않는다.

```powershell
java -jar $jar --job=project --run-id=project-consumption-administration-20234-001 --dataset=CONSUMPTION_ADMINISTRATION --period=20234 --spatial-version=legacy-20233 --dry-run=true
java -jar $jar --job=project --run-id=project-consumption-administration-20234-002 --dataset=CONSUMPTION_ADMINISTRATION --period=20234 --spatial-version=legacy-20233 --dry-run=false
```

**이 슬롯을 전에 한 번 이관했다면 `-001`/`-002` run-id 가 이미 쓰였다.** `runId` 가 유일한 식별 job 파라미터라 Spring Batch 가 두 번째 실행을 거부한다. 그때는 `-Attempt 3` 을 줘 `-003`/`-004` 로 만든다.

이관은 같은 `(period_code, spatial_version)` 행을 지우고 다시 넣으므로 재실행이 안전하다.

### 확인

세부 컬럼은 재이관 전까지 NULL 이다. `quarterly-import-coverage.sql` 5)는 **건수만** 보므로 NULL 인 채로도 통과한다. 값이 들어왔는지는 마이그레이션 스크립트 끝의 확인 SQL 로 본다.

```sql
SELECT period_code,
       COUNT(*)                              AS rows_total,
       COUNT(grocery_expense_amount)         AS detail_filled,
       COUNT(leisure_culture_expense_amount) AS leisure_culture_filled
  FROM income_administration
 WHERE spatial_version = 'legacy-20233'
 GROUP BY period_code
 ORDER BY period_code;
```

`rows_total = detail_filled` 인 분기가 재이관을 마친 분기다. 총액과 세부 10항목 합의 차이가 0인지도 같은 스크립트의 두 번째 SQL 로 확인한다 — 원천에서 차이가 0인 것을 2026-09-17 전수 호출로 확인했으므로, 여기서 어긋나면 매핑이 틀린 것이다.

컬럼 DDL과 재이관만으로는 화면이 바뀌지 않는다. commercial-service 조회 도메인은 이 컬럼들을 읽어 상권 소비의 대체 출처로 쓴다 — 상권 네이티브가 없으면 소속 행정동의 세부 10항목으로 대체하고 `provenance` 로 그 사실을 응답에 싣는다(`CommercialExpenseProvenanceProcessor`). 행정동 leg 의 총액도 세부가 있으면 항목합을 쓴다.

## 10. 개발서버에서 실행 (이슈 #440)

로컬 JAR 대신 개발서버 Docker 호스트에서 **1회 실행하고 끝나는 컨테이너**로 돌린다. 서비스는 `docker-compose-batch-service.yml` 의 `batch-service-job` 이다. 옵션과 절차(dry-run → 새 run-id 로 실게시)는 3~9·11절과 같고, 실행 수단만 다르다.

### 선행 조건

- Jenkins 로 `batch-service` 를 **dev 배포한 적이 있어야 한다.** 배포가 `bosspickseoul-batch-service:latest` 이미지를 빌드하고, 서비스 디렉터리에 `.env.runtime`(Vault 렌더링, 권한 600)과 compose 파일을 둔다. `batch-service-job` 은 그 이미지를 그대로 쓰고 빌드하지 않는다. 코드를 바꿨으면 먼저 배포한다.
- 1절 DDL 이 대상 스키마에 적용돼 있어야 한다.
- `batch-service-job` 은 `profiles: ["job"]` 이라 Jenkins 의 `up -d --build --remove-orphans batch-service-dev` 에는 뜨지 않는다. 정의된 서비스이므로 `--remove-orphans` 가 지우지도 않는다.

서버 디렉터리는 Jenkins 배포 경로 규칙(`Jenkinsfile.backend-common.groovy` 의 `SERVICE_DIR`)을 따른다.

```bash
cd ~/<DEPLOY_BASE_PARENT>/<PROJECT_SLUG>/<DEPLOY_APP_DIR>/service/batch-service
ls .env.runtime docker-compose-batch-service.yml
```

### 실행 명령

compose 프로젝트명은 Jenkins 와 같은 `bosspickseoul-batch-service` 를 쓴다. 잡 파라미터는 **환경변수(`-e BATCH_QUARTERLY_*`)** 와 **CLI 인수** 중 편한 쪽으로 넘긴다. 둘 다 주면 CLI 가 이긴다.

```bash
# 환경변수로 넘기기
docker compose -p bosspickseoul-batch-service --env-file .env.runtime -f docker-compose-batch-service.yml --profile job \
  run --rm \
  -e BATCH_ALLOWED_SCHEMAS=bosspickseoul_commercial_dev \
  -e BATCH_QUARTERLY_JOB=project \
  -e BATCH_QUARTERLY_RUN_ID=project-consumption-administration-20234-001 \
  -e BATCH_QUARTERLY_DATASET=CONSUMPTION_ADMINISTRATION \
  -e BATCH_QUARTERLY_PERIOD=20234 \
  -e BATCH_QUARTERLY_SPATIAL_VERSION=legacy-20233 \
  -e BATCH_QUARTERLY_DRY_RUN=true \
  batch-service-job
echo $?

# 같은 실행을 CLI 인수로 넘기기 — 3~9·11절 명령의 `java -jar $jar` 뒤 옵션을 그대로 붙인다
docker compose -p bosspickseoul-batch-service --env-file .env.runtime -f docker-compose-batch-service.yml --profile job \
  run --rm -e BATCH_ALLOWED_SCHEMAS=bosspickseoul_commercial_dev \
  batch-service-job --job=project --run-id=project-consumption-administration-20234-001 \
  --dataset=CONSUMPTION_ADMINISTRATION --period=20234 --spatial-version=legacy-20233 --dry-run=true
echo $?
```

- `SPRING_PROFILES_ACTIVE` 는 compose 가 `quarterly` 로 고정한다. 상시 컨테이너용 `.env.runtime` 의 값을 쓰지 않는다.
- `BATCH_QUARTERLY_DRY_RUN` 을 빼거나 빈 값으로 주면 기본값 `true` 다. 실게시는 `false` 를 명시해야 한다. 빈 환경변수는 미설정으로 본다.
- 같은 옵션을 CLI 로 두 번 주면 거부한다(`Option must occur once`).
- `BATCH_QUARTERLY_*` 와 `BATCH_ALLOWED_SCHEMAS` 는 compose 가 선언하지 않는다. 선언하지 않은 키는 Vault(`.env.runtime`)에 있어도 컨테이너로 가지 않으므로 **실행마다 `-e` 나 CLI 로만** 들어온다.
- `-e` 는 compose 파일의 `${...}` 치환에 끼지 않는다. 컨테이너 환경변수를 직접 넣거나 덮어쓸 뿐이다. 그래서 `-e` 에는 컨테이너가 읽는 이름(`BATCH_ALLOWED_SCHEMAS`, `BATCH_DB_URL`)을 그대로 쓴다.
- prod 호스트에서는 돌리지 않는다. 같은 compose 파일이 배포되지만 `BatchTargetGuard` 가 `prod` 스키마를 거부하고, 관측 라벨도 `dev` 로 고정돼 있다.
- 로컬 JAR(2절)도 같은 env 경로를 탄다. PowerShell 세션에 `BATCH_QUARTERLY_*` 가 남아 있으면 그 값이 잡 파라미터가 된다 — 특히 `BATCH_QUARTERLY_DRY_RUN=false` 가 남으면 `--dry-run` 을 뺀 실행이 실게시가 된다. 로컬에서는 이 변수를 쓰지 말고, 썼다면 `Remove-Item Env:BATCH_QUARTERLY_*` 로 지운다.

### 변수

잡 파라미터:

| 환경변수 | CLI 옵션 | 기본값 |
| --- | --- | --- |
| `BATCH_QUARTERLY_JOB` | `--job` | `facts` (`facts` / `spatial` / `project` / `pension-income`) |
| `BATCH_QUARTERLY_RUN_ID` | `--run-id` | 필수 |
| `BATCH_QUARTERLY_DRY_RUN` | `--dry-run` | `true` |
| `BATCH_QUARTERLY_DATASET` | `--dataset` | facts·project 필수 |
| `BATCH_QUARTERLY_PERIOD` | `--period` | facts·project 필수 |
| `BATCH_QUARTERLY_SPATIAL_VERSION` | `--spatial-version` | 필수 |
| `BATCH_QUARTERLY_SCHEMA_VERSION` | `--schema-version` | `seoul-v1` |
| `BATCH_QUARTERLY_SOURCE` | `--source` | facts 필수, spatial 은 `GEOJSON` |
| `BATCH_QUARTERLY_SOURCE_FILE` | `--source-file` | 없음 (pension-income 필수) |
| `BATCH_QUARTERLY_SOURCE_UPDATED_AT` | `--source-updated-at` | facts·pension-income 필수 |
| `BATCH_QUARTERLY_EXPECTED_ROWS` | `--expected-rows` | facts·pension-income 필수 |
| `BATCH_QUARTERLY_CHARSET` | `--charset` | `UTF-8` (pension-income 은 `MS949` 를 명시) |

환경변수는 Spring relaxed binding 으로 `batch.quarterly.<옵션>` 에 붙는다(`QuarterlyImportRunner`).

대상·원천:

| 변수 | 넣는 곳 | 설명 |
| --- | --- | --- |
| `BATCH_DB_URL` | compose 가 `COMMERCIAL_DB_URL` 로 채움 | 대상 DB. 다른 스키마면 `-e BATCH_DB_URL=...` 로 덮어쓴다. 상시 컨테이너의 `BATCH_DB_URL`(district)은 쓰지 않는다 |
| `BATCH_ALLOWED_SCHEMAS` | 실행마다 `-e` | 비면 `BatchTargetGuard` 가 거부한다. 상시 컨테이너의 값(정책 수집용)을 물려받지 않는다 |
| `SEOUL_OPEN_DATA_API_KEY` | Vault | `--source=API` 사실 적재만 쓴다. 열린데이터광장 키 |
| `BATCH_LEGACY_SPATIAL_SCHEMA` | Vault (선택) | `--job=spatial --source=LEGACY` 만 쓴다. 개발은 `bosspickseoul_district_dev` |
| `BATCH_SERVICE_MEM_LIMIT_JOB` | Vault (선택) | 컨테이너 메모리 상한. 기본 `1g` |

Vault(`kv/<PROJECT_SLUG>/backend/dev/env`)에 키를 추가했으면 **batch-service 를 다시 배포해야** `.env.runtime` 에 반영된다. 값은 이 문서에 적지 않는다.

볼륨:

| 컨테이너 경로 | 볼륨 | 용도 |
| --- | --- | --- |
| `/app/data/raw` | `bosspickseoul-batch-service-raw` | `BATCH_RAW_DIRECTORY`. `--source=API` 가 받은 원본 페이지. `dataset_release.raw_location` 이 이 경로를 가리킨다 |
| `/app/data/input` | `bosspickseoul-batch-service-input` | `--source=CSV` / `--source=GEOJSON` 입력 파일 |

서비스 디렉터리 아래 bind mount 를 쓰지 않는 이유: Jenkins 배포가 서비스 디렉터리를 `rsync --delete` 로 덮어써서 그 안의 파일이 배포마다 지워진다. `raw_location` 이 가리키는 원본이 사라지면 5절의 `ARCHIVE` 재생이 실패한다.

- `raw_location` 은 **그 원본을 받은 환경에서만** 재생된다. 로컬 JAR 로 받은 run 의 `raw_location`(로컬 경로)은 컨테이너에서 읽을 수 없고, 그 반대도 같다. 한 데이터셋의 첫 분기 API 와 나머지 분기 ARCHIVE 를 같은 환경에서 돈다.
- 볼륨을 `docker volume rm` 하면 원본이 사라진다. 지우기 전에 `ARCHIVE` 재생이 남았는지 확인한다.

입력 파일은 서비스 디렉터리 밖(예: `~/batch-input`)에 두고 볼륨으로 옮긴다.

```bash
docker run --rm -v bosspickseoul-batch-service-input:/in -v ~/batch-input:/src:ro busybox cp /src/areas.geojson /in/
docker run --rm -v bosspickseoul-batch-service-input:/in busybox ls -l /in
```

이후 `--source-file=/app/data/input/areas.geojson` 으로 넘긴다. 한 번만 쓸 파일이면 `run --rm -v ~/batch-input/areas.geojson:/app/data/input/areas.geojson:ro ...` 로 바로 붙여도 된다.

### 종료 코드와 로그

- `docker compose run` 은 컨테이너 종료 코드를 그대로 돌려준다. Job 이 `COMPLETED` 면 `0`, 그 외(실패·검증 거부·가드 거부)는 `1` 이다. `echo $?` 가 `0` 이 아니면 다음 줄(실게시)로 넘어가지 않는다.
- 로그는 터미널로만 나온다. `--rm` 이라 끝나면 컨테이너와 `docker logs` 가 함께 사라진다. 남기려면 `... batch-service-job 2>&1 | tee run-<run-id>.log` 로 받고, 종료 코드는 `echo ${PIPESTATUS[0]}` 로 본다.
- 건수 확인은 6절 SQL 로 한다. 컨테이너 안에서 할 일은 없다.

## 11. 국민연금 자치구 평균소득 적재 (이슈 #415)

상권 소득이 끊긴 자리의 자치구 단위 대체값을 `pension_income_district` 에 넣는다. 원천 사실·검증 규칙·쓰기 방식은 [batch-service.md](batch-service.md) 「국민연금 자치구 평균소득 적재」다. **연 1회 수동 작업이다.** 자동 최신화·`quarterly-import-plan.ps1`·`quarterly-import-coverage.sql` 은 이 적재를 모른다.

### 선행

- 1절 6번 `pension-income-district-table.sql` 을 commercial 스키마에 적용한다
- `--spatial-version` 으로 줄 공간 스냅샷(`legacy-20233`)이 `READY` 여야 한다(3절). 자치구 이름 → 코드를 여기서 읽는다

### 파일 받기

공공데이터포털 [국민연금공단_자격 시군구 신고 평균소득월액](https://www.data.go.kr/data/3046077/fileData.do) 에서 브라우저로 CSV 를 내려받는다. 매년 12월 기준으로 연 1회 갱신된다. 포털의 내부 다운로드 요청은 캡차 제한이 걸린 경로라 스크립트로 받지 않는다.

- **파일을 열어 다시 저장하지 않는다.** 원본은 MS949 다. 엑셀로 저장하면 문자셋·따옴표가 바뀌어 checksum 이 달라지고, UTF-8 로 바뀌면 `--charset` 도 달라진다
- `--source-updated-at` 은 포털 메타의 작성 시점이다. 2024-12-31 기준 파일은 `2025-01-31T00:00:00Z`
- `--expected-rows` 는 **서울 행 수** = 25 × 파일 안 기준년월 수다. 2024-12-31 기준 파일은 기준년월 5개(`2020-12`~`2024-12`)라 `125`. 전국 행 수(1,150)가 아니다

개발서버에서는 10절의 입력 볼륨으로 옮긴다.

```bash
docker run --rm -v bosspickseoul-batch-service-input:/in -v ~/batch-input:/src:ro busybox cp /src/pension_20241231.csv /in/
```

### 실행

dry-run 으로 확인한 뒤 **새 run-id** 로 실게시한다(같은 run-id 는 Spring Batch 가 다시 띄우지 않는다). run-id 는 `pension-income-<파일 기준일>-<attempt>` 로 쓴다.

```powershell
java -jar $jar --job=pension-income --run-id=pension-income-20241231-001 --source-file=<파일> --charset=MS949 --spatial-version=legacy-20233 --expected-rows=125 --source-updated-at=2025-01-31T00:00:00Z --dry-run=true
java -jar $jar --job=pension-income --run-id=pension-income-20241231-002 --source-file=<파일> --charset=MS949 --spatial-version=legacy-20233 --expected-rows=125 --source-updated-at=2025-01-31T00:00:00Z --dry-run=false
```

```bash
docker compose -p bosspickseoul-batch-service --env-file .env.runtime -f docker-compose-batch-service.yml --profile job \
  run --rm -e BATCH_ALLOWED_SCHEMAS=bosspickseoul_commercial_dev \
  batch-service-job --job=pension-income --run-id=pension-income-20241231-001 \
  --source-file=/app/data/input/pension_20241231.csv --charset=MS949 --spatial-version=legacy-20233 \
  --expected-rows=125 --source-updated-at=2025-01-31T00:00:00Z --dry-run=true
echo $?
```

dry-run 이 통과하면 로그에 아래 한 줄이 남는다. 기준일 5개, 서울 125행, 타 시도 1,025행이어야 한다.

```text
[pension-income] dry-run referenceDates=[2020-12-31, 2021-12-31, 2022-12-31, 2023-12-31, 2024-12-31] rows=125 ignoredNonSeoul=1025 runId=pension-income-20241231-001 checksum=...
```

실패하면 예외 메시지에 위반이 모두 나온다. 예: `Pension income header mismatch: expected=[기준년월, 시군구, 평균소득월액] actual=[...]`, `Pension income CSV is not valid UTF-8; check --charset ...`(문자셋), `Pension income validation failed: unmapped Seoul region names=[...]; referenceMonth=2024-12 seoulRows=24 expected=25; ...`. 행 번호는 헤더를 뺀 1부터이고, 원본은 `BATCH_RAW_DIRECTORY` 아래 `<run-id>-*/source.csv` 에 있다. 검사를 느슨하게 하지 말고 원인(파일·문자셋·공간 버전)을 고친 뒤 새 run-id 로 다시 돈다.

실게시는 파일에 든 기준일의 행을 지우고 다시 넣으므로 같은 파일을 다시 게시해도 안전하다. 다음 해 파일(예: 2025-12-31 기준)에 이전 기준일이 다시 들어 있으면 그 기준일도 새 파일 값으로 바뀐다. 파일에 없는 기준일은 남는다.

### 확인

`pension-income-district-table.sql` 끝의 확인 SQL 을 돌린다. 기준일마다 `districts = 25`, `checksums = 1` 이어야 하고, 공간 스냅샷과 코드가 어긋난 행은 0 이어야 한다.

```sql
SELECT reference_date, COUNT(*) AS districts, COUNT(DISTINCT source_checksum) AS checksums, MIN(run_id) AS run_id
  FROM pension_income_district GROUP BY reference_date ORDER BY reference_date;
```

적재만으로는 화면이 바뀌지 않는다. commercial-service 조회 반영은 후속 작업이다.
