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
import { getAnalysisBookmarks } from '@/lib/api/analysis'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import { formatDateTime } from '@/lib/format'

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

export default function ProfileAnalysisBookmarksPage() {
  const query = useQuery({
    queryKey: ['analysisBookmarks'],
    queryFn: () => getAnalysisBookmarks(0, 9),
  })

  if (query.isPending) {
    return (
      <SectionStack>
        <SectionNotice $tone="info">
          분석 북마크를 불러오는 중입니다.
        </SectionNotice>
      </SectionStack>
    )
  }

  if (!query.data || !isApiSuccess(query.data)) {
    return (
      <SectionStack>
        <SectionNotice $tone="error">
          {getApiMessage(query.data, '분석 북마크를 불러오지 못했습니다.')}
        </SectionNotice>
      </SectionStack>
    )
  }

  if (query.data.dataBody.data.length === 0) {
    return (
      <SectionStack>
        <EmptyState>저장된 상권 분석 북마크가 아직 없습니다.</EmptyState>
      </SectionStack>
    )
  }

  return (
    <SectionStack>
      <CardGrid>
        {query.data.dataBody.data.map(item => (
          <ContentCard key={`${item.commercialCode}-${item.createdAt}`}>
            {(() => {
              const href = new URLSearchParams({
                districtCode: item.districtCode,
                districtName: item.districtCodeName,
                administrationCode: item.administrationCode,
                administrationName: item.administrationCodeName,
                commercialCode: item.commercialCode,
                commercialName: item.commercialCodeName,
                serviceCode: item.serviceCode,
                serviceName: item.serviceCodeName,
                serviceType: item.serviceType,
                periodCode: '20233',
              }).toString()

              return (
                <>
                  <CardEyebrow>{item.serviceCodeName}</CardEyebrow>
                  <CardTitle>{item.commercialCodeName}</CardTitle>
                  <CardText>
                    {item.districtCodeName} {item.administrationCodeName}
                  </CardText>
                  <MetaList>
                    <MetaItem>{item.serviceType}</MetaItem>
                    <MetaItem>{formatDateTime(item.createdAt)}</MetaItem>
                  </MetaList>
                  <ActionLink href={`/analysis/result?${href}`}>
                    분석 결과 다시 보기
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
