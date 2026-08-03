# Jenkins 백엔드 개발 배포 설정 가이드

이 문서는 BossPickSeoul 백엔드 개발 서버 컨테이너를 GitHub, Jenkins, Vault, Docker Compose로 배포하기 위한 Web UI 설정 절차를 정리한다.

실제 secret 값은 문서나 Git에 남기지 않는다. GitHub App private key, Vault AppRole `role_id`, Vault AppRole `secret_id`, DB/JWT/Redis 비밀번호는 Jenkins Credential 또는 Vault에만 저장한다.

## 1. 전체 배포 흐름

백엔드 개발 배포는 아래 흐름으로 동작한다.

```text
GitHub push 또는 pull_request
-> GitHub webhook
-> Jenkins Multibranch Pipeline
-> builder agent에서 Vault env 주입 후 Gradle test/bootJar
-> backend deploy agent에서 Vault 조회
-> .env.runtime 생성
-> docker compose up -d --build
```

현재 Jenkinsfile은 아래 기준으로 배포 환경을 판단한다.

| GitHub/Jenkins 조건 | Jenkins 변수 | 배포 환경 |
| --- | --- | --- |
| `develop` 브랜치 push/merge | `BRANCH_NAME=develop` | `dev` |
| `main` 브랜치 push/merge | `BRANCH_NAME=main` | `prod` |
| PR 빌드 (대상 무관) | `CHANGE_ID` 존재 | 배포 생략 (CI만) |
| 그 외 브랜치 | 기타 | 배포 생략 |

**PR 빌드는 대상 브랜치와 무관하게 배포하지 않는다.** 과거에는 `develop` 대상 PR도 `dev`에 배포했지만, 같은 `dev` 환경을 두고 `develop` 머지 빌드와 경합해 머지되지 않은 PR 배포가 덮이는 혼선이 있어 제거했다. `dev` = `develop` 미러를 보장하기 위한 결정이다.

## 1-1. 모노레포 빌드/배포 범위 결정

모노레포라서 한 번의 push에 백엔드 잡 8개가 모두 트리거된다. 아래 2단 게이트로 실제 작업 범위를 좁힌다.

**1단계 — 변경 경로로 빌드 여부 결정** (`isServiceAffected`)

자기 서비스 경로(`config.fsPath`) 또는 공용 경로(`backend/core/`, `backend/build.gradle`, `backend/settings.gradle`, `backend/gradle`, `Jenkinsfile`)가 변경되면 빌드한다. 무관하면 `변경 없음 - 생략` 스테이지만 남기고 종료한다. 비교 기준은 PR 빌드는 대상 브랜치와의 merge-base, 브랜치 빌드는 `GIT_PREVIOUS_SUCCESSFUL_COMMIT`이다. 기준을 판단할 수 없으면 전체 빌드로 진행한다(fail-open).

**2단계 — PR 라벨로 배포 여부 결정** (`isServiceDeployAllowedByLabels`)

`Github label filter` 플러그인은 **PR discovery 단계만** 제한한다. 즉 라벨을 붙이면 그 서비스의 PR 빌드만 생성되지만, 머지 후 `develop`/`main` 브랜치 빌드는 8개 잡 모두에 대해 생성되므로 라벨이 반영되지 않는다. 그래서 브랜치 빌드에서는 파이프라인이 직접 PR 라벨을 조회한다.

- 조회 대상: `develop`/`main` 브랜치 빌드만. PR 빌드는 어차피 배포하지 않으므로 라벨을 조회하지 않는다.
- 조회 방법: `GET /repos/{owner}/{repo}/commits/{HEAD}/pulls`로 커밋에 연결된 PR을 역조회한다. 머지 커밋이면 `merge_commit_sha`가 일치하는 항목을 우선한다.
- 라벨명은 `{DEPLOY_LABEL_PREFIX}{serviceName}` 형식 (기본 접두어 `backend-`) — 예: `backend-auth-service`, `backend-api-gateway`, `backend-service-discovery`

