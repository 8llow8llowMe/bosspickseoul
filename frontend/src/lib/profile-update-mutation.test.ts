import { describe, expect, it, vi } from 'vitest'
import type { MemberInfo } from '@/types/auth'
import {
  applyProfileUpdateError,
  canSubmitProfileUpdate,
  handleProfileUpdateSuccess,
  type ProfileUpdateMutationVariables,
} from './profile-update-mutation'
import { getMemberInfoQueryKey } from './member-info-query'

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

const variables = (
  requestMemberId = 'member-a',
  generation = 1,
): ProfileUpdateMutationVariables => ({
  requestMemberId,
  generation,
  memberSnapshot: member(requestMemberId),
  payload: {
    nickname: '새 닉네임',
    profileImage: 'new.png',
  },
})

const successResponse = {
  dataHeader: {
    success: true,
    resultCode: null,
    resultMessage: null,
  },
  dataBody: null,
}

describe('profile update mutation account guard', () => {
  it('blocks submit until auth is hydrated and the active member matches', () => {
    expect(
      canSubmitProfileUpdate({
        hasHydrated: false,
        isLoggedIn: false,
        currentMemberId: null,
        renderedMemberId: 'member-a',
      }),
    ).toBe(false)
    expect(
      canSubmitProfileUpdate({
        hasHydrated: true,
        isLoggedIn: true,
        currentMemberId: 'member-b',
        renderedMemberId: 'member-a',
      }),
    ).toBe(false)
    expect(
      canSubmitProfileUpdate({
        hasHydrated: true,
        isLoggedIn: true,
        currentMemberId: 'member-a',
        renderedMemberId: 'member-a',
      }),
    ).toBe(true)
  })

  it('invalidates A but does not change store or UI after A logs out', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined)
    const onActiveSuccess = vi.fn()
    const onActiveError = vi.fn()

    await handleProfileUpdateSuccess({
      response: successResponse,
      variables: variables(),
      queryClient: { invalidateQueries },
      getCurrentMemberId: () => null,
      getActiveGeneration: () => 1,
      onActiveSuccess,
      onActiveError,
    })

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: getMemberInfoQueryKey('member-a'),
    })
    expect(onActiveSuccess).not.toHaveBeenCalled()
    expect(onActiveError).not.toHaveBeenCalled()
  })

  it('invalidates A but does not change B store or UI after B logs in', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined)
    const onActiveSuccess = vi.fn()
    const onActiveError = vi.fn()

    await handleProfileUpdateSuccess({
      response: successResponse,
      variables: variables(),
      queryClient: { invalidateQueries },
      getCurrentMemberId: () => 'member-b',
      getActiveGeneration: () => 1,
      onActiveSuccess,
      onActiveError,
    })

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: getMemberInfoQueryKey('member-a'),
    })
    expect(onActiveSuccess).not.toHaveBeenCalled()
    expect(onActiveError).not.toHaveBeenCalled()
  })

  it('updates active A normally and invalidates only A', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined)
    const onActiveSuccess = vi.fn()

    await handleProfileUpdateSuccess({
      response: successResponse,
      variables: variables(),
      queryClient: { invalidateQueries },
      getCurrentMemberId: () => 'member-a',
      getActiveGeneration: () => 1,
      onActiveSuccess,
      onActiveError: vi.fn(),
    })

    expect(onActiveSuccess).toHaveBeenCalledWith({
      ...member('member-a'),
      nickname: '새 닉네임',
      profileImageUrl: 'new.png',
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: getMemberInfoQueryKey('member-a'),
    })
  })

  it('ignores transport errors from an older generation or different member', () => {
    const onActiveError = vi.fn()

    expect(
      applyProfileUpdateError({
        error: new Error('late failure'),
        variables: variables('member-a', 1),
        currentMemberId: 'member-a',
        activeGeneration: 2,
        onActiveError,
      }),
    ).toBe(false)
    expect(
      applyProfileUpdateError({
        error: new Error('late failure'),
        variables: variables('member-a', 1),
        currentMemberId: 'member-b',
        activeGeneration: 1,
        onActiveError,
      }),
    ).toBe(false)
    expect(onActiveError).not.toHaveBeenCalled()
  })
})
