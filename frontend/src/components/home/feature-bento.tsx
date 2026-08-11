import Link from 'next/link'
import { ArrowRight, Bookmark, MessageSquare, Sparkles } from 'lucide-react'
import styled from 'styled-components'

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
  border-radius: var(--radius-pill);
  background: var(--color-primary-100);
  color: var(--color-primary-700);
`

const DevBadge = styled.span`
  margin-left: auto;
  font-size: 12px;
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  background: var(--color-surface-muted);
  color: var(--color-text-caption);
`

const ReportCard = styled.div`
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-background-muted);
  padding: 14px 16px;
`

const ReportTop = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`

const ReportTitle = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-900);
`

const ReportGrade = styled.span`
  font-size: 12px;
  color: var(--color-text-caption);
`

const ReportRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border-200);
`

const ReportKey = styled.span`
  color: var(--color-text-600);
`

const ReportValue = styled.span<{ $positive?: boolean }>`
  font-weight: 600;
  color: ${p =>
    p.$positive ? 'var(--color-positive)' : 'var(--color-text-900)'};
`

const ReportFoot = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border-200);
  font-size: 12px;
  color: var(--color-text-caption);
`

const Dots = styled.span`
  display: inline-flex;
  gap: 3px;

  i {
    width: 5px;
    height: 5px;
    border-radius: var(--radius-pill);
    background: var(--color-border-300);
  }

  i:first-child {
    background: var(--color-primary-700);
  }
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
              지역과 업종만 고르면 AI가 상권 리포트를 만들어 드립니다.
            </CardBody>
            <ReportCard aria-hidden="true">
              <ReportTop>
                <ReportTitle>역삼동 · 카페 상권</ReportTitle>
                <ReportGrade>종합 A-</ReportGrade>
              </ReportTop>
              <ReportRow>
                <ReportKey>매출 추이</ReportKey>
                <ReportValue $positive>최근 6개월 +18%</ReportValue>
              </ReportRow>
              <ReportRow>
                <ReportKey>유동인구</ReportKey>
                <ReportValue>일 평균 3.2만</ReportValue>
              </ReportRow>
              <ReportRow>
                <ReportKey>경쟁 강도</ReportKey>
                <ReportValue>보통 · 32곳</ReportValue>
              </ReportRow>
              <ReportFoot>
                <span>AI가 리포트를 작성하고 있어요 · 대표 예시</span>
                <Dots>
                  <i />
                  <i />
                  <i />
                </Dots>
              </ReportFoot>
            </ReportCard>
          </Hero>

          <Card>
            <CardHead>
              <MessageSquare aria-hidden="true" />
              <CardTitle>커뮤니티 · 채팅</CardTitle>
              <DevBadge>개발중</DevBadge>
            </CardHead>
            <CardBody>
              예비 창업자와 정보를 나누고 실시간으로 대화합니다.
            </CardBody>
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
              <Sparkles aria-hidden="true" />
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
