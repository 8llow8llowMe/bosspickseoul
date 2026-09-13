---
project: nowdoboss
cwd: D:/ProjectWorkSpace/NowDoBoss-V2 (메인 워크트리 — 기기마다 경로 다름)
branch: develop
timestamp: 2026-09-13T17:41:26+0900
title: BE 열린 이슈 5건 병렬 분배 — 워크트리·브랜치·세션 프롬프트
files:
  - .worktrees/ai-wire-dto-commercial (refactor/be/ai-wire-dto-commercial)
  - .worktrees/ai-wire-dto-district (refactor/be/ai-wire-dto-district)
  - .worktrees/ai-wire-dto-administration (refactor/be/ai-wire-dto-administration)
  - .worktrees/ai-report-processor-prompt (test/be/ai-report-processor-prompt)
  - .worktrees/commercial-audit-unverified (fix/be/commercial-audit-unverified)
---

## 작업 주제: BE 열린 이슈를 5개 세션으로 병렬 분배

### 현재 상태 (2026-09-13 17:41 KST)

- 기준 커밋: `origin/develop` = **`0ef78ed8`**. 워크트리 전부 이 커밋에서 분기했다.
- BE 열린 이슈 6건 중 **5건이 코드 작업**, 1건(#106)은 배포/인프라만 남았다.
- **트랙 A~E 는 아직 착수 전(커밋 0개)이고, 뒤에 추가된 트랙 F 만 끝나 PR #392 로 올라가 있다.**
- 이 세션에서 새로 만든 이슈: #391(게이트웨이 테스트, 완료) · #393(배포 적용, 미착수)

### 트랙 배정

| 트랙 | 이슈 | 워크트리 | 브랜치 | 분류 |
| --- | --- | --- | --- | --- |
| A | #387 Commercial 7종 | `.worktrees/ai-wire-dto-commercial` | `refactor/be/ai-wire-dto-commercial` | REFACTOR |
| B | #388 District 16종 | `.worktrees/ai-wire-dto-district` | `refactor/be/ai-wire-dto-district` | REFACTOR |
| C | #389 Administration 8종 | `.worktrees/ai-wire-dto-administration` | `refactor/be/ai-wire-dto-administration` | REFACTOR |
| D | #390 AiReportProcessor 테스트 | `.worktrees/ai-report-processor-prompt` | `test/be/ai-report-processor-prompt` | FEATURE(테스트) |
| E | #369 감사 잔여 `[미확인]` | `.worktrees/commercial-audit-unverified` | `fix/be/commercial-audit-unverified` | BUG/조사 |
| F | #391 게이트웨이 JWT 경계 테스트 | `.worktrees/api-gateway-jwt-boundary` | `test/be/api-gateway-jwt-boundary` | **완료 — PR #392** |

트랙 F 는 이 문서를 쓴 뒤에 추가됐다. #106 이 "남은 과제"로 적어둔 미추적 항목
(security-core·api-gateway 테스트 0건) 중 게이트웨이 쪽을 떼어낸 것이고, **이미 끝나 PR #392 로 올라가 있다.**
`cloud/api-gateway` 만 건드려 A~E 와 파일이 겹치지 않는다.

---

## 병렬 안전성 — 왜 5개를 동시에 돌려도 되나

`dev-orchestrator` 규칙은 "공유 파일·공개 계약·DB 스키마를 고치는 쓰기 역할은 한 번에 하나"다.
확인 결과 **다섯 트랙은 파일이 겹치지 않는다.**

| 트랙 | 고치는 파일 |
| --- | --- |
| A | Commercial 5 + Regional 2 QueryResult, `CommercialAnalysisClientAdapter`, `RegionAnalysisClientAdapter`, `feign/dto/commercial/*`(기존 디렉터리에 추가), `feign/dto/regional/*`(신규) |
| B | District 16 QueryResult, `DistrictAnalysisClientAdapter`, `feign/dto/district/*`(신규) |
| C | Administration 8 QueryResult, `AdministrationAnalysisClientAdapter`, `feign/dto/administration/*`(신규) |
| D | `AiReportProcessorTest.java`(신규 파일 1개) |
| E | commercial-service 모듈 (ai-service 와 무관) |

**주의 하나** — A/B/C 는 `application/port/out/query/` 라는 **같은 디렉터리**의 서로 다른 파일을 고친다.
파일 단위로는 충돌하지 않지만, 저장소가 rebase merge 를 쓰므로 **먼저 머지된 쪽 다음에 오는 트랙은
`git rebase origin/develop` 을 한 번 하고 PR base 를 갱신**해야 한다.

**D 는 A 와 독립이다.** D 는 `QueryResult → CommercialAiSourceData → 프롬프트 문자열` 이음매를,
A 는 `peer 응답 → QueryResult` 이음매를 검증한다. 서로 다른 seam 이고 A 는 QueryResult 의
레코드 컴포넌트를 바꾸지 않는다(Jackson 어노테이션만 걷는다). 다만 **D 를 먼저 끝내면 A 의 안전망이
하나 더 생긴다** — 여유가 있으면 D 를 먼저 붙이는 편이 낫다.

---

## 확정된 사실 (착수 전 반드시 읽을 것)

### 1. 잔존 31종의 정확한 내역

`origin/develop`(`0ef78ed8`) 기준 `application/port/out/query/` 에서 `com.fasterxml.jackson` 을
import 하는 파일은 **정확히 31개**이고, 세 이슈의 합(7 + 16 + 8)과 일치한다.

```
Administration  8   ← #389
District       16   ← #388
Commercial      5   ┐
Regional        2   ┘ #387 (합 7종)
```

어노테이션은 31개 전부 `@JsonIgnoreProperties`, 그중 15개가 `@JsonProperty` 도 함께 쓴다.

> **함정**: 로컬 체크아웃이 `origin/develop` 보다 뒤처져 있으면 Commercial 잔존이 25종으로 보인다.
> PR #386 이 만든 `feign/dto/commercial/` 22개 파일이 없는 상태이기 때문이다.
> **착수 전 `git log -1` 로 `0ef78ed8` 이상인지 확인할 것.**

### 2. PR #386 이 확립한 패턴은 실재한다 — 그대로 복제하면 된다

`origin/develop` 에 이미 있다. 새로 설계하지 말고 이 모양을 따른다.

```
adapter/out/client/feign/dto/commercial/
  CommercialAnalysisWireMapper.java          ← wire → QueryResult 변환 모음
  Commercial*ClientResponse.java  (21개)     ← peer 응답 wire DTO
adapter/out/client/CommercialAnalysisWireGoldenJsonTest.java        ← 골든 JSON
adapter/out/client/feign/dto/commercial/CommercialAnalysisWireMapperTest.java  ← 리플렉션 전수 대조
application/service/prompt/CommercialResidentPopulationPromptChainTest.java    ← wire→프롬프트 관통
```

`coding-conventions.md` §12-1: Feign interface 는 `adapter/out/client/feign/` 의 `*Client`,
wire DTO 는 `adapter/out/client/feign/dto/<peer>/` 의 `*ClientResponse`.

### 3. #380 이 정한 3원칙 (A/B/C 공통)

1. **안전망 먼저.** peer 응답 전문(`Response` 봉투 포함) 리터럴 → 역직렬화 → 필드 단위 단언.
   값은 **필드마다 다르게** 넣어야 매핑 스왑이 잡힌다. 같은 값이면 대입이 뒤바뀌어도 통과한다.
2. **ObjectMapper 는 운영 빈을 꺼내 쓴다.** `ApplicationContextRunner` + `JacksonAutoConfiguration`.
   `Jackson2ObjectMapperBuilder.json().build()` 는 운영과 설정이 다르다.
3. **순수 리팩토링과 동작 변경을 다른 커밋으로 나눈다.**

### 4. 현재 값이 틀린 건은 0건이다

검토에서 "QueryResult 컴포넌트명이 peer 소스에 0건" 휴리스틱을 31종 전부에 적용한 결과 추가 결함은
없었다. **지금 깨져 있는 게 아니라, peer 가 리네임하면 예외 없이 `0`/`null` 이 되어 조용히 깨지는
구조를 고치는 작업이다.** 그래서 우선순위는 MEDIUM 이고, 안전망 없이 손대면 오히려 위험하다.

---

## 공통 규칙 (모든 트랙)

- 착수 전 `CLAUDE.md` → `backend/CLAUDE.md` → `backend/docs/` 순으로 읽는다.
- 커밋 제목 `[BE] <type>: <요약>`, 기능별로 나눈다. **rebase merge 라 브랜치 커밋이 그대로
  develop 에 올라간다** — `wip` 같은 커밋을 남기지 않는다.
- 모든 파일 **UTF-8 (no BOM)**.
- 검증은 `cd backend && ./gradlew :service:<모듈>:test` 로 시작해 마지막에 `./gradlew build`.
- PR 라벨 필수(`backend-ai-service` 등) — 배포 게이트가 라벨로 대상을 찾는다.
- **하위 에이전트의 "통과했다"를 그대로 옮기지 않는다.** 메인이 검증 명령을 한 번 더 돌린 결과로 보고한다.

---

## 남은 것 / 이 분배에 넣지 않은 것

- **#106** — 체크박스 6개 중 5개가 완료고, 남은 하나가 **배포 적용**이다. 코드 5개 항목이 실제로
  `develop` 에 들어가 있는지 확인했다(prod yml 8개 모듈, `ddl-auto: none`, `AI_012`/`AUTH_015`,
  moderation 라우트, 인덱스 런북 파일). 남은 배포 작업은 **코드 세션이 할 수 있는 일이 아니라**
  **#393 `[INFRA] chore:` 로 분리**했다. #106 자체를 닫을지는 사람 판단으로 남겨 뒀다.
- **#106 의 나머지 "남은 과제"** — 테스트 공백 중 게이트웨이 쪽은 #391/PR #392 로 처리했다.
  아직 이슈가 없는 항목: `core/security-core`(main 25, test 1), `core/persistence-core`(main 8, test 0),
  `core/redis-core`(main 4, test 0), `core/shared-commercial`(main 3, test 0),
  community 검색 full scan 의 ngram FULLTEXT 전환, Grafana 알람(Infra 레포).
  특히 security-core 는 게이트웨이(WebFlux)와 **같은 revocation 비교식을 서블릿 쪽에서 따로 구현**하고
  있어서, 두 판정이 어긋나면 무효화 시점이 갈린다.
- **#369 의 잉여 인덱스 항목** — 운영 DB `EXPLAIN` 확인 전에 DROP 하지 않기로 이슈에 명시돼 있다.
  트랙 E 는 코드로 확정 가능한 `[미확인]` 항목만 다룬다.
- **#371 #375 #382 #349 #316** — FE 이슈라 이번 분배에서 제외했다.
