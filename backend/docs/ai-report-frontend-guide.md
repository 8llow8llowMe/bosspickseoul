# AI Report Frontend Guide

## Purpose

이 문서는 프론트엔드에서 AI 리포트 기능(상권 / 상권 비교 / 자치구 / 행정동)을 구현할 때
`ai-service`의 `/api/v1/ai-reports/**` API를 어떻게 조합해서 쓰는지 정리한다.

- AI 리포트는 **비동기 모델**이다. 제출(POST) 후 SSE 스트림 또는 폴링으로 완료를 기다린다.
- AI 리포트 API는 전부 **로그인(인증) 필수**다. 일반 상권 분석 API는 공개이므로,
  비로그인 사용자에게는 AI 리포트 영역을 **잠금 카드**로 보여주는 것을 권장한다.
- 리포트 생성에는 평균 수십 초가 걸린다. 진행 상태를 사용자에게 단계로 보여줘야 한다.

## Authentication Policy

| 기능 | 인증 | 비고 |
| --- | --- | --- |
| 일반 상권 분석 (`/api/v1/commercials/**` 등) | 불필요 | 비로그인 사용자도 사용 가능 |
| AI 리포트 전체 (`/api/v1/ai-reports/**`) | **필수** (Bearer) | 미인증 시 `SECURITY_001` 401 응답 |

- 비로그인 상태에서는 AI 리포트 API를 **아예 호출하지 않는다**. 401은 백엔드 방어선일 뿐,
  콘솔에 401 에러가 쌓이는 구현은 피한다.
- 작업(job)은 제출한 본인만 조회/구독할 수 있다. 타인 jobId 접근은 404(`AI_005`)로 응답한다.

## Login-Gated UI (잠금 카드)

비로그인 사용자에게 AI 리포트 컴포넌트를 숨기지 말고, 같은 자리에 잠금 상태로 노출한다.
기능 발견성(로그인 유도)과 레이아웃 안정성 때문이다.

### 상태별 렌더링

```
비로그인  → [잠금 카드] 정적 샘플 blur + 자물쇠 + 가치 카피 + 로그인 CTA
로그인    → [리포트 카드] 제출 버튼 → 진행 상태(SSE) → 완료 리포트 렌더
```

### 잠금 카드 구현 가이드

- **정적 샘플 사용**: blur 미리보기는 반드시 하드코딩된 샘플(가짜 예시 데이터)로 만든다.
  비로그인 사용자를 위해 실제 리포트를 생성하면 LLM 비용이 낭비되고,
  blur는 CSS일 뿐이라 실제 데이터를 내려보내면 개발자 도구로 볼 수 있다.
- **가치 중심 카피**: "로그인이 필요합니다"가 아니라
  "이 상권의 강점·리스크·추천 업종을 AI가 요약해 드려요 — 로그인하고 확인하기"처럼 얻는 것을 설명한다.
- **returnUrl 필수**: 로그인 CTA는 로그인 후 보고 있던 상권 분석 페이지로 그대로 복귀시킨다.
  여유가 되면 복귀 직후 리포트 자동 제출까지 이어준다.

## API Summary

| API | 용도 | 응답 |
| --- | --- | --- |
| `POST /api/v1/ai-reports/commercials/{commercialCode}?serviceCode=&periodCode=` | 상권 AI 리포트 제출 | 캐시 hit: 200 + 리포트 / miss: 202 + jobId |
| `POST /api/v1/ai-reports/commercials/comparisons?leftCommercialCode=&rightCommercialCode=&serviceCode=&periodCode=` | 상권 비교 AI 인사이트 제출 | 동일 |
| `POST /api/v1/ai-reports/districts/{districtCode}?periodCode=` | 자치구 AI 리포트 제출 | 동일 |
| `POST /api/v1/ai-reports/administrations/{administrationCode}?periodCode=` | 행정동 AI 리포트 제출 | 동일 |
| `GET /api/v1/ai-reports/jobs/{jobId}/stream` | **작업 상태 SSE 스트림 (권장)** | `job-update` 이벤트 스트림 |
| `GET /api/v1/ai-reports/jobs/{jobId}` | 작업 상태 폴링 (SSE 폴백) | 상태 + 완료 시 리포트 |

