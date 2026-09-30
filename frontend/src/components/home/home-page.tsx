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
        판단 흐름 바로 뒤에 그 숫자들의 출처를 둔다 — 카드가 단계 번호(01~04)를 달고 있어
        「방금 본 네 단계의 근거」로 읽힌다(data-sources.md).
      */}
      <DataSources />
      {/*
        스토리(무엇을 해 주는가) 다음, 벤토 CTA(가입) 앞에 라이브 근거를 둔다.
        실패하거나 집계가 비면 이 섹션은 스스로 빠지므로 순서에 구멍이 나지 않는다.
      */}
      <PopularDistricts />
      <FeatureBento />
    </Page>
  )
}
