'use client'

import { useQuery } from '@tanstack/react-query'
import styled from 'styled-components'
import { districts } from '@/data/districts'
import { fetchAdministrationList, fetchDongList } from '@/lib/api/map'
import { isApiSuccess } from '@/lib/api/response'
import { useSelectPlaceStore } from '@/stores/select-place-store'

const Container = styled.section`
  display: grid;
  gap: 14px;
`

const Header = styled.div`
  display: grid;
  gap: 6px;
`

const Title = styled.h2`
  color: var(--color-text-900);
  font-size: 18px;
  line-height: 1.3;
`

const Description = styled.p`
  color: var(--color-text-500);
  font-size: 14px;
  line-height: 1.7;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

const Field = styled.label`
  display: grid;
  gap: 8px;
`

const Label = styled.span`
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
  background: white;
  color: var(--color-text-900);
  font: inherit;
  outline: none;

  &:focus {
    border-color: var(--color-primary-600);
    box-shadow: var(--shadow-focus-primary-strong);
  }
`

const Helper = styled.p`
  color: var(--color-text-500);
  font-size: 13px;
  line-height: 1.7;
`

type LocationSelectorProps = {
  title: string
  description: string
  showCommercial?: boolean
}

export default function LocationSelector({
  title,
  description,
  showCommercial = false,
}: LocationSelectorProps) {
  const selectedDistrict = useSelectPlaceStore(state => state.selectedDistrict)
  const selectedAdministration = useSelectPlaceStore(
    state => state.selectedAdministration,
  )
  const selectedCommercial = useSelectPlaceStore(
    state => state.selectedCommercial,
  )
  const setSelectedDistrict = useSelectPlaceStore(
    state => state.setSelectedDistrict,
  )
  const setSelectedAdministration = useSelectPlaceStore(
    state => state.setSelectedAdministration,
  )
  const setSelectedCommercial = useSelectPlaceStore(
    state => state.setSelectedCommercial,
  )
  const resetAdministrationAndCommercial = useSelectPlaceStore(
    state => state.resetAdministrationAndCommercial,
  )
  const resetCommercial = useSelectPlaceStore(state => state.resetCommercial)

  const dongQuery = useQuery({
    queryKey: ['fetchDongList', selectedDistrict.code],
    queryFn: () => fetchDongList(selectedDistrict.code),
    enabled: selectedDistrict.code > 0,
  })

  const commercialQuery = useQuery({
    queryKey: ['fetchAdministrationList', selectedAdministration.code],
    queryFn: () => fetchAdministrationList(selectedAdministration.code),
    enabled: showCommercial && selectedAdministration.code > 0,
  })

  const administrations =
    dongQuery.data && isApiSuccess(dongQuery.data)
      ? dongQuery.data.dataBody
      : []
  const commercials =
    commercialQuery.data && isApiSuccess(commercialQuery.data)
      ? commercialQuery.data.dataBody
      : []

  return (
    <Container>
      <Header>
        <Title>{title}</Title>
        <Description>{description}</Description>
      </Header>
      <Grid>
        <Field>
          <Label>자치구</Label>
          <Select
            value={selectedDistrict.code}
            onChange={event => {
              const nextCode = Number(event.target.value)
              const nextDistrict = districts.find(
                district => district.gooCode === nextCode,
              )

              if (!nextDistrict) {
                return
              }

              setSelectedDistrict({
                name: nextDistrict.gooName,
                code: nextDistrict.gooCode,
              })
              resetAdministrationAndCommercial()
            }}
          >
            <option value={0}>자치구 선택</option>
            {districts.map(district => (
              <option key={district.gooCode} value={district.gooCode}>
                {district.gooName}
              </option>
            ))}
          </Select>
        </Field>

        <Field>
          <Label>행정동</Label>
          <Select
            value={selectedAdministration.code}
            disabled={selectedDistrict.code === 0}
            onChange={event => {
              const nextCode = Number(event.target.value)
              const nextAdministration = administrations.find(
                administration =>
                  administration.administrationCode === nextCode,
              )

              if (!nextAdministration) {
                return
              }

              setSelectedAdministration({
                name: nextAdministration.administrationCodeName,
                code: nextAdministration.administrationCode,
              })
              resetCommercial()
            }}
          >
            <option value={0}>행정동 선택</option>
            {administrations.map(administration => (
              <option
                key={administration.administrationCode}
                value={administration.administrationCode}
              >
                {administration.administrationCodeName}
              </option>
            ))}
          </Select>
        </Field>

        {showCommercial ? (
          <Field>
            <Label>상권</Label>
            <Select
              value={selectedCommercial.code}
              disabled={selectedAdministration.code === 0}
              onChange={event => {
                const nextCode = Number(event.target.value)
                const nextCommercial = commercials.find(
                  commercial => commercial.commercialCode === nextCode,
                )

                if (!nextCommercial) {
                  return
                }

                setSelectedCommercial({
                  name: nextCommercial.commercialCodeName,
                  code: nextCommercial.commercialCode,
                })
              }}
            >
              <option value={0}>상권 선택</option>
              {commercials.map(commercial => (
                <option
                  key={commercial.commercialCode}
                  value={commercial.commercialCode}
                >
                  {commercial.commercialCodeName}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
      </Grid>
      <Helper>
        현재 선택: {selectedDistrict.name} / {selectedAdministration.name}
        {showCommercial ? ` / ${selectedCommercial.name}` : ''}
      </Helper>
    </Container>
  )
}
