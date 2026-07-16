import SiteFooter from '@/components/layout/site-footer'
import SiteHeader from '@/components/layout/site-header'

type ShellLayoutProps = {
  children: React.ReactNode
}

export default function ShellLayout({ children }: ShellLayoutProps) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  )
}
