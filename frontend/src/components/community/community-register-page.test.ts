import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CommunityRegisterPage, {
  communityEditorKeys,
  createCommunityEditorPayload,
  resolveComparisonDraftView,
} from '@/components/community/community-register-page'

const searchParamsBox = vi.hoisted(() => ({ current: new URLSearchParams() }))

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParamsBox.current,
  usePathname: () => '/community/register',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (
    select: (state: {
      hasHydrated: boolean
      isLoggedIn: boolean
      memberInfo: { memberId: string }
      clearSession: () => void
    }) => unknown,
  ) =>
    select({
      hasHydrated: true,
      isLoggedIn: true,
      memberInfo: { memberId: '9001' },
      clearSession: () => {},
    }),
}))

/** 초안 호출이 실제로 나갔는지 본다. 파라미터가 없을 때는 나가면 안 된다. */
const draftCalls = vi.hoisted(() => ({ current: [] as unknown[] }))

vi.mock('@/lib/api/community-drafts', () => ({
  createCommercialComparisonDraft: (params: unknown) => {
    draftCalls.current.push(params)
    return Promise.resolve({
      dataHeader: { success: true, resultCode: null, resultMessage: null },
      dataBody: null,
    })
  },
}))

const DRAFT_SEARCH =
  'draftSource=comparison&leftCommercialCode=3110971' +
  '&rightCommercialCode=3110958&serviceCode=CS100001' +
  '&administrationCode=11680640'

const DRAFT_PARAMS = {
  leftCommercialCode: '3110971',
  rightCommercialCode: '3110958',
  serviceCode: 'CS100001',
  administrationCode: '11680640',
}

type DraftSeed = { title: string; content: string; targetName: string }

const render = (search: string, seed?: DraftSeed) => {
  searchParamsBox.current = new URLSearchParams(search)

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  if (seed) {
    client.setQueryData(
      communityEditorKeys.comparisonDraft(DRAFT_PARAMS, false),
      {
        dataHeader: { success: true, resultCode: null, resultMessage: null },
        dataBody: {
          targetType: {
            code: 'ADMINISTRATION',
            name: '행정동',
            description: '',
          },
          targetCode: '11680640',
          targetName: seed.targetName,
          title: seed.title,
          content: seed.content,
        },
      },
    )
  }

  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(CommunityRegisterPage),
    ),
  )
}

beforeEach(() => {
  draftCalls.current = []
})

describe('CommunityRegisterPage · 상권 비교 초안', () => {
  it('초안 파라미터가 없으면 초안을 부르지 않고 빈 폼을 준다', () => {
    const markup = render('')

    expect(draftCalls.current).toEqual([])
    expect(markup).toContain('새 게시글')
    expect(markup).not.toContain('비교 내용을 불러오지 못했어요')
  })

  it('초안을 받으면 제목·본문·대상이 채워진다', () => {
    const markup = render(DRAFT_SEARCH, {
      title: '선정릉역 4번 vs 역삼역 4번',
      content: '두 상권의 매출과 유동인구를 비교했습니다.',
      targetName: '역삼1동',
    })

    expect(markup).toContain('선정릉역 4번 vs 역삼역 4번')
    expect(markup).toContain('두 상권의 매출과 유동인구를 비교했습니다.')
    expect(markup).toContain('역삼1동')
  })

  it('초안 파라미터가 깨졌으면 부르지 않고 안내만 한다', () => {
    const markup = render('draftSource=comparison&leftCommercialCode=3110971')

    expect(draftCalls.current).toEqual([])
    expect(markup).toContain('비교 내용을 불러오지 못했어요')
  })
})

/*
 * 실패·로딩 분기는 화면 문자열로 검증할 수 없다 — `renderToStaticMarkup` 은 효과를
 * 돌리지 않고, react-query 는 서버 렌더에서 오류 상태를 `pending` 으로 보고한다.
 * 그래서 규칙 자체를 직접 확인한다.
 */
