import SiteFooter from '@/components/layout/site-footer'
import SiteHeader from '@/components/layout/site-header'
import SiteShell from '@/components/layout/site-shell'

type ShellLayoutProps = {
  children: React.ReactNode
}

/*
  헤더 · 본문 칸 · 푸터를 최소 한 화면 높이의 세로 묶음으로 둔다 — 내용이 짧아도 푸터가 바닥에 붙는다
  (community.md §S4 「다듬기」 푸터 위치). 묶음의 규칙과 본문 칸을 두는 이유는 site-shell.tsx.
*/
export default function ShellLayout({ children }: ShellLayoutProps) {
  return (
    <SiteShell footer={<SiteFooter />} header={<SiteHeader />}>
      {children}
    </SiteShell>
  )
}
