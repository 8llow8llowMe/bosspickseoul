# Jenkins Node Label and Job Design

이 문서는 BossPickSeoul CI/CD에서 GitHub 라벨, Jenkins job, Jenkins node label을 어떻게 나눠서 설계할지 정리합니다.

핵심 구분:

- GitHub PR 라벨: 어떤 서비스 job을 실행할지 결정합니다.
- Jenkins node label: 해당 job의 build/deploy stage를 어느 Jenkins agent에서 실행할지 결정합니다.

## 전체 흐름

```text
GitHub PR merge
-> GitHub label 확인
-> 대상 Jenkins job 실행
-> build stage는 builder agent에서 실행
-> deploy stage는 대상 deploy agent에서 실행
-> Vault env 주입
-> Docker Compose 또는 Next.js 배포
```

## 라벨 개념 구분

| 구분 | GitHub 라벨 | Jenkins node label |
| --- | --- | --- |
| 목적 | 실행할 서비스/job 선택 | 실행할 agent/서버 선택 |
| 붙는 위치 | GitHub PR 또는 issue | Jenkins node/agent |
| 예시 | `backend-district-service` | `deploy-backend-dev` |
| 사용 시점 | webhook 이벤트 처리 시점 | Jenkinsfile의 `node('...')` 실행 시점 |
| 의미 | 이 서비스 파이프라인을 실행한다 | 이 서버/agent에서 stage를 실행한다 |

## Jenkins 노드/라벨 설계표

초기에는 실제 서버 수보다 역할 경계를 기준으로 라벨을 잡는 것을 추천합니다.

| Jenkins node name | 실제 위치 | Jenkins node label | 주 역할 | 필요 도구 |
| --- | --- | --- | --- | --- |
| `jenkins-controller` | `192.168.0.10` | controller 전용 | webhook 수신, job orchestration, credential 관리 | Jenkins, Vault plugin |
| `backend-builder-agent` | Jenkins 서버 또는 build 전용 서버 | `builder`, `builder-backend` | 백엔드 Gradle test/build | JDK 21, Gradle wrapper, Docker CLI |
| `frontend-builder-agent` | Jenkins 서버 또는 build 전용 서버 | `builder`, `builder-frontend` | 프론트 install/lint/build | Node.js, pnpm 또는 npm, Docker CLI |
| `backend-dev-deploy-agent` | 백엔드 dev 배포 서버 | `deploy-backend`, `deploy-backend-dev` | 백엔드 dev 컨테이너 배포 | Docker, Docker Compose, rsync |
| `backend-prod-deploy-agent` | 백엔드 prod 배포 서버 | `deploy-backend`, `deploy-backend-prod` | 백엔드 prod 컨테이너 배포 | Docker, Docker Compose, rsync |
| `frontend-dev-deploy-agent` | 프론트 dev 배포 서버 | `deploy-frontend`, `deploy-frontend-dev` | 프론트 dev 배포 | Docker Compose 또는 Node runtime, reverse proxy |
| `frontend-prod-deploy-agent` | 프론트 prod 배포 서버 | `deploy-frontend`, `deploy-frontend-prod` | 프론트 prod 배포 | Docker Compose 또는 Node runtime, reverse proxy |
| `k8s-dev-deploy-agent` | 추후 Kubernetes 접근 가능한 배포 노드 | `deploy-k8s`, `deploy-k8s-dev` | dev cluster 배포 | kubectl, Helm, kubeconfig |
| `k8s-prod-deploy-agent` | 추후 Kubernetes 접근 가능한 배포 노드 | `deploy-k8s`, `deploy-k8s-prod` | prod cluster 배포 | kubectl, Helm, kubeconfig |

## 현재 권장 최소 구성

처음부터 모든 agent를 만들 필요는 없습니다. 지금은 아래 정도면 충분합니다.

| 우선순위 | node | labels | 비고 |
| --- | --- | --- | --- |
| 1 | `backend-builder-agent` | `builder`, `builder-backend` | 이미 있는 builder agent에 라벨만 맞춰도 됩니다. |
| 2 | `backend-dev-deploy-agent` | `deploy-backend`, `deploy-backend-dev` | 백엔드 dev 서버에 붙입니다. |
| 3 | `frontend-builder-agent` | `builder`, `builder-frontend` | 프론트 빌드가 생기면 추가합니다. |
| 4 | `frontend-dev-deploy-agent` | `deploy-frontend`, `deploy-frontend-dev` | 프론트 dev 서버에 붙입니다. |
| 5 | prod deploy agents | `deploy-backend-prod`, `deploy-frontend-prod` | 운영 배포 전 dev와 분리합니다. |

