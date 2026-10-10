'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import styled from 'styled-components'

import SimulationAnalysisContextCard from '@/components/simulation/simulation-analysis-context-card'
import SimulationBrandSearch from '@/components/simulation/simulation-brand-search'
import SimulationChoiceGrid from '@/components/simulation/simulation-choice-grid'
import SimulationChoiceSearch from '@/components/simulation/simulation-choice-search'
import SimulationConditionSectionCard from '@/components/simulation/simulation-condition-section'
import SimulationResultPanel from '@/components/simulation/simulation-result-panel'
import SimulationSavedResultsLink from '@/components/simulation/simulation-saved-results-link'
import SimulationServicePicker from '@/components/simulation/simulation-service-picker'
import SimulationStoreConditionFields from '@/components/simulation/simulation-store-condition-fields'
import SimulationSummaryBar from '@/components/simulation/simulation-summary-bar'
import {
  SIMULATION_SERVICE_TYPES,
  isSimulationServiceCode,
} from '@/data/simulation-service-types'
import { resolveApiError } from '@/lib/api/api-error'
import { createSimulationReport } from '@/lib/api/simulation'
import { getResponseBody } from '@/lib/api/response'
import {
  isSimulationContextApplied,
  parseSimulationAnalysisContext,
  toSimulationAnalysisContextSearchParams,
  withSimulationAnalysisContext,
} from '@/lib/simulation/analysis-context'
import { useSimulationConditions } from '@/lib/simulation/use-simulation-conditions'
import {
  SIMULATION_CONDITION_SECTION_LABELS,
  SIMULATION_DISTRICT_OPTIONS,
  describeSimulationProgress,
  describeSimulationSectionValue,
  isSimulationSectionLocked,
  listSimulationConditionSections,
  isSameSimulationReportRequest,
  resolveSimulationSectionFromDomId,
  simulationSectionDomId,
  type SimulationConditionSection,
  type StoreSizeUnit,
} from '@/lib/simulation/conditions'
import {
  describeSimulationCalculateLabel,
  describeSimulationCalculationStatus,
  shouldAutoCalculate,
  simulationConditionKey,
  SIMULATION_AUTO_CALCULATE_DELAY_MS,
} from '@/lib/simulation/auto-calculate'
import { mirrorSimulationConditionsToUrl } from '@/lib/simulation/builder-url'
import { buildSimulationCompareHrefFromReport } from '@/lib/simulation/compare-route'
import { simulationReportQueryKey } from '@/lib/simulation/report-query'
import {
  buildSimulationReportHref,
  parseSimulationConditionState,
} from '@/lib/simulation/report-route'
import { resolveOpenSection } from '@/lib/simulation/step-flow'
import type { SimulationReportRequest } from '@/types/simulation'
import { centeredColumn } from '@/styles/layout'
import { SIMULATION_MEDIA } from '@/components/simulation/simulation-media'

export type SimulationBuilderPageProps = {
  /** `analysis`면 상단에 분석 컨텍스트 카드를 얹는다. 그 외 동작은 완전히 같다. */
  variant?: 'standalone' | 'analysis'
}

/* 힌트는 「무엇이 달라지는가」를 적는다 — 처음 쓰는 사람은 이 선택이 비용에 무엇을 더하는지 모른다. */
const FRANCHISE_CHOICES = [
  { code: 'true', name: '프랜차이즈', hint: '본사 가맹비가 함께 들어가요' },
  { code: 'false', name: '개인 창업', hint: '브랜드 없이 직접 차려요' },
] as const

const Page = styled.main`
  min-height: calc(100vh - 160px);
  padding: 32px 0 64px;
  background: var(--color-background-muted);

  /*
    하단 고정 요약 바의 자리는 문서 끝(푸터 뒤)에 따로 둔다(SimulationBottomBarSpacer, #605). 본문에 바
    높이만큼 여백을 주면 본문만 지키고 그 뒤의 푸터는 바 뒤에 깔린다. 여기는 비교 화면과 같은 여백이다.
  */
  @media ${SIMULATION_MEDIA.belowDesktop} {
    padding: 24px 0 48px;
  }
`

/* 2단 트랙. Layout 과 본문 묶음 상한이 같은 값을 써야 헤더·컨텍스트 카드 오른쪽 끝이 결과 패널과 맞는다. */
const RESULT_COLUMN_WIDTH = '360px'
const COLUMN_GAP = '20px'

