import { describe, expect, it } from 'vitest'

import {
  createCommunityListWriteHref,
  createCommunityWriteHref,
  parseCommunityEditorPrefill,
  resolveCommunityCreateLocation,
  toCommunityLocationValue,
} from './editor-prefill'

const params = (search: string) => new URLSearchParams(search)

describe('parseCommunityEditorPrefill — 목록·상세에서 넘어온 지역(CM-031)', () => {
  it('세 값이 맞으면 그 지역을 돌려준다', () => {
    expect(
      parseCommunityEditorPrefill(
        params('targetType=DISTRICT&targetCode=11200&targetName=성동구'),
      ),
    ).toEqual({
      targetType: 'DISTRICT',
      targetCode: '11200',
      targetName: '성동구',
    })
  })

  it('이름이 없거나 공백이면 이름 없이 돌려준다 — 칩은 코드로 내려앉는다', () => {
    expect(
      parseCommunityEditorPrefill(
        params('targetType=COMMERCIAL&targetCode=3110008&targetName=%20%20'),
      ),
    ).toEqual({ targetType: 'COMMERCIAL', targetCode: '3110008' })
    expect(
      parseCommunityEditorPrefill(
        params('targetType=ADMINISTRATION&targetCode=11680640'),
      ),
    ).toEqual({ targetType: 'ADMINISTRATION', targetCode: '11680640' })
  })

  it('코드·이름의 앞뒤 공백은 지운다', () => {
    expect(
      parseCommunityEditorPrefill(
        params(
          'targetType=DISTRICT&targetCode=%2011200%20&targetName=%20성동구%20',
        ),
      ),
    ).toEqual({
      targetType: 'DISTRICT',
      targetCode: '11200',
      targetName: '성동구',
    })
  })

  it('형식이 틀린 값은 버린다', () => {
    expect(parseCommunityEditorPrefill(params(''))).toBeNull()
    expect(
      parseCommunityEditorPrefill(params('targetType=CITY&targetCode=11200')),
    ).toBeNull()
    expect(
      parseCommunityEditorPrefill(params('targetType=district&targetCode=1')),
    ).toBeNull()
    expect(
      parseCommunityEditorPrefill(params('targetType=DISTRICT&targetCode=%20')),
    ).toBeNull()
    expect(
      parseCommunityEditorPrefill(params('targetType=DISTRICT')),
    ).toBeNull()
    expect(parseCommunityEditorPrefill(params('targetCode=11200'))).toBeNull()
  })
})

describe('parseCommunityEditorPrefill — 주소는 누구나 고친다', () => {
  it('코드는 숫자 4~12자리만 받는다', () => {
    expect(
      parseCommunityEditorPrefill(
        params('targetType=COMMERCIAL&targetCode=31100%3Cb%3E'),
      ),
    ).toBeNull()
    expect(
      parseCommunityEditorPrefill(
        params('targetType=COMMERCIAL&targetCode=311'),
      ),
    ).toBeNull()
    expect(
      parseCommunityEditorPrefill(
        params('targetType=COMMERCIAL&targetCode=1234567890123'),
      ),
    ).toBeNull()
    expect(
      parseCommunityEditorPrefill(
        params('targetType=ADMINISTRATION&targetCode=-1168064'),
      ),
    ).toBeNull()
    expect(
      parseCommunityEditorPrefill(
        params('targetType=COMMERCIAL&targetCode=3110008001'),
      ),
    ).toEqual({ targetType: 'COMMERCIAL', targetCode: '3110008001' })
  })

  it('이름이 40자를 넘으면 이름만 버리고 코드로 내려앉는다', () => {
    const long = '가'.repeat(41)
    expect(
      parseCommunityEditorPrefill(
        params(
          `targetType=ADMINISTRATION&targetCode=11680640&targetName=${long}`,
        ),
      ),
    ).toEqual({ targetType: 'ADMINISTRATION', targetCode: '11680640' })
    expect(
      parseCommunityEditorPrefill(
        params(
          `targetType=ADMINISTRATION&targetCode=11680640&targetName=${'가'.repeat(40)}`,
        ),
      ),
    ).toEqual({
      targetType: 'ADMINISTRATION',
      targetCode: '11680640',
      targetName: '가'.repeat(40),
    })
  })

  it('자치구는 코드로 이름을 다시 찾는다 — 쿼리 이름은 믿지 않는다', () => {
    expect(
      parseCommunityEditorPrefill(
        params('targetType=DISTRICT&targetCode=11200&targetName=강남구'),
      ),
    ).toEqual({
      targetType: 'DISTRICT',
      targetCode: '11200',
      targetName: '성동구',
    })
    expect(
      parseCommunityEditorPrefill(
        params('targetType=DISTRICT&targetCode=11680'),
      ),
    ).toEqual({
      targetType: 'DISTRICT',
      targetCode: '11680',
      targetName: '강남구',
    })
  })

  it('없는 자치구 코드면 프리필 전체를 버린다', () => {
    expect(
      parseCommunityEditorPrefill(
        params('targetType=DISTRICT&targetCode=99999&targetName=성동구'),
      ),
    ).toBeNull()
  })
})

