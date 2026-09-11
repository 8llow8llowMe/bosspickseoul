# 분기 적재 따라하기

데이터셋 하나를 처음부터 끝까지 돌리는 절차다. 명령을 순서대로 따라가면 된다.

왜 이렇게 하는지, 원천 계약이 무엇인지는 [batch-quarterly-import.md](batch-quarterly-import.md)를 본다. 이 문서는 **실행 순서만** 다룬다.

전체 흐름은 이렇다. 1~2는 한 번만, 3~4는 데이터셋 × 분기마다 반복한다.

```
1. 선행 DDL          (스키마당 한 번)
2. 공간 스냅샷        (한 번)
3. --job=facts       (데이터셋 × 분기)  → dataset_fact 에 원천 보관
4. --job=project     (데이터셋 × 분기)  → 상권·자치구·행정동 테이블. 화면은 여기를 읽는다
```

3만 하고 4를 안 하면 **화면에 아무 변화가 없다.** `dataset_fact` 는 보관용이고 조회 정본이 아니다.

---

## 0. 지금 어디까지 했는지 보기

작업을 이어받았거나 어제 어디서 멈췄는지 모르겠으면 여기부터 본다. Workbench 에서 `bosspickseoul_commercial_dev` 를 선택하고 `scripts/migration/quarterly-import-coverage.sql` 을 블록 단위로 실행한다.

| 보고 싶은 것 | 절 |
| --- | --- |
| 다음에 돌릴 적재 슬롯 | 「1) 남은 대상」의 `TODO` 행 |
| 데이터셋별 진행률 | 「2) 데이터셋별 진행률」 |
| 적재는 됐는데 이관이 안 된 슬롯 | 「5) typed 이관 진행률」 |

「1)」에 `20211`~`20233` 이 `TODO` 로 잔뜩 보이는 것은 정상이다. 그 구간은 과거 프로젝트에서 팩트 테이블에 직접 넣은 데이터라 `dataset_fact` 에는 없다. 무시해도 된다.

---

## 1. 선행 DDL — 스키마당 한 번

Workbench 에서 **`bosspickseoul_commercial_dev` 를 선택한 뒤** `backend/scripts/migration/` 의 네 파일을 순서대로 실행한다.

1. `spring-batch-schema-mysql.sql` — Spring Batch 메타 테이블
2. `quarterly-dataset-schema.sql` — `dataset_*`
3. `change-commercial-spatial-version.sql`
4. `fact-tables-spatial-version.sql` — 나머지 14개 팩트 테이블

이미 했는지 확인하는 법이다. 두 쿼리 모두 결과가 나와야 한다.

```sql
SELECT COUNT(*) FROM information_schema.tables
 WHERE table_schema = 'bosspickseoul_commercial_dev' AND table_name = 'dataset_fact';

SHOW COLUMNS FROM store_commercial LIKE 'spatial_version';
```

`BATCH_*` 테이블에는 `IF NOT EXISTS` 가 없어서 1번을 두 번 실행하면 실패한다. 이미 있으면 건너뛴다.

PowerShell 에서 `mysql ... < file.sql` 은 `<` 가 예약 연산자라 실패한다. DDL 은 Workbench 로 넣는다.

---

## 2. 터미널 준비 — 창을 새로 열 때마다

환경변수는 터미널 세션에만 살아 있다. 창을 닫으면 다시 넣어야 한다. 비밀번호와 API 키는 저장소에 적지 않는다.

```powershell
cd D:\ProjectWorkSpace\NowDoBoss-V2\backend

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

API 키는 **열린데이터광장**(data.seoul.go.kr) 키다. 공공데이터포털 키는 안 통한다.

`BATCH_DB_URL` 에 `prod` 가 들어가면 `BatchTargetGuard` 가 거부한다.

---

## 3. 공간 스냅샷 — 한 번

사실 적재의 `unmapped` 검증이 이 영역을 본다. **이걸 먼저 실게시하지 않으면 이후 적재가 전부 실패한다.**

```powershell
java -jar $jar --job=spatial --run-id=spatial-legacy-20233-001 --source=LEGACY --spatial-version=legacy-20233 --source-updated-at=2023-12-31T00:00:00Z --dry-run=true
java -jar $jar --job=spatial --run-id=spatial-legacy-20233-002 --source=LEGACY --spatial-version=legacy-20233 --source-updated-at=2023-12-31T00:00:00Z --dry-run=false
```

기대값은 영역 2,100건(자치구 25 / 행정동 425 / 상권 1,650)이다. 확인은 이렇게 한다.

```sql
SELECT spatial_version, status, source_updated_at, acquired_at
  FROM dataset_spatial_release ORDER BY acquired_at DESC;

