'use client'

import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react'
import { forwardRef } from 'react'
import Link from 'next/link'
import styled, { css, keyframes } from 'styled-components'

import { touchHitArea } from '@/styles/touch-target'

export type ButtonVariant =
  'primary' | 'secondary' | 'dark' | 'danger' | 'ghost'

export type ButtonSize = 'tiny' | 'medium' | 'large' | 'big'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  isLoading?: boolean
  loadingLabel?: string
  size?: ButtonSize
  variant?: ButtonVariant
}

/**
 * 버튼 높이 체계 — DESIGN.md §Touch Targets 의 네 단계(36·40·48·56)다. 화면이 높이를 따로 만들지 않고
 * 이 넷 중 하나를 고른다(커뮤니티·채팅·프로필은 `button-heights.test.ts` 가 잠근다, #582).
 */
export const BUTTON_HEIGHTS = {
  tiny: 36,
  medium: 40,
  large: 48,
  big: 56,
} as const satisfies Record<ButtonSize, number>

/*
  tiny·medium 은 보이는 높이가 44px 보다 작다. 모바일(≤1023)에서는 `touchHitArea()` 로 **히트 영역만**
  44px 로 넓힌다(DESIGN.md §Touch Targets, #582). 보이는 크기는 그대로다. large·big 은 이미 44 이상이다.
*/
const sizeStyles = {
  tiny: css`
    min-height: ${BUTTON_HEIGHTS.tiny}px;
    padding: 0 12px;
    font-size: 13px;
    ${touchHitArea()}
  `,
  medium: css`
    min-height: ${BUTTON_HEIGHTS.medium}px;
    padding: 0 14px;
    font-size: 14px;
    ${touchHitArea()}
  `,
  large: css`
    min-height: ${BUTTON_HEIGHTS.large}px;
    padding: 0 18px;
    font-size: 15px;
  `,
  big: css`
    min-height: ${BUTTON_HEIGHTS.big}px;
    padding: 0 20px;
    font-size: 16px;
  `,
}

const variantStyles = {
  primary: css`
    border-color: var(--color-fill-primary-text);
    background: var(--color-fill-primary-text);
    color: #ffffff;

    &:hover:not(:disabled):not([aria-disabled='true']) {
      border-color: var(--color-fill-primary-text-hover);
      background: var(--color-fill-primary-text-hover);
    }
  `,
  secondary: css`
    border-color: transparent;
    background: var(--color-primary-100);
    /* blue50 위 blue500 은 2.47:1 로 AA 미달이다 — DESIGN.md §Secondary 대로 blue700 글자다. */
    color: var(--color-text-primary-on-light);

    &:hover:not(:disabled):not([aria-disabled='true']) {
      background: #dff0ff;
    }
  `,
  dark: css`
    border-color: var(--color-text-900);
    background: var(--color-text-900);
    color: #ffffff;

    &:hover:not(:disabled):not([aria-disabled='true']) {
      border-color: var(--color-text-800);
      background: var(--color-text-800);
    }
  `,
  danger: css`
    border-color: var(--color-danger);
    background: var(--color-danger);
    color: #ffffff;

    &:hover:not(:disabled):not([aria-disabled='true']) {
      filter: brightness(0.96);
    }
  `,
  ghost: css`
    border-color: transparent;
    background: transparent;
    color: var(--color-text-700);

    &:hover:not(:disabled):not([aria-disabled='true']) {
      background: var(--color-surface-muted);
      color: var(--color-text-900);
    }
  `,
}

const dotPulse = keyframes`
  0%,
  80%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }

  40% {
    opacity: 1;
    transform: translateY(-2px);
  }
`

const buttonBase = css<{
  $size: ButtonSize
  $variant: ButtonVariant
}>`
  width: fit-content;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid;
  border-radius: var(--radius-control);
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    border-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard),
    opacity var(--motion-fast) var(--ease-standard),
    filter var(--motion-fast) var(--ease-standard);

  ${props => sizeStyles[props.$size]}
  ${props => variantStyles[props.$variant]}
`

const Root = styled.button<{
  $size: ButtonSize
  $variant: ButtonVariant
}>`
  ${buttonBase}

  /*
    aria-disabled 는 포커스를 잃지 않아야 하는 비활성(누르면 안내만 하는 버튼)에 쓴다. 클릭을 막는 건
    호출부 핸들러의 몫이다 — 모양만 disabled 와 같게 맞춘다.
  */
  &:disabled,
  &[aria-disabled='true'] {
    cursor: not-allowed;
    opacity: var(--button-disabled-opacity-color);
  }
`

const IconSlot = styled.span`
  width: 18px;
  height: 18px;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  color: currentColor;

  svg {
    width: 100%;
    height: 100%;
    stroke: currentColor;
  }
`

const LoadingDots = styled.span`
  min-width: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;

  span {
    width: 5px;
    height: 5px;
    border-radius: var(--radius-pill);
    background: currentColor;
    animation: ${dotPulse} 1.2s var(--ease-standard) infinite;
  }

  span:nth-child(2) {
    animation-delay: 120ms;
  }

  span:nth-child(3) {
    animation-delay: 240ms;
  }
`

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      disabled,
      isLoading = false,
      leftIcon,
      loadingLabel = '처리 중',
      rightIcon,
      size = 'big',
      type = 'button',
      variant = 'primary',
      ...props
    },
    ref,
  ) => (
    <Root
      ref={ref}
      $size={size}
      $variant={variant}
      aria-busy={isLoading || undefined}
      disabled={disabled || isLoading}
      type={type}
      {...props}
    >
      {isLoading ? (
        <LoadingDots aria-label={loadingLabel} role="status">
          <span />
          <span />
          <span />
        </LoadingDots>
      ) : (
        <>
          {leftIcon ? <IconSlot aria-hidden="true">{leftIcon}</IconSlot> : null}
          {children}
          {rightIcon ? (
            <IconSlot aria-hidden="true">{rightIcon}</IconSlot>
          ) : null}
        </>
      )}
    </Root>
  ),
)

Button.displayName = 'Button'

const LinkRoot = styled(Link)<{ $size: ButtonSize; $variant: ButtonVariant }>`
  ${buttonBase}
  text-decoration: none;
`

export type ButtonLinkProps = ComponentProps<typeof Link> & {
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  size?: ButtonSize
  variant?: ButtonVariant
}

/**
 * 링크형 버튼. `Button`은 `<button>` 전용(`forwardRef<HTMLButtonElement>`)이라 `as` prop을
 * 받지 않는다 — 네비게이션은 이 컴포넌트로 처리한다. `buttonBase`를 공유해 CSS가 두 곳에서
 * 갈라지지 않는다.
 */
export function ButtonLink({
  children,
  leftIcon,
  rightIcon,
  size = 'big',
  variant = 'primary',
  ...props
}: ButtonLinkProps) {
  return (
    <LinkRoot $size={size} $variant={variant} {...props}>
      {leftIcon ? <IconSlot aria-hidden="true">{leftIcon}</IconSlot> : null}
      {children}
      {rightIcon ? <IconSlot aria-hidden="true">{rightIcon}</IconSlot> : null}
    </LinkRoot>
  )
}
