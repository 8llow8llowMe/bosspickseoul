'use client'

import {
  memo,
  useEffect,
  useId,
  useMemo,
  useState,
  type KeyboardEvent,
} from 'react'
import { Search } from 'lucide-react'
import styled from 'styled-components'

import { TextField } from '@/components/ui/text-field'
import {
  getNameSearchResultKey,
  matchAreaNames,
  NAME_SEARCH_KIND_LABEL,
  normalizeSearchText,
  type NameSearchAreaEntry,
  type NameSearchPlace,
  type NameSearchResult,
} from '@/lib/analysis/name-search'
import { searchSeoulPlaces } from '@/lib/analysis/place-search'

/** 타자 사이 이 시간만큼 멈추면 찾는다. 장소 검색은 원격 호출이라 글자마다 부르지 않는다. */
export const NAME_SEARCH_DEBOUNCE_MS = 250
/** 장소 검색은 두 글자부터 한다. 한 글자(「역」)로는 결과가 서울 전역에 흩어진다. */
const PLACE_SEARCH_MIN_LENGTH = 2
const AREA_RESULT_LIMIT = 5
const PLACE_RESULT_LIMIT = 5

export const NAME_SEARCH_LABEL = '상권·지하철역·동 이름으로 찾기'

/** 고른 결과를 셸이 반영한 결과. 실패하면 칸 아래에 이유를 적고 칸은 그대로 둔다. */
export type NameSearchPickOutcome =
  | { ok: true }
  | { ok: false; message: string }
  /**
   * 고르는 동안 사용자가 다른 길(목록·지도·인기 상권)로 이미 선택을 바꿨다. 늦게 끝난 검색 결과는
   * 버리고 아무것도 알리지 않는다.
   */
  | { ok: false; cancelled: true }

/** 결과 0건 안내. 검색어 뒤에 조사를 붙이지 않는다(받침에 따라 「와/과」가 갈린다). */
export const describeNoResult = (query: string, placeSearchFailed: boolean) =>
  placeSearchFailed
    ? `지하철역·장소 검색을 지금 쓸 수 없고, 상권·동 이름에서도 「${query}」 이름에 맞는 곳을 찾지 못했습니다. 잠시 후 다시 찾아 주세요.`
    : `「${query}」 이름에 맞는 상권·지하철역·동을 찾지 못했습니다. 다른 이름으로 다시 찾아 주세요.`

export type AnalysisNameSearchProps = {
  /** 화면이 이미 받아 둔 지역 이름(`buildAreaNameEntries`). */
  entries: readonly NameSearchAreaEntry[]
  onPick: (result: NameSearchResult) => Promise<NameSearchPickOutcome>
  /** 테스트가 카카오 대신 넣는다. 기본은 카카오 장소 검색이다. */
  searchPlaces?: (keyword: string) => Promise<NameSearchPlace[]>
  debounceMs?: number
  /**
   * 모바일 시트용(#648). 칸 위 라벨(「상권·지하철역·동 이름으로 찾기」)은 화면에서만 감추고(라벨 연결·
   * 접근 이름은 남는다), 칸 아래 도움말(「자치구 이름도 이 칸에서 찾을 수 있습니다.」)은 뺀다. 자리표시
   * 글자(「예: 망원시장, 강남역, 연남동, 마포구」)가 두 말을 이미 한다. 두 줄이 시트에서 자치구 카드
   * 자리를 먹었다.
   */
  compact?: boolean
}

type PlaceState = {
  query: string
  status: 'loading' | 'done' | 'error'
  items: NameSearchPlace[]
}

const Root = styled.div`
  display: grid;
  gap: 8px;
`

const Listbox = styled.ul`
  max-height: 264px;
  overflow-y: auto;
  display: grid;
  gap: 2px;
  padding: 4px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-2);

  &[hidden] {
    display: none;
  }
`

const Option = styled.li<{ $active: boolean }>`
  min-height: 44px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 8px;
  padding: 6px 10px;
  border-radius: var(--radius-control);
  background: ${props =>
    props.$active ? 'var(--color-primary-100)' : 'transparent'};
  box-shadow: ${props =>
    props.$active ? 'inset 0 0 0 1px var(--color-primary-600)' : 'none'};
  cursor: pointer;

  &[aria-disabled='true'] {
    cursor: progress;
    opacity: 0.6;
  }

  @media (hover: hover) {
    &:hover {
      background: var(--color-primary-100);
    }
  }
`

const OptionText = styled.span`
  min-width: 0;
  display: grid;
`

