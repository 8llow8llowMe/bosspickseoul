import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const readRoute = (route: string) =>
  readFileSync(join(process.cwd(), 'app/(shell)/chatting', route), 'utf8')

describe('chatting route contracts', () => {
  it('renders the V2 waiting state from the list route without legacy network UI', () => {
    const source = readRoute('list/page.tsx')

    expect(source).toContain('ChattingUnavailablePage')
    expect(source).not.toContain('chatting-list-page')
  })

  it('keeps room id validation while disconnecting the legacy realtime UI', () => {
    const source = readRoute('[roomId]/page.tsx')

    expect(source).toContain('ChattingUnavailablePage')
    expect(source).not.toContain('chatting-detail-page')
    expect(source).toContain('Number.isFinite')
    expect(source).toContain('resolvedRoomId <= 0')
  })
})
