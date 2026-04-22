import styled from 'styled-components'

export const TabList = styled.nav`
  display: flex;
  gap: 4px;
  align-items: center;
  overflow-x: auto;
  border-bottom: 1px solid var(--color-border-200);
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`

export const TabButton = styled.button<{ $active?: boolean }>`
  min-height: 44px;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: none;
  border-bottom: 2px solid
    ${props => (props.$active ? 'var(--color-primary-700)' : 'transparent')};
  background: transparent;
  color: ${props =>
    props.$active ? 'var(--color-text-900)' : 'var(--color-text-caption)'};
  padding: 0 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  &:hover {
    color: var(--color-primary-700);
  }
`

export const TabLink = styled.a<{ $active?: boolean }>`
  min-height: 44px;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-bottom: 2px solid
    ${props => (props.$active ? 'var(--color-primary-700)' : 'transparent')};
  color: ${props =>
    props.$active ? 'var(--color-text-900)' : 'var(--color-text-caption)'};
  padding: 0 12px;
  font-size: 14px;
  font-weight: 600;
  transition:
    border-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  &:hover {
    color: var(--color-primary-700);
  }
`
