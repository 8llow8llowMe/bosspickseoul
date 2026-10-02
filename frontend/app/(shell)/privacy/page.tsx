import type { Metadata } from 'next'
import LegalDocumentView from '@/components/legal/legal-document-view'
import { legalCopy } from '@/lib/legal/copy'
import { LEGAL_HREF } from '@/lib/legal/links'
import { privacyPolicy } from '@/lib/legal/privacy-policy'
import { createPageMetadata } from '@/lib/metadata'

/* 이용약관과 같다 — 로그인 없이 열리고, 본문이 상수라 조회가 없다. */
export const metadata: Metadata = createPageMetadata({
  title: legalCopy.privacyTitle,
  description: legalCopy.privacyDescription,
  path: LEGAL_HREF.privacy,
})

export default function Page() {
  return <LegalDocumentView doc={privacyPolicy} />
}
