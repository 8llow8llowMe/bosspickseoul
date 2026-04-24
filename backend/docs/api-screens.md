# NowDoBoss API — 화면 맥락 & RESTful 설계 가이드

> 프론트엔드 개발자와 협업 시 참고하는 문서.
> 각 API가 어떤 화면에 쓰이는지, 왜 그 방식으로 설계했는지 설명한다.

---

## RESTful 설계 평가 요약

| 항목 | 상태 | 비고 |
|------|------|------|
| HTTP 메서드 사용 | ✅ 준수 | 좋아요 토글 `POST /likes` 적용 완료 |
| 경로 네이밍 (명사 기반) | ✅ 준수 | `/auth/login` 등 auth action은 업계 관례상 허용 |
| 식별자 → path param | ✅ 준수 | `/compare`의 두 상권 코드는 query param이 비교 API 관례 |
| 필터/옵션 → query param | ✅ 준수 | `periodCode`, `serviceCode` 등 전부 query param |
| Spring 라우팅 충돌 | ✅ 없음 | 리터럴 경로(`/liked`, `/comparisons`)가 path variable보다 우선 |

> **2026-04-23 수정 완료**: `PUT /like` → `POST /likes` (게시글·댓글 좋아요 토글)
> PUT은 멱등성(idempotent) 보장이 필요하지만 토글은 비멱등이므로 POST로 변경.

---

## auth-service

### 인증 화면 — 로그인 / 로그아웃 / 토큰

| Method | Path | 화면 |
|--------|------|------|
| POST | `/api/v1/auth/login` | 로그인 폼 제출 |
| POST | `/api/v1/auth/logout` | 헤더 로그아웃 버튼 |
| POST | `/api/v1/auth/token/reissue` | 인터셉터에서 자동 호출 (만료 시) |

**`POST /auth/login`**
- 화면: 이메일 + 비밀번호 입력 후 로그인 버튼 클릭
- 응답: Access Token + Refresh Token (쿠키 or 헤더)
- `/login`, `/logout`에 동사 사용 — auth endpoint 업계 관례상 허용

**`POST /auth/token/reissue`**
- 화면: 사용자에게 보이지 않음. Axios 인터셉터가 401 응답 수신 시 자동 재발급 후 원래 요청 재시도
- 프론트 처리 포인트: Refresh Token이 만료됐으면 로그인 페이지로 리다이렉트

---

### 회원 화면

| Method | Path | 화면 |
|--------|------|------|
| POST | `/api/v1/members/signup` | 회원가입 폼 |
| GET | `/api/v1/members/me` | 마이페이지 / 헤더 프로필 |

---

### 북마크 — 관심 상권 저장

| Method | Path | 화면 |
|--------|------|------|
| POST | `/api/v1/members/me/bookmarks` | 상권/행정동/자치구 상세에서 ★ 버튼 |
| DELETE | `/api/v1/members/me/bookmarks/{bookmarkId}` | 북마크 목록에서 삭제 |
| GET | `/api/v1/members/me/bookmarks` | 마이페이지 > 관심 상권 목록 |

**`POST /members/me/bookmarks` 요청**
```json
{
  "targetType": "COMMERCIAL",
  "targetCode": "3110008",
  "targetName": "강남역 상권"
}
```
- `targetType`: `COMMERCIAL` / `ADMINISTRATION` / `DISTRICT`
- 프론트 처리: 같은 상권을 중복 저장하면 409 에러 → "이미 저장된 상권입니다" 토스트

**`GET /members/me/bookmarks` 응답**
```json
{
  "bookmarks": [
    { "bookmarkId": 1001, "targetType": "COMMERCIAL", "targetCode": "3110008", "targetName": "강남역 상권", "createdAt": "2026-04-20T10:00:00" }
  ],
  "hasNext": true,
  "lastBookmarkId": 1001
}
```
- 커서 페이지네이션: `?lastBookmarkId=1001&size=10`으로 다음 페이지 요청

---

## commercial-service

### 지도 메인 — 히트맵

| Method | Path | 화면 |
|--------|------|------|
| GET | `/api/v1/commercials/heatmap` | 지도 위 단일 지표 색상 히트맵 |
| GET | `/api/v1/commercials/heatmap-composite` | 프리셋 선택 후 복합 점수 히트맵 |

