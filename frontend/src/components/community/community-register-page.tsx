'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import styled from 'styled-components'
import CommunityEditorForm, {
  type CommunityEditorMode,
  type CommunityEditorValue,
} from '@/components/community/community-editor-form'
import CommunityFeedback from '@/components/community/community-feedback'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import { realCommunitySource } from '@/lib/community/community-data-source'
import {
  communityMockSource,
  MOCK_COMMUNITY_MEMBER_ID,
} from '@/lib/community/community-mock'
import {
  readComparisonDraftRequest,
  type ComparisonDraftParams,
  type ComparisonDraftRequest,
} from '@/lib/community/comparison-draft-url'
import {
  COMMUNITY_CURSOR_START,
  communityKeys,
  getCommunityLoginHref,
  isCommunityMockEnabled,
  parseCommunityPostId,
  parseCommunityTargetType,
  type CommunityViewer,
} from '@/lib/community/community-state'
import { useAuthStore } from '@/stores/auth-store'
import type {
  CommunityComparisonDraft,
  CommunityId,
  CommunityPostCreateRequest,
  CommunityPostDetailResponse,
  CommunityPostUpdateRequest,
} from '@/types/community'

const Page = styled.main`
  width: min(880px, calc(100% - 48px));
  margin: 0 auto;
  padding: 40px 0 72px;
  display: grid;
  gap: 24px;

  @media (max-width: 640px) {
    width: min(100% - 32px, 880px);
    padding: 24px 0 48px;
  }
`

const Header = styled.header`
  display: grid;
  gap: 10px;
`

const Eyebrow = styled.p`
  color: var(--color-primary-700);
  font-size: 13px;
  font-weight: 700;
`

const Title = styled.h1`
  color: var(--color-text-900);
  font-size: 32px;
  line-height: 1.3;
  word-break: keep-all;

  @media (max-width: 640px) {
    font-size: 25px;
  }
`

const Description = styled.p`
  color: var(--color-text-600);
  font-size: 15px;
  line-height: 1.7;
  word-break: keep-all;
`

const Notice = styled.p`
  padding: 12px 14px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-field);
  background: var(--color-surface);
  color: var(--color-text-700);
  font-size: 14px;
  line-height: 1.6;
  word-break: keep-all;
`

export class CommunityEditorQueryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CommunityEditorQueryError'
  }
}

export const parseCommunityEditorPostId = parseCommunityPostId

export const communityEditorKeys = {
  edit: (postId: CommunityId, mockEnabled: boolean) =>
    ['community', 'editor', 'edit', postId, mockEnabled] as const,
  comparisonDraft: (params: ComparisonDraftParams, mockEnabled: boolean) =>
    [
      'community',
      'editor',
      'comparison-draft',
      params.leftCommercialCode,
      params.rightCommercialCode,
      params.serviceCode,
      params.administrationCode,
      mockEnabled,
    ] as const,
}

/**
 * 초안을 못 받아도 **글쓰기를 막지 않는다.** 안내만 하고 빈 폼을 그대로 쓰게 둔다 —
 * 초안은 편의이지 글쓰기의 전제가 아니다.
 *
 * 조용히 빈 폼을 주지 않는 이유는 그 반대편이다: 사용자는 「이 비교로 글쓰기」를 눌러
 * 왔으므로, 아무 설명 없이 빈 폼이 나오면 자기가 누른 것이 실패했다는 사실조차 모른다.
 */
export const COMPARISON_DRAFT_ERROR_NOTICE =
  '비교 내용을 불러오지 못했어요. 직접 작성하실 수 있어요.'

/**
 * 초안이 화면을 어떻게 바꾸는가. **순수 함수로 빼 둔 이유**가 있다 —
 * `renderToStaticMarkup` 은 효과를 돌리지 않고 react-query 는 서버 렌더에서 실패
 * 상태를 `pending` 으로 보고하므로, 실패 분기를 화면 문자열로는 검증할 수 없다.
 * 규칙을 여기 모아 두면 그 분기도 테스트가 붙는다(`getCommunityEditorAccess` 와 같은 처리).
 */
