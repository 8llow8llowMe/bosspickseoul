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
  id: number | null
  name: string
  nickname: string
  email: string
  profileImage: string | null
  provider: string | null
  role: string
}

export type LoginResponseBody = {
  memberInfo: MemberInfo
}
