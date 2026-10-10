'use client'

import {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type Ref,
} from 'react'
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
import { Button } from '@/components/ui/button'
import CommunitySheet from '@/components/community/community-sheet'
import {
  communityLocationQueryKeys,
  getCommunityLocationDisplayName,
  loadCommunityAdministrations,
  loadCommunityCommercials,
  readCommunityLocationOptions,
  type CommunityLocationValue,
} from '@/lib/community/community-location'
import { districts } from '@/data/districts'
import { communityOutlinedField } from '@/lib/community/field-styles'
import { touchHitArea } from '@/styles/touch-target'
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

/** 글쓰기 칩이 비어 있을 때 적는 말(community.md §S4 「글쓰기 · 수정」 순서). */
export const COMMUNITY_COMPOSE_REGION_PLACEHOLDER = '어느 지역 이야기인가요?'

/** 바깥에서 시트를 여는 손잡이. 지역 없이 등록하면 폼이 칩으로 포커스를 옮기고 시트를 연다(CM-032). */
export type CommunityRegionSheetHandle = {
  focusAndOpen: () => void
  /** 칩에 포커스만 둔다 — 시트는 열지 않는다(작성 체크의 `지역` 을 눌렀을 때). */
  focus: () => void
}

export type CommunityRegionSheetProps = {
  value: CommunityLocationValue
  mockEnabled: boolean
  /** 검색 중·좋아요한 글 보기. 칩을 끄고 해제 버튼을 숨긴다(community.md §S4 「지역 칩」). */
  disabled?: boolean
  /** 고른 순간에 한 번만 부른다. 시트를 닫기만 하면 부르지 않는다. */
  onChange: (value: CommunityLocationValue) => void
  /**
   * `filter`(기본) — 목록 툴바. 비면 `서울 전체`, 해제(✕) 버튼이 있다.
   * `compose` — 글쓰기. 비면 `어느 지역 이야기인가요?`. 대상이 필수라 `서울 전체` 확정 행과
   * 해제 버튼이 없다 — 지역을 바꾸려면 시트에서 다시 고른다.
   */
  variant?: 'filter' | 'compose'
  /** compose 전용 — 수정 모드. 지역을 바꿀 수 없어 칩 대신 읽기 전용 표시를 그린다. */
  readOnly?: boolean
  /** compose 전용 — 지역 없이 등록을 눌렀다. 칩 테두리를 경고색으로. */
  invalid?: boolean
  /** compose 전용 — 칩 아래 안내 문구의 id. */
  describedBy?: string
  ref?: Ref<CommunityRegionSheetHandle>
}

const MOBILE = '@media (max-width: 479px)'

const ChipGroup = styled.div<{
  $active: boolean
  $disabled: boolean
  $invalid?: boolean
}>`
  min-width: 0;
  max-width: 100%;
  flex: 0 0 auto; /* 검색칸이 줄어들고 칩은 라벨 상한(ChipLabel)까지 자리를 지킨다 */
  display: inline-flex;
  align-items: stretch;
  overflow: hidden;
  border: 1px solid
    ${props =>
      props.$invalid
        ? 'var(--color-danger)'
        : props.$active
          ? 'var(--color-primary-700)'
          : 'var(--color-border-200)'};
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

const ChipLabel = styled.span<{ $compose?: boolean }>`
  min-width: 0;
  max-width: ${props => (props.$compose ? '100%' : '200px')};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  ${MOBILE} {
    /* 목록 툴바는 검색칸과 한 줄을 나눈다. 글쓰기 칩은 한 줄을 혼자 쓴다. */
    max-width: ${props => (props.$compose ? '100%' : '96px')};
  }
`

/* 수정 모드 — 바꿀 수 없으니 누를 것처럼 보이지 않게 버튼이 아닌 표시로 둔다. */
const ReadOnlyChip = styled.p`
  min-width: 0;
  max-width: 100%;
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
  border-radius: var(--radius-control);
  background: var(--color-surface-muted);
  color: var(--color-text-700);
  font-size: 14px;
  font-weight: 600;

  svg {
    flex: 0 0 auto;
  }

  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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

  /* 포커스·오류·크기 — 커뮤니티 입력칸 공통 조각(안쪽 한 줄, 글로우 없음, resize none). */
  ${communityOutlinedField}
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

/* 보이는 높이 40, 모바일 히트 영역만 44(#633). 이웃 경로 버튼과는 꺾쇠(14)+간격(4·4)만큼 떨어져 있다. */
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

  ${touchHitArea()}
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
  /** 글쓰기 — 최상위 `서울 전체`(대상 없음) 확정 행을 뺀다. 글은 대상이 필수다. */
  hideRootAllRow?: boolean
}

