'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Check,
  ChevronDown,
  ChevronRight,
  MapPin,
  Search,
  X,
} from 'lucide-react'
import styled from 'styled-components'
import CommunitySheet from '@/components/community/community-sheet'
import {
  communityLocationQueryKeys,
  getCommunityLocationDisplayName,
  loadCommunityAdministrations,
  loadCommunityCommercials,
  readCommunityLocationOptions,
  type CommunityLocationValue,
} from '@/components/community/community-location-picker'
import { districts } from '@/data/districts'
import {
  filterRegionSheetOptions,
  getRegionSheetAllRow,
  getRegionSheetBreadcrumb,
  getRegionSheetInitialStep,
  isRegionSheetValueSelected,
  resolveRegionSheetPick,
  type RegionSheetOption,
  type RegionSheetStep,
} from '@/lib/community/region-sheet'
import type { AdministrationArea, CommercialArea } from '@/types/recommend'

export type CommunityRegionSheetProps = {
  value: CommunityLocationValue
  mockEnabled: boolean
  /** 검색 중·좋아요한 글 보기. 칩을 끄고 해제 버튼을 숨긴다(community.md §S4 「지역 칩」). */
  disabled?: boolean
  /** 고른 순간에 한 번만 부른다. 시트를 닫기만 하면 부르지 않는다. */
  onChange: (value: CommunityLocationValue) => void
}

const MOBILE = '@media (max-width: 479px)'

const ChipGroup = styled.div<{ $active: boolean; $disabled: boolean }>`
  min-width: 0;
  flex: 0 0 auto; /* 검색칸이 줄어들고 칩은 라벨 상한(ChipLabel)까지 자리를 지킨다 */
  display: inline-flex;
  align-items: stretch;
  overflow: hidden;
  border: 1px solid
    ${props =>
      props.$active ? 'var(--color-primary-700)' : 'var(--color-border-200)'};
  border-radius: var(--radius-control);
  background: ${props =>
    props.$active ? 'var(--color-primary-100)' : 'var(--color-surface)'};
  opacity: ${props =>
    props.$disabled ? 'var(--button-disabled-opacity-color)' : 1};
`

const Chip = styled.button<{ $active: boolean }>`
  min-width: 0;
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
  border: 0;
  background: transparent;
  color: ${props =>
    props.$active
      ? 'var(--color-text-primary-on-light)'
      : 'var(--color-text-700)'};
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  svg {
    flex: 0 0 auto;
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary-700);

    outline-offset: -2px;
  }

  &:disabled {
    cursor: not-allowed;
  }
`

const ChipLabel = styled.span`
  min-width: 0;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  ${MOBILE} {
    max-width: 96px;
  }
`

const ChipClearButton = styled.button`
  width: 40px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-left: 1px solid var(--color-border-200);
  background: transparent;
  color: var(--color-text-primary-on-light);
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--color-primary-700);

    outline-offset: -2px;
  }
`

const PanelTop = styled.div`
  position: sticky;
  z-index: 1;
  top: 0;
  display: grid;
  gap: 8px;
  padding: 12px 20px 8px;
  border-bottom: 1px solid var(--color-border-200);
  background: var(--color-surface);
`

const SearchField = styled.div`
  position: relative;
`

const SearchIcon = styled(Search)`
  position: absolute;
  top: 50%;
  left: 16px;
  color: var(--color-text-caption);
  transform: translateY(-50%);
  pointer-events: none;
`

const SearchInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 0 16px 0 40px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-field);
  background: var(--color-surface);
  color: var(--color-text-900);
  font: inherit;
  font-size: 16px;

  &::placeholder {
    color: var(--color-placeholder);
  }

  /* 포커스 신호는 테두리 하나다 — 전역 :focus-visible 링을 끈다(DESIGN.md §Inputs & Forms). */
  &,
  &:focus,
  &:focus-visible {
    outline: none;
  }

  &:focus-visible {
    border-color: var(--color-primary-700);
    box-shadow: var(--shadow-focus-primary-strong);
  }
`

const Breadcrumb = styled.nav`
  ol {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--color-text-caption);
  }
`

const CrumbButton = styled.button`
  min-height: 40px;
  padding: 0 8px;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--color-text-primary-on-light);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
`

const CrumbCurrent = styled.span`
  padding: 0 4px;
  color: var(--color-text-900);
  font-size: 13px;
  font-weight: 600;
`

const OptionList = styled.ul`
  margin: 0;
  padding: 4px 0 8px;
  list-style: none;
`

const Row = styled.button<{ $selected?: boolean }>`
  width: 100%;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 20px;
  border: 0;
  background: transparent;
  color: ${props =>
    props.$selected
      ? 'var(--color-text-primary-on-light)'
      : 'var(--color-text-900)'};
  font: inherit;
  font-size: 16px;
  font-weight: ${props => (props.$selected ? 600 : 400)};
  text-align: left;
  cursor: pointer;

  span {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  svg {
    flex: 0 0 auto;
  }

  &:hover {
    background: var(--color-background-muted);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary-700);

    outline-offset: -2px;
  }
