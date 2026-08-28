import type { InputHTMLAttributes, ReactNode } from 'react'
import { forwardRef } from 'react'
import styled, { css } from 'styled-components'

export type TextFieldSize = 'medium' | 'large'

export type TextFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size'
> & {
  /**
   * 테두리를 grey300(DESIGN.md §Border Strong "emphasized borders")으로 올린다.
   *
   * 기본값 false — 기존 사용처(로그인·회원가입·커뮤니티 등)의 모양을 바꾸지 않는다.
   * 흰 카드 위에 칩 격자와 나란히 놓여 "입력 가능한 칸"임이 grey200 테두리로는 읽히지 않는
   * 자리에서만 켠다.
   */
  emphasized?: boolean
  errorText?: ReactNode
  fieldSize?: TextFieldSize
  fullWidth?: boolean
  helperText?: ReactNode
  label?: ReactNode
  leftSlot?: ReactNode
  rightSlot?: ReactNode
}

const sizeStyles = {
  medium: css`
    min-height: 44px;
    font-size: 14px;
  `,
  large: css`
    min-height: 48px;
    font-size: 15px;
  `,
}

const Field = styled.label<{ $fullWidth: boolean }>`
  width: ${props => (props.$fullWidth ? '100%' : 'auto')};
  display: grid;
  gap: 8px;
`

const FieldLabel = styled.span`
  color: var(--color-text-700);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
`

const InputShell = styled.span<{
  $emphasized: boolean
  $hasError: boolean
  $size: TextFieldSize
}>`
  display: flex;
  align-items: center;
  gap: 8px;
  /* DESIGN.md §Error (inline field): 에러는 red500 **2px** 테두리다. box-sizing 이
     border-box 라 두꺼워져도 칸 높이는 그대로고 안쪽 여백만 1px 줄어든다. */
  border: ${props => (props.$hasError ? '2px' : '1px')} solid
    ${props => {
      if (props.$hasError) return 'var(--color-danger)'
      return props.$emphasized
        ? 'var(--color-border-300)'
        : 'var(--color-border-200)'
    }};
  border-radius: var(--radius-control);
  background: var(--color-surface-muted);
  padding: 0 14px;
  transition:
    border-color var(--motion-fast) var(--ease-standard),
    box-shadow var(--motion-fast) var(--ease-standard),
    background-color var(--motion-fast) var(--ease-standard);

  ${props => sizeStyles[props.$size]}

  &:focus-within {
    border-color: ${props =>
      props.$hasError ? 'var(--color-danger)' : 'var(--color-primary-700)'};
    box-shadow: ${props =>
      props.$hasError
        ? 'var(--shadow-focus-danger)'
        : 'var(--shadow-focus-primary)'};
    background: var(--color-surface);
  }
`

const Slot = styled.span`
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  color: var(--color-text-caption);

  svg {
    width: 18px;
    height: 18px;
    stroke: currentColor;
  }
`

const Input = styled.input`
  width: 100%;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--color-text-900);
  font: inherit;

  /* DESIGN.md §Disabled: 비활성 입력도 테두리(grey200)를 유지한다 — 다시 활성화될 때
     칸의 형태가 흔들리지 않게. 그래서 커서와 글자색만 비활성으로 바꾼다. */
  &:disabled {
    color: var(--color-text-caption);
    cursor: not-allowed;
  }
`

const HelperText = styled.span<{ $hasError: boolean }>`
  color: ${props =>
    props.$hasError ? 'var(--color-danger)' : 'var(--color-text-caption)'};
  font-size: 13px;
  line-height: 20px;
`

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  (
    {
      emphasized = false,
      errorText,
      fieldSize = 'large',
      fullWidth = true,
      helperText,
      label,
      leftSlot,
      rightSlot,
      ...props
    },
    ref,
  ) => {
    const hasError = Boolean(errorText)

    return (
      <Field $fullWidth={fullWidth}>
        {label ? <FieldLabel>{label}</FieldLabel> : null}
        <InputShell
          $emphasized={emphasized}
          $hasError={hasError}
          $size={fieldSize}
        >
          {leftSlot ? <Slot aria-hidden="true">{leftSlot}</Slot> : null}
          <Input ref={ref} aria-invalid={hasError || undefined} {...props} />
          {rightSlot ? <Slot aria-hidden="true">{rightSlot}</Slot> : null}
        </InputShell>
        {errorText || helperText ? (
          <HelperText $hasError={hasError}>
            {errorText || helperText}
          </HelperText>
        ) : null}
      </Field>
    )
  },
)

TextField.displayName = 'TextField'
