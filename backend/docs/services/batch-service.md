# 분기 데이터 적재

## 구현 범위와 호환성 결정

`commercialAnalysisImportJob`은 데이터셋·분기 한 건을 실행 단위로 삼는다. 수동 CLI(`quarterly` 프로파일)와 상시 인스턴스의 자동 최신화(아래 「분기 적재 자동 최신화」)가 같은 Job을 띄운다. 자동 최신화는 데이터셋별 제공 여부를 탐지해 마지막 게시 분기 다음 분기만 실행한다. CSV/ZIP 백필과 서울 Open API 수집을 동일한 검증·게시 경로로 처리한다.

원본 보관 → chunk staging → 자연키/필수값/분기/공간 코드 검증 → 불변 release 게시 → 해당 데이터셋·분기·공간 버전 포인터 전환 순서다. 게시 트랜잭션은 분기 전체를 교체하며 이전 release를 삭제하지 않는다. 같은 runId 재시도는 staging부터 다시 읽고, 이미 게시된 runId는 변경하지 않는다.

기존 `commercial_region_mapping`, `area_boundary`는 이 배치가 수정하지 않는다. 분석 팩트는 먼저 `dataset_fact`에 불변 릴리스로 보관한 뒤 `--job=project`가 기존 팩트 테이블 15종 컬럼으로 이관한다. 이관 행에는 `spatial_version`이 있어 20233과 2024 표준단위구역을 같은 상권 코드로 섞지 않는다. 공개 API는 공간 버전을 받지 않고, 서비스 설정 `DATASET_SPATIAL_VERSION`이 읽을 기준을 고른다. 원천의 재공표로 과거 분기도 새 공간 기준을 사용할 수 있으므로 연도만으로 기준을 추정하지 않는다.

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
- **소득뿐 아니라 소비 금액도 2024년 1분기부터 전부 0이다.** 2026-09-15 전수 실측(22분기 23,980행): `20211`~`20234`는 값이 있으나 **22개 분기 값이 전부 같고**(1,090개 상권 전수 대조, 분기 간 차이 0곳), `20241`~`20262`는 **모든 행의 모든 지출 항목이 0**이다. 즉 이 데이터셋에서 얻을 수 있는 실질 데이터는 스냅샷 하나뿐이다. 데이터셋 공지(OA-21278)도 "행정동보다 작은 상권크기의 데이터의 제공이 어려워 더 이상 갱신되지 않습니다"라고 밝히고 있다. **적재해도 0만 쌓이므로 `20234` 이후 분기를 새로 게시하지 않는다.**
- 커버리지도 좁다. 배후지는 상권 1,090곳만 덮어 `dataset_spatial_area`의 1,650곳 중 560곳은 2024년 이후 행 자체가 없다. 조회 측은 이 결손을 404가 아니라 지표 강등으로 다뤄야 한다.
- 반면 **행정동(`VwsmAdstrdNcmCnsmpW`)·자치구(`VwsmSignguNcmCnsmpW`) 소비는 정상이다.** 같은 실측에서 `20262`까지 값이 있고 분기별로 실제 변동한다(행정동 425/425, 자치구 25/25). 상권 소비를 되살린다면 이쪽을 `dataset_spatial_area.parent_code`로 끌어오는 경로가 유일한 선택지다.
- 소비 세부 항목이 스코프마다 다르다. 상권배후지는 `LSR_EXPNDTR_TOTAMT`(여가)·`CLTUR_EXPNDTR_TOTAMT`(문화)가 나뉘고, 행정동·자치구(`NcmCnsmpW`)는 `LSR_CLTUR_EXPNDTR_TOTAMT`로 합산되며 `ETC_EXPNDTR_TOTAMT`·`FD_EXPNDTR_TOTAMT`가 추가된다. `income_district`는 총액만 가지므로 영향이 없다.
- **`income_administration`은 2026-09-17 부로 총액 + 세부 10항목을 적재한다**(이슈 #415). 상권 소비가 끊긴 뒤 행정동 소비가 대체 원천이 되므로 총액만으로는 항목별 화면을 채울 수 없다. 스키마는 원천 그대로 두 곳이 상권과 다르다.

| | 상권 `income_commercial` (9항목) | 행정동 `income_administration` (10항목) |
| --- | --- | --- |
| 여가·문화 | `leisure_expense_amount` / `culture_expense_amount` (분리) | `leisure_culture_expense_amount` (합산) |
| 기타 | 없음 | `other_expense_amount` (`ETC_EXPNDTR_TOTAMT`) |
| 음식 | 없음 | `dining_expense_amount` (`FD_EXPNDTR_TOTAMT`) |
| 나머지 7항목 | 식료품·의류신발·생활용품·의료·교통·교육·유흥 | 같음 (컬럼명도 같다) |

  **합산 항목에 상권과 같은 이름을 쓰지 않는다.** 정의가 다른 값이 같은 이름으로 공존하면 조회 측이 둘을 구분하지 못한다(#413 의 `totalExpenseAmount` 가 같은 실수였다). 같은 이유로 여가·문화를 반으로 쪼개 상권 스키마에 맞추지 않는다 — 원천에 없는 수치를 만들어내는 일이다.
  세부 10항목은 `Dataset.CONSUMPTION_ADMINISTRATION.requiredMetrics()` 에서 **게시 필수**다. 2026-09-17 Open API 전수 호출(425개 행정동 × 22분기 `20211`~`20262`)에서 11개 금액 필드가 모두 존재했고 누락은 0건, 총액과 세부 항목합의 차이도 0이었다. 0 값은 있으나(최대 3.1%, 유흥) 결측은 없으므로 필수로 두는 쪽이 결손 행을 게시 전에 잡는다. `_RT`/`_AVRG` 가 아닌 금액 필드라 음수는 그대로 받는다(아래 항목 참고). DDL 은 `scripts/migration/income-administration-expense-detail-columns.sql`.
- 같은 실측에서 **425/425 행정동이 분기마다 값이 다르다.** 데이터셋 안내의 "1년중 4분기에 한번 업데이트하여 다음 해 1, 2, 3 분기의 값이 동일합니다" 는 낡은 문구다. 세 분기 값이 모두 같은 행정동은 `20211`·`20241`·`20251` 어느 구간에서도 0곳이었다.
- 나머지 12종은 레거시 테이블이 쓰는 컬럼이 모두 있다. 그 위에 레거시가 버린 컬럼(시간대·연령대 매출, 남녀 연령대 상주인구, 집객시설 세부 등)이 payload JSON에 그대로 남는다.
- `_RT`/`_AVRG` 음수는 거부한다. 금액(`_AMT`/`_TOTAMT`)과 건수(`_CO`)는 원천 잔차 보정으로 음수가 올 수 있어 그대로 받는다. 실측: `CONSUMPTION_ADMINISTRATION` `20242` 용산2가동 `TRNSPORT_EXPNDTR_TOTAMT=-3186000`. `SALES_ADMINISTRATION` `20243` 서교동 `CS200024` `TMZON_06_11_SELNG_CO=-1`.

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
- 실행 구성: 기본 dryRun, 명시 DB URL와 schema allowlist, Job 종료 코드. 자동 최신화는 상시 인스턴스의 Quartz 가 띄운다.

행 검증은 fail-closed다. 거부 행이 한 건이라도 있으면 게시하지 않고 Job이 실패한다. 2024년 이후 원천이 컬럼이나 코드 체계를 또 바꾸면 조용히 잘못된 값이 들어가는 대신 `dataset_rejected_row`에 근거를 남기고 멈춘다.

추가 라이브러리 없이 기존 Spring Batch/JDBC/Jackson/JUnit을 사용한다. 원천 서비스명·컬럼·분기 인자 동작은 샘플 키 실호출로 확인했다. 운영 명령·검증 SQL·분기 반복 절차는 [batch-quarterly-import.md](batch-quarterly-import.md)다.

## 남은 작업

- **2024년 표준단위구역 폴리곤이 배포됐는지 확인되지 않았다.** 변환 도구와 절차는 있다(「GEOJSON 파일 만들기」). 2026-09-09 기준 서울시 shapefile은 2023-10-20 파일이라 `LEGACY`(20233)와 같을 수 있고, 게시 전 대조가 필요하다. 새 버전이 생겨도 district-service 지도가 `dataset_spatial_area`를 읽도록 바꾸는 후속 작업이 있어야 화면에 반영된다.
- commercial-service 가 `dataset_fact` 를 분기마다 골라 읽던 조회 경로는 2026-09-10 제거했다. 이 서비스는 2024년 1분기 이후를 적재만 하고, `--job=project` 가 기존 팩트 테이블 15종 컬럼 + `spatial_version` 으로 이관한다. `CONSUMPTION_COMMERCIAL` 은 2026-09-15 확인으로 소득·소비 모두 원천이 끊긴 것이 확정됐다(위 「2024년 이후 컬럼 차이」). 월평균소득·소득구간은 조회 도메인에서 제거했고, 소비는 `20234` 이후 게시하지 않는다. 값을 만들지 않는다. `service_type` 도 원천에 없어 NULL 이다.
- 이슈 #415 1단계(배치)는 행정동 소비 세부 10항목 적재까지다. 배치가 `income_administration` 을 채워도 **commercial-service 조회 도메인은 아직 총액만 읽는다.** 행정동 소비를 상권 화면의 대체 원천으로 쓰는 것(부모 행정동 값 끌어오기, 출처 표기)은 후속 단계다.
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

## 기업마당 정책 수집

상시 `batch-service` 가 district(`BATCH_DB_URL`) 와 commercial(`COMMERCIAL_DB_URL`) 을 같이 본다. 새 스케줄러 서비스는 없다. `BATCH_POLICY_ENABLED=true` 이면 `policyCollectTrigger` / `policyPurgeTrigger` 가 등록되고, `quarterly` 처럼 `System.exit` 하지 않는다. Quartz JDBC JobStore 는 `dev` / `prod` 프로파일에만 있고(`application-dev.yml` / `application-prod.yml`), `local` · `quarterly` 는 메모리 스토어에 자동 시작 off 다. 끄는 절차는 아래 「분기 적재 자동 최신화」 되돌리기와 같다.

| 대상 | DataSource |
| --- | --- |
| Quartz `QRTZ_*`, Spring Batch 메타 | `BATCH_DB_URL` (district) |
| `policy` upsert / stale-mark / purge | `COMMERCIAL_DB_URL` (commercial, `policyJdbcTemplate` = `commercialJdbcTemplate` 별칭) |

접속 정보는 `batch.commercial.datasource.*`(env 는 그대로 `COMMERCIAL_DB_URL` / `DB_USERNAME` / `DB_PASSWORD`)로 옮겼다. 예전 `batch.policy.datasource.*` 는 없다.

| Job | cron (Asia/Seoul) | 역할 |
| --- | --- | --- |
| `policyCollectJob` | `0 0 6 * * ?` | 기업마당 API upsert + 완전성 게이트를 통과하면 BIZINFO stale-mark |
| `policyPurgeJob` | `0 30 6 * * ?` | `last_seen_at` 이 유예(기본 30일)를 넘긴 BIZINFO 행 DELETE |

기본 `batch.policy.enabled=false`. 켜려면 `BATCH_POLICY_ENABLED=true` 와 `BIZINFO_CRTFC_KEY`(기업마당 발급키), `BATCH_ALLOWED_SCHEMAS`(commercial 스키마 이름)가 필요하다. `BATCH_DB_URL` 은 district 로 둔다. prod 스키마 이름은 allowlist 에 넣지 않는다.

원천은 `https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do` 만 쓴다. 업종·자치구 코드는 1차에서 NULL. `SEED` 행은 stale-mark/purge 대상이 아니다.

운영 절차(Vault 키, DDL 을 어느 스키마에 넣는지, 매일 06:00/06:30 시나리오)는 [batch-policy-ingest.md](batch-policy-ingest.md)다.
스키마 런북: commercial 은 `scripts/migration/policy-ingest-columns-runbook.sql` + 시드, district 는 `quartz-schema-mysql.sql`. 확인은 `policy-ingest-verify.sql` / `policy-ingest-verify-district.sql`. `spring.quartz.jdbc.initialize-schema` 는 `never` 다.

## 분기 적재 자동 최신화 (이슈 #445)

상시 `batch-service`(dev)가 매일 05:00 KST 에 서울 Open API 를 탐지해 **마지막 게시 분기 다음 분기부터 원천 최신 분기까지**만 적재한다. 비어 있는 과거 분기(백필)는 계속 수동 CLI(`quarterly-import-plan.ps1`, [batch-quarterly-import.md](batch-quarterly-import.md))가 맡는다. 새 서비스·새 JAR 는 없다. 수동 CLI 와 **같은 Job**(`commercialAnalysisImportJob`, `typedFactProjectionJob`)을 같은 인자로 띄우므로 검증·게시 규칙(행 수 일치, 거부·중복·미매핑 0, 공간 READY, 더 새로운 원천 우선)은 한 곳에만 있다.

### 한 줄 요약

| 질문 | 답 |
| --- | --- |
| 켜는 스위치 | `BATCH_DATASET_REFRESH_ENABLED=true` (기본 false). 켜야 Quartz 트리거가 등록된다 |
| 실제로 게시하나 | `BATCH_DATASET_REFRESH_PUBLISH=true` 일 때만. 기본 false 는 탐지·수집·dry-run 까지 |
| 언제 도나 | 매일 05:00 KST (`0 0 5 * * ?`). misfire 는 버린다 — 낮에 재기동하면 다음날 05:00 |
| 한 run 에 몇 분기 | 데이터셋당 최대 1분기(`max-quarters-per-run`). 상시 컨테이너 메모리 512m 을 지키려는 값이다 |
| API 한도 | run 당 600회(`max-api-calls-per-run`). 키당 하루 1,000회라 수동 CLI 몫을 남긴다 |
| 화면 기본 분기 | 바꾸지 않는다(`AnalysisPeriodDefaults`, FE `selection.ts` 는 별도 이슈) |

### DataSource

| 대상 | DataSource | 빈 |
| --- | --- | --- |
| Spring Batch `BATCH_*`, Quartz `QRTZ_*` | 기본 DataSource `BATCH_DB_URL` (district) | `districtTransactionManager` (`@BatchTransactionManager` · `@QuartzTransactionManager`) |
| 영역 좌표 `area_boundary` | 기본 DataSource (district) | `districtJdbcTemplate` / `districtTransactionManager` |
| `dataset_*` 적재·이관, `dataset_refresh_state`, 스테이징 정리 | `COMMERCIAL_DB_URL` (commercial, 풀 `batch-commercial`) | `commercialJdbcTemplate` / `commercialTransactionManager` |
| `policy` | 같은 풀 | 같은 빈 (`policyJdbcTemplate` / `policyTransactionManager` 는 별칭) |

`district*` 두 빈은 `defaultCandidate = false` 라 무자격 주입의 기본 후보는 commercial 빈이다. 기본 DataSource 에 쓰는 코드는 이름을 적는다(`DistrictDataSourceConfig`). 두 번째 풀이 없을 때(플래그 off · quarterly CLI)는 두 매니저가 같은 DataSource 를 감싸 서로의 트랜잭션에 참여한다. 두 번째 풀은 `batch.commercial.datasource.{maximum-pool-size: 4, minimum-idle: 1, pool-name: batch-commercial}` 이고 Hikari 메트릭이 `hikaricp_*{pool="batch-commercial"}` 로 나간다.

`CommercialDataSourceConfig` 는 정책·자동 최신화·스테이징 정리 중 하나라도 켜지고, `COMMERCIAL_DB_URL` 이 비어 있지 않고, 기본 DataSource URL 과 다를 때만 두 번째 풀을 연다. quarterly CLI 는 `COMMERCIAL_DB_URL` 을 받지 않으므로 기본 DataSource(= commercial)를 그대로 쓴다. 기동 가드는 둘이다. 걸리면 기동이 멈춘다(fail-closed). prod 는 첫 가드로 막힌다.

- `global/config/CommercialDataSourceGuardRunner` — commercial Job 이 하나라도 켜지면 commercial URL 이 기본 DataSource URL(`spring.datasource.url`, 두 번째 풀 조건과 같은 키)과 다른지, `BATCH_ALLOWED_SCHEMAS` 에 있는지, 이름에 `prod` 가 없는지. 정책 수집의 가드도 이것이다
- `dataingestion/adapter/in/scheduler/DatasetRefreshGuardRunner` — 자동 최신화가 켜졌을 때 `SEOUL_OPEN_DATA_API_KEY`, 공간·스키마 버전 형식, commercial 에 `dataset_refresh_state` 가 있는지(`information_schema.tables`)

### 판단 순서 (데이터셋 1종, `DatasetRefreshProcessor`)

데이터셋은 ps1 `Order` / coverage.sql `run_order` 순서로 돈다(`Dataset.inRunOrder()`). 0 단계와 순회·run 전체 API 예산·상태 저장·메트릭은 `DatasetRefreshRunProcessor` 가, 1~9 단계는 `DatasetRefreshProcessor` 가 한다.

0. 공간 스냅샷(`spatial-version`, 기본 `legacy-20233`)이 READY 가 아니면 run 전체를 멈춘다 — `SPATIAL_NOT_READY`
1. 게시 분기가 없으면 건너뛴다 — `NO_BASELINE` (첫 분기는 수동 CLI)
2. 최근 실패 후 7일(`failure-cooldown-days`) 안이면 재이관까지 포함해 아무것도 하지 않는다 — `COOLDOWN`. 매일 실패하는 무거운 이관을 매일 다시 돌리지 않는다
3. 재이관: 게시돼 있는데 typed 행 수가 `accepted_count` 와 다른 슬롯(coverage.sql 5절 판정)을 새 분기보다 먼저 이관한다 — `PROJECTED` / publish=false 면 dry-run 이관 `WOULD_PROJECT`. `reproject-from`(기본 `20234`) 이전 슬롯은 보지 않는다(20211~20233 은 레거시 행이 이관 없이 이미 있다). publish=false 의 dry-run 재이관은 (데이터셋, 분기)마다 한 번이다(`last_reproject_dry_run_period` 보다 늦은 슬롯만). 성공하면 연속 실패를 끊고, 실패하면 `FAILED` 로 쿨다운에 들어간다
4. 후보 = 마지막 게시 분기 다음. 원천이 끊긴 데이터셋(`CONSUMPTION_COMMERCIAL`, 20234 까지)은 API 를 부르지 않는다 — `DISCONTINUED`. 재이관이 데이터셋당 분기 상한(`max-quarters-per-run`)을 다 썼으면 — `BUDGET`
5. 탐지: `/1/1/<후보>` 한 번(재시도도 예산에서 뺀다). 분기 인자를 존중하는 6종은 행이 없으면 `NOT_PUBLISHED_YET`. 무시하는 9종은 전 기간 합계가 지난번과 같고 새로 볼 분기가 없으면 `UNCHANGED`
6. 받을 페이지 수(`ceil(total/1000)`)가 남은 예산보다 크면 — `BUDGET`
7. 수집: 전 페이지를 `page-<start>.json` 으로 보관하고 분기별로 센다(`acquire`). 페이지마다(재시도 포함) run 예산(`ApiCallBudget`)을 쓰고, 탐지 뒤 합계가 늘어 예산을 넘기면 받다 만 페이지를 버리고 `BUDGET`(실패·쿨다운 아님). 보관본 위치는 게시 판단 전에 `last_fetch_run_id` / `last_fetch_raw_location` 에 남긴다. 무시하는 9종은 마지막 게시 분기보다 늦은 분기를 오름차순으로, 재이관과 합쳐 분기 상한까지 고른다
8. 분기마다: 고정 행 수(CHANGE_COMMERCIAL 1650, 자치구 3종 25)와 다르거나 직전 분기 게시 행 수 대비 20%(`tolerance`)를 넘게 바뀌면 `IMPLAUSIBLE` 로 멈춘다(직전 기준이 0 이하여도 같다). 통과하면 보관본을 ARCHIVE 로 재생해 dry-run → publish=false 면 `WOULD_PUBLISH`. publish=true 면 실게시 → typed 이관 → `PUBLISHED`. 이관만 실패하면 `PUBLISHED_NOT_PROJECTED` 이고, 게시는 됐으므로 쿨다운을 걸지 않아 다음 run 의 3단계가 바로 다시 이관한다
9. `dataset_refresh_state` 를 갱신한다. 원천 합계·최신 분기는 성공했을 때만 기억한다(실패한 합계를 기억하면 쿨다운 뒤에도 UNCHANGED 로 영영 건너뛴다)

데이터셋 하나에서 난 예외·`Error` 는 그 데이터셋의 `FAILED` 로 흡수하고 다음 데이터셋으로 간다. `OutOfMemoryError`·`StackOverflowError` 같은 JVM 오류(`VirtualMachineError`)는 삼키지 않는다. 그래도 그때까지의 판단 메트릭·쓴 API 수·`batch_dataset_refresh_last_run_epoch` 는 `finally` 에서 남기고 `[dataset-refresh] run aborted` 를 ERROR 로 찍는다.

`source_updated_at` 은 분기 말일 00:00 UTC(`Quarter.endInstant()`)로 ps1 `Get-SourceUpdatedAt` 와 같다. run-id 는 `auto-<dataset>-<분기>-<yyyyMMddHHmm KST>-{fetch|dry|pub}`, 이관은 `auto-project-<dataset>-<분기>-<시각>` 이다. 수동 규칙(`<dataset>-<분기>-<attempt>`)과 `auto-` 접두로 겹치지 않고 64자를 넘지 않는다(`DatasetRefreshProcessorTest` 가 15종 전부 확인).

`service_type` 미해석(`service_category` 에 없는 업종 코드)은 게시를 막지 않는다. WARN 로그 `[dataset-refresh] service_type unresolved ...` 와 메트릭으로 드러내고, 원인은 coverage.sql 6절로 본다.

### 코드 구조와 빈 조립

```text
DatasetRefreshQuartzJob (adapter/in/scheduler, 플래그 가드)
  → DatasetRefreshUseCase = DatasetRefreshFacade      run 호출 + 요약 로그만. 트랜잭션 없음
    → DatasetRefreshRunProcessor                      공간 READY(SpatialReleasePort.isReady), 상태 일괄 조회·저장, 순서, run 전체 API 예산, 메트릭
      → DatasetRefreshProcessor                       데이터셋 1종 판단(위 1~9)
        → DatasetSourcePort / DatasetReleasePort / TypedFactProjectionPort / DatasetImportExecutionPort
```

- Quartz Job 을 Spring Batch Job 으로 감싸지 않는다. 유스케이스가 분기 적재 Job(`commercialAnalysisImportJob`, `typedFactProjectionJob`)을 데이터셋마다 직접 띄우므로 오케스트레이션 run 자체는 `BATCH_JOB_EXECUTION` 을 남기지 않는다. run 기록은 로그 `[dataset-refresh] run finished`, 메트릭 `batch_dataset_refresh_*`, `dataset_refresh_state` 에 있다. 정책 수집·스테이징 정리는 Quartz Job 이 Batch Job 하나를 띄우는 구조라 다르다
- Job 파라미터 직렬화는 `adapter/in/batch` 의 `ImportJobParameters` / `ProjectionJobParameters` 한 곳이다. 수동 CLI(`QuarterlyImportRunner`)와 `SpringBatchImportExecutionAdapter` 가 같은 클래스를 쓴다
- **빈 조립 규칙(dataingestion)** — JDBC·원천·공간 포트 어댑터와 CLI 시절부터 있던 Processor 3종(`DatasetRowProcessor`, `SpatialImportProcessor`, `TypedFactProjectionProcessor`)은 `QuarterlyImportConfig` 의 `@Bean` 으로 조립한다. 어댑터마다 `commercialJdbcTemplate` 한정자와 공유 `ObjectMapper` 인스턴스(빈으로 올리면 Boot 기본 ObjectMapper 가 물러난다)를 한 곳에서 고르기 위해서다. 자동 최신화·스테이징 정리에서 추가한 Facade·Processor·Tasklet·Job 실행 어댑터·메트릭 어댑터·가드는 policyingestion 과 같이 스테레오타입(`@Service` / `@Component`)으로 둔다. 이들은 빈만 주입받고, 이름이 필요한 의존(Job, 트랜잭션 매니저)은 생성자 `@Qualifier` 로 고정한다. 새 JDBC 어댑터는 `QuarterlyImportConfig` 에, 새 application 계층 클래스는 스테레오타입으로 추가한다
- **테스트 환경 격리** — Jenkins 는 Vault env 전체(`SPRING_PROFILES_ACTIVE=dev`, 롤아웃 뒤 `BATCH_*_ENABLED=true` 등)를 넣은 채 `:test` 를 돈다. `StandardEnvironment`·`ApplicationContextRunner`·yml 로딩을 쓰는 테스트는 테스트 지원 클래스 `support/IsolatedEnvironment`(`create()` / `contextRunner()`)로 시스템 env·시스템 속성 property source 를 걷어 낸다. 그대로 두면 `@ConditionalOnProperty`·설정 바인딩이 env 플래그를 읽고, Boot 3.5 가 코드로 정한 프로파일에 env 프로파일을 합친다(`[quarterly, dev]`). 확인은 `SPRING_PROFILES_ACTIVE=dev BATCH_POLICY_ENABLED=true ... ./gradlew.bat --no-daemon :service:batch-service:test --rerun`(데몬이 이전 env 를 들고 있지 않게 `--no-daemon`)

### "데이터 없음" 응답 — 실호출 확인 필요

저장소 문서에 아직 없는 분기를 요청했을 때의 실호출 기록이 없다. 서울 열린데이터광장 공통 코드로 알려진 `RESULT.CODE = INFO-200`("해당하는 데이터가 없습니다")을 **최상위 또는 서비스 키 아래** 어디에 오든 "행 없음"으로 받고, 그 밖의 비-`INFO-000` 은 계속 예외로 둔다(`SeoulDatasetSourceAdapter.NO_DATA`, fixture 는 `SeoulDatasetSourceProbeAcquireTest`). 사실 적재 세션은 `INFO-200` 도 계속 오류로 본다. publish=false 롤아웃 첫 주에 아래를 한 번 실호출해 모양을 확인하고, 다르면 두 곳을 함께 고친다.

```text
GET http://openapi.seoul.go.kr:8088/<KEY>/json/VwsmTrdarSelngQq/1/1/<아직 없는 분기>
```

모양이 다르면 첫 run 에서 그 데이터셋이 `FAILED` 로 남고 7일 쿨다운에 들어간다. 게시로 이어지지는 않는다.

### 설정

| env | 기본 | 의미 |
| --- | --- | --- |
| `BATCH_DATASET_REFRESH_ENABLED` | `false` | 트리거 등록 |
| `BATCH_DATASET_REFRESH_PUBLISH` | `false` | 실게시 여부 |
| `BATCH_DATASET_REFRESH_CRON` | 빈 값 → `0 0 5 * * ?` | Asia/Seoul |
| `BATCH_DATASET_REFRESH_SPATIAL_VERSION` | 빈 값 → `legacy-20233` | 게시·판단 기준 공간 버전 |
| `SEOUL_OPEN_DATA_API_KEY` | (없음) | 켜면 필수. 채팅·커밋에 넣지 않는다 |
| `BATCH_RAW_DIRECTORY` | `/app/data/raw` | compose 고정. `batch-raw` 볼륨(수동 `batch-service-job` 과 공유) |
| `BATCH_ALLOWED_SCHEMAS` | 정책과 공유 | `bosspickseoul_commercial_dev` |

`max-api-calls-per-run` 600(재시도 포함 실제 시도 수), `max-quarters-per-run` 1(재이관·새 분기 합계), `tolerance` 0.2, `failure-cooldown-days` 7(재이관 포함), `reproject-from` `20234` 는 `application.yml` 값이다.

### 상태 테이블

`dataset_refresh_state`(commercial). DDL 은 `backend/scripts/migration/dataset-refresh-state-schema.sql` 이고 앱이 만들지 않는다. "원천을 또 받을지" 판단용 캐시라 행을 지워도 다음 run 이 한 번 더 받을 뿐 게시는 깨지지 않는다. 게시 여부의 정본은 `dataset_release` / `dataset_active_release` 다.

- `last_fetch_run_id` / `last_fetch_raw_location` — 마지막 수집의 run-id 와 보관 디렉터리. `IMPLAUSIBLE`·dry-run 실패여도 남는다. 원인을 확인한 뒤 수동 CLI 로 `--source=ARCHIVE --source-file=<last_fetch_raw_location>` 재생한다(API 를 다시 쓰지 않는다)
- `last_reproject_dry_run_period` — publish=false 에서 마지막으로 dry-run 재이관한 분기. 이 분기까지는 다시 dry-run 하지 않는다. 지우면 처음부터 한 번씩 다시 dry-run 한다
- 이미 예전 DDL 로 만든 환경이면 런북 상단 주석의 `ALTER TABLE ... ADD COLUMN last_reproject_dry_run_period` 를 한 번 실행한다

### 개발서버 롤아웃

1. **DDL** — Workbench 에서 `bosspickseoul_commercial_dev` 를 고르고 `dataset-refresh-state-schema.sql` 실행(`last_reproject_dry_run_period` 포함. 예전 DDL 로 이미 만들었으면 런북 주석의 `ALTER TABLE` 한 줄). `quarterly-dataset-schema.sql` 은 이미 적용돼 있어야 한다. district 의 `BATCH_*` / `QRTZ_*` 는 정책 수집 때 만든 것을 그대로 쓴다. 확인은 `quarterly-import-verify.sql` 1) 블록. 테이블이 없으면 4단계에서 `DatasetRefreshGuardRunner` 가 기동을 멈춘다
2. **Vault** — `kv/bosspickseoul/backend/dev/env` 에 **patch** 로 `BATCH_DATASET_REFRESH_ENABLED=true`, `SEOUL_OPEN_DATA_API_KEY=<키>` 를 넣는다. `BATCH_DATASET_REFRESH_PUBLISH` 는 넣지 않거나 `false`. `COMMERCIAL_DB_URL` / `BATCH_ALLOWED_SCHEMAS` 는 정책 수집 값 그대로. `put` 은 나머지 키를 지운다
3. **재배포** — Jenkins `batch-service-dev` 만. compose 가 `batch-raw` 볼륨을 새로 붙인다. 메모리 상한 `BATCH_SERVICE_MEM_LIMIT_DEV` 는 바꾸지 않는다(512m)
4. **기동 확인** — 가드 예외(`COMMERCIAL_DB_URL`, `BATCH_ALLOWED_SCHEMAS`, `SEOUL_OPEN_DATA_API_KEY`, `dataset_refresh_state is missing`)가 없고 Quartz 가 `datasetRefreshTrigger` 를 등록했다. `/actuator/prometheus` 에 `hikaricp_connections{pool="batch-commercial"}` 가 보인다
5. **관찰(1주)** — 다음날 05:00 이후 로그 `[dataset-refresh] run finished ... results={...}` 와 `slot dataset=... result=...`, `SELECT * FROM dataset_refresh_state`(`quarterly-import-verify.sql` 6) 블록). `WOULD_PUBLISH` 가 뜬 데이터셋은 `dataset_release` 에 `auto-...-dry` 가 `DRY_RUN` 으로 남는다. **첫 run 의 JVM heap 을 본다** — `WOULD_PROJECT`(dry-run 재이관)도 실이관과 같은 양을 읽으므로 메모리 위험은 publish=false 첫 run 부터다(아래 알려진 한계). `[dataset-refresh] run aborted` 가 있으면 OOM 등으로 끊긴 것이다. 첫 주에 위 「데이터 없음」 실호출을 확인한다
6. **게시 전환** — 결과가 기대대로면 Vault 에 `BATCH_DATASET_REFRESH_PUBLISH=true` patch 후 재배포. 다음 05:00 run 부터 `PUBLISHED` 가 나오고 coverage.sql 1)·5) 에서 해당 슬롯이 빠진다
7. **되돌리기** — Vault 에 `BATCH_DATASET_REFRESH_ENABLED=false` patch 후 재배포. 이미 게시된 릴리스는 그대로다(수동 게시와 같다). JDBC JobStore 는 트리거를 `QRTZ_*` 에 남기므로 두 겹으로 막는다
   - 기동 시 `DatasetRefreshQuartzCleanupConfig` 가 `datasetRefreshQuartzJob`(과 `datasetRefreshTrigger`)을 지운다. 로그 `[dataset-refresh] disabled, stored quartz job removed job=datasetRefreshQuartzJob`
   - 지우지 못했어도 `DatasetRefreshQuartzJob` 이 첫 줄에서 플래그를 보고 아무것도 하지 않는다. 로그 `[dataset-refresh] disabled, stale trigger ignored ...`
   - 확인: district 에서 `policy-ingest-verify-district.sql` 3) 블록에 `datasetRefreshQuartzJob` 행이 없어야 한다. 스테이징 정리(`BATCH_STAGING_PURGE_ENABLED`)와 정책 수집도 같은 방식이다

