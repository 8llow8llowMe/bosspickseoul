import type { Metadata } from 'next'
import GoogleAnalytics from '@/components/analytics/google-analytics'
import ScrollbarReveal from '@/components/layout/scrollbar-reveal'
import AppProviders from '@/providers/app-providers'
import StyledComponentsRegistry from '@/lib/styled-components-registry'
import { pretendard } from '@/lib/fonts'
import { siteConfig } from '@/lib/site'
import GlobalStyles from '@/styles/global-styles'

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  alternates: {
    canonical: siteConfig.url,
  },
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: siteConfig.locale,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.name,
    description: siteConfig.description,
  },
}

type RootLayoutProps = {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko" className={pretendard.variable}>
      <body>
        <StyledComponentsRegistry>
          <GlobalStyles />
          <ScrollbarReveal />
          <AppProviders>{children}</AppProviders>
        </StyledComponentsRegistry>
        {/* 측정 ID 가 없으면 아무것도 렌더하지 않는다. */}
        <GoogleAnalytics />
      </body>
    </html>
  )
}