const OptionName = styled.span`
  overflow: hidden;
  color: var(--color-text-900);
  font-size: 14px;
  font-weight: 700;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const OptionContext = styled.span`
  overflow: hidden;
  color: var(--color-text-caption);
  font-size: 12px;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const KindBadge = styled.span`
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  background: var(--color-surface-muted);
  color: var(--color-text-600);
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
  white-space: nowrap;
`

const Message = styled.p<{ $tone: 'info' | 'error' }>`
  color: ${props =>
    props.$tone === 'error' ? 'var(--color-danger)' : 'var(--color-text-600)'};
  font-size: 13px;
  line-height: 20px;
  word-break: keep-all;
`

const LiveRegion = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
`

const describeResult = (result: NameSearchResult): string => {
  if (result.kind === 'place') return result.address
  return result.context ?? ''
}

const kindLabelOf = (result: NameSearchResult): string =>
  result.kind === 'place'
    ? result.category
    : NAME_SEARCH_KIND_LABEL[result.kind]

/**
 * 상권분석 첫 단계의 이름 검색(#596). WAI-ARIA 콤보박스(목록형 자동완성) 패턴을 따른다 — 포커스는
 * 입력칸에 머물고, ↑↓ 로 고른 항목을 `aria-activedescendant` 가 가리킨다. Enter 로 확정, Esc 로 닫고
 * 닫힌 상태의 Esc 는 검색어를 지운다.
 */
function AnalysisNameSearch({
  entries,
  onPick,
  searchPlaces = searchSeoulPlaces,
  debounceMs = NAME_SEARCH_DEBOUNCE_MS,
  compact = false,
}: AnalysisNameSearchProps) {
  const baseId = useId()
  const listboxId = `${baseId}-listbox`
  const messageId = `${baseId}-message`
  const [value, setValue] = useState('')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [places, setPlaces] = useState<PlaceState | null>(null)
  const [picking, setPicking] = useState(false)
  const [pickError, setPickError] = useState<string | null>(null)

  // 디바운스: 입력이 멈추면 검색어를 확정한다.
  useEffect(() => {
    const trimmed = value.trim()
    const timer = window.setTimeout(() => setQuery(trimmed), debounceMs)
    return () => window.clearTimeout(timer)
  }, [debounceMs, value])

  // 장소 검색. 늦게 온 이전 검색어의 응답은 버린다(`query` 비교).
  useEffect(() => {
    if (normalizeSearchText(query).length < PLACE_SEARCH_MIN_LENGTH) return
    let cancelled = false
    // 원격 호출 시작을 알리는 상태다. 응답은 아래 콜백에서 같은 검색어일 때만 반영한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlaces({ query, status: 'loading', items: [] })
    searchPlaces(query)
      .then(items => {
        if (!cancelled) setPlaces({ query, status: 'done', items })
      })
      .catch(() => {
        if (!cancelled) setPlaces({ query, status: 'error', items: [] })
      })
    return () => {
      cancelled = true
    }
  }, [query, searchPlaces])

  const areaResults = useMemo(
    () => matchAreaNames(entries, query, AREA_RESULT_LIMIT),
    [entries, query],
  )
  const placeSearchApplies =
    normalizeSearchText(query).length >= PLACE_SEARCH_MIN_LENGTH
  const currentPlaces =
    placeSearchApplies && places?.query === query ? places : null
  const placeStatus: PlaceState['status'] | 'skipped' = !placeSearchApplies
    ? 'skipped'
    : (currentPlaces?.status ?? 'loading')
  const results: NameSearchResult[] = useMemo(
    () => [
      ...areaResults,
      ...(currentPlaces?.items.slice(0, PLACE_RESULT_LIMIT) ?? []),
    ],
    [areaResults, currentPlaces],
  )

  const settled = placeStatus !== 'loading'
  const hasQuery = query.length > 0 && value.trim().length > 0
  const expanded = open && hasQuery && results.length > 0
  const safeActiveIndex =
    expanded && activeIndex < results.length ? activeIndex : -1
  const activeOptionId =
    safeActiveIndex >= 0 ? `${listboxId}-option-${safeActiveIndex}` : undefined

  /* 칸 아래 안내. 결과 0건·장소 검색 실패·고르기 실패를 사용자 말로 적는다. */
  const message: { tone: 'info' | 'error'; text: string } | null = pickError
    ? { tone: 'error', text: pickError }
    : !open || !hasQuery
      ? null
      : results.length === 0 && settled
        ? {
            tone: 'info',
            text: describeNoResult(query, placeStatus === 'error'),
          }
        : placeStatus === 'error'
          ? {
              tone: 'info',
              text: '지하철역·장소 검색을 지금 쓸 수 없어 상권·동 이름에서만 찾았습니다.',
            }
          : null

  /* 스크린리더 안내. 보이는 목록·안내문과 같은 내용을 한 곳에서 읽어 준다. */
  const liveText =
    !open || !hasQuery
      ? ''
      : !settled
        ? // 장소 응답이 오기 전에 개수를 읽으면 곧바로 다른 숫자로 바뀐다. 다 찾은 뒤에 한 번만 읽는다.
          '검색어와 맞는 이름을 찾고 있습니다.'
        : results.length > 0
          ? `검색 결과 ${results.length}개가 있습니다. 위아래 방향키로 고를 수 있습니다.`
          : (message?.text ?? '')

  const pick = async (result: NameSearchResult) => {
    // 고르는 중(역조회·경계 조회)에 다시 누르면 무시한다.
    if (picking) return
    setPicking(true)
    setPickError(null)
    try {
      const outcome = await onPick(result)
      if (outcome.ok) {
        setValue('')
        setQuery('')
        setOpen(false)
        setActiveIndex(-1)
      } else if ('message' in outcome) {
        setPickError(outcome.message)
      }
    } catch {
      setPickError(
        '고른 곳을 분석 대상으로 바꾸지 못했습니다. 잠시 후 다시 골라 주세요.',
      )
    } finally {
      setPicking(false)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      if (results.length === 0) return
      setActiveIndex(index =>
        !open || index < 0 || index >= results.length - 1 ? 0 : index + 1,
      )
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      if (results.length === 0) return
      setActiveIndex(index =>
        !open || index <= 0 || index >= results.length
          ? results.length - 1
          : index - 1,
      )
      return
    }
    if (event.key === 'Enter') {
      if (expanded && safeActiveIndex >= 0) {
        event.preventDefault()
        void pick(results[safeActiveIndex])
      }
      return
    }
    if (event.key === 'Escape') {
      if (expanded) {
        event.preventDefault()
        setOpen(false)
        setActiveIndex(-1)
        return
      }
      if (value) {
        event.preventDefault()
        setValue('')
        setQuery('')
        setPickError(null)
      }
    }
  }

  return (
    <Root>
      <TextField
        label={NAME_SEARCH_LABEL}
        labelVisuallyHidden={compact}
        type="search"
        fieldSize="large"
        emphasized
        leftSlot={<Search />}
        placeholder="예: 망원시장, 강남역, 연남동, 마포구"
        helperText={
          compact ? undefined : '자치구 이름도 이 칸에서 찾을 수 있습니다.'
        }
        autoComplete="off"
        enterKeyHint="search"
        value={value}
        role="combobox"
        // 도움말이 <label> 안에 있어 이름에 섞여 든다. 보이는 라벨 글자만 이름이 되게 고정한다.
        aria-label={NAME_SEARCH_LABEL}
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listboxId}
        aria-activedescendant={activeOptionId}
        aria-describedby={message ? messageId : undefined}
        aria-busy={picking || undefined}
        onChange={event => {
          setValue(event.target.value)
          setOpen(true)
          setActiveIndex(-1)
          setPickError(null)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false)
          setActiveIndex(-1)
        }}
        onKeyDown={handleKeyDown}
        onClear={() => {
          setValue('')
          setQuery('')
          setPickError(null)
        }}
      />

      <Listbox
        id={listboxId}
        role="listbox"
        aria-label="이름 검색 결과"
        hidden={!expanded}
      >
        {expanded
          ? results.map((result, index) => {
              const context = describeResult(result)
              return (
                <Option
                  key={getNameSearchResultKey(result)}
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  aria-selected={index === safeActiveIndex}
                  aria-disabled={picking || undefined}
                  $active={index === safeActiveIndex}
                  // 누르는 동안 입력칸이 blur 되면 목록이 닫혀 click 이 오지 않는다.
                  onPointerDown={event => event.preventDefault()}
                  onMouseDown={event => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => void pick(result)}
                >
                  <OptionText>
                    <OptionName>{result.name}</OptionName>
                    {context ? <OptionContext>{context}</OptionContext> : null}
                  </OptionText>
                  <KindBadge>{kindLabelOf(result)}</KindBadge>
                </Option>
              )
            })
          : null}
      </Listbox>

      {message ? (
        <Message
          id={messageId}
          $tone={message.tone}
          role={message.tone === 'error' ? 'alert' : undefined}
        >
          {message.text}
        </Message>
      ) : null}

      <LiveRegion role="status" aria-live="polite">
        {liveText}
      </LiveRegion>
    </Root>
  )
}

export default memo(AnalysisNameSearch)
