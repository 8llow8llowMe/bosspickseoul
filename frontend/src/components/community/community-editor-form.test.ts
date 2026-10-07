import { createElement, type ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it, vi } from 'vitest'

import type { CommunityPostDetailResponse } from '@/types/community'
import { communityKeys } from '@/lib/community/community-state'
import { POST_IMAGE_RULE_TEXT } from '@/lib/community/post-images'

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
  const sheet = new ServerStyleSheet()

  try {
    const markup = renderToStaticMarkup(
      sheet.collectStyles(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(CommunityEditorForm, props),
        ),
      ),
    )
    return { markup, styles: sheet.getStyleTags() }
  } finally {
    sheet.seal()
  }
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

const imagesOf = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    imageKey: `community/posts/1/2026/09/${index}.png`,
    imageUrl: `https://minio.test/${index}.png`,
    sortOrder: index,
  }))

/* 버튼 하나의 여는 태그 — 속성 순서와 상관없이 그 버튼의 disabled 를 본다. */
const openingTagOf = (markup: string, text: string) =>
  markup.match(
    new RegExp(`<button[^>]*>(?:(?!</button>)[\\s\\S])*?${text}`),
  )?.[0] ?? ''

describe('CommunityEditorForm — 머리와 순서(개편 3단계)', () => {
  it('안내 세 줄 대신 제목 한 줄, <480 편집 바 [✕] 새 글 [등록] 과 ≥480 액션 바 [취소] [등록하기]', () => {
    const { markup } = renderWithQuery(baseProps)

    expect(markup).not.toContain('사장님들과 나누고 싶은 이야기')
    expect(markup).not.toContain('지역·상권 (필수)')
    expect(markup.match(/<h1[^>]*>새 글<\/h1>/g)).toHaveLength(2)
    expect(markup).toContain('data-community-editor-bar="true"')
    expect(markup).toMatch(/<button[^>]*aria-label="닫기"[^>]*type="button"/)
    expect(markup).toMatch(/<button[^>]*type="submit"[^>]*>등록<\/button>/)
    expect(markup).toMatch(/<button[^>]*type="submit"[^>]*>등록하기<\/button>/)
    expect(markup).toMatch(/<button[^>]*type="button"[^>]*>취소<\/button>/)
  })

  it('지역 칩 → 제목 → 본문 → 사진 순서이고, 빈 칩은 「어느 지역 이야기인가요?」다', () => {
    const { markup } = renderWithQuery(baseProps)
    const order = [
      'data-region-chip="compose"',
      'placeholder="제목을 입력해 주세요"',
      '<textarea',
      'data-community-photo-row="true"',
    ].map(token => markup.indexOf(token))

    expect(order.every(index => index >= 0)).toBe(true)
    expect([...order].sort((left, right) => left - right)).toEqual(order)
    expect(markup).toContain('어느 지역 이야기인가요?')
    // 글쓰기 칩에는 해제 버튼이 없다 — 대상이 필수다.
    expect(markup).not.toContain('지역 필터 해제')
  })

  it('제목·본문 한도와 글자 수를 적는다', () => {
    const { markup } = renderWithQuery(baseProps)

    expect(markup).toContain('maxLength="120"')
    expect(markup).toContain('maxLength="5000"')
    expect(markup).toContain('0 / 120')
    expect(markup).toContain('0 / 5,000')
    expect(markup).toMatch(/<label[^>]*>제목<\/label>/)
    expect(markup).toMatch(/<label[^>]*>내용<\/label>/)
  })

  it('목록·상세에서 넘어온 지역이 칩에 채워져 있다(CM-031)', () => {
    const { markup } = renderWithQuery({
      ...baseProps,
      initialValue: {
        ...baseProps.initialValue,
        location: {
          targetType: 'DISTRICT',
          targetCode: '11200',
          targetName: '성동구',
        },
      },
    })

    expect(markup).toContain('성동구')
    expect(markup).not.toContain('어느 지역 이야기인가요?')
  })

  it('등록 버튼은 필수값이 비어도 비활성이 아니다 — 누르면 무엇이 비었는지 알려 준다', () => {
    const { markup } = renderWithQuery(baseProps)

    expect(openingTagOf(markup, '등록하기')).not.toContain('disabled')
    expect(openingTagOf(markup, '등록</button>')).not.toContain('disabled')
  })
})

