import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  COMMUNITY_WRITER_FALLBACK,
  formatCommunityWriter,
  getCommunityWriterInitial,
} from '@/lib/community'

import CommunityWriter from './community-writer'

const render = (
  nickname: string | null | undefined,
  profileImageUrl: string | null | undefined = null,
) =>
  renderToStaticMarkup(
    createElement(CommunityWriter, { nickname, profileImageUrl }),
  )

/*
 * 백엔드 `writerNickname` 의 세 갈래(BE #271): 닉네임 · "탈퇴회원"(값) · null(장애·미존재).
 * FE 는 판정하지 않고 null 만 대체 문구로 바꾼다.
 */
describe('formatCommunityWriter', () => {
  it('받은 닉네임을 그대로 적는다', () => {
    expect(formatCommunityWriter('역삼동 김사장')).toBe('역삼동 김사장')
  })

  it('탈퇴회원은 백엔드가 준 값이라 그대로 적는다', () => {
    expect(formatCommunityWriter('탈퇴회원')).toBe('탈퇴회원')
  })

  it('null · undefined · 공백은 대체 문구로 채운다', () => {
    expect(formatCommunityWriter(null)).toBe(COMMUNITY_WRITER_FALLBACK)
    expect(formatCommunityWriter(undefined)).toBe(COMMUNITY_WRITER_FALLBACK)
    expect(formatCommunityWriter('   ')).toBe(COMMUNITY_WRITER_FALLBACK)
  })
})

describe('getCommunityWriterInitial', () => {
  it('닉네임 첫 글자를 이니셜로 쓴다', () => {
    expect(getCommunityWriterInitial('역삼동 김사장')).toBe('역')
    expect(getCommunityWriterInitial(null)).toBe(
      COMMUNITY_WRITER_FALLBACK.slice(0, 1),
    )
  })
})

describe('CommunityWriter', () => {
  it('이미지가 없으면 이니셜 아바타와 닉네임을 그린다', () => {
    const markup = render('역삼동 김사장')

    expect(markup).toContain('data-community-writer="true"')
    expect(markup).toContain('역삼동 김사장')
    expect(markup).toContain('>역<')
  })

  it('이미지가 있으면 이니셜을 지우고 이름만 남긴다', () => {
    const markup = render('역삼동 김사장', 'https://cdn.example.com/a.png')

    expect(markup).toContain('역삼동 김사장')
    expect(markup).not.toContain('>역<')
  })

  /* 아바타는 장식이다. 보조기술에는 이름만 읽혀야 한다. */
  it('아바타는 보조기술에서 숨긴다', () => {
    const markup = render('역삼동 김사장')

    expect(markup).toContain('aria-hidden="true"')
    expect(markup).not.toContain('<img')
  })

  it('닉네임이 null 이면 대체 문구를 적는다', () => {
    const markup = render(null)

    expect(markup).toContain(`>${COMMUNITY_WRITER_FALLBACK}<`)
  })
})