/**
 * 시트 안쪽 — 단계 리스트. 시트를 열 때마다 새로 마운트되므로 단계·검색어는 매번 처음부터다.
 * 단계 이동·확정값 계산은 `@/lib/community/region-sheet` 의 순수 함수가 정한다.
 */
export function CommunityRegionSheetPanel({
  value,
  mockEnabled,
  onCommit,
  hideRootAllRow = false,
}: CommunityRegionSheetPanelProps) {
  const [step, setStep] = useState<RegionSheetStep>(() =>
    getRegionSheetInitialStep(value),
  )
  const [query, setQuery] = useState('')
  const allRowRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
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
    // 최상위 확정 행을 뺀 글쓰기 시트는 첫 자치구 행으로 간다.
    const target =
      allRowRef.current ?? listRef.current?.querySelector<HTMLElement>('button')
    target?.focus()
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
  const showAllRow = !(hideRootAllRow && step.level === 'root')
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

      <OptionList ref={listRef}>
        {showAllRow ? (
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
        ) : null}

        {listState === 'loading' ? (
          <StatusRow aria-busy="true" role="status">
            {`${noun.object} 불러오는 중이에요`}
          </StatusRow>
        ) : listState === 'error' ? (
          <StatusRow role="status">
            <ErrorText>{`${noun.object} 불러오지 못했어요.`}</ErrorText>
            <Button
              onClick={() => {
                void listQuery?.refetch()
              }}
              size="medium"
              type="button"
              variant="secondary"
            >
              다시 시도
            </Button>
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
 * 지역 칩 + 지역 선택 시트(docs/features/community/community.md §S4).
 *
 * - `filter` — 목록 툴바. 칩 옆에 해제 버튼. 3단 select 를 대체했다.
 * - `compose` — 글쓰기(개편 3단계). 해제 버튼도 `서울 전체` 확정 행도 없다 — 글은 대상이
 *   필수라(CM-008) 「대상 없음」으로 돌아갈 길을 열어 두면 등록에서 다시 막힌다.
 *
 * **고른 순간에만 `onChange` 를 부른다.** 예전 선택기는 select 를 바꿀 때마다 목록을 다시 불렀다.
 */
export default function CommunityRegionSheet({
  value,
  mockEnabled,
  disabled = false,
  onChange,
  variant = 'filter',
  readOnly = false,
  invalid = false,
  describedBy,
  ref,
}: CommunityRegionSheetProps) {
  const [open, setOpen] = useState(false)
  const chipRef = useRef<HTMLButtonElement>(null)
  const compose = variant === 'compose'
  const hasTarget = Boolean(value.targetType && value.targetCode)
  const active = hasTarget && !disabled

  useImperativeHandle(
    ref,
    () => ({
      focusAndOpen: () => {
        if (disabled || readOnly) {
          return
        }

        // 먼저 칩에 포커스를 둔다 — 시트를 닫으면 포커스가 칩으로 돌아온다(returnFocusRef).
        chipRef.current?.focus()
        setOpen(true)
      },
      focus: () => {
        chipRef.current?.focus()
      },
    }),
    [disabled, readOnly],
  )

  if (compose && readOnly) {
    return (
      <ReadOnlyChip>
        <MapPin aria-hidden="true" size={16} />
        <span>{getCommunityLocationDisplayName(value)}</span>
      </ReadOnlyChip>
    )
  }

  const label =
    compose && !hasTarget
      ? COMMUNITY_COMPOSE_REGION_PLACEHOLDER
      : getCommunityLocationDisplayName(value)

  return (
    <>
      <ChipGroup
        $active={active}
        $disabled={disabled}
        $invalid={compose && invalid}
      >
        <Chip
          ref={chipRef}
          $active={active}
          aria-describedby={describedBy}
          aria-expanded={open}
          aria-haspopup="dialog"
          data-region-chip={variant}
          disabled={disabled}
          onClick={() => {
            setOpen(true)
          }}
          type="button"
        >
          <MapPin aria-hidden="true" size={16} />
          <ChipLabel $compose={compose}>{label}</ChipLabel>
          <ChevronDown aria-hidden="true" size={16} />
        </Chip>
        {active && !compose ? (
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

      {/* 단계마다 목록 길이가 달라 높이를 고정한다 — 도착 순간 행이 밀려 다른 지역이 눌리던 문제(#518). */}
      <CommunitySheet
        fixedHeight
        onClose={() => {
          setOpen(false)
        }}
        open={open}
        returnFocusRef={chipRef}
        title="지역 선택"
      >
        <CommunityRegionSheetPanel
          hideRootAllRow={compose}
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
