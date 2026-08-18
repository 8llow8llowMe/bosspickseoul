# 프론트 배포 런북

BossPickSeoul 프론트(Next.js SSR)를 Jenkins 로 배포하는 절차와 규칙.

관련 파일

- `Jenkinsfile-frontend-web` (레포 루트) — 잡 정의
- `Jenkinsfile.frontend-common.groovy` (레포 루트) — 공통 파이프라인
- `frontend/frontend-web.Dockerfile`, `frontend/docker-compose-frontend-web.yml`
- `frontend/.env.example` — Vault key 목록의 기준
- Infra 레포 `nginx/conf.d/bosspickseoul.conf`, `nginx/conf.d/dev.bosspickseoul.conf`

---

## 1. 배치

| 환경 | 브랜치 | 호스트 | 호스트 포트 | 도메인 |
| --- | --- | --- | --- | --- |
| dev | `develop` | main-server `192.168.0.11` | 6300 | `https://dev.bosspickseoul.com` |
| prod | `main` | backend-1 `192.168.0.13` | 9300 | `https://www.bosspickseoul.com` |

dev 를 main-server 에 둔 이유는 dev 백엔드·dev MySQL·`backend-dev-agent` 가 이미 그 호스트에 있어서다.
prod 를 backend-1 에 둔 이유는 prod 백엔드의 지정석이 그 호스트이고(`api.bosspickseoul.conf` 가 `192.168.0.13` 을 본다) 실여유 메모리가 가장 크기 때문이다.

**storage(`192.168.0.12`)에는 올리지 않는다.** 총 메모리 1.9GB / swap 0 인 호스트에 nginx·MinIO·redis-node3 가 함께 있다. 여기서 OOM 이 나면 전 도메인의 인그레스가 함께 죽는다.

포트 대역은 백엔드 규칙을 따른다 — dev 는 `6xxx`, BossPickSeoul prod 는 `9xxx`, tripmarble prod 는 `8xxx`.

---

## 2. 배포가 일어나는 시점

백엔드와 동일하다.

- **PR 빌드는 배포하지 않는다.** 빌드와 검사(format/lint/typecheck/test)만 한다.
- **PR 이 머지된 뒤** 대상 브랜치 빌드에서만 배포한다. `develop` 머지 → dev, `main` 머지 → prod.
- 배포 대상은 **PR 라벨**로 지정한다. 라벨이 없으면 배포하지 않는다(fail-closed).

| 라벨 | 효과 |
| --- | --- |
| `frontend-web` | 이 잡을 배포 대상으로 지정 |

라벨을 빠뜨리고 머지했다면 잡을 수동 실행하면서 **`FORCE_DEPLOY` 를 체크**한다. 변경 감지와 라벨 게이트를 함께 우회한다. (같은 커밋 재빌드는 변경 파일이 0건이라 라벨만 우회해서는 여전히 생략된다)

> `FORCE_DEPLOY` 파라미터가 잡 화면에 보이지 않는다면 아직 등록 전이다. Jenkins 는 파라미터를 **정의한 빌드가 끝난 뒤**에 등록하므로, 한 번 그냥 돌리고 나면 다음 실행부터 나타난다.

---

## 3. 환경변수 — 주입 시점이 둘로 나뉜다

이걸 헷갈리면 배포가 조용히 잘못된다.

| 시점 | 대상 | 경로 |
| --- | --- | --- |
| **빌드** | `NEXT_PUBLIC_*` | Vault → Jenkins 빌드 단계 env → `next build` 가 코드에 문자열로 인라인 |
| **런타임** | 그 외 전부 | Vault → `.env.runtime` → compose `environment` |

`NEXT_PUBLIC_*` 를 compose 에 넣어봐야 **무시된다.** 이미 번들에 박혀 있기 때문이다. 그래서 dev 와 prod 는 같은 커밋이어도 서로 다른 산출물이 나오며, 파이프라인이 환경별로 따로 빌드한다.

### Vault 경로

```
kv/bosspickseoul/frontend/dev/env
kv/bosspickseoul/frontend/prod/env
```

key 목록은 `frontend/.env.example` 이 기준이다. 코드에서 새 env 를 읽기 시작하면 그 파일과 Vault 를 함께 갱신한다. Vault 쪽 정리는 Infra 레포 `vault/README.md` 에도 같은 표가 있다.

파이프라인이 없으면 즉시 실패시키는 key:

- 빌드 단계 — `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`
- 배포 단계 — `TIME_ZONE`, `AUTH_SESSION_SECRET`, `BACKEND_API_URL`, 그리고 배포 환경의 포트 하나 (dev 면 `FRONTEND_WEB_PORT_DEV`, prod 면 `FRONTEND_WEB_PORT_PROD`)

