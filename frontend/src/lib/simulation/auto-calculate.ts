/**
 * 입력 화면의 **자동 계산** 판정(#604). 화면·React·네트워크를 모르는 순수 함수다.
 *
 * 계산은 원래 수동 버튼이었고, 1023px 이하에서는 계산 전 결과 패널이 숨어 마지막 한 탭(「계산하기」)에서
 * 멈추는 사용자가 생겼다. 그래서 조건이 모두 정해지는 순간 계산한다. 버튼은 「다시 계산」으로 남는다.
 *
 * ## 「정해졌다」는 펼친 단계가 없다는 뜻이다
 *
 * 조건 완성(`gap === null`)만 보면 면적을 치는 동안 `6` 에서 계산이 나간다 — 층을 먼저 고른 사람은 첫
 * 글자에 조건이 완성된다. 입력 화면은 이미 「진행 시점」을 갖고 있다: 칩 선택·면적 Enter·blur 에서만
 * 단계를 접고, 치는 동안은 그 단계를 붙잡는다(`simulation-builder-page.tsx`). 그래서 **펼친 단계가
 * 하나도 없을 때**(`openSection === null`)를 「정해졌다」로 본다. 끝난 단계를 들여다보려고 펼친 동안에도
 * 계산하지 않는다 — 다른 값을 고르면 다시 접히며 그때 계산한다.
 *
 * ## 같은 조건으로 두 번 보내지 않는다
 *
 * 마지막으로 요청한 조건의 키(`lastRequestedKey`)와 지금 키가 같으면 보내지 않는다. 오류가 나도 같은
 * 조건이면 다시 쏘지 않는다(되풀이 루프 방지) — 다시 보내는 것은 사용자가 「다시 계산」을 누를 때뿐이다.
 * 요청 중이면 기다린다. 끝나고 나서 키가 여전히 다르면 그때 보낸다.
 *
 * 진입할 때 이미 완성된 조건(리포트에서 되돌아옴·새로고침·링크)은 그 키를 「요청한 것」으로 보고
 * 시작한다. 진입만으로 POST 를 보내지 않는다 — 리포트에서 되돌아온 사람은 방금 그 결과를 봤다.
 */

import { formatLargeWon } from '@/lib/format'
import {
  isSimulationConditionsComplete,
  type SimulationConditionSection,
  type SimulationConditionState,
} from '@/lib/simulation/conditions'

/**
 * 조건이 모두 정해진 뒤 계산을 보내기까지 기다리는 시간(ms). 칩을 연달아 바꾸는 동안 요청이 겹쳐
 * 나가지 않게 하는 짧은 디바운스다. 길면 「골랐는데 반응이 없다」로 읽힌다.
 */
export const SIMULATION_AUTO_CALCULATE_DELAY_MS = 300

/**
 * 계산 조건의 비교 키. **완성되지 않았으면 null.** 표시용 `brandName` 은 넣지 않는다 — 이름만 달라도
 * 계산은 같다(`isSameSimulationReportRequest` 와 같은 기준). 분기(`periodCode`)도 넣지 않는다 — 분기는
 * 사용자가 고르는 조건이 아니고, 카탈로그가 늦게 오면 진입 직후 키가 바뀌어 진입만으로 계산이 나간다.
 */
export const simulationConditionKey = (
  state: SimulationConditionState,
): string | null => {
  if (!isSimulationConditionsComplete(state)) return null

  return [
    state.franchisee ? 'franchise' : 'independent',
    state.franchisee ? (state.franchiseeId ?? '') : '',
    state.districtCode,
    state.serviceCode,
    state.storeSize,
    state.floorType,
  ].join('|')
}

export type SimulationAutoCalculateInput = {
  /** 지금 조건의 키. 미완성이면 null. */
  conditionKey: string | null
  /** 마지막으로 계산을 보낸(또는 진입 때 이미 완성돼 있던) 조건의 키. */
  lastRequestedKey: string | null
  /** 지금 펼쳐진 단계. 없으면 null — 입력이 끝났다는 뜻이다. */
  openSection: SimulationConditionSection | null
  isPending: boolean
}

/** 지금 자동 계산을 보내야 하는가. */
export const shouldAutoCalculate = ({
  conditionKey,
  lastRequestedKey,
  openSection,
  isPending,
}: SimulationAutoCalculateInput): boolean =>
  conditionKey !== null &&
  conditionKey !== lastRequestedKey &&
  openSection === null &&
  !isPending

/**
 * 계산 버튼 라벨. 지금 조건으로 이미 계산을 보냈으면(결과·오류가 이 조건의 것이면) 「다시 계산」이다 —
 * 오류 뒤처럼 버튼이 다시 보일 때 「계산하기」라고 하면 아직 계산하지 않은 것으로 읽힌다. 진입 때 이미
 * 완성돼 있던 조건은 이 화면에서 아직 계산하지 않았으므로 「계산하기」다.
 */
export const describeSimulationCalculateLabel = (
  requestedCurrent: boolean,
): '계산하기' | '다시 계산' => (requestedCurrent ? '다시 계산' : '계산하기')

/** 자동 계산을 시작할 때 낭독하는 문장. 결과 패널의 안내 줄과 같은 문장을 쓴다. */
export const SIMULATION_CALCULATING_MESSAGE =
  '고른 조건으로 예상 창업 비용을 계산하고 있어요'

/**
 * 계산 상태 낭독 문장(#604 리뷰). 버튼을 누르지 않아도 계산이 시작·완료되므로, 보조기기 사용자는 화면이
 * 바뀐 것을 알 길이 없다. 입력 화면의 시각 숨김 `role="status"` 영역이 이 문장을 읽힌다.
 *
 * - 계산 중: `SIMULATION_CALCULATING_MESSAGE`
 * - 완료: `예상 총 창업 비용 2억 3,450만원`
 * - 실패·결과 없음: 빈 문자열. 실패는 오류 안내가 `role="alert"` 로 제목부터 읽히므로 여기서 다시 말하지
 *   않는다 — 두 영역이 같은 오류를 연달아 읽으면 낭독이 겹친다.
 */
export const describeSimulationCalculationStatus = ({
  isPending,
  totalPrice,
}: {
  isPending: boolean
  /** 지금 조건의 결과 총액(만원). 결과가 없으면 null. */
  totalPrice: number | null
}): string => {
  if (isPending) return SIMULATION_CALCULATING_MESSAGE
  if (totalPrice !== null) {
    return `예상 총 창업 비용 ${formatLargeWon(totalPrice)}`
  }
  return ''
}
