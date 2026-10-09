'use client'

import Link from 'next/link'
import styled from 'styled-components'
import BrandLockup from '@/components/brand/brand-lockup'
import { LEGAL_LINKS } from '@/lib/legal/links'
import { shellWidth } from '@/styles/layout'

/*
  푸터를 숨기는 화면은 main 에 `data-hide-footer` 를 단다(지도 · 구별현황 · 추천처럼 한 화면을 꽉 쓰는 화면).
  main 은 셸 본문 칸(`[data-site-shell-body]`) 안에 있고 푸터는 그 칸의 형제라(site-shell.tsx) 본문 칸이
  그 main 을 품었는지를 `:has()` 로 본다. 본문 칸과 푸터 사이에 다른 형제(모달 포털 등)가 끼어도 숨도록 `~` 다.
  `:has()` 를 모르는 브라우저는 푸터가 보일 뿐 화면이 깨지지는 않는다.
*/
const Footer = styled.footer`
  border-top: 1px solid var(--color-border-200);
  background: var(--color-background);

  [data-site-shell-body]:has(main[data-hide-footer='true']) ~ & {
    display: none;
  }

  @media (max-width: 1023px) {
    [data-site-shell-body]:has(main[data-hide-mobile-footer='true']) + & {
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

/* 약관·처리방침 — 푸터가 항상 보이는 유일한 자리라 가입 전에도 닿는다. */
const LegalNav = styled.nav`
  margin-top: 12px;

  ul {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
    list-style: none;
  }

  a {
    color: var(--color-text-600);
    font-size: 13px;
    line-height: 20px;

    &:hover {
      color: var(--color-text-900);
      text-decoration: underline;
    }
  }
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
        <LegalNav aria-label="약관 및 정책">
          <ul>
            {LEGAL_LINKS.map(link => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </LegalNav>
      </Inner>
    </Footer>
  )
}