**라벨이 없으면 어떤 서비스도 배포하지 않는다 (fail-closed).** 배포는 의도적으로 지정한 대상만 나가야 하므로, 라벨이 없을 때 전체 배포로 넓히지 않는다. 즉 **배포하려면 PR에 라벨을 반드시 붙여야 한다.**

판단 규칙:

| 상황 | 배포 | 빌드 결과 |
| --- | --- | --- |
| 내 서비스 라벨(`backend-{serviceName}`) 있음 | 배포 | SUCCESS |
| `backend-*` 라벨이 있으나 내 서비스 라벨 없음 | 생략 | SUCCESS (`배포 대상 라벨 미지정 - 배포 생략`) |
| `backend-*` 라벨이 전혀 없음 | 생략 | SUCCESS |
| PR 없이 브랜치에 직접 push | 생략 | SUCCESS |
| credential 미설정 / API 실패 / owner-repo 판단 실패 | 생략 | **UNSTABLE** (`라벨 확인 실패({사유}) - 배포 생략`) |

마지막 행만 `UNSTABLE`로 표시한다. 라벨을 안 붙여서 배포하지 않은 것과, 설정·통신 문제로 라벨을 확인조차 못해 배포하지 않은 것은 구분해야 한다. 후자를 SUCCESS로 두면 credential 오설정으로 배포가 영구히 멈춘 것을 알아채기 어렵다. 사유 코드는 `NO_CREDENTIAL`, `NO_REPOSITORY_SLUG`, `API_ERROR`, `PULL_REQUEST_PARSE_FAILED`다.

라벨 조회에는 `GITHUB_APP_CREDENTIAL_ID` 파라미터의 GitHub App credential을 사용한다 (기본값 `github-app-followfollowme-jenkins`, `Pull requests: Read-only` 권한 필요). 이 파라미터를 비우면 라벨을 확인할 수 없으므로 배포가 생략되고 빌드가 `UNSTABLE`이 된다.

사용 가능한 라벨은 잡의 `serviceName`과 1:1로 대응한다.

```text
backend-ai-service        backend-batch-service      backend-district-service
backend-api-gateway       backend-commercial-service backend-service-discovery
backend-auth-service      backend-community-service
```

**운영 시 주의**

- **라벨을 안 붙이면 배포가 아예 일어나지 않는다.** 머지했는데 dev에 반영되지 않으면 먼저 PR 라벨을 확인한다. 빌드 로그의 `라벨 배포 허용 여부`와 `PR #NN 라벨:` 줄을 보면 된다.
- 공용 경로(`Jenkinsfile`, `backend/core/`)를 바꾸면 8개 잡이 모두 **빌드**되지만, 배포는 라벨 대상만 수행된다.
- 배포되지 않은 서비스도 빌드는 수행하므로 공용 코드 변경이 컴파일을 깨뜨리는지는 브랜치 빌드에서 검증된다. (라벨 필터 때문에 PR 빌드는 라벨 대상 서비스만 돌아 검증 공백이 생기므로 의도된 동작이다.)
- 공용 코드 변경을 배포 대상에서 제외하면, 해당 서비스 컨테이너는 **다음 배포 때까지 이전 코드로 동작한다.** 라벨을 좁힐 때 이 점을 고려해야 한다.

## 2. 필요한 Jenkins 플러그인

Jenkins 관리 화면에서 아래 플러그인을 설치한다.

