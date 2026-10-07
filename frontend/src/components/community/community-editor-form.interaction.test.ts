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
    initialValue: {
      title: '',
      content: '',
      location: {},
      images: [],
      category: null,
    },
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
const categoryGroup = () =>
  document.querySelector<HTMLElement>('[role="group"][aria-label="말머리"]')!
const categoryButton = (text: string) =>
  Array.from(categoryGroup().querySelectorAll('button')).find(
    element => element.textContent === text,
  )!
const pressedCategories = () =>
  Array.from(
    categoryGroup().querySelectorAll('button[aria-pressed="true"]'),
  ).map(element => element.textContent)
const filled = {
  title: '제목',
  content: '본문',
  location: district,
  images: [],
  category: null,
}
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
        category: null,
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
        category: null,
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
      initialValue: {
        title: '',
        content: '',
        location: district,
        images: [],
        category: null,
      },
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
      initialValue: {
        title: '',
        content: '',
        location: district,
        images: [],
        category: null,
      },
    })

    fireEvent.change(titleInput(), { target: { value: '  제목 ' } })
    fireEvent.change(contentInput(), { target: { value: ' 본문 ' } })
    fireEvent.click(button('등록하기'))

    expect(props.onSubmit).toHaveBeenCalledWith({
      title: '제목',
      content: '본문',
      location: district,
      images: [],
      category: null,
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
    expect(
      document.querySelector('[data-community-writing-prompts="true"]')
        ?.textContent,
    ).toContain('같이 해요')
  })

  it('말머리가 비었으면 칩의 말머리를 같이 골라 준다(#529)', () => {
    renderForm()

    fireEvent.click(button('경험 나눠요'))

    expect(pressedCategories()).toEqual(['경험 공유'])
  })

  it('이미 고른 말머리는 덮지 않는다 — 본문 틀만 들어간다', () => {
    renderForm()

    fireEvent.click(categoryButton('동네 소식'))
    fireEvent.click(button('질문해요'))

    expect(contentInput().value).toBe('상황: \n궁금한 점: ')
    expect(pressedCategories()).toEqual(['동네 소식'])
  })
})

