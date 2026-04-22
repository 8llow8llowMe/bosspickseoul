import styled from 'styled-components'

export const SectionStack = styled.div`
  display: grid;
  gap: 20px;
`

export const SectionPanel = styled.section`
  padding: 24px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-1);

  @media (max-width: 640px) {
    padding: 20px;
  }
`

export const SectionTitle = styled.h2`
  color: var(--color-text-900);
  font-size: 22px;
  font-weight: 700;
  line-height: 30px;
  letter-spacing: 0;
`

export const SectionBody = styled.p`
  margin-top: 10px;
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 22px;
  word-break: keep-all;
`

export const SectionNotice = styled.p<{ $tone?: 'error' | 'success' | 'info' }>`
  padding: 12px 14px;
  border-radius: var(--radius-control);
  background: ${props => {
    if (props.$tone === 'error') return 'rgba(240, 68, 82, 0.1)'
    if (props.$tone === 'success') return 'rgba(3, 178, 108, 0.1)'
    return 'var(--color-primary-100)'
  }};
  color: ${props => {
    if (props.$tone === 'error') return 'var(--color-danger)'
    if (props.$tone === 'success') return 'var(--color-success)'
    return 'var(--color-primary-700)'
  }};
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-line;
`

export const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`

export const ContentCard = styled.article`
  padding: 20px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface-muted);
`

export const CardEyebrow = styled.p`
  margin-bottom: 8px;
  color: var(--color-text-caption);
  font-size: 13px;
  font-weight: 600;
`

export const CardTitle = styled.h3`
  color: var(--color-text-900);
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
`

export const CardText = styled.p`
  margin-top: 10px;
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 22px;
`

export const MetaList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
`

export const MetaItem = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 12px;
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  color: var(--color-text-700);
  font-size: 13px;
  font-weight: 600;
`

export const EmptyState = styled.div`
  padding: 24px;
  border: 1px dashed var(--color-border-300);
  border-radius: var(--radius-card);
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 22px;
  background: var(--color-surface);
`

export const Form = styled.form`
  display: grid;
  gap: 16px;
`

export const Field = styled.label`
  display: grid;
  gap: 8px;
`

export const FieldLabel = styled.span`
  color: var(--color-text-700);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
`

export const TextInput = styled.input`
  width: 100%;
  height: 48px;
  padding: 0 14px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  outline: none;
  background: var(--color-surface-muted);
  color: var(--color-text-900);
  transition:
    border-color var(--motion-fast) var(--ease-standard),
    box-shadow var(--motion-fast) var(--ease-standard),
    background-color var(--motion-fast) var(--ease-standard);

  &:focus {
    border-color: var(--color-primary-700);
    background: var(--color-surface);
    box-shadow: var(--shadow-focus-primary);
  }
`

export const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`

export const PrimaryButton = styled.button`
  height: 48px;
  padding: 0 18px;
  border: none;
  border-radius: var(--radius-control);
  background: var(--color-primary-700);
  color: white;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: var(--button-disabled-opacity-color);
  }
`

export const SecondaryButton = styled.button`
  height: 48px;
  padding: 0 18px;
  border: 1px solid transparent;
  border-radius: var(--radius-control);
  background: var(--color-primary-100);
  color: var(--color-primary-700);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
`

export const HelperText = styled.p`
  color: var(--color-text-caption);
  font-size: 13px;
  line-height: 20px;
`

export const CheckboxRow = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  color: var(--color-text-700);
  line-height: 1.7;

  input {
    width: 18px;
    height: 18px;
    margin-top: 3px;
  }
`
