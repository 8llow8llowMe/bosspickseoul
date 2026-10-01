import type { PropsWithChildren, ReactNode } from 'react'
import styled from 'styled-components'

/*
  셸 세로 묶음 — 헤더 · 본문 칸 · 푸터(community.md §S4 「다듬기」 푸터 위치, 셸 공통).

  내용이 짧아도(빈 목록 · 로딩 중) 푸터는 화면 바닥에 붙는다. 셸이 최소 한 화면 높이의 세로 flex 이고
  본문 칸이 남는 높이를 갖는다(`flex: 1 0 auto`). 내용이 화면보다 길면 아무 일도 하지 않는다.

  왜 페이지 요소를 바로 flex 항목으로 두지 않고 본문 칸으로 한 번 감싸나: flex 항목은 좌우 `margin: auto`
  가 있으면 늘어나지 않고 내용 폭으로 줄어든다. 페이지 대부분이 `margin: 0 auto` 로 가운데 놓이므로
  (`shellWidth` · `centeredColumn` · 폭 없는 `max-width`) 그대로 두면 폭을 따로 주지 않은 화면이 쪼그라든다.
  본문 칸 안은 지금까지와 같은 블록 흐름이라 페이지 쪽 레이아웃 · sticky · 높이 계산(`100dvh - 헤더`)이
  바뀌지 않는다. 본문 칸은 flex 항목이라 새 블록 문맥이 된다 — 맨 위 · 맨 아래 요소의 세로 margin 이 칸 밖으로
  새지 않지만, 헤더 · 푸터에 margin 이 없어 보이는 간격은 같다.

  푸터를 숨기는 화면(`main[data-hide-footer]`)은 이제 main 이 푸터의 형제가 아니다 — 푸터가 본문 칸의
  `:has()` 로 판정한다(site-footer.tsx).

  `100vh` 는 `dvh` 를 모르는 브라우저의 폴백이다. 모바일 주소창이 접히고 펴질 때는 `dvh` 가 맞다.
*/
const Root = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
`

const Body = styled.div`
  flex: 1 0 auto;
`

type SiteShellProps = PropsWithChildren<{
  header: ReactNode
  footer: ReactNode
}>

export default function SiteShell({
  header,
  footer,
  children,
}: SiteShellProps) {
  return (
    <Root data-site-shell="true">
      {header}
      <Body data-site-shell-body="true">{children}</Body>
      {footer}
    </Root>
  )
}
