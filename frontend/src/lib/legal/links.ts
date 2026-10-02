import { legalCopy } from '@/lib/legal/copy'

/**
 * 문서별 경로. **목록과 따로 노출한다** — 가입 동의 문구 같은 곳이 「이용약관」 하나만 가리켜야 할 때
 * 목록에서 인덱스나 라벨 비교로 고르면 문서를 하나 더 추가하는 순간 조용히 다른 곳을 가리킨다.
 */
export const LEGAL_HREF = {
  terms: '/terms',
  privacy: '/privacy',
} as const

/** 푸터가 쓰는 링크 목록. 라벨은 문서 제목 그 자체라 `legalCopy` 에서 가져온다. */
export const LEGAL_LINKS = [
  { href: LEGAL_HREF.terms, label: legalCopy.termsTitle },
  { href: LEGAL_HREF.privacy, label: legalCopy.privacyTitle },
] as const
