'use client'

import { useEffect, useId, useReducer, useRef, type ChangeEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import styled from 'styled-components'
import { districts } from '@/data/districts'
import { fetchAdministrations, fetchCommercials } from '@/lib/api/recommend'
import { isApiSuccess } from '@/lib/api/response'
import { communityMockLocations } from '@/lib/community/community-mock'
import type { ApiResponse } from '@/types/api'
import type {
  AdministrationArea,
  AdministrationAreasResponse,
  CommercialArea,
  CommercialAreasResponse,
} from '@/types/recommend'

export type CommunityLocationValue = {
  targetType?: 'DISTRICT' | 'ADMINISTRATION' | 'COMMERCIAL'
  targetCode?: string
  targetName?: string
}

export const serializeCommunityLocationIdentity = (
  value: CommunityLocationValue,
): string => JSON.stringify([value.targetType ?? '', value.targetCode ?? ''])

export const getCommunityLocationDisplayName = (
  value: CommunityLocationValue,
): string => value.targetName ?? value.targetCode ?? '서울 전체'

export const classifyCommunityLocationValueChange = (
  externalValueKey: string,
  lastEmittedValueKey: string | null,
): 'echo' | 'external' =>
  lastEmittedValueKey === externalValueKey ? 'echo' : 'external'

const isCommunityLocationValueEmpty = (
  value: CommunityLocationValue,
): boolean => !value.targetType && !value.targetCode && !value.targetName

export type CommunityLocationPickerProps = {
  value: CommunityLocationValue
  mockEnabled: boolean
  disabled?: boolean
  onChange: (value: CommunityLocationValue) => void
}

type LocationOption = {
  code: string
  name: string
}

export type CommunityLocationSelections = {
  district?: LocationOption
  administration?: LocationOption
  commercial?: LocationOption
}

export type CommunityLocationSyncState = {
  observedValueKey: string
  observedIsEmpty: boolean
  selections: CommunityLocationSelections
  isChanging: boolean
}

export type CommunityLocationSyncEvent =
  | {
      type: 'draft'
      selections: CommunityLocationSelections
    }
  | {
      type: 'start-change'
    }
  | {
      type: 'external'
      valueKey: string
      isEmpty: boolean
      lastEmittedValueKey: string | null
    }

export const createCommunityLocationSyncState = (
  value: CommunityLocationValue,
): CommunityLocationSyncState => ({
  observedValueKey: serializeCommunityLocationIdentity(value),
  observedIsEmpty: isCommunityLocationValueEmpty(value),
  selections: {},
  isChanging: isCommunityLocationValueEmpty(value),
})

export const reduceCommunityLocationSyncState = (
  state: CommunityLocationSyncState,
  event: CommunityLocationSyncEvent,
): CommunityLocationSyncState => {
  if (event.type === 'draft') {
    return {
      ...state,
      selections: event.selections,
      isChanging: true,
    }
  }

  if (event.type === 'start-change') {
    return {
      ...state,
      selections: {},
      isChanging: true,
    }
  }

  if (
    event.valueKey === state.observedValueKey &&
    event.isEmpty === state.observedIsEmpty
  ) {
    return state
  }

  if (
    classifyCommunityLocationValueChange(
      event.valueKey,
      event.lastEmittedValueKey,
    ) === 'echo'
  ) {
    return {
      ...state,
      observedValueKey: event.valueKey,
      observedIsEmpty: event.isEmpty,
    }
  }

  return {
    observedValueKey: event.valueKey,
    observedIsEmpty: event.isEmpty,
    selections: {},
    isChanging: event.isEmpty,
  }
}

export type CommunityLocationLevel =
  | 'none'
  | 'district'
  | 'administration'
  | 'commercial'

export const resolveCommunityLocationValue = (
  level: CommunityLocationLevel,
  selections: CommunityLocationSelections,
): CommunityLocationValue => {
  if (level === 'none') {
    return {}
  }

  const selection = selections[level]
  if (!selection) {
    return {}
  }

  const targetTypes = {
    district: 'DISTRICT',
    administration: 'ADMINISTRATION',
    commercial: 'COMMERCIAL',
  } as const

  return {
    targetType: targetTypes[level],
    targetCode: selection.code,
    targetName: selection.name,
  }
}

const successResponse = <T,>(dataBody: T): ApiResponse<T> => ({
  dataHeader: {
    success: true,
    resultCode: null,
    resultMessage: null,
  },
  dataBody,
})

const mockAdministrationsByDistrict: Readonly<
  Record<string, readonly AdministrationArea[]>
> = communityMockLocations.administrationsByDistrict

const mockCommercialsByAdministration: Readonly<
  Record<string, readonly CommercialArea[]>
> = communityMockLocations.commercialsByAdministration

const Container = styled.section`
  display: grid;
  gap: 14px;
`

const ReadOnlyCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 64px;
  padding: 12px 14px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface-muted);

  @media (max-width: 640px) {
    align-items: stretch;
    flex-direction: column;
  }
