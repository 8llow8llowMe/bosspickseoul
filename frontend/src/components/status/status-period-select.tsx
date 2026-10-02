'use client'

import AnalysisPeriodSelect from '@/components/analysis/analysis-period-select'
import type { AnalysisPeriodRange } from '@/lib/analysis/period-catalog'

type StatusPeriodSelectProps = {
  value: string | null
  range: AnalysisPeriodRange | null
  onChange: (periodCode: string) => void
}

/**
 * 구별현황의 기준 분기 select(status.md 1.6). 선택지·연도 전환 규칙은 상권 분석과 같아
 * `AnalysisPeriodSelect` 를 그대로 쓰고, 이 화면 문맥의 이름(「기준 연도」·「기준 분기」)과
 * 터치 타깃 크기(`md`, 36px)만 정한다. 모바일에서는 지표 전환 바로 위의 주 조작부다.
 */
export default function StatusPeriodSelect({
  value,
  range,
  onChange,
}: StatusPeriodSelectProps) {
  return (
    <AnalysisPeriodSelect
      quarterLabel="기준 분기"
      size="md"
      value={value}
      range={range}
      yearLabel="기준 연도"
      onChange={onChange}
    />
  )
}
