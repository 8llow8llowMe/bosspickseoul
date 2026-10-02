/**
 * 약관·처리방침 **화면** 문구. 본문은 여기 없다 — `terms-of-service.ts` · `privacy-policy.ts` 에 있고
 * 합니다체다. 이 파일은 화면이 붙이는 라벨이라 다른 화면과 같은 해요체를 쓴다.
 */
export const legalCopy = {
  termsTitle: '이용약관',
  termsDescription: 'BossPickSeoul 서비스를 이용할 때 적용되는 약관이에요.',
  privacyTitle: '개인정보 처리방침',
  privacyDescription:
    'BossPickSeoul가 어떤 정보를 받고 어떻게 다루는지 알려드려요.',
  tocLabel: '목차',
  effectiveDateLabel: '시행일',
  historyLabel: '개정 이력',
  /** `제3조` — 목차와 조문 제목이 같은 말을 쓰게 한 곳에서 만든다 */
  articleLabel: (no: number) => `제${no}조`,
} as const
