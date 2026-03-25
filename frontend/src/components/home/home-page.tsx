'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import styled from 'styled-components'

const statusStories = [
  {
    step: '01',
    title: '서울 전체 상권의 온도를 먼저 읽습니다.',
    body: '유동 인구와 점포 수, 주요 업종 지표를 먼저 비교해 입지 검토의 시작점을 잡습니다.',
  },
  {
    step: '02',
    title: '데이터 카드와 요약 지표로 빠르게 판단합니다.',
    body: '차트와 카드 중심의 구조라 긴 설명을 읽지 않아도 지역 간 차이를 바로 이해할 수 있습니다.',
  },
  {
    step: '03',
    title: '조회에서 끝나지 않고 다음 흐름으로 넘어갑니다.',
    body: '관심 지역을 정한 뒤 바로 분석과 추천 화면으로 이어질 수 있어 다음 판단으로 자연스럽게 넘어갑니다.',
  },
] as const

const analysisStories = [
  {
    step: '01',
    title: '입력 조건을 리포트로 바꾸는 흐름을 강조합니다.',
    body: '업종과 지역, 조건 입력이 실제 분석 결과와 연결되는 흐름을 한 번에 이해할 수 있습니다.',
  },
  {
    step: '02',
    title: '결과는 저장과 비교, 공유로 이어집니다.',
    body: '단순 조회로 끝나지 않고 저장과 비교, 공유까지 이어져 여러 후보를 의사결정용 리포트로 다룰 수 있습니다.',
  },
  {
    step: '03',
    title: '시뮬레이션까지 이어지는 실행 동선을 보여줍니다.',
    body: '분석 결과를 확인한 뒤 바로 시뮬레이션으로 이어져 실제 창업 판단까지 빠르게 연결할 수 있습니다.',
  },
] as const

const serviceCards = [
  {
    title: '상권 추천',
    body: '추천 후보 지역을 빠르게 비교하고, 북마크와 리포트 흐름으로 이어지는 탐색형 진입점입니다.',
    href: '/recommend',
    image: '/images/recommend_map.png',
  },
  {
    title: '커뮤니티',
    body: '실제 창업 경험과 상권 질문을 공유하며 분석 이후의 고민을 더 구체화할 수 있습니다.',
    href: '/community/list',
    image: '/images/speaker.png',
  },
  {
    title: '실시간 채팅',
    body: '방 참여와 메시지 수신까지 이어지는 실시간 상담형 커뮤니케이션 흐름을 지원합니다.',
    href: '/chatting/list',
    image: '/images/profile.png',
  },
] as const

const clampNumber = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, max))

const Page = styled.main`
  overflow-x: hidden;
  overflow-y: visible;
  background:
    linear-gradient(180deg, #edf5ff 0%, #ffffff 18%, #f7faff 64%, #ffffff 100%),
    #ffffff;
`

const Hero = styled.section`
  position: relative;
  min-height: calc(100vh - 72px);
  padding: 28px 24px 88px;
  display: flex;
  align-items: center;
  background:
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.04),
      rgba(255, 255, 255, 0.74)
    ),
    url('/images/background123.png') center / cover no-repeat;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(
        circle at 16% 18%,
        rgba(76, 130, 255, 0.18),
        transparent 24%
      ),
      radial-gradient(
        circle at 84% 26%,
        rgba(21, 73, 181, 0.12),
        transparent 22%
      ),
      linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.12),
        rgba(255, 255, 255, 0.82)
      );
    pointer-events: none;
  }
`

const HeroGlow = styled.div`
  position: absolute;
  border-radius: 999px;
  background: radial-gradient(
    circle,
    rgba(73, 127, 255, 0.28),
    transparent 72%
  );
  filter: blur(10px);
  pointer-events: none;
`

const HeroInner = styled.div`
  position: relative;
  z-index: 1;
  width: min(1200px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  gap: 34px;
  align-items: center;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`

const HeroCopy = styled.div`
  display: grid;
  gap: 24px;
  will-change: transform;
`

const Eyebrow = styled.p`
  color: var(--color-primary-700);
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`

