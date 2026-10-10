import 'server-only'

import { cache } from 'react'

import { getConfiguredBackendApiUrl } from '@/lib/env.server'
import { isShareType } from './payload'
import {
  EMPTY_SHARE_PREVIEW_NAMES,
  isShareCodeFormat,
  isShareLinkExpired,
  listSharePreviewLookups,
  SHARE_RESOLVE_TIMEOUT_MS,
  type ServerShareResolution,
  type SharePreviewNames,
} from './share-preview'

/**
 * `/s/{shareCode}` 의 서버 조회(share.md D4-1). 전부 **인증 없는 공개 API** 다 —
 * 링크를 받은 사람과 미리보기 봇은 로그인 상태가 아니고, 백엔드도 이 셋에 `@PreAuthorize` 가 없다.
 * BFF(`/api/bff`)를 거치지 않는 이유는 `community-server.ts` 와 같다: 서버 컴포넌트에는 세션 쿠키를
 * 얹을 이유가 없고, 자기 자신에게 HTTP 를 한 번 더 태울 필요도 없다.
 *
 * **캐시(revalidate)** 는 크롤러 요청 비용을 묶는다. 같은 링크가 단체방에 퍼지면 미리보기 봇이
 * 몇 번이고 다시 긁는다.
 * - 해석(`GET /share-links/{code}`): 읽기 전용이고(백엔드 `@Transactional(readOnly = true)`) 코드의
 *   payload 는 바뀌지 않는다. 바뀌는 건 만료뿐이라 1시간 캐시하고, 캐시된 응답도 `expiresAt` 을
 *   다시 본다(`isShareLinkExpired`). 해석에 실패하면 클라이언트 경로가 BFF 로 **다시** 해석한다.
 * - 이름(상권·행정동): 행정 경계 데이터라 하루 캐시한다.
 *
 * 해석과 이름 조회는 **따로 묶는다**(맨 아래 `loadShareResolution` / `loadShareNames`). 사람에게 보내는
 * 307 은 해석만 기다리면 된다 — 이름까지 기다리면 콜드 캐시에서 빈 화면이 길어진다.
 */

const SHARE_RESOLVE_REVALIDATE_SECONDS = 60 * 60
const REGION_NAME_REVALIDATE_SECONDS = 60 * 60 * 24
/** 이름 조회 시간 제한. 이름은 봇의 미리보기 문구에만 쓰이므로 봇 기준이다. */
const NAME_FETCH_TIMEOUT_MS = SHARE_RESOLVE_TIMEOUT_MS.bot

type FetchResponse = Pick<Response, 'ok' | 'json'>
export type SharePreviewFetcher = (
  input: string,
  init: RequestInit & { next?: { revalidate?: number } },
) => Promise<FetchResponse>

const defaultFetcher: SharePreviewFetcher = (input, init) => fetch(input, init)

/** `{ dataHeader: { success: true }, dataBody }` 에서 본문만 꺼낸다. 아니면 null. */
const readSuccessBody = (value: unknown): unknown => {
  if (!value || typeof value !== 'object') return null
  const response = value as {
    dataHeader?: { success?: unknown }
    dataBody?: unknown
  }
  return response.dataHeader?.success === true
    ? (response.dataBody ?? null)
    : null
}