export type ComparisonDraftView =
  | { kind: 'none' }
  | { kind: 'loading' }
  | { kind: 'failed' }
  | { kind: 'ready'; draft: CommunityComparisonDraft }

type ComparisonDraftViewOptions = {
  requestKind: ComparisonDraftRequest['kind']
  pending: boolean
  failed: boolean
  draft: CommunityComparisonDraft | null
}

export const resolveComparisonDraftView = ({
  requestKind,
  pending,
  failed,
  draft,
}: ComparisonDraftViewOptions): ComparisonDraftView => {
  if (requestKind === 'none') {
    return { kind: 'none' }
  }

  // 값이 깨진 링크는 호출해 볼 것도 없다. 곧바로 안내한다.
  if (requestKind === 'invalid' || failed) {
    return { kind: 'failed' }
  }

  if (pending) {
    return { kind: 'loading' }
  }

  /*
   * 성공 응답인데 본문이 비어 있는 경우도 실패로 다룬다 — 빈 제목·본문을 폼에 넣으면
   * 초안이 온 것처럼 보이지만 사용자가 얻는 것은 없다.
   */
  return draft ? { kind: 'ready', draft } : { kind: 'failed' }
}

type CommunityEditorViewerOptions = {
  mockEnabled: boolean
  hasHydrated: boolean
  isLoggedIn: boolean
  memberId: string | number | null | undefined
}

export const getCommunityEditorViewer = ({
  mockEnabled,
  hasHydrated,
  isLoggedIn,
  memberId,
}: CommunityEditorViewerOptions): CommunityViewer => {
  if (mockEnabled) {
    return {
      authenticated: true,
      memberId: String(MOCK_COMMUNITY_MEMBER_ID),
    }
  }

  const authenticated = hasHydrated && isLoggedIn
  return {
    authenticated,
    memberId:
      authenticated && memberId !== null && memberId !== undefined
        ? String(memberId)
        : null,
  }
}

export type CommunityEditorAccess =
  | 'waiting'
  | 'redirect'
  | 'allowed'
  | 'forbidden'

type CommunityEditorAccessOptions = {
  mockEnabled: boolean
  hasHydrated: boolean
  isLoggedIn: boolean
  viewerMemberId: string | null
  editMemberId: CommunityId | null
}

export const getCommunityEditorAccess = ({
  mockEnabled,
  hasHydrated,
  isLoggedIn,
  viewerMemberId,
  editMemberId,
}: CommunityEditorAccessOptions): CommunityEditorAccess => {
  if (!mockEnabled && !hasHydrated) {
    return 'waiting'
  }

  if (!mockEnabled && !isLoggedIn) {
    return 'redirect'
  }

  if (
    editMemberId !== null &&
    (!viewerMemberId || String(editMemberId) !== viewerMemberId)
  ) {
    return 'forbidden'
  }

  return 'allowed'
}

export const getCommunityEditorFormKey = (
  mode: CommunityEditorMode,
  postId: CommunityId | null,
) => (mode === 'edit' && postId ? `edit-${postId}` : 'create')

export const createCommunityEditorPayload = (
  mode: CommunityEditorMode,
  value: CommunityEditorValue,
): CommunityPostCreateRequest | CommunityPostUpdateRequest => {
  const content = {
    title: value.title,
    content: value.content,
  }

  if (mode === 'edit') {
    return content
  }

  const { targetType, targetCode } = value.location

  if (!targetType || !targetCode?.trim()) {
    throw new Error('지역을 선택해 주세요.')
  }

  return {
    ...content,
    targetType,
    targetCode: targetCode.trim(),
  }
}

export const createCommunityEditorDetailHref = (
  postId: CommunityId,
  mockEnabled: boolean,
) => `/community/${postId}${mockEnabled ? '?mock=1' : ''}`

export const validateCommunityEditorDetailResponse = (
  response: CommunityPostDetailResponse,
) => {
  if (!isApiSuccess(response)) {
    throw new CommunityEditorQueryError(getApiMessage(response))
  }

  return response
}

