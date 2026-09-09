import { describe, expect, it } from 'vitest'

import {
  resolveClampedPage,
  resolveHistoryDeleteFailure,
  resolvePageAfterDelete,
} from './profile-simulation-bookmarks-page'

/** 이 파일이 보는 두 갈래는 화면이 아니라 **삭제 이후의 판단**이다. */

describe('resolvePageAfterDelete', () => {
  it('마지막 남은 항목을 지우면 한 페이지 앞으로 보낸다', () => {
    // 보정하지 않으면 재조회가 빈 목록을 주고 "저장한 결과가 없어요"가 뜬다 — 항목이 남아 있는데도.
    expect(resolvePageAfterDelete({ page: 2, visibleCount: 1 })).toBe(1)
  })

  it('같은 페이지에 항목이 더 있으면 그대로 머문다', () => {
    expect(resolvePageAfterDelete({ page: 2, visibleCount: 3 })).toBe(2)
  })

  it('첫 페이지에서는 마지막 항목을 지워도 뒤로 가지 않는다', () => {
    // page: -1 은 서버에 보낼 수 없는 값이다. 빈 목록 안내가 맞는 화면이다.
    expect(resolvePageAfterDelete({ page: 0, visibleCount: 1 })).toBe(0)
  })

  it('이미 비어 있는 페이지도 앞으로 당긴다', () => {
    // 다른 기기에서 먼저 지워 목록이 빈 채로 들어온 경우.
    expect(resolvePageAfterDelete({ page: 1, visibleCount: 0 })).toBe(0)
  })
})

describe('resolveClampedPage', () => {
  it('마지막 페이지를 넘어선 위치는 끌어당긴다', () => {
    // 11건 → 2페이지(0·1). 2페이지의 1건이 사라지면 유효한 마지막은 0 이다.
    expect(resolveClampedPage({ page: 1, totalPages: 1 })).toBe(0)
  })

  it('범위 안이면 그대로 둔다', () => {
    expect(resolveClampedPage({ page: 1, totalPages: 3 })).toBe(1)
    expect(resolveClampedPage({ page: 2, totalPages: 3 })).toBe(2)
  })

  it('이력이 하나도 없으면 첫 페이지다', () => {
    // totalPages 0 에서 -1 을 만들면 서버에 보낼 수 없는 page 가 된다.
    expect(resolveClampedPage({ page: 4, totalPages: 0 })).toBe(0)
  })
})

describe('resolveHistoryDeleteFailure', () => {
  const httpError = (status: number, resultCode: string | null = null) => ({
    response: {
      status,
      data: {
        dataHeader: { success: false, resultCode, resultMessage: '서버 문구' },
        dataBody: null,
      },
    },
  })

  it('404 SIMULATION_006 은 이미 없어진 항목으로 안내한다', () => {
    // 미존재와 타인 항목을 서버가 구분하지 않는다. 재시도해도 같은 404 다.
    const failure = resolveHistoryDeleteFailure(
      httpError(404, 'SIMULATION_006'),
    )

    expect(failure.alreadyGone).toBe(true)
    expect(failure.message).toContain('이미 삭제된')
  })

  it('그 밖의 실패는 서버 문구를 그대로 쓰고 목록을 다시 부르지 않는다', () => {
    const failure = resolveHistoryDeleteFailure(httpError(500))

    expect(failure.alreadyGone).toBe(false)
    expect(failure.message).toBe('서버 문구')
  })
})
