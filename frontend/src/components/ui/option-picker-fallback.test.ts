// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import OptionPicker from '@/components/ui/option-picker'

/* 검색 0건일 때 막다른 길 대신 대체 항목을 보여 주는 동작(#571). */

const services = Array.from({ length: 14 }, (_, index) => ({
  code: `S${index}`,
  name: `업종${index}`,
}))
const fallback = { label: '자주 찾는 업종', codes: ['S2', 'S5', 'NONE'] }

const mount = (props: Partial<Parameters<typeof OptionPicker>[0]> = {}) =>
  render(
    createElement(OptionPicker, {
      selectedCode: null,
      onSelect: () => {},
      items: services,
      ...props,
    }),
  )

const search = (value: string) =>
  fireEvent.change(screen.getByLabelText('이름으로 검색'), {
    target: { value },
  })

afterEach(cleanup)

describe('OptionPicker 0건 대체', () => {
  it('emptyFallback 이 없으면 안내 문구만 나온다', () => {
    mount()
    search('없는말')

    expect(screen.getByText('검색 결과가 없어요.')).toBeTruthy()
    expect(screen.queryByText('자주 찾는 업종')).toBeNull()
  })

  it('0건이면 안내 문구와 함께 목록에 있는 대체 항목만 보여 준다', () => {
    mount({ emptyFallback: fallback })
    search('없는말')

    expect(
      screen.getByText(
        '"없는말" 검색 결과가 없어요. 자주 찾는 업종 목록을 대신 보여 드려요.',
      ),
    ).toBeTruthy()
    expect(screen.getByRole('list', { name: '자주 찾는 업종' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '업종2' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '업종5' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '업종3' })).toBeNull()
  })

  it('대체 코드가 목록에 하나도 없으면 안내 문구만 나온다', () => {
    mount({ emptyFallback: { label: '자주 찾는 업종', codes: ['X', 'Y'] } })
    search('없는말')

    expect(screen.getByText('검색 결과가 없어요.')).toBeTruthy()
    expect(screen.queryByText(/대신 보여 드려요/)).toBeNull()
  })

  it('결과가 있으면 대체 항목을 보여 주지 않는다', () => {
    mount({ emptyFallback: fallback })
    search('업종3')

    expect(screen.queryByText(/대신 보여 드려요/)).toBeNull()
  })
})
