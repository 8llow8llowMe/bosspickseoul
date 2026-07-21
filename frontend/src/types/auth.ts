export type LoginPayload = {
  email: string
  password: string
}

export type RegisterPayload = {
  name: string
  nickname: string
  email: string
  password: string
  profileImage: string | null
}

export type VerifyEmailCodePayload = {
  memberEmail: string
  emailCode: string
}

export type MemberInfo = {
  memberId: string
  email: string
  name: string
  nickname: string
  profileImageUrl: string
  role: {
    code: string
    name: string
    description: string
  }
}

export type LoginResponseBody = {
  memberInfo: MemberInfo
}
