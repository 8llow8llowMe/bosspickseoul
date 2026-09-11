import type { Page, Request } from '@playwright/test'
import { routeAnalysisRankings } from '../fixtures/analysis-rankings'

/**
 * 홈 화면 감사 지표를 **브라우저 안에서** 재는 헬퍼.
 *
 * 측정 방식은 `docs/features/home/home-ux-audit-2026-09-11.md` §1 을 그대로 따른다.
 * - 대비: `getComputedStyle` 로 전경·배경을 뽑아 WCAG 2.x 명도 대비를 계산한다.
 *   큰 글자(≥24px 또는 ≥18.66px 700)는 3:1, 나머지는 4.5:1.
 * - 대상 요소: **직접 텍스트 노드를 가진 요소**만(감사와 동일). 부모가 자식 텍스트를
 *   중복해서 세는 것을 막는다.
 * - 위치 지표: 스크롤 0 지점에서 `rect.top + scrollY` 를 화면 수로 환산한다.
 */

export type ContrastCombination = {
  foreground: string
  background: string
  fontSize: number
  fontWeight: number
  ratio: number
  threshold: number
  count: number
  sample: string
}

export type TapTarget = {
  tag: string
  label: string
  width: number
  height: number
}

export type HomeMetrics = {
  viewport: { width: number; height: number }
  docHeightPx: number
  docHeightScreens: number
  stickyTrackPx: number
  stickyTrackShare: number
  stickyTracks: { label: string; height: number }[]
  h1Count: number
  h1Screen: number | null
  firstCtaScreen: number | null
  contrastCombinations: number
  contrastFailures: number
  contrastFailureList: ContrastCombination[]
  smallTapTargets: number
  smallTapTargetList: TapTarget[]
  textElements: number
  fontSizes: Record<string, number>
  offScaleFontSizes: number
  offScaleFontSizeList: number[]
  sentenceEndings: { formal: number; polite: number }
  horizontalOverflow: boolean
  linkHrefs: string[]
}

/** DESIGN.md §3 타이포 스케일. 이 밖의 렌더 크기를 `offScaleFontSizes` 로 센다. */
const FONT_SCALE = [12, 13, 14, 16, 20, 22, 26, 30]

