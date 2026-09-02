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

  it('프로필 이미지는 전용 API 로만 바꾼다', () => {
    // 이 단언은 placeholder 시절 `useMutation` 자체를 금지했다. A3 에서 이미지 업로드·
    // 삭제가 실제로 붙었으므로, 막아야 할 것을 다시 적는다.
    //
    // **핵심은 `profileImageUrl` 을 PATCH 로 보내지 않는 것**이다. 백엔드가 임의 URL
    // 주입(외부 이미지를 우리 서비스인 것처럼 노출)을 막으려고 `PATCH /members/me` 에서
    // 그 필드를 걷어냈다(`file-upload-guide.md`). V1 의 firebase 직접 업로드도 금지다.
    const source = readSource('src/components/profile/profile-edit-page.tsx')

    expect(source).not.toContain('@/lib/api/profile')
    expect(source).not.toContain('/firebase/upload')
    // PATCH 를 아예 부르지 않는다 — 이 화면이 회원 정보를 고치는 유일한 통로는 전용 API 다.
    expect(source).not.toContain('apiClient')
    expect(source).not.toMatch(/\.patch\(/)
    expect(source).toContain('@/lib/api/member-profile-image')
  })

  it('이미지 업로드는 BFF 를 거친다 — 전용 라우트를 만들지 않는다', () => {
    // A1·A2 가 전용 라우트였던 이유는 **서버 세션을 파괴해야** 해서다. 이미지 변경은
    // 토큰을 건드리지 않으므로 BFF 로 충분하고, BFF 를 거치면 accessToken 선재발급과
    // 401 재시도를 공짜로 얻는다. 전용 라우트를 만들면 그것을 스스로 다시 짜야 한다.
    const source = readSource('src/lib/api/member-profile-image.ts')

    expect(source).toContain("'/api/bff/members/me/profile-image'")
    expect(source).not.toContain('@/lib/auth/session')
  })

  it('업로드 상한은 정본 한 곳에서만 정의된다', () => {
    // 게시글 이미지(A4)가 같은 상한을 쓴다. 두 벌로 나뉘면 한쪽이 거부하는 파일을
    // 다른 쪽이 올려 보낸다.
    expect(readSource('src/lib/upload/image-rules.ts')).toContain(
      'export const MAX_IMAGE_BYTES',
    )
    expect(
      readSource('src/components/profile/profile-edit-page.tsx'),
    ).toContain("from '@/lib/upload/image-rules'")
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

  it('비밀번호 화면은 V2 전용 라우트만 쓴다', () => {
    // 이 단언은 placeholder 시절 `useMutation` 자체를 금지했다. A2 에서 변경·최초 설정·
    // 소셜 전용 전환이 실제로 붙었으므로, 막아야 할 것을 다시 적는다: **V1 변경 경로**와
    // 백엔드 직접 호출이다. (변경·전환은 서버 세션을 파괴해야 해서 전용 라우트를 거친다.)
    const source = readSource(
      'src/components/profile/profile-change-password-page.tsx',
    )

    expect(source).not.toContain('/member/password/change')
    expect(source).not.toContain('@/lib/api/profile')
    expect(source).toContain('@/lib/api/member-password')
  })

  it('비밀번호 변경·전환 라우트는 성공했을 때만 세션을 파괴한다', () => {
    // 실패해도 세션을 지우면 "로그아웃됐는데 비밀번호는 그대로"가 되어, 사용자가
    // 성공했다고 오해하고 새 비밀번호로 로그인을 시도한다.
    const source = readSource('app/api/auth/password/route.ts')

    expect(source).toContain('/api/v1/members/me/password')
    expect(source.indexOf('clearSession()')).toBeGreaterThan(
      source.indexOf('if (!outcome.ok) return failure(outcome)'),
    )
  })

  it('비밀번호 최초 설정 라우트는 세션을 건드리지 않는다', () => {
    // BE `setupPassword` 는 형제들과 달리 `tokenId` 를 받지 않는다 — 토큰을 건드리지
    // 않으므로 여기서 세션을 지우면 **아무 이유 없이** 로그아웃시키는 것이다.
    const source = readSource('app/api/auth/password/setup/route.ts')

    expect(source).toContain('/api/v1/members/me/password/setup')
    // 부르지도, 가져오지도 않는다. (설명 주석에는 이름이 나오므로 호출·import 만 본다.)
    expect(source).not.toContain('clearSession(')
    expect(source).toContain("import { getSession } from '@/lib/auth/session'")
  })

  it('비밀번호 규칙은 정본 한 곳에서만 정의된다', () => {
    // 규칙을 두 벌 만들면 한쪽이 거부하는 값을 다른 쪽이 통과시키고, 그 어긋남은
    // 백엔드 400 으로만 드러난다. `new RegExp` 는 정본 파일에만 있어야 한다.
    expect(readSource('src/lib/auth/password-rules.ts')).toContain(
      'export const PASSWORD_PATTERN = new RegExp',
    )
    expect(readSource('src/components/auth/register-machine.ts')).not.toContain(
      'export const PASSWORD_PATTERN = new RegExp',
    )
    expect(
      readSource('src/components/profile/profile-change-password-page.tsx'),
    ).toContain("from '@/lib/auth/password-rules'")
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
