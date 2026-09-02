import { createElement, type ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import type { CommunityPostDetailResponse } from '@/types/community'
import { communityKeys } from '@/lib/community/community-state'

import CommunityEditorForm, {
  resolveCommunityEditorSubmission,
} from './community-editor-form'
import {
  CommunityEditorQueryError,
  communityEditorKeys,
  createCommunityEditorDetailHref,
  createCommunityEditorPayload,
  getCommunityEditorAccess,
  getCommunityEditorFormKey,
  getCommunityEditorViewer,
  isCommunityEditorUnauthorizedError,
  parseCommunityEditorPostId,
  recoverCommunityEditorUnauthorized,
  shouldRetryCommunityEditorQuery,
  startCommunityEditorUnauthorizedRecovery,
  validateCommunityEditorDetailResponse,
} from './community-register-page'

const renderWithQuery = (props: ComponentProps<typeof CommunityEditorForm>) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(CommunityEditorForm, props),
    ),
  )
}

const baseProps: ComponentProps<typeof CommunityEditorForm> = {
  mode: 'create',
  initialValue: { title: '', content: '', location: {}, images: [] },
  mockEnabled: true,
  pending: false,
  errorMessage: null,
  onCancel: vi.fn(),
  onUploadImages: vi.fn(async () => []),
  onSubmit: vi.fn(),
}

describe('CommunityEditorForm', () => {
  it('renders required location, title/content limits, and counts', () => {
    const markup = renderWithQuery(baseProps)

    expect(markup).toContain('지역·상권 (필수)')
    expect(markup).toContain('게시글을 작성하려면 지역을 선택해 주세요.')
    expect(markup).toContain('maxLength="120"')
    expect(markup).toContain('maxLength="5000"')
    expect(markup).toContain('0 / 120')
    expect(markup).toContain('0 / 5,000')
  })

  /*
   * 이 자리는 「이미지 첨부 · 준비 중」 비활성 버튼이었다. A4 에서 실제로 붙었으므로
   * 막아야 할 것을 다시 적는다: 자리표시자 문구가 남지 않을 것, 버튼이 실제로 열려
   * 있을 것, 그리고 허용 형식·장수를 화면이 말할 것.
   */
  it('첨부 자리가 더 이상 자리표시자가 아니다', () => {
    const markup = renderWithQuery(baseProps)

    expect(markup).not.toContain('준비 중')
    expect(markup).toContain('이미지 첨부')
    expect(markup).toContain('0 / 5')
    expect(markup).toContain('image/jpeg,image/png,image/gif,image/webp')
    // 첨부 버튼이 비활성이 아니다(0장이므로 아직 올릴 수 있다).
    expect(markup).not.toMatch(/<button[^>]*disabled[^>]*>이미지 첨부/)
  })

  it('5장을 다 채우면 첨부 버튼을 닫는다', () => {
    const markup = renderWithQuery({
      ...baseProps,
      initialValue: {
        ...baseProps.initialValue,
        images: Array.from({ length: 5 }, (_, index) => ({
          imageKey: `community/posts/1/2026/09/${index}.png`,
          imageUrl: `https://minio.test/${index}.png`,
          sortOrder: index,
        })),
      },
    })

    expect(markup).toContain('5 / 5')
    expect(markup).toMatch(/<button[^>]*disabled[^>]*>이미지 첨부/)
  })

  /**
   * **수정 화면은 기존 첨부를 담은 채 시작해야 한다.** 빈 배열로 시작하면 사용자가
   * 사진을 건드리지 않아도 저장 순간 전부 삭제된다 — 백엔드가 `imageKeys` 를
   * 「남길 목록」으로 읽고 여기 없는 것을 파일까지 지우기 때문이다.
   */
  it('수정 모드는 기존 첨부를 미리 보여 준다', () => {
    const markup = renderWithQuery({
      ...baseProps,
      mode: 'edit',
      initialValue: {
        ...baseProps.initialValue,
        images: [
          {
            imageKey: 'community/posts/1/2026/09/a.png',
            imageUrl: 'https://minio.test/a.png',
            sortOrder: 0,
          },
        ],
      },
    })

    expect(markup).toContain('https://minio.test/a.png')
    expect(markup).toContain('1 / 5')
    expect(markup).toContain('첨부 이미지 1 빼기')
  })

  it('shows the existing target read-only in edit mode', () => {
    const markup = renderWithQuery({
      ...baseProps,
      mode: 'edit',
      initialValue: {
        title: '제목',
        content: '본문',
        images: [],
        location: {
          targetType: 'COMMERCIAL',
          targetCode: '3110008',
          targetName: '강남역 상권',
        },
      },
      mockEnabled: false,
    })

    expect(markup).toContain('강남역 상권')
    expect(markup).toContain('지역은 수정할 수 없어요')
  })

  it('disables every submission path while pending and keeps draft input with the mutation error', () => {
    const markup = renderWithQuery({
      ...baseProps,
      initialValue: {
        title: '저장 전 제목',
        content: '저장 전 본문',
        location: {},
        images: [],
      },
      pending: true,
      errorMessage: '저장하지 못했어요.',
    })

    expect(markup).toContain('aria-busy="true"')
    expect(markup).toContain('저장하지 못했어요.')
    expect(markup).toContain('value="저장 전 제목"')
    expect(markup).toContain('저장 전 본문')
    expect(markup).toContain('저장 중')
  })
})

