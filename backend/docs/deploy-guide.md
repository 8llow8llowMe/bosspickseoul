# BossPickSeoul Deploy Guide

라즈베리파이 5 (8GB RAM) 위에서 BossPickSeoul 백엔드를 컨테이너로 운영하기 위한 가이드입니다.  
서비스마다 자기 `Dockerfile` 과 `docker-compose-{서비스명}.yml` 을 가지며, Jenkins 멀티브랜치 job 단위로 독립 배포합니다.

## 파일 구조

```text
backend/
├── .env.example
├── cloud/
│   ├── service-discovery/
│   │   ├── service-discovery.Dockerfile
│   │   └── docker-compose-service-discovery.yml
│   └── api-gateway/
│       ├── api-gateway.Dockerfile
│       └── docker-compose-api-gateway.yml
└── service/
    ├── auth-service/
    ├── commercial-service/
    ├── district-service/
    ├── community-service/
    ├── ai-service/
    └── batch-service/
```

## 명명 규칙

| 항목 | 규칙 |
| --- | --- |
| 이미지명 | `bosspickseoul-{service}:latest` |
| 컨테이너명 | `bosspickseoul-{service}-{env}` |
| 네트워크 | `8llow8llowme-net` |
| Dockerfile | `{서비스명}.Dockerfile` |
| Compose | `docker-compose-{서비스명}.yml` |

## 포트 배치

trip-marble 이 dev=7XXX / prod=8XXX 를 사용하므로 BossPickSeoul 은 dev=6XXX / prod=9XXX 로 분리합니다.

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

## 사전 빌드

각 서비스 컨테이너는 사전에 빌드된 `*.jar` 를 복사합니다.

```bash
./gradlew :service:auth-service:bootJar -x test
./gradlew :cloud:api-gateway:bootJar -x test
```

## 배포 서버 디렉터리 구조

권장 구조:

```text
$HOME/
└── deploy/
    └── bosspickseoul/
        └── backend/
            ├── cloud/
            │   ├── service-discovery/
            │   └── api-gateway/
            └── service/
                ├── auth-service/
                ├── commercial-service/
                ├── district-service/
                ├── community-service/
                ├── ai-service/
                └── batch-service/
```

Jenkins 공통 파이프라인은 절대 경로를 코드에 고정하지 않고 아래 규칙으로 계산합니다.

```text
$HOME/${DEPLOY_BASE_PARENT}/${PROJECT_SLUG}/${DEPLOY_APP_DIR}/${serviceGroup}/${serviceName}
```

기본값:

- `DEPLOY_BASE_PARENT=deploy`
- `PROJECT_SLUG=bosspickseoul`
- `DEPLOY_APP_DIR=backend`

예를 들어 `auth-service` 배포 디렉터리는 아래처럼 결정됩니다.

```text
$HOME/deploy/bosspickseoul/backend/service/auth-service
```

## Vault 기반 env 전달

이제 Jenkins 는 Secret File Credential 로 `.env` 를 직접 보관하지 않고, Vault 에서 서비스별 env 내용을 읽어와 배포 시점에 `.env.runtime` 파일로 생성합니다.

공통 Jenkinsfile 기본 규칙:

- Vault 경로 루트: `kv/bosspickseoul/backend`
- 실제 조회 경로: `kv/bosspickseoul/backend/{env}/{group}/{service}`
- 조회 key 이름: `env_file`

예시:

```text
kv/bosspickseoul/backend/prod/service/auth-service
kv/bosspickseoul/backend/dev/cloud/api-gateway
```

각 secret 안에는 최소한 아래 key 가 있어야 합니다.

```text
env_file
```

`env_file` 값은 `.env` 파일 전체 내용을 그대로 담는 방식입니다.  
즉 비밀 키 몇 개만 담는 것이 아니라, 해당 compose 가 필요로 하는 전체 키셋을 포함해야 합니다.

## Jenkins 파라미터 기준

공통 파이프라인 주요 파라미터:

- `TARGET_BRANCH`: 배포 환경 판정 기준 브랜치
- `PR_SHA`: 특정 PR 커밋을 강제로 체크아웃할 때 사용
- `RUN_TESTS`: `bootJar` 이전 테스트 실행 여부
- `SKIP_DEPLOY`: 빌드만 수행하고 배포 생략
- `DEPLOY_BASE_PARENT`: 배포 서버 홈 아래 상위 폴더명
- `PROJECT_SLUG`: 프로젝트 슬러그
- `DEPLOY_APP_DIR`: 앱 루트 폴더명
- `VAULT_CREDENTIAL_ID`: Jenkins 의 Vault 인증 Credential ID
- `VAULT_SECRET_ROOT`: Vault 공통 경로 루트
- `VAULT_ENV_KEY`: env 파일 내용을 담은 Vault key 이름
- `VAULT_ENGINE_VERSION`: KV 엔진 버전

## Jenkins + Vault 실행 흐름

1. builder agent 에서 `test` 와 `bootJar` 수행
2. JAR, Dockerfile, compose 파일만 `stash`
3. deploy agent 가 `unstash`
4. `withVault(...)` 로 Vault secret 조회
5. 조회한 `env_file` 값을 `.env.runtime` 로 생성
6. 배포 서버 디렉터리로 `rsync`
7. `docker compose --env-file .env.runtime -f ... config` 로 사전 검증
8. `docker compose --env-file .env.runtime up -d --build`

즉, 민감한 env 파일 경로와 실제 내용은 레포에 하드코딩하지 않고 Vault 를 단일 허브로 사용합니다.

## auth-service prod 배포 예시

```bash
./gradlew :service:auth-service:bootJar -x test

cd $HOME/deploy/bosspickseoul/backend/service/auth-service
docker compose --env-file .env.runtime \
  -f docker-compose-auth-service.yml up -d --build auth-service-prod
```

위 `.env.runtime` 는 Jenkins deploy stage 에서 Vault 값을 받아 생성한 파일입니다.

## 메모리 가이드

trip-marble 과 같은 호스트에서 운영하므로 BossPickSeoul 은 prod 중심 운영을 권장합니다.

권장 `mem_limit`:

| 서비스 | mem_limit |
| --- | --- |
| service-discovery | 256m |
| api-gateway | 256m |
| auth-service | 384m |
| district-service | 384m |
| commercial-service | 384m |
| ai-service | 768m |
| community-service | 384m |
| batch-service | 384m |

## 권장 배포 wave

현재 서비스 의존을 고려하면 아래 순서가 무난합니다.

1. `service-discovery`
2. `commercial-service`, `district-service`
3. `auth-service`, `community-service`, `batch-service`
4. `ai-service`
5. `api-gateway`

## 트러블슈팅

- `docker network create 8llow8llowme-net` 으로 외부 네트워크를 먼저 생성합니다.
- `JAR not found` 가 나오면 `bootJar` 선행 여부를 확인합니다.
- Vault 조회 실패 시 `VAULT_CREDENTIAL_ID`, `VAULT_SECRET_ROOT`, `VAULT_ENGINE_VERSION` 값과 Jenkins Vault 플러그인 설정을 확인합니다.
- Eureka 등록 실패 시 `SERVICE_DISCOVERY_HOSTNAME=bosspickseoul-service-discovery-prod` 정합성을 확인합니다.
- 포트 충돌 시 trip-marble 7XXX/8XXX 와 BossPickSeoul 6XXX/9XXX 분리를 확인합니다.
- 컨테이너간 통신 실패 시 `docker network inspect 8llow8llowme-net` 으로 attach 상태를 확인합니다.
