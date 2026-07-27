import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  Bookmark,
  Calculator,
  Clock3,
  Home,
  Share2,
} from 'lucide-react'
import styled from 'styled-components'

export type SimulationUnavailableKind = 'form' | 'report' | 'compare'

type SimulationUnavailablePageProps = {
  kind: SimulationUnavailableKind
}

const copyByKind = {
  form: {
    title: '창업 시뮬레이션을 준비하고 있습니다.',
    description:
      '지역과 업종 조건을 계산할 V2 API 계약이 준비되면 입력 기능을 다시 제공하겠습니다.',
  },
  report: {
    title: '시뮬레이션 리포트를 준비하고 있습니다.',
    description:
      '예상 비용 결과를 계산할 V2 API 계약이 없어 현재 리포트를 생성하지 않습니다.',
  },
  compare: {
    title: '시뮬레이션 비교를 준비하고 있습니다.',
    description:
      '저장 목록과 재계산 V2 API 계약이 준비되면 두 결과 비교 기능을 다시 제공하겠습니다.',
  },
} as const

const plannedFeatures = [
  {
    title: '조건 입력과 비용 계산',
    description:
      '지역, 업종, 매장 조건을 기반으로 예상 창업 비용을 계산합니다.',
    icon: Calculator,
  },
  {
    title: '리포트 저장과 비교',
    description:
      '계산 결과를 저장하고 두 창업 조건을 같은 기준으로 비교합니다.',
    icon: Bookmark,
  },
  {
    title: '공유 링크',
    description:
      '확정된 결과를 안전한 링크로 공유하고 다시 확인할 수 있습니다.',
    icon: Share2,
  },
] as const

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
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 40px;
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
  border-radius: var(--radius-pill);
  background: var(--color-primary-100);
  padding: 4px 12px;
  color: var(--color-primary-700);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;

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
  max-width: 680px;
  color: var(--color-text-600);
  font-size: 16px;
  line-height: 24px;
  word-break: keep-all;
`

const Notice = styled.div`
  display: flex;
  gap: 10px;
  align-items: flex-start;
  border-left: 3px solid var(--color-primary-700);
  background: var(--color-primary-100);
  padding: 14px 16px;
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
  margin-top: 4px;
`

const ActionLink = styled(Link)<{ $primary?: boolean }>`
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid
    ${props =>
      props.$primary ? 'var(--color-primary-700)' : 'var(--color-border-200)'};
  border-radius: var(--radius-control);
  background: ${props =>
    props.$primary ? 'var(--color-primary-700)' : 'var(--color-surface)'};
  padding: 0 18px;
  color: ${props =>
    props.$primary ? 'var(--color-surface)' : 'var(--color-text-700)'};
  font-size: 15px;
  font-weight: 600;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    border-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  &:hover {
    border-color: var(--color-primary-600);
    background: ${props =>
      props.$primary ? 'var(--color-primary-600)' : 'var(--color-primary-100)'};
    color: ${props =>
      props.$primary ? 'var(--color-surface)' : 'var(--color-primary-700)'};
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

const FeatureSection = styled.section`
  display: grid;
  gap: 16px;
`

const SectionHeader = styled.div`
  display: grid;
  gap: 6px;
`

const SectionTitle = styled.h2`
  color: var(--color-text-900);
  font-size: 22px;
  font-weight: 700;
  line-height: 30px;
`

const SectionBody = styled.p`
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 22px;
`

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`

const FeatureCard = styled.article`
  display: grid;
  gap: 10px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 20px;
`

const FeatureIcon = styled.div`
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

const FeatureTitle = styled.h3`
  color: var(--color-text-900);
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
`

const FeatureBody = styled.p`
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 22px;
  word-break: keep-all;
`

export default function SimulationUnavailablePage({
  kind,
}: SimulationUnavailablePageProps) {
  const copy = copyByKind[kind]

  return (
    <Page>
      <Container>
        <Hero>
          <Status>
            <Clock3 aria-hidden="true" />
            V2 API 준비 중
          </Status>
          <div>
            <Eyebrow>Simulation</Eyebrow>
            <Title>{copy.title}</Title>
          </div>
          <Description>{copy.description}</Description>
          <Notice>
            <BarChart3 aria-hidden="true" />
            <span>
              정확한 계산 결과를 제공하기 위해 V2 API 계약과 Gateway 연결을
              준비하고 있습니다. 임의 계산이나 이전 시스템의 결과는 제공하지
              않습니다.
            </span>
          </Notice>
          <Actions>
            <ActionLink href="/analysis" $primary>
              상권분석 이용하기
              <ArrowRight aria-hidden="true" />
            </ActionLink>
            <ActionLink href="/">
              <Home aria-hidden="true" />
              홈으로
            </ActionLink>
          </Actions>
        </Hero>

        <FeatureSection aria-labelledby="simulation-planned-features">
          <SectionHeader>
            <SectionTitle id="simulation-planned-features">
              계약 확정 후 제공할 기능
            </SectionTitle>
            <SectionBody>
              Swagger와 오류·인증 정책이 확정되면 화면별 구현을 다시 진행합니다.
            </SectionBody>
          </SectionHeader>
          <FeatureGrid>
            {plannedFeatures.map(feature => {
              const FeatureIconComponent = feature.icon

              return (
                <FeatureCard key={feature.title}>
                  <FeatureIcon>
                    <FeatureIconComponent aria-hidden="true" />
                  </FeatureIcon>
                  <FeatureTitle>{feature.title}</FeatureTitle>
                  <FeatureBody>{feature.description}</FeatureBody>
                </FeatureCard>
              )
            })}
          </FeatureGrid>
        </FeatureSection>
      </Container>
    </Page>
  )
}
