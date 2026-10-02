import {
  formatSlotRange,
  type DistrictRhythm,
} from '@/components/home/district-rhythm'
import { districts } from '@/data/districts'
import { formatPeriodCode } from '@/lib/analysis/presentation'
import {
  createAnalysisExplorerHref,
  createEmptyAnalysisSelection,
} from '@/lib/analysis/selection'
import {
  formatSinoUnit,
  formatStatusChange,
} from '@/lib/status/status-formatters'

/**
 * 히어로 자치구 피커의 화면 규칙(hero-picker-and-mobile-first-screen.md D3-2).
 * vitest 가 node 환경이라 컴포넌트 밖 순수 함수로 두고 잠근다.
 */

export type HeroPickerOption = { code: string; name: string }

/** 25구 가나다순. 지도 코드(`SEOUL_STATUS_FEATURES`)와 같은 문자열 코드다. */
export const HERO_PICKER_OPTIONS: readonly HeroPickerOption[] = districts
  .map(district => ({
    code: String(district.gooCode),
    name: district.gooName,
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'ko'))

export const heroPickerName = (code: string): string | null =>
  HERO_PICKER_OPTIONS.find(option => option.code === code)?.name ?? null

export type HeroPrimaryCta = { href: string; label: string; carried: boolean }

/**
 * 주 버튼이 피커의 실행 버튼이다(D4-2). 업종은 싣지 않는다 — 분석 화면이 행정동을 고르는
 * 순간 지운다(D0-3). 판단 흐름 02 CTA(`resolveStoryCta`)와 같은 빌더를 쓴다.
 */
export const resolveHeroPrimaryCta = (code: string | null): HeroPrimaryCta => {
  const name = code === null ? null : heroPickerName(code)
  if (code === null || name === null) {
    return { href: '/analysis', label: '내 상권 분석하기', carried: false }
  }
  return {
    href: createAnalysisExplorerHref({
      ...createEmptyAnalysisSelection(),
      districtCode: code,
    }),
    label: `${name} 분석하기`,
    carried: true,
  }
}

/**
 * 미리보기 한 줄의 조각(D4-3). 툴팁과 같은 포맷터·같은 말이다. 값이 없는 조각은
 * 칸째로 뺀다 — 0 으로 채우면 「유동 0명」이라는 틀린 말이 된다.
 */
export const describePickPreview = (rhythm: DistrictRhythm): string[] => {
  const parts: string[] = []
  const { latest } = rhythm
  if (latest) {
    const change =
      latest.changeRate === null
        ? ''
        : ` (전분기 대비 ${formatStatusChange(latest.changeRate)})`
    parts.push(
      `${formatPeriodCode(latest.periodCode)} 유동인구 ${formatSinoUnit(latest.total, '명')}${change}`,
    )
  }
  const peak = rhythm.slots.find(slot => slot.peak)
  if (peak) parts.push(`${formatSlotRange(peak)} 최다`)
  return parts
}
