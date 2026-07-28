import ProfileUnavailableState from '@/components/profile/profile-unavailable-state'

export default function ProfileChangePasswordPage() {
  return (
    <ProfileUnavailableState
      title="비밀번호 변경"
      description="현재 비밀번호를 확인하고 새 비밀번호로 교체하는 기능입니다."
      dependency="비밀번호 변경 V2 API"
    />
  )
}
