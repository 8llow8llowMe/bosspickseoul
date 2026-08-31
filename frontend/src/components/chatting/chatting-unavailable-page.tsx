import Link from 'next/link'
import { Clock3, Home, MessageCircle } from 'lucide-react'
import styled from 'styled-components'

type ChattingUnavailablePageProps = {
  variant: 'list' | 'room'
  roomId?: number
}

const Page = styled.main`
  min-height: calc(100vh - 160px);
  padding: 72px 20px;
  background: var(--color-background-muted);

  @media (max-width: 640px) {
    padding: 48px 16px;
  }
`

const Container = styled.div`
  width: min(960px, 100%);
  margin: 0 auto;
  display: grid;
  gap: 24px;
`

const Hero = styled.section`
  display: grid;
  gap: 18px;
  padding: 40px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-2);

  @media (max-width: 640px) {
    padding: 28px 20px;
  }
`

const Status = styled.span`
  width: fit-content;
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  background: var(--color-primary-100);
  color: var(--color-primary-700);
  font-size: 13px;
  font-weight: 600;

  svg {
    width: 16px;
    height: 16px;
    stroke: currentColor;
  }
`

const Eyebrow = styled.p`
  color: var(--color-text-caption);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
`

const Title = styled.h1`
  color: var(--color-text-900);
  font-size: 30px;
  font-weight: 700;
  line-height: 40px;
  word-break: keep-all;

  @media (max-width: 640px) {
    font-size: 26px;
    line-height: 36px;
  }
`

const Description = styled.p`
  max-width: 700px;
  color: var(--color-text-600);
  font-size: 16px;
  line-height: 24px;
  word-break: keep-all;
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const ActionLink = styled(Link)<{ $primary?: boolean }>`
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 18px;
  border: 1px solid
    ${props =>
      props.$primary ? 'var(--color-primary-700)' : 'var(--color-border-200)'};
  border-radius: var(--radius-control);
  background: ${props =>
    props.$primary ? 'var(--color-primary-700)' : 'var(--color-surface)'};
  color: ${props =>
    props.$primary ? 'var(--color-surface)' : 'var(--color-text-700)'};
  font-size: 15px;
  font-weight: 600;

  &:hover {
    border-color: var(--color-primary-600);
    background: ${props =>
      props.$primary ? 'var(--color-primary-600)' : 'var(--color-primary-100)'};
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary-700);
    outline-offset: 2px;
  }

  svg {
    width: 18px;
    height: 18px;
    stroke: currentColor;
  }

  @media (max-width: 480px) {
    width: 100%;
  }
`

export default function ChattingUnavailablePage({
  variant,
  roomId,
}: ChattingUnavailablePageProps) {
  const title =
    variant === 'room'
      ? `채팅방 ${roomId} 연결을 준비하고 있습니다.`
      : '채팅 서비스를 준비하고 있습니다.'

  return (
    <Page>
      <Container>
        <Hero>
          <Status>
            <Clock3 aria-hidden="true" />
            준비 중
          </Status>
          <div>
            <Eyebrow>채팅</Eyebrow>
            <Title>{title}</Title>
          </div>
          <Description>
            지금은 실시간 대화를 이용할 수 없어요. 준비되면 이 화면에서 바로
            이용할 수 있습니다.
          </Description>
          <Actions>
            <ActionLink href="/community/list" $primary>
              커뮤니티 둘러보기
              <MessageCircle aria-hidden="true" />
            </ActionLink>
            <ActionLink href="/">
              <Home aria-hidden="true" />
              홈으로
            </ActionLink>
          </Actions>
        </Hero>
      </Container>
    </Page>
  )
}
