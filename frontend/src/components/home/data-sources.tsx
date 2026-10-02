'use client'

import {
  BriefcaseBusiness,
  Building2,
  Database,
  ExternalLink,
  Landmark,
  type LucideIcon,
} from 'lucide-react'
import styled from 'styled-components'

import {
  HOME_COLUMN,
  HOME_FULL_SCREEN_SECTION,
} from '@/components/home/layout-constants'
import { districts } from '@/data/districts'
import { formatPeriodCode } from '@/lib/analysis/presentation'
import { useDistrictTopTen } from '@/hooks/use-district-top-ten'
import { isApiSuccess } from '@/lib/api/response'

/**
 * 데이터 출처(data-sources.md).
 *
 * 홈이 순위·추이·점수·손익을 보여 주지만 그 숫자가 어디서 왔는지는 어디에도 없었다.
 * 판단 흐름 바로 아래에 두어 「방금 본 네 단계의 근거」로 읽히게 한다 — 카드마다 그
 * 데이터를 쓰는 단계 번호(01~04)를 단다.
 *
 * 기관 **로고 이미지를 쓰지 않는다.** 정부·공공기관 상징은 사용 규정이 있어, 허락 없이
 * 쓰면 제휴·보증처럼 보인다. 텍스트 이름 + 일반 아이콘이다. 흐르는 로고 띠(marquee)도
 * 쓰지 않는다 — 움직이면 「어떤 데이터·언제 기준」이 스쳐 지나간다(D0).
 */

type Source = {
  key: string
  icon: LucideIcon
  org: string
  via: string
  datasets: readonly string[]
  steps: readonly string[]
  /** 꼬리에 붙는 한 줄 — 규모 또는 용도. */
  detail: string
  /** 공식 원문. backend 문서가 인용한 주소만 쓴다(data-sources.md D4-4). */
  href: string
  linkLabel: string
  featured?: boolean
}

/**
 * 행정동 425 · 상권 1,650 은 영역 데이터셋(OA-22160 · OA-15560)의 행 수다(backend 적재
 * 문서). 자치구 수는 화면의 정본(`districts`)에서 센다. 재적재로 바뀌면 여기를 고친다.
 */
const ADMINISTRATION_COUNT = 425
const COMMERCIAL_COUNT = 1650

const formatCount = (value: number) =>
  new Intl.NumberFormat('ko-KR').format(value)

export const DATA_SOURCES: readonly Source[] = [
  {
    key: 'seoul',
    icon: Landmark,
    org: '서울 열린데이터광장',
    via: '서울시 상권분석서비스',
    datasets: [
      '추정매출',
      '유동인구',
      '점포',
      '상주인구',
      '집객시설',
      '상권변화지표',
      '소득·소비',
    ],
    steps: ['01', '02', '03'],
    detail: `자치구 ${districts.length} · 행정동 ${formatCount(ADMINISTRATION_COUNT)} · 상권 ${formatCount(COMMERCIAL_COUNT)}`,
    href: 'https://data.seoul.go.kr/dataList/OA-15572/S/1/datasetView.do',
    linkLabel: '서울시 상권분석서비스 추정매출 원문 보기(새 탭)',
    featured: true,
  },
  {
    key: 'ftc',
    icon: BriefcaseBusiness,
    org: '공정거래위원회',
    via: '공공데이터포털',
    datasets: ['가맹 정보공개서', '업종별 창업비용'],
    steps: ['04'],
    detail: '초기 투자 추정',
    href: 'https://www.data.go.kr/data/15110293/openapi.do',
    linkLabel: '공정거래위원회 업종별 창업비용 원문 보기(새 탭)',
  },
  {
    key: 'reb',
    icon: Building2,
    org: '한국부동산원',
    via: '공공데이터포털',
    datasets: ['상업용부동산 임대동향', '소규모상가 임대료'],
    steps: ['04'],
    detail: '월 임대료 추정',
    href: 'https://www.data.go.kr/data/15069766/fileData.do',
    linkLabel: '한국부동산원 소규모상가 임대료 원문 보기(새 탭)',
  },
]

/*
  섹션은 한 화면(HOME_FULL_SCREEN_SECTION)이고 내용이 가운데에 선다. 예전엔 바로 뒤 섹션과
  붙이려 아래 여백을 뺐지만, 이제 섹션 사이 간격은 한 화면 높이가 만든다 — 위아래 여백은
  내용이 한 화면보다 길 때(좁은 폭) 가장자리에 붙지 않게 하는 몫이다.
*/
const Section = styled.section`
  ${HOME_FULL_SCREEN_SECTION}
  padding: 96px 0;

  @media (max-width: 900px) {
    padding: 72px 0;
  }

  @media (max-width: 640px) {
    padding: 56px 0;
  }
`

const Inner = styled.div`
  ${HOME_COLUMN}
`

const Header = styled.div`
  display: grid;
  gap: 8px;
  margin-bottom: 28px;

  @media (max-width: 640px) {
    margin-bottom: 20px;
  }
`

