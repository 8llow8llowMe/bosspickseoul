export type OptionItem = {
  code: string
  name: string
  description?: string | null
}

export type OptionGroup = {
  label: string
  items: readonly OptionItem[]
}

/** 항목이 이 수를 넘으면 검색을 노출한다. 눈으로 훑을 수 있는 한계로 잡았다. */
export const OPTION_SEARCH_THRESHOLD = 12

export const normalizeOptionQuery = (query: string): string =>
  query.trim().toLowerCase()

/**
 * 이름 부분 문자열 매칭. 초성 검색(`ㄱㄴ` → `강남구`)은 범위 밖이라
 * 필터를 이 한 함수로 모아 뒀다 — 나중에 여기만 갈아끼우면 된다.
 */
export const matchesOption = (item: OptionItem, query: string): boolean => {
  const normalized = normalizeOptionQuery(query)
  if (!normalized) return true

  return item.name.toLowerCase().includes(normalized)
}

export const filterOptions = (
  items: readonly OptionItem[],
  query: string,
): OptionItem[] => items.filter(item => matchesOption(item, query))

/** 매칭된 항목이 하나도 없는 그룹은 통째로 뺀다. 그룹 라벨은 매칭 대상이 아니다. */
export const filterOptionGroups = (
  groups: readonly OptionGroup[],
  query: string,
): OptionGroup[] =>
  groups
    .map(group => ({ ...group, items: filterOptions(group.items, query) }))
    .filter(group => group.items.length > 0)

export const countOptions = (
  items: readonly OptionItem[] | undefined,
  groups: readonly OptionGroup[] | undefined,
): number =>
  groups
    ? groups.reduce((total, group) => total + group.items.length, 0)
    : (items?.length ?? 0)

/**
 * `description` 을 그룹 라벨로 삼아 묶는다. 처음 나온 순서를 유지한다.
 *
 * 업종 목록은 백엔드가 `serviceType.name`(예: 「음식점」)을 항목마다 실어 준다.
 * 평면으로 펼치면 31개가 구분 없이 쏟아지므로 그 값으로 접는다. 그룹 라벨이
 * 곧 그 설명이라, 항목에서는 설명을 뗀다 — 안 그러면 같은 글자가 두 번 보인다.
 */
export const groupOptionsByDescription = (
  items: readonly OptionItem[],
  fallbackLabel = '기타',
): OptionGroup[] => {
  const byLabel = new Map<string, OptionItem[]>()

  items.forEach(item => {
    const label = item.description?.trim() || fallbackLabel
    const bucket = byLabel.get(label)
    const stripped: OptionItem = { code: item.code, name: item.name }

    if (bucket) bucket.push(stripped)
    else byLabel.set(label, [stripped])
  })

  return [...byLabel].map(([label, groupItems]) => ({
    label,
    items: groupItems,
  }))
}

/** 설명이 하나도 없으면 그룹핑이 「기타」 한 덩어리가 되어 의미가 없다. */
export const canGroupByDescription = (
  items: readonly OptionItem[],
): boolean => {
  const labels = new Set(
    items.map(item => item.description?.trim()).filter(Boolean),
  )

  return labels.size > 1
}
