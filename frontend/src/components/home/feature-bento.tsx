import Link from 'next/link'
import {
  ArrowRight,
  Bookmark,
  Columns3,
  MessageSquare,
  UserPlus,
} from 'lucide-react'
import styled from 'styled-components'
import { shellWidth } from '@/styles/layout'

const Section = styled.section`
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 64px 0;

  /* 태블릿 이하에서는 화면을 꽉 채우지 않고 콘텐츠 높이에 맞춰 여백 과다를 줄인다. */
  @media (max-width: 768px) {
    min-height: auto;
    padding: 56px 0;
  }

  @media (max-width: 640px) {
    padding: 48px 0;
  }
`

const Inner = styled.div`
  ${shellWidth}
`

const Header = styled.div`
  max-width: 680px;
  display: grid;
  gap: 10px;
  margin-bottom: 28px;

  @media (max-width: 640px) {
    margin-bottom: 20px;
  }
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

  @media (max-width: 640px) {
    font-size: 22px;
    line-height: 30px;
  }

  @media (max-width: 480px) {
    font-size: 20px;
    line-height: 28px;
  }
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

const DevBadge = styled.span`
  margin-left: auto;
  font-size: 12px;
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  background: var(--color-surface-muted);
  color: var(--color-text-caption);
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
    gap: 16px;
    padding: 20px;
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

  /* 모바일: 버튼을 세로로 쌓고 폭을 채워 탭 영역을 키운다. */
  @media (max-width: 480px) {
    flex-direction: column;
    align-items: stretch;
  }
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
              <Bookmark aria-hidden="true" />
              <CardTitle>분석 화면 보관함</CardTitle>
            </CardHead>
            <CardBody>
              분석한 화면을 그대로 저장하고, 링크 하나로 공유합니다.
            </CardBody>
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
              <Columns3 aria-hidden="true" />
              <CardTitle>상권 비교</CardTitle>
            </CardHead>
            <CardBody>후보 상권을 나란히 놓고 지표로 비교합니다.</CardBody>
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
              <UserPlus aria-hidden="true" />
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
