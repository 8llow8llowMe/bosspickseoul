import type { PolicyItem } from '@/types/policy'

/**
 * 지원 정책 카드의 표현 규칙.
 *
 * 백엔드는 **범위 포함 매칭**을 한다 — 자치구를 지정해도 지역 제한이 없는 전국
 * 정책이 함께 온다(실측: 존재하지 않는 자치구 코드에도 5건이 온다). 그래서 카드마다
 * **적용 범위를 적어야 한다.** 안 적으면 사용자가 "이게 왜 내 상권에 나오나" 하게 된다.
 */

/** 지금 보고 있는 상권의 자치구. 정책의 범위를 이 기준으로 말한다. */
type PolicyViewpoint = {
  districtCode: string | null
  districtName: string | null
}

export type PolicyScope = {
  region: string
  service: string
}

export const resolvePolicyScope = (
  policy: PolicyItem,
  { districtCode, districtName }: PolicyViewpoint,
): PolicyScope => {
  const region = !policy.districtCode
    ? '서울 전역·전국'
    : policy.districtCode === districtCode && districtName
      ? `${districtName} 전용`
      : /*
         * 현재 자치구와 다른 코드가 섞여 오면 **이름을 지어내지 않는다.**
         * FE 에는 자치구 코드→이름 표가 있지만, 「강남구 전용」이라고 적었다가
         * 실제로 마포구 정책이면 사용자에게 거짓을 말하는 셈이다.
         */
        '특정 자치구 전용'

  /*
   * 업종 대분류(`CS1`)의 **이름은 백엔드가 주지 않는다.** FE 가 `CS1 → 음식` 표를
   * 지어내면 백엔드 분류가 바뀔 때 조용히 틀린다. 어차피 현재 업종으로 매칭된
   * 결과이므로 사용자 기준으로 적는다.
   */
  const service = policy.serviceCategoryCode ? '이 업종 한정' : '전업종'

  return { region, service }
}

/**
 * `YYYY-MM-DD` 를 `YYYY.MM.DD` 로 바꾼다.
 *
 * **`Date` 를 쓰지 않는다.** 문자열이 이미 날짜이고, `new Date('2026-01-01')` 은
 * UTC 로 읽혀 시간대에 따라 하루 밀린다.
 */
const formatDate = (value: string) => value.replaceAll('-', '.')

/**
 * 신청 기간. **마감일이 null 이면 상시 모집**이라는 백엔드 규약을 그대로 따른다.
 *
 * 「D-7」 같은 배지는 만들지 않는다 — 「오늘」이 필요해지고, 그 값은 정적 렌더
 * 시점에 굳어 낡은 숫자를 보여 준다. 마감 임박순 정렬은 이미 백엔드가 해 준다.
 */
export const formatPolicyApplyPeriod = (policy: PolicyItem): string => {
  if (!policy.applyEndAt) {
    return '상시 모집'
  }

  const end = formatDate(policy.applyEndAt)

  return policy.applyStartAt
    ? `${formatDate(policy.applyStartAt)} ~ ${end}`
    : `~ ${end}`
}