export const isCommunityEditorUnauthorizedError = (error: unknown) =>
  isAxiosError(error) && error.response?.status === 401

export const shouldRetryCommunityEditorQuery = (
  failureCount: number,
  error: unknown,
) => !isCommunityEditorUnauthorizedError(error) && failureCount < 2

type RecoverCommunityEditorUnauthorizedOptions = {
  queryClient: QueryClient
  queryKeys: QueryKey[]
  clearSession: () => void
  navigate: (href: string) => void
  currentHref: string
}

export const recoverCommunityEditorUnauthorized = async ({
  queryClient,
  queryKeys,
  clearSession,
  navigate,
  currentHref,
}: RecoverCommunityEditorUnauthorizedOptions) => {
  await Promise.all(
    queryKeys.map(queryKey =>
      queryClient.cancelQueries({ queryKey, exact: true }),
    ),
  )
  queryKeys.forEach(queryKey => {
    queryClient.removeQueries({ queryKey, exact: true })
  })
  clearSession()
  navigate(getCommunityLoginHref(currentHref))
}

type CommunityEditorRecoveryRef = {
  current: Promise<void> | null
}

export const startCommunityEditorUnauthorizedRecovery = (
  recoveryRef: CommunityEditorRecoveryRef,
  recover: () => Promise<void>,
) => {
  if (recoveryRef.current) {
    return recoveryRef.current
  }

  const recovery = recover()
  recoveryRef.current = recovery
  void recovery.then(
    () => {
      if (recoveryRef.current === recovery) {
        recoveryRef.current = null
      }
    },
    () => {
      if (recoveryRef.current === recovery) {
        recoveryRef.current = null
      }
    },
  )

  return recovery
}

const getEditorErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

