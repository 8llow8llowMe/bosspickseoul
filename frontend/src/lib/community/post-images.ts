import { describeImageFileIssue } from '@/lib/upload/image-rules'
import type { CommunityPostImage } from '@/types/community'

/**
 * 게시글 한 건에 붙일 수 있는 최대 장수. 백엔드도 같은 값으로 막는다
 * (`file-upload-guide.md`: "최대 5장", 초과 시 `STORAGE_007`·`COMMUNITY_118`).
 */
export const MAX_POST_IMAGES = 5

export const POST_IMAGE_RULE_TEXT =
  '최대 5장까지, 장당 5MB 이하의 JPG · PNG · GIF · WEBP 만 올릴 수 있어요.'

/**
 * 수정 요청에 실을 키 목록을 만든다.
 *
 * ⚠️ **이 함수가 A4 에서 가장 중요하다.** `PATCH /community/posts/{id}` 의 `imageKeys` 는
 * 「수정 후 남길 목록」이고, 백엔드 `replaceImages` 는 이 목록에 없는 기존 이미지를
 * 연결 해제한 뒤 **파일까지 지운다.** 게다가 `normalize(null)` 이 빈 목록을 돌려주므로
 * 필드를 아예 빼고 보내는 것과 `[]` 를 보내는 것이 **같은 뜻**이다 — 둘 다 전부 삭제.
 *
 * 즉 제목 한 글자만 고쳐도 화면이 기존 키를 되돌려 보내지 않으면 사진이 사라진다.
 * 그래서 편집 화면은 상세 응답의 `images[].imageKey` 를 반드시 들고 있다가 다시 보낸다.
 */
export const toImageKeys = (images: CommunityPostImage[]): string[] =>
  images.map(image => image.imageKey)

/** 상세 응답의 이미지를 노출 순서대로 정렬한다. 서버 정렬을 믿지 않고 한 번 더 맞춘다. */
export const sortPostImages = (
  images: CommunityPostImage[] | null | undefined,
): CommunityPostImage[] =>
  [...(images ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)

export type PostImageSelection = {
  /** 실제로 올릴 파일들. 남은 자리를 넘긴 파일은 여기 없다. */
  accepted: File[]
  /** 사용자에게 보여 줄 거절 사유. 없으면 null. */
  error: string | null
}

/**
 * 고른 파일들 중 무엇을 올릴지 가른다.
 *
 * 남은 자리를 넘겨도 **앞의 몇 장은 살린다.** 전부 거절하면 사용자는 방금 고른 것을
 * 다시 고르면서 몇 장을 빼야 하는지 세어야 한다. 대신 **몇 장이 빠졌는지 반드시
 * 말한다** — 조용히 잘라 내면 올라간 줄 알았던 사진이 없다.
 */
export const selectPostImages = (
  files: File[],
  alreadyAttached: number,
): PostImageSelection => {
  const remaining = MAX_POST_IMAGES - alreadyAttached

  if (remaining <= 0) {
    return {
      accepted: [],
      error: `이미 ${MAX_POST_IMAGES}장을 첨부했어요. 지운 뒤에 다시 올려 주세요.`,
    }
  }

  const issues: string[] = []
  const valid = files.filter(file => {
    const issue = describeImageFileIssue(file)
    if (issue) {
      issues.push(`${file.name}: ${issue}`)
      return false
    }
    return true
  })

  const accepted = valid.slice(0, remaining)
  const droppedForCount = valid.length - accepted.length

  if (droppedForCount > 0) {
    issues.push(
      `최대 ${MAX_POST_IMAGES}장이라 ${droppedForCount}장은 올리지 않았어요.`,
    )
  }

  return { accepted, error: issues.length > 0 ? issues.join('\n') : null }
}
