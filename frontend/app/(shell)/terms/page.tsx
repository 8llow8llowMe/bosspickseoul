import type { Metadata } from 'next'
import LegalDocumentView from '@/components/legal/legal-document-view'
import { legalCopy } from '@/lib/legal/copy'
import { LEGAL_HREF } from '@/lib/legal/links'
import { termsOfService } from '@/lib/legal/terms-of-service'
import { createPageMetadata } from '@/lib/metadata'

/*
  **로그인 없이 열려야 한다.** 약관은 가입 전에 읽는 문서다. `middleware.ts` 의 보호 경로에 없으므로
  기본값이 공개다. 본문이 상수라 조회도 로딩 상태도 없다.
*/
export const metadata: Metadata = createPageMetadata({
  title: legalCopy.termsTitle,
  description: legalCopy.termsDescription,
  path: LEGAL_HREF.terms,
})

export default function Page() {
  return <LegalDocumentView doc={termsOfService} />
}
