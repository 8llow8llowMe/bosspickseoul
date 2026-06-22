# Backend Data, AI, Infra 고도화 로드맵

BossPickSeoul 백엔드 개발 서버 배포가 안정화된 이후 이어갈 고도화 작업 메모입니다.

다른 채팅이나 작업 세션에서도 바로 이어갈 수 있도록, 데이터 적재, AI service 리팩토링, 운영 모니터링, 서버 역할 분리까지 한 문서에 정리합니다.

## 현재 상태

개발용 백엔드 컨테이너는 `backend-1` 라즈베리파이5 호스트에 배포되어 있습니다.

```text
bosspickseoul-service-discovery-dev 6761 -> 8761
bosspickseoul-api-gateway-dev       6000 -> 8000
bosspickseoul-auth-service-dev      6081 -> 8081
bosspickseoul-district-service-dev  6082 -> 8082
bosspickseoul-commercial-service-dev 6083 -> 8083
bosspickseoul-ai-service-dev        6085 -> 8085
bosspickseoul-community-service-dev 6086 -> 8086
backend-dev-agent
redis-node2 / redis-sentinel-node2
legacy prod containers
```

라즈베리파이5 8GB RAM + SSD 500GB 환경에서 모든 백엔드 서비스, Redis, Jenkins deploy agent, legacy prod 컨테이너까지 함께 올리기에는 메모리 여유가 부족할 가능성이 높습니다.

## 우선순위 요약

| 우선순위 | 작업 | 목적 |
| --- | --- | --- |
| 1 | 데이터 적재 설계 문서 작성 | 원천 데이터, 정규화, 검증 기준을 명확히 한다. |
| 2 | 최신년도 데이터 적재 스크립트/batch 정리 | 상권/행정동/통계 데이터를 재실행 가능한 방식으로 넣는다. |
| 3 | ai-service 리포트 파이프라인 리팩토링 | LLM 호출, 프롬프트, 파싱, Job 상태 관리를 분리한다. |
| 4 | AI 리포트 메타데이터 저장 | `dataVersion`, `promptVersion`, `modelName`으로 결과 추적성을 확보한다. |
| 5 | Grafana 대시보드 정리 | dev/prod 서비스 상태와 장애 징후를 빠르게 본다. |
| 6 | 서버 역할 분리 | 백엔드 앱 서버와 인프라 서버를 분리해 안정성을 높인다. |

## 1. 데이터 적재 설계 문서

### 목표

상권, 행정동, 추천/리포트에 필요한 데이터를 단순 insert가 아니라 재현 가능한 데이터 파이프라인으로 관리합니다.

### 설계해야 할 내용

- 원천 데이터 목록
- 원천 데이터 출처와 기준일
- 서비스 테이블 매핑 규칙
- 행정동 코드, 상권 코드, 법정동/행정동 매핑 기준
- 연도/분기별 데이터 버전 관리 규칙
- 적재 실패/중복/누락 검증 기준

### 권장 데이터 흐름

```text
원천 파일 또는 공공데이터 API
-> raw/staging table
-> 정규화 table
-> service query table
-> API / AI 리포트 입력 DTO
```

### 메타데이터 필드 권장

```text
source_name
source_version
base_year
base_quarter
loaded_at
normalized_at
checksum 또는 row_hash
```

## 2. 최신년도 데이터 적재 스크립트/batch

### 목표

최신년도 상권 데이터를 수동 SQL이 아니라 재실행 가능한 batch/script로 적재합니다.

### 작업 항목

- NowDoBoss 기존 데이터를 BossPickSeoul 스키마 기준으로 재정규화
- 최신년도 상권/행정동/점포/매출/변화지표 데이터 확보
- raw -> normalized -> service table 적재 스크립트 작성
- 중복 키, 누락 코드, null 비율, 비정상 증감 검증
- 적재 결과 리포트 생성

### 검증 예시

```text
행정동 코드 누락 0건
상권 코드 중복 0건
상권-행정동 매핑 실패 0건
필수 지표 null 비율 기준 이하
전년 대비 급증/급감 이상치 목록 출력
```

### 추천 구현 위치

초기에는 `backend/scripts` 또는 `backend/docs/services`에 적재 명세를 두고, 반복 실행이 안정화되면 `batch-service` 기능으로 승격합니다.

## 3. ai-service 리포트 파이프라인 리팩토링

### 목표

