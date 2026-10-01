import { expect, test as base } from '@playwright/test'
import { routeCommunityApi, type CommunityApi } from '../fixtures/community'

/**
 * 커뮤니티 e2e 의 `test`. 모든 테스트가 **자동으로** 커뮤니티 BFF 고정 응답을 깐다
 * (`e2e/fixtures/community.ts`). 그래서 dev 서버와 프로덕션 빌드(`pnpm start`)에서 같은 화면을 잰다.
 *
 * 테스트가 끝나면 가로채지 못한 BFF 호출과 처리 중 예외가 없는지 본다 — 백엔드가 없는 CI 에서
 * 호출이 조용히 실패하면 그 화면은 빈 상태로 그려지고, 테스트는 엉뚱한 단언에서 깨진다.
 * 실패를 일부러 일으키는 테스트는 `communityApi.errors` 를 확인한 뒤 비운다.
 */
export const test = base.extend<{ communityApi: CommunityApi }>({
  communityApi: [
    async ({ context, baseURL }, use) => {
      const api = await routeCommunityApi(
        context,
        baseURL ?? 'http://localhost:5173',
      )
      await use(api)
      expect(api.unhandled, '고정 응답이 없는 BFF 호출').toEqual([])
      expect(api.errors, '고정 응답을 만들다 예외가 난 BFF 호출').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
