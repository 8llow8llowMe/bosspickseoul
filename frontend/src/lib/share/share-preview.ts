/**
 * `/s/{shareCode}` 의 **서버 쪽 판단**(share.md D4-1). 순수 함수만 둔다.
 *
 * - 미리보기 문구: 카카오톡·슬랙 미리보기에 「어느 상권·업종인지」가 실려야 받은 사람이 연다.
 *   payload 에는 코드만 있으므로(`payload.ts`) 이름은 호출부가 따로 찾아 `SharePreviewNames` 로 넘긴다.
 * - 진입 분기: 사람은 서버에서 곧장 원래 화면으로 보낸다(클라이언트 왕복 1회 감소).
 *   **링크 미리보기 봇은 보내지 않는다** — 봇이 307 을 따라가면 도착한 화면의 일반 메타
 *   (「상권 분석 결과」)를 읽어 이 파일이 만든 문구가 버려진다.
 *
 * 네트워크는 `share-preview.server.ts` 가 맡는다. 이 파일은 테스트가 입력만으로 고정할 수 있게 둔다.
 */

import { findSimulationCategoryByCode } from '@/data/simulation-catalog'
import { districts } from '@/data/districts'
import { formatPeriodCode } from '@/lib/analysis/presentation'
import { isShareType, type SharePayload, type ShareType } from './payload'
import { buildShareRoute } from './routes'
import { EXTRA_LINK_PREVIEW_BOTS_SOURCE } from './link-preview-bots'

/** 해석 실패·만료·미지원일 때의 고정 문구. 예전 `/s/{shareCode}` 의 문구 그대로다. */
export const SHARE_PREVIEW_FALLBACK = {
  title: '공유된 분석 화면',
  description: '공유받은 상권 분석 화면을 엽니다.',
} as const

export type SharePreviewCopy = { title: string; description: string }

/** 서버 해석 결과. 실패 이유는 나누지 않는다 — 실패 화면 문구는 클라이언트 경로가 정한다. */
export type ServerShareResolution =
  { ok: true; shareType: string | null; payload: unknown } | { ok: false }

/** 이름 조회 결과. 못 찾은 값은 null 이고, 문구는 있는 만큼만 만든다. */
export type SharePreviewNames = {
  districtName: string | null
  administrationName: string | null
  /** 비교는 두 개, 그 외는 하나다. 순서는 payload 순서와 같다. */
  commercialNames: (string | null)[]
}

export const EMPTY_SHARE_PREVIEW_NAMES: SharePreviewNames = {
  districtName: null,
  administrationName: null,
  commercialNames: [],
}