describe('resolveCommunityCreateLocation — 비교 초안이 이긴다', () => {
  const prefill = {
    targetType: 'DISTRICT' as const,
    targetCode: '11200',
    targetName: '성동구',
  }
  const draft = {
    targetType: 'ADMINISTRATION' as const,
    targetCode: '11680640',
    targetName: '역삼1동',
  }

  it('초안이 있으면 초안의 행정동이다', () => {
    expect(resolveCommunityCreateLocation(draft, prefill)).toEqual(draft)
  })

  it('초안이 없으면 프리필, 둘 다 없으면 빈 값이다', () => {
    expect(resolveCommunityCreateLocation(null, prefill)).toEqual(prefill)
    expect(resolveCommunityCreateLocation(null, null)).toEqual({})
  })
})

describe('createCommunityWriteHref — 글쓰기 링크', () => {
  it('대상이 없으면 그냥 글쓰기 주소다(mock 보존)', () => {
    expect(createCommunityWriteHref(null, false)).toBe('/community/register')
    expect(createCommunityWriteHref({}, true)).toBe(
      '/community/register?mock=1',
    )
  })

  it('대상이 있으면 종류·코드·이름을 싣는다', () => {
    const href = createCommunityWriteHref(
      { targetType: 'DISTRICT', targetCode: '11200', targetName: '성동구' },
      true,
    )

    expect(href).toBe(
      '/community/register?targetType=DISTRICT&targetCode=11200&targetName=%EC%84%B1%EB%8F%99%EA%B5%AC&mock=1',
    )
    // 만든 링크를 받는 쪽이 그대로 읽는다 — 왕복이 맞아야 칩이 채워진다.
    expect(
      parseCommunityEditorPrefill(new URL(href, 'http://x').searchParams),
    ).toEqual({
      targetType: 'DISTRICT',
      targetCode: '11200',
      targetName: '성동구',
    })
  })

  it('이름이 없으면 이름 없이, 종류나 코드가 비면 대상 없이 만든다', () => {
    expect(
      createCommunityWriteHref(
        { targetType: 'COMMERCIAL', targetCode: '3110008' },
        false,
      ),
    ).toBe('/community/register?targetType=COMMERCIAL&targetCode=3110008')
    expect(
      createCommunityWriteHref(
        { targetType: 'DISTRICT', targetCode: ' ' },
        false,
      ),
    ).toBe('/community/register')
    expect(createCommunityWriteHref({ targetCode: '11200' }, false)).toBe(
      '/community/register',
    )
  })
})

describe('toCommunityLocationValue — 응답의 대상을 폼 값으로', () => {
  it('종류 코드를 검증하고 null 은 뺀다', () => {
    expect(
      toCommunityLocationValue({
        targetType: { code: 'DISTRICT', name: '자치구', description: '' },
        targetCode: '11200',
        targetName: '성동구',
      }),
    ).toEqual({
      targetType: 'DISTRICT',
      targetCode: '11200',
      targetName: '성동구',
    })
    expect(
      toCommunityLocationValue({
        targetType: null,
        targetCode: null,
        targetName: null,
      }),
    ).toEqual({
      targetType: undefined,
      targetCode: undefined,
      targetName: undefined,
    })
  })
})

describe('createCommunityListWriteHref — 목록의 글쓰기 링크', () => {
  const seongdong = {
    view: 'latest' as const,
    keyword: '',
    targetType: 'DISTRICT' as const,
    targetCode: '11200',
    period: 'WEEK' as const,
    mock: false,
  }

  it('성동구 목록이면 성동구로 채워 연다(CM-031)', () => {
    expect(
      createCommunityListWriteHref({
        state: seongdong,
        boardTargetName: '성동구',
        guest: false,
      }),
    ).toBe(
      '/community/register?targetType=DISTRICT&targetCode=11200&targetName=%EC%84%B1%EB%8F%99%EA%B5%AC',
    )
  })

  it('응답 이름이 아직 없으면 코드만 싣는다', () => {
    expect(
      createCommunityListWriteHref({
        state: seongdong,
        boardTargetName: undefined,
        guest: false,
      }),
    ).toBe('/community/register?targetType=DISTRICT&targetCode=11200')
  })

  it('검색 중·좋아요한 글 보기·서울 전체면 대상을 싣지 않는다', () => {
    for (const state of [
      { ...seongdong, keyword: '카페' },
      { ...seongdong, view: 'liked' as const },
      { ...seongdong, targetType: undefined, targetCode: undefined },
    ]) {
      expect(
        createCommunityListWriteHref({
          state,
          boardTargetName: '성동구',
          guest: false,
        }),
      ).toBe('/community/register')
    }
  })

  it('비로그인은 프리필 주소로 돌아오게 로그인으로 감싸고, 목 모드는 감싸지 않는다', () => {
    expect(
      createCommunityListWriteHref({
        state: seongdong,
        boardTargetName: '성동구',
        guest: true,
      }),
    ).toBe(
      `/login?redirect=${encodeURIComponent(
        '/community/register?targetType=DISTRICT&targetCode=11200&targetName=%EC%84%B1%EB%8F%99%EA%B5%AC',
      )}`,
    )
    expect(
      createCommunityListWriteHref({
        state: { ...seongdong, mock: true },
        boardTargetName: '성동구',
        guest: true,
      }),
    ).toBe(
      '/community/register?targetType=DISTRICT&targetCode=11200&targetName=%EC%84%B1%EB%8F%99%EA%B5%AC&mock=1',
    )
  })
})
