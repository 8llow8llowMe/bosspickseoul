# BossPickSeoul Deploy Guide

라즈베리파이 5(8GB RAM) 환경에서 BossPickSeoul 백엔드 서비스를 컨테이너로 빌드하고 Jenkins로 배포할 때 사용하는 기준 문서입니다.

## 파일 구조

```text
backend/
├─ .env.example
├─ cloud/
│  ├─ service-discovery/
│  │  ├─ service-discovery.Dockerfile
│  │  └─ docker-compose-service-discovery.yml
│  └─ api-gateway/
│     ├─ api-gateway.Dockerfile
│     └─ docker-compose-api-gateway.yml
└─ service/
   ├─ auth-service/
   ├─ commercial-service/
   ├─ district-service/
   ├─ community-service/
   ├─ ai-service/
   └─ batch-service/
```

## 명명 규칙

| 항목 | 규칙 |
| --- | --- |
| 이미지명 | `bosspickseoul-{service}:latest` |
| 컨테이너명 | `bosspickseoul-{service}-{env}` |
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

## Jenkins 배포 디렉터리 규칙

Jenkins 공통 파이프라인은 서비스별 배포 디렉터리를 아래 규칙으로 계산합니다.

```text
$HOME/${DEPLOY_BASE_PARENT}/${PROJECT_SLUG}/${DEPLOY_APP_DIR}/${serviceGroup}/${serviceName}
```

기본값:

- `DEPLOY_BASE_PARENT=deploy`
- `PROJECT_SLUG=bosspickseoul`
- `DEPLOY_APP_DIR=backend`

예시:

```text
$HOME/deploy/bosspickseoul/backend/service/district-service
```

## Vault 기반 env 주입

Jenkins는 Secret File Credential로 `.env` 파일을 직접 저장하지 않고, Vault에서 env 내용을 읽어 `.env.runtime` 파일로 생성한 뒤 `docker compose --env-file`에 전달합니다.

기본 규칙:

- Vault 루트 경로: `kv/bosspickseoul/backend`
- 기본 secret 경로: `kv/bosspickseoul/backend/{env}/env`
- 기본 key 이름: `env_file`

예시:

```text
kv/bosspickseoul/backend/dev/env
kv/bosspickseoul/backend/prod/env
```

Vault secret 안에는 최소한 아래 key가 있어야 합니다.

```text
env_file
```

`env_file` 값에는 `.env.example` 형식을 따른 전체 `.env` 내용이 들어가야 합니다.

## Jenkins 파라미터

공통 백엔드 파이프라인 주요 파라미터:

- `TARGET_BRANCH`: 배포 환경 판별 기준 브랜치
- `PR_SHA`: 특정 커밋 SHA를 직접 체크아웃할 때 사용
- `RUN_TESTS`: `bootJar` 전에 테스트 실행 여부
- `SKIP_DEPLOY`: 빌드만 수행하고 배포는 건너뜀
- `DEPLOY_BASE_PARENT`: 배포 서버 기준 최상위 디렉터리명
- `PROJECT_SLUG`: 프로젝트 식별자
- `DEPLOY_APP_DIR`: 배포 루트 디렉터리명
- `VAULT_CREDENTIAL_ID`: Jenkins에 등록된 Vault 인증 Credential ID
- `VAULT_SECRET_ROOT`: 기본 Vault 루트 경로. 비우면 `kv/${PROJECT_SLUG}/backend`
- `VAULT_SECRET_PATH`: Vault secret 전체 경로를 직접 지정할 때 사용
- `VAULT_ENV_KEY`: env 전체 내용을 담고 있는 key 이름. 기본값 `env_file`
- `VAULT_ENGINE_VERSION`: KV 엔진 버전. 기본값 `2`

`VAULT_SECRET_PATH`를 지정하면 `VAULT_SECRET_ROOT`보다 우선합니다.

예시:

- 공용 dev env secret 사용: `VAULT_SECRET_PATH=kv/bosspickseoul/backend/dev/env`
- 공용 prod env secret 사용: `VAULT_SECRET_PATH=kv/bosspickseoul/backend/prod/env`

## Jenkins 실행 흐름

1. builder agent에서 대상 모듈 `test`와 `bootJar`를 실행합니다.
2. JAR, Dockerfile, compose 파일만 `stash`합니다.
3. deploy agent가 `unstash`합니다.
4. `withVault(...)`로 Vault secret을 조회합니다.
5. 조회한 `env_file` 값을 `.env.runtime`으로 생성합니다.
6. 배포 디렉터리로 파일을 `rsync`합니다.
7. `docker compose --env-file .env.runtime -f ... config`로 사전 검증합니다.
8. `docker compose --env-file .env.runtime up -d --build`로 대상 서비스를 올립니다.

## district-service dev 예시

`district-service`를 dev 환경에 배포할 때는 Vault에 아래 경로가 준비되어 있으면 됩니다.

```text
kv/bosspickseoul/backend/dev/env
```

그리고 Jenkins에서는 아래 값만 맞추면 됩니다.

- `TARGET_BRANCH=develop`
- `VAULT_SECRET_PATH=kv/bosspickseoul/backend/dev/env`
- `VAULT_ENV_KEY=env_file`

## 수동 점검 명령

배포 서버에서 수동으로 확인할 때:

```bash
cd $HOME/deploy/bosspickseoul/backend/service/district-service
docker compose --env-file .env.runtime -f docker-compose-district-service.yml config
docker compose --env-file .env.runtime -f docker-compose-district-service.yml up -d --build district-service-dev
docker compose -f docker-compose-district-service.yml ps district-service-dev
```

## 트러블슈팅

- Vault 조회 실패 시 `VAULT_CREDENTIAL_ID`, `VAULT_SECRET_ROOT`, `VAULT_SECRET_PATH`, `VAULT_ENGINE_VERSION` 값을 먼저 확인합니다.
- `docker compose config` 실패 시 Vault의 `env_file` 값이 실제 compose 치환 변수 전체를 포함하는지 확인합니다.
- Eureka 등록 실패 시 `SERVICE_DISCOVERY_HOSTNAME`, `SERVICE_DISCOVERY_PORT` 값이 dev/prod 환경과 맞는지 확인합니다.
- 포트 충돌 시 BossPickSeoul dev=`6XXX`, prod=`9XXX` 규칙이 지켜졌는지 확인합니다.
- 컨테이너 간 통신 실패 시 `docker network inspect 8llow8llowme-net`으로 네트워크 연결 상태를 확인합니다.