**`GET /heatmap` — 단일 지표 히트맵**
```
?periodCode=20233&serviceCode=CS100001
&commercialCodes=3110008,3110015,...  (지도 뷰포트 내 상권 코드 목록)
&metricType=OPPORTUNITY_SCORE
```
- metricType: `OPPORTUNITY_SCORE` / `RISK_SCORE` / `CONGESTION_SCORE` / `RESIDENT_POPULATION_SCORE`
- 응답의 `grade`(`HIGH`/`MEDIUM`/`LOW`) 기준으로 색상 결정: HIGH=진한색, LOW=연한색
- `breakdown: null` (단일 지표 모드)

**`GET /heatmap-composite` — 복합 히트맵**
```
?periodCode=20233&serviceCode=CS100001&commercialCodes=...
&preset=YOUTH_STARTUP&priorityMetric=OPPORTUNITY_SCORE
```

응답 예시:
```json
{
  "mode": { "code": "COMPOSITE", "name": "복합 지표" },
  "preset": { "code": "YOUTH_STARTUP", "name": "청년창업형" },
  "scores": [
    {
      "commercialCode": "3110008",
      "score": 76.3,
      "grade": "HIGH",
      "summaryLabel": "청년창업형 적합도 높음",
      "breakdown": [
        { "metricType": { "code": "OPPORTUNITY_SCORE", "name": "기회도" }, "score": 82.4, "grade": "HIGH", "summaryLabel": "기회도 높음" },
        { "metricType": { "code": "RISK_SCORE", "name": "위험도" }, "score": 35.2, "grade": "LOW", "summaryLabel": "위험도 보통" },
        { "metricType": { "code": "CONGESTION_SCORE", "name": "혼잡도" }, "score": 61.0, "grade": "MEDIUM", "summaryLabel": "혼잡도 보통" },
        { "metricType": { "code": "RESIDENT_POPULATION_SCORE", "name": "거주 수요" }, "score": 44.8, "grade": "MEDIUM", "summaryLabel": "거주 수요 보통" }
      ]
    }
  ]
}
```
- `breakdown` 활용: 마커 호버 툴팁에 4개 지표 바 차트 표시 가능

---

### 지도 메인 — 후보 상권 추천 패널

| Method | Path | 화면 |
|--------|------|------|
| GET | `/api/v1/commercials/candidates` | 지도 옆 "추천 상권" 랭킹 패널 |
| GET | `/api/v1/commercials/recommendations/by-service` | 업종 선택 후 자동 추천 |

**`GET /candidates` — 프리셋 기반 상위 N개**
```
?periodCode=20233&serviceCode=CS100001&commercialCodes=...
&preset=YOUTH_STARTUP&topN=10
```

프리셋 6종:
| preset | 이름 | 타깃 사용자 |
|--------|------|-----------|
| `BALANCED` | 균형형 | 처음 창업 고민 중 |
| `AGGRESSIVE_OPPORTUNITY` | 공격형 | 적극적 진입, CS1* 음식업 |
| `STABLE_LOW_RISK` | 안정형 | 안전한 시작, CS2* 서비스업 |
| `LOW_BUDGET_RESIDENT` | 저예산 생활권형 | 소자본 창업 |
| `YOUTH_STARTUP` | 청년창업형 | 20~30대, 트렌디한 상권 |
| `RE_EMPLOYMENT_STARTUP` | 재취업창업형 | 40~50대, 안정적 거주 상권 |

응답 예시:
```json
{
  "preset": { "code": "YOUTH_STARTUP", "name": "청년창업형" },
  "topN": 10,
  "summary": "청년창업형 프리셋 기준 상위 8개 상권입니다.",
  "items": [
    {
      "rank": 1,
      "commercialCode": "3110008",
      "commercialName": "강남역 상권",
      "compositeScore": 76.3,
      "grade": "HIGH",
      "summaryLabel": "청년창업형 추천",
      "selectionReason": "청년창업형 기준으로 기회도 우세를 우선 반영했고, 기회도는 기회도 높음이며 위험도는 위험도 낮음입니다.",
      "opportunityLabel": "기회도 높음",
      "riskLabel": "위험도 낮음",
      "reasonTags": ["기회도 우세", "위험도 낮음", "혼잡도 보통"]
    }
  ]
}
```

