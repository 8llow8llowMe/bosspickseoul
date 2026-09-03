import styled from 'styled-components'
import AnchorStatement from '@/components/home/anchor-statement'
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
      <AnchorStatement />
      <ProductStory />
      {/*
        스토리(무엇을 해 주는가) 다음, 벤토 CTA(가입) 앞에 라이브 근거를 둔다.
        실패하거나 집계가 비면 이 섹션은 스스로 빠지므로 순서에 구멍이 나지 않는다.
      */}
      <PopularDistricts />
      <FeatureBento />
    </Page>
  )
}
