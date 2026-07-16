import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  Bookmark,
  Building2,
  FileText,
  MapPinned,
  MessageCircle,
  Search,
  TrendingUp,
  UsersRound,
} from 'lucide-react'
import styled from 'styled-components'

const quickActions = [
  {
    title: '구별현황',
    body: '서울 자치구별 상권 흐름을 먼저 확인합니다.',
    href: '/status',
    icon: Building2,
  },
  {
    title: '상권분석',
    body: '업종과 지역 조건을 입력해 분석 리포트로 이어갑니다.',
    href: '/analysis',
    icon: BarChart3,
  },
  {
    title: '상권추천',
    body: '후보 지역을 빠르게 좁히고 저장합니다.',
    href: '/recommend',
    icon: MapPinned,
  },
  {
    title: '시뮬레이션',
    body: '창업 조건을 비용과 리포트 흐름으로 검토합니다.',
    href: '/simulation',
    icon: FileText,
  },
] as const

const workflowSteps = [
  {
    step: '01',
    title: '서울 상권의 현재 상태를 확인합니다.',
    body: '구별현황에서 유동 인구, 점포 수, 주요 업종 지표를 먼저 비교합니다.',
  },
  {
    step: '02',
    title: '관심 지역을 분석 리포트로 구체화합니다.',
    body: '업종과 지역을 입력하고 후보 입지를 데이터 카드와 요약 지표로 검토합니다.',
  },
  {
    step: '03',
    title: '추천과 시뮬레이션으로 다음 판단을 이어갑니다.',
    body: '추천 후보를 저장하고, 창업 시뮬레이션으로 비용과 실행 가능성을 확인합니다.',
  },
  {
    step: '04',
    title: '커뮤니티와 채팅에서 실제 고민을 나눕니다.',
    body: '분석 이후의 질문과 경험을 커뮤니티, 실시간 채팅으로 이어갈 수 있습니다.',
  },
] as const

const serviceCards = [
  {
    title: '추천 후보 비교',
    body: '지도와 데이터 기준으로 관심 지역을 빠르게 좁힙니다.',
    href: '/recommend',
    image: '/images/recommend_map.png',
    icon: TrendingUp,
  },
  {
    title: '커뮤니티',
    body: '창업 경험과 상권 질문을 게시글로 공유합니다.',
    href: '/community/list',
    image: '/images/speaker.png',
    icon: UsersRound,
  },
  {
    title: '실시간 채팅',
    body: '관심 주제별 방에서 빠르게 대화를 시작합니다.',
    href: '/chatting/list',
    image: '/images/profile.png',
    icon: MessageCircle,
  },
] as const

const metrics = [
  { label: '서울 자치구', value: '25' },
  { label: '주요 진입 흐름', value: '6' },
  { label: '저장과 공유', value: '1' },
] as const

const Page = styled.main`
  background: var(--color-background);
`

const Section = styled.section`
  padding: 64px 20px;

  @media (max-width: 640px) {
    padding: 48px 16px;
  }
`

const Hero = styled.section`
  padding: 48px 20px 56px;
  background: var(--color-background);

  @media (max-width: 640px) {
    padding: 36px 16px 44px;
  }
`

const Inner = styled.div`
  width: min(1120px, 100%);
  margin: 0 auto;
`

const HeroGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(360px, 0.98fr);
  gap: 32px;
  align-items: center;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`

const HeroCopy = styled.div`
  display: grid;
  gap: 20px;
`

const Eyebrow = styled.p`
  color: var(--color-text-caption);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
`

const Title = styled.h1`
  max-width: 620px;
  color: var(--color-text-900);
  font-size: 30px;
  font-weight: 700;
  line-height: 40px;
  letter-spacing: 0;
  word-break: keep-all;
`

const Body = styled.p`
  max-width: 620px;
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

const PrimaryLink = styled(Link)`
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 18px;
  border-radius: var(--radius-control);
  background: var(--color-primary-700);
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  transition: background-color var(--motion-fast) var(--ease-standard);

  &:hover {
    background: var(--color-primary-600);
  }

  svg {
    width: 18px;
    height: 18px;
    stroke: currentColor;
  }
`

const SecondaryLink = styled(Link)`
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 18px;
  border: 1px solid transparent;
  border-radius: var(--radius-control);
  background: var(--color-primary-100);
  color: var(--color-primary-700);
  font-size: 15px;
  font-weight: 600;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  &:hover {
    background: #dff0ff;
  }

  svg {
    width: 18px;
    height: 18px;
    stroke: currentColor;
  }
`

const PreviewPanel = styled.aside`
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-2);
  overflow: hidden;
`

