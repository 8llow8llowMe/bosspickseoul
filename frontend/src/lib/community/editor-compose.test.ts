import { describe, expect, it } from 'vitest'

import {
  COMMUNITY_CONTENT_MAX_LENGTH,
  COMMUNITY_LOCATION_REQUIRED_MESSAGE,
  COMMUNITY_TITLE_MAX_LENGTH,
  COMMUNITY_WRITING_PROMPTS,
  getCommunityEditorChecklist,
  getCommunityPromptCategory,
  getCommunityWritingPromptCaret,
  isCommunityCountNearLimit,
  isCommunityEditorChecklistReady,
  resolveCommunityEditorSubmission,
  shouldShowCommunityWritingPrompts,
} from './editor-compose'

const district = {
  targetType: 'DISTRICT' as const,
  targetCode: '11200',
  targetName: '성동구',
}

describe('resolveCommunityEditorSubmission — 비어 있는 첫 필수값(지역 → 제목 → 본문)', () => {
  it('지역이 비면 제목·본문보다 먼저 지역을 짚는다(CM-008·032)', () => {
    expect(resolveCommunityEditorSubmission('create', '', '', {})).toEqual({
      error: COMMUNITY_LOCATION_REQUIRED_MESSAGE,
      field: 'location',
      value: null,
    })
    expect(COMMUNITY_LOCATION_REQUIRED_MESSAGE).toBe('지역을 골라 주세요.')
    // 종류만 있고 코드가 공백이면 대상이 아니다.
    expect(
      resolveCommunityEditorSubmission('create', '제목', '본문', {
        targetType: 'DISTRICT',
        targetCode: ' ',
      }).field,
    ).toBe('location')
  })

  it('지역이 있으면 제목, 그다음 본문을 짚는다', () => {
    expect(
      resolveCommunityEditorSubmission('create', '  ', '', district),
    ).toEqual({ error: '제목을 입력해 주세요.', field: 'title', value: null })
    expect(
      resolveCommunityEditorSubmission('create', '제목', ' \n ', district),
    ).toEqual({ error: '내용을 입력해 주세요.', field: 'content', value: null })
  })

  it('수정은 지역을 보지 않는다(읽기 전용)', () => {
    expect(resolveCommunityEditorSubmission('edit', '', '본문', {}).field).toBe(
      'title',
    )
  })

  it('길이 초과도 그 필드를 짚는다', () => {
    expect(
      resolveCommunityEditorSubmission(
        'create',
        '가'.repeat(COMMUNITY_TITLE_MAX_LENGTH + 1),
        '본문',
        district,
      ).field,
    ).toBe('title')
    expect(
      resolveCommunityEditorSubmission(
        'create',
        '제목',
        '가'.repeat(COMMUNITY_CONTENT_MAX_LENGTH + 1),
        district,
      ).field,
    ).toBe('content')
  })

  it('맞으면 앞뒤 공백을 지운 값을 첨부와 함께 돌려준다', () => {
    const images = [
      { imageKey: 'k', imageUrl: 'https://minio.test/k.png', sortOrder: 0 },
    ]

    expect(
      resolveCommunityEditorSubmission(
        'create',
        ' 제목 ',
        ' 본문 ',
        district,
        images,
      ),
    ).toEqual({
      error: null,
      field: null,
      value: {
        title: '제목',
        content: '본문',
        location: district,
        images,
        category: null,
      },
    })
  })

  it('고른 말머리를 그대로 실어 보낸다(#529)', () => {
    expect(
      resolveCommunityEditorSubmission('edit', '제목', '본문', {}, [], 'NEWS')
        .value,
    ).toMatchObject({ category: 'NEWS' })
  })
})

describe('isCommunityCountNearLimit — 한도 90% 를 넘으면 강조', () => {
  it('90% 까지는 평소, 넘으면 강조다', () => {
    expect(isCommunityCountNearLimit(4500, 5000)).toBe(false)
    expect(isCommunityCountNearLimit(4501, 5000)).toBe(true)
    expect(isCommunityCountNearLimit(108, 120)).toBe(false)
    expect(isCommunityCountNearLimit(109, 120)).toBe(true)
    expect(isCommunityCountNearLimit(0, 120)).toBe(false)
  })
})

