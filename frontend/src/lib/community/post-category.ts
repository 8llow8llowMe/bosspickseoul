import type {
  CommunityMetadata,
  CommunityPostCategoryCode,
} from '@/types/community'

export type { CommunityPostCategoryCode }

/*
  게시글 말머리(#529, BE #470 — backend/docs/frontend-api-usage-guide.md 「게시글 말머리」).
  글쓰기 말머리 칩·목록 필터 칩이 이 표를 쓴다. 순서가 곧 칩 순서다. 표시명은 BE `name` 과
  글자까지 같다 — 칩 문구와 배지(`category.name`)가 한 화면에서 갈리지 않는다.
*/
export const COMMUNITY_POST_CATEGORY_LABELS: Record<
  CommunityPostCategoryCode,
  string
> = {
  QUESTION: '질문',
  EXPERIENCE: '경험 공유',
  TOGETHER: '같이 해요',
  NEWS: '동네 소식',
}

export const COMMUNITY_POST_CATEGORIES = (
  ['QUESTION', 'EXPERIENCE', 'TOGETHER', 'NEWS'] as const
).map(value => ({ value, label: COMMUNITY_POST_CATEGORY_LABELS[value] }))

/**
 * URL·임시 저장본 값 → 말머리. 대문자 정확 일치만 받는다. 서버는 대소문자를 가리지 않지만 모르는 값은
 * `400 COMMUNITY_017` 로 막으므로, 손으로 고친 주소가 오류 화면이 되지 않게 「말머리 없음(전체)」으로 돌린다.
 */
export const parseCommunityPostCategory = (
  value: unknown,
): CommunityPostCategoryCode | null =>
  COMMUNITY_POST_CATEGORIES.find(category => category.value === value)?.value ??
  null

/**
 * 응답 말머리 → 분기용 code. 응답 code 는 `string` 이라 BE 가 값을 더할 수 있다 — 모르는 code 는
 * 「말머리 없음」으로 본다. 배지는 이 함수가 아니라 `category.name` 을 그대로 쓴다.
 */
export const getCommunityPostCategoryCode = (
  category: CommunityMetadata | undefined,
): CommunityPostCategoryCode | null =>
  parseCommunityPostCategory(category?.code)
