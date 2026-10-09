/**
 * 요약 「점포당 월 매출」 카드와 핵심 지표 결론 문장(#561). 네트워크도 React 도 모른다.
 *
 * 요약의 매출 값(`totalSalesAmount`)은 상권 안 그 업종 **전체 합계**다. 라벨이 「월 매출」 하나라
 * 한 가게 매출로 읽혔다(홍대 걷고싶은 거리 · 커피-음료: 26억 3527만원 = 점포 59개 합계, 한 곳당
 * 약 4466만원). 그래서 첫 숫자는 점포당 값으로 두고, 합계는 분모(업종 전체)를 밝혀 캡션으로 내린다.
 * AI 리포트 지표 카드(`report-section-state`)도 같은 함수로 값을 낸다.
 *
 * **점포 수 0 · 합계 > 0** 은 원천 불일치다. 매출과 점포 수가 서로 다른 원천(서울시 상권 추정매출 ·
 * 상권 점포)에서 와서, 매출은 잡혔는데 점포 행이 0 인 상권이 있다(BE `CommercialSalesPerStoreProcessor`).
 * 이때 「점포가 없어요」라고 적으면 바로 옆 「매출의 X%」와 모순되므로 점포 수를 모른다고 적는다.
 */

import { formatKoreanMoney } from '@/lib/analysis/presentation'

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

/** 점포 수 0 인데 매출 합계가 잡힌 원천 불일치. */
const hasSalesWithoutStores = (
  monthlySales: number | null | undefined,
  storeCount: number | null | undefined,
): boolean =>
  storeCount === 0 && isFiniteNumber(monthlySales) && monthlySales > 0

/**
 * 점포당 월 매출(원).
 *
 * 1. 서버 `monthlySalesPerStore`(`/benchmarks`, 원 단위 HALF_UP)가 이미 와 있으면 그 값.
 *    요약은 이 값을 **새로 부르지 않는다** — 지역 평균 대비 탭이 받아 둔 캐시가 있을 때만 쓴다.
 * 2. 없으면 `monthlySales ÷ storeCount`. 분모는 프랜차이즈를 포함한 이 업종 전체 점포 수
 *    (`similarStoreCount`)다 — 서버 점포당 값과 같은 분모다(#485).
 *
 * 점포 수가 0 이면 나눌 수 없어 null 이다(서버도 0 점포는 null 로 준다). 0 원으로 적지 않는다.
 */
export const resolveMonthlySalesPerStore = ({
  monthlySalesPerStore,
  monthlySales,
  storeCount,
}: {
  monthlySalesPerStore?: number | null
  monthlySales?: number | null
  storeCount?: number | null
}): number | null => {
  if (isFiniteNumber(monthlySalesPerStore) && monthlySalesPerStore >= 0) {
    return monthlySalesPerStore
  }
  if (!isFiniteNumber(monthlySales) || !isFiniteNumber(storeCount)) return null
  if (storeCount <= 0) return null
  return monthlySales / storeCount
}

/**
 * 카드 캡션 — 합계와 그 분모. 「커피-음료 전체 26억 3527만원」.
 * 업종 이름을 아직 못 받았으면 「이 업종 전체」로 적는다(코드를 넣지 않는다). 합계가 없으면 null.
 */
export const describeTotalSalesCaption = (
  serviceName: string | null | undefined,
  monthlySales: number | null | undefined,
): string | null => {
  if (!isFiniteNumber(monthlySales)) return null
  return `${serviceName?.trim() || '이 업종'} 전체 ${formatKoreanMoney(monthlySales)}`
}

/**
 * 「점포당 월 매출」 카드가 값 대신 적을 말. 그 밖에는 null(카드 기본 표기 「데이터 없음」).
 *
 * - 점포 0 · 합계 > 0 → 「점포 수 집계 없음」(원천 불일치 — 점포가 없다고 단정하지 않는다)
 * - 점포 0 · 합계 0 또는 결측 → 「점포 없음」(결측 「데이터 없음」과 다른 사실)
 */
export const describeSalesPerStoreEmpty = (
  storeCount: number | null | undefined,
  monthlySales: number | null | undefined,
): string | null => {
  if (storeCount !== 0) return null
  return hasSalesWithoutStores(monthlySales, storeCount)
    ? '점포 수 집계 없음'
    : '점포 없음'
}

/**
 * 핵심 지표 결론 문장의 첫 문장.
 *
 * - 「홍대 걷고싶은 거리의 커피-음료 점포 59개가 한 곳당 월 평균 약 4466만원어치를 팔아요.」
 * - 점포 있음 · 합계(점포당) 0: 「…의 커피-음료 점포 4개가 있지만 이 분기 매출이 잡히지 않았어요.」
 * - 점포 0 · 합계 0 또는 결측: 「홍대 걷고싶은 거리에는 커피-음료 점포가 없어요.」
 * - 점포 0 · 합계 > 0(원천 불일치): undefined — 점포에 대해 말할 수 있는 것이 없다. 비중 문장만 남는다.
 * - 업종 이름·점포 수·점포당 값 중 하나라도 없으면 undefined(지어내지 않는다).
 *
 * 점포 수 단위는 「개」다 — 같은 화면의 「점포 수 59개」·「같은 업종 점포가 59개 있어요」와 맞춘다.
 * **조사는 변수 바로 뒤에 붙이지 않는다.** 상권·업종 이름은 받침을 알 수 없어서 「의」·「에는」
 * (받침과 무관한 조사)나 고정 명사(「점포」)만 잇는다. 「개가」·「원어치를」은 고정 글자 뒤라 안전하다.
 */
export const describeSalesPerStoreSentence = ({
  commercialName,
  serviceName,
  storeCount,
  monthlySales,
  salesPerStore,
}: {
  commercialName?: string | null
  serviceName?: string | null
  storeCount?: number | null
  monthlySales?: number | null
  salesPerStore: number | null
}): string | undefined => {
  const service = serviceName?.trim()
  if (!service || !isFiniteNumber(storeCount)) return undefined
  const place = commercialName?.trim() || '이 상권'

  if (storeCount === 0) {
    return hasSalesWithoutStores(monthlySales, storeCount)
      ? undefined
      : `${place}에는 ${service} 점포가 없어요.`
  }
  if (storeCount < 0 || salesPerStore === null) return undefined

  const stores = `${place}의 ${service} 점포 ${storeCount.toLocaleString('ko-KR')}개`
  if (salesPerStore === 0) {
    return `${stores}가 있지만 이 분기 매출이 잡히지 않았어요.`
  }
  return `${stores}가 한 곳당 월 평균 약 ${formatKoreanMoney(salesPerStore)}어치를 팔아요.`
}

/**
 * 핵심 지표 결론 문장의 둘째 문장 — 행정동 안 비중.
 * 「서교동 전체 커피-음료 매출의 9.8%가 이 상권에서 나와요.」
 *
 * 비중은 0~1(호출부 `toShareRatio`). 범위 밖이거나 행정동·업종 이름이 없으면 undefined.
 */
export const describeSalesShareSentence = ({
  administrationName,
  serviceName,
  share,
}: {
  administrationName?: string | null
  serviceName?: string | null
  share: number | null | undefined
}): string | undefined => {
  const administration = administrationName?.trim()
  const service = serviceName?.trim()
  if (!administration || !service) return undefined
  if (!isFiniteNumber(share) || share < 0 || share > 1) return undefined

  const percent = new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: 1,
  }).format(share * 100)
  return `${administration} 전체 ${service} 매출의 ${percent}%가 이 상권에서 나와요.`
}