첫 run 을 05:00 전에 보고 싶으면 `BATCH_DATASET_REFRESH_CRON=0 0/15 * * * ?` 를 잠시 넣었다가 비운다(정책 수집과 같은 방법).

스테이징 정리를 켤 때(`BATCH_STAGING_PURGE_ENABLED=true`)는 먼저 아래 「스테이징 정리」의 `EXPLAIN` 두 문장을 commercial 에서 확인하고, 켠 뒤 첫 일요일 04:00 run 의 `[staging-purge] finished ...` 로그와 `quarterly-import-verify.sql` 7) 블록을 본다. 되돌리기는 같은 방식으로 `BATCH_STAGING_PURGE_ENABLED=false` 후 재배포다(저장된 `datasetStagingPurgeQuartzJob` 을 기동 시 지운다).

### 메트릭·로그

로그 접두 `[dataset-refresh]`. Prometheus(`/actuator/prometheus`):

- `batch_dataset_refresh_api_calls_total` — 쓴 API 호출 수
- `batch_dataset_refresh_slots_total{dataset,result}` — 판단 수. `result` 는 `DatasetRefreshResult` 이름
- `batch_dataset_refresh_service_type_unresolved_rows_total{dataset}` — 업종 미해석 이관 행
- `batch_dataset_refresh_last_run_epoch` — 마지막 run 이 끝난 시각(초). 켜진 인스턴스에만 등록한다. 첫 run 전 0 이 바로 울리지 않게 알람식에 `and batch_dataset_refresh_last_run_epoch > 0` 을 붙인다(observability-guide.md). 26시간 넘게 그대로면 트리거·기동을 의심한다
- `hikaricp_connections_*{pool="batch-commercial"}` — commercial 두 번째 풀(상한 4)

