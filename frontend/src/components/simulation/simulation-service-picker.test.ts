// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import SimulationServicePicker from '@/components/simulation/simulation-service-picker'
import { simulationCatalog } from '@/data/simulation-catalog'

/*
  1023px 이하에서 고르지 않은 분류를 숨기는 것은 CSS(@media)라 jsdom 에서는 보이지 않는다.
  필터 줄은 기본이 display:none(1023px 이하에서만 보인다)이다.
  여기서는 배선 — 처음 펼칠 분류, 필터 상태, 검색 전환, 선택 콜백 — 을 본다.
  375px 높이는 브라우저 실측 몫이다.
*/

const renderPicker = (selectedCode: string | null = null) => {
  const onSelect = vi.fn()
  render(createElement(SimulationServicePicker, { selectedCode, onSelect }))
  return onSelect
}

/*
  필터 줄은 role 로 찾지 않는다. 숨겨진 요소는 자기 aria-label 이 있어도 접근성 이름이 빈
  문자열로 계산돼(accname 2A) `{ name, hidden: true }` 조회가 맞지 않는다.
*/
const filterRow = () =>
  document.querySelector<HTMLElement>('[role="group"][aria-label="업종 분류"]')

/** 필터 버튼은 「분류명 + 개수」라 이름이 앞부분으로 시작하는 것을 찾는다. */
const filter = (label: string) =>
  [...(filterRow()?.querySelectorAll<HTMLButtonElement>('button') ?? [])].find(
    button => button.textContent?.startsWith(label),
  )

afterEach(() => {
  cleanup()
})

describe('SimulationServicePicker', () => {
  it('카탈로그 대분류마다 소제목 묶음과 필터를 하나씩 둔다', () => {
    renderPicker()

    const categories = Object.keys(simulationCatalog)
    for (const category of categories) {
      expect(
        screen.getByRole('heading', { level: 3, name: category }),
      ).toBeTruthy()
      expect(filter(category)?.textContent).toBe(
        `${category}${simulationCatalog[category].length}`,
      )
    }
  })

  it('고른 업종이 없으면 첫 분류(음식점)를 펼친다', () => {
    renderPicker()

    expect(filter('음식점')?.getAttribute('aria-pressed')).toBe('true')
    expect(filter('학원')?.getAttribute('aria-pressed')).toBe('false')
  })

  /*
    다시 열었을 때 고른 업종이 다른 분류에 묻혀 있으면 사용자가 무엇을 골랐는지 확인하려고
    분류를 하나씩 눌러 봐야 한다.
  */
  it('고른 업종이 있으면 그 업종의 분류를 펼친다', () => {
    renderPicker('CS200002')

    expect(filter('학원')?.getAttribute('aria-pressed')).toBe('true')
    expect(filter('음식점')?.getAttribute('aria-pressed')).toBe('false')
  })

  /*
    분석 컨텍스트 「되돌리기」처럼 펼친 채로 업종이 밖에서 바뀌면, 고른 칩이 숨은 분류에
    묻히지 않게 분류가 따라간다. 검색어는 사용자가 쓰던 것이라 남긴다.
  */
  it('펼친 채로 업종이 밖에서 바뀌면 분류가 따라가고 검색어는 남긴다', () => {
    const onSelect = vi.fn()
    const view = render(
      createElement(SimulationServicePicker, {
        selectedCode: 'CS200028',
        onSelect,
      }),
    )
    expect(filter('서비스')?.getAttribute('aria-pressed')).toBe('true')

    view.rerender(
      createElement(SimulationServicePicker, {
        selectedCode: 'CS100001',
        onSelect,
      }),
    )

    expect(filter('음식점')?.getAttribute('aria-pressed')).toBe('true')
    expect(filter('서비스')?.getAttribute('aria-pressed')).toBe('false')
  })

  it('필터를 누르면 그 분류로 바뀐다', () => {
    renderPicker()

    fireEvent.click(filter('서비스') as HTMLButtonElement)

    expect(filter('서비스')?.getAttribute('aria-pressed')).toBe('true')
    expect(filter('음식점')?.getAttribute('aria-pressed')).toBe('false')
  })

  /*
    분류를 모르는 사람이 검색한다. 검색 중에 고른 분류만 보여 주면 다른 분류의 결과가 숨는다.
  */
  it('검색어가 있으면 분류를 무시하고 전체에서 거른다', () => {
    renderPicker()

    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: '학원' },
    })

    // 숨김 여부와 상관없이(필터 줄은 1023px 이하에서만 보인다) DOM 에서 빠져야 한다.
    expect(filterRow()).toBeNull()
    const results = screen.getByRole('list', { name: '업종 검색 결과' })
    expect(
      [...results.querySelectorAll('button')].map(button => button.title),
    ).toEqual(['일반교습학원', '외국어학원', '예술학원'])
  })

  it('검색 결과가 없으면 문구로 대신한다', () => {
    renderPicker()

    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: '없는업종' },
    })

    expect(screen.getByText("'없는업종'와 맞는 업종이 없어요.")).toBeTruthy()
  })

  it('칩을 누르면 그 업종 코드로 알린다', () => {
    const onSelect = renderPicker()

    fireEvent.click(screen.getByTitle('치킨전문점'))

    expect(onSelect).toHaveBeenCalledWith('CS100007')
  })
})