SELECT spatial_version,
       SUM(area_type = 'DISTRICT')       AS district_count,
       SUM(area_type = 'ADMINISTRATION') AS administration_count,
       SUM(area_type = 'COMMERCIAL')     AS commercial_count,
       COUNT(*)                          AS area_total
  FROM dataset_spatial_area
 GROUP BY spatial_version;
```

`status` 가 `READY` 이고 `area_total` 이 2,100(25 / 425 / 1,650)이어야 다음으로 간다. dry-run 만으로는 올라가지 않는다. 같은 쿼리가 `quarterly-import-verify.sql` 「2) 공간 스냅샷」에 있다.

---

## 4. 사실 적재 — 데이터셋 하나씩

### 4-1. 명령을 직접 쓰지 않는다

생성기가 run-id 규칙, 분기 말 시각, `API`/`ARCHIVE` 선택을 대신 채운다. 출력만 하고 DB·API·JAR 을 건드리지 않으므로 몇 번을 돌려도 안전하다.

```powershell
# 저장소 루트에서
$plan = ".\backend\scripts\batch\quarterly-import-plan.ps1"

& $plan -Dataset FOOT_TRAFFIC_DISTRICT | Set-Content ft-district.txt
notepad ft-district.txt
```

파일을 열어놓고 **위에서 아래로 한 줄씩** 실행한다. 앞 줄이 `COMPLETED` 가 아니면 다음 줄로 가지 않는다.

특정 분기만 하려면 `-Period` 를 준다. 주지 않으면 21분기 전부를 뽑는다.

```powershell
& $plan -Dataset FOOT_TRAFFIC_DISTRICT -Period 20234,20241,20242
```

### 4-2. 데이터셋은 세 가지 유형이다

`& $plan -SummaryOnly` 표의 `PeriodArg` 와 `RowsPerQuarter` 로 구분한다.

| 유형 | 표에서 | 슬롯당 실행 | 예 |
| --- | --- | --- | --- |
| A | `RowsPerQuarter` 가 숫자 | 2줄 (dry-run → 게시) | `CHANGE_COMMERCIAL`, 자치구 3종 |
| B | `probe` + `PeriodArg honoured` | 3줄 (probe → dry-run → 게시) | `SALES_COMMERCIAL`, `STORE_COMMERCIAL` |
| C | `probe` + `PeriodArg ignored` | 첫 분기 3줄, 이후 분기는 `ARCHIVE` 재생 | `POPULATION_COMMERCIAL` 등 |

### A 유형 — 행 수를 아는 경우

생성기가 숫자까지 채워주므로 그대로 두 줄 실행한다.

```powershell
java -jar $jar --job=facts --run-id=change-district-20234-001 ... --expected-rows=25 --dry-run=true
java -jar $jar --job=facts --run-id=change-district-20234-002 ... --expected-rows=25 --dry-run=false
```

dry-run 이 `COMPLETED` 면 게시 줄로 간다. 건수가 틀리면 Job 이 실패하고 실제 값이 DB 에 남는다. 그 값으로 B 유형처럼 처리한다.

### B 유형 — probe 로 행 수를 알아낸다

생성기가 첫 줄에 `--expected-rows=1` 짜리 probe 를 넣어둔다. **이 줄은 일부러 실패한다.** 실패가 정상이다.

```powershell
# 1) probe — 실패하면서 실제 건수를 DB 에 남긴다
java -jar $jar --job=facts --run-id=sales-commercial-20234-001 ... --expected-rows=1 --dry-run=true
```

실제 건수를 읽는다.

```sql
SELECT run_id, expected_rows, input_count, accepted_count, failure_reason
  FROM dataset_release
 WHERE run_id = 'sales-commercial-20234-001';
