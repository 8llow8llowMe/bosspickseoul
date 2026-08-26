import type { ApiResponse } from '@/types/api'
import type { SharePayload, ShareTypeMetadata } from '@/lib/share/payload'

/** `POST /api/v1/share-links` 응답 본문. */
export type ShareLinkCreateBody = {
  shareCode: string
  shareType: ShareTypeMetadata
  expiresAt: string
}

export type ShareLinkCreateResponse = ApiResponse<ShareLinkCreateBody>

/** `GET /api/v1/share-links/{shareCode}` 응답 본문. */
export type ShareLinkResolveBody = {
  shareType: ShareTypeMetadata
  payload: SharePayload
  createdAt: string
  expiresAt: string
}

export type ShareLinkResolveResponse = ApiResponse<ShareLinkResolveBody>
