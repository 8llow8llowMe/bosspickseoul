import { ImageResponse } from 'next/og'

import { BrandOgImage, OG_IMAGE_SIZE } from '@/lib/og/brand-og-image'
import { ShareOgCardImage } from '@/lib/og/share-og-card'
import {
  SHARE_OG_CARD_CACHE_CONTROL,
  SHARE_OG_FALLBACK_CACHE_CONTROL,
} from '@/lib/share/share-og'
import {
  loadShareOgCard,
  loadShareOgFonts,
  type ShareOgFont,
} from '@/lib/share/share-og.server'

/**
 * 공유 링크 미리보기 이미지(share.md D4-2, #598). 상권분석·AI 리포트 공유는 상권명·업종·기준 분기와
 * 점포당 월 매출·점포 수를 그린다. 그 밖(해석 실패·만료·미지원 유형·지표 없음·폰트 밖 글자·백엔드
 * 오류)은 **루트 OG 이미지와 같은 그림**이다 — 500 을 내면 미리보기가 이미지 없이 붙는다.
 *
 * - Node 런타임이다. 폰트(WOFF1 2벌, 약 453KB)를 `public/fonts/og` 에서 `fs` 로 읽는다. 배포 호스트도
 *   Node standalone 이다.
 * - 이 라우트는 `params` 를 받아 요청마다 그린다. 조회 비용은 fetch 데이터 캐시(해석 1시간·지표 하루,
 *   `share-og.server.ts`)가 묶는다. 서버는 PNG 를 캐시하지 않는다(ISR 없음) — 백엔드가 잠깐 실패한
 *   순간의 폴백 이미지가 굳지 않게 한다. 대신 **응답 캐시 헤더를 둘로 나눈다**: 카드는 브라우저 1시간·공유
 *   캐시 하루(`SHARE_OG_CARD_CACHE_CONTROL`), 폴백은 5분(`SHARE_OG_FALLBACK_CACHE_CONTROL`).
 * - 페이지 메타(`page.tsx`)는 `openGraph.images` 를 비워 두어야 이 파일이 og:image 가 된다
 *   (`createPageMetadata({ ogImage: 'segment' })`).
 */

export const size = OG_IMAGE_SIZE
export const contentType = 'image/png'
/** 폴백(심볼만)일 때도 붙으므로 상권·지표를 단정하지 않는다. */
export const alt = 'BossPickSeoul 공유 링크 미리보기'

type ImageProps = {
  params: Promise<{ shareCode: string }>
}

const fallback = () =>
  new ImageResponse(<BrandOgImage />, {
    ...size,
    headers: { 'cache-control': SHARE_OG_FALLBACK_CACHE_CONTROL },
  })

export default async function ShareOpengraphImage({ params }: ImageProps) {
  const { shareCode } = await params

  let fonts: ShareOgFont[]
  try {
    fonts = await loadShareOgFonts()
  } catch {
    return fallback()
  }

  const card = await loadShareOgCard(shareCode)
  if (!card) return fallback()

  return new ImageResponse(<ShareOgCardImage card={card} />, {
    ...size,
    fonts,
    headers: { 'cache-control': SHARE_OG_CARD_CACHE_CONTROL },
  })
}
