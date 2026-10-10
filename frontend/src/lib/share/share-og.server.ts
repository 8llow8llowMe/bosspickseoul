import 'server-only'

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { CommercialBenchmark } from '@/types/commercial-analysis'
import {
  buildShareOgCard,
  createGlyphChecker,
  readShareOgLookup,
  type ShareOgCard,
} from './share-og'
import { SHARE_RESOLVE_TIMEOUT_MS } from './share-preview'
import {
  getJson,
  resolveShareLinkOnServer,
  type SharePreviewFetcher,
} from './share-preview.server'

/**
 * `/s/{shareCode}/opengraph-image` 의 서버 조회와 폰트(share.md D4-2, #598).
 *
 * **조회는 두 건**이다 — 공유 해석(`GET /share-links/{code}`, 1시간 캐시)과 상권 지표
 * (`GET /commercials/{code}/benchmarks`). 지표 응답에 상권·행정동·자치구 이름이 함께 와서 이름을
 * 따로 찾지 않는다. 둘 다 인증 없는 공개 API 다.
 *
 * 지표는 **하루 캐시**한다. 분기 단위로 적재되는 데이터이고, 같은 링크가 단체방에 퍼지면 미리보기
 * 봇이 몇 번이고 다시 긁는다. 캐시 키는 URL(상권·업종·분기)이라 다른 공유 코드끼리도 나눠 쓴다.
 *
 * 어떤 실패도 던지지 않고 null 이다. 이미지 라우트는 null 이면 루트 OG 이미지를 그린다 — 크롤러에
 * 500 을 주면 카드가 이미지 없이 붙는다.
 */

const SHARE_METRIC_REVALIDATE_SECONDS = 60 * 60 * 24
/**
 * 해석 + 지표 **전체** 시간 예산. 둘은 순차라 각각 봇 기준(3초)을 주면 최악 6초다 — 미리보기 봇은
 * 그보다 먼저 포기하고 이미지 없는 카드를 붙인다. 해석은 예산 안에서 봇 기준까지, 지표는 남은 시간만
 * 기다리고, 남은 시간이 없으면 기본 이미지로 간다.
 */
export const SHARE_OG_FETCH_BUDGET_MS = 4000
const RESOLVE_TIMEOUT_MS = Math.min(
  SHARE_RESOLVE_TIMEOUT_MS.bot,
  SHARE_OG_FETCH_BUDGET_MS,
)

/**
 * OG 폰트 위치. `public/` 아래 두는 이유: 배포 이미지(`frontend-web.Dockerfile`)가 `public/` 을
 * 작업 디렉터리 아래로 통째로 복사하고, `next start` 도 같은 cwd 에서 돈다. `src/` 아래 두면
 * standalone 추적(outputFileTracingIncludes)을 따로 맞춰야 한다.
 */
const FONT_DIR = join(process.cwd(), 'public', 'fonts')

export type ShareOgFont = {
  name: string
  data: ArrayBuffer
  weight: 400 | 700
  style: 'normal'
}

const toArrayBuffer = (buffer: Buffer): ArrayBuffer =>
  buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer

let fontsPromise: Promise<ShareOgFont[]> | null = null
let glyphCheckerPromise: Promise<(char: string) => boolean> | null = null

/** 정적 WOFF1 두 벌(Regular·Bold). 프로세스당 한 번 읽는다. */
export const loadShareOgFonts = (): Promise<ShareOgFont[]> => {
  fontsPromise ??= Promise.all([
    readFile(join(FONT_DIR, 'og', 'BPSSans-Regular.woff')),
    readFile(join(FONT_DIR, 'og', 'BPSSans-Bold.woff')),
  ]).then(([regular, bold]) => [
    {
      name: 'BPS Sans',
      data: toArrayBuffer(regular),
      weight: 400,
      style: 'normal',
    },
    {
      name: 'BPS Sans',
      data: toArrayBuffer(bold),
      weight: 700,
      style: 'normal',
    },
  ])
  // 실패한 읽기를 붙잡아 두지 않는다 — 다음 요청이 다시 시도한다.
  fontsPromise.catch(() => {
    fontsPromise = null
  })
  return fontsPromise
}

/** 폰트 문자 집합(`charset.txt` — 서브셋의 원천 목록과 같은 파일). */
const loadGlyphChecker = () => {
  glyphCheckerPromise ??= readFile(join(FONT_DIR, 'charset.txt'), 'utf8').then(
    createGlyphChecker,
  )
  glyphCheckerPromise.catch(() => {
    glyphCheckerPromise = null
  })
  return glyphCheckerPromise
}

const defaultFetcher: SharePreviewFetcher = (input, init) => fetch(input, init)

export type LoadShareOgCardOptions = {
  fetcher?: SharePreviewFetcher
  hasGlyph?: (char: string) => boolean
  /** 시계. 테스트용. */
  now?: () => number
}

/** 카드 모델. 해석 실패·미지원 유형·지표 없음·폰트 밖 글자·통신 오류는 전부 null. */
export const loadShareOgCard = async (
  shareCode: string,
  {
    fetcher = defaultFetcher,
    hasGlyph,
    now = Date.now,
  }: LoadShareOgCardOptions = {},
): Promise<ShareOgCard | null> => {
  const deadline = now() + SHARE_OG_FETCH_BUDGET_MS
  try {
    const resolution = await resolveShareLinkOnServer(shareCode, {
      fetcher,
      timeoutMs: RESOLVE_TIMEOUT_MS,
    })
    const lookup = readShareOgLookup(resolution)
    if (!lookup) return null

    const remainingMs = deadline - now()
    if (remainingMs <= 0) return null

    const params = new URLSearchParams({
      serviceCode: lookup.serviceCode,
      periodCode: lookup.periodCode,
    })
    const [benchmark, checker] = await Promise.all([
      getJson(
        `/commercials/${encodeURIComponent(lookup.commercialCode)}/benchmarks?${params}`,
        {
          revalidate: SHARE_METRIC_REVALIDATE_SECONDS,
          timeoutMs: remainingMs,
        },
        fetcher,
      ),
      hasGlyph ?? loadGlyphChecker(),
    ])
    if (!benchmark || typeof benchmark !== 'object') return null

    return buildShareOgCard(lookup, benchmark as CommercialBenchmark, checker)
  } catch {
    return null
  }
}
