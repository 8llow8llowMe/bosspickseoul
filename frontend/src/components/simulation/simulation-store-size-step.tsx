'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import styled from 'styled-components'

import SimulationChoiceGrid from '@/components/simulation/simulation-choice-grid'
import SimulationErrorNotice from '@/components/simulation/simulation-error-notice'
import { Skeleton } from '@/components/ui/skeleton'
import { TextField } from '@/components/ui/text-field'
import { SIMULATION_FLOOR_TYPES } from '@/data/simulation-service-types'
import { resolveApiError, retryUnlessClientError } from '@/lib/api/api-error'
import { fetchSimulationStoreSizes } from '@/lib/api/simulation'
import { getResponseBody } from '@/lib/api/response'
import {
  parseStoreSizeInput,
  squareMeterToPyeong,
} from '@/lib/simulation/wizard'
import type {
  SimulationFloorType,
  SimulationSizeItem,
} from '@/types/simulation'

export type SimulationStoreSizeStepProps = {
  serviceCode: string
  storeSize: number | null
  floorType: SimulationFloorType | null
  onStoreSizeChange: (storeSize: number | null) => void
  onFloorTypeChange: (floorType: SimulationFloorType) => void
}

const PRESET_LABELS = [
  { key: 'small', name: '소형' },
  { key: 'medium', name: '중형' },
  { key: 'large', name: '대형' },
] as const

const Root = styled.div`
  display: grid;
  gap: 24px;
`

const Block = styled.section`
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

const PresetSkeleton = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
`

const Conversion = styled.p`
  color: var(--color-text-caption);
  font-size: 12px;
  line-height: 18px;
`

const readPreset = (
  sizes: {
    small: SimulationSizeItem
    medium: SimulationSizeItem
    large: SimulationSizeItem
  } | null,
  key: (typeof PRESET_LABELS)[number]['key'],
): SimulationSizeItem | null => (sizes ? sizes[key] : null)

/**
 * 매장 크기·층 구분 입력.
 *
 * 프리셋(소/중/대)은 `GET /simulations/store-sizes`가 주는 업종별 기준값이고 **힌트일 뿐**이다.
 * `storeSize`는 임의 양수를 허용하므로 직접 입력을 함께 둔다.
 *
 * 층 구분은 반드시 enum 피커로만 제출한다. 정의되지 않은 값이 본문에 들어가면 백엔드가
 * `dataHeader` 봉투 **없는** Spring 기본 400을 내려 화면이 서버 메시지를 쓸 수 없다(명세 D6-1).
 */
export default function SimulationStoreSizeStep({
  serviceCode,
  storeSize,
  floorType,
  onStoreSizeChange,
  onFloorTypeChange,
}: SimulationStoreSizeStepProps) {
  // 직접 입력의 "쓰는 중" 원문. null이면 프리셋/상위 상태(storeSize)를 그대로 따라간다.
  // 상태를 effect로 되맞추지 않고 파생값으로 두어 프리셋 클릭이 즉시 입력칸에 반영되게 한다.
  const [draft, setDraft] = useState<string | null>(null)
  const sizeInput = draft ?? (storeSize === null ? '' : String(storeSize))

  const query = useQuery({
    queryKey: ['simulation', 'store-sizes', serviceCode],
    queryFn: () => fetchSimulationStoreSizes(serviceCode),
    retry: retryUnlessClientError(),
  })

  const sizes = getResponseBody(query.data)
  const error = resolveApiError(query)
  const hasInput = sizeInput.trim().length > 0
  const parsedInput = parseStoreSizeInput(sizeInput)
  const inputError = hasInput && parsedInput === null

  const presetChoices = PRESET_LABELS.flatMap(preset => {
    const item = readPreset(sizes, preset.key)
    if (!item) return []
    return [
      {
        code: String(item.squareMeter),
        name: preset.name,
        hint: `${item.squareMeter}㎡ · ${item.pyeong}평`,
      },
    ]
  })

  return (
    <Root>
      <Block>
        <Heading>
          <h3>매장 크기</h3>
          <p>
            업종 평균을 참고해 고르거나, 계획 중인 면적을 직접 입력해 주세요.
            {/* 계산 결과가 아니라 프리셋의 출처를 밝히는 문구다 — 결과 안내문과 문장을 구분한다. */}
            {sizes
              ? ` 프리셋은 ${sizes.dataBaseYear}년 기준 업종 평균이에요.`
              : ''}
          </p>
        </Heading>

        {query.isPending ? (
          <PresetSkeleton role="status" aria-label="매장 크기 기준 불러오는 중">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} $height="56px" />
            ))}
          </PresetSkeleton>
        ) : null}

        {!query.isPending && error ? (
          <SimulationErrorNotice
            error={error}
            onRetry={() => void query.refetch()}
          />
        ) : null}

        {presetChoices.length > 0 ? (
          <SimulationChoiceGrid
            label="매장 크기 프리셋"
            choices={presetChoices}
            selectedCode={storeSize === null ? null : String(storeSize)}
            onSelect={code => {
              setDraft(null)
              onStoreSizeChange(Number(code))
            }}
            minColumnWidth={120}
          />
        ) : null}

        <TextField
          fullWidth
          inputMode="numeric"
          label="직접 입력 (㎡)"
          placeholder="예: 66"
          value={sizeInput}
          errorText={inputError ? '1 이상의 숫자를 입력해 주세요' : undefined}
          onChange={event => {
            const next = event.target.value
            setDraft(next)
            onStoreSizeChange(parseStoreSizeInput(next))
          }}
        />
        {parsedInput !== null ? (
          <Conversion>약 {squareMeterToPyeong(parsedInput)}평</Conversion>
        ) : null}
      </Block>

      <Block>
        <Heading>
          <h3>층 구분</h3>
          <p>1층인지에 따라 임대료 기준이 달라져요.</p>
        </Heading>
        <SimulationChoiceGrid
          label="층 구분"
          choices={SIMULATION_FLOOR_TYPES.map(item => ({
            code: item.code,
            name: item.name,
          }))}
          selectedCode={floorType}
          onSelect={code => onFloorTypeChange(code as SimulationFloorType)}
          minColumnWidth={120}
        />
      </Block>
    </Root>
  )
}
