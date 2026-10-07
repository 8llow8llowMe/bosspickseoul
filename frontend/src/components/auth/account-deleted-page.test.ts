import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import AccountDeletedPage from './account-deleted-page'

/*
  탈퇴 완료 화면 문구는 개인정보 처리방침 제6조 탈퇴 표(`src/lib/legal/privacy-policy.ts`)와 같은
  사실만 말한다(#495, legal.md S3). 이메일은 재가입 차단을 위해 남고, 게시글·댓글은 「탈퇴회원」으로
  남는다. 「모두 초기화」·「새 계정으로 가입」 같은 문구는 처리방침과 어긋난다.
  보관 기간은 아직 정해지지 않았으므로(#508) 적지 않는다.
*/

const markup = renderToStaticMarkup(createElement(AccountDeletedPage))

describe('AccountDeletedPage — 처리방침과 같은 사실', () => {
  it('지운 것과 로그아웃을 말한다', () => {
    expect(markup).toContain(
      '이름·닉네임을 지우고 모든 기기에서 로그아웃했어요.',
    )
  })

  it('남는 것(글·댓글, 이메일 재가입 차단)을 말하고 처리방침으로 잇는다', () => {
    // 「글이 탈퇴회원으로 남는다」로 읽히지 않게, 남는 것(글)과 표시(작성자)를 나눈다(처리방침 제6조).
    expect(markup).toContain(
      '작성한 글과 댓글은 남고, 작성자는 「탈퇴회원」으로 표시돼요.',
    )
    expect(markup).toContain('탈퇴한 이메일로는 다시 가입할 수 없어요.')
    expect(markup).toMatch(
      /<a [^>]*href="\/privacy"[^>]*>개인정보 처리방침<\/a>에서 볼 수 있어요\./,
    )
  })

  it('다른 이메일로 다시 가입하는 길을 남긴다', () => {
    expect(markup).toContain('다른 이메일로 다시 시작하려면')
    expect(markup).toContain('href="/register">회원가입</a>')
  })

  it('처리방침과 어긋나는 예전 문구와 기간을 쓰지 않는다', () => {
    expect(markup).not.toContain('초기화')
    expect(markup).not.toContain('새 계정 만들기')
    expect(markup).not.toMatch(/\d+\s*(년|개월|일)/)
  })
})
