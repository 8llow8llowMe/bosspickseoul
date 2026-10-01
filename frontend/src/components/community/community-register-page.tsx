'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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
  toAnalysisAttachment,
  type ComparisonDraftParams,
  type ComparisonDraftRequest,
} from '@/lib/community/comparison-draft-url'
import {
  COMMUNITY_CURSOR_START,
  communityKeys,
  getCommunityLoginHref,
  isCommunityMockEnabled,
  parseCommunityPostId,
  type CommunityViewer,
} from '@/lib/community/community-state'
import {
  applyCommunityStoredDraft,
  getBrowserLocalStorage,
  getCommunityDraftStorageKey,
  readCommunityStoredDraft,
  removeCommunityStoredDraft,
  type CommunityStoredDraft,
} from '@/lib/community/editor-draft'
import {
  parseCommunityEditorPrefill,
  resolveCommunityCreateLocation,
  toCommunityLocationValue,
} from '@/lib/community/editor-prefill'
import { sortPostImages, toImageKeys } from '@/lib/community/post-images'
import { useAuthStore } from '@/stores/auth-store'
import type {
  CommunityAnalysisAttachment,
  CommunityComparisonDraft,
  CommunityId,
  CommunityPostCreateRequest,
  CommunityPostDetailResponse,
  CommunityPostUpdateRequest,
} from '@/types/community'
import { centeredColumn } from '@/styles/layout'

const MOBILE = '@media (max-width: 479px)'

/* 불러오는 중·오류·복원 카드 — 폼과 같은 `--w-form` 중앙 컬럼. */
const Page = styled.main`
  ${centeredColumn('var(--w-form)')}
  padding: 40px 0 72px;
  display: grid;
  gap: 24px;

  ${MOBILE} {
    padding: 24px 0 48px;
  }
`

/*
  폼 — 폼 열(`--w-form`) + ≥1080 작성 팁(280)이 `--w-wide` 안에 놓인다. `<480` 은 편집 바가
  사이트 헤더에 바로 붙도록 위 여백이 없다. 아래는 고정 액션 바(≥480)가 끝에 닿게 둔다.
*/
const EditorPage = styled.main`
  ${centeredColumn('var(--w-wide)')}
  padding: 32px 0 32px;

  ${MOBILE} {
    padding: 0 0 calc(48px + env(safe-area-inset-bottom, 0px));
  }
`

const RestoreCard = styled.section`
  display: grid;
  gap: 16px;
  padding: 24px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);

  h1 {
    color: var(--color-text-900);
    font-size: 20px;
    font-weight: 700;
    line-height: 1.4;
  }

  p {
    min-width: 0;
    overflow: hidden;
    color: var(--color-text-600);
    font-size: 14px;
    line-height: 1.6;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const RestoreActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;

  ${MOBILE} {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
`

const RestoreButton = styled.button<{ $primary?: boolean }>`
  min-height: 48px;
  padding: 0 20px;
  border: 0;
  border-radius: var(--radius-control);
  background: ${props =>
    props.$primary ? 'var(--color-primary-700)' : 'var(--color-grey-100)'};
  color: ${props =>
    props.$primary ? 'var(--color-surface)' : 'var(--color-text-900)'};
  font: inherit;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
`

