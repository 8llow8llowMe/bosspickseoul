'use client'

import { create } from 'zustand'
import type { PlaceOption } from '@/types/map'

const districtPlaceholder: PlaceOption = { name: '자치구', code: 0 }
const administrationPlaceholder: PlaceOption = { name: '행정동', code: 0 }
const commercialPlaceholder: PlaceOption = { name: '상권', code: 0 }

type SelectPlaceState = {
  selectedDistrict: PlaceOption
  selectedAdministration: PlaceOption
  selectedCommercial: PlaceOption
  setSelectedDistrict: (place: PlaceOption) => void
  setSelectedAdministration: (place: PlaceOption) => void
  setSelectedCommercial: (place: PlaceOption) => void
  resetAdministrationAndCommercial: () => void
  resetCommercial: () => void
}

export const useSelectPlaceStore = create<SelectPlaceState>(set => ({
  selectedDistrict: districtPlaceholder,
  selectedAdministration: administrationPlaceholder,
  selectedCommercial: commercialPlaceholder,
  setSelectedDistrict: place => set({ selectedDistrict: place }),
  setSelectedAdministration: place => set({ selectedAdministration: place }),
  setSelectedCommercial: place => set({ selectedCommercial: place }),
  resetAdministrationAndCommercial: () =>
    set({
      selectedAdministration: administrationPlaceholder,
      selectedCommercial: commercialPlaceholder,
    }),
  resetCommercial: () =>
    set({
      selectedCommercial: commercialPlaceholder,
    }),
}))
