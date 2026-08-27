'use client'

import AuthSessionHydrator from '@/components/auth/auth-session-hydrator'
import ToastProvider from '@/components/ui/toast'
import QueryProvider from '@/providers/query-provider'

type AppProvidersProps = {
  children: React.ReactNode
}

export default function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryProvider>
      <AuthSessionHydrator />
      {/* 토스트는 화면 어디서든 띄운다. 뮤테이션이 QueryProvider 안에서 일어나므로 그 안쪽에 둔다. */}
      <ToastProvider>{children}</ToastProvider>
    </QueryProvider>
  )
}
