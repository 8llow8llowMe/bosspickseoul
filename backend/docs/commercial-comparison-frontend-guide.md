# 상권 비교 API 프론트엔드 표시 가이드

## 적용 API

- 전체 비교: `GET /api/v1/commercials/compare`

이 문서는 상권 비교 화면이 사용하는 전체 비교 API의 표시 규칙을 설명한다. 전체 비교 응답에는 조회 조건과 지표 그룹의 해석 기준이 추가된다.

`GET /api/v1/commercials/compare-preview`는 commercial-service 내부용 숨김 API이므로 프론트에서 직접 호출하지 않는다. 이 내부 응답의 `headlineMetrics`에는
같은 지표 항목 메타데이터가 포함되지만, 공개 지도 프리뷰 `GET /api/v1/map/commercials/compare-preview`의 응답 계약에는 이번 변경이 적용되지 않는다.

기존 `leftValue`, `rightValue`, `diffValue`, `diffRate`, `winnerSide`의 타입과 계산값은 바뀌지 않는다. 새 필드는 모두 추가 필드다.

## 추가 응답 필드

전체 비교 응답 최상위에 다음 필드가 추가된다.

| 필드 | 의미 |
| --- | --- |
| `periodCode` | 실제 조회에 사용한 분기 코드 |
| `serviceCode` | 실제 조회에 사용한 서비스 업종 코드 |
| `comparisonGuide.periodBasis` | 기간 기준 안내 |
| `comparisonGuide.serviceBasis` | 선택 업종 지표와 상권 전체 지표의 범위 안내 |
| `comparisonGuide.differenceBasis` | `diffValue` 계산 및 단위 안내 |
| `comparisonGuide.diffRateBasis` | `diffRate` 계산식과 0 처리 안내 |
| `comparisonGuide.recommendationDisclaimer` | 추천 결과와 원천 데이터 이용 시 주의사항 |
| `comparisonGuide.metricGroups` | 기존 지표 배열 필드별 설명 |

모든 `ComparisonMetricItem`에는 다음 필드가 추가된다.

| 필드 | 예시 | 사용법 |
| --- | --- | --- |
| `unit` | `원`, `명`, `건`, `개`, `%` | `leftValue`, `rightValue` 뒤에 표시 |
| `displayPrecision` | `0`, `1` | 화면에 표시할 소수 자릿수 |
| `differenceUnit` | `원`, `명`, `건`, `개`, `%p` | `diffValue` 뒤에 표시 |
| `description` | `선택 분기의 요일별 매출액을 합산한 값입니다.` | 지표명 옆 도움말 또는 툴팁에 표시 |

`unit`, `differenceUnit`, `displayPrecision`은 백엔드가 각 지표를 생성할 때 명시한다. 프론트에서 한글 `label`을 분석해 단위를 추측하지 않는다.

## 전체 비교 응답 예시

아래 JSON은 공통 응답 래퍼의 `dataBody` 안에서 이 기능에 관련된 필드만 추린 예시다.

```json
{
  "periodCode": "20233",
  "serviceCode": "CS100001",
  "comparisonGuide": {
    "periodBasis": "모든 지표는 선택한 분기의 데이터를 기준으로 합니다.",
    "serviceBasis": "매출·점포 지표는 선택 업종 기준이며, 유동인구·소득·거주인구·시설은 상권 전체 기준입니다.",
    "differenceBasis": "차이는 왼쪽 상권 값에서 오른쪽 상권 값을 뺀 값입니다. 비율 차이는 %p로 표시합니다.",
    "diffRateBasis": "차이율은 오른쪽 상권 값을 기준으로 계산합니다. 오른쪽 값이 0이면 차이율을 계산할 수 없습니다.",
    "recommendationDisclaimer": "추천은 핵심 지표의 단순 우위 개수를 비교한 참고 결과이며 수익이나 창업 성과를 보장하지 않습니다. 원천 데이터에서 제공하지 않는 값도 0일 수 있습니다.",
    "metricGroups": [
      {
        "code": "salesMetrics",
        "name": "매출",
        "description": "선택 업종의 매출액과 매출 건수를 비교합니다."
      }
    ]
  },
  "salesMetrics": [
    {
      "label": "총 매출액",
      "leftValue": 43267840.0,
      "rightValue": 293433501.0,
      "diffValue": -250165661.0,
      "diffRate": -85.25463525720602,
      "unit": "원",
      "displayPrecision": 0,
      "differenceUnit": "원",
      "description": "선택 분기의 요일별 매출액을 합산한 값입니다.",
      "winnerSide": {
        "code": "RIGHT",
        "name": "우측 우세",
        "description": "우측 상권이 우세합니다."
      }
    }
  ],
  "footTrafficMetrics": [
    {
      "label": "여성 유동인구 비중",
      "leftValue": 53.8,
      "rightValue": 52.9,
      "diffValue": 0.9,
      "diffRate": 1.701323,
      "unit": "%",
      "displayPrecision": 1,
      "differenceUnit": "%p",
      "description": "선택 분기 유동인구의 여성 연령대별 비중을 합산한 값입니다.",
      "winnerSide": {
        "code": "LEFT",
        "name": "좌측 우세",
        "description": "좌측 상권이 우세합니다."
      }
    }
  ]
}
```

