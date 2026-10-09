'use client'

import { useState } from 'react'
import styled from 'styled-components'

import SimulationChoiceGrid from '@/components/simulation/simulation-choice-grid'
import SimulationChoiceSearch from '@/components/simulation/simulation-choice-search'
import { SIMULATION_MEDIA } from '@/components/simulation/simulation-media'
import { TabButton, TabList } from '@/components/ui/tabs'
import {
  findSimulationCategoryByCode,
  simulationCatalog,
} from '@/data/simulation-catalog'
import {
  SIMULATION_SERVICE_TYPES,
  type SimulationServiceType,
} from '@/data/simulation-service-types'
import { filterOptions } from '@/lib/option-filter'
import {
  POPULAR_SERVICE_CODES,
  POPULAR_SERVICE_LABEL,
} from '@/lib/recommend/popular-services'

export type SimulationServicePickerProps = {
  selectedCode: string | null
  onSelect: (serviceCode: string) => void
}

/** 대분류 묶음. 카탈로그 순서(음식점 → … → 생활용품) 그대로 쓴다. */
const categoryOf = (serviceCode: string | null): string | null =>
  serviceCode
    ? (findSimulationCategoryByCode(serviceCode)?.category ?? null)
    : null

const GROUPS = Object.entries(simulationCatalog).map(([label, items]) => ({
  label,
  choices: items.map(item => ({ code: item.code, name: item.name })),
}))

const FIRST_GROUP = GROUPS[0]?.label ?? ''

const Root = styled.div`
  display: grid;
  gap: 12px;
`

/*
  대분류 필터 줄 — **1023px 이하에서만** 보인다. 그 구간은 1단이라 칩 30개가 375px 에서
  2열 15줄(칩 격자만 약 770px)로 쌓였고, 소제목 묶음으로 바꾸면 768px 에서도 섹션이 712px 가
  됐다(2026-10-01 실측). 고른 분류 하나만 펼친다 — 섹션 전체 375 최대 475px(가장 큰 음식점
  10개 기준), 768 375px.

  공용 탭(`ui/tabs` — 분석 결과·프로필과 같은 모양)을 쓴다. 한 줄 가로 스크롤이다.
  페이지 이동이 아니라 목록 거르기라 `nav` 대신 `div role="group"` 으로 바꿔 그린다.

  포커스 링은 안쪽에 그린다. 가로 스크롤 컨테이너는 세로도 잘라서(overflow-x:auto 면
  overflow-y 도 auto 가 된다) 전역 링(바깥 2px)의 위아래가 탭 높이(44px) 밖으로 잘린다.
*/
const FilterRow = styled(TabList)`
  display: none;

  ${TabButton}:focus-visible {
    outline-offset: -2px;
  }

  @media ${SIMULATION_MEDIA.belowDesktop} {
    display: flex;
  }
`

const Count = styled.span`
  margin-left: 4px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
`

const Groups = styled.div`
  display: grid;
  gap: 12px;
`

/*
  데스크톱(≥1024)은 여섯 묶음을 다 펼치되 소제목을 왼쪽 열에, 칩을 오른쪽에 흘린다.
  소제목을 칩 위에 따로 얹으면 분류마다 한 줄씩 늘고 마지막 줄이 비어 1440 에서 752px 였다
  (왼쪽 열로 옮겨 556px, 실측).

  1023px 이하는 고른 분류 하나만 보인다 — 필터 줄이 분류 이름을 이미 보여 주므로 소제목도 숨긴다.
*/
/* landmark 를 만들지 않으려고 section 대신 div 다 — 업종 단계 하나에 region 이 여섯 생긴다. */
const Group = styled.div<{ $activeOnNarrow: boolean }>`
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  align-items: start;
  gap: 8px 12px;

  @media ${SIMULATION_MEDIA.belowDesktop} {
    display: ${props => (props.$activeOnNarrow ? 'grid' : 'none')};
    grid-template-columns: minmax(0, 1fr);
  }
`

/* 흰 카드 위 12px 캡션이라 grey600(4.62)이 통과한다. 칩 첫 줄(44px)의 가운데에 맞춘다. */
const GroupLabel = styled.h3`
  padding-top: 13px;
  color: var(--color-text-600);
  font-size: 12px;
  font-weight: 700;
  line-height: 18px;
  word-break: keep-all;

  @media ${SIMULATION_MEDIA.belowDesktop} {
    display: none;
  }
`

