import { describe, expect, it } from 'vitest'

import {
  buildSharePreviewCopy,
  decideShareEntry,
  EMPTY_SHARE_PREVIEW_NAMES,
  isLinkPreviewBot,
  isShareCodeFormat,
  isShareLinkExpired,
  listSharePreviewLookups,
  resolveShareTimeout,
  SHARE_PREVIEW_FALLBACK,
} from './share-preview'

const ANALYSIS_PAYLOAD = {
  districtCode: '11440',
  administrationCode: '11440660',
  commercialCode: '3110562',
  serviceCode: 'CS100010',
  periodCode: '20261',
}

const MAPO_NAMES = {
  districtName: '마포구',
  administrationName: '서교동',
  commercialNames: ['홍대입구역'],
}

const CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'

describe('buildSharePreviewCopy', () => {
  it('상권 분석은 상권·업종·분기를 제목에 싣는다', () => {
    const copy = buildSharePreviewCopy(
      'COMMERCIAL_ANALYSIS',
      ANALYSIS_PAYLOAD,
      MAPO_NAMES,
    )

    expect(copy.title).toBe('홍대입구역 · 커피-음료 상권분석 (2026년 1분기)')
    expect(copy.description).toBe(
      '마포구 서교동 홍대입구역 상권의 커피-음료 매출·유동인구·점포 지표를 확인해 보세요.',
    )
  })

  it('AI 리포트는 같은 머리에 다른 주제를 붙인다', () => {
    const copy = buildSharePreviewCopy(
      'AI_REPORT',
      ANALYSIS_PAYLOAD,
      MAPO_NAMES,
    )

    expect(copy.title).toBe('홍대입구역 · 커피-음료 AI 리포트 (2026년 1분기)')
  })

  it('분기 형식이 틀리면 괄호째 뺀다', () => {
    const copy = buildSharePreviewCopy(
      'COMMERCIAL_ANALYSIS',
      { ...ANALYSIS_PAYLOAD, periodCode: 'latest' },
      MAPO_NAMES,
    )

    expect(copy.title).toBe('홍대입구역 · 커피-음료 상권분석')
  })

  it('카탈로그에 없는 업종이면 업종만 빼고 만든다', () => {
    const copy = buildSharePreviewCopy(
      'COMMERCIAL_ANALYSIS',
      { ...ANALYSIS_PAYLOAD, serviceCode: 'UNKNOWN' },
      MAPO_NAMES,
    )

    expect(copy.title).toBe('홍대입구역 상권분석 (2026년 1분기)')
    expect(copy.description).toBe(
      '마포구 서교동 홍대입구역 상권의 매출·유동인구·점포 지표를 확인해 보세요.',
    )
  })

  it('상권 이름을 못 찾으면 고정 문구로 떨어진다', () => {
    expect(
      buildSharePreviewCopy(
        'COMMERCIAL_ANALYSIS',
        ANALYSIS_PAYLOAD,
        EMPTY_SHARE_PREVIEW_NAMES,
      ),
    ).toEqual(SHARE_PREVIEW_FALLBACK)
  })

  it('비교는 두 상권 이름이 다 있어야 만든다', () => {
    const payload = {
      districtCode: '11440',
      administrationCode: '11440660',
      serviceCode: 'CS100010',
      commercialCodes: ['3110562', '3110563'],
    }

    expect(
      buildSharePreviewCopy('COMMERCIAL_COMPARISON', payload, {
        ...MAPO_NAMES,
        commercialNames: ['홍대입구역', '상수역'],
      }),
    ).toEqual({
      title: '홍대입구역 vs 상수역 · 커피-음료 상권 비교',
      description:
        '마포구 서교동 두 상권의 커피-음료 매출·유동인구 지표를 나란히 비교해 보세요.',
    })
    expect(
      buildSharePreviewCopy('COMMERCIAL_COMPARISON', payload, {
        ...MAPO_NAMES,
        commercialNames: ['홍대입구역', null],
      }),
    ).toEqual(SHARE_PREVIEW_FALLBACK)
  })

  it('행정동 탐색은 자치구를 정적 목록에서 찾는다', () => {
    expect(
      buildSharePreviewCopy(
        'ADMINISTRATION_ANALYSIS',
        { districtCode: '11440', administrationCode: '11440660' },
        { ...EMPTY_SHARE_PREVIEW_NAMES, administrationName: '서교동' },
      ).title,
    ).toBe('마포구 서교동 상권 탐색')
  })

  it('미지원·알 수 없는 타입과 깨진 payload 는 고정 문구다', () => {
    expect(buildSharePreviewCopy('DISTRICT_ANALYSIS', {}, MAPO_NAMES)).toEqual(
      SHARE_PREVIEW_FALLBACK,
    )
    expect(buildSharePreviewCopy('NOPE', ANALYSIS_PAYLOAD, MAPO_NAMES)).toEqual(
      SHARE_PREVIEW_FALLBACK,
    )
    expect(
      buildSharePreviewCopy('COMMERCIAL_ANALYSIS', ['x'], MAPO_NAMES),
    ).toEqual(SHARE_PREVIEW_FALLBACK)
  })
})

