import { describe, expect, it } from 'vitest'

import {
  buildSimulationHistoryReportHref,
  describeSimulationHistoryCondition,
  isSimulationHistoryReplayable,
  toSimulationReportRequestFromHistory,
} from '@/lib/simulation/history-presentation'
import { parseSimulationReportRequest } from '@/lib/simulation/report-route'
import type { SimulationHistoryItem } from '@/types/simulation'

const item = (
  overrides: Partial<SimulationHistoryItem> = {},
): SimulationHistoryItem => ({
  historyId: '12',
  franchisee: false,
  brandName: null,
  districtCode: '11740',
  districtName: '강동구',
  serviceCode: 'CS100001',
  serviceName: '한식음식점',
  storeSize: 66,
  floorType: { code: 'FIRST_FLOOR', name: '1층', description: '1층 점포' },
  totalPrice: 23_450,
  dataBaseYear: '2024',
  createdAt: '2026-08-20T09:12:33',
  ...overrides,
})

describe('describeSimulationHistoryCondition', () => {
  it('조건을 한 줄로 요약한다', () => {
    expect(describeSimulationHistoryCondition(item())).toBe(
      '강동구 · 한식음식점 · 66㎡ · 1층',
    )
  })

  it('프랜차이즈면 브랜드명을 업종 뒤에 붙인다', () => {
    expect(
      describeSimulationHistoryCondition(
        item({ franchisee: true, brandName: '테스트브랜드' }),
      ),
    ).toBe('강동구 · 한식음식점 · 테스트브랜드 · 66㎡ · 1층')
  })
})

describe('toSimulationReportRequestFromHistory', () => {
  it('응답 floorType 객체가 아니라 code 를 요청에 넣는다', () => {
    expect(toSimulationReportRequestFromHistory(item())).toEqual({
      franchisee: false,
      districtCode: '11740',
      serviceCode: 'CS100001',
      storeSize: 66,
      floorType: 'FIRST_FLOOR',
    })
  })

  it('저장 응답에 franchiseeId 가 없으므로 프랜차이즈도 브랜드 없이 재계산된다', () => {
    const request = toSimulationReportRequestFromHistory(
      item({ franchisee: true, brandName: '테스트브랜드' }),
    )

    expect(request.franchisee).toBe(true)
    expect(request.franchiseeId).toBeUndefined()
  })
})

describe('isSimulationHistoryReplayable', () => {
  it('개인 창업 이력은 그대로 다시 계산할 수 있다', () => {
    expect(isSimulationHistoryReplayable(item())).toBe(true)
  })

  it('프랜차이즈 이력은 브랜드를 다시 골라야 한다', () => {
    // 저장 계약이 franchiseeId 를 돌려주지 않아 리포트 요청을 완성할 수 없다.
    expect(isSimulationHistoryReplayable(item({ franchisee: true }))).toBe(
      false,
    )
  })
})

describe('buildSimulationHistoryReportHref', () => {
  it('개인 창업 이력은 리포트 경로를 만든다', () => {
    const href = buildSimulationHistoryReportHref(item())

    expect(href).toContain('/simulation/report?')
    expect(href).toContain('districtCode=11740')
  })

  it('만든 링크는 리포트 화면이 그대로 요청으로 읽는다', () => {
    // 이 왕복이 깨지면 '리포트 보기'가 "계산할 조건이 없어요"로 떨어진다.
    const href = buildSimulationHistoryReportHref(item())
    const params = new URLSearchParams(href.slice(href.indexOf('?') + 1))

    expect(parseSimulationReportRequest(params)).toEqual(
      toSimulationReportRequestFromHistory(item()),
    )
  })

  it('프랜차이즈 이력은 조건이 미완성이라 입력 화면으로 보낸다', () => {
    // 리포트로 보내면 franchiseeId 가 없어 404 가 아니라 '조건이 없어요' 빈 화면이 된다.
    // 업종까지 복원한 입력 화면에서 브랜드만 다시 고르게 하는 편이 짧다.
    const href = buildSimulationHistoryReportHref(
      item({ franchisee: true, brandName: '테스트브랜드' }),
    )

    expect(href.startsWith('/simulation?')).toBe(true)
    expect(href).toContain('serviceCode=CS100001')
    expect(href).toContain('franchisee=true')
  })
})
