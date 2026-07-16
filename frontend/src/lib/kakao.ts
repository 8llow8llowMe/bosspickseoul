declare global {
  interface Window {
    Kakao?: {
      cleanup: () => void
      init: (key: string) => void
      isInitialized?: () => boolean
      Link: {
        sendCustom: (payload: {
          templateId: number
          templateArgs: Record<string, string>
        }) => void
      }
    }
  }
}

const KAKAO_SDK_SRC = 'https://developers.kakao.com/sdk/js/kakao.js'

export const loadKakaoSdk = () =>
  new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Kakao SDK는 브라우저 환경에서만 로드할 수 있습니다.'))
      return
    }

    if (window.Kakao) {
      resolve()
      return
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${KAKAO_SDK_SRC}"]`,
    )

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Kakao SDK를 불러오지 못했습니다.')),
        { once: true },
      )
      return
    }

    const script = document.createElement('script')
    script.src = KAKAO_SDK_SRC
    script.async = true
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener(
      'error',
      () => reject(new Error('Kakao SDK를 불러오지 못했습니다.')),
      { once: true },
    )
    document.head.appendChild(script)
  })
