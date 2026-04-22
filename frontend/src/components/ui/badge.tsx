import styled, { css } from 'styled-components'

export type BadgeTone =
  | 'blue'
  | 'grey'
  | 'green'
  | 'red'
  | 'orange'
  | 'teal'
  | 'purple'

const toneStyles = {
  blue: css`
    background: var(--color-primary-100);
    color: var(--color-primary-700);
  `,
  grey: css`
    background: var(--color-surface-muted);
    color: var(--color-text-700);
  `,
  green: css`
    background: rgba(3, 178, 108, 0.1);
    color: var(--color-success);
  `,
  red: css`
    background: rgba(240, 68, 82, 0.1);
    color: var(--color-danger);
  `,
  orange: css`
    background: rgba(254, 152, 0, 0.12);
    color: var(--color-warning);
  `,
  teal: css`
    background: rgba(24, 165, 165, 0.1);
    color: var(--color-info);
  `,
  purple: css`
    background: rgba(162, 52, 199, 0.1);
    color: var(--color-premium);
  `,
}

export const Badge = styled.span<{ $tone?: BadgeTone }>`
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-compact);
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
  white-space: nowrap;

  ${props => toneStyles[props.$tone ?? 'grey']}
`
