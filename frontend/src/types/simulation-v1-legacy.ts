/**
 * ⚠️ V1(NowDoBoss) 시뮬레이션 타입 — **삭제 예정**.
 *
 * 백엔드 시뮬레이션 도메인이 V2(`/simulations/**`)로 신설되면서 정본 타입은
 * `@/types/simulation`으로 옮겨갔다. 이 파일은 아직 V1 계약을 참조하는 코드가
 * 컴파일되도록 남겨둔 임시 격리 지대이며, 새 코드는 **절대 여기서 import 하지 않는다.**
 *
 * 남아 있는 참조:
 * - `src/lib/api/share.ts` (#3 소유) — `SimulationShareRequest` / `SimulationShareResponse` /
 *   `SharedSimulationPayloadResponse`. V2 `ShareTargetType`에 시뮬레이션이 없어 share 슬라이스에서 정리된다.
 * - `src/components/simulation/simulation-{form,report,compare}-page.tsx` — 라우트에서 마운트되지 않는 죽은 코드.
 * - `src/components/simulation/{simulation-report-view,shared-simulation-report-page}.tsx`
 *   — `/share/[token]`(V1)에서만 살아 있다.
 *
 * 제거 조건: 시뮬레이션 UI 슬라이스에서 위 컴포넌트가 V2로 교체되고,
 * `/share/[token]`의 V1 시뮬레이션 공유 처리가 정리되면 이 파일과 `@/lib/api/simulation-v1-legacy`를 함께 지운다.
 *
 * @deprecated V2는 `@/types/simulation`을 쓴다.
 */

import type { ApiResponse } from '@/types/api'

export type SizeItem = {
  squareMeter: number
  pyeong: number
}

export type StoreSize = {
  small: SizeItem
  medium: SizeItem
  large: SizeItem
}

export type FranchiseListItem = {
  brandName: string
  franchiseeId: number
  serviceCode: string
  serviceCodeName: string
}

export type SimulationReportRequest = {
  isFranchisee: boolean | null
  brandName: string | null
  gugun: string
  serviceCode: string
  serviceCodeName: string
  storeSize: number
  floor: string
}

export type SimulationComparisonRequest = SimulationReportRequest & {
  selectedType: string
}

export type SimulationReport = {
  request: SimulationReportRequest
  totalPrice: number
  keyMoneyInfo: {
    keyMoneyRatio: number
    keyMoney: number
    keyMoneyLevel: number
  }
  detail: {
    rentPrice: number
    deposit: number
    interior: number
    levy: number | null
  }
  franchisees: {
    totalPrice: number
    brandName: string
    subscription: number
    education: number
    deposit: number
    etc: number
    interior: number
  }[]
  genderAndAgeAnalysisInfo: {
    maleSalesPercent: number
    femaleSalesPercent: number
    first: {
      sales: number
      name: string
    }
    second: {
      sales: number
      name: string
    }
    third: {
      sales: number
      name: string
    }
  }
  monthAnalysisInfo: {
    peakSeasons: number[]
    offPeakSeasons: number[]
  }
}

export type SimulationShareRequest = {
  url: string
  input: SimulationReportRequest
}

export type SharedSimulationPayload = {
  url?: string
  input: SimulationReportRequest
}

export type SimulationSaveRequest = {
  totalPrice: number
  isFranchisee: boolean
  brandName: string | null
  gugun: string
  serviceCode: string
  serviceCodeName: string
  storeSize: number
  floor: string
}

export type SimulationSavedItem = {
  id: number
  memberId: number
  totalPrice: number
  isFranchisee: boolean
  brandName: string | null
  gugun: string
  serviceCode: string
  serviceCodeName: string
  storeSize: number
  floor: string
}

export type SimulationSavedListBody = {
  data: SimulationSavedItem[]
  pageInfo: {
    page: number
    size: number
    totalElements: number
    totalPages: number
  }[]
}

export type StoreSizeResponse = ApiResponse<StoreSize>
export type FranchiseListResponse = ApiResponse<FranchiseListItem[]>
export type SimulationReportResponse = ApiResponse<SimulationReport>
export type SimulationShareResponse = ApiResponse<{
  token: string
}>
export type SharedSimulationPayloadResponse =
  ApiResponse<SharedSimulationPayload>
export type SimulationSavedListResponse = ApiResponse<SimulationSavedListBody>
