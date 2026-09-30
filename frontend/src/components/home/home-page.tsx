import styled from 'styled-components'
import DataSources from '@/components/home/data-sources'
import FeatureBento from '@/components/home/feature-bento'
import HeroSection from '@/components/home/hero-section'
import PopularDistricts from '@/components/home/popular-districts'
import ProductStory from '@/components/home/product-story'

const Page = styled.main`
  background: var(--color-background);
`

export default function HomePage() {
  return (
    <Page>
      <HeroSection />
      {/*
        판단 흐름이 히어로 바로 뒤다 — 네 도구가 1 화면 안에 탭으로 보인다
        (예전 네 도구 보드의 역할, home-restructure.md).
      */}
      <ProductStory />
      {/*
        스토리(무엇을 해 주는가) 다음에 라이브 근거를 둔다.
        실패하거나 집계가 비면 이 섹션은 스스로 빠지므로 순서에 구멍이 나지 않는다.
      */}
      <PopularDistricts />
      {/*
        숫자들의 출처는 벤토 CTA(가입) 바로 앞이다 — 섹션이 한 화면씩이 되면서 판단 흐름 바로
        뒤에 두면 라이브 근거와 CTA 가 한 화면 더 밀렸다. CTA 가 마지막 장면으로 남고, 근거가
        그 직전에 망설임을 던다(full-screen-sections-and-live-tooltip.md D4-3).
      */}
      <DataSources />
      <FeatureBento />
    </Page>
  )
}
