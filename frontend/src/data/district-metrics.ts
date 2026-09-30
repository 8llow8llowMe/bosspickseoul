// pulse/glow로 강조할 상위 상권(강남·마포·송파).
//
// 예전엔 이 파일에 25개 구의 hover 툴팁용 「대표 예시」 수치(월 매출·일 유동·추세)도 있었다.
// 툴팁이 `GET /districts/{code}` 실데이터로 바뀌면서 걷어냈다
// (docs/features/home/full-screen-sections-and-live-tooltip.md D4-5).
export const TOP_DISTRICT_CODES = ['11680', '11440', '11710'] as const
