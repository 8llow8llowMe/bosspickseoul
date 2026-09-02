import { describe, expect, it } from 'vitest'

import {
  formatPolicyApplyPeriod,
  resolvePolicyScope,
} from './policy-presentation'
import type { PolicyItem } from '@/types/policy'

const policy = (overrides: Partial<PolicyItem> = {}): PolicyItem => ({
  policyId: '9000000000000000003',
  title: '소상공인 스마트기술 도입 지원',
  organization: '중소벤처기업부',
  supportType: 'SUBSIDY',
  supportTypeName: '보조금',
  targetSummary: '스마트기기 도입 희망 소상공인',
  supportContent: '도입비의 70%, 최대 500만원',
  districtCode: null,
  serviceCategoryCode: null,
  applyStartAt: null,
  applyEndAt: null,
  detailUrl: 'https://www.mss.go.kr',
  ...overrides,
})

const HERE = { districtCode: '11680', districtName: '강남구' }

describe('resolvePolicyScope', () => {
  /*
   * 백엔드가 「범위 포함 매칭」을 하므로 자치구를 지정해도 **전국 정책이 섞여 온다.**
   * 출처를 적지 않으면 사용자가 "이게 왜 내 상권에?" 하게 된다.
   */
  it('제한이 없으면 전역·전업종으로 적는다', () => {
    expect(resolvePolicyScope(policy(), HERE)).toEqual({
      region: '서울 전역·전국',
      service: '전업종',
    })
  })

  it('현재 자치구 전용이면 자치구명을 적는다', () => {
    expect(
      resolvePolicyScope(policy({ districtCode: '11680' }), HERE).region,
    ).toBe('강남구 전용')
  })

  /*
   * 업종 대분류(CS1)의 **이름은 백엔드가 주지 않는다.** FE 가 표를 지어내는 대신
   * 사용자 기준으로 적는다 — 어차피 현재 업종으로 매칭된 결과다.
   */
  it('업종 한정이면 이 업종 기준으로 적는다', () => {
    expect(
      resolvePolicyScope(policy({ serviceCategoryCode: 'CS1' }), HERE).service,
    ).toBe('이 업종 한정')
  })

  /*
   * 다른 자치구 코드가 섞여 오면 자치구명을 **지어내지 않는다.**
   * 「강남구 전용」이라고 적으면 마포구 정책에 거짓 딱지를 붙이는 셈이다.
   */
  it('현재 자치구와 다른 코드면 이름을 지어내지 않는다', () => {
    expect(
      resolvePolicyScope(policy({ districtCode: '11440' }), HERE).region,
    ).toBe('특정 자치구 전용')
  })
})

describe('formatPolicyApplyPeriod', () => {
  /* 백엔드 규약: 마감일 null 이면 상시 모집이다. */
  it('마감일이 없으면 상시 모집이다', () => {
    expect(formatPolicyApplyPeriod(policy())).toBe('상시 모집')
    expect(
      formatPolicyApplyPeriod(policy({ applyStartAt: '2026-03-01' })),
    ).toBe('상시 모집')
  })

  it('시작·마감이 있으면 기간으로 적는다', () => {
    expect(
      formatPolicyApplyPeriod(
        policy({ applyStartAt: '2026-03-01', applyEndAt: '2026-09-30' }),
      ),
    ).toBe('2026.03.01 ~ 2026.09.30')
  })

  it('마감만 있으면 마감일만 적는다', () => {
    expect(formatPolicyApplyPeriod(policy({ applyEndAt: '2026-09-30' }))).toBe(
      '~ 2026.09.30',
    )
  })

  /*
   * `Date` 를 쓰지 않는다. 문자열이 이미 `YYYY-MM-DD` 이고, Date 로 돌리면
   * 시간대에 따라 하루 밀린다. D-day 배지를 만들지 않는 것도 같은 이유다 —
   * 「오늘」이 정적 렌더 시점에 굳는다.
   */
  it('시간대 때문에 날짜가 밀리지 않는다', () => {
    expect(formatPolicyApplyPeriod(policy({ applyEndAt: '2026-01-01' }))).toBe(
      '~ 2026.01.01',
    )
  })
})
