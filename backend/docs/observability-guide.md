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

각 서비스의 `application.yml`은 `common-core`에 포함된 공통 observability 설정을 import합니다.

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

현재 backend-1(`192.168.0.13`)의 dev 컨테이너 포트 기준입니다.

| 서비스 | URL |
| --- | --- |
| service-discovery | `http://192.168.0.13:6761/actuator/prometheus` |
| api-gateway | `http://192.168.0.13:6000/actuator/prometheus` |
| auth-service | `http://192.168.0.13:6081/actuator/prometheus` |
| district-service | `http://192.168.0.13:6082/actuator/prometheus` |
| commercial-service | `http://192.168.0.13:6083/actuator/prometheus` |
| ai-service | `http://192.168.0.13:6085/actuator/prometheus` |
| community-service | `http://192.168.0.13:6086/actuator/prometheus` |

batch-service는 상시 API 서버로 운영하지 않을 수 있으므로, 컨테이너를 띄우는 시점에만 Prometheus target에 추가합니다.

## Grafana 1차 대시보드 추천

| 대시보드 | 핵심 지표 |
| --- | --- |
| Infra Overview | host CPU, RAM, disk, network, container up/down |
| Backend Service Metrics | 서비스별 up, JVM heap, GC, thread, HTTP latency, 4xx/5xx |
| API Gateway Overview | Gateway 요청량, route별 latency, 인증 실패, Redis 연결 상태 |
| AI Service Jobs | job 상태, timeout, worker queue, token usage, cache hit/miss |
| Service Logs | 서비스별 WARN/ERROR, 배포 직후 로그, 재시작 로그 |

## 운영 기준

- dev와 prod는 Prometheus job 또는 `env` label로 분리합니다.
- 대시보드는 `project`, `env`, `service`, `application` label을 변수로 사용합니다.
- Loki는 라즈베리파이 2GB monitoring 서버에서는 기본 off로 두고 필요할 때만 켭니다.
- Actuator endpoint는 내부망/VPN/리버스 프록시 보호 범위에서만 접근되도록 운영합니다.
- 운영 서버가 분리되면 backend-1, backend-2처럼 host label을 명확히 붙입니다.

## 빠른 점검

서비스에서 직접 확인:

```bash
curl http://192.168.0.13:6081/actuator/health
curl http://192.168.0.13:6081/actuator/prometheus
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