**`GET /recommendations/by-service` — 업종 코드 자동 프리셋**
```
?periodCode=20233&serviceCode=CS100001&commercialCodes=...&topN=5
```
- 업종 코드로 프리셋 자동 결정: CS1* → 공격형, CS2* → 안정형, 그 외 → 균형형
- 사용자가 프리셋을 선택하지 않아도 "이 업종엔 이런 상권이 좋아요" 자동 추천

---

### 상권 클릭 — 요약 패널 (사이드 패널)

| Method | Path | 화면 |
|--------|------|------|
| GET | `/api/v1/commercials/{commercialCode}/profile` | 지도에서 상권 클릭 시 오른쪽 패널 |

```
?periodCode=20233&serviceCode=CS100001
```

응답 예시:
```json
{
  "periodCode": "20233",
  "serviceCode": "CS100001",
  "commercialCode": "3110008",
  "commercialName": "강남역 상권",
  "districtName": "강남구",
  "administrationName": "역삼1동",
  "keyMetrics": {
    "totalSalesAmount": 4820000000,
    "totalFootTraffic": 1240000,
    "totalStoreCount": 832,
    "similarStoreCount": 45,
    "openingRate": 12.4,
    "closureRate": 8.1,
    "totalResidentPopulation": 28400,
    "monthlyAverageIncomeAmount": 4800000,
    "totalFacilityCount": 156,
    "peakSalesTimeSlot": "17시~21시",
    "peakFootTrafficTimeSlot": "11시~14시",
    "dominantSalesAgeGroup": "30대"
  }
}
```

**프론트 활용:**
- `"2023년 3분기 기준"` → `periodCode` 파싱: `20233` → `2023년 3분기`
- `peakSalesTimeSlot` → **"저녁 장사가 강한 상권"** 배지
- `dominantSalesAgeGroup` → **"30대 주요 상권"** 태그
- `openingRate` > `closureRate` → **"활성화 상권"** 표시

---

### 상권 상세 페이지

| Method | Path | 화면 |
|--------|------|------|
| GET | `/api/v1/commercials/{code}/foot-traffic` | 유동인구 탭 — 시간대·요일·연령 차트 |
| GET | `/api/v1/commercials/{code}/services/{serviceCode}/sales` | 매출 탭 — 매출 분석 차트 |
| GET | `/api/v1/commercials/{code}/services/{serviceCode}/stores` | 점포 탭 — 개폐업 현황 |
| GET | `/api/v1/commercials/{code}/facilities` | 시설 탭 — 주변 학교·교통 |
| GET | `/api/v1/commercials/{code}/population` | 거주인구 탭 |
| GET | `/api/v1/commercials/{code}/income` | 소득·지출 탭 |
| GET | `/api/v1/commercials/{code}/trend` | 트렌드 탭 — 분기별 꺾은선 그래프 |
| GET | `/api/v1/commercials/{code}/benchmarks` | 벤치마크 비교 탭 |

**`GET /trend` — 분기별 트렌드**
```
?serviceCode=CS100001&metricType=SALES&periodCode=20233&periodCount=4
```
- `metricType`: `SALES` / `FOOT_TRAFFIC` / `STORE`
- `periodCount`: 1~8 (기본 4분기)

응답:
```json
{
  "trendDirection": "INCREASE",
  "periods": [
    { "periodCode": "20222", "value": 3200000000, "changeRate": null },
    { "periodCode": "20223", "value": 3580000000, "changeRate": 11.9 },
    { "periodCode": "20231", "value": 4820000000, "changeRate": 23.0 }
  ]
}
```
- `trendDirection` → **"상승세 ↑"** 배지
- `changeRate` → 그래프 각 포인트 툴팁에 증감률 표시

---

### 상권 매출/소득 요약 (계층 비교)

| Method | Path | 화면 |
|--------|------|------|
| GET | `/api/v1/commercials/{code}/summaries/sales` | 상권 상세 내 "우리 상권 vs 행정동 vs 자치구" 비교 |
| GET | `/api/v1/commercials/{code}/summaries/income` | 같은 화면의 소득 비교 |

