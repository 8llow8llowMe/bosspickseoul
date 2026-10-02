/**
 * GA4 이벤트 정의. **이름과 파라미터의 정본은 이 표 하나다**
 * (docs/features/home/measurement-and-deep-link.md D2).
 *
 * ⚠️ 개인을 식별할 수 있는 값(회원 번호·이메일·닉네임)을 파라미터로 싣지 않는다.
 * 자치구·업종 코드, 단계 번호, 버튼 종류만 싣는다 — 개인정보 처리방침 제3조가 그렇게 적었다.
 */
export type AnalyticsEventMap = {
  home_hero_cta_click: {
    cta: 'analysis' | 'status' | 'recommend' | 'window_max'
  }
  home_map_hover: { district_code: string }
  home_map_click: { district_code: string }
  home_story_step_view: { step: string }
  home_story_demo_select: {
    field: 'district' | 'industry'
    value: string
  }
  home_story_cta_click: { step: string; carried: boolean }
  home_final_cta_click: { cta: 'register' | 'analysis' }
}

export type AnalyticsEventName = keyof AnalyticsEventMap

type Gtag = (command: 'event', name: string, params?: object) => void

declare global {
  interface Window {
    gtag?: Gtag
  }
}

/**
 * 이벤트 하나를 보낸다. 측정 ID 가 없어 태그가 안 실렸으면(`window.gtag` 없음) 아무것도
 * 하지 않는다 — 로컬·PR 빌드에서 호출부가 분기할 필요가 없다.
 */
export const trackEvent = <Name extends AnalyticsEventName>(
  name: Name,
  params: AnalyticsEventMap[Name],
): void => {
  if (typeof window === 'undefined') return
  if (typeof window.gtag !== 'function') return
  window.gtag('event', name, params)
}

export const TRACK_ATTR = 'data-track'
export const TRACK_PARAMS_ATTR = 'data-track-params'

/**
 * 링크·버튼에 펼쳐 넣는 클릭 계측 속성. 문서 클릭 위임(`AnalyticsClickTracker`)이 읽는다.
 *
 * 속성으로 두는 이유: 서버 컴포넌트의 `<Link>` 에도 클라이언트 래퍼 없이 붙고, onClick 을
 * 가로채지 않아 링크 이동에 끼어들지 않는다. 이름·파라미터는 여기서 타입 검사를 받는다.
 */
export const trackAttrs = <Name extends AnalyticsEventName>(
  name: Name,
  params: AnalyticsEventMap[Name],
) => ({
  [TRACK_ATTR]: name,
  [TRACK_PARAMS_ATTR]: JSON.stringify(params),
})

/**
 * 위임 수집기가 읽은 속성 두 개를 이벤트로 되돌린다. 손으로 고친 DOM·깨진 JSON 은
 * 버린다(null) — 계측이 화면 동작을 망가뜨리면 안 된다.
 */
export const parseTrackAttrs = (
  name: string | null,
  rawParams: string | null,
): { name: string; params: Record<string, unknown> } | null => {
  if (!name) return null
  if (!rawParams) return { name, params: {} }
  try {
    const parsed: unknown = JSON.parse(rawParams)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed))
      return null
    return { name, params: parsed as Record<string, unknown> }
  } catch {
    return null
  }
}
