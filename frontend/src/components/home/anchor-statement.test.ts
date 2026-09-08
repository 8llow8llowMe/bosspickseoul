// src/components/home/anchor-statement.test.ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import AnchorStatement, {
  ANCHOR_SENTENCES,
} from '@/components/home/anchor-statement'

const renderText = (): string =>
  renderToStaticMarkup(createElement(AnchorStatement)).replace(/<[^>]+>/g, '')

describe('AnchorStatement', () => {
  it('앵커 문장 전체가 텍스트로 렌더된다(SR 낭독 보장)', () => {
    const text = renderText()

    // 하드코딩하지 않는다 — 정본은 ANCHOR_SENTENCES 하나뿐이다.
    for (const sentence of ANCHOR_SENTENCES) {
      expect(text).toContain(sentence)
    }
  })

  /*
   * 네 도구를 차례로 말한다. 예전 문구는 셋만 말해 **상권 추천이 빠져 있었다** —
   * 홈 헤더·도구 보드·스토리는 넷을 말하는데 앵커만 셋이라 어느 하나가 스토리에서
   * 처음 등장했다.
   */
  it('네 도구를 모두 말한다', () => {
    const text = renderText()

    for (const tool of [
      '구별 현황',
      '상권 분석',
      '상권 추천',
      '창업 시뮬레이션',
    ]) {
      expect(text).toContain(tool)
    }
  })

  /*
   * **이 파일이 존재하게 된 결함이다.** Statement 는 min(980px, 100%) 이고 글자가
   * 32px/700 이라 한 줄 예산이 980px 다. 예전 1·3번 문장이 1001px·1003px 로 겨우
   * 21px·23px 넘쳐, 마지막 한 어절(「줍니다.」·「계산합니다.」)만 다음 줄로 밀렸다 —
   * 서술어가 잘려 보이는 그 줄바꿈이 사용자 지적의 내용이었다.
   *
   * node 환경에서는 폰트가 없어 실제 폭을 잴 수 없으므로 **자릿수를 대리 지표로** 쓴다.
   * 실측 대조(1920, Pretendard 32px/700):
   *   넘친 문장 45자(1003px) · 46자(1001px) / 들어간 문장 최대 37자(850px).
   * 40자를 경계로 두면 둘이 갈린다. 폭·글자 크기를 바꾸면 이 상한도 다시 재야 한다.
   */
  it('문장이 한 줄 예산(980px ≈ 40자)을 넘지 않는다', () => {
    for (const sentence of ANCHOR_SENTENCES) {
      expect(sentence.length).toBeLessThanOrEqual(40)
    }
  })

  /*
   * DESIGN.md §10 — 합니다체는 「법적 고지에만 쓰는 단 하나의 예외」이고 기본은 해요체다
   * (앱 전체 해요체 258 : 합니다체 154). 앵커가 합니다체로 굳어 있어 이 섹션만 홈에서
   * 규칙 밖에 있었다. 되돌아오면 여기서 걸린다.
   */
  it('해요체로 끝난다', () => {
    for (const sentence of ANCHOR_SENTENCES) {
      expect(sentence).toMatch(/요\.$/)
      expect(sentence).not.toMatch(/(습니다|합니다|입니다)\.$/)
    }
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
  it('도구를 말하는 네 문장은 모두 주어를 갖는다', () => {
    /*
     * **마지막 한 줄은 일부러 뺀다.** 앞 넷은 「무엇이 무엇을 해 준다」라 도구가 주어여야
     * 하지만, 마지막 줄(「그래서 문을 열기 전에, …」)은 그 결과로 **읽는 사람이** 알게
     * 되는 것을 말하는 자리다. 여기에 주어를 박으면 서비스가 결과까지 보장하는 문장이
     * 되어 S2 #3 의 「과장 배제」에 걸린다.
     */
    const toolSentences = ANCHOR_SENTENCES.slice(0, -1)

    expect(toolSentences).toHaveLength(4)

    for (const sentence of toolSentences) {
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

    /*
     * 「성공적인」·「최적의」는 이번에 추가했다 — 사용자가 원한 「성공적인 창업으로
     * 이어진다」는 인상을 결과 보장으로 적으면 그것이 곧 과장이다. 마지막 줄은 대신
     * 서비스가 실제로 해 주는 것(문 열기 전에 판단할 재료)만 말한다.
     */
    for (const banned of [
      '방대한',
      '오직 당신만을',
      '맞춤형',
      '성공적인',
      '최적의',
    ]) {
      expect(text).not.toContain(banned)
    }
  })
})
