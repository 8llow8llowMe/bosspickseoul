import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import type { ApiResponse } from '@/types/api'
import type { MemberInfo } from '@/types/auth'

export const getMemberInfoQueryKey = (memberId: string) =>
  ['memberInfo', memberId] as const

export const isMemberInfoQueryEnabled = (
  memberId: string | null | undefined,
  hasHydrated: boolean,
  isLoggedIn: boolean,
): memberId is string => Boolean(memberId) && hasHydrated && isLoggedIn

export type ResolvedMemberInfoResponse =
  | { status: 'idle' }
  | { status: 'success'; memberInfo: MemberInfo }
  | { status: 'error'; message: string }

export const resolveMemberInfoResponse = (
  response: ApiResponse<MemberInfo> | null | undefined,
  requestedMemberId: string | null,
): ResolvedMemberInfoResponse => {
  if (!response) return { status: 'idle' }

  if (!isApiSuccess(response) || !response.dataBody) {
    return {
      status: 'error',
      message: getApiMessage(response, '프로필 정보를 불러오지 못했습니다.'),
    }
  }

  if (!requestedMemberId || response.dataBody.memberId !== requestedMemberId) {
    return {
      status: 'error',
      message: '요청한 회원과 다른 프로필 응답을 받았습니다.',
    }
  }

  return {
    status: 'success',
    memberInfo: response.dataBody,
  }
}

export const applyResolvedMemberInfoResponse = (
  resolved: ResolvedMemberInfoResponse,
  {
    setSession,
    onError,
  }: {
    setSession: (memberInfo: MemberInfo) => void
    onError: (message: string) => void
  },
): ResolvedMemberInfoResponse['status'] => {
  if (resolved.status === 'success') {
    setSession(resolved.memberInfo)
  } else if (resolved.status === 'error') {
    onError(resolved.message)
  }

  return resolved.status
}

type MemberInfoInvalidationClient = {
  invalidateQueries: (filters: {
    queryKey: ReturnType<typeof getMemberInfoQueryKey>
  }) => Promise<unknown>
}

type MemberInfoRemovalClient = {
  cancelQueries: (filters: {
    queryKey: ReturnType<typeof getMemberInfoQueryKey>
  }) => Promise<unknown>
  removeQueries: (filters: {
    queryKey: ReturnType<typeof getMemberInfoQueryKey>
  }) => unknown
}

export const invalidateMemberInfoQuery = (
  queryClient: MemberInfoInvalidationClient,
  memberId: string,
) =>
  queryClient.invalidateQueries({
    queryKey: getMemberInfoQueryKey(memberId),
  })

export const clearMemberInfoQuery = async (
  queryClient: MemberInfoRemovalClient,
  memberId: string,
): Promise<void> => {
  const queryKey = getMemberInfoQueryKey(memberId)

  try {
    await queryClient.cancelQueries({ queryKey })
  } catch {
    // Logout cleanup remains best-effort when cancellation fails.
  } finally {
    try {
      queryClient.removeQueries({ queryKey })
    } catch {
      // Session cleanup and navigation must still continue.
    }
  }
}
