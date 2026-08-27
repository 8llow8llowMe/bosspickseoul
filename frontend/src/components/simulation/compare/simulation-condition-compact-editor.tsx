'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import styled from 'styled-components'

import SimulationBrandSearch from '@/components/simulation/simulation-brand-search'
import { TextField } from '@/components/ui/text-field'
import {
  SIMULATION_FLOOR_TYPES,
  SIMULATION_SERVICE_TYPES,
} from '@/data/simulation-service-types'
import {
  parseStoreSizeInput,
  SIMULATION_DISTRICT_OPTIONS,
  squareMeterToPyeong,
} from '@/lib/simulation/conditions'
import type { SimulationConditionsController } from '@/lib/simulation/use-simulation-conditions'
import type { SimulationFloorType } from '@/types/simulation'

export type SimulationConditionCompactEditorProps = {
  /** `조건 A` / `조건 B`. 접근성 이름의 접두사로도 쓰이므로 좌우를 구분하는 값이어야 한다. */
  label: string
  conditions: SimulationConditionsController
}

const Root = styled.div`
  display: grid;
  gap: 12px;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  /* 컬럼이 한 벌만 남는 세로 스택에서도 2열을 유지한다 — 항목이 5개뿐이라
     1열로 펴면 카드가 세로로만 길어진다. 진짜 좁아질 때만 접는다. */
  @media (max-width: 400px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const Field = styled.label`
  display: grid;
  gap: 6px;
  min-width: 0;
`

const FieldLabel = styled.span`
  color: var(--color-text-700);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
`

/**
 * 칩 격자 대신 네이티브 `<select>` 를 쓴다.
 *
 * 자치구 25개 · 업종 30개를 칩으로 깔면 카드 하나가 화면을 다 먹는다. 비교 화면은 좌우
 * **두 벌**이 동시에 열려 있어야 뜻이 있으므로, 선택지 수가 많은 조건은 접어 두는 컨트롤이
 * 맞다. 모바일에서 네이티브 피커가 뜨는 것도 좁은 폭에서는 이득이다.
 */
const SelectShell = styled.span`
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;

  svg {
    position: absolute;
    right: 10px;
    width: 16px;
    height: 16px;
    color: var(--color-text-600);
    pointer-events: none;
  }
`

const Select = styled.select`
  width: 100%;
  min-width: 0;
  min-height: 44px;
  appearance: none;
  border: 1px solid var(--color-border-300);
  border-radius: var(--radius-control);
  background: var(--color-surface-muted);
  color: var(--color-text-900);
  padding: 0 32px 0 12px;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
  text-overflow: ellipsis;

  &:hover {
    border-color: var(--color-primary-300);
  }

  &:focus-visible {
    border-color: var(--color-primary-700);
    box-shadow: var(--shadow-focus-primary);
    outline: none;
    background: var(--color-surface);
  }
`

/* 아직 고르지 않은 상태의 placeholder option 은 값이 비어 있어 회색으로 읽히게 한다. */
const Placeholder = styled.option`
  color: var(--color-text-caption);
`

const BrandBlock = styled.div`
  display: grid;
  gap: 8px;
  border-top: 1px solid var(--color-border-200);
  padding-top: 12px;
`

const Gap = styled.p`
  color: var(--color-text-caption);
  font-size: 13px;
  line-height: 20px;
  word-break: keep-all;
`

const Unit = styled.span`
  color: var(--color-text-600);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
