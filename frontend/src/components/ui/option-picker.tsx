'use client'

import { Check, ChevronRight, Search, X } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
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

export type OptionPickerLayout = 'grid' | 'list'
export type OptionPickerVariant = 'panel' | 'sheet'

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
  padding: 0 36px;
  border: 2px solid transparent;
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

  /* 전역 :focus-visible 아웃라인은 지우지 않는다 — 키보드 표시는 그쪽 담당. */
  &:focus {
    border-color: var(--color-primary-700);
    background: var(--color-surface);
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

  strong {
    font-size: 14px;
    font-weight: 600;
    ${props =>
      props.$variant === 'sheet'
        ? 'white-space: normal; word-break: keep-all;'
        : 'overflow: hidden; text-overflow: ellipsis; white-space: nowrap;'}
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

  const renderItems = (list: readonly OptionItem[]) => {
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
      ) : visibleGroups ? (
        <GroupList>
          {visibleGroups.map(group => (
            <section key={group.label}>
              <GroupLabel>{group.label}</GroupLabel>
              {renderItems(group.items)}
            </section>
          ))}
        </GroupList>
      ) : (
        renderItems(visibleItems ?? [])
      )}
    </Root>
  )
}
