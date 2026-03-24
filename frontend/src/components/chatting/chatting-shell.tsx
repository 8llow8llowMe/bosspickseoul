'use client'

import styled from 'styled-components'

const Page = styled.main`
  width: min(1200px, calc(100% - 48px));
  margin: 0 auto;
  padding: 40px 0 72px;
`

const Layout = styled.div`
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`

const Rail = styled.aside`
  display: grid;
  gap: 16px;
  align-self: start;
  position: sticky;
  top: 96px;

  @media (max-width: 1024px) {
    position: static;
  }
`

const Main = styled.section`
  min-width: 0;
`

type ChattingShellProps = {
  rail: React.ReactNode
  children: React.ReactNode
}

export default function ChattingShell({ rail, children }: ChattingShellProps) {
  return (
    <Page>
      <Layout>
        <Rail>{rail}</Rail>
        <Main>{children}</Main>
      </Layout>
    </Page>
  )
}