const Eyebrow = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-caption);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;

  svg {
    width: 16px;
    height: 16px;
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
`

const Lead = styled.p`
  max-width: 800px;
  color: var(--color-text-700);
  font-size: 16px;
  line-height: 24px;
  word-break: keep-all;
`

/*
  4열 — 가장 많이 쓰는 서울 카드가 2칸. 900 이하 2열(서울은 한 줄 전체), 560 이하 1열.
*/
const Grid = styled.ul`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const Card = styled.li<{ $featured: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 14px;
  grid-column: ${p => (p.$featured ? 'span 2' : 'auto')};
  padding: 20px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: ${p =>
    p.$featured ? 'var(--color-background-muted)' : 'var(--color-surface)'};

  @media (max-width: 560px) {
    grid-column: auto;
    gap: 10px;
    padding: 16px;
  }
`

const Org = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const Mark = styled.span<{ $featured: boolean }>`
  flex: none;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid
    ${p => (p.$featured ? 'var(--color-border-200)' : 'transparent')};
  border-radius: var(--radius-control);
  background: ${p =>
    p.$featured ? 'var(--color-surface)' : 'var(--color-surface-muted)'};
  color: var(--color-text-700);

  svg {
    width: 18px;
    height: 18px;
  }
`

const OrgName = styled.h3`
  color: var(--color-text-900);
  font-size: 16px;
  font-weight: 700;
  line-height: 24px;
`

const Via = styled.p`
  color: var(--color-text-700);
  font-size: 13px;
  line-height: 20px;
`

/*
  560 이하에서는 칩을 「추정매출 · 유동인구 · …」 한 줄 글로 푼다. 칩 7개가 두 줄로 접혀
  카드 세 장이 세로로 쌓이는 화면에서 약 1 화면이 늘었다.
*/
const Chips = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;

  @media (max-width: 560px) {
    display: block;
    color: var(--color-text-700);
    font-size: 13px;
    line-height: 20px;
    word-break: keep-all;

    > li {
      display: inline;
      padding: 0;
      border: 0;
      background: none;
    }

    > li + li::before {
      content: '·';
      margin: 0 6px;
      color: var(--color-text-caption);
    }
  }
`

const Chip = styled.li<{ $featured: boolean }>`
  padding: 4px 10px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-pill);
  background: ${p =>
    p.$featured ? 'var(--color-surface)' : 'var(--color-background-muted)'};
  color: var(--color-text-700);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
`

const Foot = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--color-border-200);
  color: var(--color-text-700);
  font-size: 13px;
  line-height: 20px;
  font-variant-numeric: tabular-nums;
`

const Steps = styled.span`
  display: inline-flex;
  gap: 4px;
`

const Step = styled.span<{ $featured: boolean }>`
  padding: 0 6px;
  border-radius: var(--radius-compact);
  background: ${p =>
    p.$featured ? 'var(--color-surface)' : 'var(--color-surface-muted)'};
  color: var(--color-text-900);
  font-size: 12px;
  font-weight: 700;
  line-height: 20px;
`

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
`

/* 터치 영역 44px(DESIGN.md §8) — 글자는 작아도 링크 박스는 줄 높이를 채운다. */
const SourceLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 44px;
  margin: -12px 0 -12px auto;
  padding: 0 4px;
  border-radius: var(--radius-control);
  color: var(--color-text-900);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;

  svg {
    width: 14px;
    height: 14px;
  }

  &:hover {
    color: var(--color-primary-600);
  }

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary);
  }
`

const Note = styled.p`
  margin-top: 16px;
  color: var(--color-text-700);
  font-size: 13px;
  line-height: 20px;
  word-break: keep-all;
`

export default function DataSources() {
  /*
    기준 시점은 서버가 정한 최신 분기다 — 홈 Top10 응답의 `currentPeriodCode`(분기 생략 요청, 판단 흐름
    01·랭킹과 같은 캐시라 요청이 늘지 않는다). 분석·추천도 같은 서버 기본 분기를 「최신」으로 쓴다
    (period-catalog.md D3-3). 응답 전에는 줄만 비워 둔다.
  */
  const topTenQuery = useDistrictTopTen()
  const latestPeriodCode =
    topTenQuery.data && isApiSuccess(topTenQuery.data)
      ? (topTenQuery.data.dataBody.currentPeriodCode ?? null)
      : null
  const period = latestPeriodCode
    ? `${formatPeriodCode(latestPeriodCode)} 기준 · 분석·추천`
    : null

  return (
    <Section aria-labelledby="data-sources-title">
      <Inner>
        <Header>
          <Eyebrow>
            <Database aria-hidden="true" />
            데이터 출처
          </Eyebrow>
          <Title id="data-sources-title">
            판단 근거는 모두 공공데이터에서 가져와요.
          </Title>
          <Lead>
            서울시가 분기마다 공개하는 상권 데이터와 정부 기관의 창업비용·임대료
            통계를 그대로 써요. 숫자를 지어내지 않아요.
          </Lead>
        </Header>

        <Grid>
          {DATA_SOURCES.map(source => {
            const Icon = source.icon
            const featured = Boolean(source.featured)
            return (
              <Card key={source.key} $featured={featured}>
                <Org>
                  <Mark $featured={featured} aria-hidden="true">
                    <Icon />
                  </Mark>
                  <div>
                    <OrgName>{source.org}</OrgName>
                    <Via>{source.via}</Via>
                  </div>
                </Org>
                <Chips aria-label={`${source.org} 데이터`}>
                  {source.datasets.map(dataset => (
                    <Chip key={dataset} $featured={featured}>
                      {dataset}
                    </Chip>
                  ))}
                </Chips>
                <Foot>
                  <Steps>
                    <VisuallyHidden>판단 흐름 단계: </VisuallyHidden>
                    {source.steps.map(step => (
                      <Step key={step} $featured={featured}>
                        {step}
                      </Step>
                    ))}
                  </Steps>
                  <span>{source.detail}</span>
                  {featured && period ? <span>{period}</span> : null}
                  <SourceLink
                    href={source.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={source.linkLabel}
                  >
                    원문 보기
                    <ExternalLink aria-hidden="true" />
                  </SourceLink>
                </Foot>
              </Card>
            )
          })}
        </Grid>

        <Note>
          보조로 서울시 매장용빌딩 임대료·공실률 통계를 함께 봐요. 홈의 04
          예시는 이 데이터로 만든 대표값이에요.
        </Note>
      </Inner>
    </Section>
  )
}