/** 공개 API 의 성공 본문. 백엔드 주소가 없거나 실패·시간 초과면 null 이다. OG 이미지 조회도 쓴다. */
export const getJson = async (
  path: string,
  { revalidate, timeoutMs }: { revalidate: number; timeoutMs: number },
  fetcher: SharePreviewFetcher,
): Promise<unknown> => {
  const backendApiUrl = getConfiguredBackendApiUrl()
  if (!backendApiUrl) return null

  try {
    const response = await fetcher(`${backendApiUrl}/api/v1${path}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      next: { revalidate },
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!response.ok) return null
    return readSuccessBody(await response.json())
  } catch {
    return null
  }
}

export type ResolveShareLinkOptions = {
  fetcher?: SharePreviewFetcher
  timeoutMs?: number
  /** 만료 판정 기준 시각(ms). 테스트용. */
  now?: number
}

/**
 * 공유 코드를 서버에서 해석한다. 만료·미존재·통신 실패·형식 오류를 나누지 않는다 —
 * 어느 쪽이든 서버는 고정 문구를 쓰고, 화면 문구는 클라이언트 경로가 정한다.
 */
export const resolveShareLinkOnServer = async (
  shareCode: string,
  {
    fetcher = defaultFetcher,
    timeoutMs = SHARE_RESOLVE_TIMEOUT_MS.human,
    now,
  }: ResolveShareLinkOptions = {},
): Promise<ServerShareResolution> => {
  if (!isShareCodeFormat(shareCode)) return { ok: false }

  const body = await getJson(
    `/share-links/${shareCode}`,
    { revalidate: SHARE_RESOLVE_REVALIDATE_SECONDS, timeoutMs },
    fetcher,
  )
  if (!body || typeof body !== 'object') return { ok: false }

  const { shareType, payload, expiresAt } = body as {
    shareType?: { code?: unknown } | null
    payload?: unknown
    expiresAt?: unknown
  }
  if (isShareLinkExpired(expiresAt, now)) return { ok: false }

  const code = typeof shareType?.code === 'string' ? shareType.code : null
  return { ok: true, shareType: code, payload }
}

const readName = (value: unknown, key: string): string | null => {
  if (!value || typeof value !== 'object') return null
  const name = (value as Record<string, unknown>)[key]
  return typeof name === 'string' && name.trim() ? name.trim() : null
}

const NAME_FETCH = {
  revalidate: REGION_NAME_REVALIDATE_SECONDS,
  timeoutMs: NAME_FETCH_TIMEOUT_MS,
}

/** `GET /regions/commercials/{code}/administration` — 상권·행정동·자치구 이름을 한 번에 준다. */
const fetchCommercialRegion = (code: string, fetcher: SharePreviewFetcher) =>
  getJson(
    `/regions/commercials/${encodeURIComponent(code)}/administration`,
    NAME_FETCH,
    fetcher,
  )

/** `GET /regions/districts/{d}/administrations` 목록에서 행정동 이름을 찾는다. */
const fetchAdministrationName = async (
  districtCode: string,
  administrationCode: string,
  fetcher: SharePreviewFetcher,
): Promise<string | null> => {
  const body = await getJson(
    `/regions/districts/${encodeURIComponent(districtCode)}/administrations`,
    NAME_FETCH,
    fetcher,
  )
  if (!Array.isArray(body)) return null
  const matched = body.find(
    item => readName(item, 'administrationCode') === administrationCode,
  )
  return readName(matched, 'administrationName')
}

/**
 * 미리보기 문구에 필요한 이름을 모은다. 실패한 조회는 null 로 남기고 문구가 알아서 줄인다.
 *
 * 비교는 상권 2개를 **병렬**로 부른다. 루프 안 단건 호출이지만 상한이 2라(`listSharePreviewLookups`)
 * 목록 조회로 바꿀 이득이 없고, 그런 벌크 API 도 없다.
 */
export const fetchSharePreviewNames = async (
  resolution: ServerShareResolution,
  fetcher: SharePreviewFetcher = defaultFetcher,
): Promise<SharePreviewNames> => {
  if (
    !resolution.ok ||
    !isShareType(resolution.shareType) ||
    !resolution.payload ||
    typeof resolution.payload !== 'object' ||
    Array.isArray(resolution.payload)
  ) {
    return EMPTY_SHARE_PREVIEW_NAMES
  }

  const lookups = listSharePreviewLookups(
    resolution.shareType,
    resolution.payload as Record<string, string | string[]>,
  )

  if (lookups.administration) {
    const administrationName = await fetchAdministrationName(
      lookups.administration.districtCode,
      lookups.administration.administrationCode,
      fetcher,
    )
    return { ...EMPTY_SHARE_PREVIEW_NAMES, administrationName }
  }

  const regions = await Promise.all(
    lookups.commercialCodes.map(code => fetchCommercialRegion(code, fetcher)),
  )
  const first = regions[0]
  return {
    districtName: readName(first, 'districtName'),
    administrationName: readName(first, 'administrationName'),
    commercialNames: regions.map(region => readName(region, 'commercialName')),
  }
}

/**
 * 한 요청 안에서 `generateMetadata` 와 `page` 가 해석 결과를 **나눠 쓴다.**
 *
 * fetch 에 `signal`(시간 제한)을 넘기면 Next 의 fetch 중복 제거가 꺼진다
 * (`node_modules/next/dist/server/lib/dedupe-fetch.js`). 그래서 React `cache` 로 묶는다 —
 * 데이터 캐시(revalidate)는 그대로 살아 있다. 시간 제한은 UA 로 정해지므로 같은 요청에서는 인자가 같다.
 */
export const loadShareResolution = cache(
  (shareCode: string, timeoutMs: number) =>
    resolveShareLinkOnServer(shareCode, { timeoutMs }),
)

/** 이름 조회. `generateMetadata` 만 부른다 — 307 을 받을 사람은 기다리지 않는다. */
export const loadShareNames = cache(
  async (shareCode: string, timeoutMs: number) =>
    fetchSharePreviewNames(await loadShareResolution(shareCode, timeoutMs)),
)
