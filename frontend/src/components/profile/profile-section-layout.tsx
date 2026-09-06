import type { ReactNode } from 'react'
import styled from 'styled-components'
import ProfileTabs from '@/components/profile/profile-tabs'

/*
  설정 화면은 폼이다. 셸이 전폭이 되면서 우측 본문이 2560 에서 2100px 까지 가는데
  입력 필드가 그 폭이면 라벨과 값이 멀어져 읽기·입력이 모두 나빠진다.
  북마크(카드 목록)는 넓어질수록 이득이라 이 상한을 두지 않는다.
*/
const Wrapper = styled.section`
  max-width: var(--w-form);
  display: grid;
  gap: 20px;
`

const Header = styled.div`
  display: grid;
  gap: 10px;
`

const Title = styled.h1`
  color: var(--color-text-900);
  font-size: 30px;
  font-weight: 700;
  line-height: 40px;
  letter-spacing: 0;
`

const Description = styled.p`
  color: var(--color-text-600);
  font-size: 16px;
  line-height: 24px;
  word-break: keep-all;
`

type TabItem = {
  label: string
  href: string
}

type ProfileSectionLayoutProps = {
  title: string
  description: string
  tabs: readonly TabItem[]
  children: ReactNode
}

export default function ProfileSectionLayout({
  title,
  description,
  tabs,
  children,
}: ProfileSectionLayoutProps) {
  return (
    <Wrapper>
      <Header>
        <Title>{title}</Title>
        <Description>{description}</Description>
      </Header>
      <ProfileTabs tabs={tabs} />
      {children}
    </Wrapper>
  )
}