포트는 그 환경에 해당하는 것만 Vault 에 넣으면 된다. compose 파일 하나에 dev/prod 서비스가 같이 정의되어 있어 `docker compose config` 가 배포하지 않는 쪽까지 해석하지만, 양쪽 다 기본값(`:-6300` / `:-9300`)을 갖고 있어 반대편 값이 없어도 된다. 기본값이 실제 배포 포트를 조용히 대체하는 일은 없다 — 배포하는 환경의 포트는 파이프라인의 `Runtime env key check` 가 없으면 배포를 중단시킨다.

### `AUTH_SESSION_SECRET` 은 배포마다 만드는 값이 아니다

**환경당 한 번 만들고 고정한다.** 이 값은 세션 쿠키의 A256GCM 암호화 키(SHA-256 해시)다 — `src/lib/auth/session.ts` 가 `accessToken` / `refreshToken` / `memberId` 를 이걸로 암호화해 쿠키에 담는다.

배포 때마다 새로 만들면 기존 쿠키를 복호화할 수 없어 **로그인한 사용자가 전원 로그아웃**된다. 유출됐을 때만 의도적으로 교체하고, 그때도 "전원 로그아웃되는 작업"으로 다룬다. dev 와 prod 는 서로 다른 값을 쓴다(한쪽이 유출돼도 다른 환경 세션이 뚫리지 않게).

32자 이상이어야 한다. 짧으면 컨테이너는 뜨지만 세션을 다루는 첫 요청에서 예외가 난다. 생성: `openssl rand -base64 48`

### Vault 에 넣지 않는 것

| key | 이유 |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | 브라우저 REST 호출은 same-origin `/api/bff` 로 나가고(`src/lib/api/client.ts`) 백엔드 주소는 서버 쪽 `BACKEND_API_URL` 만 안다. 번들에 넣을 이유가 없다. |
| `NEXT_PUBLIC_KAKAOMAP_API_KEY` | 카카오는 지도 SDK 와 공유 SDK 가 같은 JavaScript 키 하나를 쓴다. `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY` 로 통합했다. |
| `NEXT_PUBLIC_FIREBASE_*` | FCM 웹 푸시(채팅 알림)용. 넷(`API_KEY`/`MESSAGING_SENDER_ID`/`APP_ID`/`VAPID_KEY`)이 모두 있어야 켜지고, 하나라도 비면 `src/lib/firebase-messaging.ts` 가 스스로 비활성화한다. 푸시를 쓰기로 정할 때 넣는다. |
| `BOSSPICK_API_DOCS_URL` | 로컬에서 OpenAPI 문서를 받아오는 스크립트 전용. |

### `BACKEND_API_URL` 은 공개 도메인을 쓴다

dev 프론트와 dev 게이트웨이가 둘 다 `192.168.0.11` 이라 `http://192.168.0.11:6000` 으로 질러도 될 것 같지만, **auth API(`/api/v1/auth`, `/api/v1/members`)는 게이트웨이를 거치지 않고 auth-service(6081)로 직결**된다. 그 분기를 nginx 가 하므로 공개 도메인을 통과해야 한다. SSR 요청이 `.11 → .12(nginx) → .11` 로 한 바퀴 도는 건 맞지만 라우팅 정합성이 우선이다.

---

## 4. 최초 1회 준비 작업

파이프라인만으로는 배포되지 않는다. 아래가 선행되어야 한다.

### 4.1 Jenkins 노드

| 노드 | 서버 | 라벨 | 상태 |
| --- | --- | --- | --- |
| `jenkins-builder-agent` | ollama-01 `192.168.0.10` | `builder-frontend` **추가 필요** | 컨테이너는 기동 중 |
| `frontend-dev-agent` | main-server `192.168.0.11` | `deploy-frontend-dev` | **추가 필요** |
| `frontend-prod-agent` | backend-1 `192.168.0.13` | `deploy-frontend-prod` | **추가 필요** |

빌드용 노드는 새로 만들지 않는다. `jenkins-builder-agent` 이미지에 이미 Node 22 와 pnpm 이 들어 있으므로 Jenkins UI 에서 라벨에 `builder-frontend` 만 추가하면 된다.

배포 agent 는 Infra 레포 `jenkins/docker-compose-jenkins-deploy-agent.yml` 로 띄운다. 같은 호스트에 여러 agent 를 둘 때는 `.env` 에서 `JENKINS_DEPLOY_AGENT_NAME` / `PROJECT_NAME` / `CONTAINER_NAME` / `WORKDIR` 를 모두 다르게 준다.

### 4.2 멀티브랜치 파이프라인 잡

- 잡 이름: `bosspickseoul-frontend-web`
- Script Path: `Jenkinsfile-frontend-web`
- Branch Sources: 백엔드 잡과 동일한 GitHub App credential (`github-app-followfollowme-jenkins`)
- Lockable Resource `frontend-deploy` 를 등록한다. (백엔드의 `backend-1-deploy` 와 별개다)