describe('resolveComparisonDraftView', () => {
  const draft = {
    targetType: { code: 'ADMINISTRATION', name: '행정동', description: '' },
    targetCode: '11680640',
    targetName: '역삼1동',
    title: '제목',
    content: '본문',
  }

  it('초안 요청이 없으면 아무것도 하지 않는다', () => {
    expect(
      resolveComparisonDraftView({
        requestKind: 'none',
        pending: true,
        failed: false,
        draft: null,
      }),
    ).toEqual({ kind: 'none' })
  })

  it('받는 중에는 폼을 미룬다', () => {
    expect(
      resolveComparisonDraftView({
        requestKind: 'ready',
        pending: true,
        failed: false,
        draft: null,
      }),
    ).toEqual({ kind: 'loading' })
  })

  /* dev 백엔드가 COMMUNITY_004 로 막는 경로. 안내만 하고 글쓰기는 열어 둔다. */
  it('실패하면 안내로 떨어진다', () => {
    expect(
      resolveComparisonDraftView({
        requestKind: 'ready',
        pending: false,
        failed: true,
        draft: null,
      }),
    ).toEqual({ kind: 'failed' })
  })

  it('깨진 링크는 부르지 않고 바로 안내한다', () => {
    expect(
      resolveComparisonDraftView({
        requestKind: 'invalid',
        pending: true,
        failed: false,
        draft: null,
      }),
    ).toEqual({ kind: 'failed' })
  })

  /* 성공했는데 본문이 비면 초안이 온 척하지 않는다. */
  it('성공했는데 본문이 없으면 실패로 다룬다', () => {
    expect(
      resolveComparisonDraftView({
        requestKind: 'ready',
        pending: false,
        failed: false,
        draft: null,
      }),
    ).toEqual({ kind: 'failed' })
  })

  it('초안을 받으면 그대로 넘긴다', () => {
    expect(
      resolveComparisonDraftView({
        requestKind: 'ready',
        pending: false,
        failed: false,
        draft,
      }),
    ).toEqual({ kind: 'ready', draft })
  })
})

describe('createCommunityEditorPayload — 첨부를 잃지 않는다', () => {
  const images = [
    {
      imageKey: 'community/posts/1/2026/09/a.png',
      imageUrl: 'https://minio.test/a.png',
      sortOrder: 0,
    },
    {
      imageKey: 'community/posts/1/2026/09/b.png',
      imageUrl: 'https://minio.test/b.png',
      sortOrder: 1,
    },
  ]

  const value = (overrides = {}) => ({
    title: '제목',
    content: '본문',
    location: {
      targetType: 'COMMERCIAL' as const,
      targetCode: '3110008',
      targetName: '강남역 상권',
    },
    images,
    ...overrides,
  })

  /**
   * ⚠️ **이 파일에서 가장 중요한 단언이다.**
   *
   * 수정 요청의 `imageKeys` 는 「수정 후 남길 목록」이고, 백엔드
   * `CommunityPostImageProcessor.normalize(null)` 이 **빈 목록**을 돌려준다. 즉 이
   * 필드를 빼고 보내면 기존 첨부가 연결 해제되고 **파일까지 지워진다** — 제목 한
   * 글자만 고쳐도 그렇다. 되돌릴 방법도 없다.
   */
  it('수정 payload 가 기존 첨부 키를 그대로 되돌려 보낸다', () => {
    const payload = createCommunityEditorPayload('edit', value())

    expect(payload).toEqual({
      title: '제목',
      content: '본문',
      imageKeys: [
        'community/posts/1/2026/09/a.png',
        'community/posts/1/2026/09/b.png',
      ],
    })
  })

  it('작성 payload 도 첨부 키를 싣는다 — 배열 순서가 노출 순서다', () => {
    const payload = createCommunityEditorPayload('create', value())

    expect(payload).toMatchObject({
      targetType: 'COMMERCIAL',
      targetCode: '3110008',
      imageKeys: [
        'community/posts/1/2026/09/a.png',
        'community/posts/1/2026/09/b.png',
      ],
    })
  })

  /* 사용자가 실제로 다 뺐을 때만 빈 배열이어야 한다. */
  it('첨부를 모두 뺐으면 빈 배열을 보낸다', () => {
    expect(createCommunityEditorPayload('edit', value({ images: [] }))).toEqual(
      {
        title: '제목',
        content: '본문',
        imageKeys: [],
      },
    )
  })
})