`

const TargetBadge = styled.span`
  width: fit-content;
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  border-radius: var(--radius-pill);
  background: var(--color-primary-100);
  color: var(--color-primary-700);
  font-size: 14px;
  font-weight: 700;
`

const ChangeButton = styled.button`
  min-height: 48px;
  padding: 0 16px;
  border: 1px solid var(--color-border-300);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text-900);
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary-strong);
  }
`

const PickerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`

const Field = styled.div`
  display: grid;
  align-content: start;
  gap: 8px;
`

const Label = styled.label`
  color: var(--color-text-700);
  font-size: 13px;
  font-weight: 700;
`

const Select = styled.select`
  width: 100%;
  height: 48px;
  padding: 0 14px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text-900);
  font: inherit;
  outline: none;

  &:focus-visible {
    border-color: var(--color-primary-600);
    box-shadow: var(--shadow-focus-primary-strong);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: var(--button-disabled-opacity-color);
  }
`

const FieldError = styled.div`
  display: grid;
  gap: 6px;
`

const ErrorMessage = styled.p`
  color: var(--color-danger);
  font-size: 12px;
  line-height: 1.5;
`

export const COMMUNITY_LOCATION_RETRY_MIN_HEIGHT = '48px' as const

const RetryButton = styled.button`
  width: fit-content;
  min-height: ${COMMUNITY_LOCATION_RETRY_MIN_HEIGHT};
  padding: 0 10px;
  border: 1px solid var(--color-border-300);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text-700);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary-strong);
  }
`

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`

const Helper = styled.p`
  color: var(--color-text-500);
  font-size: 13px;
  line-height: 1.65;
`

const ClearButton = styled.button`
  min-height: 48px;
  padding: 0 14px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text-700);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary-strong);
  }
