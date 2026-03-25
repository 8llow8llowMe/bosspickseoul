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
        <Title>NowDoBoss</Title>
        <Body>
          서울 상권 데이터 분석, 추천, 시뮬레이션, 커뮤니티 기능을 하나의
          흐름으로 연결하는 서비스입니다.
        </Body>
      </Inner>
    </Footer>
  )
}
