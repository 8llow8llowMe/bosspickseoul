import Link from 'next/link'
import { ArrowRight, Bookmark, Sparkles, Users } from 'lucide-react'
import styled from 'styled-components'
import MiniAreaChart from '@/components/home/mini-area-chart'

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

const Inner = styled.div`
  width: min(1120px, 100%);
  margin: 0 auto;
`

const Header = styled.div`
  max-width: 680px;
  display: grid;
  gap: 10px;
  margin-bottom: 28px;
`

const Eyebrow = styled.p`
  color: var(--color-text-caption);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
`

const Title = styled.h2`
  color: var(--color-text-900);
  font-size: 26px;
  font-weight: 700;
  line-height: 36px;
  word-break: keep-all;
`

const Bento = styled.div`
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  grid-template-rows: auto auto;
  gap: 12px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`

const Hero = styled.article`
  grid-row: span 2;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 22px;

  @media (max-width: 720px) {
    grid-row: auto;
  }
`

const Card = styled.article`
  display: grid;
  gap: 8px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 20px;
`

const CardHead = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-700);

  svg {
    width: 20px;
    height: 20px;
    stroke: currentColor;
  }
`

const CardTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-900);
`

const CardBody = styled.p`
  font-size: 14px;
  line-height: 22px;
  color: var(--color-text-600);
  word-break: keep-all;
`

const Badge = styled.span`
  margin-left: auto;
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--color-primary-100);
  color: var(--color-primary-700);
`

const ChartWrap = styled.div`
  margin-top: auto;
  color: var(--color-primary-700);
`

const Cta = styled.div`
  margin-top: 24px;
  padding: 24px;
  border-radius: var(--radius-card);
  background: var(--color-background-muted);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 20px;
  align-items: center;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

const CtaTitle = styled.p`
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-900);
`

const CtaBody = styled.p`
  margin-top: 4px;
  font-size: 14px;
  color: var(--color-text-600);
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
  gap: 8px;
  padding: 0 18px;
  border-radius: var(--radius-control);
  background: var(--color-primary-700);
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;

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
  gap: 8px;
  padding: 0 18px;
  border-radius: var(--radius-control);
  background: var(--color-primary-100);
  color: var(--color-primary-700);
  font-size: 15px;
  font-weight: 600;

  svg {
    width: 18px;
    height: 18px;
    stroke: currentColor;
  }
`

export default function FeatureBento() {
  return (
    <Section>
      <Inner>
        <Header>
          <Eyebrow>더 많은 기능</Eyebrow>
          <Title>분석 이후의 판단까지, 한 곳에서 이어집니다.</Title>
        </Header>

        <Bento>
          <Hero>
            <CardHead>
              <Sparkles aria-hidden="true" />
              <CardTitle>AI 리포트</CardTitle>
              <Badge>실시간 생성</Badge>
            </CardHead>
            <CardBody>
              AI 에이전트가 상권 데이터를 분석해 맞춤형 리포트를 스트리밍으로
              완성합니다.
            </CardBody>
            <ChartWrap>
              <MiniAreaChart values={[20, 34, 30, 48, 54, 70]} />
            </ChartWrap>
          </Hero>

          <Card>
            <CardHead>
              <Users aria-hidden="true" />
              <CardTitle>커뮤니티</CardTitle>
            </CardHead>
            <CardBody>같은 업종 예비 창업자들과 정보를 나눕니다.</CardBody>
          </Card>

          <Card>
            <CardHead>
              <Bookmark aria-hidden="true" />
              <CardTitle>저장 · 알림</CardTitle>
            </CardHead>
            <CardBody>관심 상권을 저장하고 변화를 알림으로 받습니다.</CardBody>
          </Card>
        </Bento>

        <Cta>
          <div>
            <CtaTitle>지금 내 상권을 분석해 보세요.</CtaTitle>
            <CtaBody>
              회원가입 후 분석 리포트와 상권 추천을 이어서 사용할 수 있습니다.
            </CtaBody>
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
        </Cta>
      </Inner>
    </Section>
  )
}