`

export const readCommunityLocationOptions = <T,>(
  response: unknown,
): T[] | null => {
  if (
    !response ||
    typeof response !== 'object' ||
    !('dataHeader' in response) ||
    !('dataBody' in response)
  ) {
    return null
  }

  const candidate = response as ApiResponse<T[]>
  if (
    !candidate.dataHeader ||
    !isApiSuccess(candidate) ||
    !Array.isArray(candidate.dataBody)
  ) {
    return null
  }

  return candidate.dataBody
}

const hasInvalidResponse = (response: unknown): boolean =>
  response !== undefined && readCommunityLocationOptions(response) === null

export default function CommunityLocationPicker({
  value,
  mockEnabled,
  disabled = false,
  onChange,
}: CommunityLocationPickerProps) {
  const id = useId()
  const externalValueKey = serializeCommunityLocationIdentity(value)
  const externalValueIsEmpty = isCommunityLocationValueEmpty(value)
  const lastEmittedValueKeyRef = useRef<string | null>(null)
  const [syncState, dispatchSync] = useReducer(
    reduceCommunityLocationSyncState,
    value,
    createCommunityLocationSyncState,
  )
  const { isChanging, selections } = syncState

  useEffect(() => {
    let active = true
    const lastEmittedValueKey = lastEmittedValueKeyRef.current

    queueMicrotask(() => {
      if (active) {
        dispatchSync({
          type: 'external',
          valueKey: externalValueKey,
          isEmpty: externalValueIsEmpty,
          lastEmittedValueKey,
        })

        if (lastEmittedValueKeyRef.current === lastEmittedValueKey) {
          lastEmittedValueKeyRef.current = null
        }
      }
    })

    return () => {
      active = false
    }
  }, [externalValueIsEmpty, externalValueKey])

  const districtCode = selections.district?.code
  const administrationCode = selections.administration?.code

  const administrationsQuery = useQuery<AdministrationAreasResponse>({
    queryKey: [
      'community-locations',
      'administrations',
      mockEnabled,
      districtCode,
    ],
    queryFn: () => {
      if (mockEnabled) {
        return successResponse<AdministrationArea[]>([
          ...(mockAdministrationsByDistrict[districtCode!] ?? []),
        ])
      }

      return fetchAdministrations(districtCode!)
    },
    enabled: Boolean(districtCode) && !disabled,
  })

  const commercialsQuery = useQuery<CommercialAreasResponse>({
    queryKey: [
      'community-locations',
      'commercials',
      mockEnabled,
      districtCode,
      administrationCode,
    ],
    queryFn: () => {
      if (mockEnabled) {
        return successResponse<CommercialArea[]>([
          ...(mockCommercialsByAdministration[administrationCode!] ?? []),
        ])
      }

      return fetchCommercials(districtCode!, administrationCode!)
    },
    enabled: Boolean(districtCode) && Boolean(administrationCode) && !disabled,
  })

  const administrations =
    readCommunityLocationOptions<AdministrationArea>(
      administrationsQuery.data,
    ) ?? []
  const commercials =
    readCommunityLocationOptions<CommercialArea>(commercialsQuery.data) ?? []
  const administrationsError =
    administrationsQuery.isError ||
    hasInvalidResponse(administrationsQuery.data)
  const commercialsError =
    commercialsQuery.isError || hasInvalidResponse(commercialsQuery.data)
  const hasValue = Boolean(
    value.targetType || value.targetCode || value.targetName,
  )

  const emit = (
    level: CommunityLocationLevel,
    nextSelections: CommunityLocationSelections,
  ) => {
    const nextValue = resolveCommunityLocationValue(level, nextSelections)
    dispatchSync({ type: 'draft', selections: nextSelections })
    lastEmittedValueKeyRef.current =
      serializeCommunityLocationIdentity(nextValue)
    onChange(nextValue)
  }

  if (disabled || (hasValue && !isChanging)) {
    return (
      <Container aria-label="선택된 커뮤니티 지역">
        <ReadOnlyCard>
          <TargetBadge>{getCommunityLocationDisplayName(value)}</TargetBadge>
          {!disabled ? (
            <ChangeButton
              type="button"
              onClick={() => {
                const nextValue = {}
                dispatchSync({ type: 'start-change' })
                lastEmittedValueKeyRef.current =
                  serializeCommunityLocationIdentity(nextValue)
                onChange(nextValue)
              }}
            >
              지역 변경
            </ChangeButton>
          ) : null}
        </ReadOnlyCard>
        {disabled ? <Helper>지역은 수정할 수 없어요.</Helper> : null}
      </Container>
    )
  }

  const handleDistrictChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextDistrict = districts.find(
      district => String(district.gooCode) === event.target.value,
    )

    if (!nextDistrict) {
      emit('none', {})
      return
    }

    emit('district', {
      district: {
        code: String(nextDistrict.gooCode),
        name: nextDistrict.gooName,
      },
    })
  }

  const handleAdministrationChange = (
    event: ChangeEvent<HTMLSelectElement>,
  ) => {
    const nextAdministration = administrations.find(
      administration =>
        administration.administrationCode === event.target.value,
    )
    const nextSelections = {
      district: selections.district,
      administration: nextAdministration
        ? {
            code: nextAdministration.administrationCode,
            name: nextAdministration.administrationName,
          }
        : undefined,
    }

    emit(nextAdministration ? 'administration' : 'district', nextSelections)
  }

  const handleCommercialChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextCommercial = commercials.find(
      commercial => commercial.commercialCode === event.target.value,
    )
    const nextSelections = {
      district: selections.district,
      administration: selections.administration,
      commercial: nextCommercial
        ? {
            code: nextCommercial.commercialCode,
            name: nextCommercial.commercialName,
          }
        : undefined,
    }

    emit(nextCommercial ? 'commercial' : 'administration', nextSelections)
  }

  return (
    <Container aria-label="커뮤니티 지역 선택">
      <PickerGrid>
        <Field>
          <Label htmlFor={`${id}-district`}>자치구</Label>
          <Select
            id={`${id}-district`}
            value={districtCode ?? ''}
            onChange={handleDistrictChange}
          >
            <option value="">서울 전체</option>
            {districts.map(district => (
              <option key={district.gooCode} value={String(district.gooCode)}>
                {district.gooName}
              </option>
            ))}
          </Select>
        </Field>

        <Field>
          <Label htmlFor={`${id}-administration`}>행정동</Label>
          <Select
            id={`${id}-administration`}
            value={administrationCode ?? ''}
            disabled={
              !districtCode ||
              administrationsQuery.isPending ||
              administrationsError
            }
            onChange={handleAdministrationChange}
          >
            <option value="">
              {administrationsQuery.isPending && districtCode
                ? '행정동 불러오는 중'
                : '행정동 선택'}
            </option>
            {administrations.map(administration => (
              <option
                key={administration.administrationCode}
                value={administration.administrationCode}
              >
                {administration.administrationName}
              </option>
            ))}
          </Select>
          {administrationsError ? (
            <FieldError role="status">
              <ErrorMessage>행정동을 불러오지 못했어요.</ErrorMessage>
              <RetryButton
                type="button"
                onClick={() => void administrationsQuery.refetch()}
              >
                다시 시도
              </RetryButton>
            </FieldError>
          ) : null}
        </Field>

        <Field>
          <Label htmlFor={`${id}-commercial`}>상권</Label>
          <Select
            id={`${id}-commercial`}
            value={selections.commercial?.code ?? ''}
            disabled={
              !administrationCode ||
              commercialsQuery.isPending ||
              commercialsError
            }
            onChange={handleCommercialChange}
          >
            <option value="">
              {commercialsQuery.isPending && administrationCode
                ? '상권 불러오는 중'
                : '상권 선택'}
            </option>
            {commercials.map(commercial => (
              <option
                key={commercial.commercialCode}
                value={commercial.commercialCode}
              >
                {commercial.commercialName}
              </option>
            ))}
          </Select>
          {commercialsError ? (
            <FieldError role="status">
              <ErrorMessage>상권을 불러오지 못했어요.</ErrorMessage>
              <RetryButton
                type="button"
                onClick={() => void commercialsQuery.refetch()}
              >
                다시 시도
              </RetryButton>
            </FieldError>
          ) : null}
        </Field>
      </PickerGrid>

      <Footer>
        <Helper>서울 전체부터 상권까지 필요한 범위로 선택해 주세요.</Helper>
        <ClearButton
          type="button"
          onClick={() => {
            const nextValue = {}
            dispatchSync({ type: 'draft', selections: {} })
            lastEmittedValueKeyRef.current =
              serializeCommunityLocationIdentity(nextValue)
            onChange(nextValue)
          }}
        >
          선택 지우기
        </ClearButton>
      </Footer>
    </Container>
  )
}
