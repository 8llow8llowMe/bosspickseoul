import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import styled from 'styled-components'
import { LEGAL_LINKS } from '@/lib/legal/links'

/*
  사이드바 맨 아래의 이동 목록이다. 북마크·설정과 달리 이 프로필 구역 안의 화면이 아니라 사이트 전역 문서(`/terms` ·
  `/privacy`)로 나가는 링크라, 활성 표시 없이 따로 둔다. 푸터가 같은 목록을 쓴다(`LEGAL_LINKS`) — 두 곳에 따로
  적으면 한쪽만 고쳐지고 같은 문서가 화면마다 다른 이름으로 보인다.

  ≤1024 에서는 사이드바가 본문 위로 접히므로 세로 목록을 한 줄로 눌러 본문이 밀리지 않게 한다. 터치 타깃은 44px 를 지킨다.
*/
const Nav = styled.nav`
  ul {
    display: grid;
    list-style: none;

    @media (max-width: 1024px) {
      display: flex;
      flex-wrap: wrap;
      gap: 0 16px;
    }
  }

  a {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 44px;
    padding: 0 16px;
    border-radius: var(--radius-control);
    color: var(--color-text-600);
    font-size: 14px;
    font-weight: 500;

    &:hover {
      background: var(--color-background-muted);
      color: var(--color-text-900);
    }

    svg {
      width: 16px;
      height: 16px;
      stroke: currentColor;

      @media (max-width: 1024px) {
        display: none;
      }
    }
  }
`

export default function ProfileLegalLinks() {
  return (
    <Nav aria-label="약관 및 정책">
      <ul>
        {LEGAL_LINKS.map(link => (
          <li key={link.href}>
            <Link href={link.href}>
              {link.label}
              <ChevronRight aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </Nav>
  )
}