const Title = styled.h1`
  max-width: 760px;
  color: var(--color-text-900);
  font-size: clamp(44px, 6vw, 78px);
  line-height: 1.02;
  letter-spacing: -0.065em;
  word-break: keep-all;

  strong {
    color: var(--color-primary-700);
  }
`

const Body = styled.p`
  max-width: 650px;
  color: var(--color-text-700);
  font-size: clamp(18px, 2vw, 22px);
  line-height: 1.85;
  word-break: keep-all;
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`

const PrimaryLink = styled(Link)`
  min-width: 188px;
  min-height: 54px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 22px;
  border-radius: 999px;
  background: var(--color-primary-700);
  color: white;
  font-size: 15px;
  font-weight: 700;
  box-shadow: 0 18px 40px rgba(21, 73, 181, 0.22);
  transition:
    transform 180ms ease,
    box-shadow 180ms ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 24px 48px rgba(21, 73, 181, 0.26);
  }
`

const SecondaryLink = styled(Link)`
  min-width: 188px;
  min-height: 54px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 22px;
  border: 1px solid rgba(21, 73, 181, 0.18);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  color: var(--color-primary-700);
  font-size: 15px;
  font-weight: 700;
  box-shadow: 0 12px 28px rgba(21, 73, 181, 0.08);
  backdrop-filter: blur(12px);
`

const ScrollButton = styled.button`
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text-500);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
`

const ScrollDot = styled.span`
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.88);
  color: var(--color-primary-700);
  box-shadow: 0 12px 28px rgba(21, 73, 181, 0.12);
`

const HeroAside = styled.div`
  display: grid;
  will-change: transform;
`

const GlassPanel = styled.div`
  position: relative;
  overflow: hidden;
  padding: 28px;
  border: 1px solid rgba(21, 73, 181, 0.12);
  border-radius: 32px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(18px);
  box-shadow: 0 24px 64px rgba(21, 73, 181, 0.14);
`

const PanelLabel = styled.p`
  margin-bottom: 12px;
  color: var(--color-primary-700);
  font-size: 14px;
  font-weight: 800;
`

const PanelTitle = styled.p`
  margin-bottom: 16px;
  color: var(--color-text-900);
  font-size: clamp(24px, 3vw, 34px);
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.04em;
`

const PanelBody = styled.p`
  color: var(--color-text-500);
  line-height: 1.8;
`

const PanelPreview = styled.img`
  width: 100%;
  margin-top: 20px;
  border-radius: 24px;
  object-fit: cover;
  will-change: transform;
`

const IntroSection = styled.section`
  min-height: 100vh;
  padding: 112px 24px;
  display: flex;
  align-items: center;
  background:
    linear-gradient(
      180deg,
      rgba(246, 249, 255, 0.96),
      rgba(255, 255, 255, 0.94)
    ),
    radial-gradient(
      circle at 0% 100%,
      rgba(204, 217, 249, 0.82),
      transparent 42%
    );
`

const IntroInner = styled.div`
  width: min(980px, 100%);
  margin: 0 auto;
  display: grid;
  gap: 28px;
  align-content: center;
  justify-items: center;
  text-align: center;
`

const IntroText = styled.p`
  color: var(--color-text-900);
  font-size: clamp(30px, 4vw, 48px);
  font-weight: 700;
  line-height: 1.62;
  letter-spacing: -0.05em;
  word-break: keep-all;
`

const IntroBody = styled.p`
  max-width: 760px;
  color: var(--color-text-500);
  font-size: 18px;
  line-height: 1.9;
  word-break: keep-all;
`

const Kicker = styled.p`
  color: var(--color-primary-700);
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

const SectionTitle = styled.h2`
  color: var(--color-text-900);
  font-size: clamp(32px, 4vw, 48px);
  line-height: 1.18;
  letter-spacing: -0.05em;
  word-break: keep-all;
`

const SectionBody = styled.p`
  color: var(--color-text-500);
  font-size: 17px;
  line-height: 1.9;
  word-break: keep-all;
`

const NarrativeSection = styled.section`
  padding: 112px 24px 128px;
`

const NarrativeInner = styled.div`
  width: min(1200px, 100%);
  margin: 0 auto;
  display: grid;
  gap: 40px;