ai-service를 단순 LLM 호출 모듈이 아니라 데이터 기반 리포트 생성 파이프라인으로 정리합니다.

### 권장 파이프라인

```text
요청 수신
-> 파라미터 검증
-> 데이터 조회
-> 리포트 입력 DTO 구성
-> 프롬프트 생성
-> LLM 호출
-> 응답 파싱
-> 스키마 검증
-> 결과 저장/캐싱
-> 응답 반환
```

### 리팩토링 방향

- `AiClientPort`로 LLM provider 의존성 분리
- Ollama/OpenAI/Spring AI adapter를 outbound adapter로 격리
- 프롬프트 생성을 별도 formatter 또는 template 계층으로 분리
- JSON/schema parser를 LLM client와 분리
- Job 상태 전이를 명확히 관리
- timeout, parsing failure, model unavailable을 도메인 실패 상태로 표현

### 권장 패키지 방향

```text
application/service
  AiReportSubmitProcessor
  AiReportJobProcessor
  AiReportResultReader

application/port/in
  SubmitAiReportUseCase
  ReadAiReportUseCase

application/port/out
  AiModelClientPort
  AiReportDataQueryPort
  AiReportJobRepositoryPort
  AiReportCachePort

adapter/out/llm
  OllamaAiModelClientAdapter
  OpenAiModelClientAdapter

adapter/out/prompt
  AiReportPromptFormatter
  AiReportPromptVersion

adapter/out/parser
  AiReportResponseParser
  AiReportSchemaValidator
```

### 주의할 점

- LLM 응답을 신뢰하지 않고 항상 schema validation을 거친다.
- prompt와 model이 바뀌면 같은 입력이라도 결과가 달라질 수 있으므로 버전을 남긴다.
- 캐시 키에는 요청 파라미터뿐 아니라 데이터 버전, 프롬프트 버전, 모델명을 포함한다.

## 4. AI 리포트 메타데이터 저장

### 목표

AI 리포트 결과를 나중에 추적, 비교, 재생성할 수 있게 만듭니다.

### 저장 권장 필드

```text
job_id
request_hash
report_type
target_code
target_name
data_version
prompt_version
model_provider
model_name
temperature
max_tokens
status
failure_code
failure_message
token_usage_input
token_usage_output
created_at
started_at
completed_at
expires_at
```

### 캐시 키 권장

```text
ai-report:{reportType}:{targetCode}:{dataVersion}:{promptVersion}:{modelName}:{requestHash}
```

### 기대 효과

- 같은 조건의 요청은 캐시로 재사용 가능
- 리포트가 왜 달라졌는지 원인 추적 가능
- 모델 교체 또는 프롬프트 수정 전후 결과 비교 가능

## 5. Grafana 대시보드 정리

### 목표

개발/운영 서버 상태, 서비스 장애, 배포 결과를 한 화면에서 확인합니다.

### 우선 대시보드

| 대시보드 | 지표 |
| --- | --- |
| Host Overview | CPU, RAM, disk, network, load average |
| Docker Overview | container up/down, restart count, memory usage |
| Backend API | request count, latency, 4xx/5xx |
| JVM | heap, non-heap, GC, thread count |
| Redis | memory, connected clients, command rate, errors |
| MySQL | connection, slow query, buffer pool, lock wait |
| Jenkins Deploy | build result, deploy duration, failed stage |
| AI Service | job status, timeout count, model call latency, parser failure |

### 추천 알림

```text
컨테이너 down
서비스 5xx 급증
메모리 사용률 85% 이상
디스크 사용률 80% 이상
AI job failure rate 증가
Redis 연결 실패
MySQL connection pool exhaustion
```

## 6. 서버 역할 분리 계획

### 현재 문제

라즈베리파이5 8GB RAM에 백엔드 서비스 전체와 Redis, deploy agent, legacy prod 컨테이너까지 같이 올리면 메모리와 CPU 여유가 작습니다.

Spring Boot 서비스 여러 개는 idle 상태에서도 각각 JVM heap, metaspace, thread, Netty/Tomcat 리소스를 사용합니다. 여기에 Redis, Jenkins agent, Docker build까지 겹치면 8GB RAM은 빠듯합니다.

### 추천 방향

신규 저전력 미니PC를 백엔드 앱 서버로 사용하고, 라즈베리파이5는 초기화 후 인프라 보조 서버로 전환하는 구성이 좋습니다.

