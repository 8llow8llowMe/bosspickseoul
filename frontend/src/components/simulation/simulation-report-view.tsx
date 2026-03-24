'use client'

import Link from 'next/link'
import styled from 'styled-components'
import { formatLargeWon } from '@/lib/format'
import type {
  SimulationReport,
  SimulationReportRequest,
} from '@/types/simulation'

const Page = styled.main`
  width: min(1200px, calc(100% - 48px));
  margin: 0 auto;
  padding: 32px 0 72px;
  display: grid;
  gap: 24px;
`

const Hero = styled.section`
  display: grid;
  gap: 16px;
  padding: 32px;
  border: 1px solid rgba(21, 73, 181, 0.12);
  border-radius: 28px;
  background:
    radial-gradient(
      circle at top left,
      rgba(51, 109, 211, 0.16),
      transparent 34%
    ),
    linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
  box-shadow: 0 18px 44px rgba(21, 73, 181, 0.08);
`

const Eyebrow = styled.p`
  color: var(--color-primary-700);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

const Title = styled.h1`
  color: var(--color-text-900);
  font-size: clamp(30px, 4vw, 42px);
  line-height: 1.15;
  letter-spacing: -0.04em;
`

const Body = styled.p`
  max-width: 840px;
  color: var(--color-text-500);
  line-height: 1.8;
`

const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`

const MetaBadge = styled.span`
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(21, 73, 181, 0.08);
  color: var(--color-primary-700);
  font-size: 13px;
  font-weight: 700;
`

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`

const PrimaryButton = styled.button`
  min-height: 48px;
  padding: 0 18px;
  border: none;
  border-radius: 14px;
  background: var(--color-primary-700);
  color: white;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    background: #a9b5cb;
  }
`

const SecondaryLink = styled(Link)`
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  border: 1px solid var(--color-primary-700);
  border-radius: 14px;
  color: var(--color-primary-700);
  font-size: 15px;
  font-weight: 700;
`

const Notice = styled.div<{ $tone?: 'error' | 'info' | 'success' }>`
  padding: 16px 18px;
  border-radius: 18px;
  background: ${props => {
    if (props.$tone === 'error') return 'rgba(209, 67, 67, 0.08)'
    if (props.$tone === 'success') return 'rgba(31, 157, 85, 0.08)'
    return 'rgba(51, 109, 211, 0.08)'
  }};
  color: ${props => {
    if (props.$tone === 'error') return 'var(--color-danger)'
    if (props.$tone === 'success') return 'var(--color-success)'
    return 'var(--color-primary-700)'
  }};
  line-height: 1.75;
`

const SummaryGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 1080px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`

const SummaryCard = styled.article`
  padding: 24px;
  border: 1px solid var(--color-border-200);
  border-radius: 22px;
  background: white;
  box-shadow: 0 10px 30px rgba(21, 73, 181, 0.08);
`

const SummaryLabel = styled.p`
  color: var(--color-text-500);
  font-size: 13px;
`

const SummaryValue = styled.p`
  margin-top: 8px;
  color: var(--color-text-900);
  font-size: 26px;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.03em;
`

const SummaryHelper = styled.p`
  margin-top: 8px;
  color: var(--color-text-500);
  font-size: 13px;
  line-height: 1.6;
`

const SectionGrid = styled.section`
  display: grid;
  gap: 20px;
`

const SectionCard = styled.section`
  padding: 24px;
  border: 1px solid var(--color-border-200);
  border-radius: 24px;
  background: white;
  box-shadow: 0 10px 30px rgba(21, 73, 181, 0.08);
`

const SectionHeader = styled.div`
  display: grid;
  gap: 8px;
  margin-bottom: 18px;
`

const SectionTitle = styled.h2`
  color: var(--color-text-900);
  font-size: 24px;
  line-height: 1.2;
  letter-spacing: -0.03em;
`

const SectionBody = styled.p`
  color: var(--color-text-500);
  line-height: 1.75;
`

const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

const MetricCard = styled.article`
  padding: 20px;
  border: 1px solid var(--color-border-200);
  border-radius: 20px;
  background: var(--color-surface-muted);
`

const MetricTitle = styled.h3`
  color: var(--color-text-900);
  font-size: 18px;
  line-height: 1.3;
`

const MetricValue = styled.p`
  margin-top: 8px;
  color: var(--color-text-900);
  font-size: 26px;
  font-weight: 700;
  line-height: 1.3;
`

const MetricHelper = styled.p`
  margin-top: 8px;
  color: var(--color-text-500);
  line-height: 1.7;
`

const FranchiseGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`

const FranchiseCard = styled.article`
  padding: 20px;
  border: 1px solid var(--color-border-200);
  border-radius: 20px;
  background: var(--color-surface-muted);
`

const FranchiseTitle = styled.h3`
  color: var(--color-text-900);
  font-size: 18px;
  line-height: 1.3;
`

const FranchiseCost = styled.p`
  margin-top: 8px;
  color: var(--color-primary-700);
  font-size: 22px;
  font-weight: 700;
`

const FranchiseMeta = styled.p`
  margin-top: 8px;
  color: var(--color-text-500);
  line-height: 1.75;
`

type SimulationReportViewProps = {
  eyebrow: string
  title: string
  description: string
  request: SimulationReportRequest
  report: SimulationReport
  backHref: string
  compareHref?: string | null
  notice?: {
    tone: 'error' | 'info' | 'success'
    text: string
  } | null
  onSave?: () => void
  onShare?: () => void
  savePending?: boolean
  sharePending?: boolean
}

export default function SimulationReportView({
  eyebrow,
  title,
  description,
  request,
  report,
  backHref,
  compareHref,
  notice,
  onSave,
  onShare,
  savePending = false,
  sharePending = false,
}: SimulationReportViewProps) {
  const dominantGender =
    report.genderAndAgeAnalysisInfo.femaleSalesPercent >
    report.genderAndAgeAnalysisInfo.maleSalesPercent
      ? '여성'
      : '남성'

  return (
    <Page>
      <Hero>
        <Eyebrow>{eyebrow}</Eyebrow>
        <Title>{title}</Title>
        <Body>{description}</Body>
        <MetaRow>
          <MetaBadge>{request.gugun}</MetaBadge>
          <MetaBadge>{request.serviceCodeName}</MetaBadge>
          <MetaBadge>{request.storeSize}㎡</MetaBadge>
          <MetaBadge>{request.floor}</MetaBadge>
          <MetaBadge>
            {request.isFranchisee
              ? request.brandName || '프랜차이즈'
              : '개인 창업'}
          </MetaBadge>
        </MetaRow>
        <ActionRow>
          {onShare ? (
            <PrimaryButton
              type="button"
              onClick={onShare}
              disabled={sharePending}
            >
              {sharePending ? '공유 링크 생성 중...' : '카카오 공유하기'}
            </PrimaryButton>
          ) : null}
          {onSave ? (
            <PrimaryButton
              type="button"
              onClick={onSave}
              disabled={savePending}
            >
              {savePending ? '저장 중...' : '시뮬레이션 저장'}
            </PrimaryButton>
          ) : null}
          {compareHref ? (
            <SecondaryLink href={compareHref}>비교하기</SecondaryLink>
          ) : null}
          <SecondaryLink href={backHref}>입력 화면으로 돌아가기</SecondaryLink>
        </ActionRow>
        {notice ? <Notice $tone={notice.tone}>{notice.text}</Notice> : null}
      </Hero>

      <SummaryGrid>
        <SummaryCard>
          <SummaryLabel>전체 창업 비용</SummaryLabel>
          <SummaryValue>{formatLargeWon(report.totalPrice)}</SummaryValue>
          <SummaryHelper>
            권리금, 보증금, 인테리어, 임대료를 포함한 추정치입니다.
          </SummaryHelper>
        </SummaryCard>
        <SummaryCard>
          <SummaryLabel>권리금</SummaryLabel>
          <SummaryValue>
            {formatLargeWon(report.keyMoneyInfo.keyMoney)}
          </SummaryValue>
          <SummaryHelper>
            권리금 비중 {report.keyMoneyInfo.keyMoneyRatio.toFixed(1)}%
          </SummaryHelper>
        </SummaryCard>
        <SummaryCard>
          <SummaryLabel>주요 타깃 성별</SummaryLabel>
          <SummaryValue>{dominantGender}</SummaryValue>
          <SummaryHelper>
            남성 {report.genderAndAgeAnalysisInfo.maleSalesPercent.toFixed(1)}%
            {' · '}여성{' '}
            {report.genderAndAgeAnalysisInfo.femaleSalesPercent.toFixed(1)}%
          </SummaryHelper>
        </SummaryCard>
        <SummaryCard>
          <SummaryLabel>성수기 / 비수기</SummaryLabel>
          <SummaryValue>
            {report.monthAnalysisInfo.peakSeasons.join(', ')}월
          </SummaryValue>
          <SummaryHelper>
            비수기 {report.monthAnalysisInfo.offPeakSeasons.join(', ')}월
          </SummaryHelper>
        </SummaryCard>
      </SummaryGrid>

      <SectionGrid>
        <SectionCard>
          <SectionHeader>
            <SectionTitle>상세 비용</SectionTitle>
            <SectionBody>
              임대료, 보증금, 인테리어, 권리금과 프랜차이즈 부담금을 분리해서
              확인합니다.
            </SectionBody>
          </SectionHeader>
          <MetricGrid>
            <MetricCard>
              <MetricTitle>임대료</MetricTitle>
              <MetricValue>
                {formatLargeWon(report.detail.rentPrice)}
              </MetricValue>
            </MetricCard>
            <MetricCard>
              <MetricTitle>보증금</MetricTitle>
              <MetricValue>{formatLargeWon(report.detail.deposit)}</MetricValue>
            </MetricCard>
            <MetricCard>
              <MetricTitle>인테리어 비용</MetricTitle>
              <MetricValue>
                {formatLargeWon(report.detail.interior)}
              </MetricValue>
            </MetricCard>
            <MetricCard>
              <MetricTitle>가맹 부담금</MetricTitle>
              <MetricValue>
                {report.detail.levy === null
                  ? '없음'
                  : formatLargeWon(report.detail.levy)}
              </MetricValue>
              <MetricHelper>
                개인 창업이면 0원으로 계산될 수 있습니다.
              </MetricHelper>
            </MetricCard>
          </MetricGrid>
        </SectionCard>

        <SectionCard>
          <SectionHeader>
            <SectionTitle>유입 타깃 분석</SectionTitle>
            <SectionBody>
              레거시 리포트의 성별/연령 분석과 성수기 분석을 한 화면에
              묶었습니다.
            </SectionBody>
          </SectionHeader>
          <MetricGrid>
            <MetricCard>
              <MetricTitle>주요 연령대 1위</MetricTitle>
              <MetricValue>
                {report.genderAndAgeAnalysisInfo.first.name}
              </MetricValue>
              <MetricHelper>
                추정 매출{' '}
                {formatLargeWon(report.genderAndAgeAnalysisInfo.first.sales)}
              </MetricHelper>
            </MetricCard>
            <MetricCard>
              <MetricTitle>주요 연령대 2위</MetricTitle>
              <MetricValue>
                {report.genderAndAgeAnalysisInfo.second.name}
              </MetricValue>
              <MetricHelper>
                추정 매출{' '}
                {formatLargeWon(report.genderAndAgeAnalysisInfo.second.sales)}
              </MetricHelper>
            </MetricCard>
            <MetricCard>
              <MetricTitle>주요 연령대 3위</MetricTitle>
              <MetricValue>
                {report.genderAndAgeAnalysisInfo.third.name}
              </MetricValue>
              <MetricHelper>
                추정 매출{' '}
                {formatLargeWon(report.genderAndAgeAnalysisInfo.third.sales)}
              </MetricHelper>
            </MetricCard>
            <MetricCard>
              <MetricTitle>권리금 등급</MetricTitle>
              <MetricValue>
                Level {report.keyMoneyInfo.keyMoneyLevel}
              </MetricValue>
              <MetricHelper>
                비수기 {report.monthAnalysisInfo.offPeakSeasons.join(', ')}월
              </MetricHelper>
            </MetricCard>
          </MetricGrid>
        </SectionCard>

        <SectionCard>
          <SectionHeader>
            <SectionTitle>유사 프랜차이즈 추천</SectionTitle>
            <SectionBody>
              레거시와 동일하게 총 창업 비용이 비슷한 프랜차이즈 후보를 함께
              보여줍니다.
            </SectionBody>
          </SectionHeader>
          <FranchiseGrid>
            {report.franchisees.map(item => (
              <FranchiseCard key={`${item.brandName}-${item.totalPrice}`}>
                <FranchiseTitle>{item.brandName}</FranchiseTitle>
                <FranchiseCost>{formatLargeWon(item.totalPrice)}</FranchiseCost>
                <FranchiseMeta>
                  가입비 {formatLargeWon(item.subscription)}
                  <br />
                  교육비 {formatLargeWon(item.education)}
                  <br />
                  보증금 {formatLargeWon(item.deposit)}
                  <br />
                  기타 {formatLargeWon(item.etc)}
                  <br />
                  인테리어 {formatLargeWon(item.interior)}
                </FranchiseMeta>
              </FranchiseCard>
            ))}
          </FranchiseGrid>
        </SectionCard>

        <Notice>
          실제 계약 조건, 점포 공실 상태, 권리금 협상, 인테리어 범위에 따라
          비용은 달라질 수 있습니다. 이 리포트는 창업 의사결정을 위한 비교
          기준으로 활용해 주세요.
        </Notice>
      </SectionGrid>
    </Page>
  )
}