```
?periodCode=20233&districtCode=11680&administrationCode=1168010100&serviceCode=CS100001
```
- 3개 계층(상권·행정동·자치구)의 매출을 한 번에 비교하는 개요 화면용

---

### 상권 비교 화면

| Method | Path | 화면 |
|--------|------|------|
| GET | `/api/v1/commercials/compare` | A vs B 상권 비교 상세 화면 |
| GET | `/api/v1/commercials/compare-preview` | 지도에서 두 상권 선택 시 말풍선 미리보기 |

**`GET /compare`**
```
?leftCommercialCode=3110008&rightCommercialCode=3110015
&serviceCode=CS100001&periodCode=20233
```
- 좌/우 상권 코드 2개를 query param으로 — 비교 API에서 path param보다 query param이 관례
- 응답: 지표별 좌우 값 + 차이값 + 승자 측 + AI 추천 요약

**`GET /compare-preview`** (같은 파라미터, 가벼운 응답)
```json
{
  "left": { "commercialCode": "3110008", "commercialName": "강남역 상권" },
  "right": { "commercialCode": "3110015", "commercialName": "신논현역 상권" },
  "recommendedSide": {
    "code": "LEFT",
    "name": "좌측 상권 우세",
    "description": "비교 기준에서 좌측 상권이 더 우세합니다."
  },
  "headlineMetrics": [
    { "label": "총 매출", "leftValue": 4820000000, "rightValue": 3200000000, "winnerSide": "LEFT" }
  ],
  "insightOneLiner": "강남역 상권이 매출에서 앞서나, 신논현역은 위험도가 낮아 안정적 진입에 유리합니다."
}
```
- 말풍선 UX: 상권 2개 선택 완료 시 지도 위에 오버레이

---

### 자치구 / 행정동

| Method | Path | 화면 |
|--------|------|------|
| GET | `/api/v1/districts` | 자치구 전체 목록 (드롭다운, 지역 선택) |
| GET | `/api/v1/districts/top-ten` | 메인 대시보드 "자치구 TOP 10" |
| GET | `/api/v1/districts/{code}` | 자치구 상세 페이지 |
| GET | `/api/v1/districts/{code}/foot-traffic` | 자치구 유동인구 상세 |
| GET | `/api/v1/districts/{code}/change-indicators` | 자치구 변화 지표 |
| GET | `/api/v1/districts/{code}/stores/top-services` | 자치구 상위 업종별 점포 |
| GET | `/api/v1/districts/{code}/sales/top-services` | 자치구 상위 매출 업종 |
| GET | `/api/v1/districts/{code}/sales/top-administrations` | 자치구 행정동별 매출 순위 |
| GET | `/api/v1/administrations/{code}` | 행정동 상세 |

---

## district-service

### 지도 폴리곤 & 오버레이

| Method | Path | 화면 |
|--------|------|------|
| GET | `/api/v1/map/commercials` | 지도 상권 폴리곤 좌표 (뷰포트 단위 로드) |
| GET | `/api/v1/map/administrations` | 행정동 폴리곤 |
| GET | `/api/v1/map/districts` | 자치구 폴리곤 |
| GET | `/api/v1/map/commercials/heatmap` | 히트맵 지도 오버레이 (commercial-service 위임) |
| GET | `/api/v1/map/candidate-presets` | 프리셋 선택 UI 메타데이터 |
| GET | `/api/v1/map/commercials/candidates` | 후보 상권 마커 (commercial-service 위임) |
| GET | `/api/v1/map/commercials/{code}/profile` | 상권 프로필 지도 오버레이 |
| GET | `/api/v1/map/commercials/compare-preview` | 비교 미리보기 오버레이 |

**district-service 역할**: commercial-service에서 점수/분석 계산, district-service에서 폴리곤·좌표 조립 후 지도에 전달.

**`GET /map/candidate-presets`** — 프론트 드롭다운용
```json
{
  "presets": [
    { "code": "BALANCED", "name": "균형형", "description": "기회·위험·혼잡·거주수요 네 축을 균형 있게..." },
    { "code": "YOUTH_STARTUP", "name": "청년창업형", "description": "20~30대 유동인구·기회도를 중시하고..." }
  ]
}
```

---

### 지역 코드 조회

