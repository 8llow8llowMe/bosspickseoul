// @vitest-environment jsdom
import { createElement, type ComponentProps } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import CommunityEditorForm, {
  COMMUNITY_EDITOR_LEAVE_CONFIRM,
  COMMUNITY_EDITOR_LEAVE_CONFIRM_UNSAVED,
} from '@/components/community/community-editor-form'

/*
  글쓰기 폼의 상호작용 계약(community.md §S4 「글쓰기 · 수정」·「잃지 않게」, CM-032·033·035)을
  실제 DOM 에서 잠근다. 마크업 계약은 community-editor-form.test.ts.
*/

type Props = ComponentProps<typeof CommunityEditorForm>

const district = {
  targetType: 'DISTRICT' as const,
  targetCode: '11200',
  targetName: '성동구',
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  document.body.style.overflow = ''
})

const renderForm = (overrides: Partial<Props> = {}) => {
  const props: Props = {
    mode: 'create',
    initialValue: { title: '', content: '', location: {}, images: [] },
    mockEnabled: true,
    pending: false,
    errorMessage: null,
    onCancel: vi.fn(),
    onSubmit: vi.fn(),
    onUploadImages: vi.fn(async () => []),
    ...overrides,
  }
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const view = render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(CommunityEditorForm, props),
    ),
  )

  return { props, view }
}

const button = (text: string) => {
  const found = Array.from(document.querySelectorAll('button')).find(
    element => element.textContent?.trim() === text,
  )
  if (!found) {
    throw new Error(`버튼이 없다: ${text}`)
  }
  return found
}

const titleInput = () =>
  document.querySelector<HTMLInputElement>(
    'input[placeholder="제목을 입력해 주세요"]',
  )!
const contentInput = () => document.querySelector('textarea')!
const chip = () =>
  document.querySelector<HTMLButtonElement>('[data-region-chip="compose"]')
const dialog = () => document.querySelector('[role="dialog"]')
const alerts = () =>
  Array.from(document.querySelectorAll('[role="alert"]')).map(element =>
    element.textContent?.trim(),
  )

describe('등록 — 비어 있는 첫 필수값으로 보낸다', () => {
  it('지역 없이 등록하면 칩으로 포커스가 가고 시트가 열리며 칩 아래 안내가 뜬다(CM-032)', () => {
    const { props } = renderForm({
      initialValue: {
        title: '제목',
        content: '본문',
        location: {},
        images: [],
      },
    })

    fireEvent.click(button('등록하기'))

    expect(props.onSubmit).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(chip())
    expect(dialog()).not.toBeNull()
    expect(alerts()).toContain('지역을 골라 주세요.')
    // 안내는 칩에 묶여 있다.
    const describedBy = chip()?.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy!)?.textContent).toBe(
      '지역을 골라 주세요.',
    )
  })

  it('편집 바의 등록도 같은 길이다', () => {
    const { props } = renderForm()

    fireEvent.click(button('등록'))

    expect(props.onSubmit).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(chip())
  })

  it('글쓰기 시트에는 「서울 전체」 확정 행이 없고, 고르면 안내가 사라진다', async () => {
    renderForm({
      initialValue: {
        title: '제목',
        content: '본문',
        location: {},
        images: [],
      },
    })

    fireEvent.click(button('등록하기'))
    await act(async () => {
      await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
    })

    const rows = () =>
      Array.from(dialog()?.querySelectorAll('button') ?? []).map(element =>
        element.textContent?.trim(),
      )
    expect(rows()).not.toContain('서울 전체')
    fireEvent.click(
      Array.from(dialog()!.querySelectorAll('button')).find(
        element => element.textContent?.trim() === '성동구',
      )!,
    )
    fireEvent.click(
      Array.from(dialog()!.querySelectorAll('button')).find(
        element => element.textContent?.trim() === '성동구 전체',
      )!,
    )

    expect(dialog()).toBeNull()
    expect(chip()?.textContent).toContain('성동구')
    expect(alerts()).not.toContain('지역을 골라 주세요.')
  })

  it('지역이 있고 제목이 비면 제목으로, 제목이 있고 본문이 비면 본문으로 포커스한다', () => {
    const { props } = renderForm({
      initialValue: { title: '', content: '', location: district, images: [] },
    })

    fireEvent.click(button('등록하기'))
    expect(document.activeElement).toBe(titleInput())
    expect(titleInput().getAttribute('aria-invalid')).toBe('true')
    expect(alerts()).toContain('제목을 입력해 주세요.')

    fireEvent.change(titleInput(), { target: { value: '제목' } })
    expect(alerts()).not.toContain('제목을 입력해 주세요.')

    fireEvent.click(button('등록하기'))
    expect(document.activeElement).toBe(contentInput())
    expect(alerts()).toContain('내용을 입력해 주세요.')
    expect(props.onSubmit).not.toHaveBeenCalled()
  })

  it('다 채우면 앞뒤 공백을 지운 값을 넘긴다', () => {
    const { props } = renderForm({
      initialValue: { title: '', content: '', location: district, images: [] },
    })

    fireEvent.change(titleInput(), { target: { value: '  제목 ' } })
    fireEvent.change(contentInput(), { target: { value: ' 본문 ' } })
    fireEvent.click(button('등록하기'))

    expect(props.onSubmit).toHaveBeenCalledWith({
      title: '제목',
      content: '본문',
      location: district,
      images: [],
    })
  })
})

