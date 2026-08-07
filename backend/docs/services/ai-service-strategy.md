# AI Service Strategy

## 목적

- `ai-service`의 조회 전략과 사용자 경험 기준을 정리한다.
- 분석 데이터 API와 AI 리포트 API를 어떤 방식으로 조합할지에 대한 운영 기준을 남긴다.
- 동기형 → 비동기형 전환의 의사결정 경위를 기록으로 남긴다.

## 현재 전략: 비동기 작업 모델 (전환 완료)

AI 리포트 4종(상권 / 상권 비교 / 자치구 / 행정동)은 모두 **POST 제출 + 작업 상태 조회**의 비동기 모델을 사용한다. 과거의 동기 GET 조회 API 4종은 제거 완료됐다.

### 제출 API (POST 4종)

- `POST /api/v1/ai-reports/commercials/{commercialCode}`
- `POST /api/v1/ai-reports/commercials/comparisons`
- `POST /api/v1/ai-reports/districts/{districtCode}`
- `POST /api/v1/ai-reports/administrations/{administrationCode}`

제출 응답 규칙:

- 캐시 hit: `200 OK` + 리포트 결과 즉시 반환 (`submissionStatus=CACHED`)
- 캐시 miss: `202 Accepted` + `jobId` 반환 (`submissionStatus=ACCEPTED`), `@Async("aiReportTaskExecutor")` 워커가 픽업해 생성

### 상태 조회

- `GET /api/v1/ai-reports/jobs/{jobId}/stream` — SSE 스트림 (우선 권장). 상태 변경마다 `job-update` 이벤트 푸시, 종결(COMPLETED/FAILED) 시 서버가 연결 종료
- `GET /api/v1/ai-reports/jobs/{jobId}` — 폴링. SSE 연결 실패 시 폴백
- 진행 중(PENDING/RUNNING) 상태 응답에는 `progressMessages` 로테이션 문구가 포함되어 프론트가 대기 UX 에 활용할 수 있다.

프론트엔드 연동 계약(요청/응답 shape, SSE 클라이언트 구현, 에러 처리)의 상세는 `docs/ai-report-frontend-guide.md` 를 따른다.

## 왜 이렇게 가는가

- 로컬 LLM(Ollama) / 외부 LLM 모두 응답 시간이 길어질 수 있다 (수십 초 ~ 수 분).
- AI 리포트 생성은 캐시 miss 시 내부 데이터 수집 + LLM 추론이 함께 발생한다.
- 메인 분석 응답에 AI 리포트를 합치면 첫 화면 응답 시간이 과도하게 늘어날 수 있다.
- AI 리포트를 분리하면 메인 분석 UX를 해치지 않으면서도 AI 보조 기능을 제공할 수 있다.
- HTTP 요청을 LLM 생성 시간 동안 잡아두는 동기 방식은 게이트웨이/클라이언트 타임아웃, 커넥션 점유, 재시도 시 중복 생성 문제를 만든다. 비동기 작업 모델은 이를 202 + 작업 ID 로 흡수한다.

## 전략 이력 (동기형 검토 → 비동기 전환 완료)

- 초기에는 동기 GET 조회 API + Redis 캐시 + 프론트 후행 로딩 전략을 기본값으로 뒀다. 당시에는 비동기 작업형 구조가 과하다고 판단했다.
- 이후 LLM 생성 시간이 길어지는 실사용 조건(캐시 miss 시 수십 초 대기, 타임아웃, 재시도 중복)이 확인되어 비동기 작업 모델로 전환했다.
- 전환 결과: POST 제출 4종 + `GET /jobs/{jobId}` 폴링 + SSE 스트림, Redis 기반 작업 상태 저장 / 멱등성 / 결과 스냅샷. 상세 구현은 `docs/services/ai-service.md` 참고.

## 캐시 전략

- AI 리포트는 Redis 캐시를 우선 사용한다.
- 동일한 입력 조건에서는 캐시 hit 를 통해 202 왕복 없이 200 으로 즉시 응답한다.
- 캐시는 사용자 자산 저장이 아니라 파생 결과 재사용 목적이다.

## 게이트웨이 기준

- API Gateway는 `/api/v1/ai-reports/**`를 `ai-service`로 라우팅한다.
- Swagger aggregation 용으로 `/ai-service/**` 문서 경로를 추가한다.

## 권장 프론트 적용 방식

- 분석 페이지 진입 시:
  - 원본 분석 데이터 API 를 먼저 호출해 메인 화면을 렌더링한다.
  - AI 리포트는 POST 제출 후 AI 섹션만 skeleton / loading (progressMessages 로테이션) 표시한다.
- AI 리포트 실패 시:
  - 메인 분석 화면은 유지
  - AI 섹션만 fallback 문구 노출
- AI 리포트 성공 시:
  - 요약 카드, 강점/주의점, 추천 인사이트 순으로 렌더링

## Comparison AI Contract

- comparison AI is a separate API from the raw comparison API
- `recommendedSide` in the AI response is currently a string enum
  - `LEFT`
  - `RIGHT`
  - `BALANCED`
- if upstream comparison result is `TIE`, ai-service normalizes it to `BALANCED` before calling the LLM
