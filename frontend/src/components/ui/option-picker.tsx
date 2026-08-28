'use client'

import { Check, ChevronRight, Search, X } from 'lucide-react'
import { useId, useMemo, useState, type ReactNode } from 'react'
import styled from 'styled-components'

import {
  countOptions,
  filterOptionGroups,
  filterOptions,
  OPTION_SEARCH_THRESHOLD,
  type OptionGroup,
  type OptionItem,
} from '@/lib/option-filter'

export type { OptionGroup, OptionItem }

/**
 * `grid` 칩 격자(이름이 짧은 지역) · `list` 한 줄에 하나(설명이 붙는 목록) ·
 * `grid-wide` 좌측정렬 2열(이름이 길지만 개수가 많은 목록).
 */
export type OptionPickerLayout = 'grid' | 'list' | 'grid-wide'
export type OptionPickerVariant = 'panel' | 'sheet'

/**
 * 목록 위에 먼저 얹는 섹션. 「자주 찾는 것」을 카탈로그 순서보다 앞에 두는 용도다.
 * 검색 중에는 숨긴다 — 같은 항목이 두 번 나오면 어느 쪽을 눌러야 하는지 헷갈린다.
 */
export type OptionPickerFeatured = {
  label: string
  /** 표시 순서 그대로 쓴다. 목록에 없는 코드는 조용히 건너뛴다. */
  codes: readonly string[]
  /** 항목에 붙일 아이콘. 없으면 이름만 나온다. */
  iconFor?: (item: OptionItem) => ReactNode
}

export type OptionPickerProps = {
  /** 평면 목록(자치구·행정동·상권). `groups` 와 배타적이다. */
  items?: readonly OptionItem[]
  /** 그룹 목록(업종 6카테고리). 넘어오면 `items` 보다 우선한다. */
  groups?: readonly OptionGroup[]
  selectedCode: string | null
  onSelect: (code: string) => void
  /** 지도 하이라이트 동기화용. 지도가 없는 화면은 넘기지 않는다. */
  onPreviewChange?: (code: string | null) => void
  layout?: OptionPickerLayout
  variant?: OptionPickerVariant
  /** 항목 수가 이 값을 넘으면 검색을 노출한다. */
  searchThreshold?: number
  searchPlaceholder?: string
  /** 검색 결과가 0건일 때 문구. 목록 자체가 빈 경우는 호출자가 처리한다. */
  emptyMessage?: string
  /** 목록 맨 위 「자주 찾는 것」 섹션. 넘기지 않으면 아무것도 달라지지 않는다. */
  featured?: OptionPickerFeatured
}

const Root = styled.div`
  min-height: 0;
  display: grid;
  gap: 12px;
  align-content: start;
`

/* 검색은 TextField 규격(채움형)을 따르되, 목록 위에 얹히는 한 줄이라
   라벨·헬퍼 없이 아이콘 두 개만 붙인 얇은 형태로 쓴다. */
const SearchShell = styled.div`
  position: relative;
  display: grid;
  align-items: center;

  > svg {
    position: absolute;
    left: 12px;
    width: 16px;
    height: 16px;
    color: var(--color-text-caption);
    pointer-events: none;
  }
`

const SearchInput = styled.input`
  width: 100%;
  min-height: 40px;
  /* 테두리 두께가 1→2px 로 자라도 칸이 흔들리지 않게 padding 으로 상쇄한다. */
  padding: 0 35px;
  border: 1px solid transparent;
  border-radius: var(--radius-field);
  background: var(--color-surface-muted);
  color: var(--color-text-900);
  font: inherit;
  font-size: 14px;
  transition:
    border-color var(--motion-fast) var(--ease-standard),
    background-color var(--motion-fast) var(--ease-standard);

  &::placeholder {
    color: var(--color-placeholder);
  }

  /* WebKit 이 type="search" 에 붙이는 기본 지우기 버튼. 우리 ClearButton 과
     겹쳐 같은 ✕ 가 두 개 나란히 보인다. 라벨 있는 쪽만 남긴다. */
  &::-webkit-search-cancel-button {
    display: none;
  }

  /* 전역 :focus-visible 아웃라인(2px, offset 2px)을 그대로 두면 테두리와 겹쳐
     파란 선이 두 줄로 보인다. TextField 처럼 아웃라인을 끄고 테두리 하나로
     표시한다 — 평상시 1px → 포커스 2px 로 두께가 자란다. */
  &:focus,
  &:focus-visible {
    padding: 0 34px;
    border-width: 2px;
    border-color: var(--color-primary-700);
    background: var(--color-surface);
    outline: none;
  }
`

