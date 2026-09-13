---
project: nowdoboss
cwd: D:/ProjectWorkSpace/NowDoBoss-V2
branch: develop
timestamp: 2026-09-13T17:41:26+0900
title: BE 병렬 세션 프롬프트 5종 — 그대로 복사해 새 세션에 붙여넣는다
files:
  - docs/handoffs/2026-09-13-174126-be-open-issues-parallel-split.md (배경·병렬 안전성 근거)
---

## 쓰는 법

각 트랙마다 **새 세션**을 열고 해당 프롬프트를 통째로 붙여넣는다.
`cd` 경로는 기기마다 다르므로 자기 저장소 루트에 맞게 바꾼다.

배경과 병렬 안전성 근거는 `2026-09-13-174126-be-open-issues-parallel-split.md` 에 있다.
각 프롬프트가 그 문서를 먼저 읽게 되어 있다.

---

## 트랙 A — #387 Commercial 7종

```
D:/ProjectWorkSpace/NowDoBoss-V2/.worktrees/ai-wire-dto-commercial 에서 작업해줘.
브랜치는 refactor/be/ai-wire-dto-commercial 이고 origin/develop(0ef78ed8)에서 땄어.

GitHub 이슈 #387 을 처리해줘. gh issue view 387 로 본문을 먼저 읽고,
docs/handoffs/2026-09-13-174126-be-open-issues-parallel-split.md 도 읽어줘.

대상 7종 (application/port/out/query/):
  CommercialStoreAnalysisQueryResult    CommercialSalesSummaryQueryResult
  CommercialIncomeSummaryQueryResult    CommercialPeerStoreQueryResult
  CommercialAdministrationQueryResult   RegionalSalesSummaryQueryResult
  RegionalIncomeSummaryQueryResult

PR #386 이 이미 확립한 패턴을 그대로 복제해줘. 새로 설계하지 마.
  adapter/out/client/feign/dto/commercial/CommercialAnalysisWireMapper.java
  adapter/out/client/feign/dto/commercial/*ClientResponse.java
  adapter/out/client/CommercialAnalysisWireGoldenJsonTest.java
  adapter/out/client/feign/dto/commercial/CommercialAnalysisWireMapperTest.java

순서를 지켜줘:
1. 먼저 안전망. peer 응답 전문(Response 봉투 포함) 리터럴 → 역직렬화 → 필드 단위 단언.
   값은 반드시 필드마다 다르게 — 같은 값이면 대입이 뒤바뀌어도 통과해서 의미가 없어.
   ObjectMapper 는 ApplicationContextRunner + JacksonAutoConfiguration 으로 운영 빈을 꺼내 써.
2. 그다음 wire DTO 추가 + ClientAdapter 에서 wire → QueryResult 변환.
3. QueryResult 에서 com.fasterxml.jackson import 제거.
4. 순수 리팩토링 커밋과 동작 변경 커밋을 분리.

Regional 2종은 CommercialAnalysisClientAdapter 가 아니라 RegionAnalysisClientAdapter 를 타.
wire DTO 는 feign/dto/regional/ 에 새로 만드는 게 맞는지 먼저 확인하고 알려줘.

주의: 지금 값이 틀린 건은 0건이야. 동작을 바꾸는 게 아니라 peer 리네임 시 조용히 0/null 이
되는 구조를 끊는 작업이니까, 안전망 없이 손대면 오히려 위험해.

검증: cd backend && ./gradlew :service:ai-service:test 로 시작해서 마지막에 ./gradlew build.
끝나면 /pr 로 PR 본문 만들어주고 라벨 backend-ai-service 붙여줘. 커밋은 [BE] refactor: 로.
```

---

## 트랙 B — #388 District 16종