`

const NarrativeHeader = styled.div`
  width: min(780px, 100%);
  display: grid;
  gap: 16px;
`

const NarrativeBody = styled.div<{ $reverse?: boolean }>`
  display: grid;
  grid-template-columns: minmax(0, 0.94fr) minmax(0, 1.06fr);
  gap: 40px;
  align-items: start;

  @media (max-width: 1080px) {
    grid-template-columns: 1fr;
  }

  ${props =>
    props.$reverse
      ? `
    > :first-child {
      order: 2;
    }

    > :last-child {
      order: 1;
    }
  `
      : ''}
`

const NarrativeMedia = styled.div`
  position: relative;
`

const NarrativeVisual = styled.div<{ $tone?: 'light' | 'dark' }>`
  position: relative;
  overflow: hidden;
  padding: 28px 28px 42px;
  border: 1px solid rgba(21, 73, 181, 0.12);
  border-radius: 32px;
  background: ${props =>
    props.$tone === 'light'
      ? `
        radial-gradient(circle at top left, rgba(51, 109, 211, 0.12), transparent 36%),
        #ffffff
      `
      : `
        linear-gradient(160deg, rgba(21, 73, 181, 0.96), rgba(51, 109, 211, 0.9)),
        #1549b5
      `};
  box-shadow: 0 28px 60px rgba(21, 73, 181, 0.16);
  transition:
    transform 220ms ease,
    box-shadow 220ms ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 34px 68px rgba(21, 73, 181, 0.2);
  }
`

const NarrativeVisualEyebrow = styled.p<{ $tone?: 'light' | 'dark' }>`
  margin-bottom: 12px;
  color: ${props =>
    props.$tone === 'light'
      ? 'var(--color-primary-700)'
      : 'rgba(255, 255, 255, 0.78)'};
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`

const NarrativeVisualTitle = styled.p<{ $tone?: 'light' | 'dark' }>`
  margin-bottom: 12px;
  color: ${props =>
    props.$tone === 'light' ? 'var(--color-text-900)' : 'white'};
  font-size: 30px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.04em;
`

const NarrativeVisualBody = styled.p<{ $tone?: 'light' | 'dark' }>`
  color: ${props =>
    props.$tone === 'light'
      ? 'var(--color-text-500)'
      : 'rgba(255, 255, 255, 0.78)'};
  line-height: 1.8;
`

const NarrativeVisualImage = styled.img`
  width: 100%;
  margin-top: 20px;
  border-radius: 24px;
  object-fit: cover;
  will-change: transform;
`

const StoryStack = styled.div`
  display: grid;
  gap: 32px;
  padding-top: 10px;
`

const StoryCard = styled.article<{ $offset?: number }>`
  padding: 26px 26px 24px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border: 1px solid rgba(21, 73, 181, 0.1);
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 16px 34px rgba(21, 73, 181, 0.08);
  transform: translateY(${props => `${props.$offset ?? 0}px`});
  transition:
    transform 220ms ease,
    box-shadow 220ms ease,
    border-color 220ms ease;

  &:hover {
    transform: translateY(${props => `${(props.$offset ?? 0) - 6}px`});
    border-color: rgba(21, 73, 181, 0.22);
    box-shadow: 0 24px 42px rgba(21, 73, 181, 0.12);
  }

  @media (max-width: 1080px) {
    transform: none;

    &:hover {
      transform: translateY(-4px);
    }
  }
`

const StoryStep = styled.p`
  margin-bottom: 12px;
  color: var(--color-primary-700);
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.08em;
`

const StoryTitle = styled.h3`
  margin-bottom: 12px;
  color: var(--color-text-900);
  font-size: 24px;
  line-height: 1.32;
  letter-spacing: -0.03em;
  word-break: keep-all;
`

const StoryBody = styled.p`
  color: var(--color-text-500);
  line-height: 1.85;
  word-break: keep-all;
`

const RecommendSection = styled.section`
  padding: 116px 24px 110px;
