import type { InputHTMLAttributes, ReactNode } from 'react'
import { forwardRef } from 'react'
import styled, { css } from 'styled-components'

export type TextFieldSize = 'medium' | 'large'

export type TextFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size'
> & {
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
  $hasError: boolean
  $size: TextFieldSize
}>`
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid
    ${props =>
      props.$hasError ? 'var(--color-danger)' : 'var(--color-border-200)'};
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
        <InputShell $hasError={hasError} $size={fieldSize}>
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
