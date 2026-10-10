import { defineConfig, devices } from '@playwright/test'

/**
 * 브라우저 실측 회귀(Playwright).
 *
 * 역할 분담은 `docs/runbook/qa.md` 「브라우저 실측 회귀」 절이 정본이다.
 * - 로직·마크업 단언은 vitest(`environment: 'node'` + `renderToStaticMarkup`)가 본다.
 * - **실제 레이아웃·대비·터치 타깃처럼 렌더 결과가 있어야 알 수 있는 값**만 여기서 잰다.
 *
 * 서버 전제: 로컬은 `PORT=5173 pnpm dev` 로 이미 떠 있는 서버를 그대로 쓴다
 * (`reuseExistingServer: true`). 다른 오리진을 보려면 `PLAYWRIGHT_BASE_URL` 로 덮는다.
 *
 * CI 는 프로덕션 빌드를 따로 띄운 뒤 `PLAYWRIGHT_BASE_URL` 을 주는 방식을 쓴다.
 *   pnpm build && pnpm start -p 5173 &
 *   PLAYWRIGHT_BASE_URL=http://localhost:5173 pnpm test:e2e
 * dev 서버와 프로덕션 서버는 번들·폰트 로딩이 달라 기준선이 어긋나므로,
 * 기준선(`e2e/baselines/*.json`)은 **dev 서버 기준**으로 유지한다.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'

/**
 * 서버가 없을 때 `webServer` 가 띄우는 dev 서버 포트는 baseURL 에서 읽는다. 5173 을 다른 작업이
 * 쓰고 있으면 `PLAYWRIGHT_BASE_URL=http://localhost:5197` 처럼 오리진만 바꿔 다른 포트로 돈다 —
 * baseURL 과 띄우는 포트가 어긋나면 엉뚱한 서버를 재거나 준비를 기다리다 시간이 끝난다.
 */
const webServerPort = new URL(baseURL).port || '5173'

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      // 감사(2026-09-11)와 같은 375×812 로 고정한다. iPhone 13 프리셋은 390×844 라
      // 뷰포트만 덮어쓰고 터치·모바일 UA 는 프리셋 값을 쓴다. 브라우저는 chromium 하나로 통일.
      name: 'mobile',
      use: {
        ...devices['iPhone 13'],
        browserName: 'chromium',
        viewport: { width: 375, height: 812 },
      },
    },
  ],
  webServer: {
    command: `pnpm dev -p ${webServerPort}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 180_000,
  },
})
