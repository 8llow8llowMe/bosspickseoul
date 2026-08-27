import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import SimulationHistoryList from '@/components/simulation/simulation-history-list'
import type { SimulationHistoryItem } from '@/types/simulation'

const item = (
  overrides: Partial<SimulationHistoryItem> = {},
): SimulationHistoryItem => ({
  historyId: '12',
  franchisee: false,
  brandName: null,
  districtCode: '11740',
  districtName: '강동구',
  serviceCode: 'CS100001',
  serviceName: '한식음식점',
  storeSize: 66,
  floorType: { code: 'FIRST_FLOOR', name: '1층', description: '1층 점포' },
  totalPrice: 23_450,
  dataBaseYear: '2024',
  createdAt: '2026-08-20T09:12:33',
  ...overrides,
})

const render = (
  props: Partial<Parameters<typeof SimulationHistoryList>[0]> = {},
) =>
  renderToStaticMarkup(
    createElement(SimulationHistoryList, {
      histories: [item()],
      page: 0,
      totalPages: 1,
      onPageChange: vi.fn(),
      ...props,
    }),
  )

describe('SimulationHistoryList', () => {
  it('총비용을 만원 단위로 억 표기까지 눌러 보여준다', () => {
    // totalPrice 는 만원이다. 원 단위 포매터를 쓰면 정확히 10,000배 틀린다 (G1).
    expect(render()).toContain('2억 3,450만원')
  })

  it('조건 요약과 기준 연도를 함께 보여준다', () => {
    const html = render()

    expect(html).toContain('강동구 · 한식음식점 · 66㎡ · 1층')
    expect(html).toContain('2024년 기준')
  })

  it('개인 창업 이력은 리포트로 바로 보낸다', () => {
    const html = render()

    expect(html).toContain('리포트 보기')
    expect(html).toContain('/simulation/report?')
  })

  it('프랜차이즈 이력은 브랜드를 다시 고르라고 안내하고 입력 화면으로 보낸다', () => {
    // 저장 응답에 franchiseeId 가 없어 그대로는 재계산할 수 없다.
    const html = render({
      histories: [item({ franchisee: true, brandName: '테스트브랜드' })],
    })

    expect(html).toContain('브랜드 다시 고르기')
    expect(html).toContain('브랜드를 다시 골라야')
    expect(html).not.toContain('/simulation/report?')
  })

  it('빈 목록이면 시뮬레이션으로 데려간다', () => {
    const html = render({ histories: [], totalPages: 0 })

    expect(html).toContain('아직 저장한 결과가 없어요')
    expect(html).toContain('href="/simulation"')
  })

  it('삭제 버튼을 그리지 않는다', () => {
    // 삭제 API 가 없다 (G13). 버튼을 두면 누를 수 있는데 되돌릴 방법이 없다.
    expect(render()).not.toContain('삭제')
  })

  it('한 페이지뿐이면 페이지 이동을 그리지 않는다', () => {
    expect(render({ totalPages: 1 })).not.toContain('다음')
  })

  it('여러 페이지면 현재 위치와 이동 버튼을 준다', () => {
    const html = render({ page: 1, totalPages: 3 })

    expect(html).toContain('2 / 3')
    expect(html).toContain('이전')
    expect(html).toContain('다음')
  })

  it('첫 페이지의 이전, 마지막 페이지의 다음은 눌리지 않는다', () => {
    // 여는 태그를 뽑아 버튼별로 본다. disabled 개수만 세면 어느 버튼이 잠겼는지 알 수 없다.
    const openTag = (html: string, label: string) =>
      (html.match(/<button[^>]*>/g) ?? []).find(tag => tag.includes(label))

    const first = render({ page: 0, totalPages: 3 })
    expect(openTag(first, '이전 페이지')).toContain('disabled')
    expect(openTag(first, '다음 페이지')).not.toContain('disabled')

    const last = render({ page: 2, totalPages: 3 })
    expect(openTag(last, '이전 페이지')).not.toContain('disabled')
    expect(openTag(last, '다음 페이지')).toContain('disabled')
  })
})
