import { describe, expect, it, vi } from 'vitest'

import {
  COMMUNITY_SHARE_TOAST,
  createCommunityRegionListHref,
  createCommunityShareUrl,
  getCommunityPostMenuActions,
  getCommunityRailRegionName,
  getCommunityRegionName,
  getNextCommunityMenuIndex,
  isCommunityPostEdited,
  shareCommunityPost,
  shareCommunityPostOnce,
} from './post-detail'

describe('isCommunityPostEdited', () => {
  it('작성·수정 시각이 같으면 수정됨이 아니다 (CM-023)', () => {
    expect(
      isCommunityPostEdited(
        '2026-07-27T08:30:00.000Z',
        '2026-07-27T08:30:00.000Z',
      ),
    ).toBe(false)
  })

  it('1분 이내 차이는 저장 지연으로 보고 수정됨으로 치지 않는다', () => {
    expect(
      isCommunityPostEdited(
        '2026-07-27T08:30:00.000Z',
        '2026-07-27T08:31:00.000Z',
      ),
    ).toBe(false)
  })

  it('1분을 넘게 다르면 수정됨이다', () => {
    expect(
      isCommunityPostEdited(
        '2026-07-27T08:30:00.000Z',
        '2026-07-27T08:31:00.001Z',
      ),
    ).toBe(true)
  })

  it('수정 시각이 작성 시각보다 이르면 수정됨이 아니다', () => {
    expect(
      isCommunityPostEdited(
        '2026-07-27T08:30:00.000Z',
        '2026-07-27T07:00:00.000Z',
      ),
    ).toBe(false)
  })

  it.each([
    ['', '2026-07-27T08:31:00.000Z'],
    ['2026-07-27T08:30:00.000Z', 'not-a-date'],
    ['garbage', 'garbage'],
  ])('잘못된 날짜(%s, %s)는 수정됨으로 판정하지 않는다', (created, updated) => {
    expect(isCommunityPostEdited(created, updated)).toBe(false)
  })

  it('수정 시각이 응답에 없으면(null·undefined) 수정됨이 아니다', () => {
    expect(isCommunityPostEdited('2026-07-27T08:30:00.000Z', null)).toBe(false)
    expect(isCommunityPostEdited('2026-07-27T08:30:00.000Z', undefined)).toBe(
      false,
    )
  })
})

describe('createCommunityRegionListHref', () => {
  const district = {
    targetType: { code: 'DISTRICT', name: '자치구', description: '' },
    targetCode: '11680',
  }

  it('대상이 있으면 그 지역 목록 주소를 만든다', () => {
    expect(createCommunityRegionListHref(district, false)).toBe(
      '/community/list?targetType=DISTRICT&targetCode=11680',
    )
  })

  it('mock 모드를 보존한다', () => {
    expect(createCommunityRegionListHref(district, true)).toBe(
      '/community/list?targetType=DISTRICT&targetCode=11680&mock=1',
    )
  })

  it('대상이 없거나 형식을 모르면 null 이다', () => {
    expect(
      createCommunityRegionListHref(
        { targetType: null, targetCode: null },
        true,
      ),
    ).toBeNull()
    expect(
      createCommunityRegionListHref(
        { targetType: district.targetType, targetCode: '  ' },
        false,
      ),
    ).toBeNull()
    expect(
      createCommunityRegionListHref(
        {
          targetType: { code: 'CITY', name: '시', description: '' },
          targetCode: '11',
        },
        false,
      ),
    ).toBeNull()
  })
})

describe('getCommunityRegionName', () => {
  it('대상 이름을 쓰고, 이름이 비면 코드, 대상이 없으면 서울 전체다', () => {
    expect(
      getCommunityRegionName({ targetName: ' 강남구 ', targetCode: '11680' }),
    ).toBe('강남구')
    expect(
      getCommunityRegionName({ targetName: null, targetCode: '11680' }),
    ).toBe('11680')
    expect(getCommunityRegionName({ targetName: null, targetCode: null })).toBe(
      '서울 전체',
    )
  })
})

