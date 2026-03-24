import Link from 'next/link'
import styled from 'styled-components'

const Page = styled.main`
  padding-bottom: 80px;
`

const Hero = styled.section`
  padding: 80px 24px 64px;
  background:
    radial-gradient(
      circle at top left,
      rgba(51, 109, 211, 0.16),
      transparent 35%
    ),
    linear-gradient(180deg, #f7fbff 0%, #ffffff 100%);
`

const HeroInner = styled.div`
  width: min(1200px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
  gap: 32px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`

const HeroCopy = styled.div`
  display: grid;
  gap: 24px;
`

const Eyebrow = styled.p`
  color: var(--color-primary-700);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

const Title = styled.h1`
  max-width: 720px;
  color: var(--color-text-900);
  font-size: clamp(40px, 6vw, 64px);
  line-height: 1.05;
  letter-spacing: -0.05em;
`

const Body = styled.p`
  max-width: 640px;
  color: var(--color-text-500);
  font-size: 18px;
  line-height: 1.8;
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`

const PrimaryLink = styled(Link)`
  min-width: 180px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 20px;
  border-radius: 14px;
  background: var(--color-primary-700);
  color: white;
  font-weight: 700;
  box-shadow: 0 14px 36px rgba(21, 73, 181, 0.18);
`

const SecondaryLink = styled(Link)`
  min-width: 180px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 20px;
  border: 1px solid var(--color-primary-700);
  border-radius: 14px;
  background: white;
  color: var(--color-primary-700);
  font-weight: 700;
`

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const SummaryCard = styled.article`
  padding: 22px 24px;
  border: 1px solid rgba(21, 73, 181, 0.12);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 10px 30px rgba(21, 73, 181, 0.08);
`

const SummaryLabel = styled.p`
  margin-bottom: 10px;
  color: var(--color-text-500);
  font-size: 13px;
`

const SummaryValue = styled.p`
  color: var(--color-text-900);
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.03em;
`

const SummaryBody = styled.p`
  margin-top: 8px;
  color: var(--color-text-500);
  font-size: 14px;
  line-height: 1.7;
`

const VisualPanel = styled.div`
  position: relative;
  overflow: hidden;
  padding: 28px;
  border: 1px solid rgba(21, 73, 181, 0.12);
  border-radius: 28px;
  background:
    linear-gradient(160deg, rgba(21, 73, 181, 0.96), rgba(51, 109, 211, 0.86)),
    #1549b5;
  color: white;
  box-shadow: 0 24px 64px rgba(21, 73, 181, 0.18);
`

const VisualTitle = styled.p`
  margin-bottom: 12px;
  font-size: 26px;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.03em;
`

const VisualBody = styled.p`
  max-width: 380px;
  color: rgba(255, 255, 255, 0.82);
  line-height: 1.8;
`

const VisualImage = styled.img`
  margin-top: 28px;
  width: 100%;
  max-width: 420px;
  border-radius: 20px;
  opacity: 0.92;
`

const Section = styled.section`
  padding: 0 24px;
`

const SectionInner = styled.div`
  width: min(1200px, 100%);
  margin: 0 auto;
  padding-top: 56px;
`

const SectionHeader = styled.div`
  display: grid;
  gap: 12px;
  margin-bottom: 24px;
`

const SectionTitle = styled.h2`
  color: var(--color-text-900);
  font-size: clamp(28px, 4vw, 36px);
  line-height: 1.2;
  letter-spacing: -0.04em;
`

const SectionDescription = styled.p`
  max-width: 760px;
  color: var(--color-text-500);
  line-height: 1.8;
`

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`

const FeatureCard = styled.article`
  padding: 24px;
  border: 1px solid var(--color-border-200);
  border-radius: 24px;
  background: white;
  box-shadow: 0 10px 30px rgba(21, 73, 181, 0.08);
`

const FeatureTag = styled.p`
  margin-bottom: 12px;
  color: var(--color-primary-700);
  font-size: 13px;
  font-weight: 700;
`

const FeatureTitle = styled.h3`
  margin-bottom: 12px;
  color: var(--color-text-900);
  font-size: 22px;
  line-height: 1.3;
`

const FeatureBody = styled.p`
  color: var(--color-text-500);
  line-height: 1.75;
`

const RouteGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const RouteCard = styled(Link)`
  padding: 22px 24px;
  border: 1px solid var(--color-border-200);
  border-radius: 20px;
  background: var(--color-surface-muted);
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(21, 73, 181, 0.24);
    box-shadow: 0 14px 36px rgba(21, 73, 181, 0.12);
  }
`

const RouteTitle = styled.p`
  margin-bottom: 8px;
  color: var(--color-text-900);
  font-size: 18px;
  font-weight: 700;
`

const RouteBody = styled.p`
  color: var(--color-text-500);
  line-height: 1.7;
`

