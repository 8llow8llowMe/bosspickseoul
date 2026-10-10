const KAKAO_MAP_SCRIPT_ID = 'kakao-map-sdk'
const KAKAO_MAP_LOAD_ERROR = 'Kakao Map SDK를 불러오지 못했습니다.'
const KAKAO_MAP_INIT_ERROR = 'Kakao Map SDK 초기화에 실패했습니다.'

let kakaoMapSdkPromise: Promise<KakaoMapsNamespace> | null = null

export const createKakaoMapScriptUrl = (key: string): string => {
  const normalizedKey = key.trim()

  if (!normalizedKey) {
    throw new Error('Kakao Map API key가 설정되지 않았습니다.')
  }

  // `libraries=services` 는 상권분석 이름 검색의 장소 검색(Places)용이다(#596). 지도와 같은
  // 스크립트 한 벌로 받으므로 키·로더는 그대로다.
  return `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(
    normalizedKey,
  )}&autoload=false&libraries=services`
}

export const loadKakaoMapSdk = (key: string): Promise<KakaoMapsNamespace> => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(
      new Error('Kakao Map은 브라우저 환경에서만 불러올 수 있습니다.'),
    )
  }

  let scriptUrl: string

  try {
    scriptUrl = createKakaoMapScriptUrl(key)
  } catch (error) {
    return Promise.reject(error)
  }

  if (kakaoMapSdkPromise) return kakaoMapSdkPromise

  kakaoMapSdkPromise = new Promise<KakaoMapsNamespace>((resolve, reject) => {
    const fail = (message: string, script?: HTMLScriptElement) => {
      script?.remove()
      kakaoMapSdkPromise = null
      reject(new Error(message))
    }

    const initialize = (script?: HTMLScriptElement) => {
      const maps = window.kakao?.maps

      if (!maps) {
        fail(KAKAO_MAP_INIT_ERROR, script)
        return
      }

      try {
        maps.load(() => {
          const loadedMaps = window.kakao?.maps

          if (!loadedMaps) {
            fail(KAKAO_MAP_INIT_ERROR, script)
            return
          }

          script?.setAttribute('data-kakao-map-loaded', 'true')
          resolve(loadedMaps)
        })
      } catch {
        fail(KAKAO_MAP_INIT_ERROR, script)
      }
    }

    const existingScript = document.getElementById(
      KAKAO_MAP_SCRIPT_ID,
    ) as HTMLScriptElement | null

    if (window.kakao?.maps) {
      queueMicrotask(() => initialize(existingScript ?? undefined))
      return
    }

    if (existingScript) {
      if (existingScript.dataset.kakaoMapLoaded === 'true') {
        queueMicrotask(() => initialize(existingScript))
        return
      }

      existingScript.addEventListener(
        'load',
        () => initialize(existingScript),
        { once: true },
      )
      existingScript.addEventListener(
        'error',
        () => fail(KAKAO_MAP_LOAD_ERROR, existingScript),
        { once: true },
      )
      return
    }

    const script = document.createElement('script')
    script.id = KAKAO_MAP_SCRIPT_ID
    script.src = scriptUrl
    script.async = true
    script.addEventListener('load', () => initialize(script), { once: true })
    script.addEventListener('error', () => fail(KAKAO_MAP_LOAD_ERROR, script), {
      once: true,
    })
    document.head.appendChild(script)
  })

  return kakaoMapSdkPromise
}
