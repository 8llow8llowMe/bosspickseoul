import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { BUTTON_HEIGHTS } from '@/components/ui/button'
import { TOUCH_TARGET_MIN } from '@/styles/touch-target'

/*
  버튼 높이 체계 가드(#582).

  커뮤니티·채팅·프로필에 로컬 버튼이 쌓이며 높이가 40·42·46·48·50·52·56 으로 갈라졌다. 이제
  - 글자 버튼(주·보조·취소)은 공용 `Button`/`ButtonLink` 의 네 단계(36·40·48·56, DESIGN.md §Touch Targets)만 쓴다.
  - 칩·탭·아이콘 버튼·텍스트 링크처럼 공용 Button 모양이 아닌 컨트롤은 터치 바닥 44 를 쓴다.
  - 목록 행·카드처럼 버튼이 아닌 큰 누름 영역은 아래 `NON_BUTTON_SURFACES` 에 이유와 함께 적는다.

  새 높이(42·46 같은 값)가 들어오거나, 로컬 Primary/Secondary/Ghost 버튼이 다시 생기면 실패한다.

  보이는 높이가 터치 바닥 44 보다 작은 컨트롤은 모바일 히트 영역을 `touchHitArea()` 로 44 까지 넓힌다(#633).
  넓히지 않는 이유가 있으면 `BELOW_TOUCH_FLOOR` 에 적는다.

  한계: 정의 본문에 px 로 적힌 높이만 본다. 폭, 공유 css 조각(`${someFragment}`)이 넣는 높이, 보간한
  높이(`${props => ...}`)는 보지 않는다. 히트 영역이 이웃과 겹치는지는 브라우저 실측(`e2e/community/touch-targets.spec.ts`)이 본다.
*/

const SCOPES = ['community', 'chatting', 'profile'] as const

/** 공용 Button 모양이 아닌 큰 누름 영역 — `파일:이름` → 높이. 행·카드는 버튼 높이 체계 밖이다. */
const NON_BUTTON_SURFACES = new Map<string, number[]>([
  // 인기 채팅방 카드 — 카드 전체가 버튼이다.
  ['chatting/chatting-list-page.tsx:PopularCard', [220]],
  // 이전·다음 글, 관련 글 — 목록 행(DESIGN.md §Touch Targets 「List items 52」).
  ['community/community-detail-view.tsx:RailAdjacentLink', [52]],
  ['community/community-detail-view.tsx:RelatedLink', [52]],
  ['community/community-detail-view.tsx:AdjacentLink', [72]],
  ['community/community-list-view.tsx:PostLink', [52]],
  ['community/community-list-rail.tsx:AnalysisLink', [52]],
  // 지역 칩 — 검색칸(46)과 한 줄을 나누는 툴바 필드라 칸 높이를 따른다(읽기 전용 칩과 같은 높이).
  ['community/community-region-sheet.tsx:Chip', [46]],
])

/**
 * 보이는 높이가 44 미만인데 `touchHitArea()` 를 쓰지 않는 정의 — `파일:이름` → 이유.
 * 비어 있는 게 정상이다. 넣을 때는 모바일에서 히트 영역이 어떻게 44 를 넘는지(또는 왜 모바일에 없는지) 적는다.
 */
const BELOW_TOUCH_FLOOR = new Map<string, string>([])

const ALLOWED = new Set<number>([
  ...Object.values(BUTTON_HEIGHTS),
  TOUCH_TARGET_MIN,
])

const componentsRoot = path.resolve(
  fileURLToPath(new URL('.', import.meta.url)),
  '..',
)

const collectTsx = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      return collectTsx(full)
    }
    return entry.name.endsWith('.tsx') && !entry.name.includes('.test.')
      ? [full]
      : []
  })

type Definition = { key: string; heights: number[]; hitArea: boolean }

