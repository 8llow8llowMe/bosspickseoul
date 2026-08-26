import { describe, expect, it } from 'vitest'
import {
  buildAdministrationAnalysisPayload,
  buildAiReportPayload,
  buildCommercialAnalysisPayload,
  type SharePayload,
} from './payload'
import {
  buildShareRoute,
  getShareRouteFailureMessage,
  getShareTypeLabel,
  parseShareRoute,
  ROUTE_BUILDERS,
} from './routes'

const selection = {
  districtCode: '11680',
  administrationCode: '11680510',
  commercialCode: '3110008',
  serviceCode: 'CS100001',
  periodCode: '20233',
}

const roundTrip = (shareType: string, payload: SharePayload) => {
  const route = buildShareRoute(shareType, payload)
  expect(route.ok).toBe(true)
  if (!route.ok) throw new Error('unreachable')
  return { href: route.href, parsed: parseShareRoute(route.href) }
}

describe('ROUTE_BUILDERS 라운드트립 (payload → URL → payload)', () => {
  it('COMMERCIAL_ANALYSIS', () => {
    const payload = buildCommercialAnalysisPayload(selection)!
    const { href, parsed } = roundTrip('COMMERCIAL_ANALYSIS', payload)

    expect(href).toBe(
      '/analysis/result?districtCode=11680&administrationCode=11680510&commercialCode=3110008&serviceCode=CS100001&periodCode=20233',
    )
    expect(parsed).toEqual(payload)
  })

  it('COMMERCIAL_ANALYSIS — 탭이 담긴 경우', () => {
    const payload = buildCommercialAnalysisPayload(selection, 'sales')!
    const { href, parsed } = roundTrip('COMMERCIAL_ANALYSIS', payload)

    expect(href).toContain('tab=sales')
    expect(parsed).toEqual(payload)
  })

  it('AI_REPORT', () => {
    const payload = buildAiReportPayload(selection)!
    const { href, parsed } = roundTrip('AI_REPORT', payload)

    expect(href.startsWith('/analysis/report?')).toBe(true)
    expect(parsed).toEqual(payload)
  })

  it('ADMINISTRATION_ANALYSIS', () => {
    const payload = buildAdministrationAnalysisPayload('11680', '11680510')!
    const { href, parsed } = roundTrip('ADMINISTRATION_ANALYSIS', payload)

    expect(href).toBe(
      '/analysis?districtCode=11680&administrationCode=11680510',
    )
    expect(parsed).toEqual(payload)
  })
})

describe('buildShareRoute 실패 분기', () => {
  it('백엔드에 없는 타입은 unknown-type', () => {
    expect(buildShareRoute('SIMULATION', {})).toEqual({
      ok: false,
      reason: 'unknown-type',
    })
  })

  it('상권 비교는 /recommend 가 URL 상태를 못 읽어 unsupported-type 이다', () => {
    expect(ROUTE_BUILDERS.COMMERCIAL_COMPARISON).toBeNull()
    expect(buildShareRoute('COMMERCIAL_COMPARISON', {})).toEqual({
      ok: false,
      reason: 'unsupported-type',
    })
  })

  // `/status` 는 Top10 밖 자치구를 조용히 버린다(URL 재작성 + 안내 없음).
  // 조건이 사라진 기본 화면을 여느니 정직하게 미지원으로 안내한다.
  it('자치구 현황은 Top10 밖을 복원하지 못해 unsupported-type 이다', () => {
    expect(ROUTE_BUILDERS.DISTRICT_ANALYSIS).toBeNull()
    expect(
      buildShareRoute('DISTRICT_ANALYSIS', { districtCode: '11650' }),
    ).toEqual({ ok: false, reason: 'unsupported-type' })
  })

  it('복원 가능한 타입만 빌더를 갖는다', () => {
    const supported = Object.entries(ROUTE_BUILDERS)
      .filter(([, builder]) => builder !== null)
      .map(([type]) => type)
      .sort()
    expect(supported).toEqual([
      'ADMINISTRATION_ANALYSIS',
      'AI_REPORT',
      'COMMERCIAL_ANALYSIS',
    ])
  })

  it('payload 가 객체가 아니거나 필수 키가 없으면 bad-payload', () => {
    expect(buildShareRoute('COMMERCIAL_ANALYSIS', null)).toEqual({
      ok: false,
      reason: 'bad-payload',
    })
    expect(buildShareRoute('COMMERCIAL_ANALYSIS', ['a'])).toEqual({
      ok: false,
      reason: 'bad-payload',
    })
    expect(
      buildShareRoute('COMMERCIAL_ANALYSIS', { districtCode: '11680' }),
    ).toEqual({ ok: false, reason: 'bad-payload' })
  })

  it('실패 이유마다 다른 문구를 준다', () => {
    const messages = (
      ['unknown-type', 'unsupported-type', 'bad-payload'] as const
    ).map(getShareRouteFailureMessage)
    expect(new Set(messages).size).toBe(3)
  })
})

describe('getShareTypeLabel', () => {
  it('알려진 타입은 한글 라벨, 모르는 타입은 기본 라벨', () => {
    expect(getShareTypeLabel('AI_REPORT')).toBe('AI 리포트')
    expect(getShareTypeLabel('NOPE')).toBe('분석 화면')
  })
})
