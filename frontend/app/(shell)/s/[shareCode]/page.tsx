import { Suspense } from 'react'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import ShareEntryPage from '@/components/share/share-entry-page'
import { createPageMetadata } from '@/lib/metadata'
import {
  buildSharePreviewCopy,
  decideShareEntry,
  resolveShareTimeout,
  SHARE_PREVIEW_FALLBACK,
} from '@/lib/share/share-preview'
import {
  loadShareNames,
  loadShareResolution,
} from '@/lib/share/share-preview.server'

type PageProps = {
  params: Promise<{ shareCode: string }>
}

/** 같은 요청의 `generateMetadata`·`page` 가 같은 시간 제한으로 해석을 나눠 쓰게 UA 를 읽는다. */
const readRequest = async (params: PageProps['params']) => {
  const { shareCode } = await params
  const userAgent = (await headers()).get('user-agent')
  const timeoutMs = resolveShareTimeout(userAgent)
  const resolution = await loadShareResolution(shareCode, timeoutMs)
  return { shareCode, userAgent, timeoutMs, resolution }
}

/**
 * 공유 미리보기 제목·설명(share.md D4-1). 서버가 공유 코드를 해석해 「어느 상권·업종인지」를
 * 싣는다. 해석에 실패하거나 이름을 못 찾으면 고정 문구로 떨어진다(`buildSharePreviewCopy`).
 *
 * 307 로 보낼 사람에게는 이름을 조회하지 않는다 — 이 메타를 볼 일이 없고, 조회는 응답만 늦춘다.
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { shareCode, userAgent, timeoutMs, resolution } =
    await readRequest(params)
  const willRedirect =
    decideShareEntry(resolution, userAgent).kind === 'redirect'

  const copy =
    resolution.ok && !willRedirect
      ? buildSharePreviewCopy(
          resolution.shareType,
          resolution.payload,
          await loadShareNames(shareCode, timeoutMs),
        )
      : SHARE_PREVIEW_FALLBACK

  return createPageMetadata({
    title: copy.title,
    description: copy.description,
    path: `/s/${shareCode}`,
    index: false,
  })
}

/**
 * 사람은 서버에서 곧장 원래 화면으로 보낸다(307). 미리보기 봇과 해석 실패는 기존 클라이언트
 * 경로가 맡는다 — 봇에게는 위 메타를 읽힐 페이지가 필요하고, 실패 문구(만료·미존재·재시도)는
 * 클라이언트 화면에만 있다. 해석만 기다린다(사람 1.5초 상한, `SHARE_RESOLVE_TIMEOUT_MS`).
 * `redirect` 는 예외를 던지므로 try 밖에서 부른다.
 */
export default async function Page({ params }: PageProps) {
  const { shareCode, userAgent, resolution } = await readRequest(params)
  const decision = decideShareEntry(resolution, userAgent)

  if (decision.kind === 'redirect') redirect(decision.href)

  return (
    <Suspense fallback={null}>
      <ShareEntryPage shareCode={shareCode} />
    </Suspense>
  )
}
