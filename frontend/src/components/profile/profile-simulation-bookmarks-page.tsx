import ProfileUnavailableState from '@/components/profile/profile-unavailable-state'

export default function ProfileSimulationBookmarksPage() {
  return (
    <ProfileUnavailableState
      title="시뮬레이션 저장 목록"
      description="저장한 창업 시뮬레이션 결과를 다시 확인하는 기능입니다."
      dependency="시뮬레이션 저장·목록 조회 V2 API"
    />
  )
}
