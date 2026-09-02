'use client'

import Link from 'next/link'
import { useState } from 'react'
import { RotateCcw, Sparkles } from 'lucide-react'
import styled from 'styled-components'

import { ComparisonReportBlocks } from '@/components/analysis/ai-report/report-blocks'
import { Button } from '@/components/ui/button'
import { useAiReport } from '@/hooks/use-ai-report'
import { buildLoginHref } from '@/lib/auth/return-path'
import { useAuthStore } from '@/stores/auth-store'

export type RecommendComparisonAiPanelProps = {
  leftCommercialCode: string
  rightCommercialCode: string
  serviceCode: string
  /** 로그인 후 돌아올 곳. 지금 비교 화면의 전체 경로다. */
  returnTo: string
}

const Root = styled.section`
  display: grid;
  gap: 12px;
  padding: 18px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
`

const Head = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`

const Heading = styled.h2`
  color: var(--color-text-900);
  font-size: 16px;
  font-weight: 700;
  line-height: 24px;
`

const Lead = styled.p`
  color: var(--color-text-600);
  font-size: 13px;
  line-height: 20px;
  word-break: keep-all;
`

const StatusText = styled.p`
  padding: 8px 0;
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 21px;
`

const ErrorText = styled.p`
  color: var(--color-text-700);
  font-size: 14px;
  line-height: 21px;
  word-break: keep-all;
`

const LoginLink = styled(Link)`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  padding: 0 14px;
  border-radius: var(--radius-control);
  background: var(--color-primary-700);
  color: var(--color-on-primary);
  font-size: 13px;
  font-weight: 700;
`

/**
 * 비교 화면 안에 **인라인으로** 펼치는 AI 비교 리포트.
 *
 * 전용 페이지를 만들지 않는다 — 비교 표와 리포트는 같이 봐야 의미가 있고, 화면을
 * 나누면 좌·우 맥락이 끊긴다.
 *
 * 🔒 **로그인 게이트는 이 버튼에만 건다.** 비교 조회(`/commercials/compare`)는 인증이
 * 필요 없어서 표와 리포트 영역은 비로그인에게도 그대로 보인다. AI 제출만
 * `bearerAuth` 다 — 화면 전체를 잠그면 볼 수 있는 것까지 가린다.
 *
 * 요청은 **사용자가 누를 때** 시작한다(`started`). 화면에 들어오자마자 자동 제출하면
 * 비교만 보러 온 사람의 AI 일일 사용량을 말없이 깎는다.
 */
export default function RecommendComparisonAiPanel({
  leftCommercialCode,
  rightCommercialCode,
  serviceCode,
  returnTo,
}: RecommendComparisonAiPanelProps) {
  const hasHydrated = useAuthStore(auth => auth.hasHydrated)
  const isLoggedIn = useAuthStore(auth => auth.isLoggedIn)
  const [started, setStarted] = useState(false)

  const { state, retry } = useAiReport({
    level: 'comparison',
    code: leftCommercialCode,
    rightCode: rightCommercialCode,
    serviceCode,
    active: started,
    enabled: hasHydrated && isLoggedIn,
  })

  const renderBody = () => {
    if (state.status === 'ready-comparison') {
      return <ComparisonReportBlocks view={state.view} />
    }
    if (state.status === 'loading') {
      return (
        <StatusText role="status">
          {state.stage?.description ?? 'AI 가 두 상권을 비교하는 중이에요.'}
        </StatusText>
      )
    }
    if (state.status === 'empty') {
      return (
        <StatusText>
          이 조건에서는 AI 가 만들 수 있는 비교 인사이트가 없었어요.
        </StatusText>
      )
    }
    if (state.status === 'error') {
      return (
        <>
          <ErrorText>{state.message}</ErrorText>
          {state.canRetry ? (
            <Button
              size="medium"
              variant="secondary"
              leftIcon={<RotateCcw />}
              onClick={retry}
            >
              다시 시도
            </Button>
          ) : null}
        </>
      )
    }
    return null
  }

  return (
    <Root aria-label="AI 비교 리포트">
      <Head>
        <Heading>AI 비교 리포트</Heading>

        {/*
          하이드레이션 전에는 로그인 여부를 모른다. 그때 버튼을 그리면 비로그인에게
          잠깐 눌리는 버튼이 보였다가 바뀐다 — 아무것도 안 그리는 편이 정직하다.
        */}
        {!hasHydrated ? null : !isLoggedIn ? (
          <LoginLink href={buildLoginHref(returnTo)}>
            로그인하고 받아보기
          </LoginLink>
        ) : !started ? (
          <Button
            size="medium"
            variant="secondary"
            leftIcon={<Sparkles />}
            onClick={() => setStarted(true)}
          >
            AI 인사이트 받기
          </Button>
        ) : null}
      </Head>

      {!started || !isLoggedIn ? (
        <Lead>
          두 상권의 위험·시간대·고객층을 AI 가 견줘서 운영 전략까지 정리해 줘요.
        </Lead>
      ) : null}

      {started && isLoggedIn ? renderBody() : null}
    </Root>
  )
}