| 플러그인 | 용도 |
| --- | --- |
| `Pipeline` | Jenkinsfile 실행 기본 기능 |
| `Pipeline: Multibranch` | 브랜치/PR별 Jenkinsfile 자동 발견 |
| `Pipeline Utility Steps` | Vault API JSON 응답을 `readJSON`으로 파싱 |
| `Git` | Git checkout |
| `GitHub` | GitHub webhook/status 연동 |
| `GitHub Branch Source` | GitHub repository 기반 Multibranch Pipeline |
| `Credentials Binding` | `withCredentials`로 credential을 환경변수에 바인딩 |
| `Lockable Resources` | 동일 배포 대상에 대한 동시 배포 방지 |
| `Timestamper` | 배포 로그 시간 확인용 |
| `Github label filter` | PR label 기준으로 서비스별 Multibranch Pipeline discovery 제한 |

`HashiCorp Vault` 플러그인은 현재 백엔드 Jenkinsfile에서 필수는 아니다. 현재 파이프라인은 `withVault`가 아니라 `withCredentials + curl`로 Vault HTTP API를 직접 호출한다.

## 3. Jenkins node와 label 설정

Jenkins Web UI에서 아래 node label을 맞춘다.

```text
Jenkins 관리
-> Nodes
-> 대상 node
-> Configure
```

builder agent는 빌드와 테스트를 담당한다.

| 항목 | 추천값 |
| --- | --- |
| Node 이름 | `ai-host-builder` 또는 `builder-agent` |
| Number of executors | `1` 또는 `2` |
| Labels | `builder` |
| Usage | `Only build jobs with label expressions matching this node` |

backend deploy agent는 실제 개발 서버 컨테이너 배포를 담당한다.

| 항목 | 추천값 |
| --- | --- |
| Node 이름 | `backend-dev-agent` |
| Number of executors | `1` |
| Labels | `deploy-backend-dev` |
| Usage | `Only build jobs with label expressions matching this node` |

운영 배포 agent를 분리할 경우 아래처럼 설정한다.

| 항목 | 추천값 |
| --- | --- |
| Node 이름 | `backend-prod-agent` |
| Number of executors | `1` |
| Labels | `deploy-backend-prod` |
| Usage | `Only build jobs with label expressions matching this node` |

deploy agent는 동시에 여러 배포가 겹치지 않도록 executor를 `1`로 유지한다. 현재 Jenkinsfile은 아래 label을 사용한다.

```groovy
buildAgentLabel  : 'builder-backend'
deployAgentLabels: [
    dev : 'deploy-backend-dev',
    prod: 'deploy-backend-prod'
]
```

## 4. GitHub webhook 설정

GitHub repository에서 webhook을 등록한다.

```text
Repository
-> Settings
-> Webhooks
-> Add webhook
```

설정값은 아래와 같다.

| 항목 | 값 |
| --- | --- |
| Payload URL | `https://console.jenkins.8llow8llowme.com/github-webhook/` |
| Content type | `application/json` |
| SSL verification | `Enable SSL verification` |
| Events | `Pushes`, `Pull requests` |
| Active | checked |

`Payload URL` 끝의 `/`를 반드시 포함한다. `/github-webhook`처럼 trailing slash가 없으면 Jenkins 또는 reverse proxy가 `302` redirect를 반환할 수 있다.

Recent Deliveries에서 `Redeliver`를 눌렀을 때 `200` 계열 응답이면 정상이다.

## 5. GitHub App 생성

조직 repository를 Jenkins가 읽어야 하므로 GitHub App은 organization 소유로 만든다.

```text
GitHub
-> 8llow8llowMe organization
-> Settings
-> Developer settings
-> GitHub Apps
-> New GitHub App
```

기본 정보는 아래처럼 입력한다.

| 항목 | 값 |
| --- | --- |
| GitHub App name | `followfollowme-jenkins` |
| Homepage URL | `https://console.jenkins.8llow8llowme.com/` |
| Webhook URL | `https://console.jenkins.8llow8llowme.com/github-webhook/` |
| Webhook secret | 선택. 운영에서는 설정 권장 |

Repository permissions는 최소 아래 권한을 사용한다.

