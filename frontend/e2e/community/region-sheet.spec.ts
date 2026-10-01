import { expect, test } from './test'
import { openCommunityList } from './measure'

/**
 * 지역 선택 시트(CM-016·017) — 단계 이동은 URL 을 바꾸지 않고, 확정할 때만 바꾼다.
 * 닫으면 포커스가 칩으로 돌아온다. 포커스 이동·포털·Esc 는 실제 브라우저에서 본다.
 * 목 데이터는 강남구 → 역삼1동 → 강남역 상권만 하위 목록이 있다.
 */

const CHIP = '[data-region-chip="filter"]'

test.describe('커뮤니티 지역 선택 시트', () => {
  test('자치구로 들어갔다가 Esc 로 닫으면 URL 이 그대로이고 칩에 포커스가 돌아온다 (CM-016)', async ({
    page,
  }) => {
    await openCommunityList(page)
    const before = page.url()

    await page.locator(CHIP).click()
    const sheet = page.getByRole('dialog', { name: '지역 선택' })
    await expect(sheet).toBeVisible()

    await sheet.getByRole('button', { name: '강남구', exact: true }).click()
    await expect(
      sheet.getByRole('button', { name: '강남구 전체', exact: true }),
    ).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
    expect(page.url()).toBe(before)
    await expect(page.locator(CHIP)).toBeFocused()
  })

  test('`강남구 전체` 를 고르면 자치구 대상으로 바뀌고 제목이 `강남구 이야기` 다 (CM-017)', async ({
    page,
  }) => {
    await openCommunityList(page)

    await page.locator(CHIP).click()
    const sheet = page.getByRole('dialog', { name: '지역 선택' })
    await sheet.getByRole('button', { name: '강남구', exact: true }).click()
    await sheet
      .getByRole('button', { name: '강남구 전체', exact: true })
      .click()

    await expect(sheet).toBeHidden()
    await expect(page).toHaveURL(/[?&]targetType=DISTRICT(&|$)/)
    await expect(page).toHaveURL(/[?&]targetCode=11680(&|$)/)
    await expect(page.locator('h1')).toHaveText('강남구 이야기')
  })
})