```
D:/ProjectWorkSpace/NowDoBoss-V2/.worktrees/ai-wire-dto-district 에서 작업해줘.
브랜치는 refactor/be/ai-wire-dto-district 이고 origin/develop(0ef78ed8)에서 땄어.

GitHub 이슈 #388 을 처리해줘. gh issue view 388 로 본문을 먼저 읽고,
docs/handoffs/2026-09-13-174126-be-open-issues-parallel-split.md 도 읽어줘.

대상 16종 (application/port/out/query/, 전부 District 접두사):
  AgeGroupFootTraffic  Area  ChangeIndicator  ClosedStoreAdministrationTop
  DayOfWeekFootTraffic  Detail  FootTrafficDetail  GenderFootTraffic
  OpenedStoreAdministrationTop  PeriodFootTraffic  SalesAdministrationTop
  SalesDetail  SalesServiceTop  StoreDetail  StoreServiceTop  TimeSlotFootTraffic
  (각각 District*QueryResult)

PR #386 이 feign/dto/commercial/ 에 만든 패턴을 그대로 복제하되 feign/dto/district/ 에 만들어줘.
DistrictAnalysisClientAdapter 에서 wire → QueryResult 변환을 해.

순서를 지켜줘:
1. 먼저 안전망. peer 응답 전문(Response 봉투 포함) 리터럴 → 역직렬화 → 필드 단위 단언.
   값은 반드시 필드마다 다르게 — 같은 값이면 대입이 뒤바뀌어도 통과해서 의미가 없어.
   ObjectMapper 는 ApplicationContextRunner + JacksonAutoConfiguration 으로 운영 빈을 꺼내 써.
2. 그다음 wire DTO 16개 + 매퍼.
3. QueryResult 에서 com.fasterxml.jackson import 제거.
4. 순수 리팩토링 커밋과 동작 변경 커밋을 분리.

16종이라 제일 크다. 커밋을 의미 단위로 쪼개줘 (안전망 / wire DTO / 매퍼 / import 제거).

주의: 지금 값이 틀린 건은 0건이야. DistrictDetailQueryResult(changeIndicator, footTraffic,
store, sales) ↔ DistrictDetailResponse 가 1:1 인 것도 확인됐어. 동작 바꾸지 말고 구조만 끊어줘.

검증: cd backend && ./gradlew :service:ai-service:test 로 시작해서 마지막에 ./gradlew build.
끝나면 /pr 로 PR 본문 만들어주고 라벨 backend-ai-service 붙여줘. 커밋은 [BE] refactor: 로.
```

---

## 트랙 C — #389 Administration 8종

```
D:/ProjectWorkSpace/NowDoBoss-V2/.worktrees/ai-wire-dto-administration 에서 작업해줘.
브랜치는 refactor/be/ai-wire-dto-administration 이고 origin/develop(0ef78ed8)에서 땄어.

GitHub 이슈 #389 를 처리해줘. gh issue view 389 로 본문을 먼저 읽고,
docs/handoffs/2026-09-13-174126-be-open-issues-parallel-split.md 도 읽어줘.

대상 8종 (application/port/out/query/, 전부 Administration 접두사):
  Commercial  Detail  District  IncomeDetail
  SalesDetail  SalesServiceTop  StoreDetail  StoreServiceTop
  (각각 Administration*QueryResult)

PR #386 이 feign/dto/commercial/ 에 만든 패턴을 그대로 복제하되 feign/dto/administration/ 에
만들어줘. AdministrationAnalysisClientAdapter 에서 wire → QueryResult 변환을 해.

순서를 지켜줘:
1. 먼저 안전망. peer 응답 전문(Response 봉투 포함) 리터럴 → 역직렬화 → 필드 단위 단언.
   값은 반드시 필드마다 다르게 — 같은 값이면 대입이 뒤바뀌어도 통과해서 의미가 없어.
   ObjectMapper 는 ApplicationContextRunner + JacksonAutoConfiguration 으로 운영 빈을 꺼내 써.
2. 그다음 wire DTO 8개 + 매퍼.
3. QueryResult 에서 com.fasterxml.jackson import 제거.
4. 순수 리팩토링 커밋과 동작 변경 커밋을 분리.

이 트랙이 끝나면 ai-service 의 application/port/out/query/ 에 Jackson 의존이 0 이 돼.
마지막에 그걸 확인하는 명령을 돌려서 결과를 보고해줘:
  git grep -l 'com.fasterxml.jackson' -- '*/aireport/application/port/out/query/*'
(#387 #388 이 아직 안 끝났으면 0 이 아닐 수 있어. 그때는 남은 개수와 어느 트랙 소관인지만 알려줘.)

주의: 지금 값이 틀린 건은 0건이야. AdministrationDetailQueryResult(administrationCode,
administrationName, sales, store, income) ↔ AdministrationDetailResponse 가 1:1 인 것도 확인됐어.

검증: cd backend && ./gradlew :service:ai-service:test 로 시작해서 마지막에 ./gradlew build.
끝나면 /pr 로 PR 본문 만들어주고 라벨 backend-ai-service 붙여줘. 커밋은 [BE] refactor: 로.
```

---

## 트랙 D — #390 AiReportProcessor 프롬프트 회귀 안전망

