'use client'

import Link from 'next/link'
import { MapPinned, Search } from 'lucide-react'
import styled from 'styled-components'
import SeoulDistrictsMap from '@/components/home/seoul-districts-map'

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

export default function HeroSection() {
  return (
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
  )
}
