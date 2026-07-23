import styled from 'styled-components'

const Footer = styled.footer`
  border-top: 1px solid var(--color-border-200);
  background: var(--color-background);

  @media (max-width: 1023px) {
    main[data-hide-mobile-footer='true'] + & {
      display: none;
    }
  }
`

const Inner = styled.div`
  width: min(1120px, calc(100% - 40px));
  margin: 0 auto;
  padding: 24px 0 32px;

  @media (max-width: 640px) {
    width: min(100% - 32px, 1120px);
  }
`

const Title = styled.p`
  margin-bottom: 6px;
  color: var(--color-text-900);
  font-size: 15px;
  font-weight: 600;
  line-height: 24px;
`

const Body = styled.p`
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 22px;
  word-break: keep-all;
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