const Notice = styled.p`
  padding: 12px 16px;
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
  'waiting' | 'redirect' | 'allowed' | 'forbidden'

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

export type CommunityDraftRestoreKind = 'fresh' | 'resume'

/**
 * 폼 key. 백그라운드 refetch 로는 바뀌지 않는다(바뀌면 친 글자가 날아간다). 복원 선택은 폼을
 * 띄우기 **전에** 끝나므로 key 에 실어도 재마운트가 일어나지 않는다 — 실어 두는 이유는 같은 자리에서
 * 선택이 달라지면(새로 쓰기 ↔ 이어 쓰기) 이전 폼 상태가 이어지지 않게 하려는 것이다.
 */
export const getCommunityEditorFormKey = (
  mode: CommunityEditorMode,
  postId: CommunityId | null,
  restore: CommunityDraftRestoreKind | null = null,
) => {
  const base = mode === 'edit' && postId ? `edit-${postId}` : 'create'
  return restore ? `${base}:${restore}` : base
}

/** 복원 카드에 보일 한 줄 — 제목, 없으면 본문 첫 줄. 어떤 글이었는지 알아야 고를 수 있다. */
export const getCommunityStoredDraftPreview = (draft: CommunityStoredDraft) =>
  draft.title.trim() ||
  draft.content
    .split('\n')
    .map(line => line.trim())
    .find(Boolean) ||
  ''

type CommunityDraftRestorePromptProps = {
  draft: CommunityStoredDraft
  onFresh: () => void
  onResume: () => void
}

/**
 * 복원 게이트(CM-034). 폼은 마운트 시점 값만 읽으므로(`initialValue`) 폼을 띄우기 **전에**
 * 고르게 한다 — 뒤늦게 덮어쓰면 그 사이 친 글자가 사라진다.
 */
export function CommunityDraftRestorePrompt({
  draft,
  onFresh,
  onResume,
}: CommunityDraftRestorePromptProps) {
  const preview = getCommunityStoredDraftPreview(draft)

  return (
    <RestoreCard aria-labelledby="community-draft-restore-title">
      <h1 id="community-draft-restore-title">작성하던 글이 있어요</h1>
      {preview ? <p>{preview}</p> : null}
      <RestoreActions>
        <RestoreButton onClick={onFresh} type="button">
          새로 쓰기
        </RestoreButton>
        <RestoreButton $primary onClick={onResume} type="button">
          이어 쓰기
        </RestoreButton>
      </RestoreActions>
    </RestoreCard>
  )
}

/**
 * @param attachment 초안에서 온 분석 첨부. **작성에만 싣는다.**
 *
 * 수정에 싣지 않는 이유: 백엔드가 분석 컬럼을 부분 갱신 대상에서 빼 두어 **보내지
 * 않으면 보존된다.** 이미지(`imageKeys`)와 정반대 규칙이다 — 그쪽은 빼면 지워진다.
 * 폼 값(`CommunityEditorValue`)에 넣지 않은 것도 같은 맥락이다. 사용자가 고치는 값이
 * 아니라 초안이 준 값을 되돌려 보내는 것뿐이다.
 */
export const createCommunityEditorPayload = (
  mode: CommunityEditorMode,
  value: CommunityEditorValue,
  attachment: CommunityAnalysisAttachment | null = null,
): CommunityPostCreateRequest | CommunityPostUpdateRequest => {
  const content = {
    title: value.title,
    content: value.content,
    /*
     * ⚠️ **두 모드 모두 반드시 싣는다.**
     *
     * 수정에서 `imageKeys` 는 「수정 후 남길 목록」이고, 백엔드
     * `CommunityPostImageProcessor.normalize(null)` 이 **빈 목록**을 돌려준다. 즉 이
     * 필드를 빼고 보내는 것과 `[]` 를 보내는 것이 같은 뜻이다 — 둘 다 기존 이미지를
     * 연결 해제하고 **파일까지 지운다.** 제목 한 글자만 고쳐도 그렇다.
     *
     * 그래서 폼이 기존 이미지를 담은 채 시작하고(`initialValue.images`) 그것을 여기서
     * 그대로 되돌려 보낸다.
     */
    imageKeys: toImageKeys(value.images),
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
    /*
     * `null` 인 필드는 키째 빼고 보낸다. 백엔드가 선택 입력으로 받으므로 `null` 을
     * 실어도 되지만, 첨부 없는 평범한 글의 요청 본문에 빈 키 넷이 붙는 것은 계약을
     * 읽는 사람에게 "쓰이는 값"으로 보인다.
     */
    ...(attachment
      ? {
          analysisType: attachment.analysisType,
          ...(attachment.analysisRefCode
            ? { analysisRefCode: attachment.analysisRefCode }
            : {}),
          ...(attachment.analysisRefName
            ? { analysisRefName: attachment.analysisRefName }
            : {}),
          ...(attachment.analysisSnapshotKey
            ? { analysisSnapshotKey: attachment.analysisSnapshotKey }
            : {}),
        }
      : {}),
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
  /*
   * 비교 초안으로 들어오면(성공·실패 모두) 임시 저장을 묻지도 쓰지도 않는다. 초안이 이기고,
   * 초안 글을 `community-draft:new` 에 쓰면 사용자가 따로 쓰던 저장본을 덮는다.
   */
  const storageKey =
    draftRequest.kind === 'none'
      ? getCommunityDraftStorageKey(mode, postId)
      : null
  const prefill =
    mode === 'create' ? parseCommunityEditorPrefill(searchParams) : null
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
  /* 등록·수정 성공 — 이동이 끝날 때까지 임시 저장·이탈 확인을 멈춘다. */
  const [submitted, setSubmitted] = useState(false)
  /*
   * 저장본은 한 번만 읽고 묶어 둔다. 폼이 뜬 뒤 임시 저장이 쓰는 값을 다시 읽으면 쓰던 중에
   * 복원 카드가 튀어나온다. 렌더 중에 storage 를 읽지 않는다(서버 렌더와 어긋난다).
   */
  const [storedCheck, setStoredCheck] = useState<{
    key: string
    draft: CommunityStoredDraft | null
  } | null>(null)
  const [restoreChoice, setRestoreChoice] = useState<{
    key: string
    kind: CommunityDraftRestoreKind
    draft: CommunityStoredDraft | null
  } | null>(null)

  // 그리기 전에 읽는다 — 앱 안 이동으로 들어올 때 「확인 중」이 한 프레임 비치지 않게.
  useLayoutEffect(() => {
    if (!storageKey) {
      return
    }

    const check = (key: string) => {
      setStoredCheck({
        key,
        draft: readCommunityStoredDraft(getBrowserLocalStorage, key),
      })
    }

    check(storageKey)
  }, [storageKey])

  const storedDraft =
    storageKey && storedCheck?.key === storageKey ? storedCheck.draft : null
  const storedChecked = !storageKey || storedCheck?.key === storageKey
  const restore = restoreChoice?.key === storageKey ? restoreChoice : null
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
      /*
        분석 첨부는 초안에서 온다. 초안 없이 들어온 평범한 글은 `null` 이라 요청에
        아무 필드도 붙지 않는다.
      */
      const payload = createCommunityEditorPayload(
        mode,
        value,
        toAnalysisAttachment(draft),
      )
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
      /*
       * 성공 표시를 **먼저** 켠다. 이 콜백이 끝날 때까지 mutation 은 pending 이라 임시 저장
       * 타이머가 잡힐 틈이 없고, pending 이 풀리는 렌더에는 이미 submitted 가 켜져 있다
       * (useCommunityDraftAutosave). 그다음 저장본을 지운다(CM-035).
       */
      setSubmitted(true)
      if (storageKey) {
        removeCommunityStoredDraft(getBrowserLocalStorage, storageKey)
      }
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

  if (!storedChecked) {
    return (
      <Page>
        <CommunityFeedback
          kind="loading"
          title="작성하던 글을 확인하고 있어요"
        />
      </Page>
    )
  }

  const baseValue: CommunityEditorValue =
    mode === 'edit' && detail
      ? {
          title: detail.title,
          content: detail.content,
          // 기존 첨부를 그대로 들고 시작한다 — 안 그러면 저장 순간 전부 삭제된다.
          images: sortPostImages(detail.images),
          location: toCommunityLocationValue(detail),
        }
      : {
          title: draft?.title ?? '',
          content: draft?.content ?? '',
          images: [],
          // 비교 초안의 행정동 > 목록·상세에서 넘어온 지역 > 빈 칩.
          location: resolveCommunityCreateLocation(
            draft ? toCommunityLocationValue(draft) : null,
            prefill,
          ),
        }

  if (storageKey && storedDraft && !restore) {
    return (
      <Page>
        <CommunityDraftRestorePrompt
          draft={storedDraft}
          onFresh={() => {
            removeCommunityStoredDraft(getBrowserLocalStorage, storageKey)
            setRestoreChoice({ key: storageKey, kind: 'fresh', draft: null })
          }}
          onResume={() => {
            setRestoreChoice({
              key: storageKey,
              kind: 'resume',
              draft: storedDraft,
            })
          }}
        />
      </Page>
    )
  }

  const initialValue =
    restore?.kind === 'resume' && restore.draft
      ? applyCommunityStoredDraft(mode, baseValue, restore.draft)
      : baseValue

  return (
    <EditorPage>
      <CommunityEditorForm
        key={getCommunityEditorFormKey(mode, postId, restore?.kind ?? null)}
        mode={mode}
        initialValue={initialValue}
        pristineValue={baseValue}
        mockEnabled={mockEnabled}
        pending={submitMutation.isPending}
        submitted={submitted}
        draftStorageKey={storageKey}
        errorMessage={mutationError}
        notice={
          draftView.kind === 'failed' ? (
            <Notice role="status">{COMPARISON_DRAFT_ERROR_NOTICE}</Notice>
          ) : null
        }
        onUploadImages={async files => {
          /*
           * 업로드는 게시글 저장과 **별개 단계**다. 여기서는 키만 받고, 그 키가
           * 저장 시 `imageKeys` 로 실려야 실제로 연결된다. 목 소스도 같은 자리를
           * 쓰므로 `?mock=1` 글쓰기가 실제 스토리지를 건드리지 않는다.
           */
          const uploaded = await source.uploadPostImages(files)
          return uploaded.map((image, index) => ({
            ...image,
            sortOrder: index,
          }))
        }}
        onCancel={handleCancel}
        onSubmit={value => submitMutation.mutate(value)}
      />
    </EditorPage>
  )
}
