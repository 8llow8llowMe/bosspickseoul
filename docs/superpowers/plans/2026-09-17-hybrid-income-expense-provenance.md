# 하이브리드 소득·소비 출처 모델 설계

> 상태: 설계 확정 · 선행: #413 (브랜치 `fix/be/commercial-income-source-discontinued`) · 구현: #415(BE) · #416(FE)

## 1. 목표

2024년 1분기 이후 **상권 단위** 소득·소비 원천이 중단·0화된 뒤에도, **무료 공공 원천만으로** 사용자에게 의미 있는 지표를 계속 제공한다. 값은 대체 출처임을 API 응답과 화면에 명시한다. 없는 수치를 만들어내지 않는다.

## 2. 원천 실측 (2026-09-17, Open API 전수 호출)

설계의 모든 전제는 실호출로 확인했다. 데이터셋 안내 문구와 어긋나는 부분이 있으므로 문구가 아니라 실측을 따른다.

| 원천 | 해상도 | 갱신 | 실측 |
| --- | --- | --- | --- |
| `VwsmTrdhlNcmCnsmpQq` 소비-상권배후지 | 상권 1,090 | **중단** | `20211`~`20234` 22개 분기 값이 전부 같은 스냅샷 하나, `20241`+ 전 행 0 |
| `VwsmAdstrdNcmCnsmpW` 소비-행정동 | 행정동 425 | 분기 | `20211`~`20262` **425/425 전부 분기마다 다름**, 총액 = 항목합 차이 0 |
| `VwsmSignguNcmCnsmpW` 소비-자치구 | 자치구 25 | 분기 | `20211`~`20262` 25/25 전부 분기마다 다름 |

데이터셋 안내에 "1년중 4분기에 한번 데이터를 업데이트 하여 다음 해 1, 2, 3 분기의 값이 동일합니다" 라고 적혀 있으나 **실측과 다르다.** 세 분기 값이 모두 같은 행정동은 `20211`·`20241`·`20251` 어느 구간에서도 0곳이었다. 낡은 문구로 보고 진짜 분기 데이터로 다룬다.

항목별 결측도 낮다 — 1,000행 표본에서 0인 비율은 유흥 3.1%, 생활용품 2.3%, 교통 2.2%이고 나머지는 0~0.2%다.

상권 → 행정동 매핑은 `dataset_spatial_area.parent_code` 에 상권 1,650곳 전부 존재한다. 매핑 손실이 없다.

**제외한 후보**: `SALES_*`(추정매출 — 점포 매출이지 가계 지출이 아니다), 통계청 SGIS(인구·가구·주택·사업체만 있고 소득 없음), KCB·KB 등 유료 계약 데이터.

## 3. 해상도 사다리

```
periodCode + commercialCode
  ├─ (1) income_commercial 존재 && 지출 있음
  │      → scope = COMMERCIAL, 네이티브 9항목
  ├─ (2) dataset_spatial_area.parent_code → 행정동
  │      → income_administration 카테고리 && 지출 있음
  │      → scope = ADMINISTRATION_PROXY, 행정동 10항목 그대로
  └─ (3) null + provenance 만 (원천 중단 사실)
```

`/summaries/income` 의 상권 leg 도 같은 사다리를 쓰되 **총액만** 대체한다. 자치구·행정동 leg 는 원천이 살아 있으므로 건드리지 않는다.

## 4. 항목 구성 — 반분하지 않는다

행정동 원천은 상권과 항목 구성이 다르다. 여가·문화가 **합쳐진 한 항목**이고, 상권에 없던 `기타`·`음식`이 **추가**돼 있다.

| 상권 네이티브 (≤`20234`) | 행정동 proxy (`20241`+) |
| --- | --- |
| 식료품 `FDSTFFS` | 식료품 `FDSTFFS` |
| 의류·신발 `CLTHS_FTWR` | 의류·신발 `CLTHS_FTWR` |
| 의료 `MCP` | 의료 `MCP` |
| 생활용품 `LVSPL` | 생활용품 `LVSPL` |
| 교통 `TRNSPORT` | 교통 `TRNSPORT` |
| 교육 `EDC` | 교육 `EDC` |
| 유흥 `PLESR` | 유흥 `PLESR` |
| 여가 `LSR` / 문화 `CLTUR` (분리) | **여가·문화 `LSR_CLTUR` (합산)** |
| — | **기타 `ETC`** |
| — | **음식 `FD`** |
| 합 9항목 | 합 10항목 |