/*
  본문 묶음(헤더·분석 컨텍스트 카드·2단) 전체가 2단 트랙 합에서 멈추고 **셸 안 가운데**에 선다
  (DESIGN §5 「중앙 그룹」 — 홈·커뮤니티와 같은 방식). 묶음 자체에 상한을 걸어야 한다 — 조건 열만
  멈추면 grid 자식인 헤더와 컨텍스트 카드는 셸 끝까지 늘어 「저장한 결과」가 결과 패널보다
  620px(1920) 오른쪽 빈자리에 떴다. 전에는 왼쪽 정렬이라 1920 에서 콘텐츠가 왼쪽 1260 에 몰리고
  오른쪽 640 이 비었다. 헤더(로고)와의 왼쪽 기준선 차이는 남는다 — 입력·리포트·비교가 같은
  기준선을 쓰는 쪽을 택했다. 자식에 margin: auto 를 걸지 않는다: grid 항목은 늘어나지 않고
  내용 폭으로 줄어든다.
*/
const Container = styled.div`
  ${centeredColumn(`calc(var(--w-form) + ${COLUMN_GAP} + ${RESULT_COLUMN_WIDTH})`)}
  display: grid;
  gap: 16px;
`

/* 3층 문구(eyebrow+H1+설명)를 한 줄로 눌렀다. 매 화면 같은 문구가 상단을 다 먹지 않게. */
/*
  min-height 40px 는 「저장한 결과」(medium 버튼 40px) 자리다. 링크는 세션 복원 뒤에야 그려지는데,
  h1 줄(32px)만 잡아 두면 그때 헤더가 8px 커지며 조건 섹션 전체가 밀린다. 링크가 다음 줄로
  감기는 좁은 폭에서는 이 값으로 막지 못한다 — 그 폭은 세션 복원이 첫 조작보다 먼저 끝난다.
*/
const Head = styled.header`
  min-height: 40px;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 12px;

  h1 {
    color: var(--color-text-900);
    font-size: 22px;
    font-weight: 700;
    line-height: 32px;
    word-break: keep-all;
  }

  /* 카드 밖 페이지 바탕(grey50) 위라 grey600 은 4.42 로 미달이다 — 밴드 캡션 토큰. */
  p {
    color: var(--color-text-caption-on-band);
    font-size: 14px;
    line-height: 22px;
    word-break: keep-all;
  }
`

/**
 * 입력 · 결과 2단.
 *
 * 단일 화면이라 세로로 쌓을 이유가 없다 — 오른쪽 컬럼이 sticky로 붙어 있으면 조건을 고치는
 * 동안에도 남은 조건과 금액이 항상 보인다. 1023px 이하에서는 1단으로 접고 하단 요약 바가
 * 그 역할을 대신한다.
 *
 * 조건 열은 `--w-form`(880)에서 멈춘다. 셸에는 상한이 없어(DESIGN §5) 1fr 그대로면 1440 에서
 * 1,020px, 1920 에서 1,500px 까지 늘었고, 계산 뒤 접힌 헤더 줄의 값과 오른쪽 답이 그만큼
 * 멀어졌다. 결과 열은 조건 열 바로 옆에 붙이고 남는 폭은 오른쪽 끝에 둔다 — 결과를 셸 오른쪽
 * 끝에 붙이면 둘 사이가 다시 벌어진다.
 */
const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, var(--w-form)) ${RESULT_COLUMN_WIDTH};
  align-items: start;
  gap: ${COLUMN_GAP};

  @media ${SIMULATION_MEDIA.belowDesktop} {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }
`

const Form = styled.div`
  min-width: 0;
  display: grid;
  gap: 16px;
`

/*
  top: 96px는 sticky 사이트 헤더(65px) 아래 여백까지 확보한 값이다 — 분석 결과 화면과 같은 값.

  1023px 이하에서는 **계산 전 패널을 숨긴다.** 그 구간은 하단 고정 바가 남은 조건과
  「계산하기」를 맡는데, 패널까지 두면 같은 버튼이 두 개 보이고 체크리스트가 위 아코디언
  헤더를 그대로 반복한다(2026-10-01 실측). 결과·오류가 생기면 다시 보인다 — 오류의
  「다시 선택」 CTA 는 패널에만 있다. CSS 로 숨기므로 SSR 과 하이드레이션 결과가 같다.
*/
const ResultColumn = styled.div<{ $hideOnNarrow: boolean }>`
  min-width: 0;
  display: grid;
  gap: 16px;

  @media ${SIMULATION_MEDIA.belowDesktop} {
    display: ${props => (props.$hideOnNarrow ? 'none' : 'grid')};
  }

  @media ${SIMULATION_MEDIA.desktop} {
    position: sticky;
    top: 96px;
  }
