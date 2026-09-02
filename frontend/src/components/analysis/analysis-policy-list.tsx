'use client'

import styled from 'styled-components'

import {
  formatPolicyApplyPeriod,
  resolvePolicyScope,
} from '@/lib/analysis/policy-presentation'
import type { PolicyItem } from '@/types/policy'

export type AnalysisPolicyListProps = {
  policies: readonly PolicyItem[]
  /** 지금 보고 있는 상권의 자치구. 정책의 적용 범위를 이 기준으로 말한다. */
  districtCode: string | null
  districtName: string | null
}

const List = styled.ul`
  display: grid;
  gap: 12px;
`

const Item = styled.li`
  display: grid;
  gap: 10px;
  padding: 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
`

const TitleRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`

const Title = styled.h4`
  color: var(--color-text-900);
  font-size: 15px;
  font-weight: 700;
  line-height: 23px;
  word-break: keep-all;
`

const TypeBadge = styled.span`
  flex-shrink: 0;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--color-primary-50);
  color: var(--color-primary-700);
  font-size: 12px;
  font-weight: 700;
  line-height: 18px;
  white-space: nowrap;
`

const Support = styled.p`
  color: var(--color-text-900);
  font-size: 14px;
  line-height: 22px;
  word-break: keep-all;
`

const Target = styled.p`
  color: var(--color-text-600);
  font-size: 13px;
  line-height: 20px;
  word-break: keep-all;
`

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 10px;
`

const Meta = styled.span`
  color: var(--color-text-600);
  font-size: 12px;
  line-height: 18px;
`

const DetailLink = styled.a`
  justify-self: start;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  color: var(--color-primary-700);
  font-size: 13px;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
`

/**
 * 「받을 수 있는 지원」 카드 목록.
 *
 * 판단하지 않는다 — 어느 정책이 유리한지 점수를 매기거나 추천 문구를 붙이지 않고
 * 받은 사실만 적는다. 정렬(자치구 전용 → 마감 임박순 → 상시 모집)은 백엔드가 하므로
 * **받은 순서를 그대로 그린다.**
 *
 * 빈 목록은 여기서 다루지 않는다. 부르는 쪽의 `AnalysisResultSection` 이 형제 섹션
 * 여섯 개와 같은 모양으로 빈 상태를 맡는다.
 */
export default function AnalysisPolicyList({
  policies,
  districtCode,
  districtName,
}: AnalysisPolicyListProps) {
  if (policies.length === 0) {
    return null
  }

  return (
    <List>
      {policies.map(policy => {
        const scope = resolvePolicyScope(policy, { districtCode, districtName })

        return (
          <Item key={policy.policyId}>
            <TitleRow>
              <Title>{policy.title}</Title>
              <TypeBadge>{policy.supportTypeName}</TypeBadge>
            </TitleRow>

            <Support>{policy.supportContent}</Support>
            <Target>{policy.targetSummary}</Target>

            <MetaRow>
              <Meta>{policy.organization}</Meta>
              <Meta aria-hidden="true">·</Meta>
              <Meta>{scope.region}</Meta>
              <Meta aria-hidden="true">·</Meta>
              <Meta>{scope.service}</Meta>
              <Meta aria-hidden="true">·</Meta>
              <Meta>{formatPolicyApplyPeriod(policy)}</Meta>
            </MetaRow>

            {/*
              외부 기관 페이지다. `rel` 을 빼면 열린 탭이 `window.opener` 로
              이 앱을 만질 수 있다.
            */}
            <DetailLink
              href={policy.detailUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {policy.organization} 안내 보기
            </DetailLink>
          </Item>
        )
      })}
    </List>
  )
}
