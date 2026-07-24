import { invalidateMemberInfoQuery } from '@/lib/member-info-query'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import type { ApiResponse } from '@/types/api'
import type { MemberInfo } from '@/types/auth'
import type { UpdateMemberInfoPayload } from '@/types/profile'

export type ProfileUpdateMutationVariables = {
  requestMemberId: string
  generation: number
  memberSnapshot: MemberInfo
  payload: UpdateMemberInfoPayload
}

export const canSubmitProfileUpdate = ({
  hasHydrated,
  isLoggedIn,
  currentMemberId,
  renderedMemberId,
}: {
  hasHydrated: boolean
  isLoggedIn: boolean
  currentMemberId: string | null
  renderedMemberId: string
}): boolean => hasHydrated && isLoggedIn && currentMemberId === renderedMemberId

type MemberInfoInvalidationClient = Parameters<
  typeof invalidateMemberInfoQuery
>[0]

export const isActiveProfileUpdateMutation = (
  variables: ProfileUpdateMutationVariables,
  currentMemberId: string | null,
  activeGeneration: number,
): boolean =>
  variables.requestMemberId === currentMemberId &&
  variables.generation === activeGeneration

export const handleProfileUpdateSuccess = async ({
  response,
  variables,
  queryClient,
  getCurrentMemberId,
  getActiveGeneration,
  onActiveSuccess,
  onActiveError,
}: {
  response: ApiResponse<null>
  variables: ProfileUpdateMutationVariables
  queryClient: MemberInfoInvalidationClient
  getCurrentMemberId: () => string | null
  getActiveGeneration: () => number
  onActiveSuccess: (memberInfo: MemberInfo) => void
  onActiveError: (message: string) => void
}): Promise<boolean> => {
  try {
    await invalidateMemberInfoQuery(queryClient, variables.requestMemberId)
  } catch {
    // The captured member key was still targeted; UI handling remains local.
  }

  if (
    !isActiveProfileUpdateMutation(
      variables,
      getCurrentMemberId(),
      getActiveGeneration(),
    )
  ) {
    return false
  }

  if (!isApiSuccess(response)) {
    onActiveError(getApiMessage(response, '프로필 정보를 수정하지 못했습니다.'))
    return false
  }

  onActiveSuccess({
    ...variables.memberSnapshot,
    nickname: variables.payload.nickname,
    profileImageUrl: variables.payload.profileImage,
  })
  return true
}

export const applyProfileUpdateError = ({
  error,
  variables,
  currentMemberId,
  activeGeneration,
  onActiveError,
}: {
  error: unknown
  variables: ProfileUpdateMutationVariables
  currentMemberId: string | null
  activeGeneration: number
  onActiveError: (message: string) => void
}): boolean => {
  if (
    !isActiveProfileUpdateMutation(variables, currentMemberId, activeGeneration)
  ) {
    return false
  }

  onActiveError(
    error instanceof Error
      ? error.message
      : '닉네임과 이미지를 확인한 뒤 다시 저장해주세요.',
  )
  return true
}