```
D:/ProjectWorkSpace/NowDoBoss-V2/.worktrees/ai-report-processor-prompt 에서 작업해줘.
브랜치는 test/be/ai-report-processor-prompt 이고 origin/develop(0ef78ed8)에서 땄어.

GitHub 이슈 #390 을 처리해줘. gh issue view 390 으로 본문을 먼저 읽고,
docs/handoffs/2026-09-13-174126-be-open-issues-parallel-split.md 도 읽어줘.

문제: AiReportProcessor.buildCommercialSourceData 가 QueryResult 들을 CommercialAiSourceData
로 옮기는데, 그 대입이 전부 primitive 라 하나가 누락돼도 예외 없이 0 이 돼.
CommercialPromptFormatter 가 그 0 을 그대로 포맷해서 LLM 에 넘겨. 지금 이 변환에 테스트가 없어.

할 일:
1. AiReportProcessorTest 를 만든다
2. Feign 쿼리 포트 8종을 스텁해 buildCommercialSourceData 를 한 번 태운다
3. 각 QueryResult 에 서로 다른 값을 넣고, 주요 필드가 최종 프롬프트 문자열에 그 값으로
   도달하는지 단언한다 — 값이 같으면 대입이 뒤바뀌어도 통과하니 반드시 다르게
4. 대입을 하나 지웠을 때 실제로 실패하는지 뮤테이션으로 확인하고, 그 결과를 보고한다

참고할 기존 패턴 (둘 다 origin/develop 에 있어):
  application/service/prompt/CommercialResidentPopulationPromptChainTest.java
    — wire 에서 프롬프트 문자열까지 꿰는 방식. javadoc 에 "왜 프로세서를 태우지 못했는지"가 적혀 있어.
      #390 은 그 못 태운 부분을 태우는 게 목적이니 꼭 읽어줘.
  adapter/out/client/feign/dto/commercial/CommercialAnalysisWireMapperTest.java
    — 리플렉션으로 말단 필드를 전수 대조하는 방식

AiReportProcessor 가 586줄이라 테스트가 커질 수 있어. 먼저 구조를 보고,
프로세서를 그대로 태우기 어렵다면 왜 그런지와 대안을 나한테 먼저 알려줘. 혼자 판단해서
프로덕션 코드를 리팩토링하지는 마 — 이 이슈는 테스트 추가가 범위야.

검증: cd backend && ./gradlew :service:ai-service:test.
끝나면 /pr 로 PR 본문 만들어주고 라벨 backend-ai-service 붙여줘. 커밋은 [BE] test: 로.
```

---

## 트랙 E — #369 commercial-service 감사 잔여 `[미확인]`

```
D:/ProjectWorkSpace/NowDoBoss-V2/.worktrees/commercial-audit-unverified 에서 작업해줘.
브랜치는 fix/be/commercial-audit-unverified 이고 origin/develop(0ef78ed8)에서 땄어.

GitHub 이슈 #369 를 처리해줘. gh issue view 369 --comments 로 본문과 정정 코멘트를 먼저 읽어줘.
docs/handoffs/2026-09-13-174126-be-open-issues-parallel-split.md 도 읽어줘.

체크박스 6개 중 5개는 이미 끝났어. 남은 건 마지막 하나야:
  "[미확인] 표시 항목을 확정한 뒤 처리한다. 특히 잉여 인덱스는 운영 DB EXPLAIN 확인 전에
   DROP 하지 않는다."

먼저 조사만 해줘. 고치기 전에 각 [미확인] 항목이 실제로 문제인지 코드로 확정하고 보고해줘:
1. 히트맵 store 조회가 내부적으로 2회(본체 + 피어 점포)인가? 사실이면 6N+1 이 아니라 7N+1 이야.
   CommercialHeatmapQueryProcessor 의 buildSource 를 실제로 따라가서 확인해줘.
2. 업종별 추천이 Top N 건당 Feign 단건 호출을 도는가?
3. 잉여 인덱스 — 이건 운영 DB EXPLAIN 이 필요해서 세션에서 확정 못 해. 후보 목록만 정리하고
   판단은 넘겨줘. 절대 DROP 하지 마.
4. 리소스 서버 토큰 블랙리스트 / compose 127.0.0.1 바인딩 — 이슈에 "의도된 설계, 코드 위반 아님"
   으로 이미 정리돼 있어. 저장소 밖 요소니 재판단하지 말고 현황만 확인해줘.

이 이슈는 앞선 정정 코멘트에서 "코드에 가드가 없다는 사실만 보고 런타임을 재현하지 않은 채
CRITICAL 로 올렸다"는 자기정정이 있었어. 같은 실수를 반복하지 마 —
추론으로 심각도를 올리지 말고, 재현 테스트로 확인한 것만 확정으로 보고해줘.

1번과 2번이 사실로 확정되면 그때 수정해줘. 확정 안 된 건 고치지 마.

검증: cd backend && ./gradlew :service:commercial-service:test.
끝나면 /pr 로 PR 본문 만들어주고 라벨 backend-commercial-service 붙여줘.
확정 못 한 항목은 PR 본문 "남은 위험"에 그대로 남겨줘.
```
