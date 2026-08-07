import { Sparkles } from 'lucide-react'
import styled from 'styled-components'

const CardButton = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-2);
  color: var(--color-text-900);
  cursor: pointer;
  text-align: left;
`

const Label = styled.span`
  display: grid;
  gap: 2px;
`

const Target = styled.span`
  font-size: 12px;
  color: var(--color-text-600);
`

const Cta = styled.span`
  font-size: 14px;
  font-weight: 700;
`

export default function AiReportCard({
  targetName,
  onOpen,
}: {
  targetName: string
  onOpen: () => void
}) {
  return (
    <CardButton type="button" onClick={onOpen}>
      <Sparkles size={18} aria-hidden />
      <Label>
        <Target>{targetName}</Target>
        <Cta>AI 리포트 분석하기</Cta>
      </Label>
    </CardButton>
  )
}
