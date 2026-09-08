import styled from 'styled-components'
import BrandLockup from '@/components/brand/brand-lockup'
import { shellWidth } from '@/styles/layout'

const Footer = styled.footer`
  border-top: 1px solid var(--color-border-200);
  background: var(--color-background);

  main[data-hide-footer='true'] ~ & {
    display: none;
  }

  @media (max-width: 1023px) {
    main[data-hide-mobile-footer='true'] + & {
      display: none;
    }
  }
`

const Inner = styled.div`
  ${shellWidth}
  padding: 24px 0 32px;
`

/**
 * 락업 전용 블록 래퍼. `BrandLockup` 의 루트는 `inline-flex` 라서 블록
 * `<p>` 형제 옆에 그냥 두면 줄상자가 생긴다. `Inner > span` 같은 요소
 * 선택자로 겨냥하면 락업 구현이 바뀔 때 조용히 깨지므로 명시적으로 감싼다.
 * 간격 6px 은 기존 `Title` 의 `margin-bottom` 을 그대로 이어받는다.
 */
const LockupRow = styled.div`
  margin-bottom: 6px;
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
        <LockupRow>
          <BrandLockup markHeight={24} wordmarkSize={15} />
        </LockupRow>
        <Body>
          서울 상권 데이터 분석, 추천, 시뮬레이션 기능을 하나의 흐름으로
          연결하는 서비스입니다.
        </Body>
      </Inner>
    </Footer>
  )
}