const ClearButton = styled.button`
  position: absolute;
  right: 8px;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-text-caption);
  cursor: pointer;

  svg {
    width: 14px;
    height: 14px;
  }

  &:hover {
    background: var(--color-surface-muted);
    color: var(--color-text-800);
  }
`

const GroupList = styled.div`
  display: grid;
  gap: 16px;
`

const GroupLabel = styled.h3`
  margin-bottom: 8px;
  color: var(--color-text-600);
  font-size: 12px;
  font-weight: 700;
  line-height: 18px;
`

const CandidateGrid = styled.ul`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 8px;
`

const ChipButton = styled.button<{ $selected: boolean }>`
  position: relative;
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid
    ${props =>
      props.$selected ? 'var(--color-primary-600)' : 'var(--color-border-200)'};
  border-radius: var(--radius-control);
  background: ${props =>
    props.$selected ? 'var(--color-primary-100)' : 'var(--color-surface)'};
  color: ${props =>
    props.$selected ? 'var(--color-primary-700)' : 'var(--color-text-800)'};
  padding: 8px 22px;
  font-size: 14px;
  font-weight: ${props => (props.$selected ? 700 : 600)};
  line-height: 1.3;
  text-align: center;
  word-break: keep-all;
  cursor: pointer;
  transition:
    border-color var(--motion-fast) var(--ease-standard),
    background-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  &:hover,
  &:focus-visible {
    border-color: var(--color-primary-600);
    outline: none;
  }
`

const ChipCheck = styled.span`
  position: absolute;
  top: 6px;
  right: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary-700);

  svg {
    width: 14px;
    height: 14px;
  }
`

const CandidateList = styled.ul<{ $variant: OptionPickerVariant }>`
  display: grid;
  gap: 8px;
  ${props =>
    props.$variant === 'sheet' &&
    `grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));`}
`

const CandidateButton = styled.button<{
  $selected: boolean
  $variant: OptionPickerVariant
}>`
  width: 100%;
  min-height: 52px;
  height: ${props => (props.$variant === 'sheet' ? '100%' : 'auto')};
  display: flex;
  align-items: ${props =>
    props.$variant === 'sheet' ? 'flex-start' : 'center'};
  gap: 10px;
  border: 1px solid
    ${props =>
      props.$selected ? 'var(--color-primary-600)' : 'var(--color-border-200)'};
  border-radius: var(--radius-control);
  background: ${props =>
    props.$selected ? 'var(--color-primary-100)' : 'var(--color-surface)'};
  color: var(--color-text-800);
  padding: 10px 12px 10px 14px;
  text-align: left;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    border-color: var(--color-primary-600);
    outline: none;
  }
`

const CandidateCopy = styled.span<{ $variant: OptionPickerVariant }>`
  min-width: 0;
  flex: 1;
  display: grid;
  gap: 2px;

  /* 이름을 잘라내지 않는다 — 「남산골공원」과 「남산골공원상가」를 ... 만 보고
     구분할 수 없다. 단어는 지키되 한 단어가 칸보다 길면 그때만 끊는다. */
  strong {
    font-size: 14px;
    font-weight: 600;
    word-break: keep-all;
    overflow-wrap: anywhere;
  }

  small {
    color: var(--color-text-caption);
    font-size: 12px;
    line-height: 18px;
  }
`

const CandidateIcon = styled.span`
  width: 20px;
  height: 20px;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  color: var(--color-primary-700);

  svg {
    width: 18px;
    height: 18px;
  }
`

/* 2열 격자. 이름이 긴 업종이 있어 칩(중앙정렬)이 아니라 좌측정렬이고, 열 수를
   폭에 맡기지 않고 2로 고정한다 — 3열이 되면 이름이 세 줄로 접힌다. */
const WideGrid = styled.ul`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
`

const WideButton = styled.button<{ $selected: boolean }>`
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 52px;
  display: flex;
  align-items: center;
  border: 1px solid
    ${props =>
      props.$selected ? 'var(--color-primary-600)' : 'var(--color-border-200)'};
  border-radius: var(--radius-control);
  background: ${props =>
    props.$selected ? 'var(--color-primary-100)' : 'var(--color-surface)'};
  color: ${props =>
    props.$selected ? 'var(--color-primary-700)' : 'var(--color-text-800)'};
  /* 우측 여백은 선택 표시(ChipCheck)가 앉을 자리다. 선택될 때만 아이콘을
     끼워 넣으면 글자가 밀려 흔들린다. */
  padding: 10px 26px 10px 12px;
  font-size: 14px;
  font-weight: ${props => (props.$selected ? 700 : 600)};
  line-height: 1.3;
  text-align: left;
  word-break: keep-all;
  overflow-wrap: anywhere;
  cursor: pointer;
  transition:
    border-color var(--motion-fast) var(--ease-standard),
    background-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  &:hover,
  &:focus-visible {
    border-color: var(--color-primary-600);
    outline: none;
  }
`

