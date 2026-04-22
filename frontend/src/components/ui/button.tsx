import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { forwardRef } from 'react'
import styled, { css, keyframes } from 'styled-components'

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'dark'
  | 'danger'
  | 'ghost'

export type ButtonSize = 'tiny' | 'medium' | 'large' | 'big'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  isLoading?: boolean
  loadingLabel?: string
  size?: ButtonSize
  variant?: ButtonVariant
}

const sizeStyles = {
  tiny: css`
    min-height: 36px;
    padding: 0 12px;
    font-size: 13px;
  `,
  medium: css`
    min-height: 40px;
    padding: 0 14px;
    font-size: 14px;
  `,
  large: css`
    min-height: 48px;
    padding: 0 18px;
    font-size: 15px;
  `,
  big: css`
    min-height: 56px;
    padding: 0 20px;
    font-size: 16px;
  `,
}

const variantStyles = {
  primary: css`
    border-color: var(--color-primary-700);
    background: var(--color-primary-700);
    color: #ffffff;

    &:hover:not(:disabled) {
      border-color: var(--color-primary-600);
      background: var(--color-primary-600);
    }
  `,
  secondary: css`
    border-color: transparent;
    background: var(--color-primary-100);
    color: var(--color-primary-700);

    &:hover:not(:disabled) {
      background: #dff0ff;
    }
  `,
  dark: css`
    border-color: var(--color-text-900);
    background: var(--color-text-900);
    color: #ffffff;

    &:hover:not(:disabled) {
      border-color: var(--color-text-800);
      background: var(--color-text-800);
    }
  `,
  danger: css`
    border-color: var(--color-danger);
    background: var(--color-danger);
    color: #ffffff;

    &:hover:not(:disabled) {
      filter: brightness(0.96);
    }
  `,
  ghost: css`
    border-color: transparent;
    background: transparent;
    color: var(--color-text-700);

    &:hover:not(:disabled) {
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

const Root = styled.button<{
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

  &:disabled {
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
