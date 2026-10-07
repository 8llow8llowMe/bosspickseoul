import { describe, expect, it, vi } from 'vitest'

import {
  applyCommunityStoredDraft,
  clearCommunityStoredDrafts,
  createCommunityStoredDraft,
  getCommunityDraftStorageKey,
  isCommunityEditorDirty,
  parseCommunityStoredDraft,
  readCommunityStoredDraft,
  removeCommunityStoredDraft,
  writeCommunityStoredDraft,
} from './editor-draft'

const createMemoryStorage = (): Storage => {
  const map = new Map<string, string>()

  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: key => map.get(key) ?? null,
    key: index => [...map.keys()][index] ?? null,
    removeItem: key => {
      map.delete(key)
    },
    setItem: (key, value) => {
      map.set(key, value)
    },
  }
}

const image = {
  imageKey: 'community/posts/1/a.png',
  imageUrl: 'https://minio.test/a.png',
  sortOrder: 0,
}

const district = {
  targetType: 'DISTRICT' as const,
  targetCode: '11200',
  targetName: '성동구',
}

describe('getCommunityDraftStorageKey — 회원마다 따로 둔다', () => {
  it('새 글과 수정은 키를 나누고, 키에 회원 id 가 들어간다', () => {
    expect(getCommunityDraftStorageKey('create', null, '7')).toBe(
      'community-draft:7:new',
    )
    expect(getCommunityDraftStorageKey('edit', '42', '7')).toBe(
      'community-draft:7:edit:42',
    )
  })

  it('계정이 다르면 키가 다르다 — 공용 기기에서 다른 계정의 저장본을 읽지 않는다', () => {
    expect(getCommunityDraftStorageKey('create', null, '7')).not.toBe(
      getCommunityDraftStorageKey('create', null, '8'),
    )
  })

  it('회원 id 가 없으면 키도 없다 — 저장도 복원도 하지 않는다', () => {
    expect(getCommunityDraftStorageKey('create', null, null)).toBeNull()
    expect(getCommunityDraftStorageKey('edit', '42', '')).toBeNull()
  })
})

describe('clearCommunityStoredDrafts — 로그아웃 시 저장본을 모두 지운다', () => {
  it('`community-draft:` 로 시작하는 키만 지운다(옛 키 포함)', () => {
    const storage = createMemoryStorage()
    storage.setItem('community-draft:7:new', '{}')
    storage.setItem('community-draft:8:edit:42', '{}')
    storage.setItem('community-draft:new', '{}')
    storage.setItem('community-recent-regions', '[]')
    storage.setItem('other', 'x')

    clearCommunityStoredDrafts(() => storage)

    expect(storage.getItem('community-draft:7:new')).toBeNull()
    expect(storage.getItem('community-draft:8:edit:42')).toBeNull()
    expect(storage.getItem('community-draft:new')).toBeNull()
    expect(storage.getItem('community-recent-regions')).toBe('[]')
    expect(storage.getItem('other')).toBe('x')
  })

  it('storage 가 막혀도 던지지 않는다', () => {
    expect(() =>
      clearCommunityStoredDrafts(() => {
        throw new Error('SecurityError')
      }),
    ).not.toThrow()
    expect(() => clearCommunityStoredDrafts(() => null)).not.toThrow()
  })
})

describe('createCommunityStoredDraft — 사진은 저장하지 않는다', () => {
  it('제목·본문·지역·말머리·시각만 담는다', () => {
    const draft = createCommunityStoredDraft(
      {
        title: '제목',
        content: '본문',
        location: district,
        images: [image],
        category: 'QUESTION',
      },
      1700,
    )

    expect(draft).toEqual({
      title: '제목',
      content: '본문',
      location: district,
      category: 'QUESTION',
      savedAt: 1700,
    })
    expect(JSON.stringify(draft)).not.toContain('imageKey')
  })

  it('말머리 없음도 null 로 적는다 — 「해제했다」와 「옛 저장본이라 모른다」를 가른다(#529)', () => {
    expect(
      createCommunityStoredDraft(
        { title: '제목', content: '본문', location: {} },
        1,
      ).category,
    ).toBeNull()
  })
})

