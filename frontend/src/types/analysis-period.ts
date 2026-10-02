import type { ApiResponse } from '@/types/api'

/**
 * 데이터셋 하나의 적재 범위(`GET /commercials/periods` 의 `datasets[]`).
 *
 * `publishedAt`·`schemaVersion` 은 BE 후속 이슈 전까지 늘 null 이다 — 타입에는 두되 화면이 쓰지 않는다.
 */
export type AnalysisPeriodDataset = {
  dataset?: string | null
  sourceId?: string | null
  latestPeriodCode?: string | null
  firstPeriodCode?: string | null
  periodCount?: number | null
  /** 기본 분기 계산에 들어가는 핵심 데이터셋인가. 원천이 끊긴 상권 소비는 false 다. */
  coreForDefault?: boolean | null
  lastPublishablePeriodCode?: string | null
  publishedAt?: string | null
  schemaVersion?: string | null
}

/**
 * 분석 기준 분기 카탈로그(`GET /api/v1/commercials/periods`, BE #464).
 *
 * 서버가 5분마다 다시 계산해 메모리에 두는 값이다. 「최신 분기」의 정본은 `defaultPeriodCode` 다
 * (period-catalog.md). 정할 수 없으면 null 이다.
 */
export type AnalysisPeriodCatalogBody = {
  /** 핵심 데이터셋 14종 모두에 적재된 분기 중 최신. */
  defaultPeriodCode?: string | null
  /** 같은 교집합, 최신순. 드롭다운 범위로는 쓰지 않는다(period-catalog.md D0 사용자 결정). */
  availablePeriodCodes?: string[] | null
  firstPeriodCode?: string | null
  spatialVersion?: string | null
  /** 계산 시각(`+09:00`). 몇 분 전일 수 있다. */
  resolvedAt?: string | null
  datasets?: AnalysisPeriodDataset[] | null
}

export type AnalysisPeriodCatalogResponse =
  ApiResponse<AnalysisPeriodCatalogBody | null>
