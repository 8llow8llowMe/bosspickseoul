'use client'

import styled from 'styled-components'
import {
  SectionNotice,
  SectionPanel,
  SectionStack,
  SectionTitle,
  SectionBody,
} from '@/components/profile/profile-ui'
import { useAuthStore } from '@/stores/auth-store'

const AccountSummary = styled.dl`
  display: grid;
  grid-template-columns: minmax(112px, 0.35fr) minmax(0, 1fr);
  margin: 20px 0 0;
  border-top: 1px solid var(--color-border-200);

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

const AccountTerm = styled.dt`
  padding: 16px 12px;
  border-bottom: 1px solid var(--color-border-200);
  color: var(--color-text-500);
  font-size: 14px;
  font-weight: 600;

  @media (max-width: 640px) {
    padding-bottom: 4px;
    border-bottom: 0;
  }
`

const AccountDescription = styled.dd`
  min-width: 0;
  margin: 0;
  padding: 16px 12px;
  border-bottom: 1px solid var(--color-border-200);
  color: var(--color-text-900);
  overflow-wrap: anywhere;

  @media (max-width: 640px) {
    padding-top: 4px;
  }
`

const AccountRow = styled.div`
  display: contents;
`

export default function ProfileEditPage() {
  const memberInfo = useAuthStore(state => state.memberInfo)

  if (!memberInfo) {
    return (
      <SectionStack>
        <SectionNotice $tone="info">
          프로필 정보를 준비하는 중입니다.
        </SectionNotice>
      </SectionStack>
    )
  }

  const accountItems = [
    ['이메일', memberInfo.email],
    ['이름', memberInfo.name],
    ['닉네임', memberInfo.nickname],
    ['회원 유형', memberInfo.role?.description ?? '일반 회원'],
  ] as const

  return (
    <SectionStack>
      <SectionPanel>
        <SectionTitle>회원 정보</SectionTitle>
        <SectionBody>
          현재 V2 회원 API에서 확인할 수 있는 계정 정보입니다.
        </SectionBody>
        <AccountSummary>
          {accountItems.map(([label, value]) => (
            <AccountRow key={label}>
              <AccountTerm>{label}</AccountTerm>
              <AccountDescription>{value}</AccountDescription>
            </AccountRow>
          ))}
        </AccountSummary>
      </SectionPanel>
      <SectionNotice $tone="info">
        V2 API 계약 대기 중입니다. 프로필 이미지 업로드와 닉네임 수정 API 제공
        후 별도 작업으로 연결합니다.
      </SectionNotice>
    </SectionStack>
  )
}
