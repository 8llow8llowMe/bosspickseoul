import type { MetadataRoute } from 'next'
import { routeSkeletons } from '@/lib/route-skeletons'
import { env } from '@/lib/env'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return [
    ...new Set(
      Object.values(routeSkeletons)
        .filter(route => route.visibility === 'index')
        .map(route => route.path)
        .filter(path => !path.includes('[')),
    ),
  ].map(path => ({
    url: new URL(path, env.siteUrl).toString(),
    lastModified,
    changeFrequency: path === '/' ? 'weekly' : 'daily',
    priority: path === '/' ? 1 : 0.7,
  }))
}
