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

## 소스 종류

`--source`는 네 가지다. 어느 경로든 staging 이후는 같다.

| `--source` | 입력 | 용도 |
| --- | --- | --- |
| `API` | 서울 Open API (`--source-file` 없음) | 기본 경로. 페이지(1,000행)마다 `page-<start>.json`으로 원본을 보관한다 |
| `ARCHIVE` | 이전 `API` 실행의 raw 디렉터리 (`dataset_release.raw_location`) | 분기 인자를 무시하는 서비스를 **한 번만 내려받고** 나머지 분기는 재생한다. API를 호출하지 않으며 같은 페이지면 checksum도 같다 |
| `CSV` / `ZIP` | 열린데이터광장 연 단위 파일 | API가 막혔을 때의 대안 |

서울 API는 인증키당 하루 1,000회 제한이 있다. 분기 인자를 무시하는 9종을 분기마다 다시 받으면 22분기 백필에 약 4,300회가 들지만, 첫 분기만 `API`로 받고 나머지를 `ARCHIVE`로 재생하면 약 200회다.

## CSV 헤더 별칭

CSV 경로는 한글 헤더를 API 컬럼 코드로 바꾼다. 표는 classpath `seoul/csv-header-aliases.csv`(한 줄 = `한글헤더,코드`)에 있고, 조회 전에 헤더를 정규화한다(공백·`~` → `_`, `률` → `율`). `application-quarterly.yml`의 `header-aliases`는 배포 파일이 헤더를 다르게 적을 때만 한 줄씩 덧붙이는 자리다.

**별칭이 없는 헤더가 하나라도 있으면 그 이름을 나열하고 시작 단계에서 멈춘다.** 통과시키면 API 경로가 만들 수 없는 키가 payload에 들어가고 접미사 기반 숫자 검증도 건너뛰기 때문이다. 표의 코드 쪽은 실호출 컬럼 목록이고, 한글 쪽은 배포 CSV 헤더 표기를 따랐으나 실제 파일로 대조한 것은 아니다. 파일의 표기가 다르면 검사를 느슨하게 하지 말고 줄을 추가한다.

## 공간 스냅샷 소스

`--job=spatial`의 `--source`는 두 가지다.

- `GEOJSON`(기본): `spatialVersion`·`sourceUpdatedAt`·`expectedCounts`를 가진 FeatureCollection 파일. 서울시가 배포하는 영역 shapefile 3종을 `backend/scripts/spatial/seoul_area_shapefiles_to_geojson.py`로 변환해 만든다(아래 「GEOJSON 파일 만들기」). `TbgisTrdarRelm` API는 중심점·면적·상위 코드만 주고 폴리곤을 주지 않는다.
- `LEGACY`: 서비스가 이미 읽는 `area_boundary`(20233 기준 폴리곤)와 `commercial_region_mapping`(상권 → 행정동)에서 스냅샷을 만든다. `boundary_geo_json`의 맨 링을 닫힌 Polygon으로 감싸고, 행정동의 상위는 코드 앞 5자리, 상권의 상위는 매핑 테이블에서 얻는다. 매핑이 없는 상권이 있으면 코드를 나열하고 멈춘다. checksum은 산출된 영역 전체를 덮으므로 같은 테이블이면 같은 버전이다.

**두 테이블은 district-service 스키마 소유다.** 팩트를 쓰는 commercial 스키마와 다르므로 `BATCH_LEGACY_SPATIAL_SCHEMA`로 지정해야 하고, 배치 계정에 그 스키마 SELECT 권한이 있어야 한다. 지정하지 않으면 조회가 빈 결과가 되고 실행이 그 사실을 알리며 멈춘다.

상권 코드는 2024년 이후에도 그대로이므로 `LEGACY` 스냅샷으로 2024년 이후 분기의 `unmapped` 검증을 통과시킬 수 있다. 다만 **폴리곤은 20233 기준**이다. 버전 이름에 그 사실을 남기고(`legacy-20233` 등), 표준단위구역 폴리곤이 준비되면 새 버전으로 별도 게시한다.

### 개발 DB 실측 (2026-09-08, `bosspickseoul_district_dev`)

