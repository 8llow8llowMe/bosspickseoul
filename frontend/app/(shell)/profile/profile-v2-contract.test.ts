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
  ])('%s does not execute an unsupported mutation', path => {
    const source = readSource(path)

    expect(source).not.toContain('useMutation')
    expect(source).not.toContain('@/lib/api/profile')
  })

  it('회원 탈퇴는 V2 전용 라우트만 쓴다', () => {
    // 이 단언은 placeholder 시절 `useMutation` 자체를 금지했다. A1 에서 탈퇴가 실제로
    // 붙었으므로, 막아야 할 것을 다시 적는다: **V1 삭제 경로**와 백엔드 직접 호출이다.
    // (`/members/me/withdraw` 는 서버 세션을 파괴해야 해서 전용 라우트를 거친다.)
    const source = readSource(
      'src/components/profile/profile-withdraw-page.tsx',
    )

    expect(source).not.toContain('/member/delete')
    expect(source).not.toContain('@/lib/api/profile')
    expect(source).toContain('@/lib/api/member-withdraw')
  })

  it('탈퇴 라우트는 성공했을 때만 세션을 파괴한다', () => {
    // 실패해도 세션을 지우면 "로그아웃됐는데 계정은 남은" 상태가 된다.
    // `clearSession` 이 실패 분기보다 **뒤에** 있어야 한다.
    const source = readSource('app/api/auth/withdraw/route.ts')

    expect(source).toContain('/api/v1/members/me/withdraw')
    expect(source.indexOf('clearSession()')).toBeGreaterThan(
      source.indexOf('upstream.status === 200 ? 500 : upstream.status'),
    )
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