초안의 `LSR_CLTUR / 2` 반분은 **쓰지 않는다.** 원천에 없는 수치를 만들어내는 것이고, 실측으로 확인한 총액 = 항목합 정합(차이 0)도 깨진다. `ETC`·`FD` 를 빼고 9항목만 노출하는 안도 총액과 15~20% 어긋나 쓰지 않는다.

대신 **응답이 항목 목록을 들고 내려가고 화면이 그대로 렌더한다.** 항목 수가 스코프마다 달라도 견딘다. 프론트는 항목 키를 하드코딩하지 않는다.

## 5. API 계약

`GET /commercials/{code}/income` · `GET /commercials/{code}/summaries/income` 에 지표별 출처 메타를 붙인다.

| 필드 | 내용 |
| --- | --- |
| `scope` | `COMMERCIAL` / `ADMINISTRATION_PROXY` / `DISTRICT_PROXY` |
| `scopeCode` · `scopeName` | 실제로 값을 가져온 영역 (예: `11680531` 역삼1동) |
| `sourceId` · `sourceLabel` · `sourceUrl` | 원천 데이터셋 |
| `effectivePeriodCode` | 값의 기준 분기 (소득은 연 1회라 기준 시점이 따로 붙는다) |
| `disclaimer` | 화면·프롬프트가 그대로 쓰는 면책 문장 |

값이 있을 때만 채운다. 네이티브면 `scope = COMMERCIAL` 이고 면책은 비운다. #413 의 null 강등 계약 위에 쌓는다 — **값이 없으면 여전히 null 이고, provenance 는 중단 사실만 전한다.**

## 6. 배치·DB

1. `Dataset.CONSUMPTION_ADMINISTRATION.requiredMetrics()` — 지출 세부 10항목 추가 (현재는 `EXPNDTR_TOTAMT` 총액만)
2. `income_administration` — 카테고리 컬럼 추가 (migration SQL)
3. `TypedFactMappers` · 이관 어댑터 INSERT 확장
4. `DatasetKey.CONSUMPTION_ADMINISTRATION.readerRequiredFields` 동기화
5. `20211`~`20261` 재이관

행정동 원천은 분기 인자를 무시하므로(`batch-service.md` 참고) 첫 분기만 `--source=API` 로 받고 나머지는 `ARCHIVE` 재생으로 채운다.

## 7. 소득 대체 (2차)

서울시가 데이터셋 안내에서 직접 제시한 대체 원천은 둘 다 **자치구 단위**다.

1. **국민연금공단_자격 시군구 신고 평균소득월액** — `data.go.kr/data/3046077`. CSV, 무료, 이용허락 제한 없음. 전국 1,150행, 시간범위 2024-12-31, 갱신 연 1회.
2. 국세청 국세통계포털 — `3-2-1-2 종합소득세 주요항목 신고 현황Ⅱ(시·군·구)` 등. 통계표 형식이라 자동화가 더 어렵다. 2순위.

**다운로드 경로 (2026-10-01 실측으로 정정).** CSV 링크(`contentUrl`)를 바로 호출하면 빈 응답이 오지만, 포털 페이지의 내부 3단계 요청(`selectFileDataDownload` → `check-limit`(`needCaptcha`) → `fileDownload`)을 재현하면 파일이 받아진다. 다만 캡차 제한이 걸린 포털 내부 경로라 운영 수집에 쓰지 않는다. 공공데이터포털 자동변환 Open API(odcloud)는 이 데이터셋에 대해 확인하지 못했다. 그래서 **연 1회 브라우저로 수동 다운로드 → 전용 Job 으로 적재**하고, 원천은 포트 경계(`PensionIncomeSourcePort`) 뒤에 둬 API 가 확인되면 어댑터만 추가한다. 기존 분기 `--source=CSV` 경로는 쓰지 않는다 — 데이터셋·분기 단위 게시(`dataset_release`)와 공간 코드 검증이 이 원천(연 스냅샷, 이름만 있는 시군구)과 맞지 않는다.

