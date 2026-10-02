import type { AnalysisPeriodCatalogBody } from '@/types/analysis-period'

/**
 * 분석 기준 분기의 **범위와 해석**(period-catalog.md D3 · D5). 네트워크도 React 도 모른다.
 *
 * 「최신 분기」는 FE 상수가 아니라 BE 카탈로그의 `defaultPeriodCode` 다. 드롭다운은 하한 2021년 1분기부터
 * 그 최신 분기까지 연다 — `availablePeriodCodes`(핵심 데이터셋 교집합)로 좁히지 않는다. 옛 공유 링크
 * (20233 등)가 계속 열려야 한다(사용자 결정, D0).
 */

/** 적재가 시작되는 연도. 이 아래 분기는 팩트 테이블에 없다. 남는 유일한 분기 상수다. */
export const ANALYSIS_PERIOD_FIRST_YEAR = 2021

/** `YYYYQ` 기간 코드 형식. */
export const ANALYSIS_PERIOD_CODE_PATTERN = /^\d{4}[1-4]$/

/** `YYYYQ` 기간 코드(예: '20233' = 2023년 3분기)를 연/분기로 분해한다. */
export const parseAnalysisPeriod = (
  code: string,
): { year: number; quarter: number } => ({
  year: Number(code.slice(0, 4)),
  quarter: Number(code.slice(4)),
})

/** 연/분기를 `YYYYQ` 기간 코드로 합친다. */
export const buildAnalysisPeriod = (year: number, quarter: number): string =>
  `${year}${quarter}`

/**
 * 형식이 맞고 하한(2021년) 이상인 분기인가. **상한은 보지 않는다** — 상한은 카탈로그가 와야 알 수 있고,
 * URL 에 분기가 있으면 카탈로그를 기다리지 않고 요청한다(D2-3).
 */
export const isWellFormedAnalysisPeriod = (value: string): boolean =>
  ANALYSIS_PERIOD_CODE_PATTERN.test(value) &&
  parseAnalysisPeriod(value).year >= ANALYSIS_PERIOD_FIRST_YEAR

/** URL·payload 에서 읽은 분기. 형식·하한을 못 넘으면 null(= 지정 없음, 최신). */
export const readAnalysisPeriod = (
  value: string | null | undefined,
): string | null => {
  const trimmed = value?.trim() ?? ''
  return trimmed && isWellFormedAnalysisPeriod(trimmed) ? trimmed : null
}

const ALL_QUARTERS = [1, 2, 3, 4] as const

/** 드롭다운이 여는 범위. 최신 분기 하나에서 전부 유도한다. */
export type AnalysisPeriodRange = {
  /** 서버 기본 분기. 드롭다운의 상한이자 「최신」의 해석값이다. */
  latest: string
  /** 연도 옵션. 2021 ~ 최신 분기의 연도. */
  years: readonly number[]
  /** 그 연도에 열린 분기. 최신 연도는 최신 분기까지, 지난 연도는 네 분기. */
  quartersOf: (year: number) => readonly number[]
  /** 드롭다운이 실제로 제공하는 연/분기인가. */
  isSupported: (code: string) => boolean
  /** 연도를 바꿀 때 쓸 분기 — 고르던 분기가 새 연도에 없으면 그 연도의 마지막 분기. */
  clampQuarter: (year: number, quarter: number) => number
}

/**
 * 최신 분기로 범위를 만든다. 최신 분기가 형식에 맞지 않거나 하한보다 이르면 null — 카탈로그를 못 받은
 * 것과 같게 다룬다(D5-3, `defaultPeriodCode: null` 도 여기로 온다).
 */
export const toAnalysisPeriodRange = (
  latest: string | null | undefined,
): AnalysisPeriodRange | null => {
  const code = readAnalysisPeriod(latest)
  if (code === null) return null
  const top = parseAnalysisPeriod(code)

  const years = Array.from(
    { length: top.year - ANALYSIS_PERIOD_FIRST_YEAR + 1 },
    (_, index) => ANALYSIS_PERIOD_FIRST_YEAR + index,
  )
  const quartersOf = (year: number): readonly number[] => {
    if (year > top.year || year < ANALYSIS_PERIOD_FIRST_YEAR) return []
    if (year < top.year) return ALL_QUARTERS
    return ALL_QUARTERS.slice(0, top.quarter)
  }
  const isSupported = (value: string): boolean => {
    if (!ANALYSIS_PERIOD_CODE_PATTERN.test(value)) return false
    const { year, quarter } = parseAnalysisPeriod(value)
    return quartersOf(year).includes(quarter)
  }
  const clampQuarter = (year: number, quarter: number): number => {
    const quarters = quartersOf(year)
    if (quarters.length === 0) return quarter
    return quarters.includes(quarter) ? quarter : quarters[quarters.length - 1]
  }

  return { latest: code, years, quartersOf, isSupported, clampQuarter }
}

/**
 * 요청에 쓸 분기(D5-1).
 *
 * - URL 분기가 있으면 카탈로그를 기다리지 않고 그 값을 쓴다. 카탈로그가 와서 최신보다 새 분기로
 *   판명되면(낡은 클라이언트·손편집) 최신으로 내린다.
 * - URL 분기가 없으면 「최신」이다. 카탈로그 전에는 null(대기).
 */
export const resolveAnalysisPeriod = (
  urlPeriod: string | null,
  range: AnalysisPeriodRange | null,
): string | null => {
  if (urlPeriod !== null) {
    if (range === null || range.isSupported(urlPeriod)) return urlPeriod
    return urlPeriod > range.latest ? range.latest : urlPeriod
  }
  return range?.latest ?? null
}

/** 카탈로그 응답에서 최신 분기만 꺼낸다. 형식이 틀리면 null. */
export const readCatalogLatest = (
  body: AnalysisPeriodCatalogBody | null | undefined,
): string | null => readAnalysisPeriod(body?.defaultPeriodCode)
