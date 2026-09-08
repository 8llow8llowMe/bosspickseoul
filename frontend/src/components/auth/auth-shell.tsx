import Link from 'next/link'
import type { ReactNode } from 'react'
import styled from 'styled-components'
import BrandLockup from '@/components/brand/brand-lockup'

const Container = styled.div`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px 20px;
  background: var(--color-background-muted);
`

const Frame = styled.div`
  width: min(520px, 100%);
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-sheet);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-2);
`

/*
  인증 화면에는 헤더가 없다. 그래서 여기서 홈으로 돌아갈 길이 사라진다 —
  북마크를 누르다 로그인으로 튕겨 온 사용자에게 남는 선택지가 로그인·회원가입·
  브라우저 뒤로가기뿐이었다(과업 흐름 감사 J3-2). 로고를 앱으로 돌아가는 문으로 둔다.
*/
const HomeLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  /* 터치 영역(DESIGN.md §8): 락업이 32px 이므로 44px 를 여기서 확보한다. */
  min-height: 44px;
  /*
    조판은 BrandLockup 이 책임진다 — 여기서 폰트를 주면 두 곳이 싸우고
    BossPick 700 + Seoul 400 무게 분리가 캐스케이드에 깨진다.
    헤더의 Brand 도 같은 이유로 폰트 속성이 없다.

    가로 패딩도 없다. 4px 를 남기면 32px 짜리 잉크 컨테이너가 아래 본문
    컬럼보다 4px 안쪽에서 시작해 어긋나 보인다 — 18px 텍스트일 때는
    눈에 띄지 않던 값이다. hover 색도 뺐다: 워드마크가 자기 color 를
    직접 주므로 부모의 hover 가 닿지 않아 조용히 죽는다(헤더도 없다).
  */
`

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 32px;

  @media (max-width: 640px) {
    padding: 24px 20px;
  }
`

const Eyebrow = styled.p`
  margin-bottom: 8px;
  color: var(--color-text-caption);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
`

const Title = styled.h1`
  color: var(--color-text-900);
  font-size: 26px;
  font-weight: 700;
  line-height: 36px;
  letter-spacing: 0;
`

const Description = styled.p`
  margin-top: 8px;
  color: var(--color-text-600);
  font-size: 16px;
  line-height: 24px;
  word-break: keep-all;
`

export const AuthForm = styled.form`
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
  /* 채움형이라 평상시 테두리를 그리지 않는다. 자리는 2px transparent 로 잡아
     포커스·에러에서 칸이 흔들리지 않게 한다(DESIGN.md §Inputs & Forms). */
  border: 2px solid transparent;
  border-radius: var(--radius-field);
  outline: none;
  background: var(--color-surface-muted);
  color: var(--color-text-900);
  transition:
    border-color var(--motion-fast) var(--ease-standard),
    box-shadow var(--motion-fast) var(--ease-standard),
    background-color var(--motion-fast) var(--ease-standard);

  &::placeholder {
    color: var(--color-placeholder);
  }

  &:focus {
    border-color: var(--color-primary-700);
    background: var(--color-surface);
    box-shadow: none;
  }

  /* DESIGN.md §Error (inline field): red500 2px 테두리. 프롭이 아니라 aria-invalid 를
     선택자로 삼아 시각 표시와 보조기술 표시가 갈라질 수 없게 한다. box-sizing 이
     border-box 라 높이 48px 는 유지된다. */
  &[aria-invalid='true'] {
    border-color: var(--color-danger);
    background: color-mix(
      in srgb,
      var(--color-danger) 6%,
      var(--color-surface)
    );
  }

  /* 에러 상태에서 포커스해도 후광을 덧대지 않는다 — 빨간 테두리 위에 링이 하나 더
     생기면 이중선으로 보이고, 정상 포커스(테두리만)와 규격도 갈린다.
     상태는 테두리 색 하나로만 말한다. */
  &[aria-invalid='true']:focus {
    border-color: var(--color-danger);
  }
`

/** DESIGN.md §Error (inline field) 의 「error text below in red500 13px」. */
export const FieldError = styled.span`
  color: var(--color-danger);
  font-size: 13px;
  line-height: 20px;
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
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    opacity var(--motion-fast) var(--ease-standard);

  &:hover {
    background: var(--color-primary-600);
  }

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

  &:disabled {
    cursor: not-allowed;
    opacity: var(--button-disabled-opacity-color);
  }
`

export const HelperText = styled.p`
  color: var(--color-text-500);
  font-size: 13px;
  line-height: 1.6;
`

export const Notice = styled.p<{ $tone?: 'error' | 'success' | 'info' }>`
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
  line-height: 1.6;
  white-space: pre-line;
`

export const FooterRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--color-text-500);
  font-size: 14px;
`

export const FooterLink = styled(Link)`
  color: var(--color-primary-700);
  font-weight: 600;
`

export const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--color-text-500);
  font-size: 13px;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--color-border-200);
  }
`

type AuthShellProps = {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}

export default function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: AuthShellProps) {
  return (
    <Container>
      <Frame>
        <Content>
          <HomeLink href="/" aria-label="BossPickSeoul 홈으로">
            <BrandLockup />
          </HomeLink>
          <div>
            <Eyebrow>{eyebrow}</Eyebrow>
            <Title>{title}</Title>
            <Description>{description}</Description>
          </div>
          {children}
        </Content>
      </Frame>
    </Container>
  )
}