export default function HomePage() {
  return (
    <Page>
      <Hero>
        <HeroInner>
          <HeroCopy>
            <Eyebrow>Data Product</Eyebrow>
            <Title>
              상권 데이터 탐색과 창업 의사결정을 하나의 흐름으로 연결합니다.
            </Title>
            <Body>
              NowDoBoss V2는 레거시 React 앱을 Next.js App Router 구조로
              이관하는 과정에 있습니다. 현재 단계에서는 메인, 인증, 프로필
              경험부터 안정적으로 옮기고, 이후 분석·추천·커뮤니티·채팅 순으로
              기능을 확장합니다.
            </Body>
            <Actions>
              <PrimaryLink href="/status">구별현황 보기</PrimaryLink>
              <SecondaryLink href="/register">회원가입 시작</SecondaryLink>
            </Actions>
            <SummaryGrid>
              <SummaryCard>
                <SummaryLabel>현재 목표</SummaryLabel>
                <SummaryValue>Phase 3</SummaryValue>
                <SummaryBody>
                  메인, 인증, 프로필 경험을 실제 동작 가능한 상태로 이관합니다.
                </SummaryBody>
              </SummaryCard>
              <SummaryCard>
                <SummaryLabel>SEO 상태</SummaryLabel>
                <SummaryValue>기본 적용</SummaryValue>
                <SummaryBody>
                  공개 페이지 metadata, robots, sitemap 골격이 준비되어
                  있습니다.
                </SummaryBody>
              </SummaryCard>
              <SummaryCard>
                <SummaryLabel>디자인 원칙</SummaryLabel>
                <SummaryValue>Calm Blue</SummaryValue>
                <SummaryBody>
                  화이트 기반 표면과 네이비 포인트를 사용하는 데이터 중심
                  UI입니다.
                </SummaryBody>
              </SummaryCard>
            </SummaryGrid>
          </HeroCopy>
          <VisualPanel>
            <VisualTitle>이관 우선순위가 분명한 제품 구조</VisualTitle>
            <VisualBody>
              진입 경로와 계정 흐름을 먼저 안정화한 뒤, 상태 조회와 분석 기능을
              순차적으로 붙이는 전략을 사용합니다.
            </VisualBody>
            <VisualImage
              src="/gifs/charts.gif"
              alt="NowDoBoss 시각화 미리보기"
            />
          </VisualPanel>
        </HeroInner>
      </Hero>

      <Section>
        <SectionInner>
          <SectionHeader>
            <SectionTitle>이번 단계에서 확보하는 기준</SectionTitle>
            <SectionDescription>
              페이지를 단순히 옮기는 것이 아니라, Next 기반 공통 레이아웃과 인증
              세션, 메타데이터, 프로필 구조를 재사용 가능한 패턴으로 고정합니다.
            </SectionDescription>
          </SectionHeader>
          <FeatureGrid>
            <FeatureCard>
              <FeatureTag>01. Entry</FeatureTag>
              <FeatureTitle>
                메인 페이지를 새 디자인 토큰으로 재구성
              </FeatureTitle>
              <FeatureBody>
                브랜드 톤을 유지하면서도 이후 상태·분석 화면으로 자연스럽게
                이동할 수 있는 링크 구조를 만듭니다.
              </FeatureBody>
            </FeatureCard>
            <FeatureCard>
              <FeatureTag>02. Account</FeatureTag>
              <FeatureTitle>
                로그인, 회원가입, 소셜 콜백을 Next 구조에 정착
              </FeatureTitle>
              <FeatureBody>
                레거시 API와 세션 모델을 유지한 채로 App Router와 client state에
                맞게 인증 흐름을 정리합니다.
              </FeatureBody>
            </FeatureCard>
            <FeatureCard>
              <FeatureTag>03. Profile</FeatureTag>
              <FeatureTitle>
                프로필, 설정, 북마크 영역을 공통 쉘로 통합
              </FeatureTitle>
              <FeatureBody>
                개인화 영역을 먼저 안정화해 이후 북마크, 저장, 비교 기능을 더
                쉽게 이어붙일 수 있도록 만듭니다.
              </FeatureBody>
            </FeatureCard>
          </FeatureGrid>
        </SectionInner>
      </Section>

      <Section>
        <SectionInner>
          <SectionHeader>
            <SectionTitle>바로 이동할 수 있는 주요 경로</SectionTitle>
            <SectionDescription>
              아직 전체 기능이 이관된 것은 아니지만, 현재 단계에서 접근 가능한
              흐름과 다음 우선순위를 명확히 구분합니다.
            </SectionDescription>
          </SectionHeader>
          <RouteGrid>
            <RouteCard href="/login">
              <RouteTitle>로그인</RouteTitle>
              <RouteBody>
                기존 계정으로 세션을 복구하고 프로필 및 저장 목록에 접근합니다.
              </RouteBody>
            </RouteCard>
            <RouteCard href="/register">
              <RouteTitle>회원가입</RouteTitle>
              <RouteBody>
                소셜 또는 이메일 회원가입으로 서비스 진입 경로를 시작합니다.
              </RouteBody>
            </RouteCard>
            <RouteCard href="/profile/bookmarks/analysis">
              <RouteTitle>프로필 북마크</RouteTitle>
              <RouteBody>
                분석 및 시뮬레이션 저장 내역을 확인하고 프로필 편집 흐름을
                점검합니다.
              </RouteBody>
            </RouteCard>
            <RouteCard href="/status">
              <RouteTitle>구별현황</RouteTitle>
              <RouteBody>
                Phase 4에서 본격 이관할 상태 조회 화면의 진입 포인트입니다.
              </RouteBody>
            </RouteCard>
          </RouteGrid>
        </SectionInner>
      </Section>
    </Page>
  )
}
