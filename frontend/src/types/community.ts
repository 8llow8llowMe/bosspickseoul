export type CommunityCategoryValue =
  | ''
  | 'ETC'
  | 'INTERIOR'
  | 'COMMERCIAL_AREA'
  | 'PARTNERSHIP'
  | 'START_UP'

export type CommunityImage = {
  imageId: number | null
  url: string
}

export type CommunityListItem = {
  communityId: number
  category: Exclude<CommunityCategoryValue, ''> | string
  title: string
  content: string
  image: string | null
  writerId: number
  profileImage: string | null
  writerNickname: string
  readCount: number
  commentCount: number
  createdAt?: string | null
}

export type CommunityDetail = {
  communityId: number
  category: Exclude<CommunityCategoryValue, ''> | string
  title: string
  content: string
  writerNickname: string
  readCount: number
  commentCount: number
  writerId: number
  writerProfileImage: string | null
  createdAt: string
  images: CommunityImage[]
}

export type CommunityCreatePayload = {
  category: Exclude<CommunityCategoryValue, ''> | string
  title: string
  content: string
  images: string[]
}

export type CommunityUpdatePayload = {
  title: string
  content: string
  images: CommunityImage[]
}

export type CommunityComment = {
  commentId: number
  content: string
  createdAt: string
  writerId: number
  writerNickname: string
  writerProfileImage: string | null
}

export type CommunityCommentPayload = {
  content: string
}
