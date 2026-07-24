# 상권 추천 API 마이그레이션 검토

- 검토일: 2026-07-24 (KST)
- 기준 브랜치: `origin/develop` (`3e43077`, PR #53 포함)
- 백엔드 변경: 없음
- 기준 계약: dev Swagger/OpenAPI 5종

## 결론

프런트 계약과 UI는 현 API만으로 이식할 수 있다. 추천 API는 로그인 없이
사용할 수 있고, 로그인 사용자의 상권 저장은 공통 북마크 API로 구현할 수 있다.

다만 2026-07-24 dev 환경에서는 지역/지도 조회가 성공 응답과 함께 빈 배열을
반환한다. 따라서 현재 상태로는 사용자가 행정동을 선택해 후보 상권 코드를
만드는 실제 E2E 흐름을 완료할 수 없다. 프런트는 로딩·실패·빈 상태까지 구현하고,
실데이터 Top 5 검증은 지역/지도 데이터가 적재된 뒤 수행해야 한다.

## 추천 화면 데이터 흐름

1. 자치구는 프런트의 서울 25개 구 정적 메타데이터를 사용한다.
2. 자치구 선택:
   `GET /api/bff/regions/districts/{districtCode}/administrations`
3. 행정동 선택:
   `GET /api/bff/regions/districts/{districtCode}/administrations/{administrationCode}/commercials`
4. 업종 선택:
   현재 전체 업종 목록 API가 없으므로 기존 `simulationCatalog`의
   `serviceCode`/표시명을 재사용한다.
5. 추천 요청:
   `GET /api/bff/commercials/recommendations/by-service`
   - `serviceCode`: 필수
   - `commercialCodes`: 3단계 응답의 모든 상권 코드, 같은 query key를 반복
   - `periodCode`: `20233`
   - `topN`: `5`
6. 결과 카드:
   `rank`, `commercialName`, `compositeScore`, `grade`, `summaryLabel`,
   `selectionReason`, `opportunityLabel`, `riskLabel`, `reasonTags`,
   `metricBreakdown`
7. 선택 상권 상세:
   `GET /api/bff/map/commercials/{commercialCode}/profile`
   (`serviceCode`, `periodCode`)
8. 로그인 사용자 저장:
   `POST /api/bff/members/me/bookmarks`
   - body:
     `{ "targetType": "COMMERCIAL", "targetCode": "...", "targetName": "..." }`
   - 삭제는 목록에서 받은 `bookmarkId`로
     `DELETE /api/bff/members/me/bookmarks/{bookmarkId}`

브라우저는 `/api/bff`까지만 호출한다. BFF 프록시가 게이트웨이 요청에
`/api/v1`을 추가하고, 세션이 있으면 Bearer 토큰을 주입한다.

## 추천 API 계약

`GET /api/v1/commercials/recommendations/by-service`

| 입력              | 필수   | 제약                        |
| ----------------- | ------ | --------------------------- |
| `serviceCode`     | 예     | 예: `CS100001`              |
| `commercialCodes` | 예     | string 배열, 반복 query key |
| `periodCode`      | 아니오 | 기본값 `20233`              |
| `topN`            | 아니오 | 기본 5, 최소 5, 최대 30     |

업종 코드에 따라 백엔드가 프리셋을 자동 선택한다.

- `CS1*`: 공격형(`AGGRESSIVE_OPPORTUNITY`)
- `CS2*`: 안정형(`STABLE_LOW_RISK`)
- 그 외: 균형형(`BALANCED`)

응답은 공통 `ApiResponse<T>` 래퍼를 사용한다.

```ts
type CandidateCommercials = {
  serviceCode: string
  periodCode: string
  preset: CodeNameDescriptionMetadata
  priorityMetric: ScoreMetricMetadata
  topN: number
  summary: string
  items: CandidateCommercial[]
}
```

`compositeScore`, 세부 `score`, 프로필의 `keyMetrics`는 계약 설명상 null 가능성을
고려한다. 빈 배열은 정상 성공으로 처리하고 별도 empty UI를 노출한다.

## 2026-07-24 dev 실호출 결과

| 호출                                                  | HTTP | `dataHeader.success` | 결과            |
| ----------------------------------------------------- | ---- | -------------------- | --------------- |
| `GET /api/v1/districts`                               | 200  | true                 | `dataBody: []`  |
| `GET /api/v1/regions/districts/11680/administrations` | 200  | true                 | `dataBody: []`  |
| 서울 bounds `GET /api/v1/map/districts`               | 200  | true                 | `areas: []`     |
| 서울 bounds `GET /api/v1/map/administrations`         | 200  | true                 | `areas: []`     |
| 서울 bounds `GET /api/v1/map/commercials`             | 200  | true                 | `areas: []`     |
| `GET /api/v1/map/candidate-presets`                   | 200  | true                 | 프리셋 6종 반환 |
| 알려진 예시 코드 5개로 추천 요청                      | 200  | true                 | `items: []`     |

`GET /api/v1/districts/top-ten`의 매출·개업·폐업 Top 10은 데이터가 있으므로
상권 분석 서비스 자체는 동작한다. 현재 차단점은 추천 점수 UI가 아니라 후보
코드를 공급하는 지역/지도 데이터다.

## 프런트 구현 범위

- [x] 기존 레거시 `/recommendation/...` 호출 제거
- [x] 지역/지도·업종별 추천·상권 프로필의 문자열 기반 계약 타입 정의
- [x] 자치구 → 행정동 → 업종 선택과 명시적 추천 요청 snapshot 상태 구현
- [x] 후보 상권 코드를 bracket 없는 반복 query key로 직렬화
- [x] 네이티브 Kakao Maps SDK loader와 자치구·행정동·Top 5 폴리곤/순위
      overlay 구현
- [x] 지도 이동·확대와 추천 범위를 분리하고 고정 범위 안내·재중앙 정렬 제공
- [x] Top 5 카드, 선택 상권 상세, 점수 breakdown과 지도 hover/focus 연동
- [x] 로딩, API 실패·재시도, 후보 없음, 지역 데이터 없음 상태 구현
- [x] 선택 상권 프로필 지연 조회와 stale 응답 방지
- [x] 데스크톱 적응형 왼쪽 패널과 모바일 expanded/peek 바텀시트 구현
- [x] 비로그인 추천 조회와 로그인 유도 상태 구현
- [x] 로그인 사용자의 공통 `COMMERCIAL` 북마크 추가·삭제·목록 연동
- [x] 프로필의 추천 북마크 화면을 공통 북마크 계약으로 마이그레이션

## 프런트 구현 검증

검증일: 2026-07-24 (KST)

| 구분             | 실행 명령                                                                                                                 | 결과                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 추천 집중 테스트 | `pnpm exec vitest run src/lib/api/recommend.test.ts src/lib/kakao-map.test.ts src/lib/recommend src/components/recommend` | 통과 (exit 0, 9 files, 157 tests)                                                       |
| 미들웨어 회귀    | `pnpm exec vitest run middleware.test.ts`                                                                                 | 통과 (exit 0, 8 tests; 비로그인 `/recommend` 공개, `/profile` 보호 유지)                |
| 포맷             | `pnpm format:check`                                                                                                       | 통과 (exit 0, Prettier 불일치 0건)                                                      |
| 린트             | `pnpm lint`                                                                                                               | 통과 (exit 0, ESLint warning/error 0건)                                                 |
| 타입             | `pnpm typecheck`                                                                                                          | 통과 (exit 0, Next route type 생성 및 `tsc --noEmit`)                                   |
| 전체 테스트      | `pnpm test`                                                                                                               | 통과 (exit 0, Vitest 31 files/315 tests + Node 6 tests)                                 |
| 프로덕션 빌드    | `pnpm build`                                                                                                              | 통과 (exit 0, 32개 static page 생성; 기존 `middleware` convention deprecation 경고 1건) |
| diff 무결성      | `git diff --check`                                                                                                        | 통과 (exit 0)                                                                           |

변경 범위 점검 결과 백엔드, `package.json`, `pnpm-lock.yaml`, `next.config.ts`,
`tsconfig.json`에는 diff가 없다.

최종 리뷰 수정 후 자동 테스트에는 다음 회귀 검증도 포함한다.

- 프로필 조회가 `GET /members/me` 계약을 사용하는지
- 조건 선택 상태에서 바텀시트가 expanded-only인지
- 지도 marker와 모바일 sheet 순위의 명암비가 각각 16.56:1, 5.98:1인지
- 프로필 응답이 현재 선택 상권·업종·기간 scope와 일치하는지

### 브라우저 수동 QA

#### 통과

- [x] 비로그인 상태에서 `/recommend`가 HTTP 200으로 응답하고 추천 화면이
      노출된다.
- [x] 1280×720에서 데스크톱 패널 너비 390px, 좌·상단 inset 24px, 전체 지도
      stage, 가로 overflow 없음이 확인된다.
- [x] 1024×768에서 데스크톱 패널 너비 390px가 유지되고 모바일 sheet는
      숨겨진다.
- [x] 768×900에서 데스크톱 패널은 숨겨지고 expanded sheet 높이는 596px,
      노출된 지도 높이는 232px 이상이다.
- [x] 375×812에서 expanded sheet 높이는 533px, 노출된 지도 높이는 207px
      이상이며 가로 overflow가 없다.
- [x] 조건 선택 화면에서 지도 배경을 클릭해도 모바일 sheet의 expanded
      상태가 유지된다.
- [x] 최종 dev API host 기준 지도 자치구와 강남구 행정동 요청은 HTTP 200과
      빈 배열을 반환하고, 화면에
      `현재 자치구의 행정동 데이터가 준비되지 않았습니다.`가 노출된다.
- [x] `NEXT_PUBLIC_KAKAOMAP_API_KEY`가 없는 로컬 환경에서 지도 오류 alert와
      재시도 버튼이 노출되며 추천 패널은 계속 동작한다.
- [x] 위 시나리오에서 브라우저 console warning/error는 0건이다.

#### 확인 필요

- [ ] 로컬 Kakao Maps key가 없어 실제 지도·폴리곤·순위 marker·재중앙 정렬은
      확인하지 못했다.
- [ ] dev 지역 데이터가 비어 있어 실데이터 Top 5, 카드↔지도 preview,
      selection, 선택 후 heading focus는 확인하지 못했다.
- [ ] 테스트 계정이 없어 로그인 북마크 추가·삭제와 계정 전환 E2E는 확인하지
      못했다.
- [ ] 조건 선택 상태의 expanded-only 동작은 reducer/component 자동 테스트로
      수정·통과했으나, 수정 후 브라우저 재확인이 필요하다. 결과 상태의
      click/drag 전환은 dev 데이터가 비어 있어 확인하지 못했다.
- [ ] safe-area 실기기, 소프트 키보드, 200% zoom, reduced-motion
      실기기/브라우저 emulation은 확인하지 못했다.

dev 지역/지도 응답이 빈 배열인 동안에는 실제 행정동 상권 Top 5 폴리곤과
실데이터 북마크 E2E를 완료할 수 없다. fixture 기반 자동 검증은 통과했지만,
실데이터 E2E 항목은 데이터 적재 후까지 **확인 필요**로 남긴다.

## 백엔드 데이터 정상화 후 검증

- 25개 자치구별 행정동 목록이 비어 있지 않은지
- 행정동별 상권 목록과 중심 좌표가 반환되는지
- 업종별 추천이 1~5개 결과와 점수 breakdown을 반환하는지
- 선택 결과의 프로필 `commercialCode`/지역명이 추천 결과와 일치하는지
- 북마크 추가 → 목록 반영 → 삭제가 동일 `bookmarkId`로 이어지는지
