# BossPickSeoul 백엔드 배포 가이드

Jenkins, Docker Compose, HashiCorp Vault를 사용해 BossPickSeoul 백엔드 서비스를 빌드하고 배포하는 기준 문서입니다.

## 배포 모델

백엔드 공통 파이프라인은 아래 흐름으로 동작합니다.

```text
GitHub
-> Jenkins controller
-> builder agent
-> deploy agent
-> Vault key-value secret
-> .env.runtime
-> docker compose
```

deploy agent가 Vault KV secret 전체를 읽고, 각 key-value를 `.env.runtime` 파일로 변환한 뒤 `docker compose --env-file`에 전달합니다.

## 명명 규칙

| 항목 | 규칙 |
| --- | --- |
| 이미지 | `bosspickseoul-{service}:latest` |
| 컨테이너 | `bosspickseoul-{service}-{env}` |
| 네트워크 | `8llow8llowme-net` |
| Dockerfile | `{service}.Dockerfile` |
| Compose 파일 | `docker-compose-{service}.yml` |

## 배포 호스트

환경별 배포 대상 호스트가 분리되어 있습니다.

| 환경 | 호스트 | IP | 포트 대역 | Jenkins agent label |
| --- | --- | --- | --- | --- |
| dev | `main-server` (hostname: `raspberrypi`) | `192.168.0.11` | `6XXX` | `deploy-backend-dev` |
| prod | `backend-1` | `192.168.0.13` | `9XXX` | `deploy-backend-prod` |

## 포트 규칙

BossPickSeoul 백엔드는 dev=`6XXX`, prod=`9XXX` 대역을 사용합니다.

| 서비스 | 내부 포트 | dev | prod |
| --- | --- | --- | --- |
| service-discovery | 8761 | 6761 | 9761 |
| api-gateway | 8000 | 6000 | 9000 |
| auth-service | 8081 | 6081 | 9081 |
| district-service | 8082 | 6082 | 9082 |
| commercial-service | 8083 | 6083 | 9083 |
| ai-service | 8085 | 6085 | 9085 |
| community-service | 8086 | 6086 | 9086 |
| batch-service | 8080 | 6080 | 9080 |

## 배포 디렉터리

공통 백엔드 파이프라인은 서비스별 배포 디렉터리를 아래 규칙으로 계산합니다.

```text
$HOME/${DEPLOY_BASE_PARENT}/${PROJECT_SLUG}/${DEPLOY_APP_DIR}/${serviceGroup}/${serviceName}
```

기본값은 아래와 같습니다.

| 파라미터 | 기본값 |
| --- | --- |
| `DEPLOY_BASE_PARENT` | `deploy` |
| `PROJECT_SLUG` | `bosspickseoul` |
| `DEPLOY_APP_DIR` | `backend` |

`serviceGroup`은 `cloud`(service-discovery, api-gateway) 또는 `service`(도메인 서비스) 중 하나입니다.

예시는 아래와 같습니다.

```text
$HOME/deploy/bosspickseoul/backend/service/district-service
$HOME/deploy/bosspickseoul/backend/cloud/api-gateway
```

## Vault Secret 구조

Vault에는 `.env` 전체 문자열을 하나의 값으로 넣지 않고, 환경변수를 개별 key-value로 저장합니다.

dev 권장 경로는 아래와 같습니다.

```text
kv/bosspickseoul/backend/dev/env
```

prod 권장 경로는 아래와 같습니다.

```text
kv/bosspickseoul/backend/prod/env
```

Vault KV 데이터 예시는 아래와 같습니다.

```json
{
  "TIME_ZONE": "Asia/Seoul",
  "SPRING_PROFILES_ACTIVE": "dev",
  "DISTRICT_SERVICE_PORT": "8082",
  "DISTRICT_SERVICE_PORT_DEV": "6082",
  "DISTRICT_SERVICE_PORT_PROD": "9082",
  "DISTRICT_DB_URL": "jdbc:mysql://192.168.0.11:3306/bosspickseoul_district_dev?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Seoul&zeroDateTimeBehavior=convertToNull&rewriteBatchedStatements=true",
  "DB_USERNAME": "followfollowme",
  "DB_PASSWORD": "change-me",
  "JASYPT_ENCRYPTOR_KEY": "change-me"
}
```

