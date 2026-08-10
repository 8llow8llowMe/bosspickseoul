import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  Bookmark,
  Building2,
  MapPinned,
  Search,
} from 'lucide-react'
import styled from 'styled-components'
import AnalysisMiniDemo from '@/components/home/analysis-mini-demo'
import Reveal from '@/components/home/reveal'
import SeoulDistrictsMap from '@/components/home/seoul-districts-map'

const workflowSteps = [
  {
    step: '01',
    title: '현황 확인',
    body: '구별현황에서 자치구별 매출·유동인구·업종 분포를 비교합니다.',
  },
  {
    step: '02',
    title: '상권 분석',
    body: '지역과 업종을 지정해 매출 추이와 경쟁 강도를 리포트로 확인합니다.',
  },
  {
    step: '03',
    title: '후보 추천',
    body: '조건에 맞는 상권을 추천받아 후보를 좁히고 저장합니다.',
  },
  {
    step: '04',
    title: '창업 시뮬레이션',
    body: '예상 비용과 매출을 시뮬레이션해 실행 가능성을 점검합니다.',
  },
] as const

const featureCards = [
  {
    title: '구별현황',
    body: '자치구별 상권 지표를 한눈에 비교합니다.',
    href: '/status',
    icon: Building2,
  },
  {
    title: '상권분석',
    body: '업종·지역별 매출과 경쟁을 리포트로 분석합니다.',
    href: '/analysis',
    icon: BarChart3,
  },
  {
    title: '상권추천',
    body: '조건에 맞는 후보 상권을 추천합니다.',
    href: '/recommend',
    icon: MapPinned,
  },
] as const

const Page = styled.main`
  background: var(--color-background);
`

const Section = styled.section`
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 64px 20px;

  @media (max-width: 640px) {
    min-height: auto;
    padding: 64px 16px;
  }
`

const Hero = styled.section`
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 56px 20px 48px;
  background: var(--color-background);

  @media (max-width: 640px) {
    min-height: auto;
    padding: 56px 16px;
  }
`

const Inner = styled.div`
  width: min(1120px, 100%);
  margin: 0 auto;
`

const HeroStage = styled.div`
  position: relative;
  width: min(1120px, 100%);
  margin: 0 auto;
`

const MapLayer = styled.div`
  width: 100%;
`

const CardLayer = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 10;
  /* 카드 위에서도 뒤의 폴리곤이 hover되도록 포인터 이벤트를 통과시킨다 */
  pointer-events: none;
