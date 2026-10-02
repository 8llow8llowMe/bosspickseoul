# BossPickSeoul 백엔드 Observability 가이드

이 문서는 BossPickSeoul 백엔드 서비스를 Prometheus, Grafana, Loki로 관측하기 위한 기준입니다.

## 1차 목표

- 각 Spring Boot 서비스가 `/actuator/prometheus`를 노출합니다.
- Prometheus가 서비스별 메트릭을 30초 주기로 수집합니다.
- Grafana는 Prometheus를 기본 데이터소스로 사용합니다.
- Loki/Promtail 로그 수집은 모니터링 서버 리소스를 고려해 선택 실행합니다.

## 백엔드 공통 설정

모든 실행 서비스는 공통 Gradle 설정으로 다음 의존성을 사용합니다.

```groovy
implementation 'org.springframework.boot:spring-boot-starter-actuator'
runtimeOnly 'io.micrometer:micrometer-registry-prometheus'
```

각 서비스의 `application.yml`은 공통 observability 설정을 import합니다. 일반 서비스들은 `common-core`에 포함된 리소스를 사용하고, `service-discovery`는 불필요한 `common-core` 의존을 피하기 위해 동일한 리소스를 자신의 classpath에 포함합니다.

```yaml
spring:
  config:
    import: optional:classpath:observability-common.yml
```

공통 observability 설정은 다음과 같습니다.

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,prometheus
  endpoint:
    health:
      probes:
        enabled: true
      show-details: never
  metrics:
    tags:
      application: ${spring.application.name}
      profile: ${SPRING_PROFILES_ACTIVE:${spring.profiles.active:local}}
    distribution:
      percentiles-histogram:
        http.server.requests: true
      slo:
        http.server.requests: 100ms,250ms,500ms,1s,2s,5s
  prometheus:
    metrics:
      export:
        enabled: true
```

`health`, `info`, `prometheus`만 열어두는 이유는 필요한 관측 지표는 확보하면서도 불필요한 actuator endpoint 노출을 줄이기 위해서입니다. `http.server.requests` 히스토그램과 SLO bucket을 같이 열어두면 Grafana에서 p95/p99 latency와 구간별 요청 분포를 바로 시각화할 수 있습니다.

## dev 서비스별 scrape endpoint

dev 컨테이너는 main-server(`192.168.0.11`, hostname `raspberrypi`)에 배포됩니다.

| 서비스 | URL |
| --- | --- |
| service-discovery | `http://192.168.0.11:6761/actuator/prometheus` |
| api-gateway | `http://192.168.0.11:6000/actuator/prometheus` |
| auth-service | `http://192.168.0.11:6081/actuator/prometheus` |
| district-service | `http://192.168.0.11:6082/actuator/prometheus` |
| commercial-service | `http://192.168.0.11:6083/actuator/prometheus` |
| ai-service | `http://192.168.0.11:6085/actuator/prometheus` |
| community-service | `http://192.168.0.11:6086/actuator/prometheus` |
| batch-service | `http://192.168.0.11:6080/actuator/prometheus` |

prod 컨테이너는 backend-1(`192.168.0.13`)의 `9xxx` host port를 사용합니다. 실행하지 않는 target은 Prometheus와 Grafana에서 `DOWN`으로 표시됩니다.

## Docker 관측 라벨 계약

각 Compose 서비스는 로그 수집기가 정규식으로 이름을 추측하지 않도록 다음 `observability.*` 라벨을 명시합니다.

| Docker label | 예시 | 용도 |
| --- | --- | --- |
| `observability.project` | `bosspickseoul` | 프로젝트 구분 |
| `observability.group` | `service` | `service` 또는 `cloud` |
| `observability.service` | `auth-service` | 논리 서비스 |
| `observability.env` | `dev` | 배포 환경 |
| `observability.application` | `auth-service` | Spring/Eureka 애플리케이션 |
| `observability.deployment` | `bosspickseoul-auth-service-dev` | Docker 배포 단위 |

`spring.application.name`은 Eureka 서비스 탐색 ID이므로 모니터링만을 위해 컨테이너명으로 변경하지 않습니다. Grafana의 기본 필터는 `service`를 사용하고, Docker 실행 단위가 필요할 때 `container` 또는 `deployment`를 사용합니다. Prometheus `instance`는 실제 scrape endpoint인 `192.168.0.11:6081` 형태를 유지합니다.