`

const FRANCHISE_OPTIONS = [
  { value: 'false', name: '개인 창업' },
  { value: 'true', name: '프랜차이즈' },
] as const

/**
 * 좁은 카드용 조건 편집기. 비교 화면의 좌우가 같은 컴포넌트를 쓴다.
 *
 * **컨트롤러를 소유하지 않는다** — `useSimulationConditions` 는 호출부(비교 화면)가 좌우로
 * 두 개 만들어 props 로 내려준다. 편집기가 스스로 상태를 들면 계산 버튼이 두 상태를 함께
 * 볼 수 없고, URL 동기화도 편집기 안에 갇힌다.
 *
 * `periodCode` 는 노출하지 않는다(G8) — 입력 화면과 같은 규칙이다. 서버 기본값(20233)을 쓴다.
 */
export default function SimulationConditionCompactEditor({
  label,
  conditions,
}: SimulationConditionCompactEditorProps) {
  const { state } = conditions

  /**
   * 면적 직접 입력의 "쓰는 중" 원문.
   *
   * 어느 업종에서 쓴 값인지 함께 들고 있는 이유: 업종을 바꾸면 `selectService` 가 면적을
   * 비운다(업종별 프리셋 기준이라 앞 업종의 숫자는 근거가 없다). 그때 draft 만 남아 있으면
   * 칸에는 숫자가 보이는데 조건은 비어 있는 상태가 되고, 사용자는 계산 버튼이 왜 꺼져
   * 있는지 알 수 없다. effect 로 되맞추지 않고 **파생값으로 무효화**한다.
   */
  const [draft, setDraft] = useState<{
    serviceCode: string | null
    raw: string
  } | null>(null)

  const liveDraft =
    draft && draft.serviceCode === state.serviceCode ? draft.raw : null
  const sizeInput =
    liveDraft ?? (state.storeSize === null ? '' : String(state.storeSize))
  const hasSizeInput = sizeInput.trim().length > 0
  const parsedSize = parseStoreSizeInput(sizeInput)

  return (
    <Root>
      <Grid>
        <Field>
          <FieldLabel>창업 형태</FieldLabel>
          <SelectShell>
            <Select
              aria-label={`${label} 창업 형태`}
              value={state.franchisee === null ? '' : String(state.franchisee)}
              onChange={event => {
                conditions.setFranchisee(event.target.value === 'true')
              }}
            >
              <Placeholder value="" disabled>
                선택해 주세요
              </Placeholder>
              {FRANCHISE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.name}
                </option>
              ))}
            </Select>
            <ChevronDown aria-hidden="true" />
          </SelectShell>
        </Field>

        <Field>
          <FieldLabel>자치구</FieldLabel>
          <SelectShell>
            <Select
              aria-label={`${label} 자치구`}
              value={state.districtCode ?? ''}
              onChange={event => conditions.setDistrict(event.target.value)}
            >
              <Placeholder value="" disabled>
                선택해 주세요
              </Placeholder>
              {SIMULATION_DISTRICT_OPTIONS.map(option => (
                <option key={option.code} value={option.code}>
                  {option.name}
                </option>
              ))}
            </Select>
            <ChevronDown aria-hidden="true" />
          </SelectShell>
        </Field>

        <Field>
          <FieldLabel>업종</FieldLabel>
          <SelectShell>
            <Select
              aria-label={`${label} 업종`}
              value={state.serviceCode ?? ''}
              onChange={event => conditions.setService(event.target.value)}
            >
              <Placeholder value="" disabled>
                선택해 주세요
              </Placeholder>
              {SIMULATION_SERVICE_TYPES.map(option => (
                <option key={option.code} value={option.code}>
                  {option.name}
                </option>
              ))}
            </Select>
            <ChevronDown aria-hidden="true" />
          </SelectShell>
        </Field>

        <Field>
          <FieldLabel>층 구분</FieldLabel>
          <SelectShell>
            <Select
              aria-label={`${label} 층 구분`}
              value={state.floorType ?? ''}
              onChange={event => {
                conditions.setFloorType(
                  event.target.value as SimulationFloorType,
                )
              }}
            >
              <Placeholder value="" disabled>
                선택해 주세요
              </Placeholder>
              {SIMULATION_FLOOR_TYPES.map(option => (
                <option key={option.code} value={option.code}>
                  {option.name}
                </option>
              ))}
            </Select>
            <ChevronDown aria-hidden="true" />
          </SelectShell>
        </Field>
      </Grid>

      <TextField
        fullWidth
        emphasized
        fieldSize="medium"
        inputMode="numeric"
        label="매장 면적"
        // 칸 안 단위(㎡)는 TextField 의 slot 규약상 aria-hidden 이라 이름에 단위를 실어 준다.
        aria-label={`${label} 매장 면적 (제곱미터)`}
        placeholder="예: 66"
        value={sizeInput}
        rightSlot={<Unit>㎡</Unit>}
        errorText={
          hasSizeInput && parsedSize === null
            ? '1 이상의 숫자를 입력해 주세요'
            : undefined
        }
        helperText={
          parsedSize === null
            ? undefined
            : `약 ${squareMeterToPyeong(parsedSize)}평`
        }
        onChange={event => {
          const raw = event.target.value
          setDraft({ serviceCode: state.serviceCode, raw })
          conditions.setStoreSize(parseStoreSizeInput(raw))
        }}
      />

      {/* 브랜드 검색은 업종을 고른 뒤에만 연다 — `franchisees` 는 serviceCode 없이 400 이다.
          `key` 로 업종을 넘겨 업종이 바뀌면 검색어까지 새로 마운트한다. */}
      {state.franchisee === true && state.serviceCode ? (
        <BrandBlock>
          <SimulationBrandSearch
            key={state.serviceCode}
            serviceCode={state.serviceCode}
            selectedFranchiseeId={state.franchiseeId}
            onSelect={brand => conditions.setBrand(brand)}
          />
        </BrandBlock>
      ) : null}

      {/* 무엇이 남았는지는 입력 화면과 **같은 문구**를 쓴다(conditions.gap).
          두 화면이 다른 말을 하면 사용자가 어느 쪽이 맞는지 알 수 없다. */}
      {conditions.gap ? <Gap>{conditions.gap}</Gap> : null}
    </Root>
  )
}
