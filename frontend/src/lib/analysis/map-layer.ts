export type MapLayer = 'district' | 'administration' | 'commercial'

export const resolveMapLayerByZoom = (level: number): MapLayer => {
  if (level >= 7) return 'district'
  if (level >= 5) return 'administration'
  return 'commercial'
}