| Method | Path | 화면 |
|--------|------|------|
| GET | `/api/v1/regions/districts/{districtCode}/administrations` | 자치구 선택 후 행정동 드롭다운 |
| GET | `/api/v1/regions/districts/{districtCode}/administrations/{adminCode}/commercials` | 행정동 선택 후 상권 목록 |
| GET | `/api/v1/regions/code-lookup` | 이름 검색 → 코드 역조회 (검색 자동완성) |
| GET | `/api/v1/regions/administrations/{adminCode}` | 상권 클릭 시 소속 행정동·자치구 조회 |
| GET | `/api/v1/regions/commercials/{code}/administration` | 상권의 행정동 정보 |

**`GET /regions/code-lookup`**
```
?name=강남역&type=COMMERCIAL
```
- 검색 자동완성 기능: 사용자가 "강남역" 입력 시 상권 코드 찾아주기

---

## community-service

### 커뮤니티 피드

| Method | Path | 화면 |
|--------|------|------|
| GET | `/api/v1/community/posts` | 전체 피드 / 상권별 게시판 |
| GET | `/api/v1/community/posts/search` | 검색 결과 목록 |
| GET | `/api/v1/community/posts/liked` | 마이페이지 > 좋아요한 글 |

**`GET /community/posts` — 피드 (무한 스크롤)**
```
?targetType=COMMERCIAL&targetCode=3110008   ← 상권 게시판
?sortType=LATEST&orderType=DESC&lastPostId=0&size=10
```
- 필터 없으면 전체 피드 (커뮤니티 홈)
- `targetType=COMMERCIAL&targetCode=...` 있으면 특정 상권 게시판
- 페이지네이션: `lastPostId=0`이 첫 페이지, 응답의 마지막 `postId`로 다음 페이지

**`GET /community/posts/search`**
```
?keyword=강남역&sortType=LATEST&lastPostId=0
```

---

### 게시글 상세

| Method | Path | 화면 |
|--------|------|------|
| GET | `/api/v1/community/posts/{postId}` | 게시글 상세 (조회수 +1 자동) |
| POST | `/api/v1/community/posts` | 글쓰기 페이지 |
| PATCH | `/api/v1/community/posts/{postId}` | 글 수정 |
| DELETE | `/api/v1/community/posts/{postId}` | 글 삭제 |
| POST | `/api/v1/community/posts/{postId}/likes` | 좋아요 토글 |

**`POST /community/posts` 요청**
```json
{
  "targetType": "COMMERCIAL",
  "targetCode": "3110008",
  "title": "강남역 카페 창업 후기",
  "content": "지난 달에 강남역 근처..."
}
```

**상권 비교 커뮤니티 초안 생성**
```
POST /api/v1/community/posts/drafts/commercial-comparisons
```
```json
{
  "targetType": "COMMERCIAL",
  "targetCode": "3110008",
  "leftCommercialCode": "3110008",
  "rightCommercialCode": "3110015",
  "serviceCode": "CS100001",
  "periodCode": "20233"
}
```
- 비교 분석 완료 후 "커뮤니티에 공유하기" 버튼 클릭 시 사용
- 서버가 제목·본문 초안을 자동 생성해서 반환 → 사용자가 수정 후 실제 POST

---

### 댓글 / 대댓글

| Method | Path | 화면 |
|--------|------|------|
| GET | `/api/v1/community/posts/{postId}/comments` | 게시글 하단 댓글 섹션 |
| POST | `/api/v1/community/posts/{postId}/comments` | 댓글 / 대댓글 작성 |
| DELETE | `/api/v1/community/posts/{postId}/comments/{commentId}` | 댓글 삭제 |
| POST | `/api/v1/community/posts/{postId}/comments/{commentId}/likes` | 댓글 좋아요 토글 |

**댓글 작성 (최상위)**
```json
{ "content": "저도 그 상권 알아보고 있어요!" }
```

**대댓글 작성**
```json
{ "parentCommentId": 120, "content": "저도 같은 경험이 있어요!" }
```

**댓글 응답 구조**
```json
{
  "comments": [
    {
      "commentId": 120,
      "content": "저도 그 상권 알아보고 있어요!",
      "likeCount": 3,
      "replies": [
        { "commentId": 125, "parentCommentId": 120, "content": "저도 같은 경험이 있어요!" }
      ]
    }
  ]
}
```