describe('getCommunityRailRegionName', () => {
  it('레일 제목에는 코드를 띄우지 않는다 — 이름이 없으면 이 지역, 대상이 없으면 서울 전체', () => {
    expect(
      getCommunityRailRegionName({
        targetName: ' 강남구 ',
        targetCode: '11680',
      }),
    ).toBe('강남구')
    expect(
      getCommunityRailRegionName({ targetName: null, targetCode: '11680' }),
    ).toBe('이 지역')
    expect(
      getCommunityRailRegionName({ targetName: '  ', targetCode: null }),
    ).toBe('서울 전체')
  })
})

describe('getCommunityPostMenuActions (CM-022)', () => {
  it('내 글은 수정·삭제만 있다', () => {
    expect(getCommunityPostMenuActions(true)).toEqual(['edit', 'delete'])
  })

  it('남의 글은 신고만 있다', () => {
    expect(getCommunityPostMenuActions(false)).toEqual(['report'])
  })
})

describe('getNextCommunityMenuIndex', () => {
  it('↑↓ 는 끝에서 반대쪽으로 돈다', () => {
    expect(getNextCommunityMenuIndex(3, 0, 'ArrowDown')).toBe(1)
    expect(getNextCommunityMenuIndex(3, 2, 'ArrowDown')).toBe(0)
    expect(getNextCommunityMenuIndex(3, 0, 'ArrowUp')).toBe(2)
    expect(getNextCommunityMenuIndex(3, -1, 'ArrowDown')).toBe(0)
  })

  it('Home·End 는 처음과 끝, 다른 키와 빈 목록은 null 이다', () => {
    expect(getNextCommunityMenuIndex(3, 1, 'Home')).toBe(0)
    expect(getNextCommunityMenuIndex(3, 1, 'End')).toBe(2)
    expect(getNextCommunityMenuIndex(3, 1, 'Enter')).toBeNull()
    expect(getNextCommunityMenuIndex(0, -1, 'ArrowDown')).toBeNull()
  })
})

describe('createCommunityShareUrl', () => {
  it('목록 맥락(from)과 해시를 빼고 정규 주소만 남긴다', () => {
    const from = encodeURIComponent('{"view":"latest","keyword":""}')

    expect(
      createCommunityShareUrl(
        `https://bosspick.test/community/7?from=${from}#comments`,
      ),
    ).toBe('https://bosspick.test/community/7')
  })

  it('dev 용 mock=1 은 남긴다', () => {
    expect(
      createCommunityShareUrl(
        'https://bosspick.test/community/7?from=x&mock=1',
      ),
    ).toBe('https://bosspick.test/community/7?mock=1')
  })

  it('해석할 수 없는 주소는 그대로 돌려준다', () => {
    expect(createCommunityShareUrl('not a url')).toBe('not a url')
  })
})

const abortError = () => {
  const error = new Error('cancelled')
  error.name = 'AbortError'
  return error
}