/* 「자주 찾는 것」은 검색을 치기 전에 대부분을 끝내는 자리라 전체 목록보다
   타깃이 크다. 아이콘을 위에 얹는 세로 배치로 3열까지 들어간다. */
const FeaturedGrid = styled.ul`
  display: grid;
  /* 88px 은 375px 모바일 시트에서 3열이 들어가는 상한이다. 96px 로 두면 딱
     한 칸이 모자라 2열로 접히고, 인기 섹션만 화면 절반을 먹는다. */
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  gap: 8px;
`

const FeaturedButton = styled.button<{ $selected: boolean }>`
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 72px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid
    ${props =>
      props.$selected ? 'var(--color-primary-600)' : 'var(--color-border-200)'};
  border-radius: var(--radius-control);
  background: ${props =>
    props.$selected ? 'var(--color-primary-100)' : 'var(--color-surface)'};
  color: ${props =>
    props.$selected ? 'var(--color-primary-700)' : 'var(--color-text-800)'};
  padding: 10px 8px;
  font-size: 13px;
  font-weight: ${props => (props.$selected ? 700 : 600)};
  line-height: 1.3;
  text-align: center;
  word-break: keep-all;
  cursor: pointer;
  transition:
    border-color var(--motion-fast) var(--ease-standard),
    background-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  &:hover,
  &:focus-visible {
    border-color: var(--color-primary-600);
    outline: none;
  }
`

/* 아이콘은 장식이다. 이름 위의 보조 신호일 뿐이라 아이콘만으로 항목을
   식별하게 하지 않는다(`aria-hidden`). */
const FeaturedIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary-700);

  svg {
    width: 20px;
    height: 20px;
  }
`

/* 호출자 헤더는 단계 전체 개수를 말한다(예: 「25개」). 검색 중에는 그 숫자와
   눈앞의 항목 수가 어긋나므로, 걸러진 결과 수를 여기서 따로 알린다. */
const MatchCount = styled.p`
  color: var(--color-text-caption);
  font-size: 12px;
  line-height: 18px;
`

const NoMatch = styled.p`
  padding: 24px 0;
  color: var(--color-text-caption);
  font-size: 14px;
  line-height: 20px;
  text-align: center;
