export type UpdateMemberInfoPayload = {
  nickname: string
  profileImage: string
}

export type ChangePasswordPayload = {
  nowPassword: string
  changePassword: string
  changePasswordCheck: string
}
