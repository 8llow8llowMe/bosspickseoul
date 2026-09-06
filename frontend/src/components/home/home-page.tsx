import styled from 'styled-components'
import AnchorStatement from '@/components/home/anchor-statement'
import ToolFlowBoard from '@/components/home/tool-flow-board'
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
        네 도구 보드가 문장보다 **앞**이다. 앵커는 sticky + min-height:100dvh 라
        트랙이 100dvh 면 핀 구간이 0 이 되어 단어 채우기 효과가 아예 돌지 않는다.
        효과를 남기면서 문장을 앞에 두면 보드가 2.5 화면 뒤로 밀려 목표(≤2.0)를
        못 맞춘다. 보드를 앞에 두면 1.0 화면에서 시작한다.
      */}
      <ToolFlowBoard />
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