## Grafana 1차 대시보드 추천

| 대시보드 | 핵심 지표 |
| --- | --- |
| Backend Overview | 서비스별 UP/DOWN, 처리량, p95, heap, 5xx |
| Backend Logs | 서비스별 로그 수집량, WARN/ERROR, 실시간 로그 |
| JPA Repository | Repository 호출률, 평균 응답시간, 오류 |
| HTTP Performance | URI 처리량, p50/p95/p99, 상태 코드 |
| JVM | heap, CPU, thread, GC pause |

## 운영 기준

- Prometheus job은 `bosspickseoul-service`, `bosspickseoul-cloud`로 분리합니다.
- 대시보드는 `project`, `service_group`, `env`, `host`, `service`, `instance`를 기본 변수로 사용합니다.
- Loki는 라즈베리파이 2GB monitoring 서버에서는 기본 off로 두고 필요할 때만 켭니다.
- Actuator endpoint는 내부망/VPN/리버스 프록시 보호 범위에서만 접근되도록 운영합니다.
- 운영 서버가 분리되면 backend-1, backend-2처럼 host label을 명확히 붙입니다.

### 서킷브레이커 알람 (권장 — 미설정)

내부 Feign / LLM / OAuth 호출에 Resilience4j 서킷브레이커가 적용되어 있고, 지표는
`micrometer-registry-prometheus` 를 통해 `/actuator/prometheus` 로 이미 노출됩니다.
다만 **Grafana 알람은 아직 설정되어 있지 않아** 서킷이 열려도 사용자 신고 전까지 알 수 없습니다.

- 핵심 지표
  - `resilience4j_circuitbreaker_state{name="...",state="open"}` — 1 이면 차단 중
  - `resilience4j_circuitbreaker_calls_seconds_count{kind="failed"}` — 실패 호출 수
- 인스턴스명: `commercial-service` / `district-service`(내부 Feign), `llm`(ai-service), `kakao` / `naver`(auth-service)
- 권장 알람: `max_over_time(resilience4j_circuitbreaker_state{state="open"}[1m]) == 1` 이 2분 이상 지속되면 통지.
  서킷은 10초 뒤 half-open 으로 자동 복구를 시도하므로, 짧은 순단까지 알리면 소음이 됩니다.

### 분기 적재 자동 최신화 지표 (batch-service, 이슈 #445)

- `batch_dataset_refresh_last_run_epoch` — 마지막 run 이 끝난 시각(초). 자동 최신화가 켜진 인스턴스에만 있다(꺼진 dev·prod 인스턴스는 시리즈가 없다). 켠 뒤 첫 run 전에는 0 이라 알람식은 `(time() - batch_dataset_refresh_last_run_epoch > 26*3600) and batch_dataset_refresh_last_run_epoch > 0` 로 둔다. 울리면 05:00 run 이 끝까지 돌지 않은 것이다(트리거 미등록·기동 실패·클러스터 락·run 중단). 켠 다음 날 첫 run 은 이 알람이 잡지 못하므로 롤아웃 5단계에서 로그로 직접 본다. 끊긴 run(`[dataset-refresh] run aborted`)은 이 값을 갱신하지 않는다
- `batch_dataset_refresh_runs_total{outcome="finished|aborted"}` — run 결과. 켜진 인스턴스에만 있다. 알람식 `increase(batch_dataset_refresh_runs_total{outcome="aborted"}[1d]) > 0` — JVM 오류(OOM)·공간·상태 테이블 조회·저장 실패로 run 이 끊겼다. 로그 `[dataset-refresh] run aborted` 와 그 직전 `slot` 로그로 어느 데이터셋에서 끊겼는지 본다
- `batch_dataset_refresh_slots_total{dataset,result}` — 판단 수. `result` 가 `FAILED` / `IMPLAUSIBLE` / `PUBLISHED_NOT_PROJECTED` / `SPATIAL_NOT_READY` 인 증가를 알람 후보로 본다
- `batch_dataset_refresh_api_calls_total` — 서울 Open API 호출 수. 키당 하루 1,000회 한도라 하루 증가분이 600 을 넘지 않아야 한다
- `batch_dataset_refresh_service_type_unresolved_rows_total{dataset}` — 업종 분류를 못 찾은 이관 행. 게시는 계속되지만 업종 Top-N 이 빈다
- `hikaricp_connections_active{pool="batch-commercial"}` / `hikaricp_connections_pending{pool="batch-commercial"}` — commercial 두 번째 풀(상한 4). 기본 풀(district)은 Boot 가 따로 붙인다. pending 이 계속 0 보다 크면 상한을 본다
- 로그는 `[dataset-refresh]` 접두(Loki `|= "[dataset-refresh]"`). 운영 절차는 `services/batch-service.md` 「분기 적재 자동 최신화」

