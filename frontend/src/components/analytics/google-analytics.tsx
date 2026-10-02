import Script from 'next/script'
import AnalyticsClickTracker from '@/components/analytics/analytics-click-tracker'
import { env } from '@/lib/env'

/**
 * GA4 태그. 측정 ID 가 없으면 아무것도 렌더하지 않는다 — 로컬·PR 빌드·ID 를 아직 넣지 않은
 * 환경은 수집이 0 이다(docs/features/home/measurement-and-deep-link.md D1).
 *
 * `page_view` 는 `config` 의 첫 1회와 GA4 향상된 측정(브라우저 기록 이벤트)이 맡는다.
 * App Router 이동마다 코드에서 다시 쏘면 두 번 집계된다.
 */
/**
 * GA4 측정 ID 형식. 값이 인라인 스크립트에 들어가므로 형식이 다르면(오타·다른 키를 붙여
 * 넣음) 태그를 싣지 않는다 — 잘못된 ID 로 조용히 아무 데도 안 쌓이는 것보다 낫다.
 */
const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/

export const isValidMeasurementId = (value: string) =>
  GA_MEASUREMENT_ID_PATTERN.test(value)

/**
 * `gtag` 초기화 스크립트.
 *
 * Google 신호·광고 개인화 신호를 **코드에서** 끈다. 개인정보 처리방침 제9조가 「광고 목적으로
 * 쓰지 않고 Google 신호를 켜지 않는다」고 적었는데, GA 관리 화면 설정에만 기대면 누가 켜도
 * 문서가 조용히 거짓이 된다. 관리 화면 설정과 별개로 태그가 그 약속을 지킨다.
 */
export const buildGaInitScript = (measurementId: string) =>
  `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', ${JSON.stringify(measurementId)}, { allow_google_signals: false, allow_ad_personalization_signals: false });`

export default function GoogleAnalytics({
  measurementId = env.gaMeasurementId,
}: {
  measurementId?: string
}) {
  if (!isValidMeasurementId(measurementId)) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {buildGaInitScript(measurementId)}
      </Script>
      <AnalyticsClickTracker />
    </>
  )
}
