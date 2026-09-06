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

type MemberInfoWriteClient = {
  setQueryData: (
    queryKey: ReturnType<typeof getMemberInfoQueryKey>,
    data: ApiResponse<MemberInfo>,
  ) => unknown
}

/**
 * 방금 받은 회원 정보를 캐시에 **그대로 심는다.** 쓰기 API 가 수정된 회원 정보를
 * 통째로 돌려줄 때 쓴다(`PATCH /members/me`).
 *
 * 무효화가 아니라 덮어쓰기인 이유: 이미 최신 값을 손에 들고 있는데 같은 것을 한 번 더
 * 받아 올 이유가 없다. 심어 두면 `ProfileShell` 의 쿼리가 그 값을 읽어
 * `setSession` 까지 태우므로 **헤더·사이드바가 재조회 없이 같이 갱신된다.**
 *
 * ⚠️ 응답을 스토어에만 넣고 캐시를 그대로 두면 안 된다 — 다음에 쿼리가 캐시된 옛 응답을
 * 다시 흘리면서 방금 바꾼 값을 되돌려 놓는다.
 */
export const writeMemberInfoQuery = (
  queryClient: MemberInfoWriteClient,
  memberId: string,
  response: ApiResponse<MemberInfo>,
): void => {
  queryClient.setQueryData(getMemberInfoQueryKey(memberId), response)
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
