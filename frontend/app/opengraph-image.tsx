import { ImageResponse } from 'next/og'

import { BrandOgImage, OG_IMAGE_SIZE } from '@/lib/og/brand-og-image'

/**
 * 공유 카드 이미지(심볼만). 그림은 `src/lib/og/brand-og-image.tsx` 에 있다 — 공유 링크 이미지
 * (`app/(shell)/s/[shareCode]/opengraph-image.tsx`)가 해석에 실패하면 같은 그림으로 떨어진다.
 */

export const size = OG_IMAGE_SIZE
export const contentType = 'image/png'
export const alt = 'BossPickSeoul'

export default function OpengraphImage() {
  return new ImageResponse(<BrandOgImage />, { ...size })
}
