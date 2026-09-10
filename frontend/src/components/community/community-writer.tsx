'use client'

import styled from 'styled-components'

import {
  formatCommunityWriter,
  getCommunityWriterInitial,
} from '@/lib/community'

export type CommunityWriterSize = 'sm' | 'md'

export type CommunityWriterProps = {
  /** 백엔드 `writerNickname`. null 이면 대체 문구를 적는다. */
  nickname: string | null | undefined
  /** 백엔드 `writerProfileImageUrl`. null 이면 이니셜 아바타다. */
  profileImageUrl: string | null | undefined
  /** `sm` 은 목록·댓글(24px), `md` 는 글 상세 머리(32px). */
  size?: CommunityWriterSize
}

const AVATAR_SIZE: Record<CommunityWriterSize, number> = {
  sm: 24,
  md: 32,
}

const Root = styled.span<{ $size: CommunityWriterSize }>`
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: ${props => (props.$size === 'md' ? '10px' : '8px')};
`

/*
  헤더·프로필의 `Avatar` 와 같은 그리기 규칙이다 — 이미지가 있으면 배경으로 덮고,
  없으면 muted 면 위에 첫 글자. `img` 를 쓰지 않는 이유도 같다: MinIO·소셜 URL 은
  `next/image` 원격 호스트 등록 대상이 아니고, 깨진 이미지 아이콘 대신 이니셜로
  조용히 내려앉는 편이 낫다.
*/
const Avatar = styled.span<{
  $image: string | null
  $size: CommunityWriterSize
}>`
  width: ${props => AVATAR_SIZE[props.$size]}px;
  height: ${props => AVATAR_SIZE[props.$size]}px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: ${props =>
    props.$image
      ? `url(${props.$image}) center / cover no-repeat`
      : 'var(--color-surface-muted)'};
  color: var(--color-text-700);
  font-size: ${props => (props.$size === 'md' ? '13px' : '11px')};
  font-weight: 700;
  line-height: 1;
`

const Name = styled.span`
  min-width: 0;
  overflow: hidden;
  color: var(--color-text-700);
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
`

/**
 * 게시글·댓글의 작성자 한 줄(아바타 + 닉네임).
 *
 * 판단하지 않는다 — 백엔드가 준 닉네임을 그대로 적고, 탈퇴 회원의 `"탈퇴회원"` 도
 * 값이므로 그대로 적는다. null 만 대체 문구로 바꾼다(`formatCommunityWriter`).
 * 아바타는 장식이라 보조기술에는 이름만 읽힌다.
 */
export default function CommunityWriter({
  nickname,
  profileImageUrl,
  size = 'sm',
}: CommunityWriterProps) {
  const image = profileImageUrl?.trim() || null

  return (
    <Root $size={size} data-community-writer="true">
      <Avatar $image={image} $size={size} aria-hidden="true">
        {image ? null : getCommunityWriterInitial(nickname)}
      </Avatar>
      <Name>{formatCommunityWriter(nickname)}</Name>
    </Root>
  )
}
