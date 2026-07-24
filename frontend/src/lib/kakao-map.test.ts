import { afterEach, describe, expect, it, vi } from 'vitest'

import { createKakaoMapScriptUrl, loadKakaoMapSdk } from './kakao-map'

describe('createKakaoMapScriptUrl', () => {
  it('creates the Kakao Maps SDK URL after trimming and encoding the key', () => {
    expect(createKakaoMapScriptUrl('  key +/한글  ')).toBe(
      'https://dapi.kakao.com/v2/maps/sdk.js?appkey=key%20%2B%2F%ED%95%9C%EA%B8%80&autoload=false',
    )
  })

  it.each(['', '   '])('rejects an empty API key: %j', key => {
    expect(() => createKakaoMapScriptUrl(key)).toThrow(
      'Kakao Map API key가 설정되지 않았습니다.',
    )
  })
})

describe('loadKakaoMapSdk', () => {
  it('rejects outside a browser environment', async () => {
    await expect(loadKakaoMapSdk('test-key')).rejects.toThrow(
      'Kakao Map은 브라우저 환경에서만 불러올 수 있습니다.',
    )
  })

  it('shares one script and creates a fresh script after a load failure', async () => {
    const scripts = new Map<string, FakeScript>()
    const createdScripts: FakeScript[] = []
    const fakeDocument = {
      createElement: () => {
        const script = new FakeScript(scripts)
        createdScripts.push(script)
        return script
      },
      getElementById: (id: string) => scripts.get(id) ?? null,
      head: {
        appendChild: (script: FakeScript) => {
          scripts.set(script.id, script)
        },
      },
    }
    const fakeWindow: { kakao?: KakaoMapSdk } = {}
    vi.stubGlobal('document', fakeDocument)
    vi.stubGlobal('window', fakeWindow)

    const failedLoad = loadKakaoMapSdk('test-key')
    createdScripts[0].dispatchEvent(new Event('error'))

    await expect(failedLoad).rejects.toThrow(
      'Kakao Map SDK를 불러오지 못했습니다.',
    )
    expect(scripts.size).toBe(0)

    const retriedLoad = loadKakaoMapSdk('test-key')
    const sharedLoad = loadKakaoMapSdk('test-key')
    expect(sharedLoad).toBe(retriedLoad)
    expect(createdScripts).toHaveLength(2)

    const maps = {
      load: (callback: () => void) => callback(),
    } as unknown as KakaoMapsNamespace
    fakeWindow.kakao = { maps }
    createdScripts[1].dispatchEvent(new Event('load'))

    await expect(retriedLoad).resolves.toBe(maps)
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

class FakeScript extends EventTarget {
  id = ''
  src = ''
  async = false
  dataset: Record<string, string> = {}

  constructor(private readonly scripts: Map<string, FakeScript>) {
    super()
  }

  remove() {
    this.scripts.delete(this.id)
  }

  setAttribute(name: string, value: string) {
    if (name === 'data-kakao-map-loaded') {
      this.dataset.kakaoMapLoaded = value
    }
  }
}
