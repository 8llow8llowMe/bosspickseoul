'use client'

import { useId, useRef, useState, type FocusEvent } from 'react'
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
  MIN_PYEONG_INPUT,
  formatStoreSizeInput,
  parseStoreSizeInputIn,
  squareMeterToPyeong,
  type StoreSizeUnit,
} from '@/lib/simulation/conditions'
import type {
  SimulationFloorType,
  SimulationSizeItem,
} from '@/types/simulation'

export type SimulationStoreConditionFieldsProps = {
  serviceCode: string
  storeSize: number | null
  floorType: SimulationFloorType | null
  /** 값만 바꾼다. 다음 단계로 넘기지 않는다 — 직접 입력은 한 글자마다 이 콜백을 부른다. */
  onStoreSizeChange: (storeSize: number | null) => void
  onFloorTypeChange: (floorType: SimulationFloorType) => void
  /**
   * 사용자가 이 단계 입력을 한 번 끝냈다 — 프리셋·층 칩 선택, 직접 입력의 Enter·blur.
   * 호출부는 이때 다음 미완료 단계로 넘긴다(명세 D4-1-1 규칙 3).
   */
  onAdvance: () => void
  /**
   * 직접 입력 단위. 호출부가 들고 있는다 — 이 컴포넌트는 섹션이 접히면 언마운트되므로,
   * 안에 두면 평으로 넣은 사람이 「변경」으로 다시 열 때 ㎡ 로 돌아가 있었다.
   */
  unit: StoreSizeUnit
  onUnitChange: (unit: StoreSizeUnit) => void
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

/*
  직접 입력 한 덩어리 — 라벨 줄(라벨 + 단위 전환) 아래 입력칸.

  단위 전환을 입력칸 안 오른쪽(rightSlot)에 두지 않는다. TextField 의 slot 은 장식 규약상
  aria-hidden 이라 버튼을 둘 수 없다. TextField 는 통째로 <label> 이라 그 안에도 넣지 못하므로
  라벨을 바깥에 같은 모양으로 그리고 htmlFor 로 입력칸과 잇는다.
*/
const SizeFieldRow = styled.div`
  max-width: 260px;
  display: grid;
  gap: 8px;
`

const SizeFieldHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  /* TextField 의 FieldLabel 과 같은 모양이다. */
  label {
    color: var(--color-text-700);
    font-size: 13px;
    font-weight: 600;
    line-height: 20px;
  }
`

/* ㎡ | 평 두 칸 세그먼트. 하나만 고르는 전환이라 선택 칸을 채워 구분한다. */
const UnitToggle = styled.div`
  display: inline-flex;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  overflow: hidden;
`

const UnitButton = styled.button<{ $active: boolean }>`
  min-width: 44px;
  min-height: 36px;
  border: 0;
  background: ${props =>
    props.$active ? 'var(--color-text-900)' : 'var(--color-surface)'};
  color: ${props => (props.$active ? '#ffffff' : 'var(--color-text-700)')};
  padding: 0 10px;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:focus-visible {
    outline-offset: -2px;
  }
`

/* spoken 은 입력칸 이름, toggle 은 버튼 이름이다(받침에 따라 「로」/「으로」가 갈린다). */
const UNIT_LABELS: Record<
  StoreSizeUnit,
  { mark: string; spoken: string; toggle: string }
> = {
  squareMeter: { mark: '㎡', spoken: '제곱미터', toggle: '제곱미터로 입력' },
  pyeong: { mark: '평', spoken: '평', toggle: '평으로 입력' },
}

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
  onAdvance,
  unit,
  onUnitChange,
}: SimulationStoreConditionFieldsProps) {
  // 직접 입력의 "쓰는 중" 원문. null이면 프리셋/상위 상태(storeSize)를 그대로 따라간다.
  // 상태를 effect로 되맞추지 않고 파생값으로 두어 프리셋 클릭이 즉시 입력칸에 반영되게 한다.
  const [draft, setDraft] = useState<string | null>(null)
  const sizeInput =
    draft ?? (storeSize === null ? '' : formatStoreSizeInput(storeSize, unit))
  const inputId = useId()

  /*
    직접 입력은 **타이핑하는 동안 진행하지 않는다.** 한 글자마다 진행시키면 층을 먼저 고른
    사람이 `66` 을 치려다 `6` 에서 섹션이 접혀 6㎡ 로 확정된다(2026-10-01 실측). 그래서
    Enter 와 blur 에서만 진행하되, 포커스가 이 영역 **안**(프리셋·층 칩)으로 옮겨 가는
    blur 는 무시한다 — 그 칩은 눌리는 순간 스스로 진행한다.

    relatedTarget 만으로는 모자라다. Safari 는 버튼을 클릭해도 포커스를 주지 않아
    relatedTarget 이 null 로 오므로, 칩 클릭 직전의 blur 가 「영역 밖으로 나감」으로 읽혀
    섹션이 먼저 접히고 클릭이 허공에 떨어진다. pointerdown 이 blur 보다 먼저 온다는 점을
    써서 「영역 안을 누르는 중」을 표시해 둔다.

    표시는 click 에서 지운다 — click 은 마우스든 터치든 blur 뒤에 온다. pointerup 에서 지우면
    안 된다. 터치는 pointerup 이 끝난 뒤 호환 mousedown 에서야 포커스가 옮겨 가므로(blur 가
    pointerup 뒤) iOS 에서 표시가 이미 지워져 있다. click 이 오지 않는 스크롤(pointercancel)과
    입력칸 재진입에서도 지워, 표시가 남아 다음 blur 를 삼키지 않게 한다.
  */
  const rootRef = useRef<HTMLDivElement | null>(null)
  const pressingInside = useRef(false)

  const releasePress = () => {
    pressingInside.current = false
  }

  const advanceOnLeave = (event: FocusEvent<HTMLInputElement>) => {
    if (pressingInside.current) return
    if (rootRef.current?.contains(event.relatedTarget)) return
    onAdvance()
  }

  const query = useQuery({
    queryKey: ['simulation', 'store-sizes', serviceCode],
    queryFn: () => fetchSimulationStoreSizes(serviceCode),
    retry: retryUnlessClientError(),
  })

  const sizes = getResponseBody(query.data)
  const error = resolveApiError(query)
  const hasInput = sizeInput.trim().length > 0
  const parsedInput = parseStoreSizeInputIn(sizeInput, unit)
  const inputError = hasInput && parsedInput === null
  // 다른 단위로 환산한 값을 helper 로 보여 준다 — 평으로 넣으면 계산에 쓰일 ㎡ 를 밝힌다.
  const conversionText =
    parsedInput === null
      ? '숫자만 입력해 주세요'
      : unit === 'squareMeter'
        ? `약 ${squareMeterToPyeong(parsedInput)}평`
        : `${parsedInput}㎡로 계산해요`

  const presetChoices = PRESET_LABELS.flatMap(preset => {
    const item = readPreset(sizes, preset.key)
    if (!item) return []
    return [
      {
        code: String(item.squareMeter),
        name: preset.name,
        /* ㎡ 와 평을 두 줄로 나눈다. 375 에서 한 칸이 약 98px 라 「36㎡ · 10평」이 가운뎃점에서
           끊겼다(2026-10-01 실측). 끊을 자리를 정해 두면 모든 폭에서 같은 모양이다. */
        hint: `${item.squareMeter}㎡\n${squareMeterToPyeong(item.squareMeter)}평`,
      },
    ]
  })

  return (
    <Root
      ref={rootRef}
      onPointerDownCapture={() => {
        pressingInside.current = true
      }}
      onClickCapture={releasePress}
      onPointerCancelCapture={releasePress}
    >
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
                onAdvance()
              }}
              /* 셋을 한 줄에 고정한다. 최소 폭 auto-fill 로 두면 375 에서 2+1 로 떨어져
                 「대형」이 홀로 남았다(2026-10-01 실측). */
              columns={3}
            />
          ) : null}

          <SizeFieldRow>
            <SizeFieldHead>
              <label htmlFor={inputId}>면적 직접 입력</label>
              <UnitToggle role="group" aria-label="면적 단위">
                {(['squareMeter', 'pyeong'] as const).map(option => (
                  <UnitButton
                    key={option}
                    type="button"
                    $active={unit === option}
                    aria-pressed={unit === option}
                    aria-label={UNIT_LABELS[option].toggle}
                    onClick={() => {
                      if (option === unit) return
                      onUnitChange(option)
                      /*
                        상태·요청은 언제나 ㎡ 정수이고 평은 입력·표기에서만 쓴다.
                        값이 있으면 draft 를 비워 입력칸이 그 값을 새 단위로 다시 보여 준다 —
                        손대지 않으면 값은 바뀌지 않는다(66㎡ → 「20」평으로 보여도 66 그대로).
                        값이 없으면(입력 중이거나 잘못된 글자) 친 글자를 지우지 않고 새 단위로
                        다시 읽는다 — 지우면 「18.」까지 친 글자가 사라진다.
                      */
                      if (storeSize !== null) {
                        setDraft(null)
                      } else if (draft) {
                        onStoreSizeChange(parseStoreSizeInputIn(draft, option))
                      }
                    }}
                  >
                    {UNIT_LABELS[option].mark}
                  </UnitButton>
                ))}
              </UnitToggle>
            </SizeFieldHead>
            <SizeField
              id={inputId}
              fullWidth
              emphasized
              inputMode={unit === 'pyeong' ? 'decimal' : 'numeric'}
              // 칸 안 단위는 TextField의 slot 규약상 aria-hidden이라 접근성 이름에 단위를
              // 직접 실어 준다. 보이는 라벨 문구가 이 이름에 포함되므로 Label-in-Name도 지킨다.
              aria-label={`면적 직접 입력 (${UNIT_LABELS[unit].spoken})`}
              placeholder={unit === 'pyeong' ? '예: 20' : '예: 66'}
              value={sizeInput}
              rightSlot={<Unit>{UNIT_LABELS[unit].mark}</Unit>}
              errorText={
                inputError
                  ? unit === 'pyeong'
                    ? `${MIN_PYEONG_INPUT}평 이상의 숫자를 입력해 주세요`
                    : '1 이상의 숫자를 입력해 주세요'
                  : undefined
              }
              helperText={conversionText}
              onChange={event => {
                const next = event.target.value
                setDraft(next)
                onStoreSizeChange(parseStoreSizeInputIn(next, unit))
              }}
              onFocus={releasePress}
              onBlur={advanceOnLeave}
              onKeyDown={event => {
                if (event.key !== 'Enter') return
                /*
                  기본 동작을 막는다. 진행하면 섹션이 접히고 포커스가 헤더 버튼으로 옮겨
                  가는데, 막지 않으면 뒤따르는 keypress 가 그 버튼을 눌러 섹션이 다시 열린다
                  (Chrome 실측). keydown 을 막으면 keypress 가 나가지 않는다.
                */
                event.preventDefault()
                onAdvance()
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
            onSelect={code => {
              onFloorTypeChange(code as SimulationFloorType)
              onAdvance()
            }}
            columns={2}
          />
        </FloorControls>
      </Block>
    </Root>
  )
}
