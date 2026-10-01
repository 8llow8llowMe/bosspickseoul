import { expect, test } from './test'

/**
 * 글쓰기 임시 저장(CM-034) — 입력이 멈추고 1초 뒤 localStorage 에 저장, 새로고침 뒤 다시 들어오면
 * 폼보다 먼저 `작성하던 글이 있어요` 를 묻고 `이어 쓰기` 면 제목이 돌아온다.
 *
 * 저장 키·직렬화·복원 분기는 vitest(`editor-draft`·`use-community-draft-autosave`)가 본다. 여기서는
 * 실제 새로고침(beforeunload 확인 포함)을 건너 살아남는지만 본다. 로그인 회원은 고정 응답의 목 회원(9001)이다(`e2e/fixtures/community.ts`).
 */

const DRAFT_KEY = 'community-draft:9001:new'
const TITLE = 'e2e 임시 저장 제목'

test.describe('커뮤니티 글쓰기 임시 저장', () => {
  test('제목을 쓰다 새로고침해도 `이어 쓰기` 로 돌아온다 (CM-034)', async ({
    page,
  }) => {
    test.skip(
      test.info().project.name !== 'mobile',
      '흐름은 폭과 무관하다 — 모바일 편집 바 화면 하나에서만 본다.',
    )

    // 내용이 바뀐 채로 새로고침하면 beforeunload 확인이 뜬다. 나가기를 고른다.
    page.on('dialog', dialog => {
      void dialog.accept()
    })

    await page.goto('/community/register', {
      waitUntil: 'domcontentloaded',
    })
    await page.evaluate(() => {
      Object.keys(window.localStorage)
        .filter(key => key.startsWith('community-draft:'))
        .forEach(key => window.localStorage.removeItem(key))
    })
    await page.reload({ waitUntil: 'domcontentloaded' })

    const title = page.getByPlaceholder('제목을 입력해 주세요')
    await expect(title).toBeVisible()
    await title.fill(TITLE)

    // 고정 sleep 대신 저장본이 생길 때까지 기다린다(입력 멈춤 1초 뒤 저장).
    await expect
      .poll(
        () =>
          page.evaluate(
            key => window.localStorage.getItem(key) ?? '',
            DRAFT_KEY,
          ),
        { timeout: 5_000 },
      )
      .toContain(TITLE)

    await page.reload({ waitUntil: 'domcontentloaded' })

    await expect(
      page.getByRole('heading', { name: '작성하던 글이 있어요' }),
    ).toBeVisible()
    await page.getByRole('button', { name: '이어 쓰기' }).click()
    await expect(page.getByPlaceholder('제목을 입력해 주세요')).toHaveValue(
      TITLE,
    )
  })
})
