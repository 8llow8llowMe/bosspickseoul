'use client'

import { useState } from 'react'
import { Maximize2, X } from 'lucide-react'
import styled from 'styled-components'

import AiReportBody from '@/components/analysis/ai-report-body'
import { AnalysisResultModalSurface } from '@/components/analysis/analysis-result-modal'
import type { AnalysisSelection } from '@/lib/analysis/selection'

const Shell = styled.aside`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-surface);
`

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border-200);
`

const HeaderText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const Title = styled.h3`
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-900);
`

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`

const IconButton = styled.button`
  display: inline-flex;
  padding: 6px;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--color-text-600);
  cursor: pointer;
`

const Body = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
`

const ModalHeader = styled.div`
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px 0;
  background: var(--color-surface);
`

/** AnalysisResultModalSurface의 Surface는 공용 회색 배경(--color-surface-muted)을
 * 유지해야 하는(라우트 결과 모달과 공유) 컴포넌트라 여기서 바꾸지 않는다. 대신
 * 이 래퍼가 모달 내부 전체를 흰 배경으로 엣지-투-엣지 채우고, 그 안에서 콘텐츠만
 * 전용 페이지의 Content 래퍼(width:min(1080px))와 같은 폭으로 중앙 정렬한다. */
const ModalBody = styled.div`
  width: 100%;
  min-height: 100%;
  background: var(--color-surface);
`

const ModalContent = styled.div`
  width: min(1080px, 100%);
  margin: 0 auto;
  padding: clamp(16px, 3vw, 28px);
`

export default function AiReportPanel({
  targetName,
  selection,
  onClose,
}: {
  targetName: string
  selection: AnalysisSelection
  onClose: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Shell aria-label={`${targetName} AI 리포트`}>
      <Header>
        <HeaderText>
          <Title>{targetName} AI 리포트</Title>
        </HeaderText>
        <HeaderActions>
          <IconButton
            type="button"
            aria-label="크게보기"
            onClick={() => setExpanded(true)}
          >
            <Maximize2 size={18} aria-hidden />
          </IconButton>
          <IconButton type="button" aria-label="닫기" onClick={onClose}>
            <X size={18} aria-hidden />
          </IconButton>
        </HeaderActions>
      </Header>
      <Body>
        <AiReportBody selection={selection} variant="compact" />
      </Body>
      {expanded ? (
        <AnalysisResultModalSurface
          onClose={() => setExpanded(false)}
          ariaLabel={`${targetName} AI 리포트`}
        >
          <ModalHeader>
            <IconButton
              type="button"
              aria-label={`${targetName} AI 리포트 닫기`}
              onClick={() => setExpanded(false)}
            >
              <X size={18} aria-hidden />
            </IconButton>
          </ModalHeader>
          <ModalBody>
            <ModalContent>
              <AiReportBody
                selection={selection}
                variant="full"
                title={targetName}
              />
            </ModalContent>
          </ModalBody>
        </AnalysisResultModalSurface>
      ) : null}
    </Shell>
  )
}
