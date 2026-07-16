'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'

export default function AuthSessionHydrator() {
  const hydrate = useAuthStore(state => state.hydrate)

  useEffect(() => {
    hydrate()

    const handleStorage = () => {
      hydrate()
    }

    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener('storage', handleStorage)
    }
  }, [hydrate])

  return null
}
