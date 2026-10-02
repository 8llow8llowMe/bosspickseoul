'use client'

import { useMemo, type ReactNode } from 'react'
import styled from 'styled-components'
import { toDistrictRhythm } from '@/components/home/district-rhythm'
import {
  describePickPreview,
  heroPickerName,
} from '@/components/home/hero-picker'
import { useDistrictDetail } from '@/hooks/use-district-detail'

/*
  안내·불러오는 중·실데이터 세 상태가 같은 두 줄을 예약한다 — 줄이 바뀌며 아래 버튼이
  튀지 않게(hero-picker-and-mobile-first-screen.md D5-2). 실패·빈 응답이면 줄이 빠진다.
*/
const Line = styled.p`
  min-height: 40px;
  color: var(--color-text-600);
  font-size: 13px;
  line-height: 20px;
  word-break: keep-all;

  strong {
    color: var(--color-text-900);
    font-weight: 700;
  }
`

/**
 * 피커로 고른 구의 실데이터 한 줄(D4-3). 툴팁과 같은 쿼리 키라 지도에서 다시 호버하면
 * 요청 없이 캐시로 뜬다. 실패하면 줄만 빠지고 피커·버튼은 그대로다(홈의 조용한 실패).
 */
export default function HeroPickPreview({ code }: { code: string | null }) {
  const detail = useDistrictDetail(code, code !== null)
  const parts = useMemo(
    () =>
      detail.data ? describePickPreview(toDistrictRhythm(detail.data)) : [],
    [detail.data],
  )
  const name = code === null ? null : heroPickerName(code)

  let content: ReactNode = null
  if (code === null || name === null) {
    content = '지도에서 구를 누르거나 목록에서 고르세요.'
  } else if (detail.data) {
    content =
      parts.length > 0 ? (
        <>
          <strong>{name}</strong> · {parts.join(' · ')}
        </>
      ) : null
  } else if (!detail.isError) {
    content = `${name} 유동인구를 불러오는 중이에요.`
  }

  /* 라이브 영역은 늘 있어야 바뀐 문장을 읽어 준다. 내용이 없으면 높이를 예약하지 않는다. */
  return (
    <div aria-live="polite">
      {content === null ? null : <Line>{content}</Line>}
    </div>
  )
}
