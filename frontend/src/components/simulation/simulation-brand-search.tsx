'use client'

import { useEffect, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Check, Search } from 'lucide-react'
import styled from 'styled-components'

import SimulationErrorNotice from '@/components/simulation/simulation-error-notice'
import { Button } from '@/components/ui/button'
import EmptyState from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { TextField } from '@/components/ui/text-field'
import { resolveApiError, retryUnlessClientError } from '@/lib/api/api-error'
import { fetchSimulationFranchisees } from '@/lib/api/simulation'
import { isApiSuccess } from '@/lib/api/response'
import type {
  SimulationFranchiseeSearchItem,
  SimulationFranchiseesResponse,
} from '@/types/simulation'

export type SimulationBrandSearchProps = {
  /**
   * 업종 선택이 끝난 뒤에만 렌더된다 — `franchisees`는 `serviceCode`가 없으면 400이다.
   * 호출부는 이 값을 `key`로 넘겨 업종이 바뀌면 컴포넌트를 새로 마운트한다(검색어 초기화).
   */
  serviceCode: string
  selectedFranchiseeId: number | null
  onSelect: (brand: { franchiseeId: number; brandName: string }) => void
  /**
   * 「브랜드 선택」 제목·설명을 그릴지. 입력 화면은 브랜드가 독립 섹션이라 섹션 카드가 제목을
   * 갖고 있어 끈다(같은 제목 두 번). 비교 편집기처럼 다른 필드 사이에 놓일 때는 켠다.
   */
  showHeading?: boolean
  /**
   * 찾는 브랜드가 없을 때의 출구 — 「개인 창업 기준으로 계산하기」. 넘기지 않으면 그리지
   * 않는다(비교 편집기는 창업 형태 필드가 바로 옆에 있다). 브랜드 목록의 기본 순서는 서버가
   * 정하고 인기순이 아니라서, 못 찾은 사람이 이 화면에서 막히지 않게 한다.
   */
  onSkipBrand?: () => void
}

const KEYWORD_DEBOUNCE_MS = 300

const Root = styled.div`
  display: grid;
  gap: 12px;
`

const Heading = styled.div`
  display: grid;
  gap: 4px;

  h3 {
    color: var(--color-text-900);
    font-size: 16px;
    font-weight: 700;
    line-height: 24px;
  }

  p {
    color: var(--color-text-600);
    font-size: 13px;
    line-height: 20px;
    word-break: keep-all;
  }
`

/* 10건이 한 줄씩 쌓이면 넓은 컬럼에서 섹션 높이만 잡아먹는다 — 폭이 되면 여러 열로 흘린다. */
const ResultList = styled.ul`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 8px;
`

const BrandButton = styled.button<{ $selected: boolean }>`
  width: 100%;
  min-height: 52px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid
    ${props =>
      props.$selected ? 'var(--color-primary-600)' : 'var(--color-border-200)'};
  border-radius: var(--radius-control);
  background: ${props =>
    props.$selected ? 'var(--color-primary-100)' : 'var(--color-surface)'};
  color: var(--color-text-800);
  padding: 10px 14px;
  text-align: left;
  cursor: pointer;

  &:hover {
    border-color: var(--color-primary-600);
  }

  /*
    포커스는 hover 와 달라야 한다. 링을 지우고 hover 와 똑같은 테두리만 남기면
    키보드 사용자는 자기가 어디 있는지 알 수 없다 — 마우스로 지나간 것과 구별이
    안 된다. 테두리는 포커스 색(primary-700)으로 두고 글로우를 얹어 갈라 놓는다
    (DESIGN.md §Primary — 600 은 hover/pressed 전용).
  */
  &:focus-visible {
    border-color: var(--color-primary-700);
    box-shadow: var(--shadow-focus-primary);
    outline: none;
  }

  strong {
    min-width: 0;
    flex: 1;
    overflow: hidden;
    color: var(--color-text-900);
    font-size: 14px;
    font-weight: 600;
    line-height: 22px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  svg {
    width: 18px;
    height: 18px;
    flex: 0 0 auto;
    color: var(--color-text-primary-on-light);
    stroke: currentColor;
  }
`

const LoadingList = styled.div`
  display: grid;
  gap: 8px;

  p {
    color: var(--color-text-600);
    font-size: 13px;
    line-height: 20px;
  }
`

/* 목록 아래 출구 한 줄. 주 동작(브랜드 고르기)과 겨루지 않게 텍스트 버튼으로 둔다. */
const SkipRow = styled.p`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 4px 8px;
  color: var(--color-text-600);
  font-size: 13px;
  line-height: 20px;
  word-break: keep-all;
`

const MoreRow = styled.div`
  display: flex;
  justify-content: center;
`

