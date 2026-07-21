export const extractCookieValue = (
  setCookieHeaders: string[] | string | null,
  name: string,
): string | null => {
  if (!setCookieHeaders) return null
  const list = Array.isArray(setCookieHeaders)
    ? setCookieHeaders
    : [setCookieHeaders]
  for (const header of list) {
    const first = header.split(';', 1)[0]?.trim() ?? ''
    const eq = first.indexOf('=')
    if (eq === -1) continue
    if (first.slice(0, eq) === name) return first.slice(eq + 1)
  }
  return null
}
