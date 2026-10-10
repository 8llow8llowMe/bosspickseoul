// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import OptionPicker from '@/components/ui/option-picker'
import { OPTION_SEARCH_THRESHOLD } from '@/lib/option-filter'

/*
 * 이 파일이 지키는 것은 **검색 한 줄**이다. 이 컴포넌트에는 테스트가 없었는데
 * (#262 작업 중 확인) 상권분석 좌측 패널과 상권추천 조건 선택이 함께 쓰는 공용
 * 컴포넌트다. 자체 styled 검색을 걷고 TextField 로 갈아탈 때 조용히 잃을 수 있는
 * 것들 — 임계값·접근 이름·개수의 aria-live·라벨 있는 지우기 — 을 여기서 잠근다.
 *
 * 개수 문구와 지우기 버튼은 **검색어가 있어야** 나타난다. 검색어는 이 컴포넌트의
 * 내부 상태라 문자열 렌더로는 만들 수 없어 jsdom 에서 실제로 입력한다.
 *
 * 목록이 좁혀지는 필터링 자체는 순수 함수라 `option-filter.test.ts` 가 덮는다.
 */

const items = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    code: `C${index}`,
    name: `항목${index}`,
  }))

const mount = (props: Parameters<typeof OptionPicker>[0]) =>
  render(createElement(OptionPicker, props))

const base = { selectedCode: null, onSelect: () => {} }

afterEach(cleanup)

describe('OptionPicker 검색 한 줄', () => {
  it('선택지가 임계값을 넘을 때만 검색이 뜬다', () => {
    const { unmount } = mount({
      ...base,
      items: items(OPTION_SEARCH_THRESHOLD),
    })
    expect(screen.queryByLabelText('이름으로 검색')).toBeNull()
    unmount()

    mount({ ...base, items: items(OPTION_SEARCH_THRESHOLD + 1) })
    expect(screen.getByLabelText('이름으로 검색')).toBeTruthy()
  })

  it('검색칸이 접근 이름을 갖는다 — 시각 라벨 없이 placeholder 만 두지 않는다', () => {
    mount({ ...base, items: items(20), searchPlaceholder: '자치구 검색' })

    expect(screen.getByLabelText('자치구 검색')).toBeTruthy()
  })

  /*
    개수는 칸 **밖**에 aria-live 로 둔다. 칸 안(TextField 의 rightSlot)은 aria-hidden
    이고 describedby 로 이어 붙여도 값이 바뀔 때 읽어 주지 않는다 — 좁혀지는 과정을
    알려주는 것이 이 문구의 목적이라 live 영역을 잃으면 안 된다(#262).
  */
  it('좁혀지면 개수를 aria-live 영역으로 알린다', () => {
    mount({ ...base, items: items(20) })

    fireEvent.change(screen.getByLabelText('이름으로 검색'), {
      target: { value: '항목1' },
    })

    // 항목1 · 항목10~19 = 11개
    const live = screen.getByText('20개 중 11개')
    expect(live.getAttribute('aria-live')).toBe('polite')
  })

  it('검색어가 없으면 개수를 적지 않는다 — 20개 중 20개는 정보가 없다', () => {
    mount({ ...base, items: items(20) })

    expect(screen.queryByText('20개 중 20개')).toBeNull()
  })

  /*
    지우기는 TextField 의 onClear 로 넘긴다. `type="search"` 의 네이티브 ✕ 는 접근
    이름이 없어 그것만 남기면 스크린리더에서 지울 방법이 사라진다.
  */
  it('검색어를 넣으면 라벨 있는 지우기 버튼이 뜨고, 누르면 비워진다', () => {
    mount({ ...base, items: items(20) })
    const input = screen.getByLabelText('이름으로 검색') as HTMLInputElement

    expect(screen.queryByLabelText('검색어 지우기')).toBeNull()

    fireEvent.change(input, { target: { value: '항목3' } })
    fireEvent.click(screen.getByLabelText('검색어 지우기'))

    expect(input.value).toBe('')
    expect(screen.queryByLabelText('검색어 지우기')).toBeNull()
  })
})

/*
 * 상권분석 모바일 시트(#648)는 검색 칸을 시트 머리 아래 고정 자리에 그리고 검색어만 넘긴다.
 * 그때 목록 위에 검색 칸이 또 서면 안 되고, 넘긴 검색어로 걸러야 한다.
 */
describe('OptionPicker 바깥 검색어(externalQuery)', () => {
  it('검색 칸을 그리지 않고 넘긴 검색어로 거른다', () => {
    mount({ ...base, items: items(20), externalQuery: '항목1' })

    expect(screen.queryByRole('searchbox')).toBeNull()
    expect(screen.queryByLabelText('이름으로 검색')).toBeNull()
    // 항목1, 항목10~항목19 = 11개
    expect(screen.getAllByRole('button').length).toBe(11)
    expect(screen.getByText('20개 중 11개')).toBeTruthy()
  })

  it('빈 검색어면 전부 보인다', () => {
    mount({ ...base, items: items(20), externalQuery: '' })

    expect(screen.queryByRole('searchbox')).toBeNull()
    expect(screen.getAllByRole('button').length).toBe(20)
  })
})
