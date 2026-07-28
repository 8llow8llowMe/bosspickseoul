import Link from 'next/link'
import {
  Bell,
  Clock3,
  Home,
  MessageCircle,
  ShieldCheck,
  Users,
} from 'lucide-react'
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

const Notice = styled.div`
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 14px 16px;
  border-left: 3px solid var(--color-primary-700);
  background: var(--color-primary-100);
  color: var(--color-text-700);
  font-size: 14px;
  line-height: 22px;

  svg {
    width: 18px;
    height: 18px;
    flex: 0 0 auto;
    margin-top: 2px;
    color: var(--color-primary-700);
    stroke: currentColor;
  }
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

const ContractSection = styled.section`
  display: grid;
  gap: 16px;
`

const SectionTitle = styled.h2`
  color: var(--color-text-900);
  font-size: 22px;
  font-weight: 700;
  line-height: 30px;
`

const ContractGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`

const ContractCard = styled.article`
  display: grid;
  gap: 10px;
  padding: 20px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
`

const ContractIcon = styled.div`
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-control);
  background: var(--color-primary-100);
  color: var(--color-primary-700);

  svg {
    width: 20px;
    height: 20px;
    stroke: currentColor;
  }
`

const ContractTitle = styled.h3`
  color: var(--color-text-900);
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
`

const ContractBody = styled.p`
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 22px;
  word-break: keep-all;
`

const contracts = [
  {
    title: 'REST 채팅방 계약',
    description:
      '목록, 상세, 생성, 입장, 퇴장과 메시지 조회 계약이 필요합니다.',
    icon: Users,
  },
  {
    title: 'STOMP 실시간 계약',
    description:
      '인증 방식과 구독·발행 destination, 메시지 payload가 필요합니다.',
    icon: MessageCircle,
  },
  {
    title: 'FCM 알림 계약',
    description:
      '토큰 저장 책임과 topic 구독·해제, 알림 권한 정책이 필요합니다.',
    icon: Bell,
  },
] as const

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
            V2 API 준비 중
          </Status>
          <div>
            <Eyebrow>Chatting</Eyebrow>
            <Title>{title}</Title>
          </div>
          <Description>
            안전한 실시간 대화를 제공하기 위해 채팅방, 메시지, 알림 계약을 먼저
            확정하고 있습니다.
          </Description>
          <Notice>
            <ShieldCheck aria-hidden="true" />
            <span>
              백엔드 계약 없이 임시 채팅방이나 로컬 메시지를 만들지 않습니다.
              계약이 준비되면 인증된 실시간 연결로 제공하겠습니다.
            </span>
          </Notice>
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
        <ContractSection>
          <SectionTitle>연결 전 필요한 계약</SectionTitle>
          <ContractGrid>
            {contracts.map(contract => {
              const Icon = contract.icon

              return (
                <ContractCard key={contract.title}>
                  <ContractIcon>
                    <Icon aria-hidden="true" />
                  </ContractIcon>
                  <ContractTitle>{contract.title}</ContractTitle>
                  <ContractBody>{contract.description}</ContractBody>
                </ContractCard>
              )
            })}
          </ContractGrid>
        </ContractSection>
      </Container>
    </Page>
  )
}
