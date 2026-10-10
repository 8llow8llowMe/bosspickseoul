'use client'

import Link from 'next/link'
import styled, { css } from 'styled-components'

import { Button } from '@/components/ui/button'

export const SectionStack = styled.div`
  display: grid;
  gap: 20px;
`

export const SectionPanel = styled.section`
  padding: 24px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-1);

  @media (max-width: 640px) {
    padding: 20px;
  }
`

export const SectionTitle = styled.h2`
  color: var(--color-text-900);
  font-size: 22px;
  font-weight: 700;
  line-height: 30px;
  letter-spacing: 0;
`

export const SectionBody = styled.p`
  margin-top: 10px;
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 22px;
  word-break: keep-all;
`

export const SectionNotice = styled.p<{ $tone?: 'error' | 'success' | 'info' }>`
  padding: 12px 14px;
  border-radius: var(--radius-control);
  background: ${props => {
    if (props.$tone === 'error') return 'rgba(240, 68, 82, 0.1)'
    if (props.$tone === 'success') return 'rgba(3, 178, 108, 0.1)'
    return 'var(--color-primary-100)'
  }};
  color: ${props => {
    if (props.$tone === 'error') return 'var(--color-danger)'
    if (props.$tone === 'success') return 'var(--color-success)'
    return 'var(--color-text-primary-on-light)'
  }};
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-line;
`

export const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`

export const ContentCard = styled.article`
  /* 카드 전체를 덮는 링크(CardStretchedLink)의 기준 상자다. */
  position: relative;
  padding: 20px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface-muted);
`

/** 카드 머리 — 제목 묶음과 오른쪽 위험 동작(해제·삭제). */
export const CardHeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`

/*
  카드 전체를 누를 수 있게 하는 링크(#574). 링크는 제목 글자에만 걸고 `::after` 로 카드를 덮는다 — 카드 안에
  해제 버튼이 있어 카드를 통째로 `<a>` 로 감쌀 수 없다(링크 안 버튼은 HTML 위반이다). 덮인 버튼은 `CardOverlayAction`
  으로 위에 올린다. 포커스 링은 글자가 아니라 카드 둘레에 그린다.
*/
const stretchedTarget = css`
  color: inherit;
  font: inherit;
  text-align: left;
  text-decoration: none;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: var(--radius-card);
  }

  &:focus-visible {
    outline: none;
  }

  &:focus-visible::after {
    outline: 2px solid var(--color-primary-700);
    outline-offset: 2px;
  }
`

export const CardStretchedLink = styled(Link)`
  ${stretchedTarget}
`

/** 주소를 눌러 봐야 아는 카드(상권 → 상위 코드 역조회)용. 생김새는 링크와 같다. */
export const CardStretchedButton = styled.button.attrs({ type: 'button' })`
  ${stretchedTarget}
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;

  &:disabled {
    cursor: progress;
  }
`

/** 덮는 링크 위로 올라와 따로 눌리는 동작. */
export const CardOverlayAction = styled.div`
  position: relative;
  z-index: 1;
  flex: 0 0 auto;
`

/*
  위험 동작(해제·삭제)은 위험색 ghost 다(#574). 채움 버튼이면 주 행동처럼 보이고, 보조(파란) 버튼이면 「이름 수정」과
  같은 무게라 옆에 붙은 쪽을 잘못 누른다. 글자색은 면적용 red500 이 아니라 글자용 `--color-negative-text`(AA).
  히트 영역은 44px(DESIGN.md §Touch Targets).
*/
export const DangerGhostButton = styled(Button).attrs({
  variant: 'ghost',
  size: 'medium',
})`
  min-height: 44px;
  color: var(--color-negative-text);

  &:hover:not(:disabled) {
    color: var(--color-negative-text);
  }
`

export const CardEyebrow = styled.p`
  margin-bottom: 8px;
  color: var(--color-text-caption);
  font-size: 13px;
  font-weight: 600;
`

export const CardTitle = styled.h3`
  color: var(--color-text-900);
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
`

export const CardText = styled.p`
  margin-top: 10px;
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 22px;
`

export const MetaList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
`

export const MetaItem = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 12px;
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  color: var(--color-text-700);
  font-size: 13px;
  font-weight: 600;
`

export const EmptyState = styled.div`
  display: grid;
  justify-items: start;
  gap: 14px;
  padding: 24px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 22px;
  background: var(--color-surface);
`

export const Form = styled.form`
  display: grid;
  gap: 16px;
`

export const Field = styled.label`
  display: grid;
  gap: 8px;
`

export const FieldLabel = styled.span`
  color: var(--color-text-700);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
`

export const TextInput = styled.input`
  width: 100%;
  height: 48px;
  padding: 0 14px;
  /* 채움형 — 평상시 테두리 없음(DESIGN.md §Inputs & Forms). */
  border: 2px solid transparent;
  border-radius: var(--radius-field);
  background: var(--color-surface-muted);
  color: var(--color-text-900);
  transition:
    border-color var(--motion-fast) var(--ease-standard),
    box-shadow var(--motion-fast) var(--ease-standard),
    background-color var(--motion-fast) var(--ease-standard);

  /* 포커스 신호는 테두리 하나다 — 전역 :focus-visible 링을 끈다(DESIGN.md §Inputs & Forms).
     기본값의 outline: none 은 전역 규칙과 특이도가 같아 순서에 밀린다. */
  &,
  &:focus,
  &:focus-visible {
    outline: none;
  }

  &:focus {
    border-color: var(--color-primary-700);
    background: var(--color-surface);
    box-shadow: var(--shadow-focus-primary);
  }
`

export const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`

export const PrimaryButton = styled.button`
  height: 48px;
  padding: 0 18px;
  border: none;
  border-radius: var(--radius-control);
  background: var(--color-fill-primary-text);
  color: white;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: var(--button-disabled-opacity-color);
  }
`

export const SecondaryButton = styled.button`
  height: 48px;
  padding: 0 18px;
  border: 1px solid transparent;
  border-radius: var(--radius-control);
  background: var(--color-primary-100);
  color: var(--color-text-primary-on-light);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
`

export const HelperText = styled.p`
  color: var(--color-text-caption);
  font-size: 13px;
  line-height: 20px;
`

export const CheckboxRow = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  color: var(--color-text-700);
  line-height: 1.7;

  input {
    width: 18px;
    height: 18px;
    margin-top: 3px;
  }
`
