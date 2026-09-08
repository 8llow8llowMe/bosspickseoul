import type { Metadata } from 'next'
import { siteConfig } from '@/lib/site'

type CreatePageMetadataOptions = {
  title?: string
  description?: string
  path?: string
  index?: boolean
  type?: 'website' | 'article'
}

const createAbsoluteUrl = (path = '/') =>
  new URL(path, siteConfig.url).toString()

/**
 * `app/opengraph-image.tsx` 가 내보내는 `size`/`alt` 와 반드시 같은 값이어야
 * 한다. 그 파일은 Next 특수 파일(next/og 라우트)이라 여기서 직접 import 하면
 * next/og 번들이 이 헬퍼를 쓰는 모든 페이지에 딸려 들어가므로, 값만 그대로
 * 옮겨 적는다.
 *
 * `openGraph`/`twitter` 는 상위(루트 레이아웃) 값을 얕게 덮어쓴다 — 여기서
 * `images` 를 빼면 파일 컨벤션이 붙여주는 OG 이미지가 통째로 사라진다.
 */
const OG_IMAGE = {
  url: '/opengraph-image',
  width: 1200,
  height: 630,
  alt: 'BossPickSeoul',
} as const

export const createPageMetadata = ({
  title,
  description = siteConfig.description,
  path = '/',
  index = true,
  type = 'website',
}: CreatePageMetadataOptions): Metadata => {
  const canonical = createAbsoluteUrl(path)
  const resolvedTitle = title
    ? `${title} | ${siteConfig.name}`
    : siteConfig.name

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    robots: {
      index,
      follow: index,
    },
    openGraph: {
      title: resolvedTitle,
      description,
      url: canonical,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      type,
      images: [OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: resolvedTitle,
      description,
      images: [OG_IMAGE],
    },
  }
}