| 권한 | 값 |
| --- | --- |
| Contents | `Read-only` |
| Metadata | `Read-only` |
| Pull requests | `Read-only` |
| Commit statuses | `Read and write` |
| Checks | `Read and write` |

Subscribe to events는 아래를 선택한다.

```text
Push
Pull request
```

생성 후 아래 순서로 repository에 설치한다.

```text
Install App
-> 8llow8llowMe
-> Only select repositories
-> BossPickSeoul
```

## 6. GitHub App private key 변환

GitHub App 화면에서 private key를 생성한다.

```text
Private keys
-> Generate a private key
```

다운로드한 `.pem` 파일은 Jenkins GitHub App credential에서 바로 읽히지 않을 수 있다. Jenkins가 `Private key must be a PKCS#8 formatted string` 오류를 내면 PKCS#8 형식으로 변환한다.

```bash
openssl pkcs8 -topk8 -inform PEM -outform PEM -in current-key.pem -out jenkins-github-app.pkcs8.pem -nocrypt
```

변환 후 파일은 아래 형식이어야 한다.

```text
-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----
```

개인키가 화면 캡처, 채팅, 로그에 노출되었다면 해당 private key는 GitHub App에서 삭제하고 새로 발급한다.

## 7. Jenkins GitHub App credential 생성

Jenkins에서 GitHub App credential을 만든다.

```text
Jenkins 관리
-> Credentials
-> System
-> Global credentials
-> Add Credentials
```

또는 Multibranch Pipeline 생성 화면의 Credentials `Add` 버튼을 사용해도 된다.

| 항목 | 값 |
| --- | --- |
| Kind | `GitHub App` |
| ID | `github-app-followfollowme-jenkins` |
| Description | `followfollowme Jenkins GitHub App` |
| App ID | GitHub App 화면의 `App ID` |
| Key | PKCS#8로 변환한 private key 전체 |
| GitHub organization to test against | `8llow8llowMe` |

`Test Connection`을 눌러 성공하면 저장한다.

## 8. Jenkins Vault credential 생성

Vault AppRole 값은 GitHub credential과 별도로 저장한다.

```text
Jenkins 관리
-> Credentials
-> System
-> Global credentials
-> Add Credentials
```

첫 번째 credential은 `role_id`다.

| 항목 | 값 |
| --- | --- |
| Kind | `Secret text` |
| Scope | `Global` |
| ID | `bosspickseoul-vault-role-id` |
| Secret | Vault AppRole `role_id` |

두 번째 credential은 `secret_id`다.

| 항목 | 값 |
| --- | --- |
| Kind | `Secret text` |
| Scope | `Global` |
| ID | `bosspickseoul-vault-secret-id` |
| Secret | Vault AppRole `secret_id` |

Jenkins job 설정 화면 하단의 `Vault Plugin` 영역은 비워둔다. 현재 파이프라인은 Jenkins Vault Plugin 설정을 사용하지 않는다.

Jenkins가 사용하는 Vault AppRole `secret_id`는 운영 IaC 기준으로 만료 없이(`secret_id_ttl=0`) 관리한다. 따라서 30일 같은 주기 만료 때문에 다시 넣는 운영은 필요하지 않아야 한다. 다만 값이 노출됐거나 Vault AppRole을 재구성한 경우에는 새 `secret_id`를 발급해 Jenkins Credential 값을 갱신해야 한다.

## 9. Vault KV secret 준비

개발 배포용 환경변수는 Vault KV v2에 개별 key-value로 저장한다.

권장 경로는 아래와 같다.

```text
kv/bosspickseoul/backend/dev/env
```

Vault Web UI 기준 이동 경로는 아래와 같다.

```text
Secrets
-> kv
-> bosspickseoul
-> backend
-> dev
-> env
```

