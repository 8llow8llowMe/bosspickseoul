// @vitest-environment jsdom
import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import CommunityRegisterPage, {
  communityEditorKeys,
} from '@/components/community/community-register-page'
import { communityMockSource } from '@/lib/community/community-mock'

/*
  글쓰기 화면의 진입 계약(community.md §S4 「글쓰기 · 수정」 지역 프리필 · 「잃지 않게」)을 실제
  DOM 에서 잠근다 — 저장본 확인은 효과에서 일어나 서버 렌더 문자열로는 볼 수 없다.
  CM-031(프리필) · CM-034(복원 게이트) · CM-035(성공 시 저장본 삭제).
  목 모드의 회원 id 는 `MOCK_COMMUNITY_MEMBER_ID`(9001)라 키는 `community-draft:9001:…` 이다.
*/

const searchParamsBox = vi.hoisted(() => ({ current: new URLSearchParams() }))
const routerBox = vi.hoisted(() => ({
  push: (() => {}) as (href: string) => void,
  replace: (() => {}) as (href: string) => void,
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParamsBox.current,
  usePathname: () => '/community/register',
  useRouter: () => routerBox,
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

const NEW_KEY = 'community-draft:9001:new'
const district = {
  targetType: 'DISTRICT' as const,
  targetCode: '11200',
  targetName: '성동구',
}

const DRAFT_PARAMS = {
  leftCommercialCode: '3110971',
  rightCommercialCode: '3110958',
  serviceCode: 'CS100001',
  administrationCode: '11680640',
}
const DRAFT_SEARCH =
  'draftSource=comparison&leftCommercialCode=3110971' +
  '&rightCommercialCode=3110958&serviceCode=CS100001' +
  '&administrationCode=11680640'

const store = (key: string, value: object) => {
  window.localStorage.setItem(key, JSON.stringify({ savedAt: 1, ...value }))
}

const renderPage = (search: string, seed?: (client: QueryClient) => void) => {
  searchParamsBox.current = new URLSearchParams(search)
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  seed?.(client)

  return render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(CommunityRegisterPage),
    ),
  )
}

const chipText = () =>
  document.querySelector('[data-region-chip="compose"]')?.textContent ?? ''
const titleInput = () =>
  document.querySelector<HTMLInputElement>(
    'input[placeholder="제목을 입력해 주세요"]',
  )
const form = () => document.querySelector('[data-community-editor-form]')
const contentInput = () => document.querySelector('textarea')!
const PREFILL_SEARCH =
  'mock=1&targetType=DISTRICT&targetCode=11200&targetName=%EC%84%B1%EB%8F%99%EA%B5%AC'

beforeEach(() => {
  window.localStorage.clear()
  routerBox.push = vi.fn()
  routerBox.replace = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('지역 프리필(CM-031)', () => {
  it('목록·상세가 실어 보낸 지역으로 칩이 채워진다', () => {
    renderPage(
      'mock=1&targetType=DISTRICT&targetCode=11200&targetName=%EC%84%B1%EB%8F%99%EA%B5%AC',
    )

    expect(form()).not.toBeNull()
    expect(chipText()).toContain('성동구')
  })

  it('자치구 이름은 쿼리가 아니라 코드로 찾는다', () => {
    renderPage('mock=1&targetType=DISTRICT&targetCode=11200&targetName=x')

    expect(chipText()).toContain('성동구')
    expect(chipText()).not.toContain('x')
  })

  it('형식이 틀린 값은 버리고 빈 칩으로 시작한다', () => {
    renderPage('mock=1&targetType=CITY&targetCode=11200&targetName=x')

    expect(chipText()).toContain('어느 지역 이야기인가요?')
  })
})

describe('복원 게이트(CM-034)', () => {
  it('저장본이 없으면 묻지 않고 곧바로 빈 폼이다', () => {
    renderPage('mock=1')

    expect(screen.queryByText('작성하던 글이 있어요')).toBeNull()
    expect(form()).not.toBeNull()
    expect(titleInput()?.value).toBe('')
  })

  it('저장본이 있으면 폼보다 먼저 묻고, 이어 쓰기면 제목·본문·지역이 돌아온다', () => {
    store(NEW_KEY, {
      title: '쓰던 제목',
      content: '쓰던 본문',
      location: district,
    })
    renderPage('mock=1')

    expect(screen.getByText('작성하던 글이 있어요')).toBeTruthy()
    expect(screen.getByText('쓰던 제목')).toBeTruthy()
    expect(form()).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '이어 쓰기' }))

    expect(titleInput()?.value).toBe('쓰던 제목')
    expect(document.querySelector('textarea')?.value).toBe('쓰던 본문')
    expect(chipText()).toContain('성동구')
    // 이어 쓴 뒤에는 다시 묻지 않는다(쓰는 동안 저장본이 바뀌어도).
    expect(screen.queryByText('작성하던 글이 있어요')).toBeNull()
  })

  it('새로 쓰기면 저장본을 지우고 들어온 그대로(프리필 포함) 빈 폼이다', () => {
    store(NEW_KEY, {
      title: '쓰던 제목',
      content: '',
      location: { targetType: 'COMMERCIAL', targetCode: '3110008' },
    })
    renderPage(
      'mock=1&targetType=DISTRICT&targetCode=11200&targetName=%EC%84%B1%EB%8F%99%EA%B5%AC',
    )

    fireEvent.click(screen.getByRole('button', { name: '새로 쓰기' }))

    expect(window.localStorage.getItem(NEW_KEY)).toBeNull()
    expect(titleInput()?.value).toBe('')
    expect(chipText()).toContain('성동구')
  })

  it('내용 없는 저장본(제목·본문 공백)은 묻지 않는다', () => {
    store(NEW_KEY, { title: ' ', content: '\n', location: district })
    renderPage('mock=1')

    expect(screen.queryByText('작성하던 글이 있어요')).toBeNull()
    expect(form()).not.toBeNull()
  })

  it('다른 계정의 저장본은 묻지 않는다 — 공용 기기(키에 회원 id)', () => {
    store('community-draft:1234:new', {
      title: '다른 사람 글',
      content: '다른 사람 본문',
      location: district,
    })
    store('community-draft:new', {
      title: '옛 키 글',
      content: '',
      location: district,
    })
    renderPage('mock=1')

    expect(screen.queryByText('작성하던 글이 있어요')).toBeNull()
    expect(titleInput()?.value).toBe('')
    expect(document.body.textContent).not.toContain('다른 사람 글')
  })

  it('저장본을 읽다 storage 가 던져도 빈 폼으로 간다', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    renderPage('mock=1')

    expect(form()).not.toBeNull()
  })

  it('비교 초안으로 들어오면 저장본이 있어도 묻지 않는다 — 초안이 이긴다', () => {
    store(NEW_KEY, {
      title: '쓰던 제목',
      content: '쓰던 본문',
      location: district,
    })
    renderPage(`mock=1&${DRAFT_SEARCH}`, client => {
      client.setQueryData(
        communityEditorKeys.comparisonDraft(DRAFT_PARAMS, true),
        {
          dataHeader: { success: true, resultCode: null, resultMessage: null },
          dataBody: {
            targetType: {
              code: 'ADMINISTRATION',
              name: '행정동',
              description: '',
            },
            targetCode: '11680640',
            targetName: '역삼1동',
            title: '초안 제목',
            content: '초안 본문',
          },
        },
      )
    })

    expect(screen.queryByText('작성하던 글이 있어요')).toBeNull()
    expect(titleInput()?.value).toBe('초안 제목')
    expect(chipText()).toContain('역삼1동')
    // 묻지도 쓰지도 않는다 — 사용자가 따로 쓰던 저장본은 그대로 남는다.
    expect(JSON.parse(window.localStorage.getItem(NEW_KEY) ?? '{}').title).toBe(
      '쓰던 제목',
    )
  })

  it('수정 모드의 이어 쓰기는 제목·본문만 저장본이고 지역·사진은 원본이다', async () => {
    store('community-draft:9001:edit:5', {
      title: '고친 제목',
      content: '고친 본문',
      location: district,
    })
    renderPage('mock=1&postId=5')

    fireEvent.click(await screen.findByRole('button', { name: '이어 쓰기' }))

    expect(titleInput()?.value).toBe('고친 제목')
    expect(document.querySelector('textarea')?.value).toBe('고친 본문')
    // 지역은 읽기 전용 원본(역삼1동), 시트를 여는 칩이 없다.
    expect(document.querySelector('[data-region-chip]')).toBeNull()
    expect(form()?.textContent).toContain('역삼1동')
    expect(form()?.textContent).not.toContain('성동구')
    // 원본 첨부를 들고 있다 — 빼면 저장 순간 지워진다.
    expect(
      document.querySelectorAll('[data-community-photo-row] img'),
    ).toHaveLength(1)
    expect(form()?.textContent).toContain('1 / 5')
  })
})

