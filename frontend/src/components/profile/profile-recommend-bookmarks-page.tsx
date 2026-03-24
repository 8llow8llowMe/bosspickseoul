'use client'

import { useQuery } from '@tanstack/react-query'
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
  SectionPanel,
  SectionStack,
  SectionTitle,
  SectionBody,
} from '@/components/profile/profile-ui'
import { recommendSaveList } from '@/lib/api/recommend'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import { formatDateTime } from '@/lib/format'

export default function ProfileRecommendBookmarksPage() {
  const query = useQuery({
    queryKey: ['recommendSaveList'],
    queryFn: recommendSaveList,
  })

  if (query.isPending) {
    return (
      <SectionStack>
        <SectionNotice $tone="info">
          추천 상권 저장 목록을 불러오는 중입니다.
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
            '추천 상권 저장 목록을 불러오지 못했습니다.',
          )}
        </SectionNotice>
      </SectionStack>
    )
  }

  if (query.data.dataBody.data.length === 0) {
    return (
      <SectionStack>
        <SectionPanel>
          <SectionTitle>상권추천 북마크</SectionTitle>
          <SectionBody>
            아직 저장된 추천 상권이 없습니다. `/recommend`에서 조건을 선택하고
            저장한 상권이 이 목록에 표시됩니다.
          </SectionBody>
        </SectionPanel>
        <EmptyState>저장된 추천 상권이 아직 없습니다.</EmptyState>
      </SectionStack>
    )
  }

  return (
    <SectionStack>
      <SectionPanel>
        <SectionTitle>상권추천 북마크</SectionTitle>
        <SectionBody>
          추천 화면에서 저장한 상권 목록입니다. 향후 상세 복원과 재추천 이동
          흐름은 Phase 5 이후에 이어서 연결합니다.
        </SectionBody>
      </SectionPanel>
      <CardGrid>
        {query.data.dataBody.data.map(item => (
          <ContentCard key={`${item.commercialCode}-${item.createdAt}`}>
            <CardEyebrow>{item.administrationCodeName}</CardEyebrow>
            <CardTitle>{item.commercialCodeName}</CardTitle>
            <CardText>{item.districtCodeName}</CardText>
            <MetaList>
              <MetaItem>상권 코드 {item.commercialCode}</MetaItem>
              <MetaItem>{formatDateTime(item.createdAt)}</MetaItem>
            </MetaList>
          </ContentCard>
        ))}
      </CardGrid>
    </SectionStack>
  )
}