```

`accepted_count` 값을 생성기 출력의 `REPLACE_WITH_PROBE_COUNT` 자리에 넣고 나머지 두 줄을 돌린다.

```powershell
# 2) dry-run — 이번엔 COMPLETED 여야 한다
java -jar $jar --job=facts --run-id=sales-commercial-20234-002 ... --expected-rows=21910 --dry-run=true
# 3) 게시
java -jar $jar --job=facts --run-id=sales-commercial-20234-003 ... --expected-rows=21910 --dry-run=false
```

### C 유형 — 첫 분기만 API, 나머지는 재생

이 9종은 원천이 분기 인자를 무시하고 2021년 이후 **전 구간**을 한 번에 준다. 분기마다 API 를 부르면 하루 호출 한도(인증키당 1,000회)를 금방 넘긴다. 그래서 첫 분기만 받아 원본 파일을 남기고, 나머지 분기는 그 파일을 재생한다.

첫 분기는 B 유형과 같다. 끝나면 원본 위치를 읽는다.

```sql
SELECT run_id, raw_location FROM dataset_release
 WHERE dataset = 'POPULATION_COMMERCIAL' AND period_code = '20211'
 ORDER BY acquired_at DESC;
```

그 경로를 이후 분기 명령의 `REPLACE_WITH_RAW_LOCATION` 자리에 넣는다. `--source=ARCHIVE` 로 바뀌어 있으므로 API 를 부르지 않는다.

```powershell
java -jar $jar --job=facts --run-id=population-commercial-20212-001 --dataset=POPULATION_COMMERCIAL --period=20212 `
  --source=ARCHIVE --source-file=<위 쿼리가 돌려준 raw_location 값> `
  --spatial-version=legacy-20233 --schema-version=seoul-v1 --expected-rows=1 `
  --source-updated-at=2021-06-30T00:00:00Z --dry-run=true
```

`raw_location` 은 DB 에 적힌 값을 **그대로** 붙여넣는다. 손으로 조립하지 않는다. 보관 루트는 `BATCH_RAW_DIRECTORY`(기본 `backend/data/raw`)이고 이 디렉터리는 커밋하지 않는다.

재생이어도 분기마다 행 수는 다르므로 probe 는 그대로 필요하다. 다만 API 를 부르지 않으니 한도를 쓰지 않는다.

### 4-3. 한 데이터셋이 끝났는지 확인

```sql
SELECT period_code, accepted_count, status
  FROM dataset_release r
  JOIN dataset_active_release a ON a.run_id = r.run_id
 WHERE r.dataset = 'FOOT_TRAFFIC_DISTRICT'
 ORDER BY period_code;
```

돌린 분기 수만큼 행이 나오면 그 데이터셋은 끝이다. 다음 데이터셋으로 간다. 순서는 `& $plan -SummaryOnly` 표의 `Order` 를 따른다. 행 수가 작고 안전한 것부터다.

---

## 5. typed 이관 — 화면에 반영하는 단계

적재가 끝난 데이터셋×분기마다 한 번 돌린다. 같은 `(period_code, spatial_version)` 행을 지우고 다시 넣으므로, 잘못 돌려도 다시 돌리면 된다.

```powershell
& $plan -Job project -Dataset FOOT_TRAFFIC_DISTRICT | Set-Content project-ft-district.txt
```

슬롯마다 두 줄이다. `runId` 가 유일한 식별 파라미터라 dry-run 과 게시는 run-id 가 다르다(`-001` / `-002`). 같은 run-id 로 두 번 돌리면 Spring Batch 가 두 번째를 거부한다.

```powershell
java -jar $jar --job=project --run-id=project-foot-traffic-district-20234-001 --dataset=FOOT_TRAFFIC_DISTRICT --period=20234 --spatial-version=legacy-20233 --dry-run=true
java -jar $jar --job=project --run-id=project-foot-traffic-district-20234-002 --dataset=FOOT_TRAFFIC_DISTRICT --period=20234 --spatial-version=legacy-20233 --dry-run=false
```