## GitHub 라벨 설계표

GitHub 라벨은 서비스 단위로 가져가는 것이 좋습니다.

| GitHub label | 대상 영역 | 실행 job |
| --- | --- | --- |
| `backend-service-discovery` | backend cloud | `backend/service-discovery` |
| `backend-api-gateway` | backend cloud | `backend/api-gateway` |
| `backend-auth-service` | backend service | `backend/auth-service` |
| `backend-district-service` | backend service | `backend/district-service` |
| `backend-commercial-service` | backend service | `backend/commercial-service` |
| `backend-community-service` | backend service | `backend/community-service` |
| `backend-ai-service` | backend service | `backend/ai-service` |
| `backend-batch-service` | backend service | `backend/batch-service` |
| `backend-core` | backend shared modules | affected backend service jobs 또는 backend 전체 검증 |
| `frontend-web` | frontend | `frontend/web` |
| `infra-jenkins` | infra | Jenkins config validation |
| `infra-deploy` | infra | deployment script/config validation |

## Backend Job 목록 초안

현재 저장소에 있는 Jenkinsfile 기준으로 바로 가져갈 수 있는 job 초안입니다.

| Jenkins job name | Jenkinsfile | GitHub label | build node label | deploy node label dev | deploy node label prod |
| --- | --- | --- | --- | --- | --- |
| `backend/service-discovery` | `Jenkinsfile-service-discovery` | `backend-service-discovery` | `builder-backend` | `deploy-backend-dev` | `deploy-backend-prod` |
| `backend/api-gateway` | `Jenkinsfile-api-gateway` | `backend-api-gateway` | `builder-backend` | `deploy-backend-dev` | `deploy-backend-prod` |
| `backend/auth-service` | `Jenkinsfile-auth-service` | `backend-auth-service` | `builder-backend` | `deploy-backend-dev` | `deploy-backend-prod` |
| `backend/district-service` | `Jenkinsfile-district-service` | `backend-district-service` | `builder-backend` | `deploy-backend-dev` | `deploy-backend-prod` |
| `backend/commercial-service` | `Jenkinsfile-commercial-service` | `backend-commercial-service` | `builder-backend` | `deploy-backend-dev` | `deploy-backend-prod` |
| `backend/community-service` | `Jenkinsfile-community-service` | `backend-community-service` | `builder-backend` | `deploy-backend-dev` | `deploy-backend-prod` |
| `backend/ai-service` | `Jenkinsfile-ai-service` | `backend-ai-service` | `builder-backend` | `deploy-backend-dev` | `deploy-backend-prod` |
| `backend/batch-service` | `Jenkinsfile-batch-service` | `backend-batch-service` | `builder-backend` | `deploy-backend-dev` | `deploy-backend-prod` |

## Frontend Job 목록 초안

프론트 저장소/폴더명이 확정되면 job name과 Jenkinsfile 이름은 맞춰 조정합니다. Next.js 기준 초안은 아래처럼 잡는 것이 좋습니다.

| Jenkins job name | Jenkinsfile | GitHub label | build node label | deploy node label dev | deploy node label prod |
| --- | --- | --- | --- | --- | --- |
| `frontend/web` | `Jenkinsfile-frontend-web` | `frontend-web` | `builder-frontend` | `deploy-frontend-dev` | `deploy-frontend-prod` |

프론트 배포 방식은 둘 중 하나로 정하면 됩니다.

| 방식 | 설명 | 추천 시점 |
| --- | --- | --- |
| Docker Compose 배포 | Next.js 앱을 이미지로 빌드하고 프론트 서버에서 compose로 실행 | 백엔드와 운영 방식을 맞추고 싶을 때 |
| standalone 배포 | `next build`의 standalone 산출물을 서버에 rsync하고 Node 프로세스로 실행 | 이미지 레지스트리 없이 단순하게 시작할 때 |

처음에는 Docker Compose 방식이 백엔드와 운영 감각이 비슷해서 관리하기 쉽습니다.

## Branch와 환경 매핑

