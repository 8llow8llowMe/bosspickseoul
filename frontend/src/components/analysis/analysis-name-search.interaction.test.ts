// @vitest-environment jsdom
import { createElement } from 'react'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

/* 기본 장소 검색은 카카오 SDK 를 부른다. 테스트는 항상 `searchPlaces` 를 넘기지만 import 만으로도
   env·SDK 로더가 실리지 않게 걷어 낸다. */
vi.mock('@/lib/analysis/place-search', () => ({
  searchSeoulPlaces: vi.fn(async () => []),
}))

import AnalysisNameSearch, {
  NAME_SEARCH_LABEL,
  type AnalysisNameSearchProps,
} from '@/components/analysis/analysis-name-search'
import type {
  NameSearchAreaEntry,
  NameSearchPlace,
} from '@/lib/analysis/name-search'

/*
  이름 검색 콤보박스(#596) — WAI-ARIA 목록형 자동완성. 포커스는 입력칸에 있고 ↑↓ 가 고른 항목을
  aria-activedescendant 로 가리키며, Enter 로 확정·Esc 로 닫는다.
*/

const entries: NameSearchAreaEntry[] = [
  { kind: 'district', code: '11440', name: '마포구' },
  {
    kind: 'administration',
    code: '11440690',
    name: '망원1동',
    context: '마포구',
  },
  {
    kind: 'administration',
    code: '11440700',
    name: '망원2동',
    context: '마포구',
  },
]

const station: NameSearchPlace = {
  kind: 'place',
  id: 'p1',
  name: '망원역 6호선',
  category: '지하철역',
  address: '서울 마포구 월드컵로 지하 77',
  point: { lng: 126.9106, lat: 37.556 },
}

const renderSearch = (overrides: Partial<AnalysisNameSearchProps> = {}) => {
  const onPick = vi.fn(async () => ({ ok: true as const }))
  const searchPlaces = vi.fn(async () => [station])
  render(
    createElement(AnalysisNameSearch, {
      entries,
      onPick,
      searchPlaces,
      debounceMs: 0,
      ...overrides,
    }),
  )
  const input = screen.getByRole('combobox', { name: NAME_SEARCH_LABEL })
  return { input, onPick, searchPlaces }
}

const type = async (input: HTMLElement, value: string) => {
  await act(async () => {
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value } })
  })
}

