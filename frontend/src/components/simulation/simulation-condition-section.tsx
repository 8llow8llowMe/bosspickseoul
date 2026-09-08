'use client'

import type { ReactNode, Ref } from 'react'
import { Check } from 'lucide-react'
import styled from 'styled-components'

export type SimulationConditionSectionCardProps = {
  /** 앵커 id. 오류 배너의 "다시 선택" CTA가 이 id로 스크롤한다. */
  id: string
  /** 화면 순서 번호. 잠금 순서가 아니라 읽는 순서다. */
  index: number
  title: string
  description?: ReactNode
  /** 우측 상단 보조 문구 (예: "서울 25개 구"). */
  meta?: ReactNode
  complete: boolean
  /** 펼쳐졌는가. 접히면 children 을 렌더하지 않는다 — DOM 에서 빼야 탭 순서에서도 빠진다. */
  expanded: boolean
  /** 접혔을 때 헤더에 적을 고른 값. 아직 안 골랐으면 null. */
  summary: string | null
  /** 잠긴 단계는 펼칠 수 없고 button 도 아니다. */
  locked?: boolean
  onToggle?: () => void
  /** 자동 진행 시 포커스를 옮길 대상. */
  headerRef?: Ref<HTMLButtonElement>
  children: ReactNode
}

const Root = styled.section<{ $expanded: boolean; $locked: boolean }>`
  overflow: hidden;
  border: 1px solid
    ${props =>
      props.$expanded ? 'var(--color-primary-600)' : 'var(--color-border-200)'};
  border-radius: var(--radius-card);
  background: ${props =>
    props.$locked ? 'var(--color-background-muted)' : 'var(--color-surface)'};
`

/* as 로 button/div 를 갈아끼우므로 버튼 기본 스타일을 여기서 지운다. */
const Head = styled.header`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 56px;
  padding: 12px 20px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;

  &:is(button) {
    cursor: pointer;
  }

  &:is(button):hover {
    background: var(--color-background-muted);
  }

  &:is(button):focus-visible {
    outline: 2px solid var(--color-primary-600);
    outline-offset: -2px;
  }

  @media (max-width: 640px) {
    padding: 12px 16px;
  }
`

const Index = styled.span<{ $done: boolean }>`
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: var(--radius-pill);
  background: ${props =>
    props.$done ? 'var(--color-primary-600)' : 'var(--color-grey-100)'};
  color: ${props => (props.$done ? '#ffffff' : 'var(--color-text-caption)')};
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;

  svg {
    width: 14px;
    height: 14px;
  }
`

const Title = styled.span`
  flex: 0 0 auto;
  color: var(--color-text-900);
  font-size: 15px;
  font-weight: 700;
`

/** 접힌 상태 전용 요약. 펼쳤을 때 설명은 Panel 안 Description 블록으로 나간다. */
const Value = styled.span`
  flex: 1 1 auto;
  overflow: hidden;
  color: var(--color-text-600);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Meta = styled.span`
  flex: 0 0 auto;
  margin-left: auto;
  color: var(--color-text-caption);
  font-size: 12px;
`

const Edit = styled.span`
  flex: 0 0 auto;
  color: var(--color-primary-700);
  font-size: 13px;
  font-weight: 600;
`

/* 아코디언 헤딩. button 콘텐츠 모델이 phrasing content 라 h2 는 버튼 밖에서 감싼다
   (ARIA APG 아코디언 패턴). */
const Heading = styled.h2`
  margin: 0;
  font: inherit;
`

const Description = styled.p`
  color: var(--color-text-600);
  font-size: 13px;
  line-height: 20px;
  word-break: keep-all;
`

const Panel = styled.div`
  display: grid;
  gap: 12px;
  padding: 0 20px 20px;

  @media (max-width: 640px) {
    padding: 0 16px 16px;
  }
`

/**
 * 조건 섹션 카드.
 *
 * 마법사 단계 버튼을 대신한다. 진행 상태는 상단 인디케이터가 아니라 각 섹션의 번호 칩이
 * 들고 있고, 완료되면 번호가 체크로 바뀐다 — 같은 정보를 정보가 있는 자리에 붙이는 편이
 * 화면 위쪽을 통째로 쓰는 4칸 인디케이터보다 밀도가 높다.
 */
export default function SimulationConditionSectionCard({
  id,
  index,
  title,
  description,
  meta,
  complete,
  expanded,
  summary,
  locked = false,
  onToggle,
  headerRef,
  children,
}: SimulationConditionSectionCardProps) {
  const headContent = (
    <>
      <Index $done={complete && !expanded}>
        {complete && !expanded ? <Check aria-hidden="true" /> : index}
      </Index>
      <Title>{title}</Title>
      {!expanded ? (
        <Value>
          {summary ?? (locked ? '업종을 고르면 열려요' : '선택 전')}
        </Value>
      ) : null}
      {meta && expanded ? <Meta>{meta}</Meta> : null}
      {complete && !expanded ? <Edit>변경</Edit> : null}
    </>
  )

  return (
    <Root id={id} $expanded={expanded} $locked={locked}>
      <Heading>
        {locked ? (
          <Head as="div">{headContent}</Head>
        ) : (
          <Head
            as="button"
            type="button"
            aria-expanded={expanded}
            onClick={onToggle}
            ref={headerRef}
          >
            {headContent}
          </Head>
        )}
      </Heading>
      {expanded ? (
        <Panel>
          {description ? <Description>{description}</Description> : null}
          {children}
        </Panel>
      ) : null}
    </Root>
  )
}