| 항목 | 값 |
| --- | --- |
| `area_boundary` 영역 수 | 자치구 25 · 행정동 425 · 상권 1,650 (합 2,100) |
| `boundary_geo_json` 형태 | 2,100건 전부 맨 링 `[[lng,lat],...]` (중첩 링·geometry 객체 없음) |
| 링이 닫히지 않은 행 | 80건 — 적재 시 첫 점을 덧붙여 닫는다 |
| `commercial_region_mapping` | 1,650행, 상권 코드 중복 없음, 양방향 누락 0 |
| 행정동 → 자치구(앞 5자리) | 425건 전부 부모 존재 |
| 팩트 테이블 코드 → 영역 | `sales_commercial`·`change_district` 모두 누락 0 |

즉 `LEGACY` 스냅샷은 `expectedCounts` 25/425/1650으로 통과하고, 사실 데이터의 `unmapped` 검증도 0이 나온다.

### GEOJSON 파일 만들기 (서울시 영역 shapefile 3종)

원천은 서울 열린데이터광장 「상권분석서비스」 영역 데이터셋 3종이다. 모두 ZIP 안에 shapefile(.shp/.dbf/.prj/.cpg)이 있고, 좌표계 **EPSG:5181**(Korea 2000 / Central Belt), DBF 인코딩 UTF-8이다.

