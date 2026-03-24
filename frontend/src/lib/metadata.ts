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
    },
    twitter: {
      card: 'summary_large_image',
      title: resolvedTitle,
      description,
    },
  }
}