describe('말머리(#529)', () => {
  it('하나만 고르고, 다시 누르면 풀리며, 고른 값이 등록 값에 실린다', () => {
    const { props } = renderForm({
      initialValue: { ...filled, category: null },
    })

    fireEvent.click(categoryButton('질문'))
    expect(pressedCategories()).toEqual(['질문'])
    fireEvent.click(categoryButton('같이 해요'))
    expect(pressedCategories()).toEqual(['같이 해요'])
    fireEvent.click(button('등록하기'))
    expect(props.onSubmit).toHaveBeenLastCalledWith(
      expect.objectContaining({ category: 'TOGETHER' }),
    )

    fireEvent.click(categoryButton('같이 해요'))
    expect(pressedCategories()).toEqual([])
    fireEvent.click(button('등록하기'))
    expect(props.onSubmit).toHaveBeenLastCalledWith(
      expect.objectContaining({ category: null }),
    )
  })

  it('수정 화면은 지금 말머리로 시작하고, 건드리지 않으면 그대로 넘긴다', () => {
    const { props } = renderForm({
      mode: 'edit',
      initialValue: { ...filled, category: 'NEWS' },
    })

    expect(pressedCategories()).toEqual(['동네 소식'])
    fireEvent.click(button('수정하기'))
    expect(props.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'NEWS' }),
    )
  })

  it('말머리만 골라도 바뀐 것이라 임시 저장에 말머리가 실린다', () => {
    vi.useFakeTimers()
    renderForm({
      draftStorageKey: 'community-draft:new',
      initialValue: { ...filled, category: null },
    })

    fireEvent.click(categoryButton('질문'))
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(
      JSON.parse(window.localStorage.getItem('community-draft:new') ?? 'null'),
    ).toMatchObject({ title: '제목', category: 'QUESTION' })
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
        category: null,
      },
      pristineValue: {
        title: '',
        content: '',
        location: {},
        images: [],
        category: null,
      },
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
        category: null,
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

/*
  작성 체크(community.md §S4 「다듬기」, ≥1080). 카드는 CSS 로만 숨으므로 jsdom 에서는 늘 있다.
  켜짐은 폼 상태에서 나오고(판정 규칙은 editor-compose.test.ts), 누르면 그 칸으로 포커스가 간다.
*/
describe('작성 체크', () => {
  const checkButton = (id: string) =>
    document.querySelector<HTMLButtonElement>(
      `[data-community-editor-checklist] [data-check-id="${id}"]`,
    )!
  const summary = () => document.querySelector('[data-community-editor-ready]')!

  it('제목 · 본문을 누르면 그 칸으로 포커스가 간다', () => {
    renderForm()

    fireEvent.click(checkButton('title'))
    expect(document.activeElement).toBe(titleInput())

    fireEvent.click(checkButton('content'))
    expect(document.activeElement).toBe(contentInput())
  })

  it('지역을 누르면 칩에 포커스만 두고 시트는 열지 않는다', () => {
    renderForm()

    fireEvent.click(checkButton('location'))

    expect(document.activeElement).toBe(chip())
    expect(dialog()).toBeNull()
  })

  it('사진을 누르면 드롭존으로 포커스가 간다', () => {
    renderForm()

    fireEvent.click(checkButton('images'))

    expect(document.activeElement).toBe(
      document.querySelector('[data-community-photo-dropzone]'),
    )
  })

  it('입력하면 체크가 켜지고 숨긴 글자가 `남음` → `완료` 로 바뀐다 — 공백만은 켜지 않는다', () => {
    renderForm()

    expect(checkButton('title').dataset.done).toBe('false')
    expect(checkButton('title').textContent).toContain('남음')

    fireEvent.change(titleInput(), { target: { value: '   ' } })
    expect(checkButton('title').dataset.done).toBe('false')

    fireEvent.change(titleInput(), { target: { value: '월세 질문' } })
    expect(checkButton('title').dataset.done).toBe('true')
    expect(checkButton('title').textContent).toContain('완료')
    expect(
      checkButton('title').querySelector('.lucide-circle-check'),
    ).not.toBeNull()
    expect(summary().textContent).toBe('필수 2개가 남았어요')
  })

  it('필수 셋이 다 차면 `등록할 준비가 됐어요` — 사진은 없어도 된다', () => {
    renderForm({ initialValue: filled })

    expect(summary().textContent).toBe('등록할 준비가 됐어요')
    expect(summary().getAttribute('role')).toBe('status')
    expect(checkButton('images').dataset.done).toBe('false')
    expect(checkButton('images').textContent).toContain('선택')
  })

  it('수정 모드의 지역은 바꿀 수 없어 버튼이 아니다', () => {
    renderForm({ mode: 'edit', initialValue: filled })

    const location = document.querySelector(
      '[data-community-editor-checklist] [data-check-id="location"]',
    )!
    expect(location.tagName).toBe('DIV')
    expect(location.getAttribute('data-done')).toBe('true')
  })
})

/*
  사진 드롭존(community.md §S4 「다듬기」, ≥480). 놓은 파일은 고른 파일과 같은 길(selectPostImages →
  onUploadImages)을 탄다.
*/
describe('사진 드롭존', () => {
  const dropzone = () =>
    document.querySelector<HTMLButtonElement>(
      '[data-community-photo-dropzone]',
    )!
  const png = (name = 'a.png') => new File(['x'], name, { type: 'image/png' })
  const transfer = (files: File[]) => ({
    dataTransfer: { files, types: ['Files'], dropEffect: 'none' },
  })

  it('파일을 끌어 올리면 강조하고, 떠나면 걷는다 — 글자를 끌 때는 반응하지 않는다', () => {
    renderForm()

    fireEvent.dragEnter(dropzone(), {
      dataTransfer: { files: [], types: ['text/plain'] },
    })
    expect(dropzone().dataset.dragActive).toBeUndefined()

    fireEvent.dragEnter(dropzone(), transfer([png()]))
    expect(dropzone().dataset.dragActive).toBe('true')

    // dragover 를 막아야 drop 이 난다 — 막지 않으면 브라우저가 파일을 열어 글을 떠난다.
    expect(fireEvent.dragOver(dropzone(), transfer([png()]))).toBe(false)

    fireEvent.dragLeave(dropzone())
    expect(dropzone().dataset.dragActive).toBeUndefined()
  })

  it('이미지를 놓으면 업로드하고 썸네일 줄에 붙는다', async () => {
    const onUploadImages = vi.fn(async (files: File[]) =>
      files.map((file, index) => ({
        imageKey: `community/posts/new/${file.name}`,
        imageUrl: `https://minio.test/${file.name}`,
        sortOrder: index,
      })),
    )
    renderForm({ onUploadImages })

    fireEvent.dragEnter(dropzone(), transfer([png()]))
    await act(async () => {
      fireEvent.drop(dropzone(), transfer([png('a.png'), png('b.png')]))
    })

    expect(onUploadImages).toHaveBeenCalledOnce()
    expect(onUploadImages.mock.calls[0]![0].map(file => file.name)).toEqual([
      'a.png',
      'b.png',
    ])
    expect(dropzone().dataset.dragActive).toBeUndefined()
    expect(
      document.querySelector('img[src="https://minio.test/b.png"]'),
    ).not.toBeNull()
    expect(dropzone().textContent).toContain('2 / 5')
  })

  it('이미지가 아닌 파일은 올리지 않고 기존 안내를 낸다', async () => {
    const { props } = renderForm()

    await act(async () => {
      fireEvent.drop(
        dropzone(),
        transfer([new File(['x'], 'memo.txt', { type: 'text/plain' })]),
      )
    })

    expect(props.onUploadImages).not.toHaveBeenCalled()
    expect(alerts().join('\n')).toContain('memo.txt')
  })

  it('5장이 차면 드롭존은 aria-disabled 로 안내하고, 놓으면 「이미 5장」 이라고 말한다', async () => {
    const images = Array.from({ length: 5 }, (_, index) => ({
      imageKey: `community/posts/1/${index}.png`,
      imageUrl: `https://minio.test/${index}.png`,
      sortOrder: index,
    }))
    const { props } = renderForm({
      initialValue: { ...filled, images },
    })

    expect(dropzone().getAttribute('aria-disabled')).toBe('true')
    expect(dropzone().disabled).toBe(false)
    expect(dropzone().textContent).toContain('사진은 5장까지예요')

    await act(async () => {
      fireEvent.drop(dropzone(), transfer([png()]))
    })

    expect(props.onUploadImages).not.toHaveBeenCalled()
    expect(alerts()).toContain(
      '이미 5장을 첨부했어요. 지운 뒤에 다시 올려 주세요.',
    )
  })

  it('누르면 파일 창을 연다', () => {
    renderForm()
    const fileInput =
      document.querySelector<HTMLInputElement>('input[type="file"]')!
    const click = vi.spyOn(fileInput, 'click')

    fireEvent.click(dropzone())

    expect(click).toHaveBeenCalledOnce()
  })

  it('올리는 중에는 놓아도 받지 않는다', async () => {
    let finish: (images: never[]) => void = () => {}
    const onUploadImages = vi.fn(
      () =>
        new Promise<never[]>(resolve => {
          finish = resolve
        }),
    )
    renderForm({ onUploadImages })

    await act(async () => {
      fireEvent.drop(dropzone(), transfer([png('a.png')]))
    })
    expect(dropzone().getAttribute('aria-disabled')).toBe('true')

    fireEvent.dragEnter(dropzone(), transfer([png('b.png')]))
    expect(dropzone().dataset.dragActive).toBeUndefined()
    await act(async () => {
      fireEvent.drop(dropzone(), transfer([png('b.png')]))
    })

    expect(onUploadImages).toHaveBeenCalledOnce()
    await act(async () => {
      finish([])
    })
  })
})
