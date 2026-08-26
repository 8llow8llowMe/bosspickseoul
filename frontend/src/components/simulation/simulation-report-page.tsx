'use client'

import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import styled from 'styled-components'
import { createSimulationShareLink } from '@/lib/api/share'
import {
  createSimulationReport,
  saveSimulationReport,
} from '@/lib/api/simulation-v1-legacy'
import { env } from '@/lib/env'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import { loadKakaoSdk } from '@/lib/kakao'
import { siteConfig } from '@/lib/site'
import { useAuthStore } from '@/stores/auth-store'
import type {
  SimulationReportRequest,
  SimulationSaveRequest,
} from '@/types/simulation-v1-legacy'
import SimulationReportView from './simulation-report-view'

const EmptyState = styled.div`
  width: min(720px, calc(100% - 48px));
  margin: 72px auto;
  padding: 32px 24px;
  border: 1px dashed var(--color-border-300);
  border-radius: var(--radius-card);
  background: white;
  color: var(--color-text-500);
  line-height: 1.8;
`

const parseBoolean = (value: string | null) => {
  if (value === 'true') return true
  if (value === 'false') return false
  return null
}

const copyShareUrl = async (url: string) => {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(url)
    return true
  }

  return false
}

type SimulationReportPageProps = {
  basePath: '/analysis/simulation' | '/simulation'
}

export default function SimulationReportPage({
  basePath,
}: SimulationReportPageProps) {
  const searchParams = useSearchParams()
  const hasHydrated = useAuthStore(state => state.hasHydrated)
  const isLoggedIn = useAuthStore(state => state.isLoggedIn)
  const [notice, setNotice] = useState<{
    tone: 'error' | 'info' | 'success'
    text: string
  } | null>(null)

  const request: SimulationReportRequest = {
    isFranchisee: parseBoolean(searchParams.get('isFranchisee')),
    brandName: searchParams.get('brandName') || null,
    gugun: searchParams.get('gugun') ?? '',
    serviceCode: searchParams.get('serviceCode') ?? '',
    serviceCodeName: searchParams.get('serviceCodeName') ?? '',
    storeSize: Number(searchParams.get('storeSize') ?? 0),
    floor: searchParams.get('floor') ?? '',
  }

  const hasRequest =
    Boolean(request.gugun) &&
    Boolean(request.serviceCode) &&
    Boolean(request.serviceCodeName) &&
    request.storeSize > 0 &&
    Boolean(request.floor) &&
    request.isFranchisee !== null

  const reportQuery = useQuery({
    queryKey: [
      'simulationReport',
      request.gugun,
      request.serviceCode,
      request.serviceCodeName,
      request.isFranchisee,
      request.brandName,
      request.storeSize,
      request.floor,
    ],
    queryFn: () => createSimulationReport(request),
    enabled: hasRequest,
  })

  const saveMutation = useMutation({
    mutationFn: saveSimulationReport,
    onSuccess: response => {
      if (isApiSuccess(response)) {
        setNotice({
          tone: 'success',
          text: '시뮬레이션 결과를 저장했습니다.',
        })
        return
      }

      setNotice({
        tone: 'error',
        text: getApiMessage(
          response,
          '입력한 시뮬레이션 정보를 확인한 뒤 다시 저장해주세요.',
        ),
      })
    },
    onError: () => {
      setNotice({
        tone: 'error',
        text: '입력한 시뮬레이션 정보를 확인한 뒤 다시 저장해주세요.',
      })
    },
  })

  const shareMutation = useMutation({
    mutationFn: createSimulationShareLink,
    onSuccess: async response => {
      if (!isApiSuccess(response)) {
        setNotice({
          tone: 'error',
          text: getApiMessage(
            response,
            '리포트 저장 상태를 확인한 뒤 공유 링크를 다시 생성해주세요.',
          ),
        })
        return
      }

      const shareUrl = `${siteConfig.url}/share/${response.dataBody.token}`
      let sharedInKakao = false

      if (env.kakaoJavascriptKey) {
        try {
          await loadKakaoSdk()

          if (window.Kakao) {
            window.Kakao.cleanup()
            window.Kakao.init(env.kakaoJavascriptKey)
            window.Kakao.Link.sendCustom({
              templateId: 107914,
              templateArgs: {
                Server_Url: siteConfig.url,
                Path: 'share',
                Token: response.dataBody.token,
              },
            })
            sharedInKakao = true
          }
        } catch {
          sharedInKakao = false
        }
      }

      if (sharedInKakao) {
        setNotice({
          tone: 'success',
          text: '카카오톡 공유 창을 열었습니다.',
        })
        return
      }

      const copied = await copyShareUrl(shareUrl)

      setNotice({
        tone: copied ? 'success' : 'info',
        text: copied
          ? '공유 링크를 클립보드에 복사했습니다.'
          : `공유 링크가 생성되었습니다: ${shareUrl}`,
      })
    },
    onError: () => {
      setNotice({
        tone: 'error',
        text: '리포트 저장 상태를 확인한 뒤 공유 링크를 다시 생성해주세요.',
      })
    },
  })

  if (!hasRequest) {
    return (
      <EmptyState>
        리포트를 생성하기 위한 입력값이 없습니다. 시뮬레이션 입력 화면에서
        조건을 다시 선택해 주세요.
      </EmptyState>
    )
  }

  if (reportQuery.isPending) {
    return <EmptyState>창업 비용 리포트를 계산하는 중입니다.</EmptyState>
  }

  if (!reportQuery.data || !isApiSuccess(reportQuery.data)) {
    return (
      <EmptyState>
        {getApiMessage(
          reportQuery.data,
          '시뮬레이션 리포트를 생성하지 못했습니다.',
        )}
      </EmptyState>
    )
  }

  const report = reportQuery.data.dataBody

  const handleSave = () => {
    if (!hasHydrated) {
      setNotice({
        tone: 'info',
        text: '로그인 상태를 확인한 뒤 다시 시도해 주세요.',
      })
      return
    }

    if (!isLoggedIn) {
      setNotice({
        tone: 'info',
        text: '시뮬레이션 저장은 로그인 후 사용할 수 있습니다.',
      })
      return
    }

    const payload: SimulationSaveRequest = {
      totalPrice: report.totalPrice,
      isFranchisee: Boolean(request.isFranchisee),
      brandName: request.brandName,
      gugun: request.gugun,
      serviceCode: request.serviceCode,
      serviceCodeName: request.serviceCodeName,
      storeSize: request.storeSize,
      floor: request.floor,
    }

    saveMutation.mutate(payload)
  }

  const handleShare = () => {
    shareMutation.mutate({
      url: `${siteConfig.url}${basePath}/report`,
      input: request,
    })
  }

  return (
    <SimulationReportView
      eyebrow="Simulation Report"
      title={`${request.gugun} ${request.serviceCodeName} 창업 리포트`}
      description="입력한 창업 조건을 기반으로 예상 창업 비용과 타깃 유입 패턴, 유사 프랜차이즈 후보를 정리했습니다."
      request={request}
      report={report}
      backHref={basePath}
      compareHref={`${basePath}/compare`}
      notice={notice}
      onSave={handleSave}
      onShare={handleShare}
      savePending={saveMutation.isPending}
      sharePending={shareMutation.isPending}
    />
  )
}