DB 스키마 이름은 dev에서 `_dev` 접미사를 사용하고(`bosspickseoul_district_dev`), prod는 접미사 없이 `bosspickseoul_district`를 사용합니다. 실제 형태는 `.env.example`을 기준으로 합니다.

### `SPRING_PROFILES_ACTIVE` 는 환경별로 다르게 넣는다

위 예시는 dev secret 기준입니다. **prod secret(`kv/bosspickseoul/backend/prod/env`)에는 `"SPRING_PROFILES_ACTIVE": "prod"` 를 넣습니다.**

prod 프로파일이 dev와 다른 점은 두 가지입니다.

| 항목 | dev | prod |
| --- | --- | --- |
| `spring.jpa.hibernate.ddl-auto` | `update` (엔티티 변경이 스키마에 자동 반영) | **`none`** (애플리케이션이 운영 스키마를 바꾸지 않음) |
| Swagger / API 문서 | 활성 | 비활성 (`*SwaggerConfig` 가 `@Profile("!prod")`, 게이트웨이는 문서 라우트 자체를 제거) |

prod에서 `dev` 프로파일을 쓰면 **운영 DB 스키마가 애플리케이션 배포로 자동 변경되고**, 전체 API 스펙이 공개됩니다.
또한 게이트웨이의 문서 라우트(`/{service}-service/**`)가 살아 있어 그 경로로 하위 서비스의 actuator 까지 도달할 수 있습니다.

`ddl-auto: none` 이므로 **prod 스키마 변경은 사람이 적용합니다.** 엔티티에 컬럼/인덱스를 추가하는 변경을 배포할 때는
`backend/scripts/migration/` 의 런북을 먼저 실행한 뒤 애플리케이션을 배포합니다.

Jenkins는 위 데이터를 아래처럼 `.env.runtime`으로 생성합니다.

```env
TIME_ZONE=Asia/Seoul
SPRING_PROFILES_ACTIVE=dev
DISTRICT_SERVICE_PORT=8082
DISTRICT_SERVICE_PORT_DEV=6082
DISTRICT_SERVICE_PORT_PROD=9082
DISTRICT_DB_URL=jdbc:mysql://192.168.0.11:3306/bosspickseoul_district_dev?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Seoul&zeroDateTimeBehavior=convertToNull&rewriteBatchedStatements=true
DB_USERNAME=followfollowme
DB_PASSWORD=change-me
JASYPT_ENCRYPTOR_KEY=change-me
```

### Vault key 추가 절차

기능을 켜려고 새 환경변수가 필요할 때는 아래 순서로 처리합니다. **`.env.runtime` 은 Vault 값으로 매 배포마다 새로 생성되므로 서버에서 직접 고치면 다음 배포에 사라집니다.**

1. `.env.example` 에 key 를 추가합니다 (dev/prod 공통 계약).
2. 서비스 compose 의 `environment` 에 `${KEY}` 를 추가합니다. compose 에 없으면 Vault 에 넣어도 컨테이너에 주입되지 않습니다.
3. Vault 의 dev/prod secret 양쪽에 key 를 추가합니다. **dev/prod 는 같은 key 목록을 유지하고 value 만 다르게 둡니다.**
4. 해당 서비스를 재배포합니다 (PR 에 서비스 라벨을 붙여 머지).

Web UI 대신 CLI 로 넣는다면 기존 key 를 지우지 않도록 `patch` 를 사용합니다. `put` 은 secret 전체를 덮어써서 나머지 key 가 모두 사라집니다.

```bash
export VAULT_ADDR=https://vault.8llow8llowme.com
vault login

# 기존 key 를 보존하며 일부만 추가/수정
vault kv patch kv/bosspickseoul/backend/dev/env \
  RANKING_ENABLED=true \
  KAFKA_BOOTSTRAP_SERVERS=192.168.0.10:19092,192.168.0.10:29092,192.168.0.10:39092 \
  RANKING_TOPIC_REPLICAS=3

# 반영 확인 (값이 민감하면 특정 key 만 조회)
vault kv get -field=KAFKA_BOOTSTRAP_SERVERS kv/bosspickseoul/backend/dev/env
```

