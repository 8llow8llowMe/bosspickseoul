'use client'

import { useState } from 'react'
import { ChevronDown, Pencil } from 'lucide-react'
import styled from 'styled-components'

import SimulationBrandSearch from '@/components/simulation/simulation-brand-search'
import { SIMULATION_MEDIA } from '@/components/simulation/simulation-media'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/ui/text-field'
import {
  SIMULATION_FLOOR_TYPES,
  SIMULATION_SERVICE_TYPES,
} from '@/data/simulation-service-types'
import {
  parseStoreSizeInput,
  SIMULATION_DISTRICT_OPTIONS,
  squareMeterToPyeong,
  type SimulationConditionSection,
} from '@/lib/simulation/conditions'
import type { SimulationConditionsController } from '@/lib/simulation/use-simulation-conditions'
import type { SimulationFloorType } from '@/types/simulation'

export type SimulationConditionCompactEditorProps = {
  /** `조건 A` / `조건 B`. 접근성 이름의 접두사로도 쓰이므로 좌우를 구분하는 값이어야 한다. */
  label: string
  conditions: SimulationConditionsController
  /** 필드 DOM id 접두사(`compare-a` 등). 오류 CTA 가 고칠 필드로 포커스를 옮길 때 쓴다(C5). */
  idPrefix: string
}

/**
 * 편집기 필드의 DOM id. 오류가 지목한 조건 섹션 → 그 쪽 편집기의 필드. 섹션과 필드가 1:1 이다
 * (매장 조건은 면적 입력칸으로 데려간다 — 층은 select 라 값이 비어 있을 수 없다).
 */
export const compareFieldDomId = (
  idPrefix: string,
  section: SimulationConditionSection,
): string => `${idPrefix}-${section}`

/* 필드 격자가 화면 폭이 아니라 **편집기 자신의 폭**에 반응하도록 컨테이너로 둔다(아래 Grid). */
const Root = styled.div`
  container-type: inline-size;
  display: grid;
  gap: 12px;

  /*
    iOS Safari 는 16px 보다 작은 입력칸에 포커스하면 화면을 확대한다(C7). 공용 TextField medium 은
    14px 라 이 편집기 안(면적·브랜드 검색)에서만 모바일 16px 로 올린다.
  */
  @media ${SIMULATION_MEDIA.mobile} {
    select,
    input {
      font-size: 16px;
    }
  }
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  /*
    컬럼이 한 벌만 남는 세로 스택에서도 2열을 유지한다 — 항목이 5개뿐이라
    1열로 펴면 카드가 세로로만 길어진다. 진짜 좁아질 때만 접는다.

    그래서 화면 폭 단계(SIMULATION_MEDIA)가 아니라 컨테이너 쿼리를 쓴다. 편집기는
    768px 이상에서 둘이 나란히, 그 아래에서 한 줄로 쌓이므로 화면 폭과 자기 폭이 따로
    논다 — 화면 767px 이하로 접으면 쌓여서 넓어진 편집기까지 1열이 된다.

    기준 300px 은 실측 격자 폭 사이에 둔다: 375 폰 295px → 1열, 768 태블릿(둘이 나란히)
    311px · 400 폰 320px → 2열(한 칸 약 150px). 311 로 두면 768 이 경계에 걸려 접힌다.
  */
  @container (max-width: 300px) {
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
  border-radius: var(--radius-field);
  background: var(--color-surface-muted);
  color: var(--color-text-900);
  padding: 0 32px 0 12px;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
  text-overflow: ellipsis;

  &:hover {
    border-color: var(--color-primary-600);
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

/* 고른 브랜드 한 줄. 입력 화면의 접힌 섹션 헤더처럼 「값 · 변경」만 남긴다(C1). */
const PickedRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid var(--color-border-200);
  padding-top: 12px;
`

