import { describe, expect, it } from 'vitest'

import {
  createAnalysisBookmarkTabHref,
  createCommercialBookmarkHref,
  createRegionBookmarkHref,
  describeRegionBookmarkParent,
  parseAnalysisBookmarkTab,
} from '@/lib/profile/bookmark-links'
import { parseAnalysisSelection } from '@/lib/analysis/selection'

const searchOf = (href: string) => new URLSearchParams(href.split('?')[1])

describe('지역 북마크 딥링크 (#574)', () => {
  it('자치구는 그 구를 고른 분석 탐색 화면으로 연다', () => {
    const href = createRegionBookmarkHref({
      targetType: 'DISTRICT',
      targetCode: '11440',
    })

    expect(href).toBe('/analysis?districtCode=11440')
  })

  /* 행정동 코드 앞 5자리가 자치구다. 자치구가 빠지면 분석 화면이 1단계로 돌아간다. */
  it('행정동은 상위 자치구까지 채워 상권 고르기 단계로 연다', () => {
    const href = createRegionBookmarkHref({
      targetType: 'ADMINISTRATION',
      targetCode: '11440660',
    })

    expect(parseAnalysisSelection(searchOf(href))).toMatchObject({
      districtCode: '11440',
      administrationCode: '11440660',
      commercialCode: null,
      serviceCode: null,
      periodCode: null,
    })
  })

  it('기간은 싣지 않는다 — 최신 분기로 연다', () => {
    expect(
      createRegionBookmarkHref({ targetType: 'DISTRICT', targetCode: '11440' }),
    ).not.toContain('periodCode')
  })
})

describe('describeRegionBookmarkParent', () => {
  it('행정동에는 코드 대신 소속 자치구 이름을 적는다', () => {
    expect(
      describeRegionBookmarkParent({
        targetType: 'ADMINISTRATION',
        targetCode: '11440660',
      }),
    ).toBe('서울특별시 마포구')
  })

  it('자치구의 상위는 서울이다', () => {
    expect(
      describeRegionBookmarkParent({
        targetType: 'DISTRICT',
        targetCode: '11440',
      }),
    ).toBe('서울특별시')
  })

  /* 틀린 구 이름을 적느니 넓게 말한다. */
  it('표에 없는 코드면 서울로 둔다', () => {
    expect(
      describeRegionBookmarkParent({
        targetType: 'ADMINISTRATION',
        targetCode: '99999999',
      }),
    ).toBe('서울특별시')
  })
})

describe('createCommercialBookmarkHref', () => {
  it('역조회한 상위 코드로 업종 고르기 단계까지 채운다', () => {
    const href = createCommercialBookmarkHref({
      commercialCode: '3110008',
      districtCode: '11680',
      administrationCode: '11680640',
    })

    expect(href).not.toBeNull()
    expect(parseAnalysisSelection(searchOf(href!))).toMatchObject({
      districtCode: '11680',
      administrationCode: '11680640',
      commercialCode: '3110008',
      serviceCode: null,
    })
  })

  /* 반쯤 채운 화면으로 보내면 사용자는 어디서부터 다시 골라야 할지 모른다. */
  it('상위 코드가 비어 있으면 열지 않는다', () => {
    expect(createCommercialBookmarkHref(null)).toBeNull()
    expect(
      createCommercialBookmarkHref({
        commercialCode: '3110008',
        districtCode: '',
        administrationCode: '11680640',
      }),
    ).toBeNull()
  })
})

describe('지역·화면 북마크 탭 주소 (#606)', () => {
  it('archive 만 화면 보관함이고 나머지는 지역 북마크다', () => {
    expect(parseAnalysisBookmarkTab('archive')).toBe('archive')
    expect(parseAnalysisBookmarkTab('region')).toBe('region')
    expect(parseAnalysisBookmarkTab(null)).toBe('region')
    expect(parseAnalysisBookmarkTab('unknown')).toBe('region')
  })

  it('화면 보관함은 ?tab=archive 로 남긴다', () => {
    expect(
      createAnalysisBookmarkTabHref(
        '/profile/bookmarks/analysis',
        '',
        'archive',
      ),
    ).toBe('/profile/bookmarks/analysis?tab=archive')
  })

  /* 같은 화면을 두 주소로 갖지 않는다. */
  it('기본 탭으로 돌아가면 쿼리를 지운다', () => {
    expect(
      createAnalysisBookmarkTabHref(
        '/profile/bookmarks/analysis',
        'tab=archive',
        'region',
      ),
    ).toBe('/profile/bookmarks/analysis')
  })

  it('다른 쿼리는 건드리지 않는다', () => {
    expect(
      createAnalysisBookmarkTabHref(
        '/profile/bookmarks/analysis',
        'from=header',
        'archive',
      ),
    ).toBe('/profile/bookmarks/analysis?from=header&tab=archive')
  })
})
