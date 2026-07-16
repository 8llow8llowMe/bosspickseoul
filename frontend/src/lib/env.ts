const normalizeUrl = (value: string | undefined, fallback: string) => {
  const resolved = value?.trim() || fallback
  return resolved.endsWith('/') ? resolved.slice(0, -1) : resolved
}

const resolveWsUrl = (value: string | undefined, apiUrl: string) => {
  const explicitWsUrl = value?.trim()

  if (explicitWsUrl) {
    return explicitWsUrl.endsWith('/')
      ? explicitWsUrl.slice(0, -1)
      : explicitWsUrl
  }

  try {
    const parsedApiUrl = new URL(apiUrl)
    const protocol = parsedApiUrl.protocol === 'https:' ? 'wss:' : 'ws:'

    return `${protocol}//${parsedApiUrl.host}/ws`
  } catch {
    return 'ws://localhost:8080/ws'
  }
}

const apiUrl = normalizeUrl(
  process.env.NEXT_PUBLIC_API_URL,
  'http://localhost:8080',
)

export const env = {
  siteUrl: normalizeUrl(
    process.env.NEXT_PUBLIC_SITE_URL,
    'http://localhost:3000',
  ),
  apiUrl,
  wsUrl: resolveWsUrl(process.env.NEXT_PUBLIC_WS_URL, apiUrl),
  kakaoMapApiKey: process.env.NEXT_PUBLIC_KAKAOMAP_API_KEY ?? '',
  kakaoJavascriptKey: process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY ?? '',
  firebaseApiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  firebaseMessagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  firebaseAppId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
  firebaseMeasurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? '',
  firebaseVapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? '',
} as const