현재 백엔드 공통 Jenkinsfile 기준으로 아래 규칙을 사용합니다.

| branch | deploy env | Vault secret path 예시 | deploy node label |
| --- | --- | --- | --- |
| `develop` | `dev` | `kv/bosspickseoul/backend/dev/env` | `deploy-backend-dev` |
| `main` | `prod` | `kv/bosspickseoul/backend/prod/env` | `deploy-backend-prod` |
| 그 외 | `none` | 없음 | 배포 생략 |

프론트도 같은 규칙을 추천합니다.

| branch | deploy env | Vault secret path 예시 | deploy node label |
| --- | --- | --- | --- |
| `develop` | `dev` | `kv/bosspickseoul/frontend/dev/env` | `deploy-frontend-dev` |
| `main` | `prod` | `kv/bosspickseoul/frontend/prod/env` | `deploy-frontend-prod` |

## Job 실행 정책 초안

| 이벤트 | 조건 | 실행 |
| --- | --- | --- |
| PR opened/synchronize to `develop` | GitHub label 있음 | 해당 label의 service job build/test 후 dev 배포 |
| PR merged to `develop` | GitHub label 있음 | 해당 service job build/test 후 dev 배포 |
| PR opened/synchronize to `main` | GitHub label 있음 | 해당 label의 service job build/test, prod 배포 생략 |
| PR merged to `main` | GitHub label 있음 | 해당 service job build/test 후 prod 배포 |
| `backend-core` label | 공통 모듈 영향 | backend 전체 build/test 또는 affected service job 실행 |
| label 없음 | 변경 범위 불명확 | 수동 승인 또는 전체 검증 job 실행 |

## Jenkins Folder 구조 초안

Jenkins UI에서는 아래처럼 folder를 나누면 보기 좋습니다.

```text
BossPickSeoul
├─ backend
│  ├─ service-discovery
│  ├─ api-gateway
│  ├─ auth-service
│  ├─ district-service
│  ├─ commercial-service
│  ├─ community-service
│  ├─ ai-service
│  └─ batch-service
├─ frontend
│  └─ web
└─ infra
   ├─ jenkins-config
   └─ deploy-config
```

## 권장 적용 순서

1. Jenkins controller는 `192.168.0.10` 하나만 기준으로 둡니다.
2. 기존 builder agent에 `builder`, `builder-backend` 라벨을 붙입니다.
3. 백엔드 dev 배포 서버에 `deploy-backend`, `deploy-backend-dev` 라벨을 가진 agent를 붙입니다.
4. GitHub 라벨과 backend job 매핑을 먼저 연결합니다.
5. `district-service` 하나로 develop merge -> dev 배포를 검증합니다.
6. 나머지 backend service job에 같은 패턴을 확장합니다.
7. 프론트 서버가 준비되면 `builder-frontend`, `deploy-frontend-dev`를 추가합니다.
8. 운영 배포 전 `deploy-backend-prod`, `deploy-frontend-prod`를 dev와 분리합니다.

## Kubernetes 전환 시 변경점

Kubernetes를 도입하면 deploy agent 기준이 서버에서 클러스터로 바뀝니다.

| 현재 | Kubernetes 전환 후 |
| --- | --- |
| `deploy-backend-dev` | `deploy-k8s-dev` |
| `deploy-frontend-dev` | `deploy-k8s-dev` |
| `deploy-backend-prod` | `deploy-k8s-prod` |
| `deploy-frontend-prod` | `deploy-k8s-prod` |

이때 backend/frontend 구분은 node label보다 namespace, Helm chart, application name으로 나누는 쪽이 자연스럽습니다.

## 최종 추천

지금은 GitHub 라벨과 Jenkins node label을 함께 사용합니다.

| 역할 | 사용할 라벨 |
| --- | --- |
| 어떤 서비스 job을 실행할지 결정 | GitHub label |
| build stage 실행 위치 결정 | `builder-backend`, `builder-frontend` |
| dev 배포 위치 결정 | `deploy-backend-dev`, `deploy-frontend-dev` |
| prod 배포 위치 결정 | `deploy-backend-prod`, `deploy-frontend-prod` |

이 구조를 잡아두면 VM 기반 Docker Compose 배포에서 시작해도, 나중에 Kubernetes로 옮길 때 라벨/권한/환경 경계를 크게 다시 만들 필요가 없습니다.