Jenkinsfile은 secret 전체를 읽은 뒤 `.env.runtime`으로 렌더링한다. 따라서 Jenkinsfile에 개별 환경변수 key 목록을 하드코딩하지 않는다.
또한 빌드/테스트 단계에서도 같은 Vault env를 주입하므로, Spring context 테스트와 런타임 시작에 필요한 `SPRING_PROFILES_ACTIVE`, `JASYPT_ENCRYPTOR_KEY`를 반드시 포함한다.

Vault key 이름은 Docker Compose env file 형식에 맞아야 한다.

```text
가능: DB_USERNAME, SERVICE_DISCOVERY_PORT_DEV
불가: db.username, SERVICE-DISCOVERY-PORT, 1_PORT
```

값에 줄바꿈이 들어가면 `.env.runtime`으로 만들 수 없으므로 Jenkinsfile에서 실패시킨다.

## 10. Vault policy

Jenkins AppRole에는 KV v2 data path 읽기 권한이 필요하다.

dev 권한 예시는 아래와 같다.

```hcl
path "kv/data/bosspickseoul/backend/dev/env" {
  capabilities = ["read"]
}

path "kv/metadata/bosspickseoul/backend/dev/env" {
  capabilities = ["read", "list"]
}
```

prod까지 사용할 경우 prod 경로도 추가한다.

```hcl
path "kv/data/bosspickseoul/backend/prod/env" {
  capabilities = ["read"]
}

path "kv/metadata/bosspickseoul/backend/prod/env" {
  capabilities = ["read", "list"]
}
```

## 11. Multibranch Pipeline 생성

서비스별로 Multibranch Pipeline job을 만든다.

```text
Jenkins
-> 새로운 Item
-> item name 입력
-> Multibranch Pipeline 선택
-> OK
```

서비스별 job 이름과 Script Path는 아래처럼 둔다.

| Jenkins Job 이름 | Script Path |
| --- | --- |
| `backend-service-discovery` | `Jenkinsfile-service-discovery` |
| `backend-api-gateway` | `Jenkinsfile-api-gateway` |
| `backend-auth-service` | `Jenkinsfile-auth-service` |
| `backend-commercial-service` | `Jenkinsfile-commercial-service` |
| `backend-district-service` | `Jenkinsfile-district-service` |
| `backend-community-service` | `Jenkinsfile-community-service` |
| `backend-ai-service` | `Jenkinsfile-ai-service` |
| `backend-batch-service` | `Jenkinsfile-batch-service` |

General 영역은 아래처럼 작성한다.

| 항목 | 값 |
| --- | --- |
| Display Name | job 이름과 동일 |
| Description | `{serviceName} 개발/운영 배포 Multibranch Pipeline` |
| Enabled | on |

Branch Sources 영역에서 `Add source -> GitHub`를 선택한다.

| 항목 | 값 |
| --- | --- |
| Credentials | `github-app-followfollowme-jenkins` |
| Owner | `8llow8llowMe` |
| Repository | `BossPickSeoul` |

Behaviors는 아래처럼 설정한다.

```text
Discover branches
-> Strategy: Exclude branches that are also filed as PRs
```

```text
Discover pull requests from origin
-> Strategy: Merging the pull request with the current target branch revision
```

fork PR을 받지 않는다면 `Discover pull requests from forks`는 추가하지 않는다.

서비스별 PR label로 해당 서비스 job만 실행하려면 `Github label filter` 플러그인을 설치한 뒤 아래 trait을 추가한다.

```text
Filter pull requests with any specified labels
```

서비스별 label은 아래처럼 맞춘다.

| Jenkins Job 이름 | GitHub PR label |
| --- | --- |
| `backend-service-discovery` | `backend-service-discovery` |
| `backend-api-gateway` | `backend-api-gateway` |
| `backend-auth-service` | `backend-auth-service` |
| `backend-commercial-service` | `backend-commercial-service` |
| `backend-district-service` | `backend-district-service` |
| `backend-community-service` | `backend-community-service` |
| `backend-ai-service` | `backend-ai-service` |
| `backend-batch-service` | `backend-batch-service` |

