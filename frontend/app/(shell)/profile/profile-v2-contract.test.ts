import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const readSource = (path: string) =>
  readFileSync(join(process.cwd(), path), 'utf8')

describe('profile V2 API contract', () => {
  it('keeps only the supported member info endpoint in the profile API module', () => {
    const source = readSource('src/lib/api/profile.ts')

    expect(source).toContain("'/members/me'")
    expect(source).not.toContain('/member/update')
    expect(source).not.toContain('/member/password/change')
    expect(source).not.toContain('/member/delete')
    expect(source).not.toContain('/firebase/upload')
  })

  it.each([
    'src/components/profile/profile-edit-page.tsx',
    'src/components/profile/profile-change-password-page.tsx',
    'src/components/profile/profile-withdraw-page.tsx',
  ])('%s does not execute an unsupported mutation', path => {
    const source = readSource(path)

    expect(source).not.toContain('useMutation')
    expect(source).not.toContain('@/lib/api/profile')
  })

  it('does not request a legacy simulation saved list', () => {
    const source = readSource(
      'src/components/profile/profile-simulation-bookmarks-page.tsx',
    )

    expect(source).not.toContain('fetchSavedSimulationList')
    expect(source).not.toContain('useQuery')
    expect(source).toContain('V2 API')
  })
})
