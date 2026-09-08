import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import SimulationChoiceSearch from './simulation-choice-search'

const render = (props: Parameters<typeof SimulationChoiceSearch>[0]) =>
  renderToStaticMarkup(createElement(SimulationChoiceSearch, props))

const base = {
  label: '자치구 이름으로 찾기',
  value: '',
  shown: 25,
  total: 25,
  onChange: () => {},
}

describe('SimulationChoiceSearch', () => {
  it('라벨을 접근 이름으로 준다 — 시각 라벨 없이 placeholder 만 두지 않는다', () => {
    const html = render(base)

    expect(html).toContain('aria-label="자치구 이름으로 찾기"')
  })

  it('좁혀지지 않았으면 개수를 적지 않는다 — 25/25 는 정보가 없다', () => {
    expect(render(base)).not.toContain('25/25')
  })

  it('좁혀졌으면 남은 개수를 적는다', () => {
    expect(render({ ...base, value: '강', shown: 4 })).toContain('4/25')
  })
})