예를 들어 `backend-auth-service` job은 label filter에 아래 값을 넣는다.

```text
backend-auth-service
```

이렇게 설정하면 `feature/* -> develop` PR이 열려도 `backend-auth-service` label이 붙은 PR만 auth-service Multibranch job에서 discovery/build 대상이 된다.

개발 배포 job만 운영할 경우 branch 필터는 아래처럼 둔다.

```text
Filter by name with wildcards
Include: develop PR-*
Exclude: main
```

운영 배포까지 같은 job에서 처리할 경우 `main`도 포함한다.

```text
Filter by name with wildcards
Include: develop main PR-*
```

Build Configuration은 아래처럼 설정한다.

| 항목 | 값 |
| --- | --- |
| Mode | `by Jenkinsfile` |
| Script Path | 서비스별 Jenkinsfile 이름 |

예를 들어 district-service job은 아래처럼 둔다.

```text
Script Path: Jenkinsfile-district-service
```

Scan Multibranch Pipeline Triggers는 webhook 누락 대비용으로 켜둔다.

| 항목 | 값 |
| --- | --- |
| Periodically if not otherwise run | checked |
| Interval | `1 day` 또는 `1 hour` |

Orphaned Item Strategy는 오래된 PR/branch job 정리를 위해 설정한다.

| 항목 | 값 |
| --- | --- |
| Discard old items | checked |
| Days to keep old items | `30` |
| Max # of old items to keep | `20` |

하단 `Vault Plugin` 영역은 비워둔다.

## 12. 첫 실행 순서

처음에는 모든 서비스를 한 번에 만들지 말고 하나씩 확인한다.

1. `backend-service-discovery` Multibranch Pipeline을 만든다.
2. `Script Path`를 `Jenkinsfile-service-discovery`로 설정한다.
3. `Scan Multibranch Pipeline Now`를 실행한다.
4. `develop` 또는 `PR-*` job이 생성되는지 확인한다.
5. 첫 빌드가 `builder` agent에서 실행되는지 확인한다.
6. deploy stage가 `backend-dev-agent`에서 실행되는지 확인한다.
7. Vault 조회가 성공하는지 확인한다.
8. 개발 서버에서 `service-discovery-dev` 컨테이너가 실행 중인지 확인한다.
9. 같은 방식으로 나머지 서비스를 추가한다.

권장 개발 배포 순서는 아래와 같다.

1. `service-discovery`
2. `commercial-service`
3. `district-service`
4. `auth-service`
5. `community-service`
6. `ai-service`
7. `batch-service`
8. `api-gateway`

## 13. 수동 빌드 파라미터

Multibranch Pipeline의 하위 branch/PR job에서 `Build with Parameters`로 수동 실행할 수 있다.

개발 배포 확인 시 자주 쓰는 값은 아래와 같다.

| 파라미터 | 값 |
| --- | --- |
| `TARGET_BRANCH` | `develop` |
| `RUN_TESTS` | `true` |
| `SKIP_DEPLOY` | `false` |
| `VAULT_SECRET_PATH` | `kv/bosspickseoul/backend/dev/env` |
| `VAULT_ENGINE_VERSION` | `2` |
| `DEPLOY_LOCK_NAME` | `backend-1-deploy` |

`VAULT_SECRET_PATH`를 비워두면 Jenkinsfile은 아래 기본 경로를 사용한다.

```text
kv/${PROJECT_SLUG}/backend/${deployEnv}/env
```

기본값 기준 dev에서는 아래와 같다.

```text
kv/bosspickseoul/backend/dev/env
```

## 14. 개발 서버 확인 명령

backend deploy 서버에서 아래 명령으로 상태를 확인한다.

```bash
docker ps -a
```

서비스별 배포 디렉터리는 아래 규칙을 따른다.