describe('등록 성공(CM-035)', () => {
  it('저장본을 지우고 이동하며, 이동이 끝나기 전에 저장본이 되살아나지 않는다', async () => {
    store(NEW_KEY, {
      title: '예전 글',
      content: '예전 본문',
      location: district,
    })
    renderPage(
      'mock=1&targetType=DISTRICT&targetCode=11200&targetName=%EC%84%B1%EB%8F%99%EA%B5%AC',
    )
    fireEvent.click(screen.getByRole('button', { name: '이어 쓰기' }))
    fireEvent.change(titleInput()!, { target: { value: '등록할 제목' } })

    fireEvent.click(screen.getByRole('button', { name: '등록하기' }))

    await waitFor(() => {
      expect(routerBox.replace).toHaveBeenCalled()
    })
    expect(vi.mocked(routerBox.replace).mock.calls[0]?.[0]).toMatch(
      /^\/community\/\d+\?mock=1$/,
    )
    expect(window.localStorage.getItem(NEW_KEY)).toBeNull()

    // router.replace 는 목이라 폼이 그대로 떠 있다 — 1초 넘게 지나도 다시 쓰지 않는다.
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1100))
    })
    cleanup()
    expect(window.localStorage.getItem(NEW_KEY)).toBeNull()
  })
})

