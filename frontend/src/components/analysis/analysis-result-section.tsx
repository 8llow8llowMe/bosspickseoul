'use client'

import { useId, useState, type ReactNode } from 'react'
import { ChevronDown, RotateCcw } from 'lucide-react'
import styled, { css } from 'styled-components'

import { Button } from '@/components/ui/button'
import EmptyState from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { isRetryable, type NormalizedApiError } from '@/lib/api/api-error'

export type AnalysisResultSectionProps = {
  title: string
  description?: string
  /**
   * 제목 오른쪽 배지. 「이 섹션의 값이 평소와 다른 뜻」일 때만 붙인다
   * (예: 상권 소비를 행정동 값으로 대체했다는 표시, #416).
   * 항상 붙는 꼬리표로 쓰지 않는다 — 늘 있으면 아무 말도 하지 않는다.
   */
  badge?: ReactNode
  /**
   * 본문 아래 각주. 면책 문장·출처 링크처럼 **값에 딸린 단서**를 둔다.
   * 불러오는 중과 오류일 때는 붙일 값 자체가 없으므로 그리지 않는다.
   */
  footer?: ReactNode
  /**
   * 불러오는 중 본문 자리 높이(px). 기본 96 은 카드·목록 섹션 기준이다.
   * 차트 카드는 그려질 본문 높이를 넘겨 로딩이 끝날 때 아래 카드가 밀리지 않게 한다 —
   * 96px 자리에 260px 차트가 들어오면 그 차이만큼 화면이 한 번에 내려간다.
   */
  loadingHeight?: number
  loading: boolean
  /**
   * 정규화된 API 오류(`resolveApiError(query)`). 성공이면 null.
   * 재시도 버튼 노출은 `isRetryable(kind)`만 보고 결정한다 — 상태 코드를 여기서 비교하지 않는다.
   */
  error: NormalizedApiError | null
  empty: boolean
  emptyDescription?: string
  onRetry?: () => void
  /**
   * 카드 그리드가 1열인 폭(`analysis-report` 컨테이너 <640px)에서 **접힌 채로 시작**한다.
   * 제목이 펼침 버튼이 되고 설명(차트 결론 문장)은 접혀도 보인다. 그보다 넓으면 버튼 없이
   * 늘 펼쳐져 있다 — 접기는 1열 스택이 길어지는 문제만 푼다.
   *
   * 오류와 빈 상태는 접지 않는다. 재시도 버튼이나 「데이터 없음」을 펼쳐야 보이면
   * 접힌 카드가 정상 값처럼 읽힌다.
   */
  collapsible?: boolean
  children?: ReactNode
}

/** 접기가 켜지는 폭 — `DashboardGrid` 가 1열이 되는 폭과 같다. */
const narrowReport = (rules: ReturnType<typeof css>) => css`
  @container analysis-report (max-width: 639px) {
    ${rules}
  }
`

const Section = styled.section`
  display: grid;
  gap: 18px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-1);
  padding: 22px;

  @media (max-width: 640px) {
    padding: 18px;
  }
`

const Header = styled.header`
  display: grid;
  gap: 5px;

  h2 {
    margin: 0;
    /* 배지를 제목 오른쪽에 같은 줄로 두되, 좁은 화면에서는 아래로 흘린다. */
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    color: var(--color-text-900);
    font-size: 18px;
    font-weight: 700;
    line-height: 27px;
  }

  p {
    color: var(--color-text-600);
    font-size: 13px;
    line-height: 20px;
  }
`

/**
 * 넓은 폭의 제목. 접을 수 있는 카드는 좁은 폭에서 이 제목 대신 `ToggleTitle` 을 보인다.
 * `&&` 는 `Header` 의 `h2 { display: flex }`(클래스 + 요소)보다 우선하게 한다.
 */
const StaticTitle = styled.h2<{ $collapsible: boolean }>`
  ${props =>
    props.$collapsible
      ? narrowReport(css`
          && {
            display: none;
          }
        `)
      : ''}
`

/**
 * 좁은 폭에서만 보이는 펼침 버튼 제목. `display: none` 으로 숨겨 두면 접근성 트리와 탭 순서에서도
 * 빠지므로, 넓은 폭에는 아무 일도 하지 않는 버튼이 남지 않는다.
 */
const ToggleTitle = styled.h2`
  && {
    display: none;
  }

  ${narrowReport(css`
    && {
      display: flex;
    }
  `)}
`

const ToggleButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  /* 제목 한 줄(27px)이지만 터치 대상은 44px 를 둔다(DESIGN.md Touch Targets). */
  min-height: 44px;
  margin: -8px 0;
  border: 0;
  padding: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;

  /* 제목과 배지는 넓은 폭 제목(Header h2)처럼 한 줄에 두고 좁으면 흘린다. */
  > span {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  > svg {
    flex: none;
    width: 20px;
    height: 20px;
    color: var(--color-text-600);
    transition: transform 0.2s ease;
  }

  &[aria-expanded='true'] > svg {
    transform: rotate(180deg);
  }

  @media (prefers-reduced-motion: reduce) {
    > svg {
      transition: none;
    }
  }
`

/** 본문 + 각주. 접히면 좁은 폭에서만 숨는다. */
const Body = styled.div<{ $collapsed: boolean }>`
  display: grid;
  gap: 18px;
  min-width: 0;

  ${props =>
    props.$collapsed
      ? narrowReport(css`
          display: none;
        `)
      : ''}
`

const Loading = styled.div`
  display: grid;
  gap: 10px;
`

const Footer = styled.footer`
  display: grid;
  gap: 6px;
  border-top: 1px solid var(--color-border-200);
  padding-top: 12px;
  color: var(--color-text-caption);
  font-size: 12px;
  line-height: 19px;

  a {
    color: var(--color-primary-700);
    text-decoration: underline;
  }
`

/**
 * 404(데이터 부재)일 때 다음 행동을 기간 드롭다운으로 유도한다.
 * 이 컴포넌트는 분석 결과 뷰 전용이고, 연/분기 선택은 결과 화면 sticky 헤더에 하나 있다.
 *
 * 단, 힌트는 **분기를 바꾸면 결과가 달라질 수 있는 404** 에만 의미가 있다.
 * 백엔드 규약(`backend/docs/api-reference.md` "오류 처리 규약")상 분기 종속 404 메시지는
 * 전부 "해당 분기의 X 데이터가 없습니다. 다른 분기를 선택해 주세요." 형식으로 시작하고,
 * 기간과 무관한 404(`COMMERCIAL_002` "존재하지 않는 상권입니다.", 전파되는
 * `REGION_002~004` "해당 자치구/행정동/상권 코드를 찾을 수 없습니다.")는 이 형식을 쓰지 않는다.
 * 후자에 기간 힌트를 붙이면 연/분기를 아무리 바꿔도 같은 404 인데 그쪽으로 유도하게 된다.
 *
 * `resultCode` 화이트리스트로 분기하지 않는다 — 규약이 "클라이언트는 에러코드 목록을
 * 관리할 필요 없이 HTTP 상태만으로 UI 를 분기한다"이므로 문구 기반이 규약에 맞다.
 */
const PERIOD_DEPENDENT_MESSAGE = /^해당 분기/
const PERIOD_HINT = '헤더의 기간 선택에서 다른 연도·분기를 골라 보세요.'

const describeNotFound = (message: string): string =>
  PERIOD_DEPENDENT_MESSAGE.test(message) && !message.includes('다른 분기')
    ? `${message} ${PERIOD_HINT}`
    : message

export default function AnalysisResultSection({
  title,
  description,
  badge,
  footer,
  loadingHeight = 96,
  loading,
  error,
  empty,
  emptyDescription = '이 조건에서 제공되는 데이터가 없어요.',
  onRetry,
  collapsible = false,
  children,
}: AnalysisResultSectionProps) {
  const bodyId = useId()
  const [open, setOpen] = useState(false)
  const showsNotice = !loading && (error !== null || empty)
  const canCollapse = collapsible && !showsNotice
  return (
    <Section>
      <Header>
        <StaticTitle $collapsible={canCollapse}>
          {title}
          {badge}
        </StaticTitle>
        {canCollapse ? (
          <ToggleTitle>
            <ToggleButton
              type="button"
              aria-expanded={open}
              aria-controls={bodyId}
              onClick={() => setOpen(value => !value)}
            >
              <span>
                {title}
                {badge}
              </span>
              <ChevronDown aria-hidden="true" />
            </ToggleButton>
          </ToggleTitle>
        ) : null}
        {description ? <p>{description}</p> : null}
      </Header>

      <Body id={bodyId} $collapsed={canCollapse && !open}>
        {loading ? (
          <Loading role="status" aria-label={`${title} 불러오는 중`}>
            <Skeleton $height="18px" $width="42%" />
            <Skeleton $height={`${loadingHeight}px`} />
          </Loading>
        ) : error ? (
          <EmptyState
            title={
              error.kind === 'not-found'
                ? `${title} 데이터가 없어요`
                : `${title} 정보를 불러오지 못했어요`
            }
            description={
              error.kind === 'not-found'
                ? describeNotFound(error.message)
                : error.message
            }
            action={
              onRetry && isRetryable(error.kind) ? (
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
        ) : empty ? (
          <EmptyState
            title={`${title} 데이터가 없어요`}
            description={emptyDescription}
          />
        ) : (
          children
        )}

        {footer && !loading && !error ? <Footer>{footer}</Footer> : null}
      </Body>
    </Section>
  )
}
