---
project: nowdoboss
cwd: D:/ProjectWorkSpace/NowDoBoss-V2/.claude/worktrees/batch-2024-schema-review (워크트리 — 기기마다 경로 다름)
branch: feat/be/batch-2024-schema-review
timestamp: 2026-09-08T17:00:00+0900
title: 분기 적재 배치 — 헤더 별칭 리소스화, ARCHIVE 재생 소스, LEGACY 공간 스냅샷 소스 추가
files:
  - backend/service/batch-service/src/main/resources/seoul/csv-header-aliases.csv
  - backend/service/batch-service/src/main/java/.../dataingestion/adapter/out/source/SeoulDatasetSourceAdapter.java
  - backend/service/batch-service/src/main/java/.../dataingestion/adapter/out/spatial/LegacySpatialJdbcSourceAdapter.java
  - backend/service/batch-service/src/main/java/.../dataingestion/application/model/SpatialSourceRequest.java
  - backend/docs/services/batch-service.md
---

## 같은 날 앞선 인계(`2026-09-08-160000-batch-2024-source-verified.md`) 이후 추가된 것

- **yml 별칭 표 제거.** `application-quarterly.yml` 170줄 → classpath `seoul/csv-header-aliases.csv`.
  헤더 정규화(공백·`~` → `_`, `률` → `율`)로 컬럼당 한 줄. yml 은 오버라이드 자리만 남김.
- **`--source=ARCHIVE`.** 이전 API 실행의 `page-<start>.json` 을 재생. 같은 페이지면 checksum 동일.
  분기 인자를 무시하는 9종을 분기마다 다시 받지 않기 위한 것(일 1,000회 제한).
- **`--job=spatial --source=LEGACY`.** `area_boundary` + `commercial_region_mapping` 에서 스냅샷 생성.
  이전 인계 「남은 작업 1」(공간 스냅샷 도구 부재)을 이것으로 해소. 단 폴리곤은 20233 기준이므로
  버전명에 `legacy-20233` 처럼 남길 것.
- 테스트 58건 초록. push·PR 전.

## DB 붙여서 확인할 것 (우선순위)

1. `area_boundary.boundary_geo_json` 실제 형태 — 맨 링 `[[lng,lat],...]` 로 가정했다.
   다중 링/객체면 `LegacySpatialJdbcSourceAdapter.geometry()` 분기가 받아주지만 실물 확인 필요.
2. `commercial_region_mapping` 이 상권 1,650건 전부를 덮는지 (없으면 LEGACY 가 코드를 나열하고 멈춤).
3. `quarterly-dataset-schema.sql` 적용 후 `--job=spatial --source=LEGACY` dry-run → `CHANGE_COMMERCIAL 20241`
   API dry-run 순서. SQL 문법·락 동작은 여기서 처음 검증된다.

## 남은 것

- 2024년 표준단위구역 폴리곤(서울시 shapefile → WGS84 GeoJSON) 변환 절차와 `GEOJSON` 소스 게시.
- `dataset_fact` 조회 경로(서비스 전환). `income_commercial` 소득 두 컬럼은 원천 소멸.
- `--expected-rows` 자동 확정(분기 인자 존중 서비스 한정)은 보류.