export const measureHomeMetrics = (page: Page): Promise<HomeMetrics> =>
  page.evaluate((fontScale: number[]) => {
    const main = document.querySelector('main')
    if (!main) throw new Error('main 요소를 찾지 못했습니다.')

    type Rgb = { r: number; g: number; b: number; a: number }

    const parseColor = (value: string): Rgb | null => {
      const match = value.match(/rgba?\(([^)]+)\)/)
      if (!match) return null
      const parts = match[1]
        .split(/[\s,/]+/)
        .filter(Boolean)
        .map(Number)
      if (parts.length < 3 || parts.slice(0, 3).some(Number.isNaN)) return null
      return {
        r: parts[0],
        g: parts[1],
        b: parts[2],
        a: parts.length > 3 && !Number.isNaN(parts[3]) ? parts[3] : 1,
      }
    }

    const over = (top: Rgb, bottom: Rgb): Rgb => ({
      r: top.r * top.a + bottom.r * (1 - top.a),
      g: top.g * top.a + bottom.g * (1 - top.a),
      b: top.b * top.a + bottom.b * (1 - top.a),
      a: 1,
    })

    /** 조상 배경을 아래에서 위로 합성한다. 어디서도 불투명 배경을 못 만나면 흰색. */
    const backgroundOf = (element: Element): Rgb => {
      const layers: Rgb[] = []
      let node: Element | null = element
      while (node) {
        const color = parseColor(getComputedStyle(node).backgroundColor)
        if (color && color.a > 0) {
          layers.push(color)
          if (color.a >= 1) break
        }
        node = node.parentElement
      }
      let result: Rgb = { r: 255, g: 255, b: 255, a: 1 }
      for (let index = layers.length - 1; index >= 0; index -= 1) {
        result = over(layers[index], result)
      }
      return result
    }

    const channel = (value: number) => {
      const ratio = value / 255
      return ratio <= 0.03928
        ? ratio / 12.92
        : Math.pow((ratio + 0.055) / 1.055, 2.4)
    }

    const luminance = (color: Rgb) =>
      0.2126 * channel(color.r) +
      0.7152 * channel(color.g) +
      0.0722 * channel(color.b)

    const contrast = (a: Rgb, b: Rgb) => {
      const first = luminance(a)
      const second = luminance(b)
      const light = Math.max(first, second)
      const dark = Math.min(first, second)
      return (light + 0.05) / (dark + 0.05)
    }

    const format = (color: Rgb) =>
      `#${[color.r, color.g, color.b]
        .map(part => Math.round(part).toString(16).padStart(2, '0'))
        .join('')}`

    /*
      `opacity` 는 보지 않는다. 홈의 `Reveal` 래퍼가 뷰포트에 들어오기 전까지
      `opacity: 0` 이라, 스크롤 0 지점에서 opacity 를 걸러 내면 문서 대부분이
      측정에서 빠진다. 레이아웃과 색은 이미 확정돼 있으므로 배치(rect)와
      `visibility` 만으로 판정한다.
    */
    const isVisible = (element: Element) => {
      if (element.getClientRects().length === 0) return false
      return getComputedStyle(element).visibility !== 'hidden'
    }

    const directText = (element: Element) => {
      const parts: string[] = []
      element.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent?.trim()
          if (text) parts.push(text)
        }
      })
      return parts.join(' ')
    }

    /* ---- 문서 높이 · sticky 트랙 비중 ---- */
    const viewportHeight = window.innerHeight
    const docHeightPx = document.documentElement.scrollHeight
    const stickyTracks: { label: string; height: number }[] = []
    Array.from(main.children).forEach(child => {
      const hasSticky = [
        child,
        ...Array.from(child.querySelectorAll('*')),
      ].some(node => getComputedStyle(node).position === 'sticky')
      if (!hasSticky) return
      stickyTracks.push({
        label:
          child.getAttribute('aria-label') ??
          child.tagName.toLowerCase() +
            (child.className
              ? `.${String(child.className).split(' ')[0]}`
              : ''),
        height: Math.round(child.getBoundingClientRect().height),
      })
    })
    const stickyTrackPx = stickyTracks.reduce(
      (total, track) => total + track.height,
      0,
    )

    /* ---- 첫 화면 지표 ---- */
    const toScreen = (element: Element) =>
      (element.getBoundingClientRect().top + window.scrollY) / viewportHeight

    const headings = Array.from(document.querySelectorAll('h1'))
    const firstCta = Array.from(
      main.querySelectorAll('a[href="/analysis"]'),
    ).find(link => !link.hasAttribute('aria-label'))

    /* ---- 대비 · 글자 크기 ---- */
    const combinations = new Map<string, ContrastCombinationLocal>()
    type ContrastCombinationLocal = {
      foreground: string
      background: string
      fontSize: number
      fontWeight: number
      ratio: number
      threshold: number
      count: number
      sample: string
    }
    const fontSizes: Record<string, number> = {}
    let textElements = 0

    Array.from(main.querySelectorAll('*')).forEach(element => {
      if (!(element instanceof HTMLElement)) return
      const text = directText(element)
      if (!text || !isVisible(element)) return

      const style = getComputedStyle(element)
      const fontSize = Math.round(parseFloat(style.fontSize))
      const fontWeight = Number(style.fontWeight) || 400
      textElements += 1
      fontSizes[String(fontSize)] = (fontSizes[String(fontSize)] ?? 0) + 1

      const rawForeground = parseColor(style.color)
      if (!rawForeground) return
      const background = backgroundOf(element)
      const foreground = over(rawForeground, background)
      const ratio = Math.round(contrast(foreground, background) * 100) / 100
      const large = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700)
      const threshold = large ? 3 : 4.5
      const key = `${format(foreground)}|${format(background)}|${fontSize}|${fontWeight}`
      const existing = combinations.get(key)
      if (existing) {
        existing.count += 1
        return
      }
      combinations.set(key, {
        foreground: format(foreground),
        background: format(background),
        fontSize,
        fontWeight,
        ratio,
        threshold,
        count: 1,
        sample: text.slice(0, 24),
      })
    })

    const contrastFailureList = Array.from(combinations.values())
      .filter(entry => entry.ratio < entry.threshold)
      .sort((a, b) => a.ratio - b.ratio)

    const offScaleFontSizeList = Object.keys(fontSizes)
      .map(Number)
      .filter(size => !fontScale.includes(size))
      .sort((a, b) => a - b)

    /* ---- 터치 타깃 ---- */
    const smallTapTargetList: TapTargetLocal[] = []
    type TapTargetLocal = {
      tag: string
      label: string
      width: number
      height: number
    }
    Array.from(main.querySelectorAll('a, button, [role="button"]')).forEach(
      element => {
        if (!isVisible(element)) return
        const rect = element.getBoundingClientRect()
        if (Math.min(rect.width, rect.height) >= 44) return
        smallTapTargetList.push({
          tag: element.tagName.toLowerCase(),
          label: (
            element.getAttribute('aria-label') ??
            element.textContent?.trim() ??
            ''
          ).slice(0, 24),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        })
      },
    )

    /* ---- 종결형 ---- */
    const bodyText = main.innerText
    const countMatches = (pattern: RegExp) =>
      (bodyText.match(pattern) ?? []).length
    const sentenceEndings = {
      // 합니다체: 「…니다.」 / 해요체: 「…요.」 (감사 §3-F 와 같은 판정)
      formal: countMatches(/니다\s*[.!?]/g),
      polite: countMatches(/[가-힣]요\s*[.!?]/g),
    }

    const linkHrefs = Array.from(
      new Set(
        Array.from(main.querySelectorAll('a[href]')).map(
          link => link.getAttribute('href') ?? '',
        ),
      ),
    ).sort()

    return {
      viewport: { width: window.innerWidth, height: viewportHeight },
      docHeightPx,
      docHeightScreens: Math.round((docHeightPx / viewportHeight) * 100) / 100,
      stickyTrackPx,
      stickyTrackShare: Math.round((stickyTrackPx / docHeightPx) * 1000) / 1000,
      stickyTracks,
      h1Count: headings.length,
      h1Screen:
        headings.length > 0
          ? Math.round(toScreen(headings[0]) * 100) / 100
          : null,
      firstCtaScreen: firstCta
        ? Math.round(toScreen(firstCta) * 100) / 100
        : null,
      contrastCombinations: combinations.size,
      contrastFailures: contrastFailureList.length,
      contrastFailureList,
      smallTapTargets: smallTapTargetList.length,
      smallTapTargetList,
      textElements,
      fontSizes,
      offScaleFontSizes: offScaleFontSizeList.length,
      offScaleFontSizeList,
      sentenceEndings,
      horizontalOverflow:
        document.documentElement.scrollWidth > window.innerWidth + 1,
      linkHrefs,
    }
  }, FONT_SCALE)