## 지표 그룹 코드

`comparisonGuide.metricGroups[].code`는 해당 지표 배열의 JSON 필드명과 같다.

| code | 범위 |
| --- | --- |
| `salesMetrics` | 선택 업종 매출액·매출 건수 |
| `footTrafficMetrics` | 상권 전체 유동인구·성별 비중 |
| `storeMetrics` | 선택 업종 조회 데이터의 점포·개폐업 지표 |
| `spendingMetrics` | 상권 전체 소득·소비 지출 |
| `residentPopulationMetrics` | 상권 전체 거주인구·성별 비중 |
| `facilityMetrics` | 상권 내 생활·교육·교통 시설 |
| `salesTimeSlotMetrics` | 선택 업종 시간대별 매출액 |
| `salesAgeMetrics` | 선택 업종 연령대별 매출액 |
| `salesAgeGenderMetrics` | 선택 업종 연령·성별 매출 비중 |
| `footTrafficTimeSlotMetrics` | 상권 전체 시간대별 유동인구 |
| `footTrafficAgeMetrics` | 상권 전체 연령대별 유동인구 |
| `footTrafficAgeGenderMetrics` | 상권 전체 연령·성별 유동인구 비중 |

## 표시 규칙

값은 `Intl.NumberFormat("ko-KR")`에 `displayPrecision`을 적용하고 `unit`을 붙인다. 예를 들어 `293433501`, `원`, `0`은 `293,433,501원`, `53.8`, `%`, `1`은 `53.8%`로 표시한다.

```ts
function formatMetric(value: number, unit: string, precision: number) {
  return `${new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(value)}${unit}`;
}
```

금액을 `2억 9,343만원`처럼 줄여 보여줄 수 있지만, 반올림·절삭으로 정확한 비교값이 가려지지 않도록 원 단위 전체 값을 툴팁이나 보조 텍스트로 함께 제공한다.

차이 열은 `diffValue`와 `differenceUnit`을 사용한다. 비중·비율 지표에서 `leftValue=53.8`, `rightValue=52.9`이면 `diffValue`는 `+0.9%p`다. `diffRate=+1.7%`는 우측 값을 기준으로 계산한 상대 차이율이므로 `%p`와 바꿔 쓰지 않는다. 기본 표는 수치를 중립적으로 보여주고, 우세 여부가 필요한 별도 요약에서 `winnerSide.code`를 사용한다.

## 0과 누락값 처리

- 현재 수치 필드는 primitive 숫자이므로 API에서 `null` 대신 `0`이 올 수 있다.
- `rightValue=0`이면 0으로 나눌 수 없어 `diffRate`가 호환용 sentinel `0`으로 내려간다. 이때 `leftValue` 또는 `diffValue`가 0이 아니면 `0% 차이`로 표시하지 말고 상대 차이율을 숨기거나 `비교 불가`로 표시한다.
- 일부 연도의 소비 데이터 원천은 특정 소득 관련 값을 제공하지 않아 0으로 노출될 수 있다. 0만 보고 실제 값이 없다고 단정하거나 실제 0이라고 단정하지 않는다. 화면에는 `recommendationDisclaimer`를 함께 노출한다.
- `description`과 `comparisonGuide`는 표시 안내이며 숫자 자체를 대체하지 않는다. 계산·정렬이 필요하면 기존 원시 숫자 필드를 사용한다.
- 서버가 순차 배포되는 동안 추가 필드가 없는 응답을 받을 수 있다. `unit`, `differenceUnit`, `description`, `comparisonGuide`가 없으면 기존 표시 방식을 유지하고,
  숫자에는 `Number.isFinite` 검사를 적용한다. 새 필드가 있는 응답부터 메타데이터 기반 표시를 사용한다.

## 추천 문구

`recommendedReasons`의 숫자는 백엔드에서 천 단위 구분자와 단위를 포함한 문자열로 제공한다. 예: `293,433,501원`. 프론트에서 이 문자열을 숫자로 다시 파싱하지 않는다. 추천 알고리즘은 기존과 같으며, 화면에는 `comparisonGuide.recommendationDisclaimer`를 추천 결과 근처에 표시한다.