### 분석 기준 분기 로그 (commercial-service · district-service · ai-service, 이슈 #464)

로그는 `[analysis-period]` 접두(Loki `|= "[analysis-period]"`). 예외 메시지 대신 예외 유형·코드만 남긴다(접속 정보 노출 방지). 계산 규칙은 `services/commercial-service.md` 「분석 기준 분기」.

| 서비스 | 레벨 | 로그 | 의미 |
| --- | --- | --- | --- |
| commercial | INFO | `default changed from=… to=… spatialVersion=… lagging=[…]` | 기본 분기가 바뀌었다(기동 직후 첫 계산은 `from=null`). `lagging` 은 가장 앞선 핵심 데이터셋보다 뒤처진 데이터셋 |
| commercial | WARN | `default lags newest core dataset default=… newest=… quarters=… lagging=[…]` | 기본 분기가 가장 앞선 핵심 데이터셋보다 2분기 이상 뒤처진다. 갱신마다 평가하고 같은 상태(집합·분기 수)는 한 번만 찍는다. `lagging` 데이터셋의 적재·이관(`--job=project`)을 본다 |
| commercial | WARN | `no common period across core datasets` | 핵심 데이터셋 공통 분기가 없다. 분기를 생략한 요청이 `ANALYSIS_PERIOD_001`(503). 같은 상태는 한 번만 찍는다 |
| commercial | WARN | `catalog refresh failed, serving stale resolvedAt=… error=…` | 스케줄러 갱신 실패(DB 오류·10초 질의 상한 초과). 마지막 성공값으로 응답 중이고 다음 tick(30초)에 다시 시도한다 |
| commercial | WARN | `catalog refresh failed, no catalog to serve error=…` | 한 번도 계산하지 못했다(기동 직후 첫 갱신 실패 등). 분기를 생략한 요청이 503 이고 다음 tick(30초)의 갱신이 성공하면 회복한다 |
| ai · district | WARN | `default period refresh failed, serving stale periodCode=… error=…` | commercial `/periods` 호출 실패. 마지막 성공값으로 제출·지도 응답 중 |
| ai · district | WARN | `default period unavailable, no value to serve error=…` | 받은 적이 없다. 분기를 생략한 제출은 `AI_013`, 지도 요청은 `MAP_011`(둘 다 503). district 는 10초 백오프 동안 다시 묻지 않는다 |

알람 후보: `no common period` 와 `no catalog to serve` 는 1건이라도 사용자 영향이 있다. commercial 의 `serving stale` 이 30초 주기로 계속 찍히면 DB 장애가, ai·district 의 `serving stale` 이 이어지면 commercial-service 장애가 이어지는 것이다. ai·district 의 `/periods` 는 분석·원천 호출과 다른 서킷(`commercial-service-periods`)이라 `resilience4j_circuitbreaker_state{name="commercial-service-periods"}` 로 따로 본다.

## 빠른 점검

서비스에서 직접 확인:

```bash
curl http://192.168.0.11:6081/actuator/health
curl http://192.168.0.11:6081/actuator/prometheus
```

Prometheus target 확인:

```bash
curl http://<monitoring-server-ip>:9090/api/v1/targets
```

Grafana에서 먼저 만들 패널:

```promql
up{project="bosspickseoul", env="dev"}
```

```promql
sum by (application) (jvm_memory_used_bytes{area="heap"})
```

```promql
sum by (service, status) (rate(http_server_requests_seconds_count{project="bosspickseoul", env="dev"}[5m]))
```
