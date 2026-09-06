import { describe, expect, it } from 'vitest'

import {
  canRevokeSession,
  describeDeviceLabel,
  formatSessionTime,
} from '@/lib/auth/device-session'
import type { AuthSessionItem } from '@/types/auth'

const session = (patch: Partial<AuthSessionItem> = {}): AuthSessionItem => ({
  sessionId: 'session-1',
  deviceInfo: null,
  createdAt: null,
  lastUsedAt: null,
  current: false,
  ...patch,
})

describe('describeDeviceLabel', () => {
  it('브라우저와 운영체제를 함께 읽는다', () => {
    expect(
      describeDeviceLabel(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      ),
    ).toBe('Chrome · macOS')
  })

  /*
   * 순서가 규칙이다. Edge·삼성인터넷 UA 는 `Chrome` 을, Chrome UA 는 `Safari` 를
   * 품고 있어서 넓은 쪽을 먼저 검사하면 전부 Safari 로 뭉개진다.
   */
  it('Chrome 을 품은 Edge 를 Chrome 으로 읽지 않는다', () => {
    expect(
      describeDeviceLabel(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0',
      ),
    ).toBe('Edge · Windows')
  })

  it('Chrome 을 품은 삼성 인터넷을 Chrome 으로 읽지 않는다', () => {
    expect(
      describeDeviceLabel(
        'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
      ),
    ).toBe('삼성 인터넷 · Android')
  })

  it('진짜 Safari 는 Safari 로 읽는다', () => {
    expect(
      describeDeviceLabel(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
      ),
    ).toBe('Safari · iPhone')
  })

  /*
   * 「알 수 없는 기기」로 뭉개면 여러 행을 구별할 방법이 사라져 목록의 목적이 없어진다.
   * 알아보지 못해도 원문을 (잘라서) 보여 준다.
   */
  it('알아보지 못한 UA 는 원문을 잘라서 보여 준다', () => {
    const raw = `unknown-agent-${'x'.repeat(80)}`
    const label = describeDeviceLabel(raw)

    expect(label.startsWith('unknown-agent-')).toBe(true)
    expect(label.endsWith('…')).toBe(true)
    expect(label.length).toBeLessThan(raw.length)
  })

  it('짧고 알아보지 못한 값은 자르지 않는다', () => {
    expect(describeDeviceLabel('curl/8.4.0')).toBe('curl/8.4.0')
  })

  it('값이 없거나 공백뿐이면 알 수 없다고 적는다', () => {
    expect(describeDeviceLabel(null)).toBe('알 수 없는 기기')
    expect(describeDeviceLabel('   ')).toBe('알 수 없는 기기')
  })
})

describe('formatSessionTime', () => {
  it('null 이면 빈 칸을 두지 않고 알 수 없다고 적는다', () => {
    expect(formatSessionTime(null)).toBe('알 수 없음')
  })

  it('값이 있으면 사람이 읽는 시각으로 적는다', () => {
    const formatted = formatSessionTime('2026-09-02T10:04:23')

    expect(formatted).toContain('2026')
    expect(formatted).not.toBe('알 수 없음')
  })
})

describe('canRevokeSession', () => {
  it('현재 기기는 해제 대상이 아니다', () => {
    expect(canRevokeSession(session({ current: true }))).toBe(false)
  })

  it('다른 기기는 해제할 수 있다', () => {
    expect(canRevokeSession(session({ current: false }))).toBe(true)
  })
})
