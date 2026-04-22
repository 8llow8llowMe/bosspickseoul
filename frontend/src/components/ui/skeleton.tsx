import styled, { keyframes } from 'styled-components'

const shimmer = keyframes`
  0% {
    opacity: 0.72;
  }

  50% {
    opacity: 1;
  }

  100% {
    opacity: 0.72;
  }
`

export const Skeleton = styled.div<{
  $height?: string
  $radius?: string
  $width?: string
}>`
  width: ${props => props.$width ?? '100%'};
  height: ${props => props.$height ?? '16px'};
  border-radius: ${props => props.$radius ?? 'var(--radius-control)'};
  background: var(--color-surface-muted);
  animation: ${shimmer} 1.2s var(--ease-standard) infinite;
`