### 인기 순위(Kafka) 활성화 시 필요한 key

아래 5개 key 는 commercial-service compose 가 기본값 없이 참조하므로 **dev/prod 양쪽 Vault 에 반드시 있어야 합니다.** 값이 없으면 빈 문자열이 주입되어 `boolean`/`int` 바인딩이 실패하고 컨테이너가 기동하지 못합니다. 인기 순위를 아직 쓰지 않더라도 `RANKING_ENABLED=false` 로 key 자체는 넣어둡니다.

| key | dev / prod 값 | 설명 |
| --- | --- | --- |
| `RANKING_ENABLED` | `true` (미사용 시 `false`) | Kafka producer/consumer 빈 등록 여부. `false` 면 브로커 없이도 기동 |
| `KAFKA_BOOTSTRAP_SERVERS` | `192.168.0.10:19092,192.168.0.10:29092,192.168.0.10:39092` | Kafka 가 다른 호스트(ollama-01)에 있으므로 **EXTERNAL 리스너 주소**를 쓴다 |
| `RANKING_EVENTS_TOPIC` | `bosspick.analysis-events` | 이벤트 토픽. 기동 시 자동 생성된다 |
| `RANKING_TOPIC_PARTITIONS` | `3` | 토픽 파티션 수 |
| `RANKING_TOPIC_REPLICAS` | `3` | **브로커 수를 넘으면 토픽 생성이 실패한다.** 3노드 클러스터는 3 |

주의할 점 3가지입니다.

- **컨테이너명 DNS 를 쓰면 안 됩니다.** `kafka-1:9092` 는 Kafka 와 같은 호스트의 컨테이너에서만 해석됩니다. 백엔드(main-server)와 Kafka(ollama-01)가 분리되어 있으므로 반드시 IP + EXTERNAL 포트를 씁니다. 이때 Kafka 쪽 `.env` 의 `KAFKA_EXTERNAL_HOST` 가 실제 IP 로 설정되어 있어야 합니다.
- **복제 계수를 브로커 수보다 크게 넣으면 조용히 실패합니다.** 토픽 생성이 실패하고, 발행 실패는 WARN 로그만 남기도록 설계되어 있어 앱은 정상인데 순위만 안 쌓입니다.
- 발행되는 이벤트는 `acks=1` 이라 유실을 허용합니다. 브로커의 `min.insync.replicas` 는 `acks=all` 일 때만 강제되므로 이 토픽에는 적용되지 않습니다. 인기 순위는 부가 데이터라는 설계 전제입니다.

## Jenkins Credential

파이프라인은 Vault HTTP API와 AppRole 로그인을 사용해 Vault secret을 읽습니다.

Jenkins에는 아래 credential을 `Secret text` 타입으로 생성합니다.

| Jenkins Credential ID | 값 |
| --- | --- |
| `bosspickseoul-vault-role-id` | Vault AppRole `role_id` |
| `bosspickseoul-vault-secret-id` | Vault AppRole `secret_id` |

기존 Vault Plugin credential은 Jenkins에 남아 있어도 되지만, 현재 파이프라인은 `withVault`를 사용하지 않습니다.

## deploy agent 필수 도구

deploy agent에서는 아래 명령을 실행할 수 있어야 합니다.

```text
curl
rsync
docker
docker compose
```

`curl`은 Vault 로그인과 KV secret 전체 조회에 사용합니다.

## Jenkins 파라미터

