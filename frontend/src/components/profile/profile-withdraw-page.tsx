import ProfileUnavailableState from '@/components/profile/profile-unavailable-state'

export default function ProfileWithdrawPage() {
  return (
    <ProfileUnavailableState
      title="회원 탈퇴"
      description="계정과 연결된 개인 데이터를 안전하게 정리하는 기능입니다."
      dependency="회원 탈퇴 V2 API와 데이터 삭제 정책"
    />
  )
}
