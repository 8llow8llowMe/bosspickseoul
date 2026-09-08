---
project: nowdoboss
cwd: D:/ProjectWorkSpace/NowDoBoss-V2/.claude/worktrees/batch-2024-schema-review (워크트리 — 기기마다 경로 다름)
branch: feat/be/batch-2024-schema-review
timestamp: 2026-09-08T19:00:00+0900
title: 분기 적재 배치 — 원천 실호출로 2024년 이후 차이를 확인하고 API 경로를 15종 전부에 열었다
files:
  - backend/service/batch-service/src/main/java/.../dataingestion/domain/model/Dataset.java
  - backend/service/batch-service/src/main/java/.../dataingestion/adapter/out/source/SeoulDatasetSourceAdapter.java
  - backend/service/batch-service/src/main/java/.../dataingestion/adapter/in/batch/CommercialAnalysisImportJobConfig.java
  - backend/service/batch-service/src/main/resources/application-quarterly.yml
  - backend/docs/services/batch-service.md
---

## 작업 주제: 「2024년부터 데이터가 다르다」가 배치에 반영돼 있는지 점검

### 현재 상태 (2026-09-08 19:00 KST)

- 브랜치 `feat/be/batch-2024-schema-review` 에 커밋 5개. 아직 push·PR 전이다.
- `./gradlew :service:batch-service:test` 50건 초록(기존 48 → 신규 3, 대체 1).
- 개발 DB dry-run 은 여전히 **하지 않았다**(이 세션에도 DB·발급 키가 없었음).

### 이 세션에서 확정한 사실 (샘플 키 실호출)

`http://openapi.seoul.go.kr:8088/sample/json/<service>/1/1/[period]` 로 22종을 호출했다.
표 전체는 `backend/docs/services/batch-service.md` 「원천 실호출 결과」에 있다. 요점만:

1. **서비스명 15종 전부 확인.** 비어 있던 둘을 채웠다 — `CONSUMPTION_COMMERCIAL` =
   `VwsmTrdhlNcmCnsmpQq`(소비-상권배후지), `CHANGE_DISTRICT` = `VwsmSignguIxQq`.
   구 `VwsmTrdarNcmCnsmpQq`(소득소비-상권)는 500 을 돌려준다. 폐지된 것으로 본다.
2. **소득 컬럼이 사라졌다.** 레거시 `income_commercial.monthly_average_income_amount`,
   `income_bracket_code` 는 2024 년 이후 원천에서 채울 수 없다. 조회 전환 시 null/제공종료 처리 필요.
3. **모든 지표가 JSON 숫자**(`5.03135509E8`)로 온다. 어댑터가 평문 십진수로 정규화하도록 고쳤다.
   고치기 전엔 payload 에 지수 표기 문자열이 들어갔을 것이다.
4. **15종 중 9종이 분기 인자를 무시**하고 전 시계열을 준다. `Qq`/`W` 접미사와 무관.
   스트리밍 필터가 있어 결과는 맞지만 `--expected-rows` 는 이 표를 보고 정해야 한다.
5. **상권 코드는 그대로다.** 1,650 개, 20233 과 20241 코드 동일. 2024 변경은 코드 재부여가 아닌
   폴리곤 기준 변경이다. `spatial_version` 분리 설계가 맞다.
6. API 가 2021 년 1 분기부터 전 구간을 주므로 **백필 주경로를 API 로** 문서를 바꿨다.

### 이 세션에서 고친 것

- `Dataset` 서비스명 2 종 채움 + `DatasetTest` 가 15 종 서비스명을 통째로 고정.
- `SeoulDatasetSourceAdapter`: 숫자 정규화(BigDecimal), 별칭 없는 한글 CSV 헤더 fail-closed.
- `application-quarterly.yml`: 헤더 별칭 12 → 171 줄(15 종 컬럼 전체). **한글 쪽 표기는 배포
  CSV 를 열어 확인한 것이 아니다.** 실패하면 헤더 이름이 찍히니 그때 줄을 추가한다.
- 게시 거부 예외에 `expected/input/accepted/rejected/duplicate/unmapped` 건수 포함.

### 남은 작업 (우선순위 순)

1. **공간 스냅샷 GeoJSON 을 만들 도구가 없다.** 이게 없으면 사실 데이터 dry-run 이 `unmapped`
   에서 전부 실패한다. `area_boundary` 레거시 테이블(20233 기준)에서 뽑는 SQL/스크립트 또는
   서울시 shapefile 변환 스크립트 중 하나가 먼저다. `TbgisTrdarRelm` API 는 폴리곤을 안 준다.
2. 발급 키 + 개발 DB 로 `CHANGE_COMMERCIAL 20241` 부터 dry-run (레거시 테이블이 비어 있어
   충돌이 없는 첫 대상). SQL 문법·락 동작은 여기서 처음 검증된다.
3. 이슈 #245 의 미체크 항목(dry-run, 서비스명 검증)은 2 번이 끝나면 닫을 수 있다.
   서비스명 검증은 이 세션으로 사실상 끝났다.

### 이어받을 때

- `backend/docs/services/batch-service.md` 가 단일 기준. 이 문서보다 그 문서를 먼저 읽는다.
- 이전 인계 `2026-09-08-000154-change-district-quarterly-ingestion.md` 의 「확정된 사실 3」
  (서비스명 미확인)은 이 세션으로 해소됐다.