describe('작성 도움 칩(CM-033)', () => {
  it('누르면 본문에 틀이 들어가고 칩이 사라지며 커서가 첫 줄 끝에 선다', () => {
    renderForm()

    fireEvent.click(button('질문해요'))

    expect(contentInput().value).toBe('상황: \n궁금한 점: ')
    expect(document.activeElement).toBe(contentInput())
    expect(contentInput().selectionStart).toBe(4)
    expect(contentInput().selectionEnd).toBe(4)
    expect(
      document.querySelector('[data-community-writing-prompts="true"]'),
    ).toBeNull()

    // 본문을 다시 비우면 돌아온다.
    fireEvent.change(contentInput(), { target: { value: '' } })
    expect(button('같이 해요')).toBeTruthy()
  })
})

describe('이탈 확인(CM-035)', () => {
  it('바뀐 것이 없으면 묻지 않고 나간다', () => {
    const confirm = vi.spyOn(window, 'confirm')
    const { props } = renderForm()

    fireEvent.click(button('취소'))

    expect(confirm).not.toHaveBeenCalled()
    expect(props.onCancel).toHaveBeenCalledOnce()
  })

  it('바뀐 채로 ✕ · 취소를 누르면 묻고, 거절하면 머문다', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { props } = renderForm({ draftStorageKey: 'community-draft:new' })

    fireEvent.change(titleInput(), { target: { value: '쓰는 중' } })
    fireEvent.click(document.querySelector('button[aria-label="닫기"]')!)

    expect(confirm).toHaveBeenCalledWith(COMMUNITY_EDITOR_LEAVE_CONFIRM)
    expect(COMMUNITY_EDITOR_LEAVE_CONFIRM).toBe(
      '작성 중인 글은 임시 저장돼요. 나갈까요?',
    )
    expect(props.onCancel).not.toHaveBeenCalled()

    confirm.mockReturnValue(true)
    fireEvent.click(button('취소'))
    expect(props.onCancel).toHaveBeenCalledOnce()
  })

  it('임시 저장을 안 하는 글(비교 초안)은 「저장돼요」라고 말하지 않는다', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderForm({ draftStorageKey: null })

    fireEvent.change(titleInput(), { target: { value: '쓰는 중' } })
    fireEvent.click(button('취소'))

    expect(confirm).toHaveBeenCalledWith(COMMUNITY_EDITOR_LEAVE_CONFIRM_UNSAVED)
  })

  it('바뀐 동안만 새로고침·탭 닫기를 막고, 등록 성공 뒤에는 막지 않는다', () => {
    const fire = () => {
      const event = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(event)
      return event.defaultPrevented
    }
    const { props, view } = renderForm()

    expect(fire()).toBe(false)

    fireEvent.change(titleInput(), { target: { value: '쓰는 중' } })
    expect(fire()).toBe(true)

    view.rerender(
      createElement(
        QueryClientProvider,
        { client: new QueryClient() },
        createElement(CommunityEditorForm, { ...props, submitted: true }),
      ),
    )
    expect(fire()).toBe(false)
  })

  it('이어 쓰기로 시작하면 원래 값이 기준이라 처음부터 묻는다', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderForm({
      initialValue: {
        title: '저장한 제목',
        content: '',
        location: {},
        images: [],
      },
      pristineValue: { title: '', content: '', location: {}, images: [] },
    })

    fireEvent.click(button('취소'))

    expect(confirm).toHaveBeenCalledOnce()
  })
})