`

const RecommendInner = styled.div`
  width: min(1200px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 0.98fr) minmax(0, 1.02fr);
  gap: 32px;
  align-items: center;

  @media (max-width: 1080px) {
    grid-template-columns: 1fr;
  }
`

const RecommendCopy = styled.div`
  display: grid;
  gap: 18px;
`

const BulletList = styled.div`
  display: grid;
  gap: 14px;
  margin-top: 10px;
`

const BulletItem = styled.div`
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
`

const BulletMark = styled.span`
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--color-primary-100);
  color: var(--color-primary-700);
  font-size: 13px;
  font-weight: 800;
`

const BulletText = styled.p`
  color: var(--color-text-700);
  line-height: 1.8;
  word-break: keep-all;
`

const RecommendPanel = styled.div`
  position: relative;
  overflow: hidden;
  padding: 28px 28px 42px;
  border: 1px solid rgba(21, 73, 181, 0.12);
  border-radius: 32px;
  background:
    linear-gradient(160deg, rgba(21, 73, 181, 0.96), rgba(51, 109, 211, 0.88)),
    #1549b5;
  box-shadow: 0 28px 60px rgba(21, 73, 181, 0.16);
`

const RecommendPanelTitle = styled.p`
  margin-bottom: 12px;
  color: white;
  font-size: 30px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.04em;
`

const RecommendPanelBody = styled.p`
  max-width: 420px;
  color: rgba(255, 255, 255, 0.78);
  line-height: 1.8;
`

const RecommendImage = styled.img`
  width: 100%;
  margin-top: 20px;
  border-radius: 24px;
  will-change: transform;
`

const ServiceSection = styled.section`
  padding: 112px 24px 118px;
  background:
    linear-gradient(
      180deg,
      rgba(240, 245, 255, 0.95),
      rgba(255, 255, 255, 0.98)
    ),
    #f0f5ff;
`

const ServiceHeader = styled.div`
  width: min(820px, 100%);
  margin: 0 auto 40px;
  display: grid;
  gap: 14px;
  text-align: center;
