# Simulation Data Sources

## Purpose

창업 시뮬레이션 기준 데이터 3종(`simulation_rent`, `simulation_service_type`, `simulation_franchisee`)의
원천 출처와 재수집 절차를 정리한다. 현재 적재된 데이터는 V1 프로젝트에서 이식한 **2023–2024 수집분**이며,
재수집 시 이 문서의 출처에서 받아 새 `base_year`로 적재한다.

## 기준 시점 표현 원칙

- 기준 데이터 3종은 **연 단위(`base_year`, 예: `2024`)** 로 표현한다. 분기 코드(예: 20233)는 쓰지 않는다.
  - 프랜차이즈 정보공개서는 **연 1회 공시**라 분기 개념이 없다.
  - 임대료·권리금 원천(임대동향조사)은 분기 조사지만, 시뮬레이션은 "현재 기준 대표값" 하나면 충분하다.
    재수집 시 해당 연도의 최신 분기(또는 연평균) 값을 대표값으로 적재한다.
- 상권분석 데이터(`sales_district` 등)는 기존 분기 체계(`periodCode`)를 그대로 유지한다 —
  시뮬레이션의 성별·연령/성수기 분석은 이쪽을 사용한다.
- 활성 연도 전환: `app.simulation.data-base-year` 설정 (기본 `2024`, `SimulationProperties`).

## 테이블별 원천 매핑

### 1. `simulation_franchisee` — 프랜차이즈 창업 비용

- **원천**: 공정거래위원회 가맹사업정보제공시스템 (https://franchise.ftc.go.kr) 정보공개서
- **API (공공데이터포털, 활용신청 필요)**:
  - [공정거래위원회_가맹정보_정보공개서 목록 조회](https://www.data.go.kr/data/15125569/openapi.do)
    — 등록 정보공개서(브랜드) 목록. 브랜드명·업종 분류 확보용
  - [공정거래위원회_가맹정보_업종별 창업비용 현황 제공 서비스](https://www.data.go.kr/data/15110293/openapi.do)
    — 연도·업종 분류별 가맹금(가입비/교육비/보증금/기타) 현황
- **컬럼 매핑** (금액 단위: 천원):

| 컬럼 | 원천 항목 |
|---|---|
| `brand_name` | 정보공개서 브랜드명 |
| `subscription` / `education` / `deposit` / `etc` | 가맹금 구성 항목 (가입비/교육비/가맹보증금/기타비용) |
| `total_levy` | 위 4개 항목 합계 |
| `interior` / `unit_area` / `area` | 인테리어 비용 / 3.3㎡당 인테리어 비용 / 기준 점포 면적 |
| `service_code` / `service_name` | 정보공개서 업종 분류를 서울시 상권 업종 코드(CS*)로 매핑 — **수집 시 매핑 표 필요** |

- **주의**: 정보공개서 업종 분류와 서울시 상권 업종 코드(CS100001 등)는 체계가 다르다.
  V1도 수동 매핑했으므로, 재수집 시 30개 업종 매핑 표를 함께 관리한다 (`simulation_service_type` 기준).

### 2. `simulation_rent` — 자치구별 임대료

- **원천**: 한국부동산원 상업용부동산 임대동향조사 ([R-ONE 부동산통계정보시스템](https://www.reb.or.kr/r-one/))
- **데이터 (파일 다운로드 또는 API)**:
  - [한국부동산원_상업용부동산 임대동향조사_분기별 지역별 임대료(소규모상가)](https://www.data.go.kr/data/15069766/fileData.do)
    — 중대형/소규모/집합 상가별 데이터셋이 각각 존재
  - 보조: [서울시 매장용빌딩 임대료·공실률 및 수익률 통계](https://data.seoul.go.kr/dataList/DT201004K0200112021/S/2/datasetView.do) (서울열린데이터광장)
- **컬럼 매핑**: `first_floor_rent`/`other_floor_rent`/`total_rent` ← 층별 임대료.
  원천 단위(천원/㎡)를 **3.3㎡당 월환산임대료(원)** 로 변환해 적재한다 (V1 형식 유지).
  자치구 코드는 행정표준코드 5자리(`11740` 등), `11100`은 서울시 전체 평균 행.

### 3. `simulation_service_type` — 업종별 매장 크기·권리금

- **권리금** (`key_money_average`/`key_money_level`/`key_money_ratio`):
  한국부동산원 상업용부동산 임대동향조사 내 **권리금 현황** —
  [공표보고서](https://www.data.go.kr/data/15103145/fileData.do) 또는 R-ONE 통계 메뉴
- **매장 크기** (`small_size`/`medium_size`/`large_size`, ㎡):
  업종별 소/중/대 기준 면적. 정보공개서의 업종별 기준 점포 면적 분포 또는
  소상공인 상권정보시스템(https://sg.sbiz.or.kr) 업종 표준을 참고해 산정 (V1 산정 기준은 미상 — 재수집 시 기준 명문화 필요)

## 재수집 → 적재 절차

1. 위 출처에서 새 연도 데이터 수집 (공공데이터포털 API는 활용신청 후 인증키 발급)
2. `backend/scripts/data-migration/`에 수집분을 시드 SQL로 변환
   (V1 이식은 `convert_v1_simulation_seed.py` — 신규 수집분은 별도 변환 스크립트 작성, `BASE_YEAR`를 새 연도로)
3. 새 `base_year`로 INSERT — 기존 연도 데이터는 삭제하지 않는다 (롤백용 공존).
   같은 연도를 다시 적재할 때만 `DELETE FROM simulation_franchisee WHERE base_year = '<연도>'` 선행
   (rent/service_type은 유니크 제약이 재실행을 막아준다)
4. `app.simulation.data-base-year`를 새 연도로 전환 후 배포
5. 검증: `POST /api/v1/simulations/reports` 응답의 `dataBaseYear`가 새 연도인지 확인

## 관련 파일

- 테이블 DDL 런북: `backend/scripts/migration/simulation-tables-runbook.sql`
- 시드: `backend/service/commercial-service/src/main/resources/db/simulation-seed.sql`,
  `backend/scripts/data-migration/simulation-franchisee-seed.sql`
- 설정: `SimulationProperties` (`app.simulation.data-base-year`)
- 컨텍스트 문서: `docs/services/commercial-service.md` "창업 시뮬레이션" 절