동기 GET 조회 엔드포인트는 제거되었다. 반드시 POST 제출 → SSE/폴링 흐름을 사용한다.

## Submission Flow

### 1. 제출 (POST)

```ts
const response = await fetch(
  `${API_BASE_URL}/api/v1/ai-reports/commercials/${commercialCode}?serviceCode=${serviceCode}&periodCode=${periodCode}`,
  { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } },
);
const { dataBody } = await response.json();

if (dataBody.submissionStatus.code === "CACHED") {
  // 200: 캐시 hit — commercialReport가 바로 채워져 있으므로 즉시 렌더
  renderReport(dataBody.commercialReport);
} else {
  // 202: ACCEPTED — jobId로 SSE 구독 시작
  subscribeJobStream(dataBody.jobId);
}
```

- 같은 사용자가 같은 조건으로 중복 제출해도 서버가 멱등성을 보장한다.
  in-flight 작업이 있으면 **기존 jobId를 그대로 반환**하므로 프론트에서 별도 중복 방지 로직은 필수가 아니다.
- 리포트 종류별 응답 필드: `commercialReport`, `commercialComparisonReport`, `districtReport`, `administrationReport`
  (jobType에 해당하는 필드 하나만 채워진다.)

### 2. 상태 수신 (SSE, 권장)

브라우저 기본 `EventSource`는 Authorization 헤더를 지원하지 않는다.
**fetch 기반 SSE 클라이언트**(`@microsoft/fetch-event-source` 등)를 사용한다.

```ts
import { fetchEventSource } from "@microsoft/fetch-event-source";

function subscribeJobStream(jobId: string) {
  const controller = new AbortController();

  fetchEventSource(`${API_BASE_URL}/api/v1/ai-reports/jobs/${jobId}/stream`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: controller.signal,

    onmessage(event) {
      if (event.event !== "job-update") return;
      const job = JSON.parse(event.data); // GET /jobs/{jobId} 응답의 dataBody와 동일한 JSON

      updateStage(job.status); // status.code: PENDING | RUNNING | COMPLETED | FAILED

      if (job.status.code === "COMPLETED") {
        renderReport(job.commercialReport); // jobType에 맞는 필드 사용
      }
      if (job.status.code === "FAILED") {
        showError(job.errorCode, job.errorMessage); // 재시도 버튼 노출
      }
      // COMPLETED/FAILED 도달 시 서버가 스트림을 닫는다 (onclose 호출됨)
    },

    onerror() {
      // 네트워크 오류 등으로 스트림이 끊기면 폴링 폴백으로 전환
      controller.abort();
      startPollingFallback(jobId);
    },
  });
}
```

동작 계약:

- 이벤트는 **주기적으로 오지 않는다. 상태가 바뀔 때만** 온다.
  일반적으로 스냅샷 1회 → RUNNING 1회 → COMPLETED/FAILED 1회, 총 2~3회 수신하고 스트림이 끝난다.
- 구독 즉시 **현재 상태 스냅샷이 `job-update` 이벤트로 1회** 온다.
  화면 이탈 후 재진입 시에도 재구독만 하면 현재 상태를 바로 받는다.
- 이후 상태가 바뀔 때마다 같은 이벤트가 오고, COMPLETED/FAILED에서 서버가 연결을 닫는다.
- 서버는 25초 간격 하트비트(코멘트 프레임)로 연결을 유지한다. 클라이언트 처리는 필요 없다.
- 서버 측 연결 타임아웃은 약 6분(작업 최대 수명 + 여유)이다. 그 전에 작업은 반드시 종결된다.
- 존재하지 않거나 타인의 jobId면 SSE가 시작되기 전에 404 JSON 오류로 응답한다.

### 3. 폴링 폴백 (SSE 실패 시)

