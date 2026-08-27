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

  &:hover,
  &:focus-visible {
    border-color: var(--color-primary-600);
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
    color: var(--color-primary-700);
    stroke: currentColor;
  }
`

const LoadingList = styled.div`
  display: grid;
  gap: 8px;
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
      <Heading>
        <h3>브랜드 선택</h3>
        <p>
          브랜드명을 입력하면 부분 일치로 찾아요. 선택한 브랜드의 가맹 부담금이
          계산에 반영돼요.
        </p>
      </Heading>

      <TextField
        fullWidth
        emphasized
        label="브랜드 검색"
        placeholder="브랜드명을 입력해 주세요"
        value={keywordInput}
        leftSlot={<Search aria-hidden="true" />}
        onChange={event => setKeywordInput(event.target.value)}
      />

      {query.isPending ? (
        <LoadingList role="status" aria-label="브랜드 목록 불러오는 중">
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
          description="브랜드명을 다르게 입력하거나, 개인 창업으로 다시 계산해 보세요."
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
    </Root>
  )
}
