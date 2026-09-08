# 분기 데이터 적재

## 구현 범위와 호환성 결정

`quarterly` 프로파일의 `commercialAnalysisImportJob`은 데이터셋·분기 한 건을 실행 단위로 삼는다. 스케줄러는 데이터셋별 제공 여부를 확인해 같은 Job을 반복 실행한다. CSV/ZIP 백필과 서울 Open API 수집을 동일한 검증·게시 경로로 처리한다.

원본 보관 → chunk staging → 자연키/필수값/분기/공간 코드 검증 → 불변 release 게시 → 해당 데이터셋·분기·공간 버전 포인터 전환 순서다. 게시 트랜잭션은 분기 전체를 교체하며 이전 release를 삭제하지 않는다. 같은 runId 재시도는 staging부터 다시 읽고, 이미 게시된 runId는 변경하지 않는다.

기존 `20233` 분석 테이블, `commercial_region_mapping`, `area_boundary`는 이 배치가 수정하지 않는다. 현재 서비스는 공간 버전 없는 조인과 같은 코드의 분기 간 증감률을 사용한다. 따라서 새 기준 데이터를 기존 테이블에 바로 게시하는 것은 과거 데이터 보존과 양립하지 않는다. 새 데이터는 `dataset_release`, `dataset_fact`, `dataset_active_release`, `dataset_spatial_*`에서 조회할 수 있게 보관한다. 서비스 노출 전에는 지도/지역/추세 조회를 공간 버전 기준으로 전환해야 한다. 원천의 재공표로 과거 분기도 새 공간 기준을 사용할 수 있으므로 연도만으로 기준을 추정하지 않는다.

## 원천 변경 사실 (2026-09-07 확인)

