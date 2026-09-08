import { describe, expect, it } from 'vitest'

import { createPageMetadata } from './metadata'

/**
 * 회귀 방지 — `openGraph`/`twitter` 는 상위(루트 레이아웃) 메타데이터를
 * 얕게 덮어쓴다. 이 헬퍼가 `images` 없이 `openGraph` 를 반환하면
 * `app/opengraph-image.tsx` 가 파일 컨벤션으로 붙여주는 OG 이미지가 통째로
 * 사라진다 — 실제로 그렇게 배포돼 `index.html`/`login.html`/`status.html`
 * 전부 `og:title` 은 있는데 `og:image` 가 없었다. 이 헬퍼를 쓰는 페이지가
 * OG/Twitter 이미지를 잃지 않는지 여기서 못박는다.
 */
describe('createPageMetadata', () => {
  it('openGraph 에 opengraph-image 라우트를 이미지로 포함한다', () => {
    const metadata = createPageMetadata({})

    expect(metadata.openGraph?.images).toEqual([
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'BossPickSeoul',
      },
    ])
  })

  it('twitter 카드도 같은 이미지를 포함한다 — summary_large_image 는 이미지가 없으면 빈 카드가 된다', () => {
    const metadata = createPageMetadata({})

    expect(metadata.twitter).toMatchObject({
      card: 'summary_large_image',
      images: [
        {
          url: '/opengraph-image',
          width: 1200,
          height: 630,
          alt: 'BossPickSeoul',
        },
      ],
    })
  })

  it('옵션을 넘겨도(제목 있는 페이지) 이미지는 그대로 유지된다', () => {
    const metadata = createPageMetadata({
      title: '상권 분석',
      path: '/analysis',
    })

    expect(metadata.openGraph?.images).toEqual([
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'BossPickSeoul',
      },
    ])
  })
})
