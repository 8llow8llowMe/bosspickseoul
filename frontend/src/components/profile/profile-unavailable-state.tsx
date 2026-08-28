import {
  SectionNotice,
  SectionPanel,
  SectionStack,
  SectionTitle,
  SectionBody,
} from '@/components/profile/profile-ui'

type ProfileUnavailableStateProps = {
  title: string
  description: string
  /** 사용자에게 보일 기능 주어. 예: `회원 탈퇴 기능은` */
  dependency: string
}

export default function ProfileUnavailableState({
  title,
  description,
  dependency,
}: ProfileUnavailableStateProps) {
  return (
    <SectionStack>
      <SectionPanel>
        <SectionTitle>{title}</SectionTitle>
        <SectionBody>{description}</SectionBody>
      </SectionPanel>
      <SectionNotice $tone="info">
        {dependency} 아직 준비 중이에요. 준비되면 이 화면에서 바로 이용할 수
        있습니다.
      </SectionNotice>
    </SectionStack>
  )
}