const PreviewImage = styled.img`
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
`

const PreviewContent = styled.div`
  display: grid;
  gap: 16px;
  padding: 20px;
`

const PreviewTitle = styled.h2`
  color: var(--color-text-900);
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
`

const PreviewBody = styled.p`
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 22px;
  word-break: keep-all;
`

const MetricList = styled.div`
  display: grid;
  border-top: 1px solid var(--color-border-200);
`

const MetricRow = styled.div`
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid var(--color-border-200);
  color: var(--color-text-700);
  font-size: 14px;

  &:last-child {
    border-bottom: none;
  }
`

const MetricValue = styled.span`
  color: var(--color-text-900);
  font-size: 22px;
  font-weight: 700;
  line-height: 30px;
  font-variant-numeric: tabular-nums;
`

const QuickGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 28px;

  @media (max-width: 960px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const QuickCard = styled(Link)`
  min-height: 156px;
  display: grid;
  align-content: start;
  gap: 10px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 18px;
  color: var(--color-text-700);
  transition:
    border-color var(--motion-fast) var(--ease-standard),
    box-shadow var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  &:hover {
    border-color: var(--color-primary-700);
    box-shadow: var(--shadow-level-2);
    color: var(--color-primary-700);
  }

  svg {
    width: 24px;
    height: 24px;
    stroke: currentColor;
  }
`

const QuickTitle = styled.h3`
  color: var(--color-text-900);
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
`

const QuickBody = styled.p`
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 22px;
  word-break: keep-all;
`

const SectionHeader = styled.div`
  max-width: 680px;
  display: grid;
  gap: 10px;
  margin-bottom: 28px;
`

const SectionTitle = styled.h2`
  color: var(--color-text-900);
  font-size: 26px;
  font-weight: 700;
  line-height: 36px;
  letter-spacing: 0;
  word-break: keep-all;
`

const SectionBody = styled.p`
  color: var(--color-text-600);
  font-size: 16px;
  line-height: 24px;
  word-break: keep-all;
`

const MutedBand = styled(Section)`
  background: var(--color-background-muted);
`

const WorkflowList = styled.div`
  display: grid;
  gap: 12px;
`

const WorkflowItem = styled.article`
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 18px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const Step = styled.span`
  color: var(--color-text-caption);
  font-size: 16px;
  font-weight: 700;
  line-height: 24px;
  font-variant-numeric: tabular-nums;
`

const WorkflowTitle = styled.h3`
  color: var(--color-text-900);
  font-size: 18px;
  font-weight: 600;
  line-height: 26px;
`

const WorkflowBody = styled.p`
  margin-top: 6px;
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 22px;
  word-break: keep-all;
`

const ServiceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`

const ServiceCard = styled(Link)`
  display: grid;
  gap: 14px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 16px;
  transition:
    border-color var(--motion-fast) var(--ease-standard),
    box-shadow var(--motion-fast) var(--ease-standard);

  &:hover {
    border-color: var(--color-primary-700);
    box-shadow: var(--shadow-level-2);
  }
`

const ServiceImage = styled.img`
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: var(--radius-control);
  object-fit: cover;
`

const ServiceHeader = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  color: var(--color-text-700);

  svg {
    width: 20px;
    height: 20px;
    stroke: currentColor;
  }
`

const ServiceTitle = styled.h3`
  color: var(--color-text-900);
  font-size: 18px;
  font-weight: 600;
  line-height: 26px;
`

const ServiceBody = styled.p`
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 22px;
  word-break: keep-all;
`

const ServiceCta = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-primary-700);
  font-size: 14px;
  font-weight: 600;

  svg {
    width: 16px;
    height: 16px;
    stroke: currentColor;
  }
`

const FinalSection = styled.section`
  border-top: 1px solid var(--color-border-200);
  padding: 40px 20px 56px;
  background: var(--color-background);

  @media (max-width: 640px) {
    padding: 36px 16px 48px;
  }
`

const FinalInner = styled.div`
  width: min(1120px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 20px;
  align-items: center;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`

const FinalTitle = styled.h2`
  color: var(--color-text-900);
  font-size: 22px;
  font-weight: 700;
  line-height: 30px;
  word-break: keep-all;
`

const FinalBody = styled.p`
  margin-top: 8px;
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 22px;
  word-break: keep-all;
`

export default function HomePage() {
  return (
    <Page>
      <Hero>
        <Inner>
          <HeroGrid>
            <HeroCopy>
              <Eyebrow>서울 상권 데이터와 창업 판단 흐름</Eyebrow>
              <Title>
                서울 상권을 읽고, 분석하고, 다음 행동까지 이어갑니다.
              </Title>
              <Body>
                구별현황으로 시장을 확인하고, 분석과 추천, 시뮬레이션,
                커뮤니티까지 한 흐름 안에서 창업 판단을 구체화합니다.
              </Body>
              <Actions>
                <PrimaryLink href="/analysis">
                  <Search aria-hidden="true" />
                  상권분석 시작
                </PrimaryLink>
                <SecondaryLink href="/recommend">
                  <MapPinned aria-hidden="true" />
                  추천 보기
                </SecondaryLink>
              </Actions>
            </HeroCopy>

            <PreviewPanel>
              <PreviewImage
                src="/images/threeChartImg.png"
                alt="상권 지표 리포트 미리보기"
              />
              <PreviewContent>
                <div>
                  <PreviewTitle>데이터를 먼저 읽고 판단합니다.</PreviewTitle>
                  <PreviewBody>
                    상권 현황, 분석 리포트, 추천 후보를 같은 흐름 안에서 확인할
                    수 있습니다.
                  </PreviewBody>
                </div>
                <MetricList>
                  {metrics.map(metric => (
                    <MetricRow key={metric.label}>
                      <span>{metric.label}</span>
                      <MetricValue>{metric.value}</MetricValue>
                    </MetricRow>
                  ))}
                </MetricList>
              </PreviewContent>
            </PreviewPanel>
          </HeroGrid>

          <QuickGrid>
            {quickActions.map(action => {
              const ActionIcon = action.icon

              return (
                <QuickCard key={action.href} href={action.href}>
                  <ActionIcon aria-hidden="true" />
                  <QuickTitle>{action.title}</QuickTitle>
                  <QuickBody>{action.body}</QuickBody>
                </QuickCard>
              )
            })}
          </QuickGrid>
        </Inner>
      </Hero>

      <MutedBand>
        <Inner>
          <SectionHeader>
            <Eyebrow>Workflow</Eyebrow>
            <SectionTitle>처음 조회에서 실행 판단까지 이어집니다.</SectionTitle>
            <SectionBody>
              NowDoBoss의 주요 기능은 각각 떨어진 화면이 아니라, 상권을 읽고
              다음 판단을 좁혀가는 순서로 연결됩니다.
            </SectionBody>
          </SectionHeader>

          <WorkflowList>
            {workflowSteps.map(item => (
              <WorkflowItem key={item.step}>
                <Step>{item.step}</Step>
                <div>
                  <WorkflowTitle>{item.title}</WorkflowTitle>
                  <WorkflowBody>{item.body}</WorkflowBody>
                </div>
              </WorkflowItem>
            ))}
          </WorkflowList>
        </Inner>
      </MutedBand>

      <Section>
        <Inner>
          <SectionHeader>
            <Eyebrow>Services</Eyebrow>
            <SectionTitle>
              분석 이후의 탐색과 대화도 함께 이어갑니다.
            </SectionTitle>
            <SectionBody>
              추천 후보를 저장하고, 커뮤니티와 채팅에서 실제 고민을 나누면서
              분석 이후의 의사결정을 계속 진행할 수 있습니다.
            </SectionBody>
          </SectionHeader>

          <ServiceGrid>
            {serviceCards.map(card => {
              const CardIcon = card.icon

              return (
                <ServiceCard key={card.href} href={card.href}>
                  <ServiceImage src={card.image} alt="" aria-hidden="true" />
                  <ServiceHeader>
                    <CardIcon aria-hidden="true" />
                    <ServiceTitle>{card.title}</ServiceTitle>
                  </ServiceHeader>
                  <ServiceBody>{card.body}</ServiceBody>
                  <ServiceCta>
                    흐름 보기
                    <ArrowRight aria-hidden="true" />
                  </ServiceCta>
                </ServiceCard>
              )
            })}
          </ServiceGrid>
        </Inner>
      </Section>

      <FinalSection>
        <FinalInner>
          <div>
            <FinalTitle>창업 판단을 데이터 흐름으로 정리하세요.</FinalTitle>
            <FinalBody>
              관심 지역을 확인한 뒤 분석 리포트와 추천, 저장, 커뮤니티로 바로
              이어갈 수 있습니다.
            </FinalBody>
          </div>
          <Actions>
            <PrimaryLink href="/register">
              <Bookmark aria-hidden="true" />
              시작하기
            </PrimaryLink>
            <SecondaryLink href="/community/list">
              <MessageCircle aria-hidden="true" />
              커뮤니티 보기
            </SecondaryLink>
          </Actions>
        </FinalInner>
      </FinalSection>
    </Page>
  )
}
