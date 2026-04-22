import styled, { css } from 'styled-components'

export type CardTone = 'default' | 'muted'
export type CardElevation = 'flat' | 'subtle' | 'standard'

const elevationStyles = {
  flat: css`
    box-shadow: none;
  `,
  subtle: css`
    box-shadow: var(--shadow-level-1);
  `,
  standard: css`
    box-shadow: var(--shadow-level-2);
  `,
}

export const Card = styled.section<{
  $elevation?: CardElevation
  $tone?: CardTone
}>`
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: ${props =>
    props.$tone === 'muted'
      ? 'var(--color-surface-muted)'
      : 'var(--color-surface)'};
  padding: 20px;

  ${props => elevationStyles[props.$elevation ?? 'flat']}
`

export const CardHeader = styled.div`
  display: grid;
  gap: 6px;
  margin-bottom: 16px;
`

export const CardTitle = styled.h2`
  color: var(--color-text-900);
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
`

export const CardDescription = styled.p`
  color: var(--color-text-600);
  font-size: 14px;
  font-weight: 400;
  line-height: 22px;
`

export const CardContent = styled.div`
  display: grid;
  gap: 16px;
`

export const CardFooter = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  margin-top: 20px;
`