describe('CommunityEditorForm — 작성 도움 칩·글자 수', () => {
  it('본문이 비었을 때만 도움 칩 셋을 본문 위에 둔다(CM-033)', () => {
    const empty = renderWithQuery(baseProps).markup
    const filled = renderWithQuery({
      ...baseProps,
      initialValue: { ...baseProps.initialValue, content: '이미 쓴 글' },
    }).markup

    expect(empty).toMatch(
      /role="group"[^>]*aria-label="작성 도움"|aria-label="작성 도움"[^>]*role="group"/,
    )
    for (const label of ['질문해요', '경험 나눠요', '같이 해요']) {
      expect(empty).toContain(`>${label}</button>`)
      expect(filled).not.toContain(`>${label}</button>`)
    }
    expect(empty.indexOf('질문해요')).toBeLessThan(empty.indexOf('<textarea'))
  })

  it('본문 글자 수는 한도 90% 를 넘으면 --color-negative-text 다', () => {
    const near = renderWithQuery({
      ...baseProps,
      initialValue: { ...baseProps.initialValue, content: '가'.repeat(4501) },
    })
    const below = renderWithQuery({
      ...baseProps,
      initialValue: { ...baseProps.initialValue, content: '가'.repeat(4500) },
    })

    expect(near.markup).toContain('4,501 / 5,000')
    expect(near.markup).toMatch(/data-near-limit="true"[^>]*>4,501/)
    expect(near.styles).toContain('color:var(--color-negative-text)')
    expect(below.markup).not.toContain('data-near-limit="true"')
  })
})

