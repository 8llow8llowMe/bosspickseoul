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
} from '@/lib/simulation/conditions'
import type {
  SimulationFloorType,
  SimulationSizeItem,
} from '@/types/simulation'

export type SimulationStoreConditionFieldsProps = {
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

/**
 * 크기·층 입력은 넓은 컬럼에서도 폭을 제한한다.
 *
 * 좌측 컬럼이 1000px 가까이 되면 세 자리 숫자 하나 받는 칸이 화면을 가로지르게 되는데,
 * 그러면 클릭 목표는 커지지 않고 "무엇을 넣는 칸인지"만 흐려진다. 칩 격자는 선택지 수만큼,
 * 입력칸은 값 길이만큼만 넓힌다.
 */
const Controls = styled.div`
  max-width: 520px;
  display: grid;
  gap: 12px;
`

const SizeFieldRow = styled.div`
  max-width: 220px;
`

const FloorControls = styled.div`
  max-width: 340px;
`

/**
 * 직접 입력 필드.
 *
 * `styled(TextField)`의 className은 TextField가 나머지 props를 그대로 넘기는 내부 `<input>`에
 * 붙는다 — 그래서 여기서 준 규칙이 입력 텍스트에 적용된다. `tabular-nums`는 DESIGN.md S-SIM-1이
 * 이 필드에 요구하는 값이다(자릿수가 흔들리면 프리셋과 나란히 읽기 어렵다).
 */
const SizeField = styled(TextField)`
  font-variant-numeric: tabular-nums;
`

/* 단위는 입력칸 안 오른쪽에 둔다 — 숫자만 넣는 칸임이 라벨을 읽지 않아도 보인다. */
const Unit = styled.span`
  color: var(--color-text-600);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
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
export default function SimulationStoreConditionFields({
  serviceCode,
  storeSize,
  floorType,
  onStoreSizeChange,
  onFloorTypeChange,
}: SimulationStoreConditionFieldsProps) {
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

        <Controls>
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

          <SizeFieldRow>
            <SizeField
              fullWidth
              emphasized
              inputMode="numeric"
              label="면적 직접 입력"
              // 칸 안 단위(㎡)는 TextField의 slot 규약상 aria-hidden이라 접근성 이름에 단위를
              // 직접 실어 준다. 보이는 라벨 문구가 이 이름에 포함되므로 Label-in-Name도 지킨다.
              aria-label="면적 직접 입력 (제곱미터)"
              placeholder="예: 66"
              value={sizeInput}
              rightSlot={<Unit>㎡</Unit>}
              errorText={
                inputError ? '1 이상의 숫자를 입력해 주세요' : undefined
              }
              helperText={
                parsedInput === null
                  ? '프리셋과 다른 면적이면 여기에 숫자로 입력해 주세요'
                  : `약 ${squareMeterToPyeong(parsedInput)}평`
              }
              onChange={event => {
                const next = event.target.value
                setDraft(next)
                onStoreSizeChange(parseStoreSizeInput(next))
              }}
            />
          </SizeFieldRow>
        </Controls>
      </Block>

      <Block>
        <Heading>
          <h3>층 구분</h3>
          <p>1층인지에 따라 임대료 기준이 달라져요.</p>
        </Heading>
        <FloorControls>
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
        </FloorControls>
      </Block>
    </Root>
  )
}
