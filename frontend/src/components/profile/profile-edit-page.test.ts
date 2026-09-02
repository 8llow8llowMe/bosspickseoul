import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ProfileEditPage, {
  canRemoveProfileImage,
} from '@/components/profile/profile-edit-page'
import { IMAGE_RULE_TEXT } from '@/lib/upload/image-rules'

type TestMemberInfo = {
  memberId: string
  email: string
  name: string
  nickname: string
  profileImageUrl: string
  provider: string | null
  role: { code: string; name: string; description: string }
} | null

const authBox = vi.hoisted(() => ({ memberInfo: null as TestMemberInfo }))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (select: (state: Record<string, unknown>) => unknown) =>
    select({ memberInfo: authBox.memberInfo }),
}))

const render = () =>
  renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(ProfileEditPage),
    ),
  )

beforeEach(() => {
  authBox.memberInfo = {
    memberId: 'member-1',
    email: 'owner@example.com',
    name: '홍길동',
    nickname: '길동이',
    profileImageUrl: '',
    provider: null,
    role: { code: 'USER', name: '일반 회원', description: '일반 회원' },
  }
})

describe('canRemoveProfileImage', () => {
  /*
   * `profileImageUrl` 은 업로드본이 없으면 **소셜 제공자 URL** 이다. 소셜 사진을
   * 우리 「사진 지우기」로 지울 수는 없는데 버튼을 보여 주면, 눌러 봐야 아무 일도
   * 없거나 서버가 거절한다.
   */
  it('소셜 계정의 제공자 사진에는 삭제를 열지 않는다', () => {
    expect(
      canRemoveProfileImage(
        { provider: 'KAKAO', profileImageUrl: 'https://kakao.test/a.png' },
        false,
      ),
    ).toBe(false)
  })

  /* 이번 세션에서 실제로 올렸다면 우리 파일인 것이 확실하다. */
  it('소셜 계정도 방금 올렸으면 삭제를 연다', () => {
    expect(
      canRemoveProfileImage(
        { provider: 'KAKAO', profileImageUrl: 'https://minio.test/a.png' },
        true,
      ),
    ).toBe(true)
  })

  /* 일반 계정은 소셜 URL 이 있을 수 없으므로 URL 이 곧 업로드본이다. */
  it('일반 계정은 사진이 있으면 삭제를 연다', () => {
    expect(
      canRemoveProfileImage(
        { provider: null, profileImageUrl: 'https://minio.test/a.png' },
        false,
      ),
    ).toBe(true)
  })

  it('사진이 없으면 삭제할 것도 없다', () => {
    expect(
      canRemoveProfileImage({ provider: null, profileImageUrl: '' }, false),
    ).toBe(false)
    expect(canRemoveProfileImage(null, false)).toBe(false)
  })
})

describe('ProfileEditPage — 프로필 사진', () => {
  it('사진 올리기 버튼과 파일 입력을 준다', () => {
    const markup = render()

    expect(markup).toContain('프로필 사진')
    expect(markup).toContain('사진 올리기')
    expect(markup).toContain('type="file"')
  })

  /* 파일 선택창을 미리 좁혀 준다(진짜 판정은 서버의 매직 바이트 검사다). */
  it('허용 형식으로 파일 선택창을 좁힌다', () => {
    expect(render()).toContain('image/jpeg,image/png,image/gif,image/webp')
  })

  it('규칙을 화면에 적는다', () => {
    expect(render()).toContain(IMAGE_RULE_TEXT)
  })

  it('사진이 없으면 지우기 버튼을 주지 않는다', () => {
    expect(render()).not.toContain('사진 지우기')
  })

  it('일반 계정에 사진이 있으면 지우기 버튼을 준다', () => {
    authBox.memberInfo = {
      ...authBox.memberInfo!,
      profileImageUrl: 'https://minio.test/a.png',
    }

    expect(render()).toContain('사진 지우기')
  })

  it('소셜 제공자 사진만 있으면 지우기 버튼을 주지 않는다', () => {
    authBox.memberInfo = {
      ...authBox.memberInfo!,
      provider: 'KAKAO',
      profileImageUrl: 'https://kakao.test/a.png',
    }

    expect(render()).not.toContain('사진 지우기')
  })

  it('즉시 반영된다는 것을 미리 적는다', () => {
    expect(render()).toContain('바로 반영돼요')
  })
})

describe('ProfileEditPage — 남은 자리표시자', () => {
  /*
   * 사진이 붙었으므로 「사진과 닉네임이 준비 중」은 이제 거짓말이다.
   * 닉네임만 남는다(`PATCH /members/me`, 별건).
   */
  it('사진이 준비 중이라고 말하지 않는다', () => {
    const markup = render()

    expect(markup).not.toContain('프로필 사진과 닉네임 변경은 아직 준비 중')
    expect(markup).toContain('닉네임 변경은 아직 준비 중')
  })
})

describe('ProfileEditPage — 계정 정보', () => {
  it('회원 정보를 그대로 보여 준다', () => {
    const markup = render()

    expect(markup).toContain('owner@example.com')
    expect(markup).toContain('길동이')
  })

  it('회원 정보가 없으면 폼 대신 안내를 보여 준다', () => {
    authBox.memberInfo = null

    const markup = render()

    expect(markup).toContain('프로필 정보를 준비하는 중입니다')
    expect(markup).not.toContain('type="file"')
  })
})