describe('listSharePreviewLookups', () => {
  it('비교는 상권을 최대 두 개만 조회한다', () => {
    expect(
      listSharePreviewLookups('COMMERCIAL_COMPARISON', {
        commercialCodes: ['a', 'b', 'c'],
      }).commercialCodes,
    ).toEqual(['a', 'b'])
  })

  it('행정동 탐색은 상권 대신 행정동 목록을 조회한다', () => {
    expect(
      listSharePreviewLookups('ADMINISTRATION_ANALYSIS', {
        districtCode: '11440',
        administrationCode: '11440660',
      }),
    ).toEqual({
      commercialCodes: [],
      administration: { districtCode: '11440', administrationCode: '11440660' },
    })
  })
})

describe('decideShareEntry', () => {
  const resolved = {
    ok: true as const,
    shareType: 'COMMERCIAL_ANALYSIS',
    payload: ANALYSIS_PAYLOAD,
  }

  it('사람이면 복원 URL 로 보낸다', () => {
    expect(decideShareEntry(resolved, CHROME_UA)).toEqual({
      kind: 'redirect',
      href: '/analysis/result?districtCode=11440&administrationCode=11440660&commercialCode=3110562&serviceCode=CS100010&periodCode=20261',
    })
  })

  it('미리보기 봇은 보내지 않는다 — 이 페이지의 메타를 읽어야 한다', () => {
    expect(decideShareEntry(resolved, 'kakaotalk-scrap/1.0')).toEqual({
      kind: 'render',
    })
    expect(
      decideShareEntry(
        resolved,
        'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
      ),
    ).toEqual({ kind: 'render' })
  })

  it('해석 실패·미지원 타입은 클라이언트 경로에 맡긴다', () => {
    expect(decideShareEntry({ ok: false }, CHROME_UA)).toEqual({
      kind: 'render',
    })
    expect(
      decideShareEntry(
        { ok: true, shareType: 'DISTRICT_ANALYSIS', payload: {} },
        CHROME_UA,
      ),
    ).toEqual({ kind: 'render' })
  })
})

describe('isLinkPreviewBot', () => {
  it.each([
    'kakaotalk-scrap/1.0; +https://devtalk.kakao.com/',
    'facebookexternalhit/1.1',
    'Twitterbot/1.0',
    'TelegramBot (like TwitterBot)',
    'Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)',
  ])('%s 를 봇으로 본다', userAgent => {
    expect(isLinkPreviewBot(userAgent)).toBe(true)
  })

  it('일반 브라우저와 빈 값은 봇이 아니다', () => {
    expect(isLinkPreviewBot(CHROME_UA)).toBe(false)
    expect(
      isLinkPreviewBot(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) KAKAOTALK 10.8.0',
      ),
    ).toBe(false)
    expect(isLinkPreviewBot(null)).toBe(false)
  })
})

describe('해석 시간 제한·형식·만료', () => {
  it('사람은 1.5초, 봇은 3초다', () => {
    expect(resolveShareTimeout(CHROME_UA)).toBe(1500)
    expect(resolveShareTimeout('kakaotalk-scrap/1.0')).toBe(3000)
    expect(resolveShareTimeout(null)).toBe(1500)
  })

  it('공유 코드는 base62 1~16자만 받는다', () => {
    expect(isShareCodeFormat('7GFPfbs3')).toBe(true)
    expect(isShareCodeFormat('..')).toBe(false)
    expect(isShareCodeFormat('A'.repeat(17))).toBe(false)
    expect(isShareCodeFormat('abc_def')).toBe(false)
  })

  it('읽을 수 없는 만료 시각은 만료로 보지 않는다', () => {
    expect(isShareLinkExpired(undefined)).toBe(false)
    expect(isShareLinkExpired('내일')).toBe(false)
    expect(
      isShareLinkExpired(
        '2026-10-10T00:00:00Z',
        Date.parse('2026-10-10T00:00:01Z'),
      ),
    ).toBe(true)
  })
})