### 4.3 DNS + 인증서 + nginx

1. `dev.bosspickseoul.com` A/AAAA → 공개 nginx 호스트
2. `nginx/conf.d/dev.bosspickseoul.conf` 를 배치하고 reload — 이 시점에는 HTTPS 블록이 **주석 상태**여야 한다. 인증서 파일이 없으면 nginx 가 기동조차 못 하고 전 도메인이 함께 내려간다.
3. `cd ~/infra/certbot && ./init-cert-non-www.sh dev.bosspickseoul.com`
4. HTTPS 블록 주석을 풀고 `nginx -t && nginx -s reload`

prod 는 `bosspickseoul.com` 인증서가 이미 있으므로 `bosspickseoul.conf` 반영 + reload 만 하면 된다.

---

## 5. 아키텍처 주의 (빌더 x86_64 ↔ 배포 대상 aarch64)

빌더가 도는 ollama-01 은 x86_64(Ryzen 7 8845HS)이고, main-server / backend-1 / storage 는 모두 aarch64(라즈베리파이)다. 백엔드는 JAR 이라 무관하지만 프론트는 빌더에서 만든 `.next/standalone` 을 arm64 호스트에서 그대로 실행한다.

그래서 두 가지를 해뒀다.

- `next.config.ts` 에서 **이미지 최적화를 끄고**(`images.unoptimized`) **sharp 를 추적에서 제외**했다. sharp 는 플랫폼별 네이티브 바이너리이고 Next 의 optional dependency 라 그냥 두면 x86 바이너리가 번들에 들어간다. 라즈베리파이에서 온디맨드 리사이즈를 돌릴 CPU 여유도 없다.
- 파이프라인이 빌드 후 번들에서 `*.node` 를 찾는다. 하나라도 나오면 빌드를 **UNSTABLE** 로 표시한다.

그 경고가 뜨면 둘 중 하나다 — 새로 들어온 의존성을 `outputFileTracingExcludes` 로 빼거나, `builder-frontend` 라벨을 arm64 노드로 옮긴다.

---

## 6. 배포 실패 시 확인 순서

파이프라인은 2단계로 검증한다. 어디서 멈췄는지가 곧 원인이다.

| 증상 | 원인 후보 |
| --- | --- |
| `standalone 산출물이 없습니다` | `next.config.ts` 의 `output: 'standalone'` 이 빠졌다 |
| 컨테이너가 `exited` | 로그 확인. `AUTH_SESSION_SECRET` 미설정, 포트 충돌, 네이티브 모듈 로드 실패 순으로 흔하다 |
| `running` 인데 HTTP 응답 없음 | `HOSTNAME=0.0.0.0` 이 안 잡혔거나 서버가 기동 중 예외로 멈춰 있다 |
| `Runtime env key check` 에서 `<missing>` | Vault 해당 환경 경로에 key 가 없다 |
| 라벨 확인 실패(UNSTABLE) | `GITHUB_APP_CREDENTIAL_ID` 오설정. 배포는 막히고 빌드만 UNSTABLE 로 남는다 |

수동 확인:

```bash
# 배포 호스트에서
docker logs --tail 200 bosspickseoul-frontend-web-dev
docker exec bosspickseoul-frontend-web-dev node -e "fetch('http://127.0.0.1:3000/').then(r=>console.log(r.status))"
```

### 로컬(Windows)에서 `pnpm build` 가 종료 코드 3221225477 로 죽는 경우

`3221225477`(0xC0000005)은 접근 위반이다. `Collecting page data using 27 workers` 단계에서 워커를 CPU 코어 수만큼 띄우다 터지는 것으로, 코드 문제가 아니다. 워커 수를 줄이면 통과한다.

```ts
// next.config.ts 에 임시로 추가했다가 확인 후 제거
experimental: { cpus: 2 },
```

Linux 빌더에서는 재현되지 않았으므로 이 설정을 커밋하지 않는다. 커밋하면 CI 빌드가 불필요하게 느려진다.

---

## 7. 알아둘 차이

- 배포된 dev 서버는 `NODE_ENV=production` 으로 돈다. `next build` 산출물을 실행하는 것이라 다른 선택지가 없다. 따라서 `?mock=1` 같은 **비프로덕션 전용 우회는 배포된 dev 에서 동작하지 않는다.** 그건 로컬 `pnpm dev` 에서만 쓴다.
- 세션 쿠키의 `secure` 플래그도 같은 이유로 dev/prod 모두 켜진다. 두 환경 다 HTTPS 로 서비스되므로 정상이다.
- 배포는 디렉터리를 통째로 지우고 다시 푼다. 삭제된 정적 파일이 계속 서빙되는 것을 막기 위해서다. 배포 디렉터리에 사람이 만든 파일을 두면 안 된다.