| 파라미터 | 기본값 | 설명 |
| --- | --- | --- |
| `TARGET_BRANCH` | 빈 값 | 비워두면 `CHANGE_TARGET` 또는 `BRANCH_NAME`을 사용합니다. `develop`은 dev, `main`은 prod로 판단합니다. |
| `RUN_TESTS` | `true` | `bootJar` 전에 대상 모듈 테스트를 실행합니다. |
| `SKIP_DEPLOY` | `false` | `true`이면 빌드만 수행하고 배포는 생략합니다. |
| `VAULT_ADDR` | `https://vault.8llow8llowme.com` | Vault API 주소입니다. |
| `VAULT_AUTH_PATH` | `approle` | Vault AppRole 인증 mount path입니다. |
| `VAULT_ROLE_ID_CREDENTIAL_ID` | `bosspickseoul-vault-role-id` | AppRole `role_id`를 담은 Jenkins Secret text Credential ID입니다. |
| `VAULT_SECRET_ID_CREDENTIAL_ID` | `bosspickseoul-vault-secret-id` | AppRole `secret_id`를 담은 Jenkins Secret text Credential ID입니다. |
| `VAULT_SECRET_ROOT` | 빈 값 | 비워두면 `kv/${PROJECT_SLUG}/backend`를 사용합니다. |
| `VAULT_SECRET_PATH` | 빈 값 | 입력하면 `VAULT_SECRET_ROOT`보다 우선합니다. |
| `VAULT_ENGINE_VERSION` | `2` | Vault KV 엔진 버전입니다. |
| `DEPLOY_LOCK_NAME` | `backend-1-deploy` | 동일 호스트 동시 배포를 막는 lock 이름입니다. dev 배포에는 `main-server-deploy` 사용을 권장합니다. |

Jenkins가 사용하는 Vault AppRole `secret_id`는 운영 IaC 기준으로 만료 없이(`secret_id_ttl=0`) 관리합니다. 따라서 정기 만료로 빌드가 깨지지 않아야 하며, Jenkins Web UI의 `bosspickseoul-vault-secret-id` 값은 노출 또는 보안 점검 시에만 수동 회전합니다.

첫 dev 배포에서는 명시 경로를 사용하는 것을 권장합니다.

```text
TARGET_BRANCH=develop
VAULT_SECRET_PATH=kv/bosspickseoul/backend/dev/env
```

## Vault Policy

KV v2에서 `kv/bosspickseoul/backend/dev/env`를 읽으려면 Jenkins AppRole에 아래 권한이 필요합니다.

```hcl
path "kv/data/bosspickseoul/backend/dev/env" {
  capabilities = ["read"]
}

path "kv/metadata/bosspickseoul/backend/dev/env" {
  capabilities = ["read", "list"]
}
```

prod도 배포할 경우 prod 경로를 추가합니다.

```hcl
path "kv/data/bosspickseoul/backend/prod/env" {
  capabilities = ["read"]
}

path "kv/metadata/bosspickseoul/backend/prod/env" {
  capabilities = ["read", "list"]
}
```

## 권장 배포 순서

백엔드 서비스는 아래 순서로 배포하는 것을 권장합니다.

1. `service-discovery`
2. `commercial-service`
3. `district-service`
4. `auth-service`
5. `community-service`
6. `ai-service`
7. `batch-service`
8. `api-gateway`

`district-service`는 Eureka 등록과 `commercial-service` 호출 가능성이 있으므로 `service-discovery`를 먼저 올리는 편이 로그 확인에 유리합니다.

## 수동 점검

배포 서버에서 아래처럼 확인할 수 있습니다.

```bash
cd "$HOME/deploy/bosspickseoul/backend/service/district-service"
test -s .env.runtime
docker compose --env-file .env.runtime -f docker-compose-district-service.yml config
docker compose -f docker-compose-district-service.yml ps district-service-dev
docker logs --tail 200 bosspickseoul-district-service-dev
```

## 트러블슈팅

| 증상 | 확인 항목 |
| --- | --- |
| Vault 로그인 실패 | `VAULT_ADDR`, AppRole `role_id`, AppRole `secret_id`, `VAULT_AUTH_PATH` |
| Vault 조회가 403으로 실패 | AppRole policy의 `kv/data/...`, `kv/metadata/...` 권한 |
| `.env.runtime`에 key가 부족함 | Vault Web UI에 저장된 key 이름과 compose 필수 변수 |
| `docker compose config` 실패 | `*_PORT_DEV`, `*_PORT_PROD`, DB, Redis, JWT, service discovery 변수 누락 |
| 컨테이너는 뜨지만 Eureka 등록 실패 | `SERVICE_DISCOVERY_HOSTNAME`, `SERVICE_DISCOVERY_PORT`, Docker network |
| deploy agent에서 Docker 실행 실패 | Docker socket mount와 deploy agent 권한 |