> **`20233` 이하 분기에 이관을 돌리지 않는다.** 그 구간 팩트 테이블 행은 과거 프로젝트에서 넣은 데이터이고, 이관은 `(period_code, spatial_version)` 을 **지우고 다시 넣는다.** `dataset_fact` 에 그 분기를 적재한 상태에서 이관을 돌리면 기존 행이 원천 데이터로 교체된다. 적재를 안 한 분기에 돌리면 `no PUBLISHED release` 로 그냥 실패하고 아무것도 지우지 않으니, 실수로 한 번 돌린 정도는 문제가 없다.

확인은 `quarterly-import-coverage.sql` 「5)」다. 아무 행도 안 나오면 다 끝난 것이고, 뜨는 행이 남은 것이다.

- `NOT_PROJECTED` — 적재만 되고 이관을 안 돌렸다
- `ROW_COUNT_MISMATCH` — 행 수가 안 맞는다. 레거시 행이 남아 있거나 이관이 중간에 끊겼다. 그 슬롯을 다시 돌린다

업종이 있는 6종(`STORE_*`, `SALES_*`)은 이관이 `service_category` 로 `service_type` 을 채운다. 매핑에 없는 업종 코드가 있으면 로그에 미해석 건수가 남고, 「6) service_type 미해석 점검」으로 어떤 코드인지 본다.

---

## 6. 자주 나는 오류

| 증상 | 원인과 대처 |
| --- | --- |
| `no PUBLISHED release for ...` | 그 분기를 `--job=facts` 로 게시하지 않았다. 4절을 먼저 한다 |
| `unmapped_count > 0` | 공간 스냅샷이 `READY` 가 아니거나 `--spatial-version` 이름이 다르다. 3절 확인 |
| `BATCH_JOB_INSTANCE` 없음 | 1절 DDL 1번을 안 넣었다 |
| `Release is not running for this request` | 같은 run-id 를 파라미터만 바꿔 재실행했다. `expected_rows` 가 요청 지문에 들어 있다. **새 run-id** 를 쓴다 |
| `A newer source revision is already active` | `--source-updated-at` 이 이미 게시된 것보다 과거다 |
| 붙여넣기가 PowerShell 에서 깨진다 | 명령에 `<` 가 들어갔다. 자리표시를 실제 값으로 바꾸고 `<`, `>` 를 지운다 |
| Gradle `daemon disappeared` | `.\gradlew.bat --stop` 후 다시 빌드한다 |

`--dry-run=true` 도 `dataset_release` / staging / rejected 에는 쓴다. `dataset_fact` 와 `dataset_active_release` 만 건너뛴다. 그래서 dry-run 을 돌려도 `dataset_release` 에 run 기록이 남는 것이 정상이다.

---

## 7. API 호출 예산

원천 응답은 1,000행 단위 페이지다(`SeoulDatasetSourceAdapter` `PAGE_SIZE`). 인증키당 하루 1,000회라 큰 데이터셋은 하루에 다 못 넣는다.

| 데이터셋 | 분기당 행 | 분기당 호출 |
| --- | --- | --- |
| `STORE_COMMERCIAL` | 77,025 | 약 78 |
| `STORE_ADMINISTRATION` | 35,330 | 약 36 |
| `SALES_COMMERCIAL` | 21,910 | 약 22 |
| `SALES_ADMINISTRATION` | 17,044 | 약 18 |
| `FOOT_TRAFFIC_COMMERCIAL`·`CHANGE_COMMERCIAL` | 약 1,650 | 2 |

생성기는 dry-run 과 게시를 둘 다 `--source=API` 로 찍는다. 즉 같은 데이터를 두 번 받는다. 큰 데이터셋은 **게시를 dry-run 의 원본 재생으로 바꾸면 호출이 절반**이 된다. `ARCHIVE` 는 데이터셋을 가리지 않는다.

```sql
SELECT run_id, raw_location FROM dataset_release
 WHERE dataset = 'STORE_COMMERCIAL' AND period_code = '20234' ORDER BY acquired_at DESC;
```

게시 줄의 `--source=API` 를 `--source=ARCHIVE --source-file=<그 경로>` 로 바꿔 돌린다.

호출 한도에 걸리면 그날은 거기서 멈추고 다음 날 「0. 지금 어디까지 했는지 보기」부터 이어간다. 슬롯 단위로 끊어져 있어서 중간에 멈춰도 안전하다.
