'use client'

import styled from 'styled-components'
import { filledWordCount, pinnedPhase } from '@/components/home/scroll-fill'
import { useScrollProgress } from '@/components/home/use-scroll-progress'

/*
  카피 규칙(home.md S2 #3): 「구체·직설·전문 보이스 — 수식어 최소, 지표·동사 중심,
  AI 상투구·과장 배제」.

  세 번 고쳤다. 처음 문구는 「방대한 데이터」·「오직 당신만을 위한 맞춤형」으로 그 규칙이
  배제 대상으로 지목한 **수식어**를 그대로 썼다. 그것을 걷어낸 「감이 아니라 숫자로
  정합니다」는 수식어가 없는데도 여전히 공허했다 — **무엇을 정하는지가 문장에 없었기
  때문**이다. 세 번째(이번)는 그 둘을 지키면서 **말투와 줄바꿈**을 고친다.

  **왜 해요체인가.** 앱 전체를 세어 보면 해요체 258곳 : 합니다체 154곳으로 해요체가
  기본이고, DESIGN.md §10 은 합니다체를 「법적 고지에만 쓰는 단 하나의 예외」로 못박아
  뒀다. 홈 랜딩만 합니다체로 굳어 있었다 — 이 문장이 딱딱했던 것은 취향이 아니라
  **규칙에서 벗어나 있었기 때문**이다. (홈의 나머지 문장은 아직 합니다체다. 페이지 안에서
  말투가 갈리는 것은 알고 남긴 빚이고, 별도 이슈로 다룬다.)

  **왜 다섯 문장인가.** 도구는 넷인데 예전 문구는 셋만 말해 **상권 추천이 빠져 있었다.**
  네 도구를 차례로 적고 마지막 한 줄이 그래서 무엇을 알게 되는지를 말한다 — 도구를
  하나씩 쓰다 보면 자리가 정해진다는 흐름이 문장 순서 그대로 읽힌다.

  **마지막 줄은 약속이 아니라 사실이다.** 「성공적인 창업」처럼 결과를 보장하는 말은 S2 #3
  의 「과장 배제」에 걸린다. 대신 이 서비스가 실제로 해 주는 것(문을 열기 전에 판단할
  재료를 준다)만 적는다.

  ⚠️ **한 문장은 한 줄에 들어가야 한다.** `Statement` 가 `min(980px, 100%)` 이고 글자가
  32px/700 이라 한 줄 예산이 **980px** 다. 예전 1·3번 문장은 각각 **1001px·1003px** 로
  겨우 21px·23px 넘쳤고, 그 20px 때문에 마지막 한 어절(「줍니다.」·「계산합니다.」)만
  다음 줄로 밀려 서술어가 잘려 보였다. 실측(1920): 새 다섯 문장은 806·802·614·850·664px.
  길이 상한은 `anchor-statement.test.ts` 가 자릿수로 잠근다.
*/
export const ANCHOR_SENTENCES = [
  '구별 현황은 서울 자치구 25곳을 유동인구와 매출로 줄 세워 줘요.',
  '상권 분석은 고른 지역에서 내 업종이 얼마나 버는지 보여 주고요.',
  '상권 추천은 조건에 맞는 상권만 후보로 남겨요.',
  '창업 시뮬레이션은 임차료와 인건비를 뺀 뒤 남을 돈까지 계산해요.',
  '그래서 문을 열기 전에, 이 자리가 맞는지 알 수 있어요.',
] as const

/**
 * 문장별 단어와, 채우기 순서를 매길 **전체 기준 시작 번호**.
 *
 * 문장을 한 문단에 이어 붙이면 줄바꿈이 문장 가운데서 일어나 다섯 단계가 글 덩어리
 * 하나로 읽힌다. 문장마다 제 줄을 주되, 채우기는 **문장을 가로질러 이어져야** 하므로
 * (문장마다 0 부터 다시 세면 다섯 문장이 한꺼번에 채워진다) 시작 번호를 함께 들고 다닌다.
 */
const SENTENCES = ANCHOR_SENTENCES.reduce<
  { words: string[]; offset: number }[]
>((acc, sentence) => {
  const previous = acc[acc.length - 1]
  const offset = previous ? previous.offset + previous.words.length : 0
  return [...acc, { words: sentence.split(' '), offset }]
}, [])

const WORD_COUNT = SENTENCES.reduce((sum, s) => sum + s.words.length, 0)

