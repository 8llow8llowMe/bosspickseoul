export type SimulationSubcategory = {
  name: string
  code: string
}

export const simulationCatalog: Record<string, SimulationSubcategory[]> = {
  음식점: [
    { name: '한식음식점', code: 'CS100001' },
    { name: '중식음식점', code: 'CS100002' },
    { name: '일식음식점', code: 'CS100003' },
    { name: '양식음식점', code: 'CS100004' },
    { name: '제과점', code: 'CS100005' },
    { name: '패스트푸드점', code: 'CS100006' },
    { name: '치킨전문점', code: 'CS100007' },
    { name: '분식전문점', code: 'CS100008' },
    { name: '호프-간이주점', code: 'CS100009' },
    { name: '커피-음료', code: 'CS100010' },
  ],
  학원: [
    { name: '일반교습학원', code: 'CS200001' },
    { name: '외국어학원', code: 'CS200002' },
    { name: '예술학원', code: 'CS200003' },
    { name: '스포츠 강습', code: 'CS200005' },
  ],
  '레저/오락': [
    { name: 'PC방', code: 'CS200019' },
    { name: '노래방', code: 'CS200037' },
  ],
  서비스: [
    { name: '세탁소', code: 'CS200031' },
    { name: '부동산중개업', code: 'CS200033' },
    { name: '여관', code: 'CS200034' },
    { name: '자동차수리', code: 'CS200025' },
    { name: '미용실', code: 'CS200028' },
  ],
  도소매: [
    { name: '슈퍼마켓', code: 'CS300001' },
    { name: '편의점', code: 'CS300002' },
    { name: '수산물판매', code: 'CS300007' },
    { name: '일반의류', code: 'CS300010' },
    { name: '안경', code: 'CS300016' },
    { name: '의약품', code: 'CS300018' },
  ],
  생활용품: [
    { name: '화장품', code: 'CS300022' },
    { name: '자전거 및 기타운송장비', code: 'CS300025' },
    { name: '애완동물', code: 'CS300029' },
  ],
}

export const simulationCategories = Object.keys(simulationCatalog)

export const floorOptions = ['1층', '1층이외'] as const

export const findSimulationCategoryByCode = (serviceCode: string) => {
  for (const [category, items] of Object.entries(simulationCatalog)) {
    const matched = items.find(item => item.code === serviceCode)

    if (matched) {
      return {
        category,
        item: matched,
      }
    }
  }

  return null
}
