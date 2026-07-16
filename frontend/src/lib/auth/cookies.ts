type CookieOptions = {
  path?: string
  maxAge?: number
  expires?: Date
  secure?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
}

const isBrowser = () => typeof document !== 'undefined'

const parseCookieString = (cookieString: string) =>
  cookieString
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)

export const getCookie = (
  name: string,
  cookieString?: string,
): string | null => {
  const source = cookieString ?? (isBrowser() ? document.cookie : '')

  if (!source) {
    return null
  }

  const target = parseCookieString(source).find(part =>
    part.startsWith(`${name}=`),
  )

  if (!target) {
    return null
  }

  return decodeURIComponent(target.slice(name.length + 1))
}

export const setCookie = (
  name: string,
  value: string,
  options: CookieOptions = {},
) => {
  if (!isBrowser()) {
    return
  }

  const cookieParts = [`${name}=${encodeURIComponent(value)}`]

  cookieParts.push(`path=${options.path ?? '/'}`)

  if (typeof options.maxAge === 'number') {
    cookieParts.push(`max-age=${options.maxAge}`)
  }

  if (options.expires) {
    cookieParts.push(`expires=${options.expires.toUTCString()}`)
  }

  if (options.sameSite) {
    cookieParts.push(`samesite=${options.sameSite}`)
  }

  if (options.secure) {
    cookieParts.push('secure')
  }

  document.cookie = cookieParts.join('; ')
}

export const deleteCookie = (name: string, path = '/') => {
  setCookie(name, '', {
    path,
    expires: new Date(0),
  })
}

export const getAccessTokenCookie = () => getCookie('accessToken')