`

export default function OptionPicker({
  items,
  groups,
  selectedCode,
  onSelect,
  onPreviewChange,
  layout = 'grid',
  variant = 'panel',
  searchThreshold = OPTION_SEARCH_THRESHOLD,
  searchPlaceholder = '이름으로 검색',
  emptyMessage = '검색 결과가 없어요.',
  featured,
}: OptionPickerProps) {
  const [query, setQuery] = useState('')
  const searchId = useId()

  const totalCount = countOptions(items, groups)
  const showSearch = totalCount > searchThreshold

  const visibleGroups = useMemo(
    () => (groups ? filterOptionGroups(groups, query) : null),
    [groups, query],
  )
  const visibleItems = useMemo(
    () => (groups ? null : filterOptions(items ?? [], query)),
    [groups, items, query],
  )

  const matchCount = countOptions(
    visibleItems ?? undefined,
    visibleGroups ?? undefined,
  )

  const preview = (code: string | null) => onPreviewChange?.(code)

  const optionByCode = useMemo(() => {
    const source = groups ? groups.flatMap(group => group.items) : (items ?? [])

    return new Map(source.map(item => [item.code, item]))
  }, [groups, items])

  // 코드로 항목을 되찾는다 — 이름을 두 곳에 적어 두면 카탈로그가 바뀔 때 한쪽만
  // 낡는다. 목록에 없는 코드는 조용히 건너뛴다.
  const featuredItems = useMemo(
    () =>
      (featured?.codes ?? [])
        .map(code => optionByCode.get(code))
        .filter((item): item is OptionItem => Boolean(item)),
    [featured, optionByCode],
  )

  const showFeatured = featuredItems.length > 0 && !query.trim()

  const renderFeatured = (section: OptionPickerFeatured) => (
    <FeaturedGrid>
      {featuredItems.map(item => {
        const selected = item.code === selectedCode
        const icon = section.iconFor?.(item)

        return (
          <li key={item.code}>
            <FeaturedButton
              type="button"
              $selected={selected}
              aria-selected={selected}
              title={item.name}
              onClick={() => onSelect(item.code)}
              onFocus={() => preview(item.code)}
              onBlur={() => preview(null)}
              onPointerEnter={() => preview(item.code)}
              onPointerLeave={() => preview(null)}
            >
              {icon ? <FeaturedIcon aria-hidden>{icon}</FeaturedIcon> : null}
              {item.name}
              {selected ? (
                <ChipCheck aria-hidden>
                  <Check />
                </ChipCheck>
              ) : null}
            </FeaturedButton>
          </li>
        )
      })}
    </FeaturedGrid>
  )

  const renderItems = (list: readonly OptionItem[]) => {
    if (layout === 'grid-wide') {
      return (
        <WideGrid>
          {list.map(item => {
            const selected = item.code === selectedCode
            return (
              <li key={item.code}>
                <WideButton
                  type="button"
                  $selected={selected}
                  aria-selected={selected}
                  onClick={() => onSelect(item.code)}
                  onFocus={() => preview(item.code)}
                  onBlur={() => preview(null)}
                  onPointerEnter={() => preview(item.code)}
                  onPointerLeave={() => preview(null)}
                >
                  {item.name}
                  {selected ? (
                    <ChipCheck aria-hidden>
                      <Check />
                    </ChipCheck>
                  ) : null}
                </WideButton>
              </li>
            )
          })}
        </WideGrid>
      )
    }

    if (layout === 'grid') {
      return (
        <CandidateGrid>
          {list.map(item => {
            const selected = item.code === selectedCode
            return (
              <li key={item.code}>
                <ChipButton
                  type="button"
                  $selected={selected}
                  aria-selected={selected}
                  title={item.name}
                  onClick={() => onSelect(item.code)}
                  onFocus={() => preview(item.code)}
                  onBlur={() => preview(null)}
                  onPointerEnter={() => preview(item.code)}
                  onPointerLeave={() => preview(null)}
                >
                  {item.name}
                  {selected ? (
                    <ChipCheck aria-hidden>
                      <Check />
                    </ChipCheck>
                  ) : null}
                </ChipButton>
              </li>
            )
          })}
        </CandidateGrid>
      )
    }

    return (
      <CandidateList $variant={variant}>
        {list.map(item => {
          const selected = item.code === selectedCode
          return (
            <li key={item.code}>
              <CandidateButton
                type="button"
                $selected={selected}
                $variant={variant}
                aria-selected={selected}
                onClick={() => onSelect(item.code)}
                onFocus={() => preview(item.code)}
                onBlur={() => preview(null)}
                onPointerEnter={() => preview(item.code)}
                onPointerLeave={() => preview(null)}
              >
                <CandidateCopy $variant={variant}>
                  <strong>{item.name}</strong>
                  {item.description ? <small>{item.description}</small> : null}
                </CandidateCopy>
                <CandidateIcon aria-hidden>
                  {selected ? <Check /> : <ChevronRight />}
                </CandidateIcon>
              </CandidateButton>
            </li>
          )
        })}
      </CandidateList>
    )
  }

  return (
    <Root>
      {showSearch ? (
        <SearchShell>
          <Search aria-hidden />
          <SearchInput
            id={searchId}
            type="search"
            value={query}
            aria-label={searchPlaceholder}
            placeholder={searchPlaceholder}
            onChange={event => setQuery(event.target.value)}
          />
          {query ? (
            <ClearButton
              type="button"
              aria-label="검색어 지우기"
              onClick={() => setQuery('')}
            >
              <X />
            </ClearButton>
          ) : null}
        </SearchShell>
      ) : null}

      {query.trim() && matchCount > 0 ? (
        <MatchCount aria-live="polite">
          {totalCount}개 중 {matchCount}개
        </MatchCount>
      ) : null}

      {matchCount === 0 ? (
        <NoMatch role="status">{emptyMessage}</NoMatch>
      ) : (
        <GroupList>
          {showFeatured && featured ? (
            <section>
              <GroupLabel>{featured.label}</GroupLabel>
              {renderFeatured(featured)}
            </section>
          ) : null}
          {visibleGroups ? (
            visibleGroups.map(group => (
              <section key={group.label}>
                <GroupLabel>{group.label}</GroupLabel>
                {renderItems(group.items)}
              </section>
            ))
          ) : (
            <section>{renderItems(visibleItems ?? [])}</section>
          )}
        </GroupList>
      )}
    </Root>
  )
}