/**
 * pin 구간 중 채우기에 쓰는 비율. 남은 20% 는 **다 칠해진 문장을 그대로 두는 시간**이다.
 *
 * 이 값을 두는 이유: 채우기가 pin 이 풀리는 순간까지 이어지면, 마지막 단어가 칠해지는
 * 것과 글이 위로 흘러가는 것이 동시에 일어나 **다 읽었다는 느낌 없이 사라진다.**
 */
const FILL_PORTION = 0.8

/*
  트랙 높이 이력: 220 → 150 → **200dvh**.

  220 을 절반으로 줄인 것은 **한 문장**에 2.2 화면을 쓰고 있었기 때문이다. 지금은 다섯
  문장이 서비스 전체를 설명하므로 그만큼 되돌린다 — 그래도 220 보다는 짧다.

  **문장이 셋에서 다섯으로 늘어도 이 값은 그대로 둔다.** 채우기가 끝나는 지점은
  `FILL_PORTION`(pin 구간의 80%)이라 단어 수와 무관하다 — 단어가 늘면 칠해지는 결이
  고와질 뿐 더 빨리 끝나지 않는다.
  100dvh 까지 줄일 수 없는 이유는 그대로다: sticky 핀 구간이 0 이 되어 단어 채우기
  효과가 아예 돌지 않는다.
*/
const Track = styled.div`
  height: 200dvh;

  @media (max-width: 640px) {
    height: 190dvh;
  }

  @media (prefers-reduced-motion: reduce) {
    height: auto;
  }
`

const Sticky = styled.div`
  position: sticky;
  top: 0;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 96px 20px;

  @media (max-width: 768px) {
    padding: 72px 20px;
  }

  @media (max-width: 640px) {
    padding: 56px 16px;
  }

  @media (prefers-reduced-motion: reduce) {
    position: static;
    min-height: auto;
    padding: 120px 20px;
  }
`

/*
  여러 문장이 되면서 가운데 정렬을 버렸다 — 줄 길이가 제각각인 여러 문장을 가운데로
  맞추면 줄 시작 위치가 매줄 달라져 눈이 다시 찾아야 한다(한 문장일 때는 문제가 아니었다).
  폭도 넓혀 문장 하나가 되도록 한 줄에 들어가게 한다 — 그 980px 이 카피 길이의 상한이다.
*/
const Statement = styled.p`
  display: grid;
  gap: 10px;
  width: min(980px, 100%);
  margin: 0;
  text-align: left;
  font-size: 32px;
  font-weight: 700;
  line-height: 1.5;
  word-break: keep-all;
  will-change: transform, opacity;

  @media (max-width: 768px) {
    font-size: 28px;
  }

  @media (max-width: 640px) {
    font-size: 24px;
  }

  @media (max-width: 480px) {
    font-size: 21px;
  }
`

/* 문장 하나 = 한 줄. 안에서 넘치면 그 문장 안에서만 접힌다. */
const Sentence = styled.span`
  display: block;
  word-break: keep-all;
`

const Word = styled.span<{ $filled: boolean }>`
  color: ${p =>
    p.$filled ? 'var(--color-text-900)' : 'var(--color-border-200)'};
  transition: color var(--motion-standard) var(--ease-standard);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export default function AnchorStatement() {
  const {
    ref: trackRef,
    progress,
    trackHeight,
    viewportHeight,
  } = useScrollProgress()

  /*
    단계는 **pin 구간을 기준으로** 잰다. progress 상수로 못박으면 트랙 높이가 바뀔 때
    어긋난다 — 실제로 어긋나 있어서 글이 가운데 멈추기 전에 칠해지기 시작했고, 다
    칠해지기 전에 위로 밀려 올라갔다.
  */
  const { enter, fill } = pinnedPhase(
    progress,
    trackHeight,
    viewportHeight,
    FILL_PORTION,
  )
  const filled = filledWordCount(fill, WORD_COUNT)

  return (
    <Track ref={trackRef}>
      <Sticky>
        <Statement
          style={{
            opacity: enter,
            transform: `translateY(${(1 - enter) * 36}px)`,
          }}
        >
          {SENTENCES.map(sentence => (
            <Sentence key={sentence.offset}>
              {sentence.words.map((word, index) => (
                <Word
                  key={`${word}-${index}`}
                  $filled={sentence.offset + index < filled}
                >
                  {word}
                  {index < sentence.words.length - 1 ? ' ' : ''}
                </Word>
              ))}
            </Sentence>
          ))}
        </Statement>
      </Sticky>
    </Track>
  )
}
