import styled from 'styled-components'
import AnchorStatement from '@/components/home/anchor-statement'
import FeatureBento from '@/components/home/feature-bento'
import HeroSection from '@/components/home/hero-section'
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
      <FeatureBento />
    </Page>
  )
}
