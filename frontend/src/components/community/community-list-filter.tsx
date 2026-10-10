'use client'

import { useRef, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import styled from 'styled-components'
import CommunityChoiceChips from '@/components/community/community-choice-chips'
import CommunitySheet from '@/components/community/community-sheet'
import type { CommunityListView } from '@/lib/community/community-state'
import {
  COMMUNITY_CATEGORY_FILTER_OPTIONS,
  getCommunityListFilterSummary,
} from '@/lib/community/list-filter'
import {
  COMMUNITY_POPULAR_PERIODS,
  type CommunityPopularPeriod,
} from '@/lib/community/popular-period'
import type { CommunityPostCategoryCode } from '@/lib/community/post-category'

/*
  모바일 목록 필터(community.md §S4 「목록 필터」, CM-059~061). `<480` 에서 말머리·기간 칩 행 대신 탭 줄
  오른쪽에 버튼 하나를 두고, 누르면 커뮤니티 공용 시트에서 고른다. 칩 행 두 줄(최대 ~120px)이 첫 화면 글
  행을 밀어내던 문제(CM-015)를 푼다. `≥480` 은 이 버튼을 CSS 로 숨기고 칩 행을 그대로 그린다 — 폭 판정을
  JS 로 하면 SSR 첫 페인트에 칩 행이 잠깐 보였다 사라진다.

  고르면 바로 적용한다(지역 시트와 같은 관례 — 「적용」 버튼이 없다). 시트는 닫지 않는다 — 인기 보기는
  말머리와 기간 두 묶음이라, 하나 고를 때마다 닫으면 둘 다 바꾸려면 두 번 열어야 한다.
*/

const TABLET_UP = '@media (min-width: 480px)'

const FilterButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  flex: 0 1 auto;
  display: inline-flex;
  align-items: center;
  padding: 0;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  font: inherit;
  cursor: pointer;

  ${TABLET_UP} {
    display: none;
  }
`

/* 44 터치 영역 안의 칩 모양. 탭 줄 아래 테두리에 닿지 않게 버튼보다 낮게 그린다. */
const FilterChip = styled.span<{ $active: boolean }>`
  min-width: 0;
  max-width: 100%;
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
  border: 1px solid
    ${props =>
      props.$active ? 'var(--color-primary-600)' : 'var(--color-border-200)'};
  border-radius: var(--radius-pill);
  background: ${props =>
    props.$active ? 'var(--color-primary-100)' : 'var(--color-surface)'};
  color: ${props =>
    props.$active
      ? 'var(--color-text-primary-on-light)'
      : 'var(--color-text-700)'};
  font-size: 14px;
  font-weight: ${props => (props.$active ? 700 : 600)};

  svg {
    flex: 0 0 auto;
  }
`

const FilterLabel = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const SheetContent = styled.div`
  display: grid;
  gap: 24px;
  padding: 20px;
`

const Section = styled.section`
  display: grid;
  gap: 12px;
`

const SectionTitle = styled.h3`
  color: var(--color-text-900);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.4;
`

export type CommunityListFilterProps = {
  view: CommunityListView
  category: CommunityPostCategoryCode | null
  popularPeriod: CommunityPopularPeriod
  onCategoryChange?: (category: CommunityPostCategoryCode | null) => void
  onPopularPeriodChange?: (period: CommunityPopularPeriod) => void
}

export default function CommunityListFilter({
  view,
  category,
  popularPeriod,
  onCategoryChange,
  onPopularPeriodChange,
}: CommunityListFilterProps) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const summary = getCommunityListFilterSummary({
    view,
    category,
    period: popularPeriod,
  })
  const showPeriod = view === 'popular'

  return (
    <>
      <FilterButton
        ref={buttonRef}
        aria-expanded={open}
        aria-haspopup="dialog"
        // 걸린 값만 보이면 무엇을 여는 버튼인지 모른다 — 이름 앞에 「필터」를 붙인다(보이는 글자를 품는다).
        aria-label={summary.active ? `필터: ${summary.label}` : undefined}
        data-active={summary.active}
        data-community-filter-button="true"
        onClick={() => {
          setOpen(true)
        }}
        type="button"
      >
        <FilterChip $active={summary.active}>
          {/* 고른 값이 있으면 아이콘을 뺀다 — 375 에서 탭 줄 한 줄에 값이 더 들어가게. */}
          {summary.active ? null : (
            <SlidersHorizontal aria-hidden="true" size={16} />
          )}
          <FilterLabel>{summary.label}</FilterLabel>
        </FilterChip>
      </FilterButton>

      <CommunitySheet
        onClose={() => {
          setOpen(false)
        }}
        open={open}
        returnFocusRef={buttonRef}
        title="필터"
      >
        <SheetContent>
          <Section>
            <SectionTitle aria-hidden="true">말머리</SectionTitle>
            <CommunityChoiceChips
              label="말머리"
              onSelect={value => {
                onCategoryChange?.(value)
              }}
              options={COMMUNITY_CATEGORY_FILTER_OPTIONS}
              selected={category}
            />
          </Section>
          {showPeriod ? (
            <Section>
              <SectionTitle aria-hidden="true">기간</SectionTitle>
              <CommunityChoiceChips
                label="인기 기간"
                onSelect={value => {
                  onPopularPeriodChange?.(value)
                }}
                options={COMMUNITY_POPULAR_PERIODS}
                selected={popularPeriod}
              />
            </Section>
          ) : null}
        </SheetContent>
      </CommunitySheet>
    </>
  )
}