describe('community editor helpers', () => {
  it('trims valid input and rejects missing create fields', () => {
    expect(
      resolveCommunityEditorSubmission('create', '  제목  ', '  본문  ', {
        targetType: 'DISTRICT',
        targetCode: '11680',
        targetName: '강남구',
      }),
    ).toEqual({
      error: null,
      value: {
        title: '제목',
        content: '본문',
        location: {
          targetType: 'DISTRICT',
          targetCode: '11680',
          targetName: '강남구',
        },
        images: [],
      },
    })
    expect(
      resolveCommunityEditorSubmission('create', '  ', '본문', {}).error,
    ).toBe('제목을 입력해 주세요.')
    expect(
      resolveCommunityEditorSubmission('create', '제목', '  ', {}).error,
    ).toBe('내용을 입력해 주세요.')
    expect(
      resolveCommunityEditorSubmission('create', '제목', '본문', {}),
    ).toEqual({
      error: '지역을 선택해 주세요.',
      value: null,
    })
    expect(
      resolveCommunityEditorSubmission('edit', '제목', '본문', {}),
    ).toEqual({
      error: null,
      value: {
        title: '제목',
        content: '본문',
        location: {},
        images: [],
      },
    })
  })

  /**
   * 넘겨받은 첨부를 **그대로** 되돌려 준다. 여기서 흘리면 저장 시 `imageKeys` 가
   * 비고, 백엔드가 그것을 「전부 지워라」로 읽는다.
   */
  it('첨부 목록을 그대로 실어 보낸다', () => {
    const images = [
      {
        imageKey: 'community/posts/1/2026/09/a.png',
        imageUrl: 'https://minio.test/a.png',
        sortOrder: 0,
      },
    ]

    expect(
      resolveCommunityEditorSubmission('edit', '제목', '본문', {}, images).value
        ?.images,
    ).toEqual(images)
  })

  it('accepts only a positive integer postId for edit mode', () => {
    expect(parseCommunityEditorPostId('7')).toBe('7')
    expect(parseCommunityEditorPostId('7.5')).toBeNull()
    expect(parseCommunityEditorPostId('0')).toBeNull()
    expect(parseCommunityEditorPostId('-1')).toBeNull()
    expect(parseCommunityEditorPostId('abc')).toBeNull()
    expect(parseCommunityEditorPostId(null)).toBeNull()
  })

  it('requires a target in create payload and excludes it while editing', () => {
    const draft = {
      title: '제목',
      content: '본문',
      images: [],
      location: {
        targetType: 'COMMERCIAL' as const,
        targetCode: '3110008',
        targetName: '강남역 상권',
      },
    }

    expect(createCommunityEditorPayload('create', draft)).toEqual({
      title: '제목',
      content: '본문',
      targetType: 'COMMERCIAL',
      targetCode: '3110008',
      imageKeys: [],
    })
    expect(createCommunityEditorPayload('edit', draft)).toEqual({
      title: '제목',
      content: '본문',
      imageKeys: [],
    })
    expect(() =>
      createCommunityEditorPayload('create', {
        ...draft,
        location: {},
      }),
    ).toThrow('지역을 선택해 주세요.')
  })

  it('preserves explicit mock mode in the successful detail destination', () => {
    expect(createCommunityEditorDetailHref('8', true)).toBe(
      '/community/8?mock=1',
    )
    expect(createCommunityEditorDetailHref('8', false)).toBe('/community/8')
  })

  it('rejects a success=false edit response so the retry UI can render', () => {
    const response = {
      dataHeader: {
        success: false,
        resultCode: 'FAILED',
        resultMessage: '게시글을 불러오지 못했어요.',
      },
      dataBody: {} as CommunityPostDetailResponse['dataBody'],
    } satisfies CommunityPostDetailResponse

    expect(() => validateCommunityEditorDetailResponse(response)).toThrow(
      CommunityEditorQueryError,
    )
    expect(() => validateCommunityEditorDetailResponse(response)).toThrow(
      '게시글을 불러오지 못했어요.',
    )
  })

  it('waits for real auth hydration, redirects guests, and allows only the edit owner', () => {
    expect(
      getCommunityEditorAccess({
        mockEnabled: false,
        hasHydrated: false,
        isLoggedIn: false,
        viewerMemberId: null,
        editMemberId: null,
      }),
    ).toBe('waiting')
    expect(
      getCommunityEditorAccess({
        mockEnabled: false,
        hasHydrated: true,
        isLoggedIn: false,
        viewerMemberId: null,
        editMemberId: null,
      }),
    ).toBe('redirect')
    expect(
      getCommunityEditorAccess({
        mockEnabled: false,
        hasHydrated: true,
        isLoggedIn: true,
        viewerMemberId: '20',
        editMemberId: '21',
      }),
    ).toBe('forbidden')
    expect(
      getCommunityEditorAccess({
        mockEnabled: false,
        hasHydrated: true,
        isLoggedIn: true,
        viewerMemberId: '21',
        editMemberId: '21',
      }),
    ).toBe('allowed')
  })

  it('uses the fixed mock owner and never treats mock mode as a real guest', () => {
    expect(
      getCommunityEditorViewer({
        mockEnabled: true,
        hasHydrated: false,
        isLoggedIn: false,
        memberId: null,
      }),
    ).toEqual({ authenticated: true, memberId: '9001' })
    expect(
      getCommunityEditorAccess({
        mockEnabled: true,
        hasHydrated: false,
        isLoggedIn: false,
        viewerMemberId: '9001',
        editMemberId: '9001',
      }),
    ).toBe('allowed')
  })

  it('isolates the edit query from public detail cache and forces a fresh editor fetch', async () => {
    const queryClient = new QueryClient()
    const publicKey = communityKeys.detail('1', false)
    const editorKey = communityEditorKeys.edit('1', false)
    const stale = {
      dataHeader: {
        success: true,
        resultCode: null,
        resultMessage: null,
      },
      dataBody: {
        postId: '1',
        memberId: '9001',
        targetType: null,
        targetCode: null,
        targetName: null,
        title: '공개 상세 캐시 제목',
        content: '공개 상세 캐시 본문',
        likeCount: 0,
        commentCount: 0,
        viewCount: 0,
        createdAt: '2026-07-27T00:00:00.000Z',
        updatedAt: '2026-07-27T00:00:00.000Z',
        images: [],
      },
    } satisfies CommunityPostDetailResponse
    const fresh = {
      ...stale,
      dataBody: {
        ...stale.dataBody,
        title: '수정 전용 최신 제목',
        content: '수정 전용 최신 본문',
      },
    }
    const fetchFresh = vi.fn(async () => fresh)

    queryClient.setQueryData(publicKey, stale)
    queryClient.setQueryData(editorKey, stale)
    const result = await queryClient.fetchQuery({
      queryKey: editorKey,
      queryFn: fetchFresh,
      staleTime: 0,
    })

    expect(editorKey).not.toEqual(publicKey)
    expect(fetchFresh).toHaveBeenCalledOnce()
    expect(result).toBe(fresh)
    expect(queryClient.getQueryData(publicKey)).toBe(stale)
  })

  it('keeps a stable form initialization key across background edit refetches', () => {
    const before = getCommunityEditorFormKey('edit', '8')
    const after = getCommunityEditorFormKey('edit', '8')

    expect(before).toBe('edit-8')
    expect(after).toBe(before)
    expect(getCommunityEditorFormKey('create', null)).toBe('create')
  })

  it('does not retry 401 and retries only bounded non-auth failures', () => {
    const unauthorized = {
      isAxiosError: true,
      response: { status: 401 },
    }

    expect(isCommunityEditorUnauthorizedError(unauthorized)).toBe(true)
    expect(shouldRetryCommunityEditorQuery(0, unauthorized)).toBe(false)
    expect(shouldRetryCommunityEditorQuery(0, new Error('offline'))).toBe(true)
    expect(shouldRetryCommunityEditorQuery(2, new Error('offline'))).toBe(false)
  })

  it('removes only exact editor queries before clearing a 401 session and redirecting', async () => {
    const queryClient = new QueryClient()
    const editorKey = communityEditorKeys.edit('1', false)
    const otherEditorKey = communityEditorKeys.edit('2', false)
    const publicKey = communityKeys.detail('1', false)
    const cached = { value: 'cached' }
    const clearSession = vi.fn()
    const navigate = vi.fn()
    const cancelSpy = vi.spyOn(queryClient, 'cancelQueries')
    const removeSpy = vi.spyOn(queryClient, 'removeQueries')

    queryClient.setQueryData(editorKey, cached)
    queryClient.setQueryData(otherEditorKey, cached)
    queryClient.setQueryData(publicKey, cached)

    await recoverCommunityEditorUnauthorized({
      queryClient,
      queryKeys: [editorKey],
      clearSession,
      navigate,
      currentHref: '/community/register?postId=1',
    })

    expect(cancelSpy).toHaveBeenCalledWith({
      queryKey: editorKey,
      exact: true,
    })
    expect(removeSpy).toHaveBeenCalledWith({
      queryKey: editorKey,
      exact: true,
    })
    expect(queryClient.getQueryData(editorKey)).toBeUndefined()
    expect(queryClient.getQueryData(otherEditorKey)).toBe(cached)
    expect(queryClient.getQueryData(publicKey)).toBe(cached)
    expect(clearSession).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledWith(
      '/login?redirect=%2Fcommunity%2Fregister%3FpostId%3D1',
    )
  })

  it('deduplicates concurrent editor 401 recovery and resets afterward', async () => {
    let resolveRecovery!: () => void
    const recover = vi.fn(
      () =>
        new Promise<void>(resolve => {
          resolveRecovery = resolve
        }),
    )
    const recoveryRef: { current: Promise<void> | null } = { current: null }

    const first = startCommunityEditorUnauthorizedRecovery(recoveryRef, recover)
    const second = startCommunityEditorUnauthorizedRecovery(
      recoveryRef,
      recover,
    )

    expect(recover).toHaveBeenCalledOnce()
    expect(second).toBe(first)
    resolveRecovery()
    await first
    expect(recoveryRef.current).toBeNull()
  })
})
