import Link from 'next/link'
import type { ReactNode } from 'react'
import styled from 'styled-components'

const Container = styled.div`
  min-height: 100vh;
  padding: 32px 24px;
  background:
    radial-gradient(
      circle at top left,
      rgba(51, 109, 211, 0.12),
      transparent 30%
    ),
    linear-gradient(180deg, #f8fbff 0%, #f2f7ff 100%);
`

const Frame = styled.div`
  width: min(1200px, 100%);
  min-height: calc(100vh - 64px);
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 520px) minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid rgba(21, 73, 181, 0.12);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 24px 64px rgba(21, 73, 181, 0.12);

  @media (max-width: 1024px) {
    min-height: auto;
    grid-template-columns: 1fr;
  }
`

const Content = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 28px;
  padding: 48px;

  @media (max-width: 640px) {
    padding: 32px 24px;
  }
`

const Eyebrow = styled.p`
  color: var(--color-primary-700);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

const Title = styled.h1`
  color: var(--color-text-900);
  font-size: clamp(32px, 4vw, 44px);
  line-height: 1.15;
  letter-spacing: -0.03em;
`

const Description = styled.p`
  color: var(--color-text-500);
  font-size: 16px;
  line-height: 1.75;
`

const Visual = styled.aside`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: white;
  background:
    linear-gradient(180deg, rgba(21, 73, 181, 0.96), rgba(16, 54, 130, 0.98)),
    #1549b5;

  @media (max-width: 1024px) {
    min-height: 320px;
  }

  @media (max-width: 640px) {
    padding: 32px 24px;
  }
`

const VisualImage = styled.img`
  width: min(560px, 100%);
  max-height: min(72vh, 680px);
  object-fit: contain;
  opacity: 0.92;
  pointer-events: none;

  @media (max-width: 1024px) {
    width: min(460px, 100%);
    max-height: 320px;
  }
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
  font-size: 14px;
  font-weight: 600;
`

export const TextInput = styled.input`
  width: 100%;
  height: 48px;
  padding: 0 16px;
  border: 1px solid var(--color-border-200);
  border-radius: 14px;
  outline: none;
  background: white;
  color: var(--color-text-900);
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease;

  &::placeholder {
    color: #8b96ab;
  }

  &:focus {
    border-color: var(--color-primary-600);
    box-shadow: 0 0 0 4px rgba(51, 109, 211, 0.12);
  }
`

export const InlineField = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: end;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

export const PrimaryButton = styled.button`
  height: 48px;
  padding: 0 18px;
  border: none;
  border-radius: 14px;
  background: var(--color-primary-700);
  color: white;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    background-color 180ms ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 14px 36px rgba(21, 73, 181, 0.18);
  }

  &:disabled {
    cursor: not-allowed;
    background: #a9b5cb;
    box-shadow: none;
    transform: none;
  }
`

export const SecondaryButton = styled.button`
  height: 48px;
  padding: 0 18px;
  border: 1px solid var(--color-primary-700);
  border-radius: 14px;
  background: white;
  color: var(--color-primary-700);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
`

export const HelperText = styled.p`
  color: var(--color-text-500);
  font-size: 13px;
  line-height: 1.6;
`

export const Notice = styled.p<{ $tone?: 'error' | 'success' | 'info' }>`
  padding: 12px 14px;
  border-radius: 14px;
  background: ${props => {
    if (props.$tone === 'error') return 'rgba(209, 67, 67, 0.08)'
    if (props.$tone === 'success') return 'rgba(31, 157, 85, 0.08)'
    return 'rgba(51, 109, 211, 0.08)'
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
  font-weight: 700;
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

export const SocialButtonRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
`

export const SocialButton = styled.button`
  height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid var(--color-border-200);
  border-radius: 16px;
  background: white;
  color: var(--color-text-900);
  font-weight: 700;
  cursor: pointer;
  transition:
    border-color 180ms ease,
    transform 180ms ease,
    box-shadow 180ms ease;

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(21, 73, 181, 0.24);
    box-shadow: 0 10px 30px rgba(21, 73, 181, 0.08);
  }

  img {
    width: 22px;
    height: 22px;
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
        <Visual>
          <VisualImage src="/gifs/buildings.gif" alt="" aria-hidden="true" />
        </Visual>
      </Frame>
    </Container>
  )
}
