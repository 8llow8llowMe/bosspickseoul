import 'server-only'

const trimSlash = (v: string) => (v.endsWith('/') ? v.slice(0, -1) : v)

export type ServerEnv = {
  authSessionSecret: string
  backendApiUrl: string
}

export const getConfiguredBackendApiUrl = () => {
  const backend =
    process.env.BACKEND_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim()

  if (!backend) {
    return null
  }

  try {
    const url = new URL(backend)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null
    }

    return trimSlash(url.toString())
  } catch {
    return null
  }
}

export const getServerEnv = (): ServerEnv => {
  const secret = process.env.AUTH_SESSION_SECRET?.trim()
  if (!secret || secret.length < 32) {
    throw new Error(
      'AUTH_SESSION_SECRET must be set (>=32 chars) for BFF session encryption',
    )
  }
  const backend = getConfiguredBackendApiUrl() ?? 'http://localhost:8080'
  return { authSessionSecret: secret, backendApiUrl: trimSlash(backend) }
}
