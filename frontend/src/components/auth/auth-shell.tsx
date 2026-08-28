import Link from 'next/link'
import type { ReactNode } from 'react'
import styled from 'styled-components'

const Container = styled.div`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px 20px;
  background: var(--color-background-muted);
`

const Frame = styled.div`
  width: min(520px, 100%);
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-sheet);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-2);
`

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 32px;

  @media (max-width: 640px) {
    padding: 24px 20px;
  }
`

const Eyebrow = styled.p`
  margin-bottom: 8px;
  color: var(--color-text-caption);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
`

const Title = styled.h1`
  color: var(--color-text-900);
  font-size: 26px;
  font-weight: 700;
  line-height: 36px;
  letter-spacing: 0;
`

const Description = styled.p`
  margin-top: 8px;
  color: var(--color-text-600);
  font-size: 16px;
  line-height: 24px;
  word-break: keep-all;
`

export const AuthForm = styled.form`
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
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  outline: none;
  background: var(--color-surface-muted);
  color: var(--color-text-900);
  transition:
    border-color var(--motion-fast) var(--ease-standard),
    box-shadow var(--motion-fast) var(--ease-standard),
    background-color var(--motion-fast) var(--ease-standard);

  &::placeholder {
    color: var(--color-placeholder);
  }

  &:focus {
    border-color: var(--color-primary-700);
    background: var(--color-surface);
    box-shadow: var(--shadow-focus-primary);
  }

  /* DESIGN.md §Error (inline field): red500 2px 테두리. 프롭이 아니라 aria-invalid 를
     선택자로 삼아 시각 표시와 보조기술 표시가 갈라질 수 없게 한다. box-sizing 이
     border-box 라 높이 48px 는 유지된다. */
  &[aria-invalid='true'] {
    border: 2px solid var(--color-danger);
  }

  &[aria-invalid='true']:focus {
    border-color: var(--color-danger);
    box-shadow: var(--shadow-focus-danger);
  }
`

/** DESIGN.md §Error (inline field) 의 「error text below in red500 13px」. */
export const FieldError = styled.span`
  color: var(--color-danger);
  font-size: 13px;
  line-height: 20px;
`

export const PrimaryButton = styled.button`
  height: 48px;
  padding: 0 18px;
  border: none;
  border-radius: var(--radius-control);
  background: var(--color-primary-700);
  color: white;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    opacity var(--motion-fast) var(--ease-standard);

  &:hover {
    background: var(--color-primary-600);
  }

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
  color: var(--color-primary-700);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: var(--button-disabled-opacity-color);
  }
`

export const HelperText = styled.p`
  color: var(--color-text-500);
  font-size: 13px;
  line-height: 1.6;
`

export const Notice = styled.p<{ $tone?: 'error' | 'success' | 'info' }>`
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
    return 'var(--color-primary-700)'
  }};
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-line;
`

export const FooterRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--color-text-500);
  font-size: 14px;
`

export const FooterLink = styled(Link)`
  color: var(--color-primary-700);
  font-weight: 600;
`

export const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--color-text-500);
  font-size: 13px;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--color-border-200);
  }
`

type AuthShellProps = {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}

export default function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: AuthShellProps) {
  return (
    <Container>
      <Frame>
        <Content>
          <div>
            <Eyebrow>{eyebrow}</Eyebrow>
            <Title>{title}</Title>
            <Description>{description}</Description>
          </div>
          {children}
        </Content>
      </Frame>
    </Container>
  )
}