### 스테이징 정리 (기본 off)

`BATCH_STAGING_PURGE_ENABLED=true` 이면 일요일 04:00 KST(`BATCH_STAGING_PURGE_CRON`)에 `datasetStagingPurgeJob` 이 돈다. `dataset_staging` / `dataset_rejected_row` 만 **run 단위**로 5,000행 청크씩 지운다.

1. 후보 run 을 잠금 없는 SELECT 한 번으로 고른다(`dataset_release` LEFT JOIN `dataset_active_release` ... `a.run_id IS NULL`)
2. run 마다 `DELETE FROM dataset_staging WHERE run_id = ? AND <아직 대상 상태> AND <활성 아님> LIMIT ?` 를 짧은 청크가 나올 때까지 반복한다. PK `(run_id, source_row_number)` 선두 범위만 읽고 잠근다. `dataset_rejected_row` 도 PK 가 같은 모양이다
3. NEW / RUNNING 인 채 `abandoned-after-days`(기본 2일) 지난 run 은 먼저 `status='FAILED'`, `failure_reason='abandoned: ...'` 로 표시하고 지운다. 표시가 안 되면(그 사이 끝났거나 재시작) 손대지 않는다(로그 `skippedRuns`)

예전 `DELETE ... WHERE run_id IN (SELECT ...) LIMIT ?` 는 LIMIT 때문에 semijoin 으로 바뀌지 못해 청크마다 `dataset_staging` 전체를 PK 순으로 훑고 훑은 레코드마다 next-key 락을 걸었다(05:00 적재의 스테이징 INSERT 와 충돌).