const readFranchisees = (
  response: SimulationFranchiseesResponse,
): SimulationFranchiseeSearchItem[] =>
  isApiSuccess(response) ? (response.dataBody?.franchisees ?? []) : []

/**
 * 브랜드 커서 검색.
 *
 * 커서 규약이 이 화면의 유일한 함정이다. **첫 조회에는 `lastId`를 싣지 않는다** —
 * `lastId: 0`은 "0번 다음부터"라는 다른 의미라서 V1 습관대로 0을 보내면 1페이지가 조용히 사라진다.
 * 그래서 `initialPageParam`을 `null`로 두고, 쿼리스트링 빌더가 null이면 키째 뺀다.
 * 응답 `lastId`가 null이면 마지막 페이지이므로 "더 보기"를 감춘다.
 */
export default function SimulationBrandSearch({
  serviceCode,
  selectedFranchiseeId,
  onSelect,
  showHeading = true,
  onSkipBrand,
}: SimulationBrandSearchProps) {
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(keywordInput.trim())
    }, KEYWORD_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [keywordInput])

  const query = useInfiniteQuery({
    queryKey: ['simulation', 'franchisees', serviceCode, keyword],
    queryFn: ({ pageParam }) =>
      fetchSimulationFranchisees({
        serviceCode,
        keyword,
        lastId: pageParam,
      }),
    initialPageParam: null as number | null,
    // 응답 lastId가 null이면 undefined를 돌려 다음 페이지 요청 자체를 막는다.
    getNextPageParam: (lastPage: SimulationFranchiseesResponse) =>
      isApiSuccess(lastPage)
        ? (lastPage.dataBody?.lastId ?? undefined)
        : undefined,
    retry: retryUnlessClientError(),
  })

  const pages = query.data?.pages
  const items = (pages ?? []).flatMap(readFranchisees)
  const error = resolveApiError({
    error: query.error,
    data: pages && pages.length > 0 ? pages[pages.length - 1] : undefined,
  })

  return (
    <Root>
      {showHeading ? (
        <Heading>
          <h3>브랜드 선택</h3>
          <p>
            브랜드명을 입력하면 부분 일치로 찾아요. 선택한 브랜드의 가맹
            부담금이 계산에 반영돼요.
          </p>
        </Heading>
      ) : null}

      <TextField
        fullWidth
        emphasized
        label="브랜드 검색"
        placeholder="브랜드명 일부만 입력해도 찾아요"
        value={keywordInput}
        leftSlot={<Search aria-hidden="true" />}
        onChange={event => setKeywordInput(event.target.value)}
      />

      {query.isPending ? (
        /* 첫 조회가 몇 초 걸릴 수 있어(dev 실측 5.8초) 스켈레톤만 두지 않고 문구를 보인다. */
        <LoadingList role="status">
          <p>브랜드를 불러오는 중이에요</p>
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} $height="52px" />
          ))}
        </LoadingList>
      ) : null}

      {!query.isPending && error ? (
        <SimulationErrorNotice
          error={error}
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {!query.isPending && !error && items.length === 0 ? (
        <EmptyState
          title="검색 결과가 없어요"
          description="브랜드명을 다르게 입력하거나, 개인 창업 기준으로 계산해 보세요."
          action={
            onSkipBrand ? (
              <Button size="large" variant="secondary" onClick={onSkipBrand}>
                개인 창업 기준으로 계산하기
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {items.length > 0 ? (
        <ResultList aria-label="브랜드 검색 결과">
          {items.map(item => {
            const selected = item.franchiseeId === selectedFranchiseeId
            return (
              <li key={item.franchiseeId}>
                <BrandButton
                  type="button"
                  $selected={selected}
                  aria-pressed={selected}
                  onClick={() =>
                    onSelect({
                      franchiseeId: item.franchiseeId,
                      brandName: item.brandName,
                    })
                  }
                >
                  <strong>{item.brandName}</strong>
                  {selected ? <Check aria-hidden="true" /> : null}
                </BrandButton>
              </li>
            )
          })}
        </ResultList>
      ) : null}

      {query.hasNextPage ? (
        <MoreRow>
          <Button
            size="medium"
            variant="secondary"
            isLoading={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            더 보기
          </Button>
        </MoreRow>
      ) : null}

      {/* 결과가 있을 때와 조회 오류일 때 둘 다 출구를 둔다 — 오류 화면이 막다른 길이 되지 않게.
          결과가 없을 때는 EmptyState 의 버튼이 같은 일을 한다. */}
      {onSkipBrand && !query.isPending && (items.length > 0 || error) ? (
        <SkipRow>
          찾는 브랜드가 없나요?
          <Button size="medium" variant="ghost" onClick={onSkipBrand}>
            개인 창업 기준으로 계산하기
          </Button>
        </SkipRow>
      ) : null}
    </Root>
  )
}
