'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, TrendingUp } from 'lucide-react'
import styled from 'styled-components'
import { fetchAnalysisRankings } from '@/lib/api/analysis-ranking'
import { retryUnlessClientError } from '@/lib/api/api-error'
import { isApiSuccess } from '@/lib/api/response'
import {
  toPopularDistrictsView,
  type PopularDistrict,
} from '@/lib/home/popular-districts'

const RANKING_SIZE = 8

const Section = styled.section`
  padding: 64px 20px;

  @media (max-width: 768px) {
    padding: 56px 20px;
  }

  @media (max-width: 640px) {
    padding: 48px 16px;
  }
`

const Inner = styled.div`
  width: min(1120px, 100%);
  margin: 0 auto;
`

const Header = styled.div`
  max-width: 680px;
  display: grid;
  gap: 10px;
  margin-bottom: 28px;

  @media (max-width: 640px) {
    margin-bottom: 20px;
  }
`

const Eyebrow = styled.p`
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-caption);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;

  svg {
    width: 16px;
    height: 16px;
    stroke: currentColor;
  }
`

const Title = styled.h2`
  color: var(--color-text-900);
  font-size: 26px;
  font-weight: 700;
  line-height: 36px;
  word-break: keep-all;

  @media (max-width: 640px) {
    font-size: 22px;
    line-height: 30px;
  }

  @media (max-width: 480px) {
    font-size: 20px;
    line-height: 28px;
  }
`

const Description = styled.p`
  font-size: 14px;
  line-height: 22px;
  color: var(--color-text-600);
  word-break: keep-all;
`

const List = styled.ol`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`

const Item = styled.li`
  display: grid;
`

const ItemLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 16px;
  min-height: 72px;
  transition:
    border-color var(--motion-fast) var(--ease-standard),
    background-color var(--motion-fast) var(--ease-standard);

  &:hover {
    border-color: var(--color-primary-600);
    background: var(--color-primary-100);
  }

  svg {
    width: 16px;
    height: 16px;
    margin-left: auto;
    flex-shrink: 0;
    color: var(--color-text-caption);
    stroke: currentColor;
  }
`

const RankBadge = styled.span<{ $top: boolean }>`
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: var(--radius-pill);
  background: ${props =>
    props.$top ? 'var(--color-primary-600)' : 'var(--color-border-200)'};
  color: ${props => (props.$top ? '#fff' : 'var(--color-text-700)')};
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
`

const Body = styled.span`
  display: grid;
  gap: 2px;
  min-width: 0;
`

const Name = styled.span`
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-900);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const ViewCount = styled.span`
  font-size: 13px;
  color: var(--color-text-600);
  font-variant-numeric: tabular-nums;
`

const SkeletonCard = styled.div`
  min-height: 72px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
`

type PopularDistrictItemProps = {
  item: PopularDistrict
  windowLabel: string | null
}

function PopularDistrictItem({ item, windowLabel }: PopularDistrictItemProps) {
  return (
    <Item>
      <ItemLink
        href={item.href}
        aria-label={`${item.rank}위 ${item.name}, 조회 ${item.viewCount.toLocaleString('ko-KR')}회${
          windowLabel ? ` (${windowLabel})` : ''
        }. 이 자치구로 상권분석 시작하기`}
      >
        <RankBadge aria-hidden="true" $top={item.rank <= 3}>
          {item.rank}
        </RankBadge>
        <Body>
          <Name>{item.name}</Name>
          {/*
            변화율 배지를 두지 않는다. 조회 수 집계에 「전기」가 없어서 0 으로 채우면
            「변동 없음」이라는 틀린 말을 하게 된다. 절대값만 적는다.
          */}
          <ViewCount aria-hidden="true">
            {item.viewCount.toLocaleString('ko-KR')}회
          </ViewCount>
        </Body>
        <ArrowRight aria-hidden="true" />
      </ItemLink>
    </Item>
  )
}

export default function PopularDistricts() {
  const rankingQuery = useQuery({
    queryKey: ['home', 'analysisRankings', 'DISTRICT', RANKING_SIZE],
    queryFn: () => fetchAnalysisRankings('DISTRICT', RANKING_SIZE),
    /*
      이 API 만 따로 죽는다 — 집계 파이프라인(Kafka/Redis)이 멈추면 여기만
      RANKING_001(503)이고 다른 분석 API 는 멀쩡하다. 그래서 다른 데이터와 한
      쿼리로 묶지 않고 이 섹션만의 쿼리로 둔다.
    */
    retry: retryUnlessClientError(1),
    staleTime: 5 * 60 * 1000,
  })

  const view =
    rankingQuery.data && isApiSuccess(rankingQuery.data)
      ? toPopularDistrictsView(rankingQuery.data.dataBody)
      : null

  /*
    실패하면 섹션을 통째로 뺀다. 홈은 랜딩 내러티브라 「순위를 불러오지 못했습니다」
    같은 오류 카드가 서 있으면 첫인상이 고장난 서비스가 된다. 이 데이터가 없어도
    나머지 홈은 온전하고, 사용자가 할 수 있는 조치도 없다(재시도 버튼은 소음이다).
  */
  if (rankingQuery.isError) {
    return null
  }

  // 로딩 중에도 자리를 잡아 둔다 — 뒤늦게 나타나며 아래 섹션을 밀어내지 않게.
  if (rankingQuery.isPending) {
    return (
      <Section aria-busy="true" aria-label="지금 많이 본 자치구">
        <Inner>
          <Header>
            <Eyebrow>
              <TrendingUp aria-hidden="true" />
              지금 많이 본 지역
            </Eyebrow>
            <Title>다른 사람들은 어디를 보고 있을까요?</Title>
          </Header>
          <List aria-hidden="true">
            {Array.from({ length: RANKING_SIZE }, (_, index) => (
              <Item key={index}>
                <SkeletonCard />
              </Item>
            ))}
          </List>
        </Inner>
      </Section>
    )
  }

  // 집계가 아직 비었을 수도 있다(배포 직후). 빈 목록을 그리느니 섹션을 뺀다.
  if (!view || view.items.length === 0) {
    return null
  }

  return (
    <Section aria-label="지금 많이 본 자치구">
      <Inner>
        <Header>
          <Eyebrow>
            <TrendingUp aria-hidden="true" />
            지금 많이 본 지역
          </Eyebrow>
          <Title>다른 사람들은 어디를 보고 있을까요?</Title>
          <Description>
            {view.windowLabel ? `${view.windowLabel} 동안 ` : ''}
            상권분석에서 가장 많이 조회된 자치구예요. 눌러서 바로 분석을 시작해
            보세요.
          </Description>
        </Header>
        <List>
          {view.items.map(item => (
            <PopularDistrictItem
              key={item.districtCode}
              item={item}
              windowLabel={view.windowLabel}
            />
          ))}
        </List>
      </Inner>
    </Section>
  )
}