**켜기 전 확인** — commercial 에서 아래 두 문장의 `EXPLAIN` 을 본다. 첫 문장은 `dataset_release` 전체(run 수만큼, 작다)와 `dataset_active_release` 의 FK 인덱스 조회, 두 번째는 `dataset_staging` 의 `PRIMARY` `range`(key_len 이 run_id 길이)여야 한다. `ALL` 이나 `index`(전체 인덱스 스캔)가 나오면 켜지 않는다.

```sql
EXPLAIN SELECT r.run_id, r.status FROM dataset_release r LEFT JOIN dataset_active_release a ON a.run_id = r.run_id
 WHERE a.run_id IS NULL AND ((r.status IN ('DRY_RUN','FAILED') AND r.acquired_at < NOW() - INTERVAL 7 DAY)
    OR (r.status = 'PUBLISHED' AND r.published_at < NOW() - INTERVAL 30 DAY) OR (r.status IN ('NEW','RUNNING') AND r.acquired_at < NOW() - INTERVAL 2 DAY));
EXPLAIN DELETE FROM dataset_staging WHERE run_id = '<후보 run_id>'
   AND EXISTS (SELECT 1 FROM dataset_release r WHERE r.run_id = '<후보 run_id>' AND r.status IN ('DRY_RUN','FAILED'))
   AND NOT EXISTS (SELECT 1 FROM dataset_active_release a WHERE a.run_id = '<후보 run_id>') LIMIT 5000;
```

