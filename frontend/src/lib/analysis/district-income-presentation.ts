import type {
  CommercialIncomeAndExpense,
  DistrictIncomeProvenance,
} from '@/types/commercial-analysis'

/**
 * 「자치구 평균 소득 (대체)」 카드의 **표시 로직**. 네트워크도 React 도 모른다.
 *
 * 상권 단위 소득 원천이 끊겨(#413) 화면에서 소득 카드를 걷어냈다가(#414), 백엔드가 국민연금
 * 「자격 시군구 신고 평균소득월액」의 자치구 평균을 대체값으로 내려주기 시작해 되살린다(#500).
 *
 * 소비 대체(`expense-presentation.ts`)와 두 가지가 다르다.
 *
 * - 대체 범위가 행정동이 아니라 **자치구**다. 같은 구 안의 상권은 모두 같은 값이다.
 * - 기준이 분기가 아니라 **날짜**다. 연 1회 12월 말 스냅샷이라 `20261` 을 골라도
 *   `2024-12-31` 값이 온다. 분기 표기(`formatPeriodCode`)로 적으면 없는 사실을 말하게 된다.
 *
 * 네이티브(상권 단위) 소득은 없으므로 값이 있으면 **언제나 대체값**이다. 그래서 값이 보이는
 * 한 배지·면책·출처를 늘 함께 붙인다.
 */

export const DISTRICT_INCOME_PROXY_BADGE_LABEL = '자치구 기준 (대체)'

/** 필드가 없는 구 응답(#415 이전)처럼 서버가 이유를 주지 않을 때 빈 상태에 적는 문장. */
export const DISTRICT_INCOME_FALLBACK_EMPTY_DESCRIPTION =
  '이 분기에는 자치구 평균 소득 자료를 받지 못했어요.'

export type DistrictIncomeView =
  | {
      available: true
      /** 원/월. */
      amount: number
      badgeLabel: string
      /** 값을 가져온 자치구 이름(예: 종로구). */
      scopeName: string | null
      /** 「2024년 12월 31일」. 기준일을 읽지 못하면 null. */
      referenceDateLabel: string | null
      /** 카드 제목 아래 한 줄. 「종로구 · 2024년 12월 31일 기준」. 둘 다 없으면 null. */
      description: string | null
      disclaimer: string | null
      sourceLabel: string | null
      sourceUrl: string | null
    }
  | {
      available: false
      /** 왜 없는지. 서버 문장이 있으면 그것, 없으면 기본 문장. */
      emptyDescription: string
    }

const trimmed = (value: string | null | undefined): string | null => {
  const text = typeof value === 'string' ? value.trim() : ''
  return text.length > 0 ? text : null
}

/** `2024-12-31` → `2024년 12월 31일`. 형식이 다르면 null — 엉뚱한 날짜를 지어내지 않는다. */
export const formatReferenceDate = (
  value: string | null | undefined,
): string | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value?.trim() ?? '')
  if (!match) return null
  const [, year, month, day] = match
  return `${year}년 ${Number(month)}월 ${Number(day)}일`
}

/**
 * 판정 기준은 `scope.code` 와 값 **둘 다**다.
 *
 * - `DISTRICT_PROXY` 가 아니면(`UNAVAILABLE`, 모르는 코드, 필드 없음) 값이 와도 그리지 않는다 —
 *   출처를 모르는 값을 자치구 평균이라고 단언할 수 없다.
 * - `DISTRICT_PROXY` 여도 금액이 양의 유한수가 아니면 그리지 않는다. 신고 평균소득이 0원인
 *   자치구는 없으므로 0 은 「없음」이 잘못 실린 것이다. **0 원으로 그리지 않는다.**
 */
export const toDistrictIncomeView = (
  income: CommercialIncomeAndExpense | null | undefined,
): DistrictIncomeView => {
  const districtIncome = income?.districtAverageIncome
  const provenance: DistrictIncomeProvenance | null | undefined =
    districtIncome?.provenance
  const amount = districtIncome?.amount
  const disclaimer = trimmed(provenance?.disclaimer)

  const scopeCode = provenance?.scope?.code
  const hasAmount =
    typeof amount === 'number' && Number.isFinite(amount) && amount > 0

  if (scopeCode !== 'DISTRICT_PROXY' || !hasAmount) {
    return {
      available: false,
      /*
        서버 면책 문장을 빈 상태 사유로 쓰는 것은 `UNAVAILABLE` 일 때뿐이다. 대체 범위인데 값만
        빠진 경우의 면책은 「종로구 평균입니다」라는 값 설명이라 사유로 읽히지 않는다.
      */
      emptyDescription:
        (scopeCode === 'UNAVAILABLE' ? disclaimer : null) ??
        DISTRICT_INCOME_FALLBACK_EMPTY_DESCRIPTION,
    }
  }

  const scopeName = trimmed(provenance?.scopeName)
  const referenceDateLabel = formatReferenceDate(provenance?.referenceDate)
  const descriptionParts = [
    scopeName,
    referenceDateLabel ? `${referenceDateLabel} 기준` : null,
  ].filter((part): part is string => part !== null)

  return {
    available: true,
    amount,
    badgeLabel: DISTRICT_INCOME_PROXY_BADGE_LABEL,
    scopeName,
    referenceDateLabel,
    description: descriptionParts.length ? descriptionParts.join(' · ') : null,
    disclaimer,
    sourceLabel: trimmed(provenance?.sourceLabel),
    sourceUrl: trimmed(provenance?.sourceUrl),
  }
}
