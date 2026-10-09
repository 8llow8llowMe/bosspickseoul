/**
 * 업종 검색용 별칭. 공식 명칭(`커피-음료`, `호프-간이주점`, `제과점`)은 사람이
 * 입에 올리는 말과 달라서 「카페」「술집」「빵」 으로는 한 건도 걸리지 않았다(#571).
 *
 * 키는 서울시 상권 업종 코드다. 시뮬레이션 지원 30종과 상권분석 목록이 같은 코드를
 * 쓰므로 한 표로 세 화면(추천·시뮬레이션·분석)을 덮는다. 목록에 없는 코드의 별칭은
 * 쓰이지 않는다 — 서버가 업종을 줄이거나 늘려도 이 표가 깨지지 않는다.
 *
 * 별칭을 넣는 기준은 「그 업종을 찾는 사람이 실제로 칠 만한 말」이다. 상호(브랜드)나
 * 다른 업종과 겹치는 넓은 말(예: 가게, 집)은 넣지 않는다.
 */
export const SERVICE_ALIASES: Readonly<Record<string, readonly string[]>> = {
  CS100001: ['한식', '식당', '밥집', '백반', '국밥', '고깃집', '고기집'],
  CS100002: ['중식', '식당', '중국집', '중국음식', '짜장면', '짬뽕'],
  CS100003: ['일식', '식당', '일본음식', '초밥', '스시', '돈까스', '라멘'],
  CS100004: ['양식', '식당', '레스토랑', '파스타', '스테이크', '이탈리안'],
  CS100005: ['빵', '빵집', '베이커리', '제빵', '케이크', '케익', '디저트'],
  CS100006: ['패스트푸드', '햄버거', '버거', '피자'],
  CS100007: ['치킨집', '통닭', '닭', '닭강정'],
  CS100008: ['분식', '떡볶이', '김밥', '순대', '튀김'],
  CS100009: [
    '술집',
    '주점',
    '술',
    '바',
    '호프',
    '호프집',
    '맥주',
    '포차',
    '포장마차',
    '이자카야',
    '펍',
  ],
  CS100010: ['카페', '커피', '커피숍', '찻집', '음료', '디저트'],
  CS200001: ['학원', '교습소', '보습', '입시', '과외', '공부방'],
  CS200002: ['학원', '어학원', '영어', '영어학원', '중국어', '일본어'],
  CS200003: ['학원', '미술', '음악', '피아노', '무용', '댄스'],
  CS200005: [
    '헬스',
    '헬스장',
    '피트니스',
    '요가',
    '필라테스',
    '수영',
    '태권도',
    '골프',
    '체육관',
  ],
  CS200019: ['피씨방', '게임방'],
  CS200025: ['카센터', '정비', '정비소', '자동차정비', '수리'],
  CS200028: [
    '미용',
    '헤어',
    '헤어샵',
    '미장원',
    '이발소',
    // 네일숍·피부관리실은 서버 업종에 따로 있어 넣지 않는다.
  ],
  CS200031: ['세탁', '빨래', '빨래방', '코인세탁', '드라이클리닝', '크리닝'],
  CS200033: ['부동산', '중개', '중개사', '공인중개사', '복덕방'],
  CS200034: ['모텔', '숙박', '숙소', '호텔', '게스트하우스', '호스텔'],
  CS200037: ['노래', '코인노래방', '노래연습장', '코노'],
  CS300001: ['마트', '슈퍼', '동네마트', '식료품'],
  // cu·gs25·세븐일레븐은 브랜드 별칭이다. 위 기준의 유일한 예외 — 편의점은 브랜드 이름으로 부르는 일이 잦다.
  CS300002: ['편의', 'cu', 'gs25', '세븐일레븐'],
  CS300007: ['생선', '수산', '수산시장', '활어', '해산물', '어물'],
  CS300010: ['옷', '옷가게', '의류', '의상', '패션'],
  CS300016: ['안경원', '안경점', '렌즈', '콘택트렌즈'],
  CS300018: ['약국', '약', '약방', '의약'],
  CS300022: ['화장품가게', '뷰티', '코스메틱', '메이크업'],
  CS300025: ['자전거', '바이크', '오토바이', '킥보드'],
  // `동물` 은 뺐다 — 포함 판정에서 「동물병원」을 애완동물로 끌어온다. 이름 부분 일치로 충분하다.
  CS300029: ['펫', '펫샵', '애견', '반려동물', '강아지', '고양이'],
}

