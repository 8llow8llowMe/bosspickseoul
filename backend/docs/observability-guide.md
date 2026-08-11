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
