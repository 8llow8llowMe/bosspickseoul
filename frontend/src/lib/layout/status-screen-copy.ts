/*
  없는 주소 · 렌더 오류 화면 문구 (docs/features/layout/error-screens.md).
  오류 원인(message · digest)은 사용자에게 보이지 않으므로 여기에 오류 문구가 늘어나지 않는다.
*/
export const statusScreenCopy = {
  notFoundTitle: '찾는 페이지가 없어요',
  notFoundDescription: '주소가 바뀌었거나 페이지가 삭제되었을 수 있어요.',
  notFoundMetaTitle: '페이지를 찾을 수 없어요',
  errorTitle: '화면을 불러오지 못했어요',
  errorDescription: '일시적인 문제일 수 있어요. 잠시 뒤에 다시 시도해 주세요.',
  analysisAction: '상권 분석하러 가기',
  homeAction: '홈으로',
  retryAction: '다시 시도',
} as const
