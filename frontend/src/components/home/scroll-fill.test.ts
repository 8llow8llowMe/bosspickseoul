import { describe, expect, it } from 'vitest'
import {
  activeStepFromPinnedProgress,
  activeStepFromProgress,
  filledWordCount,
  pinnedStepProgress,
  viewportProgress,
} from '@/components/home/scroll-fill'

describe('viewportProgress', () => {
  it('요소가 뷰포트 하단에 막 진입하면 0', () => {
    // top === viewportHeight → scrolled 0
    expect(viewportProgress(800, 400, 800)).toBe(0)
  })

  it('요소가 상단을 완전히 통과하면 1', () => {
    // top === -elementHeight → scrolled === total
    expect(viewportProgress(-400, 400, 800)).toBe(1)
  })

  it('범위를 벗어나도 0~1로 클램프', () => {
    expect(viewportProgress(2000, 400, 800)).toBe(0)
    expect(viewportProgress(-5000, 400, 800)).toBe(1)
  })
})

describe('filledWordCount', () => {
  it('진행도에 비례해 반올림', () => {
    expect(filledWordCount(0, 10)).toBe(0)
    expect(filledWordCount(1, 10)).toBe(10)
    expect(filledWordCount(0.44, 10)).toBe(4)
    expect(filledWordCount(0.45, 10)).toBe(5)
  })

  it('진행도를 0~1로 클램프', () => {
    expect(filledWordCount(-1, 10)).toBe(0)
    expect(filledWordCount(2, 10)).toBe(10)
  })
})

describe('activeStepFromProgress', () => {
  it('구간별 인덱스 매핑', () => {
    expect(activeStepFromProgress(0, 4)).toBe(0)
    expect(activeStepFromProgress(0.2, 4)).toBe(0)
    expect(activeStepFromProgress(0.25, 4)).toBe(1)
    expect(activeStepFromProgress(0.75, 4)).toBe(3)
    expect(activeStepFromProgress(1, 4)).toBe(3)
  })

  it('스텝이 0 이하면 0', () => {
    expect(activeStepFromProgress(0.5, 0)).toBe(0)
  })
})

describe('pinnedStepProgress', () => {
  /*
   * useScrollProgress 의 진행도 정의: progress = (vh - top) / (H + vh).
   * 스티키가 실제로 pin 되는 구간은 progress ∈ [vh/(H+vh), H/(H+vh)] 이므로,
   * 스텝 중앙 목표를 그 범위로 클램프해야 트랙 위/아래로 튀지 않는다.
   */
  /*
   * ⚠️ 기대값이 바뀌었다. 예전에는 **전체 progress 의 스텝 중앙**을 구한 뒤 pin 구간으로
   * 클램프했다(첫·끝 스텝이 경계에 눌려 0.22·0.78 로 나왔다). 그 계산은 스크롤 판정
   * (`activeStepFromProgress`)과 같은 왜곡을 공유했기 때문에 **둘이 우연히 맞아떨어졌을
   * 뿐**이고, 스텝별 스크롤 분량이 극단적으로 불균등했다.
   *
   * 지금은 pin 구간 안에서 스텝 중앙을 잡는다 — 클램프가 아니라 **구간 안 등분**이라
   * 첫·끝 스텝도 제 몫을 받는다. 판정 함수(`activeStepFromPinnedProgress`)와 역함수
   * 관계라는 것은 아래 왕복 테스트가 잠근다.
   */
  it('스토리(4스텝, 3600px 트랙, 900px 뷰포트)를 pin 구간 안에서 등분한다', () => {
    // denom 4500 → pinStart 0.2, span 0.6. 스텝 중앙 = 0.2 + (i+0.5)/4 * 0.6
    expect(pinnedStepProgress(0, 4, 3600, 900)).toBeCloseTo(0.275, 5)
    expect(pinnedStepProgress(1, 4, 3600, 900)).toBeCloseTo(0.425, 5)
    expect(pinnedStepProgress(2, 4, 3600, 900)).toBeCloseTo(0.575, 5)
    expect(pinnedStepProgress(3, 4, 3600, 900)).toBeCloseTo(0.725, 5)
  })

  /*
   * 랭킹 섹션은 지표 3종 → 2700px 트랙이다(300dvh, 900px 뷰포트 기준).
   * 같은 공식이 스텝 수와 트랙 높이만 달라져도 성립해야 한다.
   */
  it('랭킹(3지표, 2700px 트랙)에도 같은 공식이 성립한다', () => {
    // denom 3600 → pinStart 0.25, span 0.5. 중앙 = 0.25 + (i+0.5)/3 * 0.5
    expect(pinnedStepProgress(0, 3, 2700, 900)).toBeCloseTo(0.3333333, 5)
    expect(pinnedStepProgress(1, 3, 2700, 900)).toBeCloseTo(0.5, 5)
    expect(pinnedStepProgress(2, 3, 2700, 900)).toBeCloseTo(0.6666667, 5)
  })

  it('높이가 0이면 0을 낸다(0 나눗셈 방지)', () => {
    expect(pinnedStepProgress(0, 3, 0, 0)).toBe(0)
    expect(pinnedStepProgress(0, 0, 2700, 900)).toBe(0)
  })
})