export default function CommunityRegisterPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const hasHydrated = useAuthStore(auth => auth.hasHydrated)
  const isLoggedIn = useAuthStore(auth => auth.isLoggedIn)
  const memberId = useAuthStore(auth => auth.memberInfo?.memberId)
  const clearSession = useAuthStore(auth => auth.clearSession)
  const rawPostId = searchParams.get('postId')
  const postId = parseCommunityEditorPostId(rawPostId)
  const invalidPostId = rawPostId !== null && postId === null
  const mode: CommunityEditorMode = postId ? 'edit' : 'create'
  const mockEnabled = isCommunityMockEnabled(searchParams.get('mock'))
  const source = mockEnabled ? communityMockSource : realCommunitySource
  /*
   * 수정 모드에서는 초안을 보지 않는다 — 이미 있는 글을 고치는 중인데 초안이 덮으면
   * 사용자가 쓴 내용이 사라진다.
   */
  const draftRequest =
    mode === 'create'
      ? readComparisonDraftRequest(searchParams)
      : ({ kind: 'none' } as const)
  const draftParams = draftRequest.kind === 'ready' ? draftRequest.params : null
  const rawSearchParams = searchParams.toString()
  const currentHref = rawSearchParams
    ? `${pathname}?${rawSearchParams}`
    : pathname
  const viewer = getCommunityEditorViewer({
    mockEnabled,
    hasHydrated,
    isLoggedIn,
    memberId,
  })
  const baseAccess = getCommunityEditorAccess({
    mockEnabled,
    hasHydrated,
    isLoggedIn,
    viewerMemberId: viewer.memberId,
    editMemberId: null,
  })
  const editQueryKey = communityEditorKeys.edit(
    postId ?? COMMUNITY_CURSOR_START,
    mockEnabled,
  )
  const editorQueryKeys: QueryKey[] =
    mode === 'edit' && postId ? [editQueryKey] : []
  const unauthorizedRecoveryRef = useRef<Promise<void> | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)
  const detailQuery = useQuery({
    queryKey: editQueryKey,
    queryFn: async () =>
      validateCommunityEditorDetailResponse(await source.getPost(postId!)),
    enabled: mode === 'edit' && !invalidPostId && baseAccess === 'allowed',
    retry: shouldRetryCommunityEditorQuery,
    staleTime: 0,
    refetchOnMount: 'always',
  })
  const draftQuery = useQuery({
    queryKey: communityEditorKeys.comparisonDraft(
      draftParams ?? {
        leftCommercialCode: '',
        rightCommercialCode: '',
        serviceCode: '',
        administrationCode: '',
      },
      mockEnabled,
    ),
    queryFn: async ({ signal }) => {
      const response = await source.createComparisonDraft(draftParams!, signal)

      if (!isApiSuccess(response)) {
        throw new CommunityEditorQueryError(getApiMessage(response))
      }

      return response
    },
    enabled: draftParams !== null && baseAccess === 'allowed',
    // 초안은 한 번 받으면 그대로 쓴다. 폼을 채운 뒤 다시 받아 오면 사용자가 고친
    // 내용을 덮어쓸 위험만 남는다.
    staleTime: Infinity,
    retry: false,
  })
  const draftView = resolveComparisonDraftView({
    requestKind: draftRequest.kind,
    pending: draftQuery.isPending,
    failed: draftQuery.isError,
    draft: draftQuery.data?.dataBody ?? null,
  })
  const draft = draftView.kind === 'ready' ? draftView.draft : null

  const detail = detailQuery.data?.dataBody
  const access = getCommunityEditorAccess({
    mockEnabled,
    hasHydrated,
    isLoggedIn,
    viewerMemberId: viewer.memberId,
    editMemberId: mode === 'edit' && detail ? detail.memberId : null,
  })

  const recoverUnauthorized = () =>
    startCommunityEditorUnauthorizedRecovery(unauthorizedRecoveryRef, () =>
      recoverCommunityEditorUnauthorized({
        queryClient,
        queryKeys: editorQueryKeys,
        clearSession,
        navigate: href => router.replace(href, { scroll: false }),
        currentHref,
      }),
    )

  useEffect(() => {
    if (mockEnabled || invalidPostId) {
      return
    }

    if (access === 'redirect') {
      router.replace(getCommunityLoginHref(currentHref), { scroll: false })
      return
    }

    if (
      detailQuery.isError &&
      isCommunityEditorUnauthorizedError(detailQuery.error)
    ) {
      void recoverUnauthorized()
    }
  })

  const submitMutation = useMutation({
    mutationFn: async (value: CommunityEditorValue) => {
      setMutationError(null)
      const payload = createCommunityEditorPayload(mode, value)
      const response =
        mode === 'edit'
          ? await source.updatePost(
              postId!,
              payload as CommunityPostUpdateRequest,
            )
          : await source.createPost(payload as CommunityPostCreateRequest)

      return validateCommunityEditorDetailResponse(response)
    },
    onSuccess: async response => {
      await queryClient.invalidateQueries({ queryKey: communityKeys.all })
      router.replace(
        createCommunityEditorDetailHref(response.dataBody.postId, mockEnabled),
      )
    },
    onError: error => {
      if (!mockEnabled && isCommunityEditorUnauthorizedError(error)) {
        void recoverUnauthorized()
        return
      }

      setMutationError(
        getEditorErrorMessage(
          error,
          mode === 'edit'
            ? '게시글을 수정하지 못했어요. 입력 내용을 확인한 뒤 다시 시도해 주세요.'
            : '게시글을 등록하지 못했어요. 입력 내용을 확인한 뒤 다시 시도해 주세요.',
        ),
      )
    },
  })

  const handleCancel = () => {
    if (mode === 'edit' && postId) {
      router.push(createCommunityEditorDetailHref(postId, mockEnabled))
      return
    }

    router.push(`/community/list${mockEnabled ? '?mock=1' : ''}`)
  }

  if (invalidPostId) {
    return (
      <Page>
        <CommunityFeedback
          kind="error"
          title="수정할 게시글 주소가 올바르지 않아요"
          description="게시글 목록으로 돌아가 다시 선택해 주세요."
          actionLabel="목록으로 돌아가기"
          onAction={() =>
            router.push(`/community/list${mockEnabled ? '?mock=1' : ''}`)
          }
        />
      </Page>
    )
  }

  if (access === 'waiting' || access === 'redirect') {
    return (
      <Page>
        <CommunityFeedback
          kind="loading"
          title={
            access === 'waiting'
              ? '로그인 상태를 확인하고 있어요'
              : '로그인 화면으로 이동하고 있어요'
          }
        />
      </Page>
    )
  }

  if (
    mode === 'edit' &&
    (detailQuery.isPending || !detailQuery.isFetchedAfterMount)
  ) {
    return (
      <Page>
        <CommunityFeedback
          kind="loading"
          title="수정할 게시글을 불러오는 중이에요"
        />
      </Page>
    )
  }

  if (mode === 'edit' && detailQuery.isError) {
    if (isCommunityEditorUnauthorizedError(detailQuery.error)) {
      return (
        <Page>
          <CommunityFeedback
            kind="loading"
            title="로그인 화면으로 이동하고 있어요"
          />
        </Page>
      )
    }

    return (
      <Page>
        <CommunityFeedback
          kind="error"
          title="수정할 게시글을 불러오지 못했어요"
          description={getEditorErrorMessage(
            detailQuery.error,
            '잠시 후 다시 시도해 주세요.',
          )}
          actionLabel="다시 시도"
          onAction={() => void detailQuery.refetch()}
        />
      </Page>
    )
  }

  /*
   * ⚠️ 폼이 해결되기 **전에** 렌더되면 안 된다. `CommunityEditorForm` 은
   * `useState(initialValue)` 로 마운트 시점 값만 읽으므로, 뒤늦게 도착한 초안은
   * 조용히 무시된다(`key` 를 바꾸면 사용자가 그 사이 친 글자가 날아간다).
   */
  if (draftView.kind === 'loading') {
    return (
      <Page>
        <CommunityFeedback
          kind="loading"
          title="비교 내용을 불러오는 중이에요"
        />
      </Page>
    )
  }

  if (access === 'forbidden') {
    return (
      <Page>
        <CommunityFeedback
          kind="error"
          title="게시글을 수정할 권한이 없어요"
          description="본인이 작성한 게시글만 수정할 수 있어요."
          actionLabel="게시글로 돌아가기"
          onAction={() => {
            if (postId) {
              router.push(createCommunityEditorDetailHref(postId, mockEnabled))
            }
          }}
        />
      </Page>
    )
  }

  const initialValue: CommunityEditorValue =
    mode === 'edit' && detail
      ? {
          title: detail.title,
          content: detail.content,
          location: {
            targetType: parseCommunityTargetType(
              detail.targetType?.code ?? null,
            ),
            targetCode: detail.targetCode ?? undefined,
            targetName: detail.targetName ?? undefined,
          },
        }
      : {
          title: draft?.title ?? '',
          content: draft?.content ?? '',
          location: draft
            ? {
                targetType: parseCommunityTargetType(
                  draft.targetType?.code ?? null,
                ),
                targetCode: draft.targetCode ?? undefined,
                targetName: draft.targetName ?? undefined,
              }
            : {},
        }

  return (
    <Page>
      <Header>
        <Eyebrow>{mode === 'edit' ? '게시글 수정' : '새 게시글'}</Eyebrow>
        <Title>
          {mode === 'edit'
            ? '경험과 정보를 최신 내용으로 다듬어 주세요.'
            : '사장님들과 나누고 싶은 이야기를 들려주세요.'}
        </Title>
        <Description>
          지역 선택은 필수이며, 구체적인 경험과 상황을 함께 적으면 더 좋은
          답변을 받을 수 있어요.
        </Description>
      </Header>

      {draftView.kind === 'failed' ? (
        <Notice role="status">{COMPARISON_DRAFT_ERROR_NOTICE}</Notice>
      ) : null}

      <CommunityEditorForm
        key={getCommunityEditorFormKey(mode, postId)}
        mode={mode}
        initialValue={initialValue}
        mockEnabled={mockEnabled}
        pending={submitMutation.isPending}
        errorMessage={mutationError}
        onCancel={handleCancel}
        onSubmit={value => submitMutation.mutate(value)}
      />
    </Page>
  )
}
