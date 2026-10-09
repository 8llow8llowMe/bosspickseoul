'use client'

import type { ReactNode } from 'react'
import styled from 'styled-components'
import EmptyState from '@/components/ui/empty-state'
import { centeredColumn } from '@/styles/layout'

/*
  클라이언트 경계다 — styled-components 파일이 'use client' 없이 서버 트리에서 렌더되면 CSS 가 주입되지 않는다.
  없는 주소 · 렌더 오류 화면의 공통 틀. 셸(헤더·푸터) 안 본문 칸에 놓이는 가운데 정렬 EmptyState 한 장이다.
  버튼은 주 하나 + 보조 하나(DESIGN.md §14). 일러스트를 쓰지 않는다.
*/
const Page = styled.main`
  ${centeredColumn('var(--w-read)')}
  display: grid;
  align-content: center;
  min-height: calc(100dvh - 160px);
  padding: 48px 0;
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
`

type StatusScreenProps = {
  title: string
  description: string
  primary: ReactNode
  secondary: ReactNode
}

export default function StatusScreen({
  title,
  description,
  primary,
  secondary,
}: StatusScreenProps) {
  return (
    <Page>
      <EmptyState
        action={
          <Actions>
            {primary}
            {secondary}
          </Actions>
        }
        description={description}
        title={title}
        titleAs="h1"
      />
    </Page>
  )
}