/*
 * 스크롤 전환이 **처음으로 실제 동작하게 된 뒤** 드러난 문제다. `activeStepFromProgress`
 * 는 progress 0~1 전체를 나누는데 스텝이 보이는 구간은 pin 구간뿐이라, 첫·마지막 스텝이
 * 극단적으로 짧았다. 랭킹 섹션(H=3240, vh=1080) 실측: 유동인구 360px · 매출 1,440px ·
 * 개업 360px — 섹션에 닿는 순간 이미 매출이라 첫 지표를 볼 수 없었다.
 */
describe('activeStepFromPinnedProgress', () => {
  const H = 3240
  const VH = 1080
  // pin 구간 = [vh/(H+vh), H/(H+vh)] = [0.25, 0.75]
  const PIN_START = 0.25
  const PIN_SPAN = 0.5

  const at = (fractionOfPin: number) =>
    activeStepFromPinnedProgress(PIN_START + PIN_SPAN * fractionOfPin, 3, H, VH)

  it('pin 구간을 세 지표에 균등하게 나눈다', () => {
    expect(at(0)).toBe(0)
    expect(at(0.32)).toBe(0)
    expect(at(0.34)).toBe(1)
    expect(at(0.66)).toBe(1)
    expect(at(0.68)).toBe(2)
    expect(at(0.99)).toBe(2)
  })

  /* pin 이 시작되는 지점에서 첫 지표여야 한다 — 예전에는 여기서 이미 두 번째였다. */
  it('트랙이 화면을 채우는 순간 첫 지표를 보여 준다', () => {
    expect(activeStepFromPinnedProgress(PIN_START, 3, H, VH)).toBe(0)
  })

  it('pin 구간 밖은 양 끝 지표로 잡아 둔다', () => {
    expect(activeStepFromPinnedProgress(0, 3, H, VH)).toBe(0)
    expect(activeStepFromPinnedProgress(1, 3, H, VH)).toBe(2)
  })

  /* 트랙이 뷰포트보다 짧으면 pin 구간이 없다 — 전체 구간으로 나누는 수밖에 없다. */
  it('pin 구간이 없으면 전체 진행도로 나눈다', () => {
    expect(activeStepFromPinnedProgress(0.5, 3, 0, VH)).toBe(
      activeStepFromProgress(0.5, 3),
    )
  })
})

/*
 * 클릭 목표와 스크롤 판정이 **서로의 역함수**여야 한다. 어긋나면 지표를 눌렀을 때
 * 다른 지표가 선택된 자리로 스크롤된다.
 */
describe('pinnedStepProgress ↔ activeStepFromPinnedProgress', () => {
  it('스토리 4스텝: 목표 지점에서 그 스텝이 선택된다', () => {
    const H = 4320
    const VH = 1080
    for (let index = 0; index < 4; index += 1) {
      const target = pinnedStepProgress(index, 4, H, VH)
      expect(activeStepFromPinnedProgress(target, 4, H, VH)).toBe(index)
    }
  })

  it('랭킹 3지표: 목표 지점에서 그 지표가 선택된다', () => {
    const H = 3240
    const VH = 1080
    for (let index = 0; index < 3; index += 1) {
      const target = pinnedStepProgress(index, 3, H, VH)
      expect(activeStepFromPinnedProgress(target, 3, H, VH)).toBe(index)
    }
  })
})
