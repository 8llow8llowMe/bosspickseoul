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

// 브라우저의 REST 호출은 전부 same-origin `/api/bff` 로 나가고(`lib/api/client.ts`),
// 백엔드 주소는 서버 쪽 BACKEND_API_URL 만 안다. 그래서 이 값은 밖으로 내보내지 않고
// NEXT_PUBLIC_WS_URL 이 비었을 때 WebSocket 주소를 유도하는 용도로만 쓴다.
// (배포 환경에서는 NEXT_PUBLIC_WS_URL 을 명시하므로 이 경로를 타지 않는다)
const apiUrl = normalizeUrl(
  process.env.NEXT_PUBLIC_API_URL,
  'http://localhost:8080',
)

export const env = {
  siteUrl: normalizeUrl(
    process.env.NEXT_PUBLIC_SITE_URL,
    'http://localhost:3000',
  ),
  // WebSocket 은 BFF 를 거치지 않고 브라우저가 백엔드로 직접 붙으므로 공개 주소가 필요하다.
  wsUrl: resolveWsUrl(process.env.NEXT_PUBLIC_WS_URL, apiUrl),
  // 카카오는 지도 SDK와 공유(Kakao Link) SDK가 같은 "JavaScript 키" 하나를 쓴다.
  // 예전에는 NEXT_PUBLIC_KAKAOMAP_API_KEY 를 따로 뒀는데, 별도 키가 있는 것처럼
  // 오해를 부르고 실제로는 같은 값을 두 번 넣게 되어 하나로 합쳤다.
  kakaoJavascriptKey: process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY ?? '',
  // FCM 웹 푸시(채팅 알림)용. 비어 있으면 firebase-messaging 이 스스로 비활성화한다.
  firebaseApiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  firebaseMessagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  firebaseAppId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
  firebaseMeasurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? '',
  firebaseVapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? '',
} as const