const compact = (value: string): string => value.replace(/\s+/g, '')

/** 별칭이 몇 개 업종에 걸려 있는가. `식당`·`학원` 처럼 둘 이상이면 포함 판정에서 뺀다. */
const ALIAS_OWNER_COUNT: ReadonlyMap<string, number> = (() => {
  const counts = new Map<string, number>()
  Object.values(SERVICE_ALIASES).forEach(aliases =>
    new Set(aliases).forEach(alias =>
      counts.set(alias, (counts.get(alias) ?? 0) + 1),
    ),
  )
  return counts
})()

/**
 * 완전 일치·시작 일치. 한 글자 별칭(`바`·`술`·`빵`·`옷`)은 한 글자 부분 일치를 열면
 * 「바이크」「바나나」 같은 말을 엉뚱하게 끌어오므로 **완전 일치만** 인정한다.
 * 두 글자 이상이면 별칭을 치는 도중에도 걸린다(`베이` → `베이커리`). 한 글자 검색어는
 * 시작 일치를 하지 않는다. 이름 부분 일치는 호출자가 따로 처리한다(`커피-음료`).
 */
const matchesExactOrPrefix = (query: string, alias: string): boolean => {
  if (alias.length === 1) return query === alias
  if (query.length < 2) return false

  return alias.startsWith(query)
}

/**
 * 포함 판정: 검색어가 별칭을 통째로 품으면 걸린다(`동네 카페` → `카페`). 그대로 열면
 * `한식당`이 `식당` 때문에 음식점 4종을, `영어학원`이 `학원` 때문에 학원 3종을 끌어온다.
 * 그래서 두 가지로 좁힌다.
 *
 * 1. 둘 이상의 업종에 걸린 별칭(`식당`·`학원`)은 포함 판정에서 뺀다. 이런 별칭은 완전·시작
 *    일치(`식당`, `학원` 그대로 입력)에서만 쓴다.
 * 2. 검색어가 품은 별칭이 여럿이면 **가장 긴 것만** 이긴다. `영어학원` 은 `영어`·`영어학원`
 *    중 `영어학원`(외국어학원)만, `고양이카페` 는 `고양이`(3) 가 `카페`(2) 를 이긴다.
 *
 * 둘 다 「더 구체적인 말이 이긴다」는 한 원칙이다. `동물병원` 같은 말이 업종 하나로 새는
 * 것은 별칭 표에서 `동물` 을 빼 막았다.
 */
const longestContainedLength = (query: string): number => {
  let longest = 0

  Object.values(SERVICE_ALIASES).forEach(aliases =>
    aliases.forEach(alias => {
      if (
        alias.length >= 2 &&
        alias.length > longest &&
        ALIAS_OWNER_COUNT.get(alias) === 1 &&
        query.includes(alias)
      ) {
        longest = alias.length
      }
    }),
  )

  return longest
}

/** `query` 는 이미 trim·소문자 처리된 값이다. 코드에 별칭이 없으면 항상 false. */
export const matchesServiceAlias = (code: string, query: string): boolean => {
  const aliases = SERVICE_ALIASES[code]
  if (!aliases) return false

  const normalized = compact(query)
  if (!normalized) return false

  if (aliases.some(alias => matchesExactOrPrefix(normalized, alias))) {
    return true
  }

  const longest = longestContainedLength(normalized)

  return (
    longest > 0 &&
    aliases.some(
      alias =>
        alias.length === longest &&
        ALIAS_OWNER_COUNT.get(alias) === 1 &&
        normalized.includes(alias),
    )
  )
}
