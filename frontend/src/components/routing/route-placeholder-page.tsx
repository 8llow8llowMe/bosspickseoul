import Link from 'next/link'
import styled from 'styled-components'

export type RoutePlaceholderDefinition = {
  title: string
  path: string
  description: string
  visibility: 'index' | 'noindex'
}

type RoutePlaceholderPageProps = RoutePlaceholderDefinition

const Page = styled.main`
  min-height: calc(100vh - 144px);
  background: var(--color-surface);
`

const Shell = styled.div`
  width: min(1080px, calc(100% - 48px));
  margin: 0 auto;
  padding: 64px 0 80px;
`

const Card = styled.section`
  padding: 36px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: white;
  box-shadow: var(--shadow-level-1);
`

const Eyebrow = styled.p`
  margin-bottom: 16px;
  color: var(--color-text-caption);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

const Title = styled.h1`
  margin-bottom: 16px;
  color: var(--color-text-900);
  font-size: 40px;
  line-height: 1.2;
  font-weight: 700;

  @media (max-width: 640px) {
    font-size: 32px;
  }
`

const Description = styled.p`
  max-width: 60ch;
  color: var(--color-text-500);
  font-size: 17px;
  line-height: 1.8;
`

const MetaGrid = styled.dl`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 28px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const MetaCard = styled.div`
  padding: 18px 20px;
  border-radius: var(--radius-card);
  background: var(--color-surface-muted);
`

const MetaTitle = styled.dt`
  margin-bottom: 4px;
  color: var(--color-text-500);
  font-size: 13px;
  font-weight: 600;
`

const MetaValue = styled.dd`
  color: var(--color-text-900);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.6;
`

const Section = styled.section`
  margin-top: 24px;
  padding: 28px 30px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
`

const SectionTitle = styled.h2`
  margin-bottom: 12px;
  color: var(--color-text-900);
  font-size: 22px;
  font-weight: 700;
`

const List = styled.ul`
  display: grid;
  gap: 10px;
  color: var(--color-text-500);
  font-size: 15px;
  line-height: 1.8;
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
`

const ButtonLink = styled(Link)`
  padding: 12px 18px;
  border-radius: var(--radius-control);
  background: var(--color-primary-700);
  color: white;
  font-size: 14px;
  font-weight: 700;
`

const SecondaryLink = styled(Link)`
  padding: 12px 18px;
  border: 1px solid var(--color-primary-700);
  border-radius: var(--radius-control);
  color: var(--color-primary-700);
  font-size: 14px;
  font-weight: 700;
  background: var(--color-surface);
`

export default function RoutePlaceholderPage({
  title,
  path,
  description,
  visibility,
}: RoutePlaceholderPageProps) {
  return (
    <Page>
      <Shell>
        <Card>
          <Eyebrow>Phase 2 Route Skeleton</Eyebrow>
          <Title>{title}</Title>
          <Description>{description}</Description>
          <MetaGrid>
            <MetaCard>
              <MetaTitle>Route Path</MetaTitle>
              <MetaValue>{path}</MetaValue>
            </MetaCard>
            <MetaCard>
              <MetaTitle>SEO Policy</MetaTitle>
              <MetaValue>
                {visibility === 'index' ? 'index' : 'noindex'}
              </MetaValue>
            </MetaCard>
          </MetaGrid>
          <Actions>
            <ButtonLink href="/">메인으로 이동</ButtonLink>
            <SecondaryLink href="/community/list">
              커뮤니티 골격 보기
            </SecondaryLink>
          </Actions>
        </Card>

        <Section aria-labelledby="placeholder-next-steps">
          <SectionTitle id="placeholder-next-steps">다음 작업</SectionTitle>
          <List>
            <li>
              실제 페이지 UI와 레이아웃 컴포넌트를 레거시 기준으로 이관합니다.
            </li>
            <li>
              상태관리, API 연결, 예외 처리, 반응형 보정을 단계적으로
              추가합니다.
            </li>
            <li>
              공개 페이지는 metadata, canonical, Open Graph를 고도화합니다.
            </li>
          </List>
        </Section>
      </Shell>
    </Page>
  )
}