결과 확인은 `quarterly-import-verify.sql` 6)(자동 run)·7)(오래된 NEW/RUNNING) 블록과 로그 `[staging-purge] finished candidateRuns=... abandonedRuns=... skippedRuns=...` 다.

| 대상 | 보존 |
| --- | --- |
| `DRY_RUN` / `FAILED` run 의 스테이징·거부 행 | 7일(`unpublished-retention-days`). 거부 행은 실패 원인을 읽는 곳이라 바로 지우지 않는다 |
| 교체된 `PUBLISHED` run 의 스테이징 | 게시 후 30일(`published-retention-days`) |
| NEW / RUNNING 인 채 버려진 run 의 스테이징·거부 행 | 시작 후 2일(`abandoned-after-days`). FAILED 로 표시한 뒤 지운다 |

`dataset_active_release` 가 가리키는 run 은 어떤 문장도 지우지 않고, `dataset_release` · `dataset_fact` 는 건드리지 않는다. 자동 최신화는 새 분기를 dry-run 할 때마다(원천에 새 분기가 나와 `WOULD_PUBLISH` 가 될 때, 데이터셋당 분기에 몇 번) `auto-...-dry` 스테이징을 남긴다. 매일 쌓이는 것은 아니지만 publish=false 로 오래 돌릴 때 켜는 것을 권한다.