- 서울 열린데이터광장 상권분석서비스는 **2024년부터 공간 단위를 표준단위구역으로 변경**했다. 즉 `20233`과 2024년 이후 분기는 같은 상권 코드라도 같은 영역을 가리키지 않는다. 이것이 분기별 적재를 `spatial_version`으로 분리해 보관하는 이유다.
- 같은 공지에 따라 **2026-07-03부터 2021년 이후 자료만 제공**된다. 2021년 이전 분기는 원천에서 재수집할 수 없으므로 기존 테이블의 과거 데이터가 유일한 사본이다. 이 배치가 레거시 테이블을 건드리지 않는 결정은 되돌릴 수 없는 손실을 막는 목적도 있다.
- 연 단위 CSV(2021~2025년)도 배포되지만, Open API 역시 2021년 1분기부터 최신 분기까지 전 구간을 준다(아래 실호출 결과). **백필 주경로는 API**로 두고 CSV/ZIP은 API가 막혔을 때의 대안으로 쓴다. API 경로는 payload 키·값 표기가 검증돼 있고, CSV 경로는 한글 헤더 별칭 표가 배포 파일과 맞는지 첫 실행에서 확인해야 한다.
- 근거: [상권분석서비스(추정매출-상권) OA-15572](https://data.seoul.go.kr/dataList/OA-15572/S/1/datasetView.do), [상권분석서비스(추정매출-자치구) OA-22176](https://data.seoul.go.kr/dataList/OA-22176/S/1/datasetView.do), [상권분석서비스(소비-상권배후지) OA-15571](https://data.seoul.go.kr/dataList/OA-15571/S/1/datasetView.do), [우리마을가게 상권분석서비스](https://golmok.seoul.go.kr/)

## 원천 실호출 결과 (2026-09-08, 샘플 키)

`http://openapi.seoul.go.kr:8088/sample/json/<service>/1/1/[period]` 로 서비스 22종을 호출했다. 샘플 키는 최대 5행만 돌려주지만 `list_total_count`와 컬럼 목록은 그대로다.

| `Dataset` | 서비스 | 분기 인자 존중 | 전체 행 수 | 비고 |
| --- | --- | --- | --- | --- |
| `SALES_COMMERCIAL` | `VwsmTrdarSelngQq` | O | 481,462 (20241: 21,910) | |
| `STORE_COMMERCIAL` | `VwsmTrdarStorQq` | O | 1,680,756 (20241: 77,025) | |
| `FOOT_TRAFFIC_COMMERCIAL` | `VwsmTrdarFlpopQq` | O | 36,281 (분기당 1,648~1,649) | |
| `CHANGE_COMMERCIAL` | `VwsmTrdarIxQq` | O | 36,300 (분기당 1,650) | 레거시 테이블이 비어 있어 첫 적재 대상 |
| `POPULATION_COMMERCIAL` | `VwsmTrdarRepopQq` | **X** | 35,908 | |
| `FACILITY_COMMERCIAL` | `VwsmTrdarFcltyQq` | **X** | 34,716 | |
| `CONSUMPTION_COMMERCIAL` | `VwsmTrdhlNcmCnsmpQq` | **X** | 23,980 | 「소비-상권배후지」. 아래 컬럼 차이 참고 |
| `SALES_ADMINISTRATION` | `VwsmAdstrdSelngW` | O | 376,485 (20241: 17,044) | |
| `STORE_ADMINISTRATION` | `VwsmAdstrdStorW` | O | 775,084 (20241: 35,330) | |
| `CONSUMPTION_ADMINISTRATION` | `VwsmAdstrdNcmCnsmpW` | **X** | 9,350 | |
| `SALES_DISTRICT` | `VwsmSignguSelngW` | **X** | 33,803 | |
| `STORE_DISTRICT` | `VwsmSignguStorW` | **X** | 54,765 | |
| `FOOT_TRAFFIC_DISTRICT` | `VwsmSignguFlpopW` | **X** | 550 (25구 × 22분기) | |
| `CONSUMPTION_DISTRICT` | `VwsmSignguNcmCnsmpW` | **X** | 550 | |
| `CHANGE_DISTRICT` | `VwsmSignguIxQq` | **X** | 550 | 접미사 `Qq`지만 전체 시계열 반환 |

- **15종 중 9종이 분기 인자를 무시한다.** 접미사(`Qq`/`W`)로는 구분되지 않는다. 스트리밍 필터가 대상 분기만 채택하므로 결과는 같지만, 페이지 수와 `--expected-rows` 산정이 달라진다(아래 실행 예시).
- **모든 지표는 JSON 숫자**(`5.03135509E8`, `51551.0`)로 온다. 수집 Adapter가 BigDecimal로 디코딩해 평문 십진수(`503135509`, `51551`)로 정규화하므로 payload에는 지수 표기가 남지 않는다. CSV 경로와 같은 문자열이 된다.
- **상권 코드 체계는 유지됐다.** `TbgisTrdarRelm`(상권 영역) 1,650건이며 20233과 20241 모두 분기당 상권 1,649~1,650건이다. 즉 2024년 변경은 코드 재부여가 아니라 **같은 코드의 영역(폴리곤)이 표준단위구역 기준으로 바뀐 것**이다. `spatial_version`으로 분리 보관해야 하는 이유가 여기서 확인된다.
- `VwsmTrdarNcmCnsmpQq`(구 소득소비-상권)는 서버 오류(500)로 더 이상 응답하지 않는다. 행정동 상권변화지표 `VwsmAdstrdIxQq`는 존재하지만 레거시 테이블이 없어 데이터셋에 넣지 않았다.

### 2024년 이후 컬럼 차이 (레거시 테이블 대비)

- **소비-상권배후지(`VwsmTrdhlNcmCnsmpQq`)에는 소득 컬럼이 없다.** 레거시 `income_commercial`의 `monthly_average_income_amount`(`MT_AVRG_INCOME_AMT`), `income_bracket_code`(`INCOME_SCTN_CD`)는 2024년 이후 원천에서 채울 수 없다. 조회 경로를 전환할 때 이 두 값은 null 또는 「제공 종료」로 다뤄야 한다.
- 소비 세부 항목이 스코프마다 다르다. 상권배후지는 `LSR_EXPNDTR_TOTAMT`(여가)·`CLTUR_EXPNDTR_TOTAMT`(문화)가 나뉘고, 행정동·자치구(`NcmCnsmpW`)는 `LSR_CLTUR_EXPNDTR_TOTAMT`로 합산되며 `ETC_EXPNDTR_TOTAMT`·`FD_EXPNDTR_TOTAMT`가 추가된다. 레거시 `income_administration`/`income_district`는 총액만 가지므로 영향이 없고, `income_commercial`의 여가·문화 분리와는 일치한다.
- 나머지 12종은 레거시 테이블이 쓰는 컬럼이 모두 있다. 그 위에 레거시가 버린 컬럼(시간대·연령대 매출, 남녀 연령대 상주인구, 집객시설 세부 등)이 payload JSON에 그대로 남는다.
- 데이터셋 15종 중 2024년 이후 값이 음수인 컬럼은 관찰되지 않았다. `_RT`/`_AVRG` 음수 거부 규칙은 유지한다.

## 데이터셋 목록

`Dataset`은 commercial-service가 이미 읽는 레거시 팩트 테이블 15종과 1:1로 대응한다. 한 종이라도 빠지면 그 화면만 `20233`에 남으므로 `DatasetTest`가 목록 전체와 **서비스명 15종**을 고정한다.

15종 모두 Open API 서비스명이 실호출로 확인돼 있으므로 `--source=API`를 어느 데이터셋에나 쓸 수 있다. 서비스명이 빈 데이터셋을 새로 추가하면 `ImportRequest`가 API 실행을 거부하고 CSV/ZIP만 허용한다(엔드포인트 추측 금지).

레거시 `change_commercial` 테이블은 v1 마이그레이션에서 원천을 찾지 못해 **비어 있다**(`nowdoboss-to-bosspickseoul-commercial-remaining-runbook.sql` 참고). `VwsmTrdarIxQq`가 20211부터 제공하므로 이 배치의 첫 적재 대상이다.

## CSV 헤더 별칭

CSV 경로는 한글 헤더를 `application-quarterly.yml`의 `header-aliases`로 API 컬럼 코드에 매핑한다. **별칭이 없는 헤더가 하나라도 있으면 그 이름을 나열하고 시작 단계에서 멈춘다.** 통과시키면 API 경로가 만들 수 없는 키가 payload에 들어가고 접미사 기반 숫자 검증도 건너뛰기 때문이다. 별칭 표의 코드 쪽은 실호출 컬럼 목록이고, 한글 쪽은 배포 CSV 헤더 표기를 따랐다. 파일의 표기가 다르면 검사를 느슨하게 하지 말고 줄을 추가한다.

## 책임과 검증 계획

- 수집 Adapter: API 페이지 제한, 타임아웃, 오류 응답, 원본 checksum, UTF-8/CP949 CSV 및 ZIP 스트리밍 검증.
- 서울 API 서비스 15종 중 9종은 분기 경로 인자를 무시하고 전체 시계열을 반환하므로(위 실호출 표),
  원격 페이지 커서와 대상 분기 채택 건수를 분리해 스트리밍 필터링한다.
- Application: 분기 형식, 데이터셋 계약, 누락과 0 구분, 원천 스키마 변경 실패, 공간 버전 연결 검증.
- Persistence Adapter: staging chunk 저장, 중복과 공간 코드 검증, 게시 트랜잭션, 게시 동시성 및 불변 이력 검증.
- 실행 구성: 기본 dryRun, 명시 DB URL와 schema allowlist, Job 종료 코드, 외부 스케줄러 실행 안내.

행 검증은 fail-closed다. 거부 행이 한 건이라도 있으면 게시하지 않고 Job이 실패한다. 2024년 이후 원천이 컬럼이나 코드 체계를 또 바꾸면 조용히 잘못된 값이 들어가는 대신 `dataset_rejected_row`에 근거를 남기고 멈춘다.

추가 라이브러리 없이 기존 Spring Batch/JDBC/Jackson/JUnit을 사용한다. 원천 서비스명·컬럼·분기 인자 동작은 샘플 키 실호출로 확인했고, 개발 DB 변경과 발급 API 키를 쓰는 전 구간 dry-run은 아직 남아 있다.

## 남은 작업

- **공간 스냅샷 입력 파일을 만드는 도구가 없다.** `--job=spatial`은 `spatialVersion`·`expectedCounts`·`sourceUpdatedAt`를 가진 GeoJSON을 요구하지만, 서울시가 배포하는 상권 영역은 shapefile이고 `TbgisTrdarRelm` API는 중심점·면적·상위 코드만 준다(폴리곤 없음). 변환 스크립트 또는 `area_boundary` 레거시 테이블에서 20233 기준 스냅샷을 뽑는 경로가 필요하다. 이것이 없으면 사실 데이터 dry-run은 `unmapped` 검증에서 전부 실패한다.
- `dataset_fact` / `dataset_active_release`를 읽는 조회 경로가 아직 없다. 배치는 적재만 하고 서비스는 여전히 레거시 테이블을 읽는다. 전환 시 `income_commercial`의 소득 두 컬럼은 2024년 이후 원천에 없다(위 컬럼 차이).
- `spring-batch-test`가 의존성에 없어 Job 배선(@StepScope 프록시, 실행 컨텍스트 승격, 재시작)을 부팅해 검증하는 테스트가 없다. 첫 dry-run은 개발 DB에서 직접 확인해야 한다.
- Persistence 테스트는 `JdbcTemplate`을 목으로 대체하므로 SQL 문법과 락 동작은 개발 DB dry-run에서만 검증된다.
- 분기 인자를 무시하는 서비스는 대상 분기 한 개를 위해 전체 시계열을 내려받는다(`VwsmTrdarRepopQq` 36페이지 등). 백필 중 같은 원본을 분기마다 다시 받는 셈이므로, 한 실행에서 여러 분기를 채택해 release 여러 개로 게시하는 확장을 검토할 만하다.
- `--expected-rows`는 분기 인자를 존중하는 서비스에서는 `list_total_count`로 자동 확정할 수 있다. 지금은 dry-run 한 번으로 값을 읽어 새 run-id로 다시 돌리는 절차를 유지한다.

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

`--expected-rows`는 **대상 분기 한 개의 행 수**다. 분기 인자를 존중하는 서비스(위 실호출 표의 O)는 `.../1/1/<period>` 한 번 호출한 `list_total_count`가 그 값이다. 분기 인자를 무시하는 서비스(X)는 `list_total_count`가 모든 분기의 합이므로 그대로 쓰면 게시가 항상 실패한다. 값을 모를 때는 `--dry-run=true`로 한 번 실행한다. 게시 단계 예외 메시지에 `expected=… input=… accepted=… rejected=… duplicate=… unmapped=…`가 찍히고, 검증 감사는 게시가 거부돼도 커밋되므로 `dataset_release.accepted_count`에서도 같은 값을 읽을 수 있다. 다만 `expected_rows`는 요청 지문에 포함되므로, 값을 고쳐 다시 실행할 때는 **새 `run-id`** 를 써야 한다.

`--dry-run=false`는 새 run ID로 다시 실행해야 하며, 같은 분기의 이전 release는 삭제하지 않는다. `20233`은 기존 서비스 테이블에서 계속 읽고, 새 release는 공간 버전 인식 조회가 배포될 때까지 기존 API의 기본값으로 사용하지 않는다.