```text
$HOME/deploy/bosspickseoul/backend/{cloud|service}/{serviceName}
```

district-service 예시는 아래와 같다.

```bash
cd "$HOME/deploy/bosspickseoul/backend/service/district-service"
test -s .env.runtime
docker compose --env-file .env.runtime -f docker-compose-district-service.yml config
docker compose -f docker-compose-district-service.yml ps district-service-dev
docker logs --tail 200 bosspickseoul-district-service-dev
```

## 15. 자주 발생한 문제

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| GitHub webhook이 `302`로 실패 | `/github-webhook`에서 `/github-webhook/`로 redirect | GitHub Payload URL 끝에 `/` 추가 |
| GitHub App credential Test 실패 | private key가 PKCS#8 형식이 아님 | `openssl pkcs8 -topk8 ... -nocrypt`로 변환 |
| `Couldn't authenticate with GitHub app ID` | App ID/key 불일치 또는 key 형식 오류 | App ID 확인, 새 private key 발급, PKCS#8 변환 |
| Multibranch scan에서 repo가 안 보임 | GitHub App이 repo에 설치되지 않음 | GitHub App `Install App`에서 `BossPickSeoul` 선택 |
| 빌드가 계속 대기 | Jenkins node label 불일치 | `builder`, `deploy-backend-dev`, `deploy-backend-prod` label 확인 |
| Vault 조회가 403 | AppRole policy 부족 | `kv/data/...`, `kv/metadata/...` 권한 추가 |
| `.env.runtime` 생성 실패 | Vault key 이름이 env var 형식이 아님 | `A-Z`, `0-9`, `_` 형식으로 key 수정 |
| `docker compose config` 실패 | Vault에 compose 필수 key 누락 | `.env.example` 기준으로 key 보강 |
| `SimplePBEConfig` NPE | Vault에 `JASYPT_ENCRYPTOR_KEY` 누락 또는 빈 값 | `kv/bosspickseoul/backend/dev/env`에 key 추가 |
| Jenkins 빌드 전 필수 key 누락 실패 | Vault에 `SPRING_PROFILES_ACTIVE` 또는 `JASYPT_ENCRYPTOR_KEY` 누락 | `.env.example` 기준으로 Vault key 보강 |
| 컨테이너가 바로 종료 | 애플리케이션 설정 또는 DB/Redis 연결 실패 | Jenkins 로그와 `docker logs --tail 200` 확인 |

## 16. 운영 원칙

개발 배포 agent도 executor는 `1`을 권장한다. 같은 Docker host에서 여러 compose 배포가 동시에 실행되면 이미지 빌드, 컨테이너 교체, 포트 바인딩, 네트워크 생성이 겹쳐 장애 분석이 어려워진다.

병렬성은 deploy agent executor를 늘리는 대신 아래처럼 분리한다.

```text
builder-agent: executors 2~4
backend-dev-agent: executors 1
backend-prod-agent: executors 1
frontend-dev-agent: executors 1
frontend-prod-agent: executors 1
```

같은 backend host에 대한 배포는 Jenkinsfile의 `lock(resource: 'backend-1-deploy')`로 직렬화한다.

## 17. 보안 체크리스트

배포 설정 후 아래 항목을 확인한다.

1. GitHub App private key가 채팅, 문서, 로그, screenshot에 노출되지 않았는지 확인한다.
2. 노출된 private key는 GitHub App에서 삭제하고 새로 발급한다.
3. Vault `role_id`, `secret_id`는 Jenkins Secret text에만 저장한다.
4. Vault secret 값은 Git에 커밋하지 않는다.
5. `.env.runtime`은 배포 서버에만 생성되며 파일 권한은 `600`으로 둔다.
6. Jenkins job의 `Vault Plugin` 필드는 비워두고, Jenkinsfile의 `withCredentials` credential ID를 사용한다.
7. GitHub webhook URL은 HTTPS와 trailing slash를 사용한다.
