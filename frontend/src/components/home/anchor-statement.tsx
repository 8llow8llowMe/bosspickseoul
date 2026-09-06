'use client'

import styled from 'styled-components'
import { filledWordCount, pinnedPhase } from '@/components/home/scroll-fill'
import { useScrollProgress } from '@/components/home/use-scroll-progress'

/*
  카피 규칙(home.md S2 #3): 「구체·직설·전문 보이스 — 수식어 최소, 지표·동사 중심,
  AI 상투구·과장 배제」.

  두 번 고쳤다. 처음 문구는 「방대한 데이터」·「오직 당신만을 위한 맞춤형」으로 그 규칙이
  배제 대상으로 지목한 **수식어**를 그대로 썼다. 그것을 걷어낸 「감이 아니라 숫자로
  정합니다」는 수식어가 없는데도 여전히 공허했다 — **무엇을 정하는지가 문장에 없었기
  때문**이다. 규칙이 수식어만 금지 대상으로 적어 둔 탓에 이 형태(목적어 생략)를 못 걸렀다.

  그래서 이번에는 **도구 셋이 차례로 무엇을 해 주는지**를 적는다. 스크롤로 단어가
  채워지는 이 자리는 문장이 순차로 드러나므로, 하나의 선언보다 **과정**을 담기에 맞다.
  읽고 나면 이 서비스가 무엇을 해 주는지 알 수 있어야 한다.

  **세 문장 모두 주어를 갖는다.** 목적어만 되찾고 주어를 비워 두면 「봅니다 · 읽습니다 ·
  계산합니다」처럼 **누가 하는 일인지 모르는 문장**이 된다(사용자인지 서비스인지).
  그렇다고 브랜드명을 세 번 반복하면 그것대로 어색하므로, 첫 문장만 서비스 이름을 쓰고
  뒤 둘은 **그 일을 실제로 하는 도구**를 주어로 세운다 — 주어가 매번 있으면서 문장이
  겹치지 않고, 덤으로 어떤 도구가 어느 단계를 맡는지가 그대로 드러난다.
*/
export const ANCHOR_SENTENCES = [
  'BossPickSeoul은 서울 25개 자치구를 유동인구와 매출로 줄 세워 보여 줍니다.',
  '상권 분석은 고른 지역에서 내 업종의 매출이 얼마나 나오는지 알려 줍니다.',
  '창업 시뮬레이션은 임차료와 인건비를 뺀 뒤 이 가게가 매달 남길 돈을 계산합니다.',
] as const

/**
 * 문장별 단어와, 채우기 순서를 매길 **전체 기준 시작 번호**.
 *
 * 문장을 한 문단에 이어 붙이면 줄바꿈이 문장 가운데서 일어나 세 단계가 글 덩어리
 * 하나로 읽힌다. 문장마다 제 줄을 주되, 채우기는 **문장을 가로질러 이어져야** 하므로
 * (문장마다 0 부터 다시 세면 세 문장이 동시에 채워진다) 시작 번호를 함께 들고 다닌다.
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

  220 을 절반으로 줄인 것은 **한 문장**에 2.2 화면을 쓰고 있었기 때문이다. 지금은 세
  문장이 서비스 전체를 설명하므로 그만큼 되돌린다 — 그래도 220 보다는 짧다.
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
  세 문장이 되면서 가운데 정렬을 버렸다 — 줄 길이가 제각각인 여러 문장을 가운데로
  맞추면 줄 시작 위치가 매줄 달라져 눈이 다시 찾아야 한다(한 문장일 때는 문제가 아니었다).
  폭도 넓혀 문장 하나가 되도록 한 줄에 들어가게 한다.
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