/*
  잡는 정의: `styled.button`·`styled.a`·`styled(Link)`·`styled(ButtonLink)`, 그리고 이름이 `Button` 으로 끝나는
  컴포넌트의 확장(`styled(Button)`·`styled(PrimaryButton)` 처럼 로컬 버튼을 다시 늘린 것).
*/
const DEFINITION =
  /(?:export )?const (\w+) = styled(?:\.(?:button|a)\b|\((?:Link|ButtonLink|\w*Button)\))[^`]*`/g

/*
  높이 선언. `line-height`·`max-height` 는 앞에 `-`·글자가 붙어 빠진다. 블록 끝 선언은 세미콜론이 없을 수 있어
  줄 끝도 끝으로 본다.
*/
const HEIGHT = /(?<![\w-])(?:min-)?height:\s*(\d+)px\s*(?=;|\n|$)/g

/**
 * 정의 본문에서 **그 요소 자신의** 높이만 남긴다. `svg { height }`·`span { ... }` 같은 자식 블록은 빼고,
 * 미디어 쿼리·상태 선택자(`&:hover`, `&[aria-*]`) 블록은 남긴다.
 */
const ownDeclarations = (body: string): string => {
  let out = ''
  const stack: boolean[] = []
  let buffer = ''

  for (const char of body) {
    if (char === '{') {
      const selector = buffer.split(/[;}]/).pop()?.trim() ?? ''
      const keep =
        selector.startsWith('@media') ||
        selector.startsWith('${') ||
        selector.startsWith('&:') ||
        selector.startsWith('&[')
      stack.push((stack.at(-1) ?? true) && keep)
      buffer = ''
      continue
    }
    if (char === '}') {
      stack.pop()
      buffer = ''
      continue
    }
    buffer += char
    if (stack.every(Boolean)) {
      out += char
    }
  }

  return out
}

const definitionsIn = (file: string): Definition[] => {
  const source = readFileSync(file, 'utf8')
  const rel = path.relative(componentsRoot, file).replaceAll('\\', '/')

  return [...source.matchAll(DEFINITION)].map(match => {
    const start = (match.index ?? 0) + match[0].length
    const body = source.slice(start, source.indexOf('`', start))
    const heights = [...ownDeclarations(body).matchAll(HEIGHT)].map(found =>
      Number(found[1]),
    )

    return {
      key: `${rel}:${match[1]}`,
      heights,
      hitArea: body.includes('${touchHitArea('),
    }
  })
}

const definitions = SCOPES.flatMap(scope =>
  collectTsx(path.join(componentsRoot, scope)),
).flatMap(definitionsIn)

describe('버튼 높이 체계(#582)', () => {
  it('공용 Button 높이는 DESIGN.md 의 네 단계다', () => {
    expect(Object.values(BUTTON_HEIGHTS)).toEqual([36, 40, 48, 56])
  })

  it('커뮤니티·채팅·프로필의 버튼은 네 단계 + 터치 바닥 44 만 쓴다', () => {
    const offenders = definitions.flatMap(({ key, heights }) => {
      const surface = NON_BUTTON_SURFACES.get(key)
      return heights
        .filter(height => !ALLOWED.has(height))
        .filter(height => !surface?.includes(height))
        .map(height => `${key} ${height}px`)
    })

    // 정규식이 아무것도 못 잡아 통과하는 일을 막는다.
    expect(definitions.length).toBeGreaterThan(30)
    expect(offenders).toEqual([])
  })

  it('행·카드 예외 목록이 실제 정의와 맞는다(지운 정의는 목록에서도 뺀다)', () => {
    const known = new Map(definitions.map(item => [item.key, item.heights]))
    const stale = [...NON_BUTTON_SURFACES].filter(
      ([key, heights]) =>
        !heights.every(height => known.get(key)?.includes(height)),
    )

    expect(stale).toEqual([])
  })

  it('44 미만 컨트롤은 모바일 히트 영역을 touchHitArea() 로 44 까지 넓힌다(#633)', () => {
    const offenders = definitions
      .filter(({ heights }) =>
        heights.some(height => height < TOUCH_TARGET_MIN),
      )
      .filter(({ hitArea }) => !hitArea)
      .map(({ key }) => key)
      .filter(key => !BELOW_TOUCH_FLOOR.has(key))

    expect(offenders).toEqual([])
  })

  it('44 미만 예외 목록이 실제 정의와 맞는다(고치거나 지운 정의는 목록에서도 뺀다)', () => {
    const below = new Set(
      definitions
        .filter(
          ({ heights, hitArea }) =>
            !hitArea && heights.some(height => height < TOUCH_TARGET_MIN),
        )
        .map(({ key }) => key),
    )

    expect(
      [...BELOW_TOUCH_FLOOR.keys()].filter(key => !below.has(key)),
    ).toEqual([])
  })

  it('로컬 Primary·Secondary·Ghost 버튼을 다시 만들지 않는다 — 공용 Button 을 쓴다', () => {
    const local = definitions
      .map(item => item.key)
      .filter(key => /:(Primary|Secondary|Ghost)(Button|Link)$/.test(key))

    expect(local).toEqual([])
  })
})
