import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ProfileEditPage, {
  canRemoveProfileImage,
  canSubmitNickname,
} from '@/components/profile/profile-edit-page'
import { NICKNAME_RULE_TEXT } from '@/lib/auth/nickname-rules'
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

describe('canSubmitNickname', () => {
  it('바뀐 값이고 규칙에 맞을 때만 제출을 연다', () => {
    expect(canSubmitNickname('길동짱', '길동이')).toBe(true)
    expect(canSubmitNickname('', '길동이')).toBe(false)
    expect(canSubmitNickname('   ', '길동이')).toBe(false)
  })

  /*
   * `maxLength` 는 브라우저의 편의일 뿐이라 IME 조합·자동완성이 넘길 수 있다.
   * 제출 판정을 거기에 맡기지 않는다.
   */
  it('입력칸을 넘어온 긴 값도 막는다', () => {
    expect(canSubmitNickname('가'.repeat(11), '길동이')).toBe(false)
    expect(canSubmitNickname('가'.repeat(10), '길동이')).toBe(true)
  })

  /* 성공했다는 안내만 뜨고 아무것도 안 바뀌는 상태를 만들지 않는다. */
  it('지금 닉네임과 같으면 막는다', () => {
    expect(canSubmitNickname('길동이', '길동이')).toBe(false)
  })

  /* 앞뒤 공백만 다른 값은 서버에서 같은 값이 된다. */
  it('앞뒤 공백을 다듬은 뒤 비교한다', () => {
    expect(canSubmitNickname('  길동이  ', '길동이')).toBe(false)
  })
})

describe('ProfileEditPage — 닉네임', () => {
  /* `PATCH /members/me` 를 연결했으므로 「준비 중」은 이제 거짓말이다. */
  it('준비 중이라고 말하지 않는다', () => {
    const markup = render()

    expect(markup).not.toContain('닉네임 변경은 아직 준비 중')
    expect(markup).not.toContain('프로필 사진과 닉네임 변경은 아직 준비 중')
  })

  it('지금 닉네임이 들어간 입력칸과 저장 버튼을 준다', () => {
    const markup = render()

    expect(markup).toContain('닉네임 변경')
    expect(markup).toContain('value="길동이"')
    expect(markup).toContain('aria-label="닉네임"')
  })

  /* 서버 한계와 같은 값으로 입력 자체를 막아 잘릴 값을 왕복시키지 않는다. */
  it('입력 길이를 서버 한계로 막는다', () => {
    expect(render()).toContain('maxLength="10"')
  })

  it('규칙을 화면에 적는다', () => {
    expect(render()).toContain(NICKNAME_RULE_TEXT)
  })

  /* 열자마자는 지금 닉네임 그대로라 바꿀 것이 없다. */
  it('처음에는 저장 버튼이 잠겨 있다', () => {
    expect(render()).toContain('disabled=""')
  })
})

describe('ProfileEditPage — 계정 정보', () => {
  it('회원 정보를 그대로 보여 준다', () => {
    const markup = render()

    expect(markup).toContain('owner@example.com')
    expect(markup).toContain('홍길동')
  })

  /*
   * 닉네임은 바로 위 패널이 **고칠 수 있는 자리**로 보여 준다. 읽기 전용 행을 함께
   * 두면 편집 중에 어느 쪽이 진짜인지 읽는 사람이 판단해야 한다.
   */
  it('닉네임은 읽기 전용 행으로 겹쳐 놓지 않는다', () => {
    const markup = render()

    // 입력칸의 value 하나뿐이어야 한다.
    expect(markup.match(/길동이/g)?.length).toBe(1)
  })

  it('회원 정보가 없으면 폼 대신 안내를 보여 준다', () => {
    authBox.memberInfo = null

    const markup = render()

    expect(markup).toContain('프로필 정보를 준비하는 중입니다')
    expect(markup).not.toContain('type="file"')
  })
})
