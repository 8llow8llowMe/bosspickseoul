import type { Metadata } from 'next'
import { siteConfig } from '@/lib/site'

type CreatePageMetadataOptions = {
  title?: string
  description?: string
  path?: string
  index?: boolean
  type?: 'website' | 'article'
  /**
   * `'segment'` 면 `images` 키를 아예 넣지 않는다. 그래야 그 경로 세그먼트의
   * `opengraph-image.tsx` 가 og:image 가 된다 — Next 는 같은 세그먼트의 메타에 `images` 키가
   * 있으면 파일 컨벤션 이미지를 붙이지 않는다(`resolve-metadata.js`). 라우트 그룹 아래 이미지
   * 주소에는 해시 접미사가 붙어(`opengraph-image-<hash>`) 여기서 주소를 적을 수도 없다.
   */
  ogImage?: 'default' | 'segment'
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
  ogImage = 'default',
}: CreatePageMetadataOptions): Metadata => {
  const canonical = createAbsoluteUrl(path)
  const images = ogImage === 'default' ? { images: [OG_IMAGE] } : {}
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
      ...images,
    },
    twitter: {
      card: 'summary_large_image',
      title: resolvedTitle,
      description,
      ...images,
    },
  }
}
