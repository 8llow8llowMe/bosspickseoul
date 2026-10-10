import { describe, expect, it } from 'vitest'

import {
  ARCHIVE_REMOVAL_BATCH_COPY,
  BOOKMARK_REMOVAL_BATCH_COPY,
  SESSION_REVOKE_BATCH_COPY,
  SIMULATION_HISTORY_REMOVAL_BATCH_COPY,
} from '@/lib/profile/removal-batch-copy'
import {
  createFailureTally,
  describeRemovalFailure,
  excludeHiddenItems,
  RemovalFailedError,
  requestRemoval,
} from '@/lib/profile/removal-request'

const ok = () => ({
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody: null,
})

const httpError = (status: number, resultMessage = '서버 문구') => ({
  response: {
    status,
    data: {
      dataHeader: { success: false, resultCode: 'X_001', resultMessage },
      dataBody: null,
    },
  },
})

describe('requestRemoval', () => {
  it('성공 응답이면 조용히 끝난다', async () => {
    await expect(requestRemoval(async () => ok(), '실패')).resolves.toBe(
      undefined,
    )
  })

  /* 다른 기기에서 먼저 지웠다 — 바란 상태와 같으므로 숨긴 카드를 되살리지 않는다. */
  it('404 는 이미 지워진 것으로 보고 성공으로 접는다', async () => {
    await expect(
      requestRemoval(async () => {
        throw httpError(404)
      }, '실패'),
    ).resolves.toBe(undefined)
  })

  it('그 밖의 실패는 서버 문구를 실어 던진다', async () => {
    await expect(
      requestRemoval(async () => {
        throw httpError(500, '잠시 후 다시 시도해 주세요.')
      }, '실패'),
    ).rejects.toThrow(new RemovalFailedError('잠시 후 다시 시도해 주세요.'))
  })

  it('HTTP 는 성공인데 success=false 면 실패다', async () => {
    await expect(
      requestRemoval(
        async () => ({
          dataHeader: {
            success: false,
            resultCode: 'X_002',
            resultMessage: '권한이 없어요.',
          },
          dataBody: null,
        }),
        '실패',
      ),
    ).rejects.toThrow('권한이 없어요.')
  })
})

describe('describeRemovalFailure', () => {
  it('무엇이 다시 나타났는지 먼저 말하고 사유를 뒤에 붙인다', () => {
    expect(
      describeRemovalFailure(
        '망원동 북마크를 해제하지 못해 다시 보여 드려요.',
        new Error('권한이 없어요.'),
      ),
    ).toBe('망원동 북마크를 해제하지 못해 다시 보여 드려요. 권한이 없어요.')
  })

  it('사유가 없으면 첫 문장만', () => {
    expect(describeRemovalFailure('다시 보여 드려요.', null)).toBe(
      '다시 보여 드려요.',
    )
  })
})

describe('excludeHiddenItems', () => {
  const items = [{ id: 'a' }, { id: 'b' }]

  it('숨긴 항목만 뺀다', () => {
    expect(excludeHiddenItems(items, new Set(['a']), item => item.id)).toEqual([
      { id: 'b' },
    ])
  })

  it('숨긴 것이 없으면 같은 배열을 돌려준다', () => {
    expect(excludeHiddenItems(items, new Set(), item => item.id)).toBe(items)
  })
})

describe('createFailureTally — 실패 토스트 한 장이 말할 수', () => {
  it('토스트가 떠 있는 동안 이어진 실패는 더하고, 닫힌 뒤의 실패는 1 부터 센다', () => {
    let now = 0
    const tally = createFailureTally(6000, () => now)

    expect(tally.add()).toBe(1)
    now = 2000
    expect(tally.add()).toBe(2)
    // 마지막 실패로 토스트가 다시 잡혔으므로 그 뒤 6초까지 이어진다.
    now = 7999
    expect(tally.add()).toBe(3)
    now = 14000
    expect(tally.add()).toBe(1)
  })
})

describe('프로필 묶음 문구(#631) — 무엇을 몇 개 했는지 말하는 완결 문장', () => {
  it('북마크', () => {
    expect(BOOKMARK_REMOVAL_BATCH_COPY.removedMany(3)).toBe(
      '북마크 3개를 해제했어요.',
    )
    expect(BOOKMARK_REMOVAL_BATCH_COPY.pendingMany(2)).toBe(
      '북마크 2개는 아직 되돌릴 수 있어요.',
    )
    expect(BOOKMARK_REMOVAL_BATCH_COPY.restoredMany(2)).toBe(
      '북마크 2개의 해제를 되돌렸어요.',
    )
    expect(BOOKMARK_REMOVAL_BATCH_COPY.alreadyDoneMany(1)).toBe(
      '북마크 1개는 이미 해제됐어요.',
    )
    expect(BOOKMARK_REMOVAL_BATCH_COPY.restoredOnFailureMany(2)).toBe(
      '북마크 2개를 해제하지 못해 다시 보여 드려요.',
    )
    expect(BOOKMARK_REMOVAL_BATCH_COPY.failedMany(2)).toBe(
      '북마크 2개를 해제하지 못했어요.',
    )
  })

  it('보관함·기록·기기', () => {
    expect(ARCHIVE_REMOVAL_BATCH_COPY.removedMany(2)).toBe(
      '보관한 화면 2개를 삭제했어요.',
    )
    expect(SIMULATION_HISTORY_REMOVAL_BATCH_COPY.pendingMany(2)).toBe(
      '시뮬레이션 기록 2개는 아직 되돌릴 수 있어요.',
    )
    expect(SESSION_REVOKE_BATCH_COPY.removedMany(3)).toBe(
      '기기 3대의 로그인을 해제했어요.',
    )
    expect(SESSION_REVOKE_BATCH_COPY.pendingMany(2)).toBe(
      '기기 2대의 로그인 해제는 아직 되돌릴 수 있어요.',
    )
    expect(SESSION_REVOKE_BATCH_COPY.failedMany(2)).toBe(
      '기기 2대의 로그인을 해제하지 못했어요.',
    )
  })
})