| 영역 | 데이터셋 | 건수 | 코드·이름 필드 | 상위 |
| --- | --- | --- | --- | --- |
| 자치구 | [OA-22161 영역-자치구](https://data.seoul.go.kr/dataList/OA-22161/S/1/datasetView.do) | 25 | `SIGNGU_CD`, `SIGNGU_NM` | 없음 |
| 행정동 | [OA-22160 영역-행정동](https://data.seoul.go.kr/dataList/OA-22160/S/1/datasetView.do) | 425 | `ADSTRD_CD`, `ADSTRD_NM` | 코드 앞 5자리 |
| 상권 | [OA-15560 영역-상권](https://data.seoul.go.kr/dataList/OA-15560/S/1/datasetView.do) | 1,650 | `TRDAR_CD`, `TRDAR_CD_N` | `ADSTRD_CD` 필드 |

변환기는 표준 라이브러리만 쓴다(pip 설치 없음). shapefile·DBF를 직접 읽고, EPSG:5181 → WGS84 역변환을 Krüger 급수로 계산한다(서울 범위 난수 2,000점에서 pyproj 3.8과 0.001mm 이내 일치, 2026-09-09). 외곽/구멍 링을 폴리곤으로 묶어 Polygon·MultiPolygon으로 내고, 링은 닫힌 상태로 RFC 7946 방향(외곽 반시계, 구멍 시계)을 따른다. 건수 25/425/1650, 코드 중복, 상위 코드 누락, 좌표 범위는 `SpatialImportProcessor`와 같은 규칙으로 fail-closed 검사한다. 단위 테스트는 `python -m unittest backend/scripts/spatial/test_seoul_area_shapefiles_to_geojson.py`.

```text
python backend/scripts/spatial/seoul_area_shapefiles_to_geojson.py   --district "서울시 상권분석서비스(영역-자치구).zip"   --administration "서울시 상권분석서비스(영역-행정동).zip"   --commercial "서울시 상권분석서비스(영역-상권).zip"   --spatial-version seoul-v2024 --output seoul-spatial-v2024.geojson
```

- `--source-updated-at`을 생략하면 ZIP 내부 파일의 최신 수정 시각을 UTC로 쓴다. 파일 안 `spatialVersion`은 `--spatial-version`과 같아야 하고, 배치의 `--spatial-version`도 그 값이어야 한다.
- 결과는 결정적이다(같은 입력 → 같은 바이트 → 같은 checksum). 같은 버전명에 다른 바이트를 다시 게시하면 배치가 거부하므로, 입력이 바뀌면 버전명을 올린다(`seoul-v2024-2` 등).
- 2026-09-09 실측: 3종 변환 결과 2,100건(MultiPolygon 89, 구멍 41), 11.7 MiB. `SpatialGeoJsonSourceAdapter` + `SpatialImportProcessor` dry-run을 통과했다.

**원천 기준 시점을 반드시 확인한다.** 2026-09-09 기준 세 ZIP 안의 파일 시각은 모두 **2023-10-20**이고, `TbgisTrdarRelm` API는 20233·20241·20252 어느 분기로 불러도 같은 중심점·면적을 돌려준다(분기 인자 무시). 즉 지금 배포 중인 shapefile이 20233 폴리곤과 같은 것일 수 있다. 게시 전에 `LEGACY` 스냅샷과 대조한다.

```sql
-- 게시 후: 두 버전의 같은 상권 폴리곤이 다른지 표본 확인 (같으면 새 버전을 서비스에 쓸 이유가 없다)
SELECT l.area_code,
       ST_Area(ST_GeomFromGeoJSON(l.boundary_geo_json)) AS legacy_area,
       ST_Area(ST_GeomFromGeoJSON(n.boundary_geo_json)) AS new_area
  FROM dataset_spatial_area l JOIN dataset_spatial_area n
    ON n.area_type = l.area_type AND n.area_code = l.area_code
 WHERE l.spatial_version = 'legacy-20233' AND n.spatial_version = 'seoul-v2024' AND l.area_type = 'COMMERCIAL'
 LIMIT 20;
```

차이가 없으면 서울시가 새 폴리곤을 아직 배포하지 않은 것이다. 그때는 `LEGACY` 버전을 계속 쓰고, 이 절차는 새 파일이 올라올 때 다시 실행한다. 차이가 있으면 `--dry-run=false`로 게시하고, 팩트를 새 `spatial_version`으로 `--source=ARCHIVE` 재게시해 `unmapped=0`을 확인한다.

**지도 반영은 이 절차의 범위 밖이다.** district-service 지도는 `area_boundary`의 bbox 컬럼과 맨 링 형식을 읽고, `dataset_spatial_area`에는 bbox·center가 없고 지오메트리가 GeoJSON 객체다. 새 버전을 지도에 그리려면 district-service가 `dataset_spatial_area`를 읽도록 하는 별도 설계가 필요하다.

## 책임과 검증 계획

- 수집 Adapter: API 페이지 제한, 타임아웃, 오류 응답, 원본 checksum, UTF-8/CP949 CSV 및 ZIP 스트리밍 검증.
- 서울 API 서비스 15종 중 9종은 분기 경로 인자를 무시하고 전체 시계열을 반환하므로(위 실호출 표),
  원격 페이지 커서와 대상 분기 채택 건수를 분리해 스트리밍 필터링한다.
- Application: 분기 형식, 데이터셋 계약, 누락과 0 구분, 원천 스키마 변경 실패, 공간 버전 연결 검증.
- Persistence Adapter: staging chunk 저장, 중복과 공간 코드 검증, 게시 트랜잭션, 게시 동시성 및 불변 이력 검증.
- 실행 구성: 기본 dryRun, 명시 DB URL와 schema allowlist, Job 종료 코드, 외부 스케줄러 실행 안내.

행 검증은 fail-closed다. 거부 행이 한 건이라도 있으면 게시하지 않고 Job이 실패한다. 2024년 이후 원천이 컬럼이나 코드 체계를 또 바꾸면 조용히 잘못된 값이 들어가는 대신 `dataset_rejected_row`에 근거를 남기고 멈춘다.

추가 라이브러리 없이 기존 Spring Batch/JDBC/Jackson/JUnit을 사용한다. 원천 서비스명·컬럼·분기 인자 동작은 샘플 키 실호출로 확인했다. 운영 명령·검증 SQL·분기 반복 절차는 [batch-quarterly-import.md](batch-quarterly-import.md)다.

## 남은 작업

- **2024년 표준단위구역 폴리곤이 배포됐는지 확인되지 않았다.** 변환 도구와 절차는 있다(「GEOJSON 파일 만들기」). 2026-09-09 기준 서울시 shapefile은 2023-10-20 파일이라 `LEGACY`(20233)와 같을 수 있고, 게시 전 대조가 필요하다. 새 버전이 생겨도 district-service 지도가 `dataset_spatial_area`를 읽도록 바꾸는 후속 작업이 있어야 화면에 반영된다.
- commercial-service 가 `dataset_fact` / `dataset_active_release`를 분기마다 골라 읽던 조회 경로는 2026-09-10 제거했다(`commercial-service.md` 「분기 데이터셋 조회 방향」). 이 서비스는 2024년 1분기 이후 분기를 적재만 하고, 기존 팩트 테이블에 컬럼을 추가한 뒤 적재분을 이관하는 작업이 후속이다. 이관 시 `CONSUMPTION_*` 의 `income_commercial` 소득 두 컬럼은 2024년 이후 원천에 없다(위 컬럼 차이).
- `spring-batch-test`가 의존성에 없어 Job 배선(@StepScope 프록시, 실행 컨텍스트 승격, 재시작)을 부팅해 검증하는 테스트가 없다.
- Persistence 테스트는 `JdbcTemplate`을 목으로 대체하므로 SQL 문법과 락 동작은 개발 DB 실행에서만 검증된다.
- `--expected-rows`는 분기 인자를 존중하는 서비스에서는 `list_total_count`로 자동 확정할 수 있다. 지금은 dry-run 한 번으로 값을 읽어 새 run-id로 다시 돌리는 절차를 유지한다.
- 2026-09-09 개발 DB: `legacy-20233` 공간 게시와 `CHANGE_COMMERCIAL` `20241` dry-run(1650/1650)까지 통과했다. 같은 데이터셋 실게시와 나머지 데이터셋·분기 적재가 남아 있다.

## 실행 예시

대상 스키마에 `scripts/migration/spring-batch-schema-mysql.sql`과 `quarterly-dataset-schema.sql`을 적용한다. `quarterly` 프로파일은 `initialize-schema: never`라서 메타 테이블이 없으면 기동 단계에서 실패한다. 2026-09-09 기준 `bosspickseoul_commercial_dev`에는 두 스크립트를 적용했다. 확인 SQL은 `scripts/migration/quarterly-import-verify.sql`이다.

그다음 공간 스냅샷을 검증한다. 레거시 테이블에서 뽑는 경우 `BATCH_LEGACY_SPATIAL_SCHEMA`가 필수다.

```text
SPRING_PROFILES_ACTIVE=quarterly BATCH_DB_URL=jdbc:mysql://host:3306/bosspickseoul_commercial_dev \
BATCH_ALLOWED_SCHEMAS=bosspickseoul_commercial_dev \
BATCH_LEGACY_SPATIAL_SCHEMA=bosspickseoul_district_dev SEOUL_OPEN_DATA_API_KEY=... \
java -jar batch-service.jar --job=spatial --run-id=spatial-legacy-20233-001 \
  --source=LEGACY --spatial-version=legacy-20233 --source-updated-at=2023-12-31T00:00:00Z --dry-run=true
```

변환기로 만든 파일(「GEOJSON 파일 만들기」)이 있으면 `--source=GEOJSON --source-file=seoul-spatial-v2024.geojson --spatial-version=seoul-v2024`다. `BATCH_LEGACY_SPATIAL_SCHEMA`는 필요 없다.

검증 결과를 확인한 뒤 같은 입력을 새 `run-id`로 `--dry-run=false` 실행한다. 사실 데이터는 데이터셋·분기마다 별도 실행한다. PowerShell 명령과 분기 반복은 [batch-quarterly-import.md](batch-quarterly-import.md)에 있다.

```text
java -jar batch-service.jar --job=facts --run-id=change-commercial-20241-001 \
  --dataset=CHANGE_COMMERCIAL --period=20241 --source=API \
  --spatial-version=legacy-20233 --schema-version=seoul-v1 \
  --expected-rows=1650 --source-updated-at=2024-03-31T00:00:00Z --dry-run=true
```

분기 인자를 무시하는 서비스는 첫 분기를 `API`로 받은 뒤 `dataset_release.raw_location`을 다음 분기에 재생한다.

```text
java -jar batch-service.jar --job=facts --run-id=population-commercial-20242-001 \
  --dataset=POPULATION_COMMERCIAL --period=20242 --source=ARCHIVE \
  --source-file=<20241 실행의 raw_location 디렉터리> \
  --spatial-version=legacy-20233 --expected-rows=<20242 행 수> --source-updated-at=2024-06-30T00:00:00Z --dry-run=true
```

`--expected-rows`는 **대상 분기 한 개의 행 수**다. 분기 인자를 존중하는 서비스(위 실호출 표의 O)는 `.../1/1/<period>` 한 번 호출한 `list_total_count`가 그 값이다. 분기 인자를 무시하는 서비스(X)는 `list_total_count`가 모든 분기의 합이므로 그대로 쓰면 게시가 항상 실패한다. 값을 모를 때는 `--dry-run=true`로 한 번 실행한다. 게시 단계 예외 메시지에 `expected=… input=… accepted=… rejected=… duplicate=… unmapped=…`가 찍히고, 검증 감사는 게시가 거부돼도 커밋되므로 `dataset_release.accepted_count`에서도 같은 값을 읽을 수 있다. 다만 `expected_rows`는 요청 지문에 포함되므로, 값을 고쳐 다시 실행할 때는 **새 `run-id`** 를 써야 한다.

`--dry-run=false`는 새 run ID로 다시 실행해야 하며, 같은 분기의 이전 release는 삭제하지 않는다. `20233`은 기존 서비스 테이블에서 계속 읽고, 새 release는 공간 버전 인식 조회가 배포될 때까지 기존 API의 기본값으로 사용하지 않는다.