describe('임시 저장 연결', () => {
  it('입력이 멈추고 1초 뒤 제목·본문·지역만 저장하고, 등록 성공(submitted)이면 쓰지 않는다', () => {
    vi.useFakeTimers()
    const { props, view } = renderForm({
      draftStorageKey: 'community-draft:new',
      initialValue: {
        title: '',
        content: '',
        location: district,
        images: [
          { imageKey: 'k', imageUrl: 'https://minio.test/k.png', sortOrder: 0 },
        ],
      },
    })

    fireEvent.change(titleInput(), { target: { value: '쓰는 중' } })
    act(() => {
      vi.advanceTimersByTime(999)
    })
    expect(window.localStorage.getItem('community-draft:new')).toBeNull()
    act(() => {
      vi.advanceTimersByTime(1)
    })

    const saved = JSON.parse(
      window.localStorage.getItem('community-draft:new') ?? 'null',
    )
    expect(saved).toMatchObject({
      title: '쓰는 중',
      content: '',
      location: district,
    })
    expect(saved).not.toHaveProperty('images')

    window.localStorage.clear()
    view.rerender(
      createElement(
        QueryClientProvider,
        { client: new QueryClient() },
        createElement(CommunityEditorForm, {
          ...props,
          draftStorageKey: 'community-draft:new',
          submitted: true,
        }),
      ),
    )
    fireEvent.change(titleInput(), { target: { value: '쓰는 중 더' } })
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    view.unmount()
    expect(window.localStorage.getItem('community-draft:new')).toBeNull()
  })
})

const filled = {
  title: '제목',
  content: '본문',
  location: district,
  images: [],
}

describe('등록 — 막아야 할 때', () => {
  it('등록이 성공해 이동하는 중(submitted)이면 두 버튼이 꺼지고 제출도 무시한다', () => {
    const { props } = renderForm({ initialValue: filled, submitted: true })

    expect(button('등록하기').disabled).toBe(true)
    expect(button('등록').disabled).toBe(true)

    fireEvent.submit(document.querySelector('form')!)

    expect(props.onSubmit).not.toHaveBeenCalled()
  })

  it('사진을 올리는 중에 누르면 등록하지 않고 기다려 달라고 말한다 — 끝나면 안내가 걷힌다', async () => {
    let finish: (images: never[]) => void = () => {}
    const { props } = renderForm({
      initialValue: filled,
      onUploadImages: vi.fn(
        () =>
          new Promise<never[]>(resolve => {
            finish = resolve
          }),
      ),
    })
    const fileInput =
      document.querySelector<HTMLInputElement>('input[type="file"]')!
    fireEvent.change(fileInput, {
      target: {
        files: [new File(['x'], 'a.png', { type: 'image/png' })],
      },
    })
    expect(
      document.querySelector('[data-community-photo-uploading]'),
    ).not.toBeNull()

    fireEvent.click(button('등록하기'))

    expect(props.onSubmit).not.toHaveBeenCalled()
    // 비활성이 아니라 누르면 이유를 말한다(3단계 원칙).
    expect(button('등록하기').disabled).toBe(false)
    expect(alerts()).toContain(
      '사진을 올리는 중이에요. 끝나면 다시 눌러 주세요.',
    )

    await act(async () => {
      finish([])
    })

    expect(alerts()).not.toContain(
      '사진을 올리는 중이에요. 끝나면 다시 눌러 주세요.',
    )
    fireEvent.click(button('등록하기'))
    expect(props.onSubmit).toHaveBeenCalledOnce()
  })
})

describe('제목 칸의 Enter', () => {
  it('제출하지 않고 본문으로 포커스를 옮긴다', () => {
    const { props } = renderForm({ initialValue: filled })
    titleInput().focus()

    const notPrevented = fireEvent.keyDown(titleInput(), {
      key: 'Enter',
      keyCode: 13,
    })

    expect(notPrevented).toBe(false)
    expect(document.activeElement).toBe(contentInput())
    expect(props.onSubmit).not.toHaveBeenCalled()
  })

  it('한글 조합 중 Enter 는 건드리지 않는다(isComposing · keyCode 229)', () => {
    renderForm({ initialValue: filled })
    titleInput().focus()

    expect(
      fireEvent.keyDown(titleInput(), { key: 'Enter', isComposing: true }),
    ).toBe(true)
    expect(document.activeElement).toBe(titleInput())

    expect(
      fireEvent.keyDown(titleInput(), { key: 'Enter', keyCode: 229 }),
    ).toBe(true)
    expect(document.activeElement).toBe(titleInput())

    // 조합 키를 낀 Enter 도 건드리지 않는다.
    expect(
      fireEvent.keyDown(titleInput(), { key: 'Enter', shiftKey: true }),
    ).toBe(true)
    expect(document.activeElement).toBe(titleInput())
  })
})