```text
mini-pc-backend-1
  - BossPickSeoul backend dev/prod containers
  - backend deploy agent
  - optional Redis replica or app-local cache

raspberrypi-infra-1
  - monitoring node-exporter
  - lightweight reverse proxy or internal utility
  - backup/sync job
  - optional Redis sentinel/sub node
  - homelab infra helper

ollama-01
  - Jenkins controller
  - Jenkins builder agent
  - Vault
  - Ollama/Open WebUI
```

### 신규 미니PC 권장 사양

| 등급 | 권장 사양 | 용도 |
| --- | --- | --- |
| 최소 | Intel N100, RAM 16GB, NVMe 500GB | 소수 서비스 dev 테스트 |
| 권장 | Intel i3-N305 또는 Ryzen 5/7 U/HS, RAM 32GB, NVMe 1TB | 백엔드 dev/prod 컨테이너 운영 |
| 여유 | Ryzen 7 7840HS/8845HS급, RAM 64GB, NVMe 1~2TB | 백엔드 + 일부 DB/검색/AI 보조 작업 |

### 현재 구성 기준 추천

현재처럼 Spring Boot 서비스 7개 이상, Redis, Jenkins deploy agent, 추후 prod/dev 분리를 고려하면 최소 32GB RAM을 권장합니다.

CPU는 N100도 저전력으로 좋지만 4코어 4스레드라 전체 백엔드 서비스와 빌드/배포 작업을 같이 맡기기에는 여유가 적습니다. i3-N305는 8코어 8스레드, TDP 15W급이라 저전력 서버로 균형이 좋습니다. 더 오래 쓸 계획이면 Ryzen 7 7840HS/8845HS급 8코어 16스레드 모델이 여유롭습니다.

### 구매 기준

- RAM 32GB 이상 장착 또는 확장 가능
- NVMe 1TB 이상 권장
- 2.5GbE LAN 1개 이상, 가능하면 2개
- BIOS 자동 부팅 지원
- 전원 복구 후 자동 시작 지원
- USB-C PD 단독 전원보다 안정적인 어댑터 전원 선호
- 발열 제어가 좋은 모델
- Ubuntu Server 또는 Debian 설치 사례가 많은 모델

### 라즈베리파이5 활용 추천

라즈베리파이5는 백엔드 앱 서버보다는 인프라 보조 역할이 더 잘 맞습니다.

- Prometheus node-exporter
- lightweight backup job
- Redis Sentinel 또는 보조 Redis node
- 내부 DNS 또는 작은 reverse proxy
- 배포 검증용 smoke-test runner
- 장애 시 임시 maintenance page
- 로그 수집 보조

## 7. 다음 작업 체크리스트

### 데이터

- [ ] 원천 데이터 목록 작성
- [ ] 최신년도 데이터 확보
- [ ] NowDoBoss 기존 데이터 정규화 규칙 작성
- [ ] raw/staging/service table 구분
- [ ] 적재 검증 리포트 포맷 작성

### ai-service

- [ ] 현재 리포트 생성 흐름 다이어그램 작성
- [ ] LLM client port/adapter 분리
- [ ] prompt version 도입
- [ ] response schema validation 강화
- [ ] job status/failure code 정리
- [ ] cache key에 dataVersion/promptVersion/modelName 포함

### infra

- [ ] 미니PC 구매 사양 확정
- [ ] 신규 backend host 이름/IP 결정
- [ ] Jenkins deploy agent 추가
- [ ] Jenkins node label 추가
- [ ] backend dev/prod compose 배포 경로 결정
- [ ] Raspberry Pi 역할 재정의
- [ ] Grafana dashboard 구성

## 참고 스펙

- Intel Processor N100: 4 cores / 4 threads, TDP 6W
- Intel Core i3-N305: 8 cores / 8 threads, TDP 15W
- AMD Ryzen 7 7840HS: 8 cores / 16 threads, default TDP 35-54W

참고 링크:

- https://www.intel.com/content/www/us/en/products/sku/231803/intel-processor-n100-6m-cache-up-to-3-40-ghz/specifications.html
- https://www.intel.com/content/www/us/en/products/sku/231805/intel-core-i3n305-processor-6m-cache-up-to-3-80-ghz/specifications.html
- https://www.amd.com/en/products/processors/laptop/ryzen/7000-series/amd-ryzen-7-7840hs.html

