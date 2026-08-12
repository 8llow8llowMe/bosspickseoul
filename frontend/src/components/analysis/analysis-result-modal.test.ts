import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('AnalysisResultModalSurface', () => {
  it('모달 서피스는 optional ariaLabel을 받는다', () => {
    const src = readFileSync(
      fileURLToPath(new URL('./analysis-result-modal.tsx', import.meta.url)),
      'utf8',
    )
    expect(src).toContain('ariaLabel')
    expect(src).toContain("ariaLabel = '상권 분석 결과'")
  })

  // 소스 계약(FIX #1): Overlay를 document.body로 포털한다. 사이드바 패널처럼
  // z-index가 낮은 stacking context 안에서 열리면 SiteHeader보다 아래 깔리므로,
  // 항상 루트에서 렌더해야 한다. 실제 DOM 마운트 검증은
  // analysis-result-modal.portal.test.ts(jsdom)에서 한다 — 이 파일은 기본
  // node 환경이라 렌더 이펙트를 실행할 수 없다.
  it('Overlay를 createPortal로 document.body에 렌더한다', () => {
    const src = readFileSync(
      fileURLToPath(new URL('./analysis-result-modal.tsx', import.meta.url)),
      'utf8',
    )
    expect(src).toContain('createPortal')
    expect(src).toContain('document.body')
  })
})
