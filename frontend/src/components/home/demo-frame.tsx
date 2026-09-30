'use client'

import type { ReactNode } from 'react'
import styled from 'styled-components'

/**
 * 판단 흐름 데모 네 개가 함께 쓰는 틀(story-panel-redesign.md D4-4).
 *
 * 예전엔 데모마다 틀이 달랐다 — 01 은 패널에 바로, 02 는 카드 안의 카드 안의 회색 박스,
 * 03·04 는 틀 없이 떠 있었다. 탭을 넘길 때마다 화면의 문법이 바뀌어 한 제품처럼 보이지
 * 않았다. 배경·테두리·머리줄·꼬리 자리를 여기 한 곳에서 정한다.
 */
const Frame = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  padding: 24px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-background-muted);

  @media (max-width: 768px) {
    padding: 16px;
  }
`

const Head = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
`

const Heading = styled.div`
  display: grid;
  gap: 2px;
  min-width: 0;
`

const Title = styled.h4`
  color: var(--color-text-900);
  font-size: 16px;
  font-weight: 700;
  line-height: 24px;
  word-break: keep-all;
`

const Subtitle = styled.p`
  color: var(--color-text-600);
  font-size: 13px;
  line-height: 20px;
  word-break: keep-all;
`

const Aside = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`

/* 본문이 짧아도 꼬리는 틀 바닥에 붙는다 — 탭마다 꼬리 위치가 흔들리지 않는다. */
const Footer = styled.div`
  margin-top: auto;
  color: var(--color-text-600);
  font-size: 13px;
  line-height: 20px;
  word-break: keep-all;
`

/** 흩어져 있던 「대표 예시 데이터」 캡션을 모은 배지. 머리줄 aside 에 둔다. */
export const SampleBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--radius-compact);
  background: var(--color-surface-muted);
  color: var(--color-text-600);
  font-size: 12px;
  font-weight: 600;
  line-height: 20px;
  white-space: nowrap;
`

export type DemoFrameProps = {
  /** 제목 대신 머리줄 왼쪽에 둘 조작부(02 의 지역·업종 칩). 제목과 함께 쓰지 않는다. */
  leading?: ReactNode
  title?: ReactNode
  subtitle?: ReactNode
  aside?: ReactNode
  footer?: ReactNode
  children: ReactNode
}

export default function DemoFrame({
  leading,
  title,
  subtitle,
  aside,
  footer,
  children,
}: DemoFrameProps) {
  const hasHead = Boolean(leading || title || subtitle || aside)

  let lead: ReactNode = <span />
  if (leading) lead = leading
  else if (title || subtitle) {
    lead = (
      <Heading>
        {title ? <Title>{title}</Title> : null}
        {subtitle ? <Subtitle>{subtitle}</Subtitle> : null}
      </Heading>
    )
  }

  return (
    <Frame>
      {hasHead ? (
        <Head>
          {lead}
          {aside ? <Aside>{aside}</Aside> : null}
        </Head>
      ) : null}
      {children}
      {footer ? <Footer>{footer}</Footer> : null}
    </Frame>
  )
}
