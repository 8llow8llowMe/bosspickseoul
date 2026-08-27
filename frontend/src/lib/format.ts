export const formatDateTime = (dateTime: string) => {
  const date = new Date(dateTime)

  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

/**
 * 시뮬레이션 금액 포매터. **입력 단위는 만원**이다 — 백엔드가 만원으로 준다.
 * 원 단위 포매터를 쓰면 정확히 1만 배 틀린다(DESIGN.md S-SIM-2).
 *
 * 축약이 아니라 자릿수 구분이다. `2,733,782` 만원은 `273억 3,782만원` 으로, 만원 자리까지
 * 그대로 보존한다. 데이터 자체가 만원 단위라 이것이 이 화면에서 가능한 가장 정확한 표기다.
 *
 * - `0` 은 `0만원` 이 아니라 **`0원`**. S-SIM-2 가 가맹 부담금 `0` 을 "0원"으로 못박았고,
 *   `null`(해당 없음)과 구분되는 자리라 문구가 자연스러워야 한다.
 * - 억 자리가 딱 떨어지면 만원 자리를 붙이지 않는다 — `1억 0만원` 은 사람이 쓰지 않는다.
 */
export const formatLargeWon = (amount: number) => {
  if (amount === 0) {
    return '0원'
  }

  if (amount >= 10000) {
    const billions = Math.floor(amount / 10000)
    const millions = amount % 10000

    return millions === 0
      ? `${billions.toLocaleString()}억`
      : `${billions.toLocaleString()}억 ${millions.toLocaleString()}만원`
  }

  return `${amount.toLocaleString()}만원`
}