describe('shareCommunityPost', () => {
  const payload = {
    title: '성수역 팝업',
    url: 'https://bosspick.test/community/7',
  }

  it('navigator.share 가 있으면 그것을 쓴다', async () => {
    const share = vi.fn(async () => undefined)
    const writeText = vi.fn(async () => undefined)

    await expect(
      shareCommunityPost(payload, { share, clipboard: { writeText } }),
    ).resolves.toBe('shared')
    expect(share).toHaveBeenCalledWith(payload)
    expect(writeText).not.toHaveBeenCalled()
  })

  it('사용자가 공유 시트를 닫으면(AbortError) 아무것도 하지 않는다', async () => {
    const writeText = vi.fn(async () => undefined)

    await expect(
      shareCommunityPost(payload, {
        share: vi.fn(async () => {
          throw abortError()
        }),
        clipboard: { writeText },
      }),
    ).resolves.toBe('cancelled')
    expect(writeText).not.toHaveBeenCalled()
  })

  it('공유가 이미 진행 중이라 거절되면(InvalidStateError) 취소로 보고 복사하지 않는다', async () => {
    const writeText = vi.fn(async () => undefined)
    const invalidState = new Error('An earlier share has not yet completed.')
    invalidState.name = 'InvalidStateError'

    await expect(
      shareCommunityPost(payload, {
        share: vi.fn(async () => {
          throw invalidState
        }),
        clipboard: { writeText },
      }),
    ).resolves.toBe('cancelled')
    expect(writeText).not.toHaveBeenCalled()
  })

  it('share 가 다른 이유로 실패하면 클립보드로 넘어간다', async () => {
    const writeText = vi.fn(async () => undefined)

    await expect(
      shareCommunityPost(payload, {
        share: vi.fn(async () => {
          throw new Error('NotAllowedError')
        }),
        clipboard: { writeText },
      }),
    ).resolves.toBe('copied')
    expect(writeText).toHaveBeenCalledWith(payload.url)
  })

  it('share 가 없으면 주소를 복사한다 (CM-021)', async () => {
    const writeText = vi.fn(async () => undefined)

    await expect(
      shareCommunityPost(payload, { clipboard: { writeText } }),
    ).resolves.toBe('copied')
    expect(writeText).toHaveBeenCalledWith(payload.url)
  })

  it('복사가 실패하거나 클립보드가 없으면 failed 다', async () => {
    await expect(
      shareCommunityPost(payload, {
        clipboard: {
          writeText: vi.fn(async () => {
            throw new Error('denied')
          }),
        },
      }),
    ).resolves.toBe('failed')
    await expect(shareCommunityPost(payload, {})).resolves.toBe('failed')
    await expect(shareCommunityPost(payload, undefined)).resolves.toBe('failed')
  })

  it('결과별 토스트 문구 — 취소와 공유 성공은 토스트가 없다', () => {
    expect(COMMUNITY_SHARE_TOAST.copied).toEqual({
      message: '링크를 복사했어요',
      tone: 'success',
    })
    expect(COMMUNITY_SHARE_TOAST.failed).toEqual({
      message: '링크를 복사하지 못했어요',
      tone: 'error',
    })
    expect(COMMUNITY_SHARE_TOAST.cancelled).toBeNull()
    expect(COMMUNITY_SHARE_TOAST.shared).toBeNull()
  })
})

describe('shareCommunityPostOnce', () => {
  const payload = {
    title: '성수역 팝업',
    url: 'https://bosspick.test/community/7',
  }

  it('공유 시트가 떠 있는 동안 두 번째 호출은 share 를 다시 부르지 않고 null 이다', async () => {
    let finish: () => void = () => {}
    const share = vi.fn(
      () =>
        new Promise<void>(resolve => {
          finish = resolve
        }),
    )
    const inFlight = { current: false }

    const first = shareCommunityPostOnce(inFlight, payload, { share })
    const second = shareCommunityPostOnce(inFlight, payload, { share })

    await expect(second).resolves.toBeNull()
    expect(share).toHaveBeenCalledTimes(1)
    expect(inFlight.current).toBe(true)

    finish()
    await expect(first).resolves.toBe('shared')
    expect(inFlight.current).toBe(false)
  })

  it('끝나면(실패해도) 다음 호출을 다시 받는다', async () => {
    const inFlight = { current: false }

    await expect(shareCommunityPostOnce(inFlight, payload, {})).resolves.toBe(
      'failed',
    )
    expect(inFlight.current).toBe(false)

    const share = vi.fn(async () => undefined)
    await expect(
      shareCommunityPostOnce(inFlight, payload, { share }),
    ).resolves.toBe('shared')
    expect(share).toHaveBeenCalledTimes(1)
  })
})
