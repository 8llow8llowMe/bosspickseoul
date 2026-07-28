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
        V2 API 계약 대기 중입니다. {dependency} 제공 후 별도 작업으로
        연결합니다.
      </SectionNotice>
    </SectionStack>
  )
}