---

### 신고 / 모더레이션

| Method | Path | 화면 |
|--------|------|------|
| POST | `/api/v1/community/reports` | 게시글/댓글 더보기 > 신고 |
| GET | `/api/v1/moderation/reports` | 관리자 > 신고 대시보드 |
| PATCH | `/api/v1/moderation/reports/{reportId}` | 관리자 > 신고 처리 |

**신고 생성 요청**
```json
{
  "targetKind": "POST",
  "targetId": 5023,
  "reason": "광고성 게시글입니다"
}
```

**신고 목록 응답 (관리자용)**
```json
{
  "reports": [
    {
      "reportId": 100,
      "targetKind": "POST",
      "targetId": 5023,
      "status": "PENDING",
      "reason": "광고성 게시글입니다",
      "targetTitle": "강남역 카페 창업 후기",
      "targetPreview": "지난 달에 강남역 근처에 카페를 오픈했는데요...",
      "targetAuthorId": 3041,
      "reporterMemberId": 2001,
      "createdAt": "2026-04-23T14:32:00"
    }
  ]
}
```

**신고 처리 요청**
```json
{ "decision": "APPROVE_AND_HIDE" }
```
- `APPROVE_AND_HIDE`: 게시글/댓글 숨김 + 신고 승인 (댓글 숨김 시 게시글 댓글 수 자동 감소)
- `DISMISS`: 신고 기각, 컨텐츠 유지

---

## ai-service

### AI 리포트

| Method | Path | 화면 |
|--------|------|------|
| GET | `/api/v1/ai-reports/commercials/{commercialCode}` | 상권 상세 > "AI 분석" 탭 |
| GET | `/api/v1/ai-reports/commercials/comparisons` | 상권 비교 결과 하단 "AI 종합 판단" 섹션 |
| GET | `/api/v1/ai-reports/districts/{districtCode}` | 자치구 상세 > "AI 분석" 탭 |
| GET | `/api/v1/ai-reports/administrations/{administrationCode}` | 행정동 상세 > "AI 분석" 탭 |

**`GET /ai-reports/commercials/comparisons`**
```
?leftCommercialCode=3110008&rightCommercialCode=3110015
&serviceCode=CS100001&periodCode=20233
```

**주의사항 (프론트 필수)**:
- Claude API 호출 포함 → **응답 시간 3~10초** 소요
- 로딩 스피너 + "AI가 분석 중입니다..." 표시 필수
- 에러 시 fallback 메시지 준비 ("AI 분석을 일시적으로 제공하지 못하고 있습니다")
- 상권/비교 데이터 로드 후 AI 탭은 **지연 로드(lazy load)** 권장 — 초기 화면 로딩 블로킹 방지

---

## 화면별 API 호출 순서 가이드

### 지도 진입 시
```
1. GET /map/districts              → 자치구 폴리곤 로드
2. GET /map/administrations        → 행정동 폴리곤
3. GET /map/commercials            → 상권 폴리곤
4. GET /map/candidate-presets      → 프리셋 드롭다운 UI 초기화
5. GET /commercials/heatmap        → 초기 히트맵 색상 (기본: 기회도)
```

### 상권 클릭 시
```
1. GET /commercials/{code}/profile        → 사이드 패널 즉시 표시
2. GET /regions/commercials/{code}/administration → 소속 행정동 표시
(탭 클릭 시 lazy load)
3. GET /commercials/{code}/foot-traffic
4. GET /commercials/{code}/trend
5. GET /ai-reports/commercials/{code}     → AI 탭 클릭 시만 호출
```

### 두 상권 비교 시
```
1. GET /commercials/compare-preview       → 말풍선 미리보기 (즉시)
2. GET /commercials/compare               → 비교 상세 화면 진입 시
3. GET /ai-reports/commercials/comparisons → AI 판단 섹션 (지연 로드)
```

### 업종 선택 후 추천 시
```
1. GET /commercials/recommendations/by-service   → 업종 코드 기반 자동 추천
   (또는)
2. GET /commercials/heatmap-composite             → 프리셋 선택 후 히트맵
3. GET /commercials/candidates                    → 랭킹 패널
```