`

const StatusRow = styled.li`
  display: grid;
  justify-items: start;
  gap: 8px;
  padding: 12px 20px;
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 1.6;
`

const ErrorText = styled.p`
  color: var(--color-danger);
`

const RetryButton = styled.button`
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid var(--color-border-300);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text-700);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
`

/* 단계마다 목록이 무엇인지(조사까지). 안내 문구가 단계를 말해야 지금 어디인지 안다. */
const levelNoun: Record<
  RegionSheetStep['level'],
  { object: string; subject: string; base: string }
> = {
  root: { base: '자치구', object: '자치구를', subject: '자치구가' },
  district: { base: '행정동', object: '행정동을', subject: '행정동이' },
  administration: { base: '상권', object: '상권을', subject: '상권이' },
}

const districtOptions: RegionSheetOption[] = districts.map(district => ({
  code: String(district.gooCode),
  name: district.gooName,
}))

type CommunityRegionSheetPanelProps = {
  value: CommunityLocationValue
  mockEnabled: boolean
  onCommit: (value: CommunityLocationValue) => void
}

/**
 * 시트 안쪽 — 단계 리스트. 시트를 열 때마다 새로 마운트되므로 단계·검색어는 매번 처음부터다.
 * 단계 이동·확정값 계산은 `@/lib/community/region-sheet` 의 순수 함수가 정한다.
 */
export function CommunityRegionSheetPanel({
  value,
  mockEnabled,
  onCommit,
}: CommunityRegionSheetPanelProps) {
  const [step, setStep] = useState<RegionSheetStep>(() =>
    getRegionSheetInitialStep(value),
  )
  const [query, setQuery] = useState('')
  const allRowRef = useRef<HTMLButtonElement>(null)
  const movedRef = useRef(false)

  const districtCode = step.level === 'root' ? undefined : step.district.code
  const administrationCode =
    step.level === 'administration' ? step.administration.code : undefined

  const administrationsQuery = useQuery({
    queryKey: communityLocationQueryKeys.administrations(
      mockEnabled,
      districtCode,
    ),
    queryFn: () => loadCommunityAdministrations(mockEnabled, districtCode!),
    enabled: step.level === 'district',
  })

  const commercialsQuery = useQuery({
    queryKey: communityLocationQueryKeys.commercials(
      mockEnabled,
      districtCode,
      administrationCode,
    ),
    queryFn: () =>
      loadCommunityCommercials(mockEnabled, districtCode!, administrationCode!),
    enabled: step.level === 'administration',
  })

  // 단계를 옮기면 누른 행이 사라진다 — 포커스를 새 단계의 첫 행으로 옮겨 시트 안에 둔다.
  useEffect(() => {
    if (!movedRef.current) {
      return
    }

    movedRef.current = false
    allRowRef.current?.focus()
  }, [step])

  const listQuery =
    step.level === 'district'
      ? administrationsQuery
      : step.level === 'administration'
        ? commercialsQuery
        : null

  const options = useMemo<RegionSheetOption[] | null>(() => {
    if (step.level === 'root') {
      return districtOptions
    }

    if (step.level === 'district') {
      return (
        readCommunityLocationOptions<AdministrationArea>(
          administrationsQuery.data,
        )?.map(item => ({
          code: item.administrationCode,
          name: item.administrationName,
        })) ?? null
      )
    }

    return (
      readCommunityLocationOptions<CommercialArea>(commercialsQuery.data)?.map(
        item => ({ code: item.commercialCode, name: item.commercialName }),
      ) ?? null
    )
  }, [administrationsQuery.data, commercialsQuery.data, step.level])

  const listState: 'ready' | 'loading' | 'error' = !listQuery
    ? 'ready'
    : listQuery.isError || (listQuery.data !== undefined && options === null)
      ? 'error'
      : listQuery.data === undefined
        ? 'loading'
        : 'ready'

  const noun = levelNoun[step.level]
  const allRow = getRegionSheetAllRow(step)
  const allRowSelected = isRegionSheetValueSelected(value, allRow.value)
  const filtered = filterRegionSheetOptions(options ?? [], query)

  const goTo = (next: RegionSheetStep) => {
    movedRef.current = true
    setQuery('')
    setStep(next)
  }

  return (
    <>
      <PanelTop>
        <SearchField>
          <SearchIcon aria-hidden="true" size={18} />
          <SearchInput
            aria-label="지역 이름으로 찾기"
            enterKeyHint="search"
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setQuery(event.currentTarget.value)
            }}
            placeholder={`${noun.base} 이름으로 찾기`}
            type="search"
            value={query}
          />
        </SearchField>
        <Breadcrumb aria-label="지역 경로">
          <ol>
            {getRegionSheetBreadcrumb(step).map((crumb, index, crumbs) => {
              const isCurrent = index === crumbs.length - 1

              return (
                <li key={crumb.step.level}>
                  {index > 0 ? (
                    <ChevronRight aria-hidden="true" size={14} />
                  ) : null}
                  {isCurrent ? (
                    <CrumbCurrent aria-current="location">
                      {crumb.label}
                    </CrumbCurrent>
                  ) : (
                    <CrumbButton
                      onClick={() => {
                        goTo(crumb.step)
                      }}
                      type="button"
                    >
                      {crumb.label}
                    </CrumbButton>
                  )}
                </li>
              )
            })}
          </ol>
        </Breadcrumb>
      </PanelTop>

      <OptionList>
        <li>
          <Row
            ref={allRowRef}
            $selected={allRowSelected}
            data-region-commit="true"
            data-region-selected={allRowSelected ? 'true' : undefined}
            onClick={() => {
              onCommit(allRow.value)
            }}
            type="button"
          >
            <span>{allRow.label}</span>
            {allRowSelected ? <Check aria-hidden="true" size={18} /> : null}
          </Row>
        </li>

        {listState === 'loading' ? (
          <StatusRow aria-busy="true" role="status">
            {`${noun.object} 불러오는 중이에요`}
          </StatusRow>
        ) : listState === 'error' ? (
          <StatusRow role="status">
            <ErrorText>{`${noun.object} 불러오지 못했어요.`}</ErrorText>
            <RetryButton
              onClick={() => {
                void listQuery?.refetch()
              }}
              type="button"
            >
              다시 시도
            </RetryButton>
          </StatusRow>
        ) : filtered.length === 0 ? (
          <StatusRow role="status">
            {query.trim()
              ? `「${query.trim()}」에 맞는 ${noun.subject} 없어요`
              : `고를 수 있는 ${noun.subject} 없어요`}
          </StatusRow>
        ) : (
          filtered.map(option => {
            const pick = resolveRegionSheetPick(step, option)

            if (pick.type === 'descend') {
              return (
                <li key={option.code}>
                  <Row
                    data-region-descend="true"
                    onClick={() => {
                      goTo(pick.step)
                    }}
                    type="button"
                  >
                    <span>{option.name}</span>
                    <ChevronRight aria-hidden="true" size={18} />
                  </Row>
                </li>
              )
            }

            const selected = isRegionSheetValueSelected(value, pick.value)

            return (
              <li key={option.code}>
                <Row
                  $selected={selected}
                  data-region-commit="true"
                  data-region-selected={selected ? 'true' : undefined}
                  onClick={() => {
                    onCommit(pick.value)
                  }}
                  type="button"
                >
                  <span>{option.name}</span>
                  {selected ? <Check aria-hidden="true" size={18} /> : null}
                </Row>
              </li>
            )
          })
        )}
      </OptionList>
    </>
  )
}

/**
 * 목록 툴바의 지역 칩 + 해제 버튼 + 지역 선택 시트(docs/features/community/community.md §S4).
 *
 * 3단 select(`CommunityLocationPicker`)를 목록에서만 대체한다 — 글쓰기는 3단계에서 옮긴다.
 * **고른 순간에만 `onChange` 를 부른다.** 예전 선택기는 select 를 바꿀 때마다 목록을 다시 불렀다.
 */
export default function CommunityRegionSheet({
  value,
  mockEnabled,
  disabled = false,
  onChange,
}: CommunityRegionSheetProps) {
  const [open, setOpen] = useState(false)
  const chipRef = useRef<HTMLButtonElement>(null)
  const hasTarget = Boolean(value.targetType && value.targetCode)
  const active = hasTarget && !disabled

  return (
    <>
      <ChipGroup $active={active} $disabled={disabled}>
        <Chip
          ref={chipRef}
          $active={active}
          aria-expanded={open}
          aria-haspopup="dialog"
          disabled={disabled}
          onClick={() => {
            setOpen(true)
          }}
          type="button"
        >
          <MapPin aria-hidden="true" size={16} />
          <ChipLabel>{getCommunityLocationDisplayName(value)}</ChipLabel>
          <ChevronDown aria-hidden="true" size={16} />
        </Chip>
        {active ? (
          <ChipClearButton
            aria-label="지역 필터 해제"
            onClick={() => {
              onChange({})
              // 해제하면 이 버튼이 사라진다 — 포커스를 칩으로 넘긴다.
              chipRef.current?.focus()
            }}
            type="button"
          >
            <X aria-hidden="true" size={16} />
          </ChipClearButton>
        ) : null}
      </ChipGroup>

      <CommunitySheet
        onClose={() => {
          setOpen(false)
        }}
        open={open}
        returnFocusRef={chipRef}
        title="지역 선택"
      >
        <CommunityRegionSheetPanel
          mockEnabled={mockEnabled}
          onCommit={nextValue => {
            setOpen(false)
            onChange(nextValue)
          }}
          value={value}
        />
      </CommunitySheet>
    </>
  )
}
