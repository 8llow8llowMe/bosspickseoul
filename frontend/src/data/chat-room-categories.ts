export type ChatRoomCategoryItem = {
  label: string
  value: string
  description: string
}

export const chatRoomCategories: ChatRoomCategoryItem[] = [
  {
    label: '전체보기',
    value: '',
    description: '모든 주제의 게시글을 한 번에 확인합니다.',
  },
  {
    label: '이모저모',
    value: 'ETC',
    description: '운영 경험과 일상적인 인사이트를 나눕니다.',
  },
  {
    label: '인테리어',
    value: 'INTERIOR',
    description: '공간 설계, 시공, 분위기 개선 아이디어를 다룹니다.',
  },
  {
    label: '상권공유',
    value: 'COMMERCIAL_AREA',
    description: '상권 데이터와 현장 관찰을 함께 공유합니다.',
  },
  {
    label: '동업제안',
    value: 'PARTNERSHIP',
    description: '협업과 파트너십 제안을 올리는 공간입니다.',
  },
  {
    label: '창업고민',
    value: 'START_UP',
    description: '예비 창업자와 운영자의 고민을 나눕니다.',
  },
]

const chatRoomCategoryLabelMap = new Map(
  chatRoomCategories.map(category => [category.value, category.label]),
)

export const getChatRoomCategoryLabelFromCatalog = (value: string) =>
  chatRoomCategoryLabelMap.get(value) ?? value