export type HomeSession = {
  /** dev 오버레이·HMR 잡음을 뺀 콘솔 error 메시지. */
  consoleErrors: string[]
  /** 첫 페인트 이후 나간 BFF 호출 경로(쿼리 제외). */
  bffRequests: string[]
}

/** dev 서버·React 개발 도구가 늘 남기는 잡음. 회귀 신호가 아니다. */
const CONSOLE_NOISE = [
  'Download the React DevTools',
  'react-devtools',
  '[Fast Refresh]',
  'webpack-hmr',
  'HMR',
  'hot-reloader',
  'WebSocket connection',
  'ERR_CONNECTION',
  'Failed to load resource: net::ERR',
]

/**
 * 홈을 열고 레이아웃이 멎을 때까지 기다린다.
 *
 * 랭킹 섹션은 스켈레톤 → dual 로 바뀌며 문서 높이가 크게 달라지므로, 높이가
 * 연속으로 같아질 때까지 기다리지 않으면 지표가 매번 흔들린다.
 */
export const openHome = async (page: Page): Promise<HomeSession> => {
  const consoleErrors: string[] = []
  const bffRequests: string[] = []

  page.on('console', message => {
    if (message.type() !== 'error') return
    const text = message.text()
    if (CONSOLE_NOISE.some(noise => text.includes(noise))) return
    consoleErrors.push(text)
  })
  page.on('request', (request: Request) => {
    const url = new URL(request.url())
    if (!url.pathname.startsWith('/api/bff/')) return
    bffRequests.push(url.pathname)
  })

  await routeAnalysisRankings(page)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.locator('main').waitFor({ state: 'attached' })
  await page.evaluate(async () => {
    await document.fonts.ready
  })
  await waitForStableHeight(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(200)

  return { consoleErrors, bffRequests }
}

/** 문서 높이가 4회 연속(=약 800ms) 같으면 멎은 것으로 본다. */
const waitForStableHeight = async (page: Page) => {
  let previous = -1
  let stable = 0
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const height = await page.evaluate(
      () => document.documentElement.scrollHeight,
    )
    stable = height === previous ? stable + 1 : 0
    previous = height
    if (stable >= 4) return
    await page.waitForTimeout(200)
  }
  throw new Error('문서 높이가 안정되지 않았습니다.')
}
