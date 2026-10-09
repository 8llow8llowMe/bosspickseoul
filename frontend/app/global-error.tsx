'use client'

import { useEffect } from 'react'

/*
  루트 레이아웃이 실패했을 때의 마지막 화면이다. 루트 레이아웃(styled-components 레지스트리 · 전역 스타일 ·
  폰트)을 대체하므로 그것들에 기대지 않고 인라인 스타일만 쓴다. 홈 링크는 문서를 새로 받기 위해 <a> 를 쓴다.
  global-error 는 클라이언트 컴포넌트라 metadata 를 내보낼 수 없어 <title> 을 직접 둔다.
*/
const copy = {
  title: '화면을 불러오지 못했어요',
  description: '일시적인 문제일 수 있어요. 잠시 뒤에 다시 시도해 주세요.',
  retry: '다시 시도',
  home: '홈으로',
} as const

const buttonStyle = {
  minHeight: 48,
  padding: '0 18px',
  borderRadius: 12,
  border: '1px solid transparent',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'inherit',
} as const

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          padding: 20,
          background: '#ffffff',
          color: '#191f28',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
          textAlign: 'center',
        }}
      >
        <title>{copy.title}</title>
        <main style={{ display: 'grid', gap: 12, justifyItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
            {copy.title}
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: '#4e5968' }}>
            {copy.description}
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              onClick={() => retry()}
              style={{ ...buttonStyle, background: '#1a5fcc', color: '#fff' }}
              type="button"
            >
              {copy.retry}
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                ...buttonStyle,
                background: '#e8f3ff',
                color: '#1a5fcc',
              }}
            >
              {copy.home}
            </a>
          </div>
        </main>
      </body>
    </html>
  )
}
