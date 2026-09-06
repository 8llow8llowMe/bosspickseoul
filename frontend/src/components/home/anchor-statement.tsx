'use client'

import styled from 'styled-components'
import { filledWordCount } from '@/components/home/scroll-fill'
import { useScrollProgress } from '@/components/home/use-scroll-progress'

/*
  카피 규칙(home.md S2 #3): 「구체·직설·전문 보이스 — 수식어 최소, 지표·동사 중심,
  AI 상투구·과장 배제」.

  두 번 고쳤다. 처음 문구는 「방대한 데이터」·「오직 당신만을 위한 맞춤형」으로 그 규칙이
  배제 대상으로 지목한 **수식어**를 그대로 썼다. 그것을 걷어낸 「감이 아니라 숫자로
  정합니다」는 수식어가 없는데도 여전히 공허했다 — **무엇을 정하는지가 문장에 없었기
  때문**이다. 규칙이 수식어만 금지 대상으로 적어 둔 탓에 이 형태(목적어 생략)를 못 걸렀다.

  그래서 이번에는 **서비스가 답해 주는 질문 세 개를 순서대로** 적는다. 스크롤로 단어가
  채워지는 이 자리는 문장이 순차로 드러나므로, 하나의 선언보다 **과정**을 담기에 맞다.
  읽고 나면 이 서비스가 무엇을 해 주는지 알 수 있어야 한다.
*/
const ANCHOR_COPY = [
  '서울 어느 자치구에 사람이 모이는지 봅니다.',
  '그 자리에서 내 업종이 얼마나 파는지 읽습니다.',
  '그 가게가 한 달에 얼마를 남기는지 계산합니다.',
].join(' ')
const WORDS = ANCHOR_COPY.split(' ')

/*
  트랙 진행도(0~1)를 구간별로 매핑한다.
  0~ENTER_END: 아래에서 올라오며 등장 / FILL_START~FILL_END: 고정된 채 채우기 /
  이후: 채워진 채 위로 퇴장.

  문장이 한 줄에서 세 줄로 늘었다(9단어 → 22단어). 채우기 구간을 그대로 두면 단어가
  훨씬 빠르게 지나가 **읽기 전에 다 채워진다.** 등장을 앞당기고 채우기를 트랙 끝까지
  넓혀, 스크롤 속도가 아니라 문장 길이에 맞춰 채워지게 한다.
*/
const ENTER_END = 0.12
const FILL_START = 0.16
const FILL_END = 0.86

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

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

const Word = styled.span<{ $filled: boolean }>`
  color: ${p =>
    p.$filled ? 'var(--color-text-900)' : 'var(--color-border-200)'};
  transition: color var(--motion-standard) var(--ease-standard);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export default function AnchorStatement() {
  const { ref: trackRef, progress } = useScrollProgress()

  const enter = clamp01(progress / ENTER_END)
  const fill = clamp01((progress - FILL_START) / (FILL_END - FILL_START))
  const filled = filledWordCount(fill, WORDS.length)

  return (
    <Track ref={trackRef}>
      <Sticky>
        <Statement
          style={{
            opacity: enter,
            transform: `translateY(${(1 - enter) * 36}px)`,
          }}
        >
          {WORDS.map((word, index) => (
            <Word key={`${word}-${index}`} $filled={index < filled}>
              {word}
              {index < WORDS.length - 1 ? ' ' : ''}
            </Word>
          ))}
        </Statement>
      </Sticky>
    </Track>
  )
}
