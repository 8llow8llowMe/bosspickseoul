import styled from 'styled-components'

export const SectionStack = styled.div`
  display: grid;
  gap: 20px;
`

export const SectionPanel = styled.section`
  padding: 28px;
  border: 1px solid var(--color-border-200);
  border-radius: 24px;
  background: white;
  box-shadow: 0 10px 30px rgba(21, 73, 181, 0.08);

  @media (max-width: 640px) {
    padding: 24px;
  }
`

export const SectionTitle = styled.h2`
  color: var(--color-text-900);
  font-size: 24px;
  line-height: 1.3;
  letter-spacing: -0.03em;
`

export const SectionBody = styled.p`
  margin-top: 10px;
  color: var(--color-text-500);
  line-height: 1.75;
`

export const SectionNotice = styled.p<{ $tone?: 'error' | 'success' | 'info' }>`
  padding: 12px 14px;
  border-radius: 14px;
  background: ${props => {
    if (props.$tone === 'error') return 'rgba(209, 67, 67, 0.08)'
    if (props.$tone === 'success') return 'rgba(31, 157, 85, 0.08)'
    return 'rgba(51, 109, 211, 0.08)'
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
  padding: 22px;
  border: 1px solid var(--color-border-200);
  border-radius: 20px;
  background: var(--color-surface-muted);
`

export const CardEyebrow = styled.p`
  margin-bottom: 8px;
  color: var(--color-primary-700);
  font-size: 13px;
  font-weight: 700;
`

export const CardTitle = styled.h3`
  color: var(--color-text-900);
  font-size: 20px;
  line-height: 1.35;
`

export const CardText = styled.p`
  margin-top: 10px;
  color: var(--color-text-500);
  line-height: 1.7;
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
  border-radius: 999px;
  background: white;
  color: var(--color-text-700);
  font-size: 13px;
  font-weight: 600;
`

export const EmptyState = styled.div`
  padding: 24px;
  border: 1px dashed var(--color-border-300);
  border-radius: 20px;
  color: var(--color-text-500);
  line-height: 1.7;
  background: white;
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
  font-size: 14px;
  font-weight: 700;
`

export const TextInput = styled.input`
  width: 100%;
  height: 48px;
  padding: 0 16px;
  border: 1px solid var(--color-border-200);
  border-radius: 14px;
  outline: none;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease;

  &:focus {
    border-color: var(--color-primary-600);
    box-shadow: 0 0 0 4px rgba(51, 109, 211, 0.12);
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
  border-radius: 14px;
  background: var(--color-primary-700);
  color: white;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    background: #a9b5cb;
  }
`

export const SecondaryButton = styled.button`
  height: 48px;
  padding: 0 18px;
  border: 1px solid var(--color-primary-700);
  border-radius: 14px;
  background: white;
  color: var(--color-primary-700);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
`

export const HelperText = styled.p`
  color: var(--color-text-500);
  font-size: 13px;
  line-height: 1.7;
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