### 알려진 한계

- **메모리** — typed 이관(`--job=project`)은 한 슬롯의 `dataset_fact` 를 통째로 읽는다. dry-run 이관도 같은 양을 읽는다. 그래서 위험 시점은 publish=true 전환 뒤가 아니라 **publish=false 첫 run 의 dry-run 재이관(`WOULD_PROJECT`)부터**다. `STORE_COMMERCIAL`(분기당 약 7.7만 행) 이관은 512m 컨테이너(heap 약 358MB)에서 여유가 크지 않다. 롤아웃 첫 05:00 run 의 JVM heap 을 본다. 부족하면 그 데이터셋만 수동 `batch-service-job`(1g)으로 이관한다. 데이터셋당 run 마다 재이관·새 분기 합쳐 1분기(`max-quarters-per-run`)라 한 run 이 무거운 이관을 연달아 하지는 않는다
- **Quartz JobStore 는 프로파일로만 갈린다** — `dev` / `prod` 는 JDBC 클러스터 JobStore 에 자동 시작, `local` / `quarterly` 는 메모리 스토어에 자동 시작 off 다(`QuartzJobStoreProfileTest`). 예전 `application.yml` 의 `spring.config.activate.on-property` 문서는 Spring Boot 3.5 가 지원하지 않는 키라 모든 프로파일에 적용됐고, 그래서 quarterly CLI 도 commercial 의 `QRTZ_*` 에 붙어 JDBC 로 떴다. 지금은 CLI 가 저장된 트리거를 발화하지 않는다. 로컬에서 스케줄을 돌려 보려면 `local,scheduler` 로 띄운다. **`local,scheduler` 는 로컬 DB 의 `QRTZ_*` 에만 붙인다.** dev district 를 가리키면 안 된다. Quartz 는 `QRTZ_*.SCHED_NAME`(= `spring.quartz.scheduler-name`) 이 같은 인스턴스끼리 클러스터가 되고, 꺼진 스케줄 정리(`StaleQuartzJobRemover`)는 그 이름의 Job 을 지운다. 로컬 플래그가 꺼진 채 dev district 에 같은 이름으로 붙으면 dev 의 정책·자동 최신화·스테이징 정리 Job 이 지워지고 다음 재배포까지 조용히 멈춘다. 그래서 상시 컨테이너(dev/prod)는 기존 이름 `quartzScheduler` 를 그대로 쓰고, `scheduler` 프로파일은 기본 `bosspickseoul-batch-local`(`BATCH_QUARTZ_SCHEDULER_NAME` 로 바꿀 수 있다)을 쓴다. 이름이 달라도 로컬 DB 에만 붙이는 것이 규칙이다(다른 이름은 실수에 대한 보조 방어다). `dev,scheduler` 조합도 쓰지 않는다 — 상시 컨테이너의 스케줄러 이름이 바뀌어 저장된 트리거와 끊긴다.
- **두 스키마 사이 원자성은 없다** — 스텝 트랜잭션(commercial)과 `BATCH_*` 메타(district, `districtTransactionManager`)는 따로 커밋된다(XA 없음). 메타 쓰기 자체는 이제 트랜잭션 안에서 돈다(예전에는 commercial 매니저가 붙어 문장마다 커밋됐다). 자동 최신화는 run-id 가 매번 새로워 재시작 경로를 쓰지 않는다
- **원천 보관 용량** — 무시하는 9종은 원천이 바뀐 날마다 전 기간을 `batch-raw` 에 새로 받는다(데이터셋당 수 MB). 볼륨 정리는 아직 없다
- **활성 릴리스 스테이징은 영구 보존** — 스테이징 정리는 활성 포인터가 가리키는 run 을 지우지 않으므로 게시 슬롯마다 `dataset_staging` 이 `dataset_fact` 와 같은 행 수로 남는다. 15종 합계 분기당 약 16만 행(STORE_COMMERCIAL 7.7만, STORE_ADMINISTRATION 3.5만, SALES_COMMERCIAL 2.2만, SALES_ADMINISTRATION 1.7만 등)이고 payload 를 행당 약 1KB 로 보면 분기당 약 160MB, 21분기(20211~20261)가 활성이면 약 3~4GB 가 `dataset_fact` 와 중복으로 남는다(추정. 실측은 commercial 의 `information_schema.tables` `data_length` + `index_length`). 줄이려면 활성 run 의 스테이징을 지우는 별도 결정이 필요하다(게시가 끝난 run 의 스테이징을 다시 읽는 코드는 없다. 이관은 `dataset_fact` 를 읽는다)
