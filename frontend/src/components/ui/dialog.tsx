import styled from 'styled-components'

export const DialogOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  background: var(--color-overlay);
  padding: 20px;
`

export const DialogSurface = styled.section`
  width: min(100%, 420px);
  border-radius: var(--radius-sheet);
  background: var(--color-float-background);
  box-shadow: var(--shadow-level-4);
  padding: 24px;
`

export const DialogHeader = styled.div`
  display: grid;
  gap: 8px;
  margin-bottom: 20px;
`

export const DialogTitle = styled.h2`
  color: var(--color-text-900);
  font-size: 22px;
  font-weight: 700;
  line-height: 30px;
`

export const DialogDescription = styled.p`
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 22px;
`

export const DialogBody = styled.div`
  display: grid;
  gap: 16px;
`

export const DialogActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 24px;
`

export const DialogCloseButton = styled.button`
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--color-text-caption);
  cursor: pointer;

  &:hover {
    background: var(--color-surface-muted);
    color: var(--color-text-900);
  }

  svg {
    width: 20px;
    height: 20px;
    stroke: currentColor;
  }
`
