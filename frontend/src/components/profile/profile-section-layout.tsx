import type { ReactNode } from 'react'
import styled from 'styled-components'
import ProfileTabs from '@/components/profile/profile-tabs'

const Wrapper = styled.section`
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
