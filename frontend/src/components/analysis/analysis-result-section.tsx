import type { ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'
import styled from 'styled-components'

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
  loading: boolean
  /**
   * 정규화된 API 오류(`resolveApiError(query)`). 성공이면 null.
   * 재시도 버튼 노출은 `isRetryable(kind)`만 보고 결정한다 — 상태 코드를 여기서 비교하지 않는다.
   */
  error: NormalizedApiError | null
  empty: boolean
  emptyDescription?: string
  onRetry?: () => void
  children?: ReactNode
}

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
 * 이 컴포넌트는 분석 결과 뷰 전용이고, 각 그룹 헤딩 줄에 연/분기 선택이 항상 함께 있다.
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
const PERIOD_HINT = '위 기간 선택에서 다른 연도·분기를 골라 보세요.'

const describeNotFound = (message: string): string =>
  PERIOD_DEPENDENT_MESSAGE.test(message) && !message.includes('다른 분기')
    ? `${message} ${PERIOD_HINT}`
    : message

export default function AnalysisResultSection({
  title,
  description,
  badge,
  footer,
  loading,
  error,
  empty,
  emptyDescription = '이 조건에서 제공되는 데이터가 없어요.',
  onRetry,
  children,
}: AnalysisResultSectionProps) {
  return (
    <Section>
      <Header>
        <h2>
          {title}
          {badge}
        </h2>
        {description ? <p>{description}</p> : null}
      </Header>

      {loading ? (
        <Loading role="status" aria-label={`${title} 불러오는 중`}>
          <Skeleton $height="18px" $width="42%" />
          <Skeleton $height="96px" />
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
    </Section>
  )
}
