import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it } from 'vitest'

import DataSources, { DATA_SOURCES } from '@/components/home/data-sources'
import { formatPeriodCode } from '@/lib/analysis/presentation'
import { ANALYSIS_PERIOD_CODE } from '@/lib/analysis/selection'

const render = () => renderToStaticMarkup(createElement(DataSources))

const renderStyles = (): string => {
  const sheet = new ServerStyleSheet()
  try {
    renderToStaticMarkup(sheet.collectStyles(createElement(DataSources)))
    return sheet.getStyleTags().replace(/\s+/g, '')
  } finally {
    sheet.seal()
  }
}

describe('DataSources — 카드 (TC-DS-001)', () => {
  it('출처 카드 세 장에 기관명을 싣는다', () => {
    const html = render()

    for (const org of [
      '서울 열린데이터광장',
      '공정거래위원회',
      '한국부동산원',
    ]) {
      expect(html).toContain(`>${org}</h3>`)
    }
  })

  /* 공공기관 상징은 사용 규정이 있다 — 텍스트 이름 + 일반 아이콘만 쓴다. */
  it('기관 로고 이미지를 쓰지 않는다', () => {
    expect(render()).not.toContain('<img')
  })

  it('카드마다 그 데이터를 쓰는 판단 단계를 단다', () => {
    expect(DATA_SOURCES.map(source => source.steps)).toEqual([
      ['01', '02', '03'],
      ['04'],
      ['04'],
    ])
  })
})

describe('DataSources — 원문 링크 (TC-DS-002)', () => {
  /* backend 문서가 인용한 주소만 쓴다(data-sources.md D4-4) — 지어내지 않는다. */
  it('공식 원문 주소 세 곳으로, 새 탭 · noopener 로 나간다', () => {
    const html = render()
    const links = [...html.matchAll(/<a [^>]*>/g)].map(([tag]) => tag)

    expect(links).toHaveLength(3)
    for (const tag of links) {
      expect(tag).toContain('target="_blank"')
      expect(tag).toContain('rel="noopener noreferrer"')
    }
    expect(DATA_SOURCES.map(source => source.href)).toEqual([
      'https://data.seoul.go.kr/dataList/OA-15572/S/1/datasetView.do',
      'https://www.data.go.kr/data/15110293/openapi.do',
      'https://www.data.go.kr/data/15069766/fileData.do',
    ])
  })

  it('링크 이름이 어떤 원문인지와 새 탭이라는 것을 말한다', () => {
    for (const source of DATA_SOURCES) {
      expect(source.linkLabel).toMatch(/원문 보기\(새 탭\)$/)
      expect(source.linkLabel).toContain(source.org.split(' ')[0])
    }
  })
})

describe('DataSources — 기준 시점과 고지 (TC-DS-003 · 004)', () => {
  it('기준 분기는 분석·추천이 쓰는 분기 상수에서 오고, 범위를 적는다', () => {
    expect(render()).toContain(
      `${formatPeriodCode(ANALYSIS_PERIOD_CODE)} 기준 · 분석·추천`,
    )
  })

  it('04 예시가 대표값이라는 것을 밝힌다', () => {
    expect(render()).toContain('홈의 04 예시는 이 데이터로 만든 대표값이에요.')
  })

  it('문장은 해요체다', () => {
    const html = render()

    expect(html).not.toMatch(/니다\s*[.!?]/)
  })
})

describe('DataSources — 움직임이 없다 (TC-DS-005)', () => {
  it('애니메이션·키프레임을 쓰지 않는다', () => {
    const css = renderStyles()

    expect(css).not.toContain('animation')
    expect(css).not.toContain('@keyframes')
  })
})
