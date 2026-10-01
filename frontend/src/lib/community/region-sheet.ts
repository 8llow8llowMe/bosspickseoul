import type { CommunityLocationValue } from '@/components/community/community-location-picker'
import { districts } from '@/data/districts'

/**
 * 지역 선택 시트의 순수 로직(docs/features/community/community.md §S4 「지역 선택 시트」).
 *
 * 시트는 자치구 → 행정동 → 상권으로 **한 단계씩 들어가는 리스트**다. 단계마다 첫 행이
 * `{상위 이름} 전체` 이고, 상권 단계의 행만 들어가지 않고 바로 확정한다. 화면은 이 함수들이
 * 돌려준 값을 그대로 그린다 — 단계 이동과 확정값 계산을 컴포넌트에 흩지 않으려고 뺐다.
 */

export type RegionSheetOption = {
  code: string
  name: string
}

export type RegionSheetStep =
  | { level: 'root' }
  | { level: 'district'; district: RegionSheetOption }
  | {
      level: 'administration'
      district: RegionSheetOption
      administration: RegionSheetOption
    }

export type RegionSheetPick =
  | { type: 'descend'; step: RegionSheetStep }
  | { type: 'commit'; value: CommunityLocationValue }

export const REGION_SHEET_ROOT_LABEL = '서울 전체'

/** 각 단계의 첫 행 — 「이 단계로 확정」. 최상위는 필터 해제(`{}`)다. */
export const getRegionSheetAllRow = (
  step: RegionSheetStep,
): { label: string; value: CommunityLocationValue } => {
  if (step.level === 'root') {
    return { label: REGION_SHEET_ROOT_LABEL, value: {} }
  }

  if (step.level === 'district') {
    return {
      label: `${step.district.name} 전체`,
      value: {
        targetType: 'DISTRICT',
        targetCode: step.district.code,
        targetName: step.district.name,
      },
    }
  }

  return {
    label: `${step.administration.name} 전체`,
    value: {
      targetType: 'ADMINISTRATION',
      targetCode: step.administration.code,
      targetName: step.administration.name,
    },
  }
}

/** 지금 단계의 목록에서 한 행을 골랐을 때 — 하위로 들어가거나(자치구·행정동) 확정한다(상권). */
export const resolveRegionSheetPick = (
  step: RegionSheetStep,
  option: RegionSheetOption,
): RegionSheetPick => {
  if (step.level === 'root') {
    return { type: 'descend', step: { level: 'district', district: option } }
  }

  if (step.level === 'district') {
    return {
      type: 'descend',
      step: {
        level: 'administration',
        district: step.district,
        administration: option,
      },
    }
  }

  return {
    type: 'commit',
    value: {
      targetType: 'COMMERCIAL',
      targetCode: option.code,
      targetName: option.name,
    },
  }
}

/** `서울 전체 › 성동구 › 성수1가1동`. 각 조각은 그 단계로 돌아가는 단계를 들고 있다. */
export const getRegionSheetBreadcrumb = (
  step: RegionSheetStep,
): Array<{ label: string; step: RegionSheetStep }> => {
  const crumbs: Array<{ label: string; step: RegionSheetStep }> = [
    { label: REGION_SHEET_ROOT_LABEL, step: { level: 'root' } },
  ]

  if (step.level === 'root') {
    return crumbs
  }

  crumbs.push({
    label: step.district.name,
    step: { level: 'district', district: step.district },
  })

  if (step.level === 'administration') {
    crumbs.push({ label: step.administration.name, step })
  }

  return crumbs
}

const compact = (text: string) => text.replace(/\s+/g, '').toLowerCase()

/**
 * 지금 보이는 단계의 목록만 거른다. 하위 목록은 상위를 골라야 받아지므로 단계를 건너뛰는
 * 통합 검색은 하지 않는다(새 API 없음). 「성수 1가」와 「성수1가」를 같은 말로 본다.
 */
export const filterRegionSheetOptions = <T extends RegionSheetOption>(
  options: readonly T[],
  query: string,
): T[] => {
  const needle = compact(query)

  if (!needle) {
    return [...options]
  }

  return options.filter(option => compact(option.name).includes(needle))
}

/** 확정 행(각 단계 첫 행 · 상권 행)이 지금 값과 같은지. 이름은 보지 않는다 — 코드가 정체성이다. */
export const isRegionSheetValueSelected = (
  current: CommunityLocationValue,
  candidate: CommunityLocationValue,
): boolean =>
  (current.targetType ?? '') === (candidate.targetType ?? '') &&
  (current.targetCode ?? '') === (candidate.targetCode ?? '')

/**
 * 시트를 열 때의 시작 단계.
 *
 * 값에는 코드 하나뿐이라 상위 경로를 늘 알 수는 없다. 자치구는 화면이 가진 자치구 목록에서
 * 이름을 찾을 수 있어 그 구 단계에서 시작한다. 행정동·상권은 그 위 자치구(·행정동)를 알려면
 * 코드 자릿수 규칙에 기대야 하는데, 그건 계약으로 보장되지 않는다 — 추측한 경로가 틀리면
 * 엉뚱한 구의 목록을 보여 주게 되므로 최상위에서 시작한다.
 */
export const getRegionSheetInitialStep = (
  value: CommunityLocationValue,
): RegionSheetStep => {
  if (value.targetType === 'DISTRICT' && value.targetCode) {
    const district = districts.find(
      item => String(item.gooCode) === value.targetCode,
    )

    if (district) {
      return {
        level: 'district',
        district: { code: String(district.gooCode), name: district.gooName },
      }
    }
  }

  return { level: 'root' }
}
