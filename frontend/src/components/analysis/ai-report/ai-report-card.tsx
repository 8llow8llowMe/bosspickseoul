'use client'

import { FileText } from 'lucide-react'
import styled from 'styled-components'

/*
  지도 왼쪽 위의 AI 진입 칩(#586). 로그인 여부와 상관없이 이 칩으로 시작하고, 누르면 패널을
  연다. 예전 카드(대상 이름 + 「AI 리포트 분석하기」 두 줄)나 게스트용 잠금 카드처럼 지도를
  넓게 덮지 않도록 한 줄 알약으로 줄였다. 어느 지역의 요약인지는 접근 이름에 싣는다.
*/
const ChipButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 16px 0 14px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-2);
  color: var(--color-text-900);
  font-size: 14px;
  font-weight: 700;
  line-height: 20px;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-standard);

  svg {
    width: 18px;
    height: 18px;
    flex: 0 0 auto;
    color: var(--color-text-600);
  }

  &:hover {
    background: var(--color-surface-muted);
  }
`

export default function AiReportCard({
  targetName,
  onOpen,
}: {
  targetName: string
  onOpen: () => void
}) {
  return (
    <ChipButton
      type="button"
      aria-label={targetName ? `${targetName} AI 요약 보기` : 'AI 요약 보기'}
      onClick={onOpen}
    >
      <FileText aria-hidden />
      AI 요약 보기
    </ChipButton>
  )
}
