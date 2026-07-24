import { describe, expect, it, vi } from 'vitest'
import type { MemberInfo } from '@/types/auth'
import {
  applyResolvedMemberInfoResponse,
  clearMemberInfoQuery,
  getMemberInfoQueryKey,
  invalidateMemberInfoQuery,
  isMemberInfoQueryEnabled,
  resolveMemberInfoResponse,
} from './member-info-query'

const member = (memberId: string): MemberInfo => ({
  memberId,
  email: `${memberId}@example.com`,
  name: memberId,
  nickname: memberId,
  profileImageUrl: '',
  role: {
    code: 'MEMBER',
    name: '회원',
    description: '일반 회원',
  },
})

const success = (memberId: string) => ({
  dataHeader: {
    success: true,
    resultCode: null,
    resultMessage: null,
  },
  dataBody: member(memberId),
})

describe('member info account lifecycle', () => {
  it('uses different cache keys for A and B and disables the gap between sessions', () => {
    expect(getMemberInfoQueryKey('member-a')).toEqual([
      'memberInfo',
      'member-a',
    ])
    expect(getMemberInfoQueryKey('member-b')).not.toEqual(
      getMemberInfoQueryKey('member-a'),
    )
    expect(isMemberInfoQueryEnabled('member-a', true, true)).toBe(true)
    expect(isMemberInfoQueryEnabled(null, true, true)).toBe(false)
    expect(isMemberInfoQueryEnabled('member-b', false, true)).toBe(false)
  })

  it('accepts only the requested member response and rejects stale A data for B', () => {
    expect(resolveMemberInfoResponse(success('member-b'), 'member-b')).toEqual({
      status: 'success',
      memberInfo: member('member-b'),
    })
    expect(resolveMemberInfoResponse(success('member-a'), 'member-b')).toEqual({
      status: 'error',
      message: '요청한 회원과 다른 프로필 응답을 받았습니다.',
    })
  })

  it('does not overwrite B session when a stale A response is applied', () => {
    const setSession = vi.fn()
    const onError = vi.fn()
    const resolved = resolveMemberInfoResponse(success('member-a'), 'member-b')

    expect(
      applyResolvedMemberInfoResponse(resolved, {
        setSession,
        onError,
      }),
    ).toBe('error')
    expect(setSession).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledWith(
      '요청한 회원과 다른 프로필 응답을 받았습니다.',
    )
  })

  it('invalidates only the current captured member key after profile edit', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined)

    await invalidateMemberInfoQuery({ invalidateQueries }, 'member-b')

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: getMemberInfoQueryKey('member-b'),
    })
    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: getMemberInfoQueryKey('member-a'),
    })
  })

  it('cancels and removes captured logout data even when cleanup throws', async () => {
    const cancelQueries = vi.fn().mockRejectedValue(new Error('cancel failed'))
    const removeQueries = vi.fn(() => {
      throw new Error('remove failed')
    })

    await expect(
      clearMemberInfoQuery({ cancelQueries, removeQueries }, 'member-a'),
    ).resolves.toBeUndefined()
    expect(cancelQueries).toHaveBeenCalledWith({
      queryKey: getMemberInfoQueryKey('member-a'),
    })
    expect(removeQueries).toHaveBeenCalledWith({
      queryKey: getMemberInfoQueryKey('member-a'),
    })
  })
})