describe('CommunityEditorForm — 사진 줄', () => {
  /*
   * 이 자리는 「이미지 첨부 · 준비 중」 비활성 버튼이었다. 막아야 할 것: 자리표시자 문구가
   * 남지 않을 것, 올릴 입구가 열려 있을 것, 허용 형식·장수를 화면이 말할 것.
   */
  it('첨부 자리는 자리표시자가 아니다 — 0장이면 + 타일 하나와 규칙 문구', () => {
    const { markup } = renderWithQuery(baseProps)

    expect(markup).not.toContain('준비 중')
    expect(markup).toContain('0 / 5')
    expect(markup).toContain('image/jpeg,image/png,image/gif,image/webp')
    expect(markup).toContain(POST_IMAGE_RULE_TEXT)
    expect(markup).toMatch(/<button[^>]*aria-label="사진 추가"/)
    expect(markup).not.toMatch(/aria-label="사진 추가"[^>]*disabled/)
    expect(markup).not.toContain('대표')
  })

  it('첫 장에만 대표 배지, 장마다 빼기 버튼, 5장 미만이면 끝에 + 타일', () => {
    const { markup } = renderWithQuery({
      ...baseProps,
      initialValue: { ...baseProps.initialValue, images: imagesOf(2) },
    })

    expect(markup.match(/data-community-cover-badge="true"/g)).toHaveLength(1)
    expect(markup.indexOf('>대표<')).toBeGreaterThan(
      markup.indexOf('src="https://minio.test/0.png"'),
    )
    expect(markup.indexOf('>대표<')).toBeLessThan(
      markup.indexOf('src="https://minio.test/1.png"'),
    )
    expect(markup).toContain('aria-label="첨부 이미지 1 빼기"')
    expect(markup).toContain('aria-label="첨부 이미지 2 빼기"')
    expect(markup).toContain('2 / 5')
    expect(markup.lastIndexOf('사진 추가')).toBeGreaterThan(
      markup.indexOf('src="https://minio.test/1.png"'),
    )
  })

  it('5장을 다 채우면 + 타일이 사라지고 파일 입력도 닫힌다', () => {
    const { markup } = renderWithQuery({
      ...baseProps,
      initialValue: { ...baseProps.initialValue, images: imagesOf(5) },
    })

    expect(markup).toContain('5 / 5')
    expect(markup).not.toContain('사진 추가')
    expect(markup).toMatch(
      /<input[^>]*type="file"[^>]*disabled=""|<input[^>]*disabled=""[^>]*type="file"/,
    )
  })

  it('빼기 버튼은 44 터치 영역이다', () => {
    const { styles } = renderWithQuery({
      ...baseProps,
      initialValue: { ...baseProps.initialValue, images: imagesOf(1) },
    })

    expect(styles).toMatch(/width:44px;height:44px/)
    expect(styles).toContain('width:72px;height:72px')
  })

  /**
   * **수정 화면은 기존 첨부를 담은 채 시작해야 한다.** 빈 배열로 시작하면 사용자가
   * 사진을 건드리지 않아도 저장 순간 전부 삭제된다 — 백엔드가 `imageKeys` 를
   * 「남길 목록」으로 읽고 여기 없는 것을 파일까지 지우기 때문이다.
   */
  it('수정 모드는 기존 첨부를 미리 보여 준다', () => {
    const { markup } = renderWithQuery({
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
})

describe('CommunityEditorForm — 수정 모드·저장 중·스타일', () => {
  it('수정 모드는 「글 수정」 이고 지역은 읽기 전용이다(시트를 여는 칩이 없다)', () => {
    const { markup } = renderWithQuery({
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
    expect(markup).not.toContain('aria-haspopup="dialog"')
    expect(markup.match(/<h1[^>]*>글 수정<\/h1>/g)).toHaveLength(2)
    expect(markup).toMatch(/type="submit"[^>]*>수정하기<\/button>/)
  })

  it('disables every submission path while pending and keeps draft input with the mutation error', () => {
    const { markup } = renderWithQuery({
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
    expect(markup.match(/type="submit"[^>]*>저장 중<\/button>/g)).toHaveLength(
      2,
    )
    expect(markup.match(/disabled=""[^>]*type="submit"/g)).toHaveLength(2)
  })

  it('머리 아래 안내(비교 초안 실패)를 그대로 싣는다', () => {
    const { markup } = renderWithQuery({
      ...baseProps,
      notice: createElement('p', { role: 'status' }, '초안 안내'),
    })

    expect(markup).toContain('<p role="status">초안 안내</p>')
  })

  it('레거시 폭·글로우 포커스·primary-700 글자를 쓰지 않고, 작성 팁은 ≥1080 에서만 보인다', () => {
    const { markup, styles } = renderWithQuery(baseProps)

    expect(styles).not.toMatch(/(max|min)-width:\s*(640|760|768)px/)
    expect(styles).not.toContain('--shadow-focus-primary')
    expect(styles).not.toMatch(/[^-]color:var\(--color-primary-700\)/)
    expect(styles).toContain('var(--w-form)')
    expect(styles).toMatch(/@media \(min-width:\s*1080px\)/)
    expect(styles).toContain('env(safe-area-inset-bottom, 0px)')
    expect(styles).toContain('field-sizing:content')
    expect(markup).toContain('이렇게 쓰면 답이 잘 달려요')
  })
})

describe('community editor helpers', () => {
  it('trims valid input and points at the first missing field (지역 → 제목 → 본문)', () => {
    expect(
      resolveCommunityEditorSubmission('create', '  제목  ', '  본문  ', {
        targetType: 'DISTRICT',
        targetCode: '11680',
        targetName: '강남구',
      }),
    ).toEqual({
      error: null,
      field: null,
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
    // CM-008 — 지역 없이는 저장되지 않는다. 제목·본문이 비어 있어도 지역을 먼저 짚는다.
    expect(
      resolveCommunityEditorSubmission('create', '  ', '본문', {}),
    ).toEqual({ error: '지역을 골라 주세요.', field: 'location', value: null })
    expect(
      resolveCommunityEditorSubmission('create', '제목', '본문', {}),
    ).toEqual({ error: '지역을 골라 주세요.', field: 'location', value: null })
    expect(
      resolveCommunityEditorSubmission('edit', '  ', '본문', {}).error,
    ).toBe('제목을 입력해 주세요.')
    expect(
      resolveCommunityEditorSubmission('edit', '제목', '  ', {}).error,
    ).toBe('내용을 입력해 주세요.')
    expect(
      resolveCommunityEditorSubmission('edit', '제목', '본문', {}),
    ).toEqual({
      error: null,
      field: null,
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
    const publicKey = communityKeys.detail('1', false, 'anonymous')
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
        liked: null,
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
    const publicKey = communityKeys.detail('1', false, 'anonymous')
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

describe('CommunityEditorForm — 다듬기(community.md §S4 「다듬기」)', () => {
  /* 이 클래스가 붙은 규칙 블록들을 이어 붙인다(미디어 쿼리 안의 것도). */
  const rulesOf = (styles: string, className: string) =>
    [
      ...styles.matchAll(
        new RegExp(`\\.${className}(?:[^{,]*)\\{([^}]*)\\}`, 'g'),
      ),
    ]
      .map(match => match[0])
      .join('\n')
  const classOfAttr = (markup: string, attribute: string) =>
    markup
      .match(
        new RegExp(`<[a-z]+(?=[^>]*${attribute})[^>]*class="([^"]*)"`),
      )?.[1]
      ?.split(' ')
      .at(-1) ?? ''

  it('작성 체크 카드는 지역 · 제목 · 본문 · 사진(선택) 순서이고, 팁은 그 아래 짧게 남는다', () => {
    const { markup } = renderWithQuery(baseProps)
    const card = markup.slice(markup.indexOf('data-community-editor-checklist'))

    expect(card).toContain('>작성 체크</h2>')
    const order = ['location', 'title', 'content', 'images'].map(id =>
      card.indexOf(`data-check-id="${id}"`),
    )
    expect(order.every(index => index >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    expect(card).toContain('>선택</span>')
    expect(card.match(/, 남음/g)).toHaveLength(4)
    expect(card).toContain('필수 3개가 남았어요')
    expect(card.indexOf('이렇게 쓰면 답이 잘 달려요')).toBeGreaterThan(
      card.indexOf('필수 3개가 남았어요'),
    )
    expect(card.match(/<li>[^<]/g)).toHaveLength(3)
  })

  it('작성 체크는 ≥1080 에서만 보이고 헤더(64) + 24 에 sticky 다', () => {
    const { markup, styles } = renderWithQuery(baseProps)
    const rules = rulesOf(
      styles,
      classOfAttr(markup, 'data-community-editor-checklist'),
    )

    expect(rules).toMatch(/display:none/)
    expect(styles).toMatch(
      /@media \(min-width:\s*1080px\)\{\.[\w-]+\{position:sticky;top:88px;display:grid;/,
    )
  })

  it('≥480 은 드롭존(문구 · 규칙 한 줄 · n / 5), <480 은 + 타일 — 둘은 CSS 로 갈린다', () => {
    const { markup, styles } = renderWithQuery(baseProps)
    const dropzone = classOfAttr(markup, 'data-community-photo-dropzone')

    expect(markup).toMatch(
      /<button[^>]*data-community-photo-dropzone="true"[^>]*type="button"/,
    )
    expect(markup).toContain('사진을 끌어다 놓거나 눌러서 추가해 주세요')
    const dropzoneMarkup = markup.slice(
      markup.indexOf('data-community-photo-dropzone'),
      markup.indexOf('data-community-photo-row'),
    )
    expect(dropzoneMarkup).toContain(POST_IMAGE_RULE_TEXT)
    expect(dropzoneMarkup).toContain('0 / 5')
    // 이름은 큰 문구, 규칙·장수는 설명이다.
    expect(markup).toMatch(/aria-labelledby="[^"]*-dropzone-title"/)
    expect(markup).toMatch(
      /aria-describedby="[^"]*-dropzone-rule [^"]*-dropzone-count"/,
    )

    expect(styles).toMatch(new RegExp(`\\.${dropzone}\\{display:none;`))
    expect(styles).toMatch(
      new RegExp(
        `@media \\(min-width:\\s*480px\\)\\{\\.${dropzone}\\{[^}]*border:1px dashed var\\(--color-border-300\\)`,
      ),
    )
    // 드롭존이 썸네일 줄보다 위다.
    expect(markup.indexOf('data-community-photo-dropzone')).toBeLessThan(
      markup.indexOf('data-community-photo-row'),
    )
    // 사진이 없으면 ≥480 에서 빈 썸네일 줄을 그리지 않는다.
    expect(markup).toMatch(
      /data-community-photo-row="true"[^>]*data-empty="true"/,
    )
  })

  it('드래그 강조는 primary-700 점선 + primary-100 바탕, 안쪽은 포인터를 받지 않는다', () => {
    const { markup, styles } = renderWithQuery(baseProps)
    const dropzone = classOfAttr(markup, 'data-community-photo-dropzone')

    expect(styles).toMatch(
      new RegExp(
        `\\.${dropzone}\\[data-drag-active='true'\\]\\{border-color:var\\(--color-primary-700\\);background:var\\(--color-primary-100\\);`,
      ),
    )
    expect(styles).toMatch(
      new RegExp(`\\.${dropzone}\\s*>\\s*\\*\\{pointer-events:none;\\}`),
    )
  })

  it('5장이면 드롭존은 비활성 대신 aria-disabled 로 무엇을 하면 되는지 말한다', () => {
    const { markup } = renderWithQuery({
      ...baseProps,
      initialValue: { ...baseProps.initialValue, images: imagesOf(5) },
    })
    const dropzoneTag =
      markup.match(/<button[^>]*data-community-photo-dropzone[^>]*>/)?.[0] ?? ''

    expect(dropzoneTag).toContain('aria-disabled="true"')
    expect(dropzoneTag).not.toContain('disabled=""')
    expect(markup).toContain(
      '사진은 5장까지예요. 빼고 나서 다시 추가해 주세요.',
    )
    expect(markup).not.toContain('사진을 끌어다 놓거나 눌러서 추가해 주세요')
  })

  it('제목·본문은 커뮤니티 입력칸 조각(안쪽 한 줄 · 글로우 없음 · resize none)을 쓴다', () => {
    const { styles } = renderWithQuery(baseProps)

    expect(styles).toContain(
      'box-shadow:inset 0 -1px 0 var(--color-primary-700)',
    )
    expect(styles).toContain(
      'box-shadow:inset 0 0 0 1px var(--color-primary-700)',
    )
    expect(styles).not.toMatch(/box-shadow:0 1px 0/)
    expect(styles).not.toMatch(/resize:(vertical|both)/)
  })
})