const key = async (input: HTMLElement, name: string) => {
  await act(async () => {
    fireEvent.keyDown(input, { key: name })
  })
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('이름 검색 콤보박스', () => {
  it('콤보박스 속성을 갖추고 목록을 가리킨다', () => {
    const { input } = renderSearch()

    expect(input.getAttribute('aria-expanded')).toBe('false')
    expect(input.getAttribute('aria-autocomplete')).toBe('list')
    const listbox = document.getElementById(
      input.getAttribute('aria-controls')!,
    )
    expect(listbox?.getAttribute('role')).toBe('listbox')
  })

  it('지역 이름 결과 뒤에 장소 결과를 붙인다', async () => {
    const { input, searchPlaces } = renderSearch()
    await type(input, '망원')

    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3))
    expect(searchPlaces).toHaveBeenCalledWith('망원')
    expect(input.getAttribute('aria-expanded')).toBe('true')
    expect(
      screen.getAllByRole('option').map(option => option.textContent),
    ).toEqual([
      '망원1동마포구행정동',
      '망원2동마포구행정동',
      '망원역 6호선서울 마포구 월드컵로 지하 77지하철역',
    ])
  })

  it('↓↑ 로 고른 항목을 aria-activedescendant 로 가리키고 끝에서 돌아간다', async () => {
    const { input } = renderSearch()
    await type(input, '망원')
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3))
    const options = screen.getAllByRole('option')

    await key(input, 'ArrowDown')
    expect(input.getAttribute('aria-activedescendant')).toBe(options[0].id)
    expect(options[0].getAttribute('aria-selected')).toBe('true')

    await key(input, 'ArrowDown')
    await key(input, 'ArrowDown')
    expect(input.getAttribute('aria-activedescendant')).toBe(options[2].id)

    await key(input, 'ArrowDown')
    expect(input.getAttribute('aria-activedescendant')).toBe(options[0].id)

    await key(input, 'ArrowUp')
    expect(input.getAttribute('aria-activedescendant')).toBe(options[2].id)
  })

  it('Enter 는 가리킨 항목을 고르고 칸을 비운다', async () => {
    const { input, onPick } = renderSearch()
    await type(input, '망원')
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3))

    await key(input, 'ArrowDown')
    await key(input, 'ArrowDown')
    await key(input, 'Enter')

    expect(onPick).toHaveBeenCalledTimes(1)
    expect(onPick).toHaveBeenCalledWith(entries[2])
    await waitFor(() => expect((input as HTMLInputElement).value).toBe(''))
    expect(input.getAttribute('aria-expanded')).toBe('false')
  })

  it('아무것도 가리키지 않은 Enter 는 고르지 않는다', async () => {
    const { input, onPick } = renderSearch()
    await type(input, '망원')
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3))
    await key(input, 'Enter')
    expect(onPick).not.toHaveBeenCalled()
  })

  it('Esc 는 열린 목록을 닫고, 닫힌 뒤 한 번 더 누르면 검색어를 지운다', async () => {
    const { input } = renderSearch()
    await type(input, '망원')
    await waitFor(() =>
      expect(input.getAttribute('aria-expanded')).toBe('true'),
    )

    await key(input, 'Escape')
    expect(input.getAttribute('aria-expanded')).toBe('false')
    expect((input as HTMLInputElement).value).toBe('망원')

    await key(input, 'Escape')
    expect((input as HTMLInputElement).value).toBe('')
  })

  it('결과가 없으면 검색어를 넣어 안내한다', async () => {
    const { input } = renderSearch({ searchPlaces: vi.fn(async () => []) })
    await type(input, '없는동네')

    // 검색어 뒤에 조사를 붙이지 않는다 — 「강남역와」처럼 받침과 어긋나지 않게.
    const text =
      '「없는동네」 이름에 맞는 상권·지하철역·동을 찾지 못했습니다. 다른 이름으로 다시 찾아 주세요.'
    // 보이는 안내는 입력칸의 설명으로 이어지고, 같은 문장을 라이브 영역이 읽어 준다.
    await waitFor(() => {
      const describedBy = input.getAttribute('aria-describedby') ?? ''
      const texts = describedBy
        .split(' ')
        .map(id => document.getElementById(id)?.textContent)
      expect(texts).toContain(text)
    })
    expect(screen.getByRole('status').textContent).toBe(text)
    expect(input.getAttribute('aria-expanded')).toBe('false')
  })

  it('장소 검색이 실패해도 지역 이름 결과는 보이고 이유를 적는다', async () => {
    const { input } = renderSearch({
      searchPlaces: vi.fn(async () => {
        throw new Error('sdk')
      }),
    })
    await type(input, '망원')

    expect(
      await screen.findByText(
        '지하철역·장소 검색을 지금 쓸 수 없어 상권·동 이름에서만 찾았습니다.',
      ),
    ).toBeTruthy()
    expect(screen.getAllByRole('option')).toHaveLength(2)
  })

  it('장소 검색이 실패하고 지역 이름도 0건이면 두 사실을 함께 알린다', async () => {
    const { input } = renderSearch({
      searchPlaces: vi.fn(async () => {
        throw new Error('sdk')
      }),
    })
    await type(input, '강남역')

    const text =
      '지하철역·장소 검색을 지금 쓸 수 없고, 상권·동 이름에서도 「강남역」 이름에 맞는 곳을 찾지 못했습니다. 잠시 후 다시 찾아 주세요.'
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe(text),
    )
    expect(screen.getAllByText(text).length).toBeGreaterThan(0)
  })

  it('결과 개수는 장소 응답까지 다 온 뒤에 읽고, 그 전에는 찾는 중이라고 읽는다', async () => {
    let resolvePlaces: (items: NameSearchPlace[]) => void = () => undefined
    const { input } = renderSearch({
      searchPlaces: vi.fn(
        () =>
          new Promise<NameSearchPlace[]>(resolve => {
            resolvePlaces = resolve
          }),
      ),
    })
    await type(input, '망원')

    // 지역 이름 결과 두 건은 먼저 보이지만, 개수는 아직 읽지 않는다.
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2))
    expect(screen.getByRole('status').textContent).toBe(
      '검색어와 맞는 이름을 찾고 있습니다.',
    )

    await act(async () => {
      resolvePlaces([station])
    })
    expect(screen.getByRole('status').textContent).toBe(
      '검색 결과 3개가 있습니다. 위아래 방향키로 고를 수 있습니다.',
    )
  })

  it('늦게 온 이전 검색어의 장소 응답은 버린다', async () => {
    const pending = new Map<string, (items: NameSearchPlace[]) => void>()
    const { input } = renderSearch({
      searchPlaces: vi.fn(
        (keyword: string) =>
          new Promise<NameSearchPlace[]>(resolve => {
            pending.set(keyword, resolve)
          }),
      ),
    })
    await type(input, '망원')
    await waitFor(() => expect(pending.has('망원')).toBe(true))
    await type(input, '합정')
    await waitFor(() => expect(pending.has('합정')).toBe(true))

    // 새 검색어의 응답이 먼저 오고, 이전 검색어의 응답이 뒤늦게 온다.
    await act(async () => {
      pending.get('합정')!([{ ...station, id: 'p2', name: '합정역 2호선' }])
    })
    await act(async () => {
      pending.get('망원')!([station])
    })

    expect(
      screen.getAllByRole('option').map(option => option.textContent),
    ).toEqual(['합정역 2호선서울 마포구 월드컵로 지하 77지하철역'])
  })

  it('고르는 중에 다시 누르면 무시한다', async () => {
    let finish: () => void = () => undefined
    const onPick = vi.fn(
      () =>
        new Promise<{ ok: true }>(resolve => {
          finish = () => resolve({ ok: true })
        }),
    )
    const { input } = renderSearch({ onPick })
    await type(input, '망원')
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3))

    const option = screen.getAllByRole('option')[2]
    await act(async () => {
      fireEvent.click(option)
    })
    await act(async () => {
      fireEvent.click(option)
      fireEvent.keyDown(input, { key: 'ArrowDown' })
      fireEvent.keyDown(input, { key: 'Enter' })
    })
    expect(onPick).toHaveBeenCalledTimes(1)

    await act(async () => {
      finish()
    })
    await waitFor(() => expect((input as HTMLInputElement).value).toBe(''))
  })

  it('다른 선택에 밀려 취소된 고르기는 알리지 않고 칸을 남긴다', async () => {
    const { input } = renderSearch({
      onPick: vi.fn(async () => ({
        ok: false as const,
        cancelled: true as const,
      })),
    })
    await type(input, '망원')
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3))
    await act(async () => {
      fireEvent.click(screen.getAllByRole('option')[0])
    })

    expect(screen.queryByRole('alert')).toBeNull()
    expect((input as HTMLInputElement).value).toBe('망원')
  })

  it('고른 곳을 반영하지 못하면 칸을 남기고 이유를 알린다', async () => {
    const { input } = renderSearch({
      onPick: vi.fn(async () => ({
        ok: false as const,
        message:
          '서울 상권·행정동 경계 안에서 「망원역 6호선」 위치를 찾지 못했습니다.',
      })),
    })
    await type(input, '망원')
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3))
    await act(async () => {
      fireEvent.click(screen.getAllByRole('option')[2])
    })

    expect((await screen.findByRole('alert')).textContent).toContain(
      '「망원역 6호선」 위치를 찾지 못했습니다',
    )
    expect((input as HTMLInputElement).value).toBe('망원')
  })

  it('타자가 멈출 때까지 장소 검색을 미룬다(디바운스)', async () => {
    vi.useFakeTimers()
    const searchPlaces = vi.fn(async () => [])
    const { input } = renderSearch({ searchPlaces, debounceMs: 250 })

    await type(input, '망')
    await type(input, '망원')
    await act(async () => {
      vi.advanceTimersByTime(200)
    })
    expect(searchPlaces).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(60)
    })
    expect(searchPlaces).toHaveBeenCalledTimes(1)
    expect(searchPlaces).toHaveBeenCalledWith('망원')
  })
})

/*
  모바일 시트(#648)는 도움말 줄을 빼고 보이는 라벨은 화면에서만 감춘다. 이름은 그대로여야 한다 —
  `<label>` 안의 라벨 글자와 aria-label 이 남아 「상권·지하철역·동 이름으로 찾기」로 읽힌다.
*/
describe('이름 검색 칸 — compact (모바일 시트)', () => {
  it('도움말은 없고 라벨 연결·접근 이름은 남는다', () => {
    const { input } = renderSearch({ compact: true })

    expect(input.getAttribute('aria-label')).toBe(NAME_SEARCH_LABEL)
    expect(input.closest('label')?.textContent).toContain(NAME_SEARCH_LABEL)
    expect(
      screen.queryByText('자치구 이름도 이 칸에서 찾을 수 있습니다.'),
    ).toBeNull()
    expect(input.getAttribute('aria-describedby')).toBeNull()
  })

  it('기본(데스크톱)은 도움말을 그대로 둔다', () => {
    renderSearch()
    expect(
      screen.getByText('자치구 이름도 이 칸에서 찾을 수 있습니다.'),
    ).toBeTruthy()
  })
})