`

/*
  자동 계산(#604)의 시작·완료를 낭독기에 알리는 영역. 늘 그려 두고 글자만 바꾼다 — 새로 붙는 live 영역은
  첫 내용을 읽지 않는 낭독기가 있다. 결과 열은 ≤1023 에서 계산 전에 숨으므로 그 밖에 둔다.
*/
const LiveStatus = styled.p`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
`

const EmptyText = styled.p`
  padding: 18px 0;
  color: var(--color-text-caption);
  font-size: 13px;
  text-align: center;
`

/**
 * 창업 시뮬레이션 조건 입력 + 동기 계산 — **단일 화면 2단**.
 *
 * `/simulation`과 `/analysis/simulation`이 같은 컴포넌트를 쓰고, 분석 컨텍스트 카드만 다르다.
 *
 * 마법사(4단계)를 걷어낸 이유: 조건 사이의 의존성이 **업종 → 브랜드 하나뿐**이라 단계로 쪼갤
 * 값이 없었고, 대신 "뒤 단계에서 앞 단계로 되돌아가기"라는 비용만 남았다. 그 하나뿐인 순서는
 * **업종을 고르기 전 브랜드 섹션을 잠가서** 지킨다(`franchisees`가 `serviceCode` 필수).
 *
 * 섹션은 창업 형태에 따라 4개(개인) 또는 5개(프랜차이즈 — 브랜드가 독립 섹션)다. 번호와
 * 진행도(n/N)는 `listSimulationConditionSections` 가 정한 실제 섹션 수를 쓴다.
 *
 * 계산은 `POST /simulations/reports` **한 번**으로 끝난다 — 폴링·SSE가 없으므로 로딩 표시도 한 번이다.
 * 계산 결과는 캐시할 서버 상태가 아니라 사용자의 조건에 대한 응답이므로 `useMutation`을 쓰고,
 * 무효화(invalidate)할 쿼리도 없다. (이력 저장은 다음 슬라이스이며 그때 이력 목록 무효화가 붙는다.)
 */
export default function SimulationBuilderPage({
  variant = 'standalone',
}: SimulationBuilderPageProps) {
  const searchParams = useSearchParams()
  /*
    분석 컨텍스트는 **마운트 때 한 번** 읽어 고정한다(#635). 거울이 이 값을 주소에 다시 쓰고, 리포트·비교 링크에도
    덧붙인다. 지금 주소에서 다시 읽지 않는 이유는 거울이 쓴 조건 키(`districtCode`)가 옛 형식의 컨텍스트로
    읽힐 수 있어서다(`builder-url.ts`).
  */
  const [context] = useState(() =>
    variant === 'analysis'
      ? parseSimulationAnalysisContext(searchParams)
      : null,
  )
  const contextParams =
    variant === 'analysis'
      ? toSimulationAnalysisContextSearchParams(context)
      : null

  // 리포트에서 되돌아왔다면 쿼리스트링에 조건이 실려 있다. 그걸 초기값으로 삼고,
  // 분석 컨텍스트는 **비어 있는 칸만** 메운다 — 조건이 실려 있는데 컨텍스트가 덮으면
  // 사용자가 방금 바꾼 값이 되돌아온 자리에서 다시 뒤집힌다.
  // 분석 화면은 컨텍스트를 `ctx` 키로만 싣는다(#635). 첫 진입에는 조건 키가 없으므로 이 합성이 자치구·업종을
  // 채우고, 거울이 그 값을 조건 키로 적은 뒤로는 새로고침해도 바꾼 값이 조건 키에서 돌아온다.
  const restored = parseSimulationConditionState(searchParams)

  const conditions = useSimulationConditions({
    ...restored,
    districtCode: restored.districtCode ?? context?.districtCode ?? null,
    serviceCode: restored.serviceCode ?? context?.serviceCode ?? null,
  })

  /*
    사용자가 직접 펼친 단계. 실제로 열리는 단계는 resolveOpenSection 이 정한다 —
    이 값이 있으면 그것을 이긴다. 선택 핸들러(selectThenAdvance)가 선택할 때마다
    이 값을 비우므로, 선택 직후에는 자연히 비어 있는 첫 단계가 열린다.
  */
  const [openedByUser, setOpenedByUser] =
    useState<SimulationConditionSection | null>(null)
  const openSection = resolveOpenSection(conditions.state, openedByUser)

  /*
    선택하면 「사용자가 연 단계」를 비운다. 그래야 resolveOpenSection 이 다음
    미완료 단계를 잡아 자동 진행하고, 앞 단계를 고쳐 뒤가 비워진 경우에도 그
    빈 단계를 곧바로 펼친다.
  */
  const selectThenAdvance =
    <T,>(apply: (value: T) => void) =>
    (value: T) => {
      apply(value)
      setOpenedByUser(null)
    }

  /*
    검색어는 그 단계를 벗어나면 버린다(D4-1-1). 단계를 다시 열면 전체 목록에서
    시작하는 편이, 지난번에 걸어둔 필터 때문에 원하는 항목이 안 보이는 것보다 낫다.
    업종 검색어·분류는 SimulationServicePicker 가 들고 있다 — 섹션이 접히면 언마운트돼
    같은 규칙이 저절로 지켜진다.
  */
  const [districtQuery, setDistrictQuery] = useState('')
  // 면적 직접 입력 단위(㎡·평). 매장 조건 섹션이 접혀도 남아야 해서 여기 둔다.
  const [storeSizeUnit, setStoreSizeUnit] =
    useState<StoreSizeUnit>('squareMeter')

  // 렌더 중 key 비교로 즉시 리셋하는 React 권장 패턴("Adjusting state when a prop
  // changes")을 사용해 effect 기반 setState의 cascading render를 피한다.
  const [prevOpenSection, setPrevOpenSection] = useState(openSection)
  if (prevOpenSection !== openSection) {
    setPrevOpenSection(openSection)
    if (openSection !== 'district') setDistrictQuery('')
  }

  const districtChoices = districtQuery.trim()
    ? SIMULATION_DISTRICT_OPTIONS.filter(item =>
        item.name.includes(districtQuery.trim()),
      )
    : SIMULATION_DISTRICT_OPTIONS

  /*
    React 19 의 콜백 ref 는 정리 함수만 반환할 수 있다. `node => map.set(...)` 처럼
    식 본문으로 쓰면 Map 이 반환돼 타입 오류가 난다 — 블록 본문으로 감싼다.
  */
  const headerRefs = useRef(
    new Map<SimulationConditionSection, HTMLButtonElement | null>(),
  )
  /*
    초기값에 첫 렌더의 openSection 을 심는다. null 로 두면 마운트 직후 effect 가
    「자동 진행」으로 착각해 페이지를 연 사람의 포커스를 1단계 버튼으로 끌어간다.
    useRef 의 초기값은 첫 렌더에서만 쓰이므로 이후 전환은 그대로 잡힌다.
  */
  const lastFocused = useRef<SimulationConditionSection | null>(openSection)

  /*
    단계가 자동으로 바뀌면 새 헤더로 포커스를 옮긴다. 옮기지 않으면 키보드·스크린리더
    사용자는 방금 사라진 요소 자리에 남아 화면이 바뀐 것을 모른다.

    「전부 접힘」(openSection === null)도 하나의 전이로 취급한다 — 마지막 조건을 고르면
    방금 열려 있던 패널이 통째로 사라지는데, 예전 early return은 이 경우를 아무것도
    하지 않고 넘겨 포커스가 복구 없이 <body>로 떨어졌다. 전부 접힐 때는 직전에 열려
    있던 단계(`previous`)의 헤더 버튼으로 돌려준다 — 그 헤더는 접혀도 여전히 버튼이다.
  */
  useEffect(() => {
    if (lastFocused.current === openSection) return
    const previous = lastFocused.current
    lastFocused.current = openSection
    const target = openSection ?? previous
    if (target) headerRefs.current.get(target)?.focus()
  }, [openSection])

  /*
    리포트 화면의 오류 배너 "다시 선택"은 `#${simulationSectionDomId(section)}`를 달고
    빌더로 돌아온다(simulation-report-page.tsx). 그 해시를 마운트 시 한 번 읽어
    openedByUser 의 초기값으로 심는다 — 심지 않으면 항상 1단계(또는 첫 미완료 단계)가
    열린 채로 시작해 사용자가 지목받은 섹션을 다시 찾아 펼쳐야 한다.

    쿼리스트링과 달리 해시는 서버로 전송되지 않아 useSearchParams 로 볼 수 없고,
    렌더 본문에서 window.location.hash 를 읽으면 SSR(해시 없음)과 하이드레이션 사이
    첫 렌더 결과가 갈라진다. 그래서 렌더가 아니라 마운트 후 effect 에서 읽는다.
  */
  useEffect(() => {
    const section = resolveSimulationSectionFromDomId(window.location.hash)
    if (section) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 후 1회, 해시라는 외부 신호를 반영한다.
      setOpenedByUser(section)
    }
  }, [])

  const queryClient = useQueryClient()

  const reportMutation = useMutation({
    mutationFn: (payload: SimulationReportRequest) =>
      createSimulationReport(payload),
    // 리포트 화면이 같은 조건으로 다시 POST 하지 않게 캐시를 미리 채운다.
    onSuccess: (data, payload) => {
      queryClient.setQueryData(simulationReportQueryKey(payload), data)
    },
  })

  const error = resolveApiError({
    error: reportMutation.error,
    data: reportMutation.data,
  })
  // 조건을 고치면 앞 결과·오류를 내린다. 남겨두면 바뀐 조건의 결과로 오독된다.
  const isCurrent = isSameSimulationReportRequest(
    reportMutation.variables ?? null,
    conditions.reportRequest,
  )
  const report = getResponseBody(reportMutation.data)
  // 지금 조건으로 이미 계산을 보냈으면(오류 뒤 등) 버튼은 「다시 계산」이다(#604).
  const calculateLabel = describeSimulationCalculateLabel(isCurrent)
  const currentError = isCurrent ? error : null
  const currentReport = isCurrent && !error ? report : null
  // 분석 경유 화면이면 컨텍스트를 덧붙인다(#635). 리포트·비교에서 「조건 다시 고르기」로 돌아와도 카드가
  // 원래 분석 조건을 말한다. 캐시 키는 요청에서 만들므로 이 키는 계산에 섞이지 않는다.
  const reportHref =
    currentReport && reportMutation.variables
      ? withSimulationAnalysisContext(
          buildSimulationReportHref(
            reportMutation.variables,
            variant,
            // 브랜드명은 요청 본문에 없다. 리포트에서 되돌아올 때 복원하려면 URL 이 들고 있어야 한다.
            conditions.state.brandName,
          ),
          contextParams,
        )
      : null
  // 리포트 화면의 「다른 조건과 비교」와 같은 링크다 — 이 조건을 A 에, 그 복사본을 B 에(#567).
  const compareHref =
    currentReport && reportMutation.variables
      ? withSimulationAnalysisContext(
          buildSimulationCompareHrefFromReport(
            reportMutation.variables,
            variant,
            conditions.state.brandName,
          ),
          contextParams,
        )
      : null

  const resultRef = useRef<HTMLDivElement | null>(null)
  const conditionState = conditions.state

  /*
    마지막으로 계산을 보낸 조건의 키(#604). 첫 값은 **진입 때의 조건**이다 — 이미 완성된 채 들어오면
    (리포트에서 되돌아옴·새로고침·링크) 그 조건을 보낸 것으로 쳐서 진입만으로 POST 를 보내지 않는다.
    useRef 의 초기값은 첫 렌더에서만 쓰인다.
  */
  const conditionKey = simulationConditionKey(conditionState)
  const lastRequestedKey = useRef<string | null>(conditionKey)

  /*
    `mutate` 는 안정된 참조이고 `reportRequest` 는 훅이 메모한다 — 그래서 calculate 는 조건이 바뀔 때만
    새로 만들어지고, 아래 자동 계산 effect 가 렌더마다 타이머를 다시 걸지 않는다.
  */
  const { mutate: mutateReport } = reportMutation
  const reportRequest = conditions.reportRequest
  const calculate = useCallback(() => {
    if (!reportRequest) return
    lastRequestedKey.current = conditionKey
    mutateReport(reportRequest)
  }, [reportRequest, conditionKey, mutateReport])

  /*
    조건이 모두 정해지면 계산한다(#604). 판정은 `shouldAutoCalculate` 한 곳 — 펼친 단계가 없고(입력이
    끝났고), 마지막으로 보낸 조건과 다르고, 요청 중이 아닐 때다. 요청 중에 조건이 바뀌면 끝난 뒤 이
    effect 가 다시 돌아 그때 보낸다.

    짧게 미뤄(디바운스) 연달아 고치는 동안 요청이 겹치지 않게 한다. 미루는 사이 사용자가 「계산하기」를
    눌렀으면 키가 이미 같아져 보내지 않는다 — 같은 조건으로 두 번 POST 하지 않는다.
  */
  const isCalculating = reportMutation.isPending
  useEffect(() => {
    if (
      !shouldAutoCalculate({
        conditionKey,
        lastRequestedKey: lastRequestedKey.current,
        openSection,
        isPending: isCalculating,
      })
    ) {
      return
    }
    const timer = window.setTimeout(() => {
      if (lastRequestedKey.current === conditionKey) return
      calculate()
    }, SIMULATION_AUTO_CALCULATE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [conditionKey, openSection, isCalculating, calculate])

  /*
    입력 중인 조건을 주소창에 보존한다(#568). 새로고침하거나 「저장한 결과」를 보고 돌아와도, 계산 전
    조건을 링크로 보내도 같은 조건으로 열린다. `replaceState` 라 히스토리가 쌓이지 않는다.
    분석 경유 화면도 자치구·업종까지 싣는다. 컨텍스트 카드의 정본은 따로 둔 `ctx` 키라 겹치지 않는다(#635).
    거울은 마운트 때 고정한 컨텍스트를 새 형식(표식 `ctx=1` + `ctx` 키)으로 함께 쓴다. 옛 형식 링크도 첫 쓰기에서
    새 형식으로 바뀐다.
  */
  useEffect(() => {
    mirrorSimulationConditionsToUrl(conditionState, variant, context)
  }, [conditionState, variant, context])

  const scrollToResult = useCallback(() => {
    resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  /*
    오류가 지목한 조건 섹션으로 데려간다. 앞 오류를 내리고, 그 섹션을 펼치고 나서 이동한다.
    계산은 조건이 다 차야 가능하므로 오류 배너가 뜨는 시점엔 항상 전부 접혀 있다 —
    펼치지 않고 스크롤만 하면 접힌 한 줄만 보이고 칩은 한 번 더 눌러야 나온다.

    스크롤은 setOpenedByUser 직후가 아니라 rAF 안에서 한다. state 업데이트는 비동기라
    같은 틱에 scrollIntoView를 부르면 아직 접힌 상태의 레이아웃을 기준으로 계산돼
    펼쳐진 뒤 위치와 어긋난다(analysis-result-view.tsx의 scrollToReportSection과 같은 이유).
  */
  const reselectSection = useCallback(
    (section: SimulationConditionSection) => {
      reportMutation.reset()
      setOpenedByUser(section)
      window.requestAnimationFrame(() => {
        document
          .getElementById(simulationSectionDomId(section))
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    },
    [reportMutation, setOpenedByUser],
  )

  // 계산이 끝나면(성공이든 실패든) 결과가 화면 밖에 있는 좁은 화면에서만 결과로 데려간다.
  // 데스크탑은 결과 패널이 sticky로 이미 보이므로 스크롤을 건드리면 오히려 시야가 튄다.
  // 의존성은 React Query가 들고 있는 안정된 참조(data/error)여야 한다 — `error`(resolveApiError
  // 결과)는 매 렌더 새 객체라 넣으면 루프가 된다.
  const { data: mutationData, error: mutationError } = reportMutation
  useEffect(() => {
    if (!mutationData && !mutationError) return
    if (!window.matchMedia(SIMULATION_MEDIA.belowDesktop).matches) return
    resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [mutationData, mutationError])

  const { state } = conditions
  const contextApplied = context
    ? isSimulationContextApplied(context, state)
    : true

  const restoreContext = useCallback(() => {
    if (!context) return
    conditions.restoreDistrictAndService({
      districtCode: context.districtCode,
      serviceCode: context.serviceCode,
    })
  }, [context, conditions])

  const sections = listSimulationConditionSections(state)
  // 화면 번호는 지금 놓인 섹션 중 몇 번째인가다. 프랜차이즈면 매장 조건이 5번이 된다.
  const sectionIndex = (section: SimulationConditionSection) =>
    sections.indexOf(section) + 1
  const progress = describeSimulationProgress(state)

  return (
    <Page>
      <Container>
        <Head>
          <h1>창업 시뮬레이션</h1>
          <p>차례대로 고르면 예상 창업 비용을 바로 계산해 드려요</p>
          <SimulationSavedResultsLink />
        </Head>

        {context ? (
          <SimulationAnalysisContextCard
            context={context}
            applied={contextApplied}
            onRestore={restoreContext}
          />
        ) : null}

        <Layout>
          <Form>
            <SimulationConditionSectionCard
              id={simulationSectionDomId('franchise')}
              index={sectionIndex('franchise')}
              title={SIMULATION_CONDITION_SECTION_LABELS.franchise}
              description="프랜차이즈면 브랜드 가맹 부담금까지 반영해요."
              complete={conditions.isSectionComplete('franchise')}
              expanded={openSection === 'franchise'}
              summary={describeSimulationSectionValue(state, 'franchise')}
              onToggle={() =>
                setOpenedByUser(
                  openSection === 'franchise' ? null : 'franchise',
                )
              }
              headerRef={node => {
                headerRefs.current.set('franchise', node)
              }}
            >
              <SimulationChoiceGrid
                label="창업 형태"
                choices={FRANCHISE_CHOICES}
                selectedCode={
                  state.franchisee === null ? null : String(state.franchisee)
                }
                onSelect={selectThenAdvance<string>(code =>
                  conditions.setFranchisee(code === 'true'),
                )}
                /* 선택지가 둘뿐이라 열 수를 고정한다. 최소 폭 auto-fill 로 두면 넓은 칸에서
                   빈 트랙이 남아 카드가 왼쪽으로 쏠렸다(768·1440 실측). */
                columns={2}
                maxWidth={520}
              />
            </SimulationConditionSectionCard>

            <SimulationConditionSectionCard
              id={simulationSectionDomId('district')}
              index={sectionIndex('district')}
              title={SIMULATION_CONDITION_SECTION_LABELS.district}
              description="자치구별 임대료 기준으로 계산해요."
              meta={`서울 ${SIMULATION_DISTRICT_OPTIONS.length}개 구`}
              complete={conditions.isSectionComplete('district')}
              expanded={openSection === 'district'}
              summary={describeSimulationSectionValue(state, 'district')}
              onToggle={() =>
                setOpenedByUser(openSection === 'district' ? null : 'district')
              }
              headerRef={node => {
                headerRefs.current.set('district', node)
              }}
            >
              <SimulationChoiceSearch
                label="자치구 이름으로 찾기"
                value={districtQuery}
                shown={districtChoices.length}
                total={SIMULATION_DISTRICT_OPTIONS.length}
                onChange={setDistrictQuery}
              />
              {districtChoices.length === 0 ? (
                <EmptyText>{`'${districtQuery.trim()}'와 맞는 자치구가 없어요.`}</EmptyText>
              ) : (
                <SimulationChoiceGrid
                  label="자치구"
                  choices={districtChoices}
                  selectedCode={state.districtCode}
                  onSelect={selectThenAdvance(conditions.setDistrict)}
                  /* 96px는 375px에서 3열을 유지하는 상한이다(카드 내부 폭 311px).
                     104로 올리면 모바일이 2열로 떨어져 25칩이 13줄이 된다. */
                  minColumnWidth={96}
                />
              )}
            </SimulationConditionSectionCard>

            <SimulationConditionSectionCard
              id={simulationSectionDomId('service')}
              index={sectionIndex('service')}
              title={SIMULATION_CONDITION_SECTION_LABELS.service}
              description={
                state.franchisee === true
                  ? '업종을 고르면 그 업종의 브랜드와 매장 크기 기준이 열려요.'
                  : '업종을 고르면 매장 크기 기준이 열려요.'
              }
              meta={`지원 업종 ${SIMULATION_SERVICE_TYPES.length}종`}
              complete={conditions.isSectionComplete('service')}
              expanded={openSection === 'service'}
              summary={describeSimulationSectionValue(state, 'service')}
              onToggle={() =>
                setOpenedByUser(openSection === 'service' ? null : 'service')
              }
              headerRef={node => {
                headerRefs.current.set('service', node)
              }}
            >
              <SimulationServicePicker
                selectedCode={state.serviceCode}
                onSelect={selectThenAdvance(conditions.setService)}
              />
            </SimulationConditionSectionCard>

            {/*
              브랜드는 프랜차이즈일 때만 있는 독립 섹션이다(Q4). 업종 전에는 잠긴다 —
              `franchisees` 는 serviceCode 없이 부르면 400 이다. 잠긴 헤더가 「업종을 고르면
              열려요」로 순서를 드러내므로, 예전처럼 비활성 검색칸을 따로 그리지 않는다.
            */}
            {state.franchisee === true ? (
              <SimulationConditionSectionCard
                id={simulationSectionDomId('brand')}
                index={sectionIndex('brand')}
                title={SIMULATION_CONDITION_SECTION_LABELS.brand}
                description="브랜드명을 입력하면 부분 일치로 찾아요. 고른 브랜드의 가맹 부담금이 계산에 들어가요."
                complete={conditions.isSectionComplete('brand')}
                expanded={openSection === 'brand'}
                summary={describeSimulationSectionValue(state, 'brand')}
                locked={isSimulationSectionLocked(state, 'brand')}
                onToggle={() =>
                  setOpenedByUser(openSection === 'brand' ? null : 'brand')
                }
                headerRef={node => {
                  headerRefs.current.set('brand', node)
                }}
              >
                {isSimulationServiceCode(state.serviceCode) ? (
                  // key로 업종별 검색 상태(검색어·누적 페이지)를 갈아끼운다.
                  <SimulationBrandSearch
                    key={state.serviceCode}
                    serviceCode={state.serviceCode}
                    selectedFranchiseeId={state.franchiseeId}
                    onSelect={selectThenAdvance(conditions.setBrand)}
                    showHeading={false}
                    /* 찾는 브랜드가 없을 때의 출구. 개인 창업으로 바꾸면 브랜드 섹션이
                       사라지고 비어 있는 다음 단계가 열린다. */
                    onSkipBrand={selectThenAdvance<void>(() =>
                      conditions.setFranchisee(false),
                    )}
                  />
                ) : null}
              </SimulationConditionSectionCard>
            ) : null}

            <SimulationConditionSectionCard
              id={simulationSectionDomId('store')}
              index={sectionIndex('store')}
              title={SIMULATION_CONDITION_SECTION_LABELS.store}
              description="매장 크기와 층 구분에 따라 임대료·인테리어 기준이 달라져요."
              complete={conditions.isSectionComplete('store')}
              expanded={openSection === 'store'}
              summary={describeSimulationSectionValue(state, 'store')}
              locked={isSimulationSectionLocked(state, 'store')}
              onToggle={() =>
                setOpenedByUser(openSection === 'store' ? null : 'store')
              }
              headerRef={node => {
                headerRefs.current.set('store', node)
              }}
            >
              {/* store 가 펼쳐지려면 openSection 이 'store' 여야 하고, resolveOpenSection 은
                  순회 순서(service → brand → store)상 service 가 완료(=isSimulationServiceCode 를
                  통과)일 때만 store 를 연다 — 여기 도달하면 항상 참이다. 그래도 truthy 검사가
                  아니라 `locked` prop 과 같은 술어로 다시 확인한다 — 둘이 다른 판정을 쓰면
                  빈 문자열(`''`) 같은 값 앞에서 갈라진다. */}
              {isSimulationServiceCode(state.serviceCode) ? (
                <SimulationStoreConditionFields
                  serviceCode={state.serviceCode}
                  storeSize={state.storeSize}
                  floorType={state.floorType}
                  /*
                    매장 조건은 selectThenAdvance 로 감싸지 않는다 — 직접 입력은 한 글자마다
                    onStoreSizeChange 를 부르므로, 진행하면 `66` 이 `6` 에서 접힌다.

                    비우지 않는 것만으로는 모자라다. 자동 진행으로 열린 단계는 openedByUser 가
                    이미 null 이라, 층이 골라져 있으면 첫 글자로 값이 차는 순간 resolveOpenSection
                    이 「완료」로 보고 접는다. 그래서 값을 바꾸는 동안은 이 단계를 사용자가 연
                    단계로 붙잡고, 진행 시점(칩 선택·Enter·blur)은 컴포넌트가 onAdvance 로 알린다.
                    프리셋 칩은 같은 핸들러 안에서 onAdvance 까지 부르므로 붙잡자마자 풀린다.
                  */
                  onStoreSizeChange={storeSize => {
                    setOpenedByUser('store')
                    conditions.setStoreSize(storeSize)
                  }}
                  onFloorTypeChange={conditions.setFloorType}
                  onAdvance={() => setOpenedByUser(null)}
                  unit={storeSizeUnit}
                  onUnitChange={setStoreSizeUnit}
                />
              ) : null}
            </SimulationConditionSectionCard>
          </Form>

          <ResultColumn
            ref={resultRef}
            $hideOnNarrow={!currentReport && !currentError}
          >
            <SimulationResultPanel
              state={state}
              gap={conditions.gap}
              progress={progress}
              report={currentReport}
              reportHref={reportHref}
              compareHref={compareHref}
              error={currentError}
              isPending={reportMutation.isPending}
              calculateLabel={calculateLabel}
              onCalculate={calculate}
              onReselect={reselectSection}
            />
          </ResultColumn>
        </Layout>
      </Container>

      <LiveStatus role="status" aria-live="polite">
        {describeSimulationCalculationStatus({
          isPending: reportMutation.isPending,
          totalPrice: currentReport?.totalPrice ?? null,
        })}
      </LiveStatus>

      <SimulationSummaryBar
        totalPrice={currentReport?.totalPrice ?? null}
        reportHref={reportHref}
        gap={conditions.gap}
        progress={progress}
        isPending={reportMutation.isPending}
        calculateLabel={calculateLabel}
        onCalculate={calculate}
        onViewResult={scrollToResult}
      />
    </Page>
  )
}
