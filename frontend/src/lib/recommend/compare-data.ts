import {
  RECOMMENDATION_PERIOD_CODE,
  RECOMMENDATION_TOP_N,
} from '@/lib/api/recommend'
import type {
  CandidateCommercial,
  CommercialProfile,
  RecommendationRequest,
} from '@/types/recommend'

import type { CompareColumnInput } from './compare-presentation'
import { createStableCommercialCodes } from './recommend-state'

/**
 * 비교 화면의 추천 요청.
 *
 * 🔴 **선택된 코드만 넘기면 안 된다.** `clampRecommendationTopN` 이 `topN` 을 최소
 * 5로 올리고, 점수·순위가 그 부분집합 안에서 다시 계산된다. `/recommend` 는 행정동
 * 전체를 놓고 매긴 값을 보여 줬으므로 두 화면이 같은 상권에 다른 숫자를 말하게 된다.
 *
 * 그래서 **행정동 전체 코드**를 그대로 넘기고, 고른 상권은 응답에서 골라낸다.
 */
export const buildCompareRecommendationRequest = ({
  serviceCode,
  allCommercialCodes,
}: {
  serviceCode: string
  allCommercialCodes: readonly string[]
}): RecommendationRequest => ({
  serviceCode,
  commercialCodes: createStableCommercialCodes(allCommercialCodes),
  periodCode: RECOMMENDATION_PERIOD_CODE,
  topN: RECOMMENDATION_TOP_N,
})

/**
 * 추천 응답의 후보를 `/recommend` 가 화면에 올리는 것과 **같은 목록**으로 줄인다.
 *
 * `recommend-page.tsx` 의 `normalizeRecommendationResults` 와 같은 규칙이다 —
 * rank 순 정렬 → 요청한 코드만 → 중복 제거 → `RECOMMENDATION_TOP_N` 까지.
 * 응답을 날것으로 쓰면 백엔드가 여섯 개를 주거나 순서를 흐트러뜨리는 날,
 * `/recommend` 는 Top 5 밖으로 밀어낸 상권에 비교 화면만 순위와 점수를 붙이고
 * 「추천 결과에 없는 상권」 안내도 뜨지 않는다.
 */
export const selectTopRankedCandidates = ({
  candidates,
  allowedCommercialCodes,
  topN = RECOMMENDATION_TOP_N,
}: {
  candidates: readonly CandidateCommercial[]
  allowedCommercialCodes: readonly string[]
  topN?: number
}): CandidateCommercial[] => {
  const allowed = new Set(allowedCommercialCodes.map(String))
  const seen = new Set<string>()

  return [...candidates]
    .sort((left, right) => left.rank - right.rank)
    .filter(item => {
      const commercialCode = String(item.commercialCode)

      if (
        !commercialCode ||
        !allowed.has(commercialCode) ||
        seen.has(commercialCode)
      ) {
        return false
      }

      seen.add(commercialCode)
      return true
    })
    .slice(0, topN)
}

/**
 * 추천 응답 + 프로필을 열로 세운다.
 *
 * 순서는 **URL 순서**다(사용자가 고른 순서). 추천 Top N 에 없는 코드는 빼고
 * `missingCodes` 로 돌려준다 — 낡은 링크에서 조용히 사라지면 안 된다.
 *
 * `scoresUnavailable` 은 **추천 결과를 아직/끝내 모른다**는 뜻이다(로딩 중이거나
 * 추천·상권목록 호출이 실패). 그때는 「Top N 에 없다」고 판정할 근거가 없으므로
 * 모든 코드를 열로 남기고 점수만 비운다 — 원지표는 그대로 보여 줘야 한다(명세 §7).
 * 후보가 없다는 이유로 열을 버리면 화면이 통째로 「비교할 상권이 부족해요」로 무너진다.
 */
export const selectCompareColumns = ({
  requestedCodes,
  candidates,
  profileByCode,
  scoresUnavailable = false,
}: {
  requestedCodes: readonly string[]
  candidates: readonly CandidateCommercial[]
  profileByCode: Readonly<Record<string, CommercialProfile | null>>
  scoresUnavailable?: boolean
}): { columns: CompareColumnInput[]; missingCodes: string[] } => {
  const byCode = new Map(
    candidates.map(item => [String(item.commercialCode), item]),
  )
  const columns: CompareColumnInput[] = []
  const missingCodes: string[] = []

  requestedCodes.forEach(code => {
    const candidate = byCode.get(code) ?? null
    if (!candidate && !scoresUnavailable) {
      missingCodes.push(code)
      return
    }
    columns.push({
      commercialCode: code,
      candidate,
      profile: profileByCode[code] ?? null,
    })
  })

  return { columns, missingCodes }
}