describe('parseCommunityStoredDraft', () => {
  it('저장한 모양 그대로 읽는다', () => {
    const raw = JSON.stringify({
      title: '제목',
      content: '',
      location: district,
      savedAt: 1,
    })

    expect(parseCommunityStoredDraft(raw)).toEqual({
      title: '제목',
      content: '',
      location: district,
      savedAt: 1,
    })
  })

  it('말머리를 읽는다 — 모르는 값은 말머리 없음, 필드가 없는 옛 저장본은 「모름」이다(#529)', () => {
    const raw = (category: unknown) =>
      JSON.stringify({
        title: '제목',
        content: '본문',
        location: {},
        category,
        savedAt: 1,
      })

    expect(parseCommunityStoredDraft(raw('TOGETHER'))?.category).toBe(
      'TOGETHER',
    )
    expect(parseCommunityStoredDraft(raw(null))?.category).toBeNull()
    expect(parseCommunityStoredDraft(raw('BOGUS'))?.category).toBeNull()
    const legacy = parseCommunityStoredDraft(
      JSON.stringify({ title: '제목', content: '', location: {}, savedAt: 1 }),
    )
    expect(legacy).not.toBeNull()
    expect(legacy).not.toHaveProperty('category')
  })

  it('지역 값도 검증한다 — 모르는 종류는 버린다', () => {
    const raw = JSON.stringify({
      title: '제목',
      content: '본문',
      location: { targetType: 'CITY', targetCode: '1' },
      savedAt: 1,
    })

    expect(parseCommunityStoredDraft(raw)?.location).toEqual({})
  })

  it('비었거나 깨졌거나 내용이 없으면 없는 것으로 본다', () => {
    expect(parseCommunityStoredDraft(null)).toBeNull()
    expect(parseCommunityStoredDraft('')).toBeNull()
    expect(parseCommunityStoredDraft('{not json')).toBeNull()
    expect(parseCommunityStoredDraft('"text"')).toBeNull()
    expect(
      parseCommunityStoredDraft(
        JSON.stringify({ title: 1, content: '본문', location: {}, savedAt: 1 }),
      ),
    ).toBeNull()
    expect(
      parseCommunityStoredDraft(
        JSON.stringify({
          title: ' ',
          content: '\n',
          location: district,
          savedAt: 1,
        }),
      ),
    ).toBeNull()
  })
})

describe('storage 접근 — 실패는 조용히 넘긴다', () => {
  it('쓰고 읽고 지운다', () => {
    const storage = createMemoryStorage()
    const draft = createCommunityStoredDraft(
      { title: '제목', content: '본문', location: district, images: [] },
      5,
    )

    expect(
      writeCommunityStoredDraft(() => storage, 'community-draft:new', draft),
    ).toBe(true)
    expect(
      readCommunityStoredDraft(() => storage, 'community-draft:new'),
    ).toEqual(draft)
    removeCommunityStoredDraft(() => storage, 'community-draft:new')
    expect(storage.getItem('community-draft:new')).toBeNull()
  })

  it('storage 를 얻는 것부터 막혀도(사생활 모드) 던지지 않는다', () => {
    const blocked = () => {
      throw new Error('SecurityError')
    }
    const draft = createCommunityStoredDraft(
      { title: '제목', content: '본문', location: {}, images: [] },
      5,
    )

    expect(readCommunityStoredDraft(blocked, 'k')).toBeNull()
    expect(writeCommunityStoredDraft(blocked, 'k', draft)).toBe(false)
    expect(() => removeCommunityStoredDraft(blocked, 'k')).not.toThrow()
  })

  it('용량 초과로 setItem 이 던져도 false 로 끝난다', () => {
    const storage = createMemoryStorage()
    storage.setItem = vi.fn(() => {
      throw new Error('QuotaExceededError')
    })

    expect(
      writeCommunityStoredDraft(
        () => storage,
        'k',
        createCommunityStoredDraft(
          { title: '제목', content: '본문', location: {}, images: [] },
          5,
        ),
      ),
    ).toBe(false)
  })

  it('storage 가 없으면(서버) 아무것도 하지 않는다', () => {
    expect(readCommunityStoredDraft(() => null, 'k')).toBeNull()
  })
})