`

const ServiceGrid = styled.div`
  width: min(1200px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`

const ServiceCard = styled(Link)`
  display: grid;
  gap: 18px;
  padding: 28px;
  border: 1px solid rgba(21, 73, 181, 0.1);
  border-radius: 28px;
  background: white;
  box-shadow: 0 20px 44px rgba(21, 73, 181, 0.1);
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    border-color 180ms ease;

  &:hover {
    transform: translateY(-4px);
    border-color: rgba(21, 73, 181, 0.22);
    box-shadow: 0 26px 48px rgba(21, 73, 181, 0.14);
  }
`

const ServiceIcon = styled.img`
  width: 100%;
  height: 176px;
  border-radius: 22px;
  object-fit: cover;
`

const ServiceTitle = styled.h3`
  color: var(--color-text-900);
  font-size: 24px;
  line-height: 1.3;
  letter-spacing: -0.03em;
`

const ServiceBody = styled.p`
  color: var(--color-text-500);
  line-height: 1.8;
`

const ServiceCta = styled.span`
  color: var(--color-primary-700);
  font-size: 14px;
  font-weight: 800;
`

const FinalSection = styled.section`
  padding: 96px 24px 120px;
`

const FinalCard = styled.div`
  width: min(1100px, 100%);
  margin: 0 auto;
  padding: 40px;
  border-radius: 34px;
  background:
    linear-gradient(135deg, rgba(21, 73, 181, 0.98), rgba(51, 109, 211, 0.92)),
    #1549b5;
  color: white;
  box-shadow: 0 26px 60px rgba(21, 73, 181, 0.18);

  @media (max-width: 768px) {
    padding: 32px 24px;
  }
`

const FinalInner = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 24px;
  align-items: center;

  @media (max-width: 880px) {
    grid-template-columns: 1fr;
  }
`

const FinalTitle = styled.h2`
  font-size: clamp(28px, 4vw, 42px);
  line-height: 1.2;
  letter-spacing: -0.04em;
  word-break: keep-all;
`

const FinalBody = styled.p`
  margin-top: 12px;
  color: rgba(255, 255, 255, 0.82);
  line-height: 1.8;
  word-break: keep-all;
`

const FinalActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`

const FinalPrimaryLink = styled(PrimaryLink)`
  background: white;
  color: var(--color-primary-700);
  box-shadow: none;
`

const FinalSecondaryLink = styled(SecondaryLink)`
  border-color: rgba(255, 255, 255, 0.24);
  background: rgba(255, 255, 255, 0.08);
  color: white;
`

function useWindowScrollValue() {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    let frame = 0

    const update = () => {
      frame = 0
      setScrollY(window.scrollY)
    }

    const handleScroll = () => {
      if (frame) {
        window.cancelAnimationFrame(frame)
      }

      frame = window.requestAnimationFrame(update)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame)
      }
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return scrollY
}

type NarrativeSectionProps = {
  kicker: string
  title: string
  body: string
  visualEyebrow: string
  visualTitle: string
  visualBody: string
  image: string
  imageAlt: string
  stories: ReadonlyArray<{
    step: string
    title: string
    body: string
  }>
  reverse?: boolean
  tone?: 'light' | 'dark'
  scrollY: number
  parallaxFactor?: number
}

function NarrativeSectionView({
  kicker,
  title,
  body,
  visualEyebrow,
  visualTitle,
  visualBody,
  image,
  imageAlt,
  stories,
  reverse = false,
  tone = 'dark',
  scrollY,
  parallaxFactor = 0.03,
}: NarrativeSectionProps) {
  const imageOffset = clampNumber(scrollY * parallaxFactor, 0, 10)

  return (
    <NarrativeSection>
      <NarrativeInner>
        <NarrativeHeader>
          <Kicker>{kicker}</Kicker>
          <SectionTitle>{title}</SectionTitle>
          <SectionBody>{body}</SectionBody>
        </NarrativeHeader>
        <NarrativeBody $reverse={reverse}>
          <NarrativeMedia>
            <NarrativeVisual $tone={tone}>
              <NarrativeVisualEyebrow $tone={tone}>
                {visualEyebrow}
              </NarrativeVisualEyebrow>
              <NarrativeVisualTitle $tone={tone}>
                {visualTitle}
              </NarrativeVisualTitle>
              <NarrativeVisualBody $tone={tone}>
                {visualBody}
              </NarrativeVisualBody>
              <NarrativeVisualImage
                src={image}
                alt={imageAlt}
                style={{ transform: `translateY(${-imageOffset}px)` }}
              />
            </NarrativeVisual>
          </NarrativeMedia>

          <StoryStack>
            {stories.map((story, index) => (
              <StoryCard
                key={story.step}
                $offset={index === 1 ? 28 : index === 2 ? 12 : 0}
              >
                <StoryStep>{story.step}</StoryStep>
                <StoryTitle>{story.title}</StoryTitle>
                <StoryBody>{story.body}</StoryBody>
              </StoryCard>
            ))}
          </StoryStack>
        </NarrativeBody>
      </NarrativeInner>
    </NarrativeSection>
  )
}

export default function HomePage() {
  const scrollY = useWindowScrollValue()
  const heroCopyOffset = clampNumber(scrollY * -0.05, -34, 0)
  const heroAsideOffset = clampNumber(scrollY * 0.06, 0, 44)
  const heroPreviewOffset = clampNumber(scrollY * 0.08, 0, 30)
  const heroGlowOffset = clampNumber(scrollY * 0.14, 0, 80)
  const recommendImageOffset = clampNumber(scrollY * 0.018, 0, 10)

  return (
    <Page>
      <Hero>
        <HeroGlow
          style={{
            width: '420px',
            height: '420px',
            top: `${40 + heroGlowOffset * 0.2}px`,
            left: '-110px',
            transform: `translateY(${heroGlowOffset}px)`,
          }}
        />
        <HeroGlow
          style={{
            width: '320px',
            height: '320px',
            right: '-40px',
            bottom: '42px',
            opacity: 0.8,
            transform: `translateY(${-heroGlowOffset * 0.55}px)`,
          }}
        />
        <HeroInner>
          <HeroCopy style={{ transform: `translateY(${heroCopyOffset}px)` }}>
            <Eyebrow>Seoul Commerce Intelligence</Eyebrow>
            <Title>
              서울시 상권을 한눈에,
              <br />
              <strong>창업 판단의 흐름</strong>까지
              <br />
              NowDoBoss로 이어갑니다.
            </Title>
            <Body>
              서울시 상권 데이터를 빠르게 훑어보고, 관심 지역을 분석과 추천,
              시뮬레이션과 커뮤니티 흐름으로 자연스럽게 이어갈 수 있도록 메인을
              구성했습니다.
            </Body>
            <Actions>
              <PrimaryLink href="/analysis">상권분석 바로가기</PrimaryLink>
              <SecondaryLink href="/analysis/simulation">
                창업 시뮬레이션
              </SecondaryLink>
            </Actions>
            <ScrollButton
              type="button"
              onClick={() => {
                document
                  .getElementById('landing-overview')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
            >
              <ScrollDot>↓</ScrollDot>
              아래로 내려 서비스 흐름 보기
            </ScrollButton>
          </HeroCopy>

          <HeroAside style={{ transform: `translateY(${heroAsideOffset}px)` }}>
            <GlassPanel>
              <PanelLabel>서비스 개요</PanelLabel>
              <PanelTitle>
                상권 데이터와 창업 실행 단계를
                <br />한 페이지에서 소개합니다.
              </PanelTitle>
              <PanelBody>
                상권 현황 확인부터 분석과 실행 판단까지, NowDoBoss가 제공하는
                주요 흐름을 한 화면에서 빠르게 이해할 수 있습니다.
              </PanelBody>
              <PanelPreview
                src="/gifs/charts.gif"
                alt="상권 데이터 시각화 예시"
                style={{ transform: `translateY(${heroPreviewOffset}px)` }}
              />
            </GlassPanel>
          </HeroAside>
        </HeroInner>
      </Hero>

      <IntroSection id="landing-overview">
        <IntroInner>
          <IntroText>
            서울의 상권 정보를 쉽게 파악하고,
            <br />
            그 다음 행동까지 자연스럽게 이어지도록
            <br />
            랜딩의 스크롤 리듬을 다시 설계했습니다.
          </IntroText>
          <IntroBody>
            구별현황부터 상권분석, 추천, 커뮤니티와 채팅까지 이어지는 기능을 한
            흐름으로 배치해 사용자가 어디서 시작하고 다음에 무엇을 할지
            자연스럽게 파악할 수 있게 했습니다.
          </IntroBody>
        </IntroInner>
      </IntroSection>

      <NarrativeSectionView
        kicker="Status Overview"
        title="먼저 서울 상권의 현재 상태를 빠르게 읽습니다."
        body="자치구 단위의 상권 현황을 먼저 읽고, 유동 인구와 점포 수, 주요 업종 지표를 비교하면서 어디를 더 깊게 볼지 판단할 수 있게 첫 번째 데이터 섹션을 구성했습니다."
        visualEyebrow="서울 상권 현황"
        visualTitle="구별현황으로 현재 시장의 결을 읽습니다."
        visualBody="서울 주요 자치구의 흐름을 먼저 읽고, 입지 검토가 필요한 지역을 빠르게 추려낼 수 있도록 구성했습니다."
        image="/images/threeChartImg.png"
        imageAlt="상권 현황 시각화 카드"
        stories={statusStories}
        scrollY={scrollY}
      />

      <NarrativeSectionView
        kicker="Analysis Report"
        title="입력한 조건을 리포트와 시뮬레이션으로 확장합니다."
        body="분석은 NowDoBoss의 중심축이기 때문에 두 번째 내러티브 구간으로 길게 잡았습니다. 사용자는 결과를 읽고 저장하고 비교하고 공유하는 전체 흐름을 메인에서 먼저 체감합니다."
        visualEyebrow="창업 분석 리포트"
        visualTitle="입력부터 리포트, 시뮬레이션까지 한 번에 이어집니다."
        visualBody="조건 입력 이후 결과 확인, 저장, 비교, 시뮬레이션까지 이어지는 분석 흐름을 한 눈에 이해할 수 있습니다."
        image="/images/main_recommend_report.png"
        imageAlt="창업 분석 리포트 예시"
        stories={analysisStories}
        reverse
        tone="light"
        scrollY={scrollY}
        parallaxFactor={0.024}
      />

      <RecommendSection>
        <RecommendInner>
          <RecommendCopy>
            <Kicker>Recommendation</Kicker>
            <SectionTitle>
              추천 화면에서 서울 안의 유망 입지를 좁혀나갑니다.
            </SectionTitle>
            <SectionBody>
              추천은 데이터 탐색과 실행 사이를 잇는 기능입니다. 관심 지역을
              비교하고 저장하면서 다음 분석 대상을 좁혀나가는 실제 사용 맥락을
              먼저 보여줍니다.
            </SectionBody>
            <BulletList>
              <BulletItem>
                <BulletMark>01</BulletMark>
                <BulletText>
                  추천 후보 지역을 빠르게 비교하고 저장할 수 있습니다.
                </BulletText>
              </BulletItem>
              <BulletItem>
                <BulletMark>02</BulletMark>
                <BulletText>
                  상권 분석 전 탐색 단계에서도 유용한 진입 포인트가 됩니다.
                </BulletText>
              </BulletItem>
              <BulletItem>
                <BulletMark>03</BulletMark>
                <BulletText>
                  추천 결과를 북마크하고 다시 분석 흐름으로 이어갈 수 있습니다.
                </BulletText>
              </BulletItem>
            </BulletList>
          </RecommendCopy>

          <RecommendPanel>
            <NarrativeVisualEyebrow>상권 추천</NarrativeVisualEyebrow>
            <RecommendPanelTitle>
              지역 비교와 저장 흐름을 함께 보여줍니다.
            </RecommendPanelTitle>
            <RecommendPanelBody>
              지도 기반 추천 화면을 통해 서울 안의 후보 지역을 비교하고, 저장과
              후속 분석으로 이어지는 탐색 흐름을 한 번에 보여줍니다.
            </RecommendPanelBody>
            <RecommendImage
              src="/images/recommend_map.png"
              alt="상권 추천 지도 예시"
              style={{ transform: `translateY(${-recommendImageOffset}px)` }}
            />
          </RecommendPanel>
        </RecommendInner>
      </RecommendSection>

      <ServiceSection>
        <ServiceHeader>
          <Kicker>More Services</Kicker>
          <SectionTitle>
            분석 이후에도 계속 이어지는 서비스 흐름이 있습니다.
          </SectionTitle>
          <SectionBody>
            추천 이후 커뮤니티, 채팅, 보관함은 단발성 조회가 아니라 실제 창업
            의사결정을 반복하도록 돕는 후속 기능입니다.
          </SectionBody>
        </ServiceHeader>

        <ServiceGrid>
          {serviceCards.map(card => (
            <ServiceCard key={card.title} href={card.href}>
              <ServiceIcon src={card.image} alt="" aria-hidden="true" />
              <ServiceTitle>{card.title}</ServiceTitle>
              <ServiceBody>{card.body}</ServiceBody>
              <ServiceCta>해당 흐름 보기</ServiceCta>
            </ServiceCard>
          ))}
        </ServiceGrid>
      </ServiceSection>

      <FinalSection>
        <FinalCard>
          <FinalInner>
            <div>
              <FinalTitle>
                서울 상권을 읽고, 분석하고, 저장하고, 실행하는 흐름을
                NowDoBoss에서 시작하세요.
              </FinalTitle>
              <FinalBody>
                구별현황으로 시장을 읽고, 분석과 시뮬레이션으로 판단을 구체화한
                뒤, 추천과 커뮤니티, 채팅까지 이어지는 전체 흐름을 한 곳에서
                시작할 수 있습니다.
              </FinalBody>
            </div>
            <FinalActions>
              <FinalPrimaryLink href="/register">
                회원가입 시작
              </FinalPrimaryLink>
              <FinalSecondaryLink href="/community/list">
                커뮤니티 둘러보기
              </FinalSecondaryLink>
            </FinalActions>
          </FinalInner>
        </FinalCard>
      </FinalSection>
    </Page>
  )
}