describe('리뷰 재현 — 중복 글 · 되돌린 이어 쓰기 · 저장 중 실패', () => {
  it('등록이 성공하면 이동이 끝나기 전에 다시 눌러도 두 번째 글을 만들지 않는다(T1)', async () => {
    const createPost = vi.spyOn(communityMockSource, 'createPost')
    renderPage(PREFILL_SEARCH)
    fireEvent.change(titleInput()!, { target: { value: '제목' } })
    fireEvent.change(contentInput(), { target: { value: '본문' } })

    fireEvent.click(screen.getByRole('button', { name: '등록하기' }))
    await waitFor(() => {
      expect(routerBox.replace).toHaveBeenCalledTimes(1)
    })

    // router.replace 는 목이라 폼이 그대로 떠 있다 — 이동 전 사이를 재현한다.
    const submit = screen.getByRole<HTMLButtonElement>('button', {
      name: '등록하기',
    })
    expect(submit.disabled).toBe(true)
    fireEvent.click(submit)
    fireEvent.submit(form()!)
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    expect(createPost).toHaveBeenCalledTimes(1)
    expect(routerBox.replace).toHaveBeenCalledTimes(1)
  })

  it('이어 쓰기 뒤 원래 값(빈 글)으로 되돌리면 저장본이 남지 않는다(T2)', async () => {
    store(NEW_KEY, { title: '쓰던 제목', content: '쓰던 본문', location: {} })
    renderPage('mock=1')

    fireEvent.click(screen.getByRole('button', { name: '이어 쓰기' }))
    fireEvent.change(titleInput()!, { target: { value: '' } })
    fireEvent.change(contentInput(), { target: { value: '' } })
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1100))
    })
    cleanup()

    expect(window.localStorage.getItem(NEW_KEY)).toBeNull()
  })

  it('바뀐 직후(1초 안) 등록이 실패하고 나가도 쓴 글이 저장돼 있다(T3)', async () => {
    vi.spyOn(communityMockSource, 'createPost').mockRejectedValue(
      new Error('boom'),
    )
    renderPage(PREFILL_SEARCH)
    fireEvent.change(titleInput()!, { target: { value: '제목' } })
    fireEvent.change(contentInput(), { target: { value: '본문' } })

    fireEvent.click(screen.getByRole('button', { name: '등록하기' }))
    await waitFor(() => {
      expect(screen.getByText('boom')).toBeTruthy()
    })
    cleanup()

    expect(
      JSON.parse(window.localStorage.getItem(NEW_KEY) ?? 'null'),
    ).toMatchObject({ title: '제목', content: '본문' })
  })
})
