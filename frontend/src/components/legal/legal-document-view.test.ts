import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it } from 'vitest'

import LegalDocumentView from '@/components/legal/legal-document-view'
import { LEGAL_DOCUMENTS } from '@/lib/legal'
import { privacyPolicy } from '@/lib/legal/privacy-policy'
import { termsOfService } from '@/lib/legal/terms-of-service'

const render = (doc: (typeof LEGAL_DOCUMENTS)[number]) => {
  const sheet = new ServerStyleSheet()

  try {
    return {
      markup: renderToStaticMarkup(
        sheet.collectStyles(createElement(LegalDocumentView, { doc })),
      ),
      styles: sheet.getStyleTags(),
    }
  } finally {
    sheet.seal()
  }
}

const squeeze = (css: string): string => css.replace(/\s+/g, '')

describe('LegalDocumentView', () => {
  for (const doc of LEGAL_DOCUMENTS) {
    describe(doc.title, () => {
      const { markup } = render(doc)

      it('h1 하나가 문서 제목이고 머리 카드의 이름이 된다', () => {
        expect(markup.match(/<h1/g)).toHaveLength(1)
        expect(markup).toContain('id="legal-document-title"')
        expect(markup).toContain('aria-labelledby="legal-document-title"')
        expect(markup).toContain(doc.title)
      })

      it('시행일을 보여준다', () => {
        expect(markup).toContain(`시행일 ${doc.effectiveDate}`)
      })

      it('모든 조문에 목차 링크와 앵커가 짝으로 있다', () => {
        for (const article of doc.articles) {
          expect(markup, `제${article.no}조 앵커`).toContain(
            `id="article-${article.no}"`,
          )
          expect(markup, `제${article.no}조 목차`).toContain(
            `href="#article-${article.no}"`,
          )
        }
      })

      it('개정 이력을 그린다', () => {
        expect(markup).toContain('개정 이력')
        expect(markup).toContain(doc.history[0].summary)
      })

      it('문서는 main 하나이고 HTML 문자열을 주입하지 않는다', () => {
        expect(markup.match(/<main/g)).toHaveLength(1)
        expect(markup).not.toContain('dangerouslySetInnerHTML')
      })
    })
  }

  it('표는 머리글 scope 와 자기 스크롤러를 가진다', () => {
    const { markup, styles } = render(privacyPolicy)

    expect(markup).toContain('<th scope="col">')
    expect(squeeze(styles)).toContain('overflow-x:auto')
  })

  it('목록은 번호 목록으로 그린다', () => {
    expect(render(termsOfService).markup).toContain('<ol')
  })

  /*
    법률문서는 이 제품에서 가장 긴 산문이다. 상한이 없으면 1920 에서 한 줄이 1,800px 가 된다 —
    중앙 묶음(목차 240 + 간격 32 + 본문 --w-read)이 셸을 넘지 못하게 min() 으로 건다.
  */
  it('본문 묶음은 읽기 칸 상한의 중앙 그룹이다', () => {
    const css = squeeze(render(termsOfService).styles)

    expect(css).toContain(
      'width:min(calc(240px+32px+var(--w-read)),var(--w-shell));margin:0auto;',
    )
  })

  it('목차는 ≥1080 에서만 왼쪽 고정 열이다', () => {
    const css = squeeze(render(termsOfService).styles)

    expect(css).toMatch(/@media\(min-width:1080px\)\{[^}]*position:sticky/)
  })
})