const EmptyText = styled.p`
  padding: 18px 0;
  color: var(--color-text-caption);
  font-size: 13px;
  text-align: center;
  overflow-wrap: anywhere;
`

/**
 * 업종 고르기 — 검색 + 대분류 묶음.
 *
 * 검색어가 있으면 분류를 무시하고 30종 전체에서 이름으로 거른 결과를 한 격자로 보여 준다
 * (분류를 모르는 사람이 검색한다). 검색어가 없으면 데스크톱은 대분류 소제목과 함께 다
 * 보여 주고, 1023px 이하는 필터 줄로 분류 하나만 펼친다. 처음 펼치는 분류는 고른 업종의
 * 분류, 없으면 첫 분류다.
 *
 * 검색어·분류는 이 컴포넌트가 들고 있다. 섹션이 접히면 언마운트되므로 다시 열면 전체
 * 목록·고른 업종의 분류에서 시작한다(D4-1-1 「검색어는 그 단계를 벗어나면 버린다」).
 */
export default function SimulationServicePicker({
  selectedCode,
  onSelect,
}: SimulationServicePickerProps) {
  const [query, setQuery] = useState('')
  const [activeGroup, setActiveGroup] = useState(
    () => categoryOf(selectedCode) ?? FIRST_GROUP,
  )

  /*
    펼친 채로 업종이 밖에서 바뀌면(분석 컨텍스트 「되돌리기」) 고른 칩이 숨은 분류에 묻힌다.
    그때 분류만 따라간다 — 검색어는 사용자가 쓰던 것이라 그대로 둔다. 렌더 중 이전 값과
    비교해 바로 맞추는 패턴(빌더의 prevOpenSection 과 같다)이라 effect 연쇄 렌더가 없다.
  */
  const [prevSelectedCode, setPrevSelectedCode] = useState(selectedCode)
  if (prevSelectedCode !== selectedCode) {
    setPrevSelectedCode(selectedCode)
    const category = categoryOf(selectedCode)
    if (category) setActiveGroup(category)
  }

  const trimmed = query.trim()
  // 이름 부분 일치 + 일상어 별칭(`카페` → 커피-음료). 세 화면이 같은 함수를 쓴다.
  const matches = trimmed
    ? filterOptions(SIMULATION_SERVICE_TYPES, trimmed)
    : SIMULATION_SERVICE_TYPES
  // 0건이면 막다른 길 대신 많이 찾는 업종을 대신 보여 준다.
  const popular = POPULAR_SERVICE_CODES.map(code =>
    SIMULATION_SERVICE_TYPES.find(item => item.code === code),
  ).filter((item): item is SimulationServiceType => Boolean(item))

  return (
    <Root>
      <SimulationChoiceSearch
        label="업종 이름으로 찾기"
        value={query}
        shown={matches.length}
        total={SIMULATION_SERVICE_TYPES.length}
        onChange={setQuery}
      />

      {trimmed ? (
        matches.length === 0 ? (
          <>
            <EmptyText role="status">
              {`"${trimmed}" 검색 결과가 없어요. ${POPULAR_SERVICE_LABEL} 목록을 대신 보여 드려요.`}
            </EmptyText>
            <SimulationChoiceGrid
              label={POPULAR_SERVICE_LABEL}
              choices={popular}
              selectedCode={selectedCode}
              onSelect={onSelect}
              minColumnWidth={132}
            />
          </>
        ) : (
          <SimulationChoiceGrid
            label="업종 검색 결과"
            choices={matches}
            selectedCode={selectedCode}
            onSelect={onSelect}
            minColumnWidth={132}
          />
        )
      ) : (
        <>
          <FilterRow as="div" role="group" aria-label="업종 분류">
            {GROUPS.map(group => (
              <TabButton
                key={group.label}
                type="button"
                $active={group.label === activeGroup}
                aria-pressed={group.label === activeGroup}
                onClick={() => setActiveGroup(group.label)}
              >
                {group.label}
                <Count>{group.choices.length}</Count>
              </TabButton>
            ))}
          </FilterRow>

          <Groups>
            {GROUPS.map(group => (
              <Group
                key={group.label}
                $activeOnNarrow={group.label === activeGroup}
              >
                <GroupLabel>{group.label}</GroupLabel>
                <SimulationChoiceGrid
                  label={`${group.label} 업종`}
                  choices={group.choices}
                  selectedCode={selectedCode}
                  onSelect={onSelect}
                  minColumnWidth={132}
                />
              </Group>
            ))}
          </Groups>
        </>
      )}
    </Root>
  )
}