describe('작성 도움 칩(CM-033)', () => {
  it('세 칩과 틀이 고정돼 있다', () => {
    expect(
      COMMUNITY_WRITING_PROMPTS.map(({ label, template }) => [label, template]),
    ).toEqual([
      ['질문해요', '상황: \n궁금한 점: '],
      ['경험 나눠요', '해 본 것: \n결과: \n느낀 점: '],
      ['같이 해요', '함께 하고 싶은 것: \n일정·조건: \n연락 방법: '],
    ])
  })

  it('세 칩은 계약의 말머리 code 에 대응한다(#529 — 칩 → code 매핑표)', () => {
    expect(
      COMMUNITY_WRITING_PROMPTS.map(({ id, category }) => [id, category]),
    ).toEqual([
      ['question', 'QUESTION'],
      ['experience', 'EXPERIENCE'],
      ['together', 'TOGETHER'],
    ])
  })

  it('말머리가 비었을 때만 칩의 말머리를 골라 준다 — 이미 고른 말머리는 덮지 않는다', () => {
    const [question, experience] = COMMUNITY_WRITING_PROMPTS
    expect(getCommunityPromptCategory(null, question)).toBe('QUESTION')
    expect(getCommunityPromptCategory(null, experience)).toBe('EXPERIENCE')
    expect(getCommunityPromptCategory('NEWS', question)).toBe('NEWS')
    expect(getCommunityPromptCategory('TOGETHER', experience)).toBe('TOGETHER')
  })

  it('본문이 비었을 때만 보인다 — 공백만 있어도 빈 것이다', () => {
    expect(shouldShowCommunityWritingPrompts('')).toBe(true)
    expect(shouldShowCommunityWritingPrompts('  \n')).toBe(true)
    expect(shouldShowCommunityWritingPrompts('상황: ')).toBe(false)
  })

  it('커서는 첫 줄 끝이다', () => {
    expect(getCommunityWritingPromptCaret('상황: \n궁금한 점: ')).toBe(4)
    expect(getCommunityWritingPromptCaret('한 줄')).toBe(3)
  })
})

describe('작성 체크(community.md §S4 「다듬기」)', () => {
  const empty = { title: '', content: '', location: {}, images: [] }
  const image = {
    imageKey: 'community/posts/1/a.png',
    imageUrl: 'https://minio.test/a.png',
    sortOrder: 0,
  }
  const doneOf = (value: Parameters<typeof getCommunityEditorChecklist>[0]) =>
    Object.fromEntries(
      getCommunityEditorChecklist(value).map(item => [item.id, item.done]),
    )

  it('지역 · 제목 · 본문(필수) · 사진(선택) 순서다', () => {
    expect(
      getCommunityEditorChecklist(empty).map(item => [
        item.id,
        item.label,
        item.required,
      ]),
    ).toEqual([
      ['location', '지역', true],
      ['title', '제목', true],
      ['content', '본문', true],
      ['images', '사진', false],
    ])
  })

  it('빈 글은 아무것도 켜지지 않는다', () => {
    expect(doneOf(empty)).toEqual({
      location: false,
      title: false,
      content: false,
      images: false,
    })
  })

  it('지역은 종류와 코드가 둘 다 있어야 켜진다 — 이름만으로는 안 된다', () => {
    expect(
      doneOf({ ...empty, location: { targetName: '성동구' } }).location,
    ).toBe(false)
    expect(
      doneOf({
        ...empty,
        location: { targetType: 'DISTRICT', targetCode: '  ' },
      }).location,
    ).toBe(false)
    expect(doneOf({ ...empty, location: district }).location).toBe(true)
  })

  it('제목·본문은 공백만이면 꺼져 있다', () => {
    expect(doneOf({ ...empty, title: '   ', content: '\n\t ' })).toMatchObject({
      title: false,
      content: false,
    })
    expect(
      doneOf({ ...empty, title: ' 제목 ', content: ' 본문 ' }),
    ).toMatchObject({
      title: true,
      content: true,
    })
  })

  it('사진은 한 장 이상이면 켜진다', () => {
    expect(doneOf({ ...empty, images: [image] }).images).toBe(true)
  })

  it('필수 셋이 다 차야 준비됐다 — 사진은 없어도 된다', () => {
    const filled = {
      title: '제목',
      content: '본문',
      location: district,
      images: [],
    }

    expect(
      isCommunityEditorChecklistReady(getCommunityEditorChecklist(filled)),
    ).toBe(true)
    expect(
      isCommunityEditorChecklistReady(
        getCommunityEditorChecklist({ ...filled, content: ' ' }),
      ),
    ).toBe(false)
    expect(
      isCommunityEditorChecklistReady(
        getCommunityEditorChecklist({ ...filled, location: {} }),
      ),
    ).toBe(false)
    expect(
      isCommunityEditorChecklistReady(
        getCommunityEditorChecklist({ ...filled, title: '' }),
      ),
    ).toBe(false)
  })
})
