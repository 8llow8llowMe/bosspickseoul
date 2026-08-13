import Link from 'next/link'
import { Lock } from 'lucide-react'
import styled from 'styled-components'

import {
  CommercialReportBlocks,
  RegionReportBlocks,
} from '@/components/analysis/ai-report/report-blocks'
import {
  sampleCommercialView,
  sampleRegionView,
} from '@/lib/analysis/ai-report-samples'
import type { AiReportLevel } from '@/types/ai-report'

const Wrap = styled.div`
  position: relative;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-2);
  overflow: hidden;
`
const Sample = styled.div`
  padding: 12px 16px;
  filter: blur(6px);
  opacity: 0.6;
  pointer-events: none;
  user-select: none;
`
const Overlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 20px;
  text-align: center;
  background: color-mix(in srgb, var(--color-surface) 70%, transparent);
`
const Copy = styled.p`
  font-size: 14px;
  line-height: 21px;
  color: var(--color-text-900);
  font-weight: 700;
`
const Cta = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  border-radius: var(--radius-control);
  background: var(--color-primary-700);
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  transition: background-color var(--motion-fast) var(--ease-standard);

  &:hover {
    background: var(--color-primary-600);
  }
`

export default function AiReportLockCard({
  level,
  loginHref,
}: {
  level: AiReportLevel
  loginHref: string
}) {
  const isCommercial = level === 'commercial'
  return (
    <Wrap>
      <Sample aria-hidden="true">
        {isCommercial ? (
          <CommercialReportBlocks view={sampleCommercialView} />
        ) : (
          <RegionReportBlocks view={sampleRegionView} />
        )}
      </Sample>
      <Overlay>
        <Lock size={22} aria-hidden />
        <Copy>이 지역의 강점·리스크·추천 업종을 AI가 요약해 드려요</Copy>
        <Cta href={loginHref}>로그인하고 AI 리포트 보기</Cta>
      </Overlay>
    </Wrap>
  )
}
