// src/components/home/anchor-statement.test.ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import AnchorStatement from '@/components/home/anchor-statement'

const renderText = (): string =>
  renderToStaticMarkup(createElement(AnchorStatement)).replace(/<[^>]+>/g, '')

describe('AnchorStatement', () => {
  it('앵커 문장 전체가 텍스트로 렌더된다(SR 낭독 보장)', () => {
    const text = renderText()

    expect(text).toContain(
      'BossPickSeoul은 서울 25개 자치구를 유동인구와 매출로 줄 세워 보여 줍니다.',
    )
    expect(text).toContain(
      '상권 분석은 고른 지역에서 내 업종의 매출이 얼마나 나오는지 알려 줍니다.',
    )
    expect(text).toContain(
      '창업 시뮬레이션은 임차료와 인건비를 뺀 뒤 이 가게가 매달 남길 돈을 계산합니다.',
    )
  })

  /*
   * home.md S2 #3 —「수식어 최소, 지표·동사 중심, AI 상투구·과장 배제」.
   * 이전 문구가 「방대한 데이터」·「오직 당신만을 위한 맞춤형」으로 그 규칙이 배제
   * 대상으로 지목한 표현을 그대로 썼다. 되돌아오면 여기서 걸린다.
   */
  /*
   * 사용자 지적으로 새로 생긴 규칙이다 — 「뭘 좁힌다는 거야」. 수식어를 걷어내도
   * **주어·목적어를 생략하면** 그럴듯하기만 하고 아무 정보가 없는 문장이 남는다.
   * 세 문장 모두 자기 주어를 갖는지 여기서 잠근다.
   */
  it('세 문장 모두 주어를 갖는다', () => {
    const sentences = renderText()
      .split('.')
      .map(part => part.trim())
      .filter(Boolean)

    expect(sentences).toHaveLength(3)

    for (const sentence of sentences) {
      /*
       * 주어는 한 어절이 아닐 수 있다(「상권 분석은」·「창업 시뮬레이션은」). 문장
       * 앞쪽 세 어절 안에 주격·주제 조사로 끝나는 말이 있는지로 본다 — 그마저 없으면
       * 주어를 생략한 문장이다.
       */
      const head = sentence.split(' ').slice(0, 3)
      expect(head.some(word => /(은|는|이|가)$/.test(word))).toBe(true)
    }
  })

  it('규칙이 배제한 상투구를 쓰지 않는다', () => {
    const text = renderText()

    for (const banned of ['방대한', '오직 당신만을', '맞춤형']) {
      expect(text).not.toContain(banned)
    }
  })
})