`

const HeroCopy = styled.div`
  /* 카드 본문은 이벤트를 통과시키고, 내부 버튼(Actions)만 다시 활성화한다 */
  pointer-events: none;
  width: min(460px, 100%);
  display: grid;
  gap: 20px;
  padding: 40px;
  border-radius: 24px;
  background: color-mix(in srgb, var(--color-surface) 55%, transparent);
  border: 1px solid color-mix(in srgb, #ffffff 65%, transparent);
  box-shadow: 0 24px 60px -16px rgba(2, 9, 19, 0.3);
  -webkit-backdrop-filter: blur(16px) saturate(135%);
  backdrop-filter: blur(16px) saturate(135%);

  @media (max-width: 640px) {
    width: min(460px, calc(100% - 24px));
    padding: 24px;
    border-radius: 20px;
    gap: 16px;
  }
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

const BodyEmphasis = styled.strong`
  display: block;
  margin-top: 4px;
  color: var(--color-text-900);
  font-weight: 700;
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  /* 오버레이 카드가 이벤트를 통과시켜도 버튼은 클릭 가능해야 한다 */
  pointer-events: auto;
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

const DemoWrap = styled.div`
  width: min(760px, 100%);
  margin: 0 auto;
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

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

const FeatureCard = styled(Link)`
  min-height: 176px;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 14px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 20px;
  transition:
    border-color var(--motion-fast) var(--ease-standard),
    box-shadow var(--motion-fast) var(--ease-standard);

  &:hover {
    border-color: var(--color-primary-700);
    box-shadow: var(--shadow-level-2);
  }

  @media (max-width: 640px) {
    min-height: 156px;
  }
`

const FeatureHeader = styled.div`
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

const FeatureTitle = styled.h3`
  color: var(--color-text-900);
  font-size: 18px;
  font-weight: 600;
  line-height: 26px;
`

const FeatureBody = styled.p`
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 22px;
  word-break: keep-all;
`

const FeatureCta = styled.span`
  display: inline-flex;
  align-items: center;
  color: var(--color-primary-700);

  svg {
    width: 16px;
    height: 16px;
    stroke: currentColor;
  }
`

const ClosingCta = styled.div`
  margin-top: 40px;
  padding-top: 32px;
  border-top: 1px solid var(--color-border-200);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 20px;
  align-items: center;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`

const ClosingTitle = styled.h2`
  color: var(--color-text-900);
  font-size: 22px;
  font-weight: 700;
  line-height: 30px;
  word-break: keep-all;
`

const ClosingBody = styled.p`
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
          <HeroStage>
            <MapLayer>
              <SeoulDistrictsMap />
            </MapLayer>
            <CardLayer>
              <HeroCopy>
                <Eyebrow>서울 상권 데이터 분석</Eyebrow>
                <Title>창업 전에, 상권부터 확인하세요.</Title>
                <Body>
                  서울 25개 자치구를 업종별 매출·유동인구·경쟁 현황으로
                  분석합니다.
                  <BodyEmphasis>
                    감이 아니라 데이터로 자리를 정하세요.
                  </BodyEmphasis>
                </Body>
                <Actions>
                  <PrimaryLink href="/analysis">
                    <Search aria-hidden="true" />내 상권 분석하기
                  </PrimaryLink>
                  <SecondaryLink href="/status">
                    <MapPinned aria-hidden="true" />
                    구별현황 보기
                  </SecondaryLink>
                </Actions>
              </HeroCopy>
            </CardLayer>
          </HeroStage>
        </Inner>
      </Hero>

      <Section>
        <Inner>
          <SectionHeader>
            <Eyebrow>미리 체험하기</Eyebrow>
            <SectionTitle>
              지역과 업종을 고르면, 분석이 이렇게 나옵니다.
            </SectionTitle>
            <SectionBody>
              실제 리포트의 축약본입니다. 아래 수치는 대표 예시입니다.
            </SectionBody>
          </SectionHeader>

          <DemoWrap>
            <AnalysisMiniDemo />
          </DemoWrap>
        </Inner>
      </Section>

      <MutedBand>
        <Inner>
          <SectionHeader>
            <Eyebrow>판단 흐름</Eyebrow>
            <SectionTitle>
              현황 확인부터 창업 판단까지, 네 단계로 좁힙니다.
            </SectionTitle>
          </SectionHeader>

          <WorkflowList>
            {workflowSteps.map((item, index) => (
              <Reveal key={item.step} delay={index * 80}>
                <WorkflowItem>
                  <Step>{item.step}</Step>
                  <div>
                    <WorkflowTitle>{item.title}</WorkflowTitle>
                    <WorkflowBody>{item.body}</WorkflowBody>
                  </div>
                </WorkflowItem>
              </Reveal>
            ))}
          </WorkflowList>
        </Inner>
      </MutedBand>

      <Section>
        <Inner>
          <SectionHeader>
            <Eyebrow>기능</Eyebrow>
            <SectionTitle>
              상권 판단에 필요한 기능을 한 곳에 모았습니다.
            </SectionTitle>
          </SectionHeader>

          <FeatureGrid>
            {featureCards.map((card, index) => {
              const CardIcon = card.icon

              return (
                <Reveal key={card.href} delay={Math.min(index * 80, 240)}>
                  <FeatureCard href={card.href}>
                    <FeatureHeader>
                      <CardIcon aria-hidden="true" />
                      <FeatureTitle>{card.title}</FeatureTitle>
                    </FeatureHeader>
                    <FeatureBody>{card.body}</FeatureBody>
                    <FeatureCta>
                      <ArrowRight aria-hidden="true" />
                    </FeatureCta>
                  </FeatureCard>
                </Reveal>
              )
            })}
          </FeatureGrid>

          <ClosingCta>
            <div>
              <ClosingTitle>지금 내 상권을 분석해 보세요.</ClosingTitle>
              <ClosingBody>
                회원가입 후 분석 리포트와 상권 추천을 이어서 사용할 수 있습니다.
              </ClosingBody>
            </div>
            <Actions>
              <PrimaryLink href="/register">
                <Bookmark aria-hidden="true" />
                시작하기
              </PrimaryLink>
              <SecondaryLink href="/analysis">
                <ArrowRight aria-hidden="true" />
                상권 분석 바로가기
              </SecondaryLink>
            </Actions>
          </ClosingCta>
        </Inner>
      </Section>
    </Page>
  )
}
