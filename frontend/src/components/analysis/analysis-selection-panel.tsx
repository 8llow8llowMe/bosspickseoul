'use client'

import { memo, useId, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { RotateCcw, Search } from 'lucide-react'
import styled from 'styled-components'

import { Button } from '@/components/ui/button'
import { visuallyHidden } from '@/styles/visually-hidden'
import EmptyState from '@/components/ui/empty-state'
import { TextField } from '@/components/ui/text-field'
import OptionPicker, {
  type OptionPickerFeatured,
} from '@/components/ui/option-picker'
import {
  POPULAR_SERVICE_CODES,
  POPULAR_SERVICE_LABEL,
} from '@/lib/recommend/popular-services'
import { Skeleton } from '@/components/ui/skeleton'
import { isRetryable, type NormalizedApiError } from '@/lib/api/api-error'
import {
  canGroupByDescription,
  countOptions,
  groupOptionsByDescription,
  OPTION_SEARCH_THRESHOLD,
} from '@/lib/option-filter'
import { formatPeriodCode } from '@/lib/analysis/presentation'
import {
  ANALYSIS_STEPS,
  isCompleteAnalysisSelection,
  type AnalysisSelection,
  type AnalysisStep,
} from '@/lib/analysis/selection'
import { createRecommendHrefFromCodes } from '@/lib/recommend/recommend-url'
import PopularCommercialsShortcut, {
  type PopularCommercialJump,
} from '@/components/analysis/popular-commercials-shortcut'

/** 업종 검색이 0건일 때 대신 보여 줄 「자주 찾는 업종」. 추천 화면과 같은 목록이다. */
const POPULAR_SERVICE_FALLBACK: OptionPickerFeatured = {
  label: POPULAR_SERVICE_LABEL,
  codes: POPULAR_SERVICE_CODES,
}

export type AnalysisCandidate = {
  code: string
  name: string
  description?: string | null
}

/** 1단계에서 목록이 비었을 때의 설명. 장애임이 드러나게 적는다. */
const FIRST_STEP_OUTAGE_DESCRIPTION =
  '서울 자치구 25개는 항상 있어야 하는 목록입니다. 잠시 후 다시 시도해 주세요.'

export type AnalysisSelectionPanelProps = {
  activeStep: AnalysisStep
  selection: AnalysisSelection
  /** 분석할 분기(해석된 값). 서버 기본 분기를 받기 전이면 null. */
  periodCode: string | null
  selectedNames: Partial<Record<AnalysisStep, string>>
  items: readonly AnalysisCandidate[]
  status: 'loading' | 'error' | 'empty' | 'ready'
  /**
   * `status === 'error'`일 때의 정규화된 오류(`resolveApiError(query)`).
   * `kind === 'not-found'`면 재시도 버튼 없이 서버 문구만 노출한다.
   *
   * optional 이 아니다 — 빠뜨리면 404 에도 재시도 버튼이 붙는 예전 UX 로 조용히 되돌아가고
   * 타입체커가 잡지 못한다. `AnalysisResultSection`·`StatusFeedback` 과 시그니처를 맞춘다.
   * (오류 종류를 알 수 없는 실패는 호출부가 명시적으로 `null` 을 넘긴다.)
   */
  error: NormalizedApiError | null
  onStepChange: (step: AnalysisStep) => void
  onSelect: (code: string) => void
  onPreviewChange: (code: string | null) => void
  onRetry: () => void
  onSubmit: () => void
  /**
   * 「지금 많이 본 상권」에서 하나를 고르면 상위 코드까지 실려 온다(역조회는 그 블록이
   * 한다). 1단계에서만 노출하며, **넘기지 않으면 블록 자체가 없다** — 패널을 단독으로
   * 렌더하는 테스트가 순위 API 를 부르지 않게 하려고 optional 로 뒀다.
   */
  onPopularCommercialJump?: (target: PopularCommercialJump) => void
  /**
   * 「상권·지하철역·동 이름으로 찾기」 칸(#596). 1단계에서 패널 맨 위(모바일 시트도 같은 자리)에
   * 둔다. 셸이 만든 요소를 그대로 받는다 — 넘기지 않으면 칸이 없다.
   */
  nameSearch?: ReactNode
  variant?: 'panel' | 'sheet'
}

export const ANALYSIS_STEP_LABELS: Record<AnalysisStep, string> = {
  district: '자치구',
  administration: '행정동',
  commercial: '상권',
  service: '업종',
}

const STEP_ORDER: readonly AnalysisStep[] = [
  'district',
  'administration',
  'commercial',
  'service',
]

const STEP_GAP_MESSAGE: Record<AnalysisStep, string> = {
  district: '자치구를 선택해 주세요',
  administration: '행정동을 선택해 주세요',
  commercial: '상권을 선택해 주세요',
  service: '업종을 선택해 주세요',
}

/** 비어 있는 첫 단계만 안내한다. 추천·시뮬레이션 화면의 「…를 선택해 주세요」 톤과 맞춘다. */
const describeAnalysisSelectionGap = (selection: AnalysisSelection): string => {
  const missing = STEP_ORDER.find(step => !selectionCodeByStep(selection, step))
  return missing ? STEP_GAP_MESSAGE[missing] : ''
}

const Root = styled.section`
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
`

/*
  눈썹말(「상권 분석」)과 설명문을 뺐다. 앞엣것은 GNB 에서 이미 활성 상태로 강조돼 있고,
  뒤엣것(「지도와 목록에서 지역을 좁힌 뒤…」)은 바로 아래 4단계 스텝이 같은 순서를
  그대로 보여 준다. 둘이 먹던 69px 은 자치구 목록으로 돌린다.
  좌우 여백은 아래 StepList·Body 와 같은 20px 으로 맞춘다(전에는 홀로 24px 이었다).
*/
const Header = styled.header`
  padding: 16px 20px 14px;
  border-bottom: 1px solid var(--color-border-200);
`

const Title = styled.h1`
  color: var(--color-text-900);
  font-size: 24px;
  font-weight: 700;
  line-height: 34px;
  word-break: keep-all;
`

/*
  모바일 시트는 머리(72px)와 지도 최소 높이(180px)를 빼면 375×667 에서 350px 밖에 안 남는다.
  고정 영역(이름 검색·단계 탭·CTA)이 그 자리를 다 먹어 자치구 카드가 반 줄만 보였다(#648).
  시트에서는 고정 영역의 위아래 여백을 줄인다. 데스크톱 패널은 그대로다.
*/
type PanelVariant = 'panel' | 'sheet'

/* 이름 검색 칸. 단계 탭보다 위, 패널 맨 위다 — 지도·4단계를 거치지 않는 첫 길이라서다. */
const SearchSlot = styled.div<{ $variant: PanelVariant }>`
  padding: ${props => (props.$variant === 'sheet' ? '8px 20px' : '14px 20px')};
  border-bottom: 1px solid var(--color-border-200);
`

const StepList = styled.ol<{ $variant: PanelVariant }>`
  display: grid;
  /* minmax(0, 1fr)로 트랙을 고정한다. 기본 1fr(=minmax(auto,1fr))은 긴 선택명이
     트랙을 밀어 폭이 들쭉날쭉해지므로, 내용과 무관하게 항상 4등분되게 한다. */
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  /* 시트는 탭(48) + 위아래 4 = 탭 줄 56(경계선 별도). 「바텀시트에서 탭이 너무 크다」는 피드백(#648). */
  padding: ${props => (props.$variant === 'sheet' ? '4px 20px' : '16px 20px')};
  border-bottom: 1px solid var(--color-border-200);
`

/*
  단계 탭은 **고른 값**을 보여 준다(#591). 예전에는 10px 「N단계」 글자가 값보다 먼저 보였고
  (DESIGN.md 최소 Caption 12px 미만), 값은 12px 로 좁은 칸에서 세 줄로 꺾였다. 순서는 왼쪽→오른쪽
  배치와 `<ol>` 이 이미 말하므로 번호 글자를 걷어내고, 값은 13px 두 줄까지 보인다.
  아직 안 고른 단계는 「업종」처럼 단계 이름만 쓴다.
*/
const StepButton = styled.button<{
  $active: boolean
  $completed: boolean
  $variant: PanelVariant
}>`
  width: 100%;
  height: 100%;
  min-width: 0;
  /* 시트는 공용 버튼 large(48px) 높이로 맞춘다. 값 두 줄(18px × 2) + 위아래 4px 이 들어간다. */
  min-height: ${props => (props.$variant === 'sheet' ? '48px' : '56px')};
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid
    ${props =>
      props.$active ? 'var(--color-primary-600)' : 'var(--color-border-200)'};
  border-radius: var(--radius-control);
  background: ${props =>
    props.$active ? 'var(--color-primary-100)' : 'var(--color-surface)'};
  color: ${props =>
    props.$active
      ? 'var(--color-text-primary-on-light)'
      : props.$completed
        ? 'var(--color-text-800)'
        : 'var(--color-text-caption)'};
  padding: ${props => (props.$variant === 'sheet' ? '4px 6px' : '8px 6px')};
  font-size: 13px;
  font-weight: ${props => (props.$completed ? 700 : 600)};
  line-height: 18px;
  text-align: center;
  word-break: keep-all;
  cursor: pointer;
  transition:
    border-color var(--motion-fast) var(--ease-standard),
    background-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`

/* 긴 상권명은 **두 줄까지** 보이고 넘치면 말줄임한다(#591). 한 줄 말줄임 + title 툴팁은
   「홍대 걷고싶은거리」처럼 앞 단어가 같은 상권을 가르지 못하고, 툴팁은 터치에서 안 뜬다.
   잘린 이름 전체는 버튼의 접근 이름(aria-label)이 읽어 준다. */
const StepName = styled.span`
  display: -webkit-box;
  max-width: 100%;
  overflow: hidden;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
`

const Body = styled.div<{ $variant: PanelVariant }>`
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: ${props =>
    props.$variant === 'sheet' ? '8px 20px 24px' : '18px 20px 24px'};

  ${props =>
    props.$variant === 'sheet' &&
    `
      scrollbar-width: none; /* Firefox */
      -ms-overflow-style: none; /* legacy Edge */
      &::-webkit-scrollbar {
        display: none;
      }
    `}
`

/* 시트에서는 화면에서만 감춘다(#648) — 시트 머리가 같은 말(「자치구 선택」)을 하지만, 목록 영역의
   제목(h2)은 스크린리더의 제목 탐색에 남아야 한다. */
const BodyTitle = styled.div<{ $visuallyHidden: boolean }>`
  ${props => (props.$visuallyHidden ? visuallyHidden : '')}
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;

  h2 {
    color: var(--color-text-900);
    font-size: 17px;
    font-weight: 700;
  }

  span {
    color: var(--color-text-caption);
    font-size: 12px;
  }
`

const LoadingList = styled.div<{ $variant: 'grid' | 'list' }>`
  display: grid;
  gap: 8px;

  ${props =>
    props.$variant === 'grid'
      ? 'grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));'
      : ''}
`

const Footer = styled.footer<{ $variant: PanelVariant }>`
  display: grid;
  gap: ${props => (props.$variant === 'sheet' ? '4px' : '9px')};
  border-top: 1px solid var(--color-border-200);
  background: var(--color-surface);
  padding: ${props =>
    props.$variant === 'sheet'
      ? '12px 20px max(12px, env(safe-area-inset-bottom))'
      : '16px 20px max(18px, env(safe-area-inset-bottom))'};

  button {
    width: 100%;
  }
`

/*
  - `hidden`: 시트에서 덜 고른 동안의 안내. 화면에서는 감추고 CTA 의 aria-describedby 로 잇는다 — 가상 커서·버튼 탐색 때 읽힌다(#648).
  - 시트에서 다 고른 뒤의 분기 안내는 사라지는 추천 링크(44px)와 같은 높이를 미리 잡는다. 마지막 단계를
    고르는 순간 푸터 높이가 바뀌어 목록이 튀지 않게 한다.
*/
const Helper = styled.p<{ $variant: PanelVariant; $hidden: boolean }>`
  color: var(--color-text-caption);
  font-size: 12px;
  line-height: 18px;
  text-align: center;

  ${props =>
    props.$hidden
      ? visuallyHidden
      : props.$variant === 'sheet'
        ? `
          min-height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
        `
        : ''}
`

/* Footer 의 `button { width: 100% }` 에 걸리지 않도록 링크로 둔다. 주 CTA
   (「분석 결과 보기」)와 경쟁하지 않게 채움 없이 밑줄 텍스트로만 그린다. */
const RecommendEscape = styled(Link)`
  justify-self: center;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  color: var(--color-text-600);
  font-size: 13px;
  font-weight: 700;
  line-height: 20px;
  text-decoration: underline;
  text-underline-offset: 3px;

  &:hover {
    color: var(--color-text-900);
  }
`

const selectionCodeByStep = (
  selection: AnalysisSelection,
  step: AnalysisStep,
) => {
  if (step === 'district') return selection.districtCode
  if (step === 'administration') return selection.administrationCode
  if (step === 'commercial') return selection.commercialCode
  return selection.serviceCode
}

const canOpenStep = (
  selection: AnalysisSelection,
  step: AnalysisStep,
): boolean => {
  if (step === 'district') return true
  if (step === 'administration') return Boolean(selection.districtCode)
  if (step === 'commercial') return Boolean(selection.administrationCode)
  return Boolean(selection.commercialCode)
}

function AnalysisSelectionPanel({
  activeStep,
  selection,
  periodCode,
  selectedNames,
  items,
  status,
  error,
  onStepChange,
  onSelect,
  onPreviewChange,
  onRetry,
  onSubmit,
  onPopularCommercialJump,
  nameSearch,
  variant = 'panel',
}: AnalysisSelectionPanelProps) {
  const selectedCode = selectionCodeByStep(selection, activeStep)
  const isComplete = isCompleteAnalysisSelection(selection)
  /*
   * 1단계 자치구는 **서울 25개 고정 목록**이다. 0건이 나오면 사용자가 좁혀서 남는 게
   * 없는 상황이 아니라 데이터 공급 장애다. 그런데 404 와 200+빈배열이 둘 다 「선택
   * 가능한 항목이 없어요」로 나왔고, 설명 문구도 「이전 단계에서 다른 지역을 선택해
   * 주세요」라 1단계에는 맞지 않았다 — 이전 단계가 없다(#371).
   *
   * 2단계 이후(행정동·상권·업종)는 상위 선택에 따라 0건이 정상이므로 종전 문구를 쓴다.
   */
  const isFixedFirstStep = activeStep === 'district'

  // 자치구·행정동은 짧은 이름 + 설명 없음 → compact 칩 격자.
  // 상권은 분류 설명이 있어 가독성 위해 행 리스트 유지.
  const isChipStep =
    activeStep === 'district' || activeStep === 'administration'
  /*
    데스크톱 패널(380px)의 업종은 2열 선택지다(#587). 한 줄에 하나(약 52px)씩 쌓으면 스크롤 없이
    7개만 보였고, 행 끝 「›」는 하위 화면으로 넘어간다는 신호라 고르는 동작과 맞지 않았다.
    `grid-wide` 는 좌측정렬 2열 + 선택 체크만 둔다(추천 조건 선택과 같은 규격, 최소 52px).
    분류(외식업 등)는 그룹 머리로 남아 2열 위에 한 줄로 읽힌다. 모바일 시트는 이미 폭에 맞춰
    여러 열이라 그대로 둔다.
  */
  const optionLayout = isChipStep
    ? 'grid'
    : activeStep === 'service' && variant === 'panel'
      ? 'grid-wide'
      : 'list'
  const isSheet = variant === 'sheet'
  const helperId = useId()
  /*
    「지금 많이 본 상권」은 처음 들어와 아직 아무것도 고르지 않은 사람을 위한 지름길이다.
    데스크톱 패널은 1단계면 낸다(자리가 넉넉하다). 시트는 자치구를 한 번이라도 고르면 감춘다 —
    경로를 이미 정한 사람에게는 목록 자리만 먹는 방해다(#648).
  */
  const showPopularShortcut =
    activeStep === 'district' &&
    Boolean(onPopularCommercialJump) &&
    (!isSheet || !selection.districtCode)
  // 업종은 카탈로그가 6카테고리를 이미 갖고 있다. 평면으로 펼치면 31개가
  // 구분 없이 쏟아지므로 그룹 그대로 넘긴다.
  const groups = useMemo(
    () =>
      activeStep === 'service' && canGroupByDescription(items)
        ? groupOptionsByDescription(items)
        : undefined,
    [activeStep, items],
  )

  /*
    시트의 검색 자리는 시트 머리 바로 아래 한 곳이다(#648). 1단계는 이름 검색 칸, 2단계부터는 목록 필터
    (「행정동 검색」 등)가 같은 자리에 고정된다. 필터는 목록을 다루는 도구라 스크롤로 사라지면 안 되고,
    단계마다 검색 위치가 바뀌면 안 된다. 데스크톱 패널은 지금처럼 목록 위(OptionPicker 안)에 둔다.

    검색어는 「단계 + 상위 선택」 열쇠에 묶는다. 단계나 상위 선택(자치구·행정동)이 바뀌면 열쇠가 달라져
    빈 검색어로 본다 — 다른 동의 상권 목록을 이전 동의 검색어로 걸러 「검색 결과가 없어요」만 남기지 않는다.
    칸이 없으면(목록이 임계값 이하) 거르지 않는다. 지울 칸이 없는 필터는 남기지 않는다.
  */
  const sheetFilterKey = `${activeStep}:${selection.districtCode ?? ''}|${selection.administrationCode ?? ''}`
  const [sheetFilter, setSheetFilter] = useState({ key: '', query: '' })
  const sheetQuery = sheetFilter.key === sheetFilterKey ? sheetFilter.query : ''
  const setSheetQuery = (query: string) =>
    setSheetFilter({ key: sheetFilterKey, query })
  const showNameSearch = activeStep === 'district' && Boolean(nameSearch)
  const showSheetFilter =
    isSheet &&
    !showNameSearch &&
    status === 'ready' &&
    countOptions(groups ? undefined : items, groups) > OPTION_SEARCH_THRESHOLD
  /*
    행정동·업종은 목록이 거의 늘 임계값을 넘는다. 불러오는 동안 같은 높이의 꺼진 칸으로 자리를 잡아 두지
    않으면 준비가 끝나는 순간 단계 탭이 65px 밀려 내려온다. 상권은 개수 편차가 커서 예약하지 않는다.
  */
  const reserveSheetFilter =
    isSheet &&
    !showNameSearch &&
    status === 'loading' &&
    (activeStep === 'administration' || activeStep === 'service')
  const filterLabel = `${ANALYSIS_STEP_LABELS[activeStep]} 검색`

  return (
    <Root aria-label="상권 분석 조건 선택">
      {variant !== 'sheet' ? (
        <Header>
          <Title>분석할 지역을 선택해 주세요</Title>
        </Header>
      ) : null}

      {showNameSearch ? (
        <SearchSlot $variant={variant}>{nameSearch}</SearchSlot>
      ) : null}

      {showSheetFilter || reserveSheetFilter ? (
        <SearchSlot $variant={variant}>
          {/* 이름 검색 칸과 같은 높이(large 48)·채움형. 보이는 라벨·도움말 없이 placeholder 만 둔다. */}
          <TextField
            fullWidth
            emphasized
            fieldSize="large"
            type="search"
            aria-label={filterLabel}
            placeholder={filterLabel}
            value={sheetQuery}
            disabled={reserveSheetFilter}
            leftSlot={<Search aria-hidden="true" />}
            onClear={() => setSheetQuery('')}
            onChange={event => setSheetQuery(event.target.value)}
          />
        </SearchSlot>
      ) : null}

      <StepList aria-label="분석 조건 단계" $variant={variant}>
        {ANALYSIS_STEPS.map(step => {
          const name = selectedNames[step]
          const stepLabel = ANALYSIS_STEP_LABELS[step]
          /* 이름을 아직 모르면(목록 로딩 중) 고른 값 대신 단계 이름을 쓴다. */
          const completed = Boolean(
            selectionCodeByStep(selection, step) && name,
          )
          return (
            <li key={step}>
              <StepButton
                type="button"
                $active={activeStep === step}
                $completed={completed}
                $variant={variant}
                aria-current={activeStep === step ? 'step' : undefined}
                aria-label={completed ? `${stepLabel}: ${name}` : stepLabel}
                disabled={!canOpenStep(selection, step)}
                onClick={() => onStepChange(step)}
              >
                <StepName>{completed ? name : stepLabel}</StepName>
              </StepButton>
            </li>
          )
        })}
      </StepList>

      {/*
        4단계를 밟지 않고도 「남들이 보는 상권」으로 곧장 갈 수 있는 지름길. 1단계에서만
        낸다 — 자치구를 이미 고른 사람에게 다른 자치구의 상권을 들이밀 이유가 없다.
      */}
      {showPopularShortcut && !isSheet && onPopularCommercialJump ? (
        <PopularCommercialsShortcut onJump={onPopularCommercialJump} />
      ) : null}

      <Body $variant={variant}>
        {/*
          제목은 시트에서 화면에서만 감춘다. 시트 머리가 이미 「자치구 선택」을 말하지만, 제목 탐색에는
          남아야 한다. 지름길(h3)보다 먼저 둬 제목 순서를 지킨다.
        */}
        <BodyTitle $visuallyHidden={isSheet}>
          <h2>{ANALYSIS_STEP_LABELS[activeStep]} 선택</h2>
          {status === 'ready' ? <span>{items.length}개</span> : null}
        </BodyTitle>

        {/*
          시트에서는 목록 스크롤의 첫 블록이다(#648). 단계 탭 아래에 따로 세우면 스크롤해도
          그 자리를 계속 먹어 자치구 카드가 반 줄만 보였다. 지도 앱 시트처럼 고정 영역은
          검색·단계 같은 이동 수단에만 쓰고, 인기 지름길 같은 콘텐츠는 목록과 함께 올라간다.
        */}
        {showPopularShortcut && isSheet && onPopularCommercialJump ? (
          <PopularCommercialsShortcut
            onJump={onPopularCommercialJump}
            variant="inline"
          />
        ) : null}

        {status === 'loading' ? (
          <LoadingList
            role="status"
            aria-label="선택 항목 불러오는 중"
            $variant={isChipStep ? 'grid' : 'list'}
          >
            {Array.from({ length: isChipStep ? 9 : 5 }, (_, index) => (
              <Skeleton key={index} $height={isChipStep ? '44px' : '52px'} />
            ))}
          </LoadingList>
        ) : null}

        {status === 'error' ? (
          <EmptyState
            title={
              error?.kind === 'not-found' && !isFixedFirstStep
                ? '선택 가능한 항목이 없어요'
                : '목록을 불러오지 못했어요'
            }
            description={
              error?.kind === 'not-found' && isFixedFirstStep
                ? FIRST_STEP_OUTAGE_DESCRIPTION
                : (error?.message ?? '잠시 후 다시 시도해 주세요.')
            }
            action={
              !error || isRetryable(error.kind) ? (
                <Button
                  size="medium"
                  variant="secondary"
                  leftIcon={<RotateCcw />}
                  onClick={onRetry}
                >
                  다시 시도
                </Button>
              ) : undefined
            }
          />
        ) : null}

        {status === 'empty' ? (
          isFixedFirstStep ? (
            <EmptyState
              title="자치구 목록을 불러오지 못했어요"
              description={FIRST_STEP_OUTAGE_DESCRIPTION}
              action={
                <Button
                  size="medium"
                  variant="secondary"
                  leftIcon={<RotateCcw />}
                  onClick={onRetry}
                >
                  다시 시도
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="선택 가능한 항목이 없어요"
              description="이전 단계에서 다른 지역을 선택해 주세요."
            />
          )
        ) : null}

        {status === 'ready' ? (
          <OptionPicker
            groups={groups}
            items={groups ? undefined : items}
            layout={optionLayout}
            selectedCode={selectedCode}
            variant={variant}
            emptyFallback={
              activeStep === 'service' ? POPULAR_SERVICE_FALLBACK : undefined
            }
            searchPlaceholder={filterLabel}
            externalQuery={
              isSheet ? (showSheetFilter ? sheetQuery : '') : undefined
            }
            /*
              1단계에 이름 검색 칸이 있으면 자치구 목록의 검색 칸은 숨긴다(#596). 검색 칸 두 개가 위아래로
              서면 어느 쪽에 입력할지 헷갈린다. 자치구 이름은 이름 검색 칸에서도 찾는다.
            */
            searchThreshold={
              showNameSearch ? Number.POSITIVE_INFINITY : undefined
            }
            onPreviewChange={onPreviewChange}
            onSelect={onSelect}
          />
        ) : null}
      </Body>

      <Footer $variant={variant}>
        <Button
          size="large"
          disabled={!isComplete}
          aria-describedby={helperId}
          onClick={onSubmit}
        >
          분석 결과 보기
        </Button>
        {/*
          시트에서는 덜 고른 동안의 안내(「자치구를 선택해 주세요」)를 화면에서만 감춘다. 시트 머리
          (「자치구 선택」)와 강조된 단계 탭이 같은 말을 하고, 그 18px 이 목록 자리다(#648). 비활성
          CTA 의 aria-describedby 로 이어 가상 커서·버튼 탐색 때 꺼진 이유가 읽힌다. 다 고른 뒤의 분기 안내는 다른 곳에
          없는 정보라 보인다.
        */}
        <Helper
          id={helperId}
          $variant={variant}
          $hidden={isSheet && !isComplete}
        >
          {isComplete
            ? `${periodCode ? formatPeriodCode(periodCode) : '최신 분기'} 기준으로 분석해요`
            : describeAnalysisSelectionGap(selection)}
        </Helper>
        {/*
          이 화면은 「어느 상권인지 이미 아는」 사람을 전제로 4단계를 요구한다.
          모르는 사람에게는 상권을 찾아 주는 `/recommend` 가 맞는 도구인데
          여기서 그리로 가는 길이 없었다(본문 내부 링크 0개).

          고른 조건은 그대로 넘긴다 — 파라미터 이름이 두 화면에서 같아서
          변환이 필요 없다(`recommend-url.ts` 참고).

          선택이 끝난 뒤에는 감춘다. 그때는 주 CTA 가 유일한 다음 걸음이어야 한다.
        */}
        {/* #597 본 작업 전 임시 문구. 동네(자치구·행정동)를 정한 사람을 전제로 한다. */}
        {isComplete ? null : (
          <RecommendEscape
            data-testid="analysis-recommend-escape"
            href={createRecommendHrefFromCodes({
              districtCode: selection.districtCode,
              administrationCode: selection.administrationCode,
              serviceCode: selection.serviceCode,
            })}
          >
            동네를 정했다면 그 안에서 상권 순위 받기
          </RecommendEscape>
        )}
      </Footer>
    </Root>
  )
}

// 호버 미리보기(previewedCode)는 페이지 최상단 state라 값이 바뀌면 페이지가
// 리렌더된다. 패널은 previewedCode를 쓰지 않으므로 memo로 감싸 props가 실제로
// 바뀔 때만 리렌더하게 한다(호버 시 칩 25개 불필요 리렌더 차단).
export default memo(AnalysisSelectionPanel)