const PickedValue = styled.p`
  min-width: 0;
  display: grid;
  gap: 2px;

  span {
    color: var(--color-text-700);
    font-size: 13px;
    font-weight: 600;
    line-height: 20px;
  }

  strong {
    color: var(--color-text-900);
    font-size: 15px;
    font-weight: 700;
    line-height: 22px;
    word-break: keep-all;
  }
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

/* 입력 화면 카드와 같은 순서(프랜차이즈 → 개인 창업, C7). 화면마다 순서가 다르면 손이 엇나간다. */
const FRANCHISE_OPTIONS = [
  { value: 'true', name: '프랜차이즈' },
  { value: 'false', name: '개인 창업' },
] as const

/** 다음 프레임에 그 id 의 요소(또는 그 안 첫 입력칸)로 포커스를 옮긴다. 막 그려질 요소라 지금은 없다. */
const focusSoon = (id: string) => {
  requestAnimationFrame(() => {
    const target = document.getElementById(id)
    const focusable = target?.matches('input, select, button')
      ? target
      : target?.querySelector<HTMLElement>('input, select, button')
    focusable?.focus()
  })
}

/**
 * 좁은 카드용 조건 편집기. 비교 화면의 좌우가 같은 컴포넌트를 쓴다.
 *
 * **컨트롤러를 소유하지 않는다** — `useSimulationConditions` 는 호출부(비교 화면)가 좌우로
 * 두 개 만들어 props 로 내려준다. 편집기가 스스로 상태를 들면 계산 버튼이 두 상태를 함께
 * 볼 수 없고, URL 동기화도 편집기 안에 갇힌다.
 *
 * `periodCode` 는 노출하지 않는다(G8) — 입력 화면과 같은 규칙이다. 요청에는 서버 카탈로그의 기본 분기가
 * 실린다(`useSimulationConditions`, period-catalog.md D4-4).
 */
export default function SimulationConditionCompactEditor({
  label,
  conditions,
  idPrefix,
}: SimulationConditionCompactEditorProps) {
  const { state } = conditions
  const fieldId = (section: SimulationConditionSection) =>
    compareFieldDomId(idPrefix, section)
  const brandChangeId = `${idPrefix}-brand-change`

  /**
   * 브랜드를 다시 고르는 중인가(C1). 고른 뒤에도 목록 10건이 펼쳐져 있어 A 편집기가 B 보다 두 배
   * 길었다. 고른 뒤에는 「브랜드 · 변경」 한 줄로 접고, 변경을 누를 때만 검색을 다시 연다.
   * 업종이 바뀌면 컨트롤러가 브랜드를 비우므로 접힌 줄은 저절로 사라진다(파생값).
   */
  const [editingBrand, setEditingBrand] = useState(false)
  const brandPicked = state.franchiseeId !== null && !editingBrand

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
              id={fieldId('franchise')}
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
              id={fieldId('district')}
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
              id={fieldId('service')}
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
        id={fieldId('store')}
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
      {state.franchisee === true && state.serviceCode && brandPicked ? (
        <PickedRow id={fieldId('brand')}>
          <PickedValue>
            <span>브랜드</span>
            {/* 이름은 URL 의 표시용 brandName 에서 온다. 없으면 지어내지 않는다. */}
            <strong>{state.brandName ?? '선택한 브랜드'}</strong>
          </PickedValue>
          <Button
            id={brandChangeId}
            size="medium"
            variant="ghost"
            leftIcon={<Pencil />}
            aria-label={`${label} 브랜드 변경`}
            onClick={() => {
              setEditingBrand(true)
              // 누른 버튼이 사라지므로 포커스를 검색칸으로 옮긴다.
              focusSoon(fieldId('brand'))
            }}
          >
            변경
          </Button>
        </PickedRow>
      ) : null}

      {state.franchisee === true && state.serviceCode && !brandPicked ? (
        <BrandBlock id={fieldId('brand')}>
          <SimulationBrandSearch
            key={state.serviceCode}
            serviceCode={state.serviceCode}
            selectedFranchiseeId={state.franchiseeId}
            onSelect={brand => {
              conditions.setBrand(brand)
              setEditingBrand(false)
              // 검색 목록이 접힌 줄로 바뀐다 — 포커스를 그 줄의 「변경」에 둔다.
              focusSoon(brandChangeId)
            }}
          />
        </BrandBlock>
      ) : null}

      {/* 무엇이 남았는지는 입력 화면과 **같은 문구**를 쓴다(conditions.gap).
          두 화면이 다른 말을 하면 사용자가 어느 쪽이 맞는지 알 수 없다. */}
      {conditions.gap ? <Gap>{conditions.gap}</Gap> : null}
    </Root>
  )
}