```ts
async function startPollingFallback(jobId: string) {
  const timer = setInterval(async () => {
    const res = await fetch(`${API_BASE_URL}/api/v1/ai-reports/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const { dataBody: job } = await res.json();

    updateStage(job.status);
    if (job.status.code === "COMPLETED" || job.status.code === "FAILED") {
      clearInterval(timer);
      job.status.code === "COMPLETED"
        ? renderReport(job.commercialReport)
        : showError(job.errorCode, job.errorMessage);
    }
  }, 3000);
}
```

## Progress UI (단계 표시)

`status` 메타데이터의 `name` / `description`을 그대로 노출하면 된다. 별도 매핑 테이블이 필요 없다.

| status.code | status.name | 화면 처리 |
| --- | --- | --- |
| `PENDING` | 대기 중 | 스피너 + "작업이 큐에서 실행을 기다리고 있습니다." |
| `RUNNING` | 생성 중 | 스피너 + "AI가 리포트를 생성하고 있습니다." (평균 수십 초) |
| `COMPLETED` | 완료 | 리포트 렌더 |
| `FAILED` | 실패 | `errorMessage` 노출 + 재시도 버튼 (재제출 POST) |

- 진짜 퍼센트 진행률은 제공하지 않는다 (LLM 생성은 사전 예측 불가).
  필요하면 최근 완료 시간 평균 기반의 "약 N초 남음" 정도를 프론트에서 계산해 보조 표기한다.
- RUNNING이 5분(실행 타임아웃)을 넘기면 서버가 FAILED(`AI_009`)로 전이시키고 이벤트를 보낸다.

### 진행 문구 로테이션 (`progressMessages`)

생성이 수십 초 걸리는 동안 "생성 중"만 떠 있으면 지루하므로,
작업 상태 응답과 SSE 이벤트에는 **리포트 종류별 진행 문구 목록**이 함께 내려온다.

- `progressMessages`: `status`가 `PENDING`/`RUNNING`일 때만 채워지는 문자열 배열.
  종결 상태(COMPLETED/FAILED)에서는 `null`이다.
- 프론트는 이 배열을 **3~5초 간격으로 순환 표시**만 하면 된다. 문구는 하드코딩하지 않는다
  (백엔드가 리포트 종류별로 관리하므로 문구 수정에 프론트 배포가 필요 없다).
- 실제 처리 단계와 무관한 UX 연출용이다. 진행률처럼 해석해 표시하지 않는다.

```ts
function startProgressRotation(messages: string[], render: (text: string) => void) {
  let index = 0;
  render(messages[0]);
  return setInterval(() => {
    index = (index + 1) % messages.length;
    render(messages[index]);
  }, 4000);
}

// job-update 이벤트 수신 시
if (job.status.code === "PENDING" || job.status.code === "RUNNING") {
  rotationTimer ??= startProgressRotation(job.progressMessages, setProgressText);
} else {
  clearInterval(rotationTimer); // 종결 시 로테이션 중지
}
```

## Error Codes

| 코드 | 의미 | 화면 처리 |
| --- | --- | --- |
| `SECURITY_001` 등 | 미인증 (401) | 잠금 카드 상태로 전환 / 로그인 유도 |
| `AI_005` | 작업 없음 / 타인 작업 (404) | jobId 폐기 후 재제출 유도 |
| `AI_002` | LLM 일시 사용 불가 (503) | "잠시 후 다시 시도" + 재시도 버튼 |
| `AI_009` | 작업 타임아웃 | 재시도 버튼 |
| 그 외 `AI_xxx` | 생성 실패 | `errorMessage` 노출 + 재시도 버튼 |

## Checklist

- [ ] 비로그인: AI 리포트 영역을 잠금 카드로 렌더 (정적 샘플 blur + 가치 카피 + returnUrl 포함 로그인 CTA)
- [ ] 비로그인: `/api/v1/ai-reports/**` 호출 금지
- [ ] 로그인: POST 제출 → 200 CACHED 즉시 렌더 / 202 ACCEPTED SSE 구독 분기
- [ ] SSE는 fetch 기반 클라이언트로 Authorization 헤더 첨부
- [ ] SSE 실패 시 3초 폴링 폴백
- [ ] PENDING/RUNNING/COMPLETED/FAILED 단계 표시 (`status.name`/`description` 그대로 사용)
- [ ] FAILED 시 `errorMessage` + 재시도 버튼
- [ ] 화면 재진입 시 보유 jobId로 재구독 (스냅샷 자동 수신)
