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

예시는 아래와 같습니다.

```text
$HOME/deploy/bosspickseoul/backend/service/district-service
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
  "DISTRICT_DB_URL": "jdbc:mysql://192.168.0.11:3306/bosspickseoul_district",
  "DB_USERNAME": "followfollowme",
  "DB_PASSWORD": "change-me",
  "JASYPT_ENCRYPTOR_KEY": "change-me"
}
```

Jenkins는 위 데이터를 아래처럼 `.env.runtime`으로 생성합니다.

```env
TIME_ZONE=Asia/Seoul
SPRING_PROFILES_ACTIVE=dev
DISTRICT_SERVICE_PORT=8082
DISTRICT_SERVICE_PORT_DEV=6082
DISTRICT_SERVICE_PORT_PROD=9082
DISTRICT_DB_URL=jdbc:mysql://192.168.0.11:3306/bosspickseoul_district
DB_USERNAME=followfollowme
DB_PASSWORD=change-me
JASYPT_ENCRYPTOR_KEY=change-me
```

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
