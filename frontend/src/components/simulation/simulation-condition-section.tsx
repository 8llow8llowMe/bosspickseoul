'use client'

import type { ReactNode } from 'react'
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
  children: ReactNode
}

const Root = styled.section`
  display: grid;
  gap: 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 20px 24px 24px;

  @media (max-width: 640px) {
    padding: 16px;
  }
`

const Head = styled.header`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 12px;
`

const Heading = styled.div`
  min-width: 0;
  display: grid;
  gap: 4px;
`

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const Marker = styled.span<{ $complete: boolean }>`
  width: 24px;
  height: 24px;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border-radius: var(--radius-control);
  background: ${props =>
    props.$complete
      ? 'var(--color-primary-100)'
      : 'var(--color-surface-muted)'};
  color: ${props =>
    props.$complete ? 'var(--color-primary-700)' : 'var(--color-text-caption)'};
  font-size: 12px;
  font-weight: 700;
  line-height: 18px;
  font-variant-numeric: tabular-nums;

  svg {
    width: 14px;
    height: 14px;
    stroke: currentColor;
  }
`

const Title = styled.h2`
  min-width: 0;
  color: var(--color-text-900);
  font-size: 17px;
  font-weight: 700;
  line-height: 26px;
  word-break: keep-all;
`

const Description = styled.p`
  color: var(--color-text-600);
  font-size: 13px;
  line-height: 20px;
  word-break: keep-all;
`

const Meta = styled.span`
  flex: 0 0 auto;
  color: var(--color-text-caption);
  font-size: 12px;
  line-height: 18px;
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
  children,
}: SimulationConditionSectionCardProps) {
  return (
    <Root id={id} aria-labelledby={`${id}-title`}>
      <Head>
        <Heading>
          <TitleRow>
            <Marker
              $complete={complete}
              aria-label={complete ? '선택 완료' : undefined}
            >
              {complete ? <Check aria-hidden="true" /> : index}
            </Marker>
            <Title id={`${id}-title`}>{title}</Title>
          </TitleRow>
          {description ? <Description>{description}</Description> : null}
        </Heading>
        {meta ? <Meta>{meta}</Meta> : null}
      </Head>
      {children}
    </Root>
  )
}
