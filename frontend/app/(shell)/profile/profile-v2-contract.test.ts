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

  it('reads the simulation saved list from the V2 histories endpoint only', () => {
    // 이 단언은 placeholder 시절 `useQuery` 자체를 금지했다. B2 에서 V2 이력 목록이
    // 실제로 붙었으므로, 막아야 할 것을 다시 적는다: **V1 저장 목록 경로**다.
    const source = readSource(
      'src/components/profile/profile-simulation-bookmarks-page.tsx',
    )

    expect(source).not.toContain('fetchSavedSimulationList')
    expect(source).toContain('fetchSimulationHistories')
  })

  it('keeps the simulation history endpoints on the V2 path', () => {
    const source = readSource('src/lib/api/simulation.ts')

    expect(source).toContain("'/simulations/histories'")
    expect(source).not.toContain('/simulation/list')
    expect(source).not.toContain('/simulation/save')
  })
})
