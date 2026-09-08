import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import SimulationConditionSectionCard from './simulation-condition-section'

const render = (
  over: Partial<Parameters<typeof SimulationConditionSectionCard>[0]> = {},
) =>
  renderToStaticMarkup(
    // children이 필수 prop이라 Partial<Props> 오버라이드(over)와 병합하려면
    // 세 번째 인자가 아니라 프롭 객체 안에 있어야 한다.
    // eslint-disable-next-line react/no-children-prop
    createElement(SimulationConditionSectionCard, {
      id: 'simulation-section-district',
      index: 2,
      title: '자치구',
      complete: false,
      expanded: true,
      summary: null,
      children: createElement('p', null, '내용'),
      ...over,
    }),
  )

describe('SimulationConditionSectionCard', () => {
  it('펼쳐지면 내용을 그리고 aria-expanded 가 true 다', () => {
    const html = render()

    expect(html).toContain('내용')
    expect(html).toContain('aria-expanded="true"')
  })

  it('접히면 내용을 그리지 않고 고른 값을 한 줄로 보여준다', () => {
    const html = render({ expanded: false, complete: true, summary: '강남구' })

    expect(html).not.toContain('내용')
    expect(html).toContain('강남구')
    expect(html).toContain('변경')
    expect(html).toContain('aria-expanded="false"')
  })

  /*
    잠긴 단계를 button 으로 두면 눌러도 아무 일이 없는 컨트롤이 생긴다.
    누를 수 없는 것은 button 이 아니어야 한다.
  */
  it('잠기면 버튼이 아니다', () => {
    const html = render({
      expanded: false,
      locked: true,
      summary: '업종을 고르면 열려요',
    })

    expect(html).not.toContain('<button')
    expect(html).toContain('업종을 고르면 열려요')
  })

  it('아직 안 고른 단계는 변경이 아니라 안내를 적는다', () => {
    const html = render({ expanded: false, summary: null })

    expect(html).toContain('선택 전')
    expect(html).not.toContain('변경')
  })

  /*
    펼쳤을 때 설명은 wrap 되는 블록이어야 한다. Head 안의 1줄 슬롯에 넣으면
    375px 에서 잘린다(실측).
  */
  it('펼쳐지면 설명이 헤더 밖 블록으로 나온다', () => {
    const html = render({ description: '자치구별 임대료 기준으로 계산해요.' })

    expect(html).toContain('자치구별 임대료 기준으로 계산해요.')
    expect(html).not.toContain('선택 전')
  })

  /* 헤딩이 없으면 스크린리더의 섹션 탐색이 끊긴다. */
  it('제목이 헤딩 안에 있다', () => {
    expect(render()).toMatch(/<h2[^>]*>[\s\S]*자치구[\s\S]*<\/h2>/)
  })
})
