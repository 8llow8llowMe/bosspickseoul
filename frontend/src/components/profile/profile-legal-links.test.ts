import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ProfileLegalLinks from '@/components/profile/profile-legal-links'
import { LEGAL_LINKS } from '@/lib/legal/links'

describe('ProfileLegalLinks', () => {
  const markup = renderToStaticMarkup(createElement(ProfileLegalLinks))

  it('이용약관과 개인정보 처리방침으로 가는 링크를 낸다', () => {
    expect(markup).toContain('href="/terms"')
    expect(markup).toContain('href="/privacy"')
    expect(markup).toContain('aria-label="약관 및 정책"')
  })

  it('푸터와 같은 목록을 쓴다 — 라벨이 문서 제목 그대로다', () => {
    for (const link of LEGAL_LINKS) {
      expect(markup).toContain(link.label)
    }
  })

  it('화살표 아이콘은 장식이라 스크린리더에서 숨긴다', () => {
    expect(markup).toContain('aria-hidden="true"')
  })
})
