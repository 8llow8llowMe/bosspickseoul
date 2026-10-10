import { describe, expect, it } from 'vitest'

import {
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