describe('isCommunityEditorDirty', () => {
  const pristine = {
    title: '',
    content: '',
    location: district,
    images: [],
    category: null,
  }

  it('처음 값과 같으면 dirty 가 아니다', () => {
    expect(isCommunityEditorDirty(pristine, { ...pristine })).toBe(false)
    // 이름만 다르고 코드가 같으면 같은 지역이다.
    expect(
      isCommunityEditorDirty(pristine, {
        ...pristine,
        location: { ...district, targetName: '성동' },
      }),
    ).toBe(false)
  })

  it('제목·본문·지역·사진 중 하나라도 바뀌면 dirty 다', () => {
    expect(isCommunityEditorDirty(pristine, { ...pristine, title: '가' })).toBe(
      true,
    )
    expect(
      isCommunityEditorDirty(pristine, { ...pristine, content: '가' }),
    ).toBe(true)
    expect(
      isCommunityEditorDirty(pristine, { ...pristine, location: {} }),
    ).toBe(true)
    expect(
      isCommunityEditorDirty(pristine, { ...pristine, images: [image] }),
    ).toBe(true)
  })

  it('말머리를 고르거나 바꾸거나 풀어도 dirty 다(#529)', () => {
    expect(
      isCommunityEditorDirty(pristine, { ...pristine, category: 'NEWS' }),
    ).toBe(true)
    expect(
      isCommunityEditorDirty(
        { ...pristine, category: 'NEWS' },
        { ...pristine, category: 'QUESTION' },
      ),
    ).toBe(true)
    expect(
      isCommunityEditorDirty(
        { ...pristine, category: 'NEWS' },
        { ...pristine, category: 'NEWS' },
      ),
    ).toBe(false)
  })
})

describe('applyCommunityStoredDraft — 이어 쓰기', () => {
  const stored = {
    title: '저장한 제목',
    content: '저장한 본문',
    location: district,
    savedAt: 1,
  }

  it('새 글은 제목·본문·지역을 되살리고 사진은 비운다(CM-034)', () => {
    expect(
      applyCommunityStoredDraft(
        'create',
        { title: '', content: '', location: {}, images: [], category: null },
        { ...stored, category: 'QUESTION' },
      ),
    ).toEqual({
      title: '저장한 제목',
      content: '저장한 본문',
      location: district,
      images: [],
      category: 'QUESTION',
    })
  })

  it('저장본에 지역이 없으면 들어온 지역(프리필)을 지킨다', () => {
    const prefill = {
      targetType: 'COMMERCIAL' as const,
      targetCode: '3110008',
    }

    expect(
      applyCommunityStoredDraft(
        'create',
        {
          title: '',
          content: '',
          location: prefill,
          images: [],
          category: null,
        },
        { ...stored, location: {} },
      ).location,
    ).toEqual(prefill)
  })

  it('수정은 제목·본문·말머리가 저장본이고 지역·사진은 원본이다', () => {
    const original = {
      title: '원래 제목',
      content: '원래 본문',
      location: { targetType: 'ADMINISTRATION' as const, targetCode: '1' },
      images: [image],
      category: 'NEWS' as const,
    }

    expect(
      applyCommunityStoredDraft('edit', original, {
        ...stored,
        category: 'QUESTION',
      }),
    ).toEqual({
      title: '저장한 제목',
      content: '저장한 본문',
      location: original.location,
      images: [image],
      category: 'QUESTION',
    })
    // 저장본에서 말머리를 풀었으면 그대로 풀린다 — 수정 저장 때 서버가 지운다.
    expect(
      applyCommunityStoredDraft('edit', original, { ...stored, category: null })
        .category,
    ).toBeNull()
  })

  it('말머리 필드가 없는 옛 저장본은 원본 말머리를 지킨다 — null 로 읽으면 수정 저장이 말머리를 지운다(#529)', () => {
    const original = {
      title: '원래 제목',
      content: '원래 본문',
      location: {},
      images: [],
      category: 'EXPERIENCE' as const,
    }

    expect(applyCommunityStoredDraft('edit', original, stored).category).toBe(
      'EXPERIENCE',
    )
    expect(
      applyCommunityStoredDraft(
        'create',
        { ...original, category: null },
        stored,
      ).category,
    ).toBeNull()
  })
})
