import { describe, expect, it } from 'vitest'
import { createMapCamera } from '@/lib/analysis/map-camera'
import { createAnalysisResultHref } from '@/lib/analysis/selection'
import {
  buildAdministrationAnalysisPayload,
  buildAiReportPayload,
  buildCommercialAnalysisPayload,
  buildCommercialComparisonPayload,
  normalizeSharePayload,
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

  it('COMMERCIAL_COMPARISON', () => {
    const payload = buildCommercialComparisonPayload({
      districtCode: '11680',
      administrationCode: '11680510',
      serviceCode: 'CS100001',
      commercialCodes: ['3110008', '3110012'],
    })!
    const { href, parsed } = roundTrip('COMMERCIAL_COMPARISON', payload)

    expect(href).toBe(
      '/recommend/compare?districtCode=11680&administrationCode=11680510&serviceCode=CS100001&commercialCodes=3110008%2C3110012',
    )
    expect(parsed).toEqual(payload)
  })

  it('COMMERCIAL_COMPARISON — 열 순서를 정렬하지 않고 그대로 나른다', () => {
    const payload = buildCommercialComparisonPayload({
      districtCode: '11680',
      administrationCode: '11680510',
      serviceCode: 'CS100001',
      commercialCodes: ['3110020', '3110008'],
    })!
    const { parsed } = roundTrip('COMMERCIAL_COMPARISON', payload)

    expect(payload.commercialCodes).toEqual(['3110020', '3110008'])
    expect(parsed.commercialCodes).toEqual(['3110020', '3110008'])
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

  it('상권 비교는 상권이 하한 미만이면 bad-payload 다', () => {
    // 빌더는 생겼다(URL 상태를 나르게 됐다). 다만 한 개짜리 비교표는 그릴 게 없다.
    expect(ROUTE_BUILDERS.COMMERCIAL_COMPARISON).not.toBeNull()
    expect(
      buildShareRoute('COMMERCIAL_COMPARISON', {
        districtCode: '11680',
        administrationCode: '11680510',
        serviceCode: 'CS100001',
        commercialCodes: ['3110008'],
      }),
    ).toEqual({ ok: false, reason: 'bad-payload' })
  })

  it('상권 비교 — commercialCodes 가 배열이 아니면 bad-payload', () => {
    expect(
      buildShareRoute('COMMERCIAL_COMPARISON', {
        districtCode: '11680',
        administrationCode: '11680510',
        serviceCode: 'CS100001',
        commercialCodes: '3110008,3110012',
      }),
    ).toEqual({ ok: false, reason: 'bad-payload' })
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
      'COMMERCIAL_COMPARISON',
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

/**
 * 카메라는 payload 에 **들어가지 않는다**(map-shell.md D4-6). 들어가면 지도를 1m
 * 움직인 것만으로 다른 상태가 되어 공유 코드가 무한 증식하고, "보관됨" 배지가
 * 팬마다 풀린다. 이 계약을 여기서 못 박는다.
 */
describe('공유·보관함 payload 는 카메라를 담지 않는다 (D4-6)', () => {
  // TC-MS-024
  it('payload 문자열에 c·lat·lng·level 이 없다', () => {
    const payload = buildCommercialAnalysisPayload(selection, 'sales')!
    const normalized = normalizeSharePayload(payload)

    expect(Object.keys(payload)).not.toContain('c')
    expect(normalized).not.toMatch(/"(c|lat|lng|level)"/)
    expect(normalized).not.toContain('37.54893')
  })

  // TC-MS-024 — 카메라만 다른 두 URL 은 같은 payload 키
  it('카메라만 다른 두 결과 URL 이 같은 payload 키를 만든다', () => {
    const near = createMapCamera(37.54893, 127.06612, 3)
    const far = createMapCamera(37.5665, 126.978, 8)

    const hrefNear = createAnalysisResultHref(selection, 'sales', near)
    const hrefFar = createAnalysisResultHref(selection, 'sales', far)
    expect(hrefNear).not.toBe(hrefFar)

    const keyOf = (href: string) => {
      const params = new URL(href, 'http://x').searchParams
      return normalizeSharePayload(
        buildCommercialAnalysisPayload(
          {
            districtCode: params.get('districtCode'),
            administrationCode: params.get('administrationCode'),
            commercialCode: params.get('commercialCode'),
            serviceCode: params.get('serviceCode'),
            periodCode: params.get('periodCode') ?? '',
          },
          params.get('tab'),
        )!,
      )
    }

    expect(keyOf(hrefNear)).toBe(keyOf(hrefFar))
  })

  // TC-MS-025
  it('카메라가 끼어들지 않고 기존 라운드트립이 유지된다', () => {
    const payload = buildCommercialAnalysisPayload(selection, 'sales')!
    const { href, parsed } = roundTrip('COMMERCIAL_ANALYSIS', payload)

    expect(href).not.toContain('c=')
    expect(parsed).toEqual(payload)
  })

  it('사용자가 고른 분기는 payload 에 그대로 담긴다', () => {
    // periodCode 는 카메라와 달리 **분석 조건**이므로 payload 에 있어야 한다.
    const payload = buildCommercialAnalysisPayload({
      ...selection,
      periodCode: '20221',
    })!

    expect(payload.periodCode).toBe('20221')
    const { href } = roundTrip('COMMERCIAL_ANALYSIS', payload)
    expect(href).toContain('periodCode=20221')
  })
})