const readString = (payload: SharePayload, key: string): string | null => {
  const value = payload[key]
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

const readList = (payload: SharePayload, key: string): string[] => {
  const value = payload[key]
  if (!Array.isArray(value)) return []
  return value
    .map(item => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
}

const toPayload = (payload: unknown): SharePayload | null =>
  typeof payload === 'object' && payload !== null && !Array.isArray(payload)
    ? (payload as SharePayload)
    : null

/** 업종 이름. 추천·비교 화면과 같은 정적 카탈로그를 쓴다 — 서버 호출이 필요 없다. */
export const findShareServiceName = (
  serviceCode: string | null,
): string | null =>
  serviceCode
    ? (findSimulationCategoryByCode(serviceCode)?.item.name ?? null)
    : null

/** 자치구 이름. 25개 정적 목록이라 서버 호출이 필요 없다. */
export const findShareDistrictName = (
  districtCode: string | null,
): string | null =>
  districtCode
    ? (districts.find(district => String(district.gooCode) === districtCode)
        ?.gooName ?? null)
    : null

/** `20261` → `2026년 1분기`. 형식이 틀리면 null 이라 제목에서 괄호째 뺀다. */
const readPeriodLabel = (payload: SharePayload): string | null => {
  const periodCode = readString(payload, 'periodCode')
  if (!periodCode || !/^\d{4}[1-4]$/.test(periodCode)) return null
  return formatPeriodCode(periodCode)
}

const join = (parts: (string | null)[], separator = ' '): string =>
  parts.filter((part): part is string => Boolean(part)).join(separator)

const withPeriod = (title: string, period: string | null): string =>
  period ? `${title} (${period})` : title

/**
 * 이름을 조회해야 하는 코드 목록. 서버 모듈이 이걸 보고 필요한 만큼만 부른다.
 *
 * 비교도 상권은 최대 2개다(`COMPARE_MAX_COMMERCIALS`) — 크롤러 한 번에 조회는 많아야 2건이다.
 */
export const listSharePreviewLookups = (
  shareType: ShareType,
  payload: SharePayload,
): {
  commercialCodes: string[]
  administration: { districtCode: string; administrationCode: string } | null
} => {
  switch (shareType) {
    case 'COMMERCIAL_ANALYSIS':
    case 'AI_REPORT': {
      const commercialCode = readString(payload, 'commercialCode')
      return {
        commercialCodes: commercialCode ? [commercialCode] : [],
        administration: null,
      }
    }
    case 'COMMERCIAL_COMPARISON':
      return {
        commercialCodes: readList(payload, 'commercialCodes').slice(0, 2),
        administration: null,
      }
    case 'ADMINISTRATION_ANALYSIS': {
      const districtCode = readString(payload, 'districtCode')
      const administrationCode = readString(payload, 'administrationCode')
      return {
        commercialCodes: [],
        administration:
          districtCode && administrationCode
            ? { districtCode, administrationCode }
            : null,
      }
    }
    default:
      return { commercialCodes: [], administration: null }
  }
}

/**
 * 미리보기 제목·설명을 만든다. 핵심 이름(상권·행정동)이 없으면 고정 문구로 떨어진다
 * — 「 · 커피-음료 상권분석」처럼 앞이 빈 제목은 고정 문구보다 못하다.
 *
 * 문구 규칙: 변수 바로 뒤에 조사를 붙이지 않는다(받침에 따라 틀린다). 고정 낱말 뒤에만 붙인다.
 */
export const buildSharePreviewCopy = (
  shareTypeCode: string | null | undefined,
  rawPayload: unknown,
  names: SharePreviewNames,
): SharePreviewCopy => {
  const payload = toPayload(rawPayload)
  if (!isShareType(shareTypeCode) || !payload) return SHARE_PREVIEW_FALLBACK

  const districtName =
    names.districtName ??
    findShareDistrictName(readString(payload, 'districtCode'))
  const serviceName = findShareServiceName(readString(payload, 'serviceCode'))
  const period = readPeriodLabel(payload)
  const area = join([districtName, names.administrationName])

  switch (shareTypeCode) {
    case 'COMMERCIAL_ANALYSIS':
    case 'AI_REPORT': {
      const commercialName = names.commercialNames[0] ?? null
      if (!commercialName) return SHARE_PREVIEW_FALLBACK
      const subject = shareTypeCode === 'AI_REPORT' ? 'AI 리포트' : '상권분석'
      const head = join([commercialName, serviceName], ' · ')
      return {
        title: withPeriod(`${head} ${subject}`, period),
        description:
          shareTypeCode === 'AI_REPORT'
            ? `${join([area, commercialName])} 상권을 AI가 정리한 리포트를 확인해 보세요.`
            : `${join([area, commercialName])} 상권의 ${join([serviceName, '매출·유동인구·점포'])} 지표를 확인해 보세요.`,
      }
    }
    case 'COMMERCIAL_COMPARISON': {
      const [left, right] = names.commercialNames
      if (!left || !right) return SHARE_PREVIEW_FALLBACK
      return {
        title: join([`${left} vs ${right}`, serviceName], ' · ') + ' 상권 비교',
        description: `${join([area, '두 상권의', serviceName, '매출·유동인구'])} 지표를 나란히 비교해 보세요.`,
      }
    }
    case 'ADMINISTRATION_ANALYSIS': {
      if (!names.administrationName || !districtName)
        return SHARE_PREVIEW_FALLBACK
      return {
        title: `${area} 상권 탐색`,
        description: '이 행정동 안의 상권을 지도에서 골라 분석해 보세요.',
      }
    }
    default:
      return SHARE_PREVIEW_FALLBACK
  }
}

/**
 * 링크 미리보기 봇. **Next 의 HTML-limited 봇 목록**(`next/dist/shared/lib/router/utils/html-bots.js`)
 * 에서 미리보기·검색 봇을 옮기고, 그 목록에 없는 국내 미리보기 봇(카카오톡 `kakaotalk-scrap`,
 * 다음 `Daum`·`daumoa`)과 텔레그램을 더했다(`link-preview-bots.ts` — `next.config.ts` 의 `htmlLimitedBots`
 * 와 같은 값). 라인은 사람 인앱 브라우저 UA 에도 `Line/` 가 붙어 뺐다. 이 함수가 Next 내부 경로를
 * import 하지 않는 이유는 공개 API 가 아니라 버전마다 바뀔 수 있어서다.
 */
const LINK_PREVIEW_BOT_RE = new RegExp(
  `${EXTRA_LINK_PREVIEW_BOTS_SOURCE}|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|bitlybot|redditbot|vkShare|quora link preview|tumblr|applebot|Bingbot|BingPreview|Googlebot|[\\w-]+-Google|Google-[\\w-]+|DuckDuckBot|yandex|baiduspider`,
  'i',
)

export const isLinkPreviewBot = (userAgent: string | null | undefined) =>
  Boolean(userAgent) && LINK_PREVIEW_BOT_RE.test(userAgent as string)

/**
 * 서버 해석 시간 제한.
 *
 * - **사람 1.5초**: 해석이 끝나야 307 이 나가고, 그동안 화면은 비어 있다. 실패해도 클라이언트 경로가
 *   BFF 로 다시 해석하므로 서버에서 오래 기다릴 이득이 없다 — 기다린 만큼 빈 화면만 길어진다.
 * - **봇 3초**: 봇은 이 요청이 미리보기의 전부다. 늦으면 고정 문구 카드가 되므로 조금 더 기다린다.
 */
export const SHARE_RESOLVE_TIMEOUT_MS = { human: 1500, bot: 3000 } as const

export const resolveShareTimeout = (userAgent: string | null | undefined) =>
  isLinkPreviewBot(userAgent)
    ? SHARE_RESOLVE_TIMEOUT_MS.bot
    : SHARE_RESOLVE_TIMEOUT_MS.human

export { isShareCodeFormat } from './share-code'

/** 백엔드 `LocalDateTime` 은 오프셋이 없다. 서비스 시간대(KST)로 읽는다. */
const KST_OFFSET = '+09:00'

/**
 * `expiresAt` 이 지났는가. 캐시된 성공 응답(revalidate 1시간)도 만료 경계를 지키게 한다.
 * 읽을 수 없는 값이면 false — 판단 근거가 없을 때는 백엔드 응답(성공)을 믿는다.
 */
export const isShareLinkExpired = (
  expiresAt: unknown,
  now: number = Date.now(),
): boolean => {
  if (typeof expiresAt !== 'string') return false
  const match =
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/.exec(
      expiresAt.trim(),
    )
  if (!match) return false
  // 백엔드는 나노초(9자리)까지 준다. Date 는 밀리초까지만 읽으므로 3자리로 자른다.
  const fraction = match[2] ? match[2].slice(0, 4) : ''
  const time = Date.parse(`${match[1]}${fraction}${match[3] ?? KST_OFFSET}`)
  return Number.isFinite(time) && time <= now
}

export type ShareEntryDecision =
  | { kind: 'redirect'; href: string }
  /** 미리보기 봇이거나 해석·복원에 실패했다. 기존 클라이언트 화면이 이어받는다. */
  | { kind: 'render' }

/**
 * 진입 분기. 사람이고 복원 URL 이 나오면 서버에서 보낸다. 그 밖은 전부 기존 클라이언트
 * 경로(`ShareEntryPage`)가 맡는다 — 만료(410)·미존재(404) 문구와 재시도는 그쪽에만 있다.
 */
export const decideShareEntry = (
  resolution: ServerShareResolution,
  userAgent: string | null | undefined,
): ShareEntryDecision => {
  if (!resolution.ok || isLinkPreviewBot(userAgent)) return { kind: 'render' }

  const route = buildShareRoute(resolution.shareType, resolution.payload)
  return route.ok ? { kind: 'redirect', href: route.href } : { kind: 'render' }
}