확정 설계(배치, 이슈 #415 2차):

- 원천 실측(2024-12-31 기준 파일): CP949, BOM 없음, CRLF, 헤더 `기준년월,시군구,평균소득월액`, 1,150행 = 기준년월 5개(`2020-12`~`2024-12`) × 시군구 230. 시군구는 시도와 붙은 이름(`서울특별시종로구`)뿐이고 타 시도에도 `중구` 가 있어 `서울특별시` 접두로만 서울을 고른다. 서울 125행
- 계약: 공유 모듈 `FileDatasetKey.NPS_DISTRICT_AVERAGE_INCOME`(`sourceId = data.go.kr:3046077`, 헤더 3개). 분기 Open API 15종의 `DatasetKey` 와 분리한다(`Dataset` 과 이름 전수 일치가 고정돼 있다)
- 적재: batch `--job=pension-income`(`pensionIncomeImportJob`) → commercial `pension_income_district`(`reference_date` = 기준년월 말일, `district_code`, `district_name`, `source_region_name`, `average_monthly_income_amount`, `source_updated_at`, `source_checksum`, `run_id`). 유니크 `(district_code, reference_date)`, `spatial_version` 없음. 기준일 단위 교체, 한 트랜잭션
- 검증은 fail-closed 이고 위반을 모두 모아 한 예외로 알린다: 헤더 순서 일치, 필드 3개·형식, 공간 스냅샷 자치구 이름과 정확히 일치, 기준년월마다 25구 정확히 한 번, 서울 행 합계 = `--expected-rows`. 문자셋 오지정은 디코딩 단계에서 멈춘다
- 조회: 요청 분기 말일 이하 최신 기준일(20211 → 2020-12-31, 20261 → 2024-12-31), 없으면 UNAVAILABLE. 비교·히트맵·추천·점수 경로에는 넣지 않는다(같은 구 상권은 전부 같은 값)
- 운영 절차: `backend/docs/services/batch-quarterly-import.md` 「11. 국민연금 자치구 평균소득 적재」

**지역가입자**(사업장 가입자가 아닌 자) 신고 소득의 구 평균이다. 주민 전체 소득도 상권 소득도 아니므로 라벨을 「월평균 소득」이 아니라 「자치구 평균 소득 (대체)」로 쓰고, 기준 시점과 모집단을 면책 문구에 넣는다. 분기 UI 와 갱신 주기가 어긋나므로 `effectivePeriodCode` 대신 기준 일자를 표기한다.

## 8. 화면 (#416)

- 항목별 소비: proxy 면 「행정동 기준 (대체)」 배지 + 면책 + 출처 링크. 항목 수는 응답을 따른다.
- 지역별 소비: 상권 leg 가 proxy 면 출처를 함께, null 이면 그 줄만 「데이터 없음」. 줄을 지우지 않는다.
- 소득 카드는 2차에서 자치구 proxy 가 붙을 때 되살린다. 그전까지는 #414 대로 화면에 없다.

## 9. 실행 순서

| 순서 | 범위 |
| --- | --- |
| 0 | #413 검토 지적 정리 + #414 FE → PR 머지 |
| 1 | 배치 — migration + `Dataset` 확장 + 재이관 |
| 2 | commercial-service — 사다리 + provenance + 테스트 |
| 3 | ai-service — Feign · 프롬프트에 출처 전달 |
| 4 | FE #416 |
| 5 | 계층·계약 검토 |

## 10. 검증

- `20261` 상권: 네이티브 0 → 행정동 proxy 값이 0 이 아니고 `scope = ADMINISTRATION_PROXY`
- 레거시 `20233` 상권: `scope = COMMERCIAL`, proxy 로 새지 않음
- 행정동 행이 없는 분기: null + 중단 사실만
- `summaries/income`: 자치구·행정동은 네이티브, 상권은 proxy 또는 null
- proxy 값의 항목합이 그 행정동 총액과 일치
