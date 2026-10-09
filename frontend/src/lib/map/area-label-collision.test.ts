import { describe, expect, it } from 'vitest'

import {
  estimateLabelWidth,
  type LabelRect,
  polygonAreaScore,
  rankAreaLabels,
  selectVisibleLabels,
} from '@/lib/map/area-label-collision'
import type { AreaBoundaryItem, CoordinateTuple } from '@/types/recommend'

const square = (
  areaCode: string,
  originLng: number,
  side: number,
): AreaBoundaryItem => {
  const coords: CoordinateTuple[] = [
    [originLng, 37.5],
    [originLng + side, 37.5],
    [originLng + side, 37.5 + side],
    [originLng, 37.5 + side],
  ]
  return {
    areaCode,
    areaName: `${areaCode} 상권`,
    centerLng: originLng + side / 2,
    centerLat: 37.5 + side / 2,
    boundaryCoords: coords,
  }
}

const rect = (
  code: string,
  centerX: number,
  centerY: number,
  width = 60,
  height = 34,
): LabelRect => ({ code, centerX, centerY, width, height })

describe('polygonAreaScore', () => {
  it('정사각형의 넓이를 경위도 제곱으로 낸다', () => {
    expect(polygonAreaScore(square('A', 127, 0.01))).toBeCloseTo(0.0001, 10)
  })

  it('꼭짓점이 셋보다 적으면 0 이다', () => {
    expect(
      polygonAreaScore({
        ...square('A', 127, 0.01),
        boundaryCoords: [
          [127, 37.5],
          [127.01, 37.5],
        ],
      }),
    ).toBe(0)
  })
})

describe('rankAreaLabels', () => {
  const small = square('S', 127.0, 0.001)
  const medium = square('M', 127.01, 0.002)
  const large = square('L', 127.02, 0.004)

  it('면적이 큰 상권부터 자리를 잡는다', () => {
    expect(
      rankAreaLabels([small, large, medium], { selectedCode: null }),
    ).toEqual(['L', 'M', 'S'])
  })

  it('선택된 상권은 면적과 관계없이 맨 앞이다', () => {
    expect(
      rankAreaLabels([small, large, medium], { selectedCode: 'S' }),
    ).toEqual(['S', 'L', 'M'])
  })

  it('호출부 순위(인기)가 면적보다 앞서고, 순위가 없는 상권은 그 뒤에 면적순이다', () => {
    const priorityByCode = new Map([
      ['S', 1],
      ['M', 2],
    ])
    expect(
      rankAreaLabels([small, large, medium], {
        selectedCode: null,
        priorityByCode,
      }),
    ).toEqual(['S', 'M', 'L'])
  })

  it('면적이 같으면 코드 사전순으로 매번 같은 순서를 낸다', () => {
    const b = square('B', 127.0, 0.002)
    const a = square('A', 127.01, 0.002)
    expect(rankAreaLabels([b, a], { selectedCode: null })).toEqual(['A', 'B'])
    expect(rankAreaLabels([a, b], { selectedCode: null })).toEqual(['A', 'B'])
  })
})

describe('selectVisibleLabels', () => {
  it('겹치지 않는 라벨은 모두 남긴다', () => {
    const visible = selectVisibleLabels([
      rect('A', 0, 0),
      rect('B', 200, 0),
      rect('C', 0, 200),
    ])
    expect([...visible].sort()).toEqual(['A', 'B', 'C'])
  })

  it('겹치면 앞선(우선순위 높은) 라벨만 남긴다', () => {
    const visible = selectVisibleLabels([
      rect('HIGH', 0, 0),
      rect('LOW', 30, 10),
    ])
    expect([...visible]).toEqual(['HIGH'])
  })

  it('숨긴 라벨은 뒤 라벨을 가리지 않는다 — 자리 잡은 라벨과만 비교한다', () => {
    // A 와 B 가 겹치고, B 와 C 가 겹치지만 A 와 C 는 떨어져 있다. B 가 숨으면 C 는 남는다.
    const visible = selectVisibleLabels([
      rect('A', 0, 0),
      rect('B', 50, 0),
      rect('C', 100, 0),
    ])
    expect([...visible].sort()).toEqual(['A', 'C'])
  })

  it('여백보다 가까우면 겹침으로 본다', () => {
    // 폭 60 이면 중심 간격 62 는 2px 틈이다. 기본 여백 4px 에 못 미친다.
    expect([
      ...selectVisibleLabels([rect('A', 0, 0), rect('B', 62, 0)]),
    ]).toEqual(['A'])
    expect(
      [...selectVisibleLabels([rect('A', 0, 0), rect('B', 64, 0)])].sort(),
    ).toEqual(['A', 'B'])
  })

  it('격자 셀 경계에 걸친 라벨끼리도 겹침을 놓치지 않는다', () => {
    // 셀 크기 = 64. 두 라벨이 서로 다른 셀에 중심을 두지만 상자는 겹친다.
    const visible = selectVisibleLabels([rect('A', 63, 63), rect('B', 66, 66)])
    expect([...visible]).toEqual(['A'])
  })

  it('음수 좌표(화면 밖 위·왼쪽)에서도 같은 규칙이다', () => {
    const visible = selectVisibleLabels([
      rect('A', -500, -300),
      rect('B', -480, -290),
      rect('C', -300, -300),
    ])
    expect([...visible].sort()).toEqual(['A', 'C'])
  })

  it('같은 코드가 두 번 오면 한 번만 센다', () => {
    expect([
      ...selectVisibleLabels([rect('A', 0, 0), rect('A', 0, 0)]),
    ]).toEqual(['A'])
  })

  it('빈 입력은 빈 집합이다', () => {
    expect(selectVisibleLabels([]).size).toBe(0)
  })

  it('무차별 대조와 결과가 같다(무작위 300개)', () => {
    let seed = 7
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed / 2147483648
    }
    const rects = Array.from({ length: 300 }, (_, index) =>
      rect(
        `R${index}`,
        random() * 1200,
        random() * 800,
        44 + Math.round(random() * 80),
        34,
      ),
    )

    const brute = new Set<string>()
    const placed: LabelRect[] = []
    const gap = 4
    rects.forEach(candidate => {
      const hit = placed.some(
        other =>
          Math.abs(candidate.centerX - other.centerX) <
            (candidate.width + other.width) / 2 + gap &&
          Math.abs(candidate.centerY - other.centerY) <
            (candidate.height + other.height) / 2 + gap,
      )
      if (!hit) {
        placed.push(candidate)
        brute.add(candidate.code)
      }
    })

    expect([...selectVisibleLabels(rects, gap)].sort()).toEqual(
      [...brute].sort(),
    )
  })
})

describe('estimateLabelWidth', () => {
  it('한글 5자는 실측(74px) 근처다', () => {
    expect(estimateLabelWidth('테스트상권')).toBeGreaterThanOrEqual(70)
    expect(estimateLabelWidth('테스트상권')).toBeLessThanOrEqual(80)
  })

  it('짧은 이름도 최소 폭(44px) 아래로 내려가지 않는다', () => {
    expect(estimateLabelWidth('A')).toBe(44)
  })
})
