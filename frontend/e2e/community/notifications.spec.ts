import { E2E_NOTIFICATION_TOTAL } from '../fixtures/community'
import { expect, test } from './test'

/**
 * 커뮤니티 알림 — 헤더 종·배지(CM-063), 알림 목록 무한 스크롤·삭제된 글(CM-066·068), 단건 읽음 뒤 댓글 앵커
 * 이동(CM-069), 모두 읽음 뒤 배지(CM-070).
 *
 * BE 알림 API 는 아직 머지 전이라 응답은 `e2e/fixtures/community.ts` 가 설계 문서(§7) 모양으로 만든다.
 * 앵커 이동은 댓글이 늦게 도착한 뒤의 scrollIntoView 라 실제 브라우저가 있어야 안다.
 */

const BELL = '[data-community-notification-bell]'
const BADGE = '[data-community-notification-badge]'
const ROW = '[data-community-notification]'

test.describe('커뮤니티 알림', () => {
  test('헤더 종에 안 읽은 수 배지가 있고 알림 목록으로 간다 (CM-063)', async ({
    page,
  }) => {
    await page.goto('/community/list')

    const bell = page.locator(BELL)
    await expect(page.locator(BADGE)).toHaveText('3')
    await expect(bell).toHaveAttribute('aria-label', '알림, 안 읽은 알림 3개')

    await bell.click()
    await expect(page).toHaveURL(/\/community\/notifications$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('알림')
  })

  test('끝까지 내리면 다음 쪽이 붙고, 사라진 글은 링크가 아니다 (CM-066·068)', async ({
    page,
  }) => {
    await page.goto('/community/notifications')

    const rows = page.locator(ROW)
    await expect(rows.first()).toBeVisible()
    await expect(rows).toHaveCount(20)

    const deleted = rows.nth(2)
    await expect(deleted).toContainText('삭제된 글이라 열 수 없어요')
    expect(await deleted.evaluate(node => node.tagName)).toBe('DIV')

    await rows.last().scrollIntoViewIfNeeded()
    await expect(rows).toHaveCount(E2E_NOTIFICATION_TOTAL)
    await expect(page.getByText('알림을 모두 불러왔어요')).toBeVisible()
  })

  test('「안 읽은 것만」은 주소에 실리고 안 읽은 알림만 보인다', async ({
    page,
  }) => {
    await page.goto('/community/notifications')
    await expect(page.locator(ROW).first()).toBeVisible()

    await page.getByRole('button', { name: '안 읽은 것만' }).click()
    await expect(page).toHaveURL(/\/community\/notifications\?unread=1$/)
    await expect(page.locator(ROW)).toHaveCount(3)
  })

  test('접힌 답글 알림을 누르면 읽음 처리 뒤 그 답글이 화면에 온다 (CM-069)', async ({
    page,
  }) => {
    await page.goto('/community/notifications')
    const first = page.locator(ROW).first()
    await expect(first).toHaveAttribute('data-read', 'false')

    await first.click()
    await expect(page).toHaveURL(/\/community\/9#comment-906$/)

    const target = page.locator('#comment-906')
    await expect(target).toBeInViewport()
    // 읽은 만큼 헤더 배지가 줄었다.
    await expect(page.locator(BADGE)).toHaveText('2')
  })

  test('「모두 읽음」 뒤 헤더 배지가 사라진다 (CM-070)', async ({ page }) => {
    await page.goto('/community/notifications')
    await expect(page.locator(BADGE)).toHaveText('3')

    await page.getByRole('button', { name: '모두 읽음' }).click()

    await expect(page.locator(BADGE)).toHaveCount(0)
    await expect(page.locator(`${ROW}[data-read="false"]`)).toHaveCount(0)
    await expect(page.getByRole('button', { name: '모두 읽음' })).toBeDisabled()
  })

  test('가로 넘침이 없다', async ({ page }) => {
    await page.goto('/community/notifications')
    await expect(page.locator(ROW).first()).toBeVisible()

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
