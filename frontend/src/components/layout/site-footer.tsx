import styled from 'styled-components'

const Footer = styled.footer`
  border-top: 1px solid var(--color-border-200);
  background: var(--color-surface);
`

const Inner = styled.div`
  width: min(1200px, calc(100% - 48px));
  margin: 0 auto;
  padding: 24px 0 36px;
`

const Title = styled.p`
  margin-bottom: 6px;
  color: var(--color-text-900);
  font-size: 15px;
  font-weight: 700;
`

const Body = styled.p`
  color: var(--color-text-500);
  font-size: 14px;
  line-height: 1.7;
`

export default function SiteFooter() {
  return (
    <Footer>
      <Inner>
        <Title>NowDoBoss V2 Frontend</Title>
        <Body>
          Phase 3 기준 메인, 인증, 프로필 흐름을 우선 이관하고 있습니다.
          이후에는 상태 조회, 추천, 분석, 커뮤니티, 실시간 기능 순으로 실제
          화면을 확장합니다.
        </Body>
      </Inner>
    </Footer>
  )
}
