import { describe, expect, it } from 'vitest'

import {
  buildAnalysisSaveOptions,
  resolveAnalysisSaveAction,
} from '@/lib/analysis/save-options'

/* 저장 시트(#563, D-2) — 두 항목이 서로 다른 북마크로 이어지는지 잠근다. */

const base = {
  archived: false,
  archivePending: false,
  canArchive: true,
  commercialSaved: false,
  bookmarkPending: false,
  profilePending: false,
}

describe('resolveAnalysisSaveAction', () => {
  it('분석 화면은 분석 북마크(보관), 관심 상권은 회원 북마크로 간다', () => {
    expect(resolveAnalysisSaveAction('analysis')).toBe('archive')
    expect(resolveAnalysisSaveAction('commercial')).toBe('bookmark')
  })
})

describe('buildAnalysisSaveOptions', () => {
  it('분석 화면 → 관심 상권 순서이고 저장 여부는 각자의 상태에서 읽는다', () => {
    const [analysis, commercial] = buildAnalysisSaveOptions({
      ...base,
      archived: true,
      commercialSaved: false,
    })

    expect(analysis.key).toBe('analysis')
    expect(analysis.saved).toBe(true)
    expect(commercial.key).toBe('commercial')
    expect(commercial.saved).toBe(false)

    const [analysis2, commercial2] = buildAnalysisSaveOptions({
      ...base,
      archived: false,
      commercialSaved: true,
    })
    expect(analysis2.saved).toBe(false)
    expect(commercial2.saved).toBe(true)
  })

  it('처리 중 표시도 각자의 요청에서 읽는다', () => {
    const [analysis, commercial] = buildAnalysisSaveOptions({
      ...base,
      bookmarkPending: true,
    })
    expect(analysis.pending).toBe(false)
    expect(commercial.pending).toBe(true)
  })

  it('분석 조건이 없으면 분석 화면만, 상권 정보를 기다리면 관심 상권만 잠근다', () => {
    const [analysis, commercial] = buildAnalysisSaveOptions({
      ...base,
      canArchive: false,
    })
    expect(analysis.disabled).toBe(true)
    expect(commercial.disabled).toBe(false)

    const [analysis2, commercial2] = buildAnalysisSaveOptions({
      ...base,
      profilePending: true,
    })
    expect(analysis2.disabled).toBe(false)
    expect(commercial2.disabled).toBe(true)
  })
})
