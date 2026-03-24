'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import styled from 'styled-components'
import {
  CardEyebrow,
  CardGrid,
  CardText,
  CardTitle,
  ContentCard,
  EmptyState,
  MetaItem,
  MetaList,
  SectionNotice,
  SectionStack,
} from '@/components/profile/profile-ui'
import { fetchSavedSimulationList } from '@/lib/api/simulation'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import { formatLargeWon } from '@/lib/format'

const ActionLink = styled(Link)`
  margin-top: 16px;
  width: fit-content;
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 14px;
  border: 1px solid var(--color-primary-700);
  border-radius: 12px;
  color: var(--color-primary-700);
  font-size: 14px;
  font-weight: 700;
`

export default function ProfileSimulationBookmarksPage() {
  const query = useQuery({
    queryKey: ['simulationBookmarks'],
    queryFn: () => fetchSavedSimulationList(0, 9),
  })

  if (query.isPending) {
    return (
      <SectionStack>
        <SectionNotice $tone="info">
          시뮬레이션 저장 목록을 불러오는 중입니다.
        </SectionNotice>
      </SectionStack>
    )
  }

  if (!query.data || !isApiSuccess(query.data)) {
    return (
      <SectionStack>
        <SectionNotice $tone="error">
          {getApiMessage(
            query.data,
            '시뮬레이션 저장 목록을 불러오지 못했습니다.',
          )}
        </SectionNotice>
      </SectionStack>
    )
  }

  if (query.data.dataBody.data.length === 0) {
    return (
      <SectionStack>
        <EmptyState>저장된 창업 시뮬레이션 결과가 아직 없습니다.</EmptyState>
      </SectionStack>
    )
  }

  return (
    <SectionStack>
      <CardGrid>
        {query.data.dataBody.data.map(item => (
          <ContentCard key={item.id}>
            {(() => {
              const href = new URLSearchParams({
                gugun: item.gugun,
                serviceCode: item.serviceCode,
                serviceCodeName: item.serviceCodeName,
                isFranchisee: item.isFranchisee ? 'true' : 'false',
                brandName: item.brandName ?? '',
                storeSize: String(item.storeSize),
                floor: item.floor,
              }).toString()

              return (
                <>
                  <CardEyebrow>{item.brandName ?? '개인 창업'}</CardEyebrow>
                  <CardTitle>
                    예상 창업비용 {formatLargeWon(item.totalPrice)}
                  </CardTitle>
                  <CardText>
                    {item.serviceCodeName}, {item.gugun}, {item.storeSize}㎡,{' '}
                    {item.floor}
                  </CardText>
                  <MetaList>
                    <MetaItem>
                      {item.isFranchisee ? '프랜차이즈' : '개인 창업'}
                    </MetaItem>
                    <MetaItem>저장된 조건 재사용</MetaItem>
                  </MetaList>
                  <ActionLink href={`/analysis/simulation/report?${href}`}>
                    리포트 다시 열기
                  </ActionLink>
                </>
              )
            })()}
          </ContentCard>
        ))}
      </CardGrid>
    </SectionStack>
  )
}
