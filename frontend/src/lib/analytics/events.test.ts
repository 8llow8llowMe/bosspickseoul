import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  TRACK_ATTR,
  TRACK_PARAMS_ATTR,
  parseTrackAttrs,
  trackAttrs,
  trackEvent,
} from './events'

describe('trackAttrs', () => {
  it('이벤트 이름과 파라미터 JSON 을 data 속성으로 만든다', () => {
    expect(trackAttrs('home_final_cta_click', { cta: 'register' })).toEqual({
      [TRACK_ATTR]: 'home_final_cta_click',
      [TRACK_PARAMS_ATTR]: '{"cta":"register"}',
    })
  })

  it('만든 속성을 parseTrackAttrs 가 그대로 되돌린다', () => {
    const attrs = trackAttrs('home_story_cta_click', {
      step: '02',
      carried: true,
    })
    expect(
      parseTrackAttrs(attrs[TRACK_ATTR], attrs[TRACK_PARAMS_ATTR]),
    ).toEqual({
      name: 'home_story_cta_click',
      params: { step: '02', carried: true },
    })
  })
})

describe('parseTrackAttrs', () => {
  it('이름이 없으면 버린다', () => {
    expect(parseTrackAttrs(null, '{}')).toBeNull()
    expect(parseTrackAttrs('', '{}')).toBeNull()
  })

  it('파라미터가 없으면 빈 객체로 보낸다', () => {
    expect(parseTrackAttrs('home_map_click', null)).toEqual({
      name: 'home_map_click',
      params: {},
    })
  })

  // 손으로 고친 DOM 이 계측을 넘어 클릭 처리를 깨뜨리면 안 된다.
  it('깨진 JSON·객체가 아닌 값은 버린다', () => {
    expect(parseTrackAttrs('home_map_click', '{oops')).toBeNull()
    expect(parseTrackAttrs('home_map_click', '[1,2]')).toBeNull()
    expect(parseTrackAttrs('home_map_click', '"text"')).toBeNull()
    expect(parseTrackAttrs('home_map_click', 'null')).toBeNull()
  })
})

describe('trackEvent', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('서버(window 없음)에서는 아무것도 하지 않는다', () => {
    expect(() =>
      trackEvent('home_map_click', { district_code: '11680' }),
    ).not.toThrow()
  })

  // 측정 ID 가 없으면 태그가 안 실려 gtag 가 없다 — 로컬·PR 빌드의 기본 상태.
  it('gtag 가 없으면 아무것도 하지 않는다', () => {
    vi.stubGlobal('window', {})
    expect(() =>
      trackEvent('home_map_click', { district_code: '11680' }),
    ).not.toThrow()
  })

  it('gtag 가 있으면 event 명령으로 보낸다', () => {
    const gtag = vi.fn()
    vi.stubGlobal('window', { gtag })
    trackEvent('home_story_demo_select', {
      field: 'industry',
      value: 'CS100010',
    })
    expect(gtag).toHaveBeenCalledWith('event', 'home_story_demo_select', {
      field: 'industry',
      value: 'CS100010',
    })
  })
})
