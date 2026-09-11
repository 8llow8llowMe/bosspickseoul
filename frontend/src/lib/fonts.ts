import localFont from 'next/font/local'

/**
 * Pretendard 서브셋 가변 폰트 1파일.
 *
 * 정본 명세: docs/features/layout/pretendard-subset.md
 * 파일 생성 절차: scripts/fonts/subset-pretendard.sh (폰트 버전을 올릴 때만 1회 실행)
 *
 * `weight` 를 파일의 실제 축(45~930)이 아니라 `'400 700'` 으로 좁게 선언한다.
 * 그래야 그 밖의 값이 클램프돼 DESIGN.md §3 의 4무게 제약이 CSS 레벨에서 강제된다.
 *
 * `adjustFontFallback` 은 지정하지 않는다. next/font 가 계산한 폴백 메트릭
 * 오버라이드가 지금의 CLS 0 을 만들고 있어 건드리면 깨진다.
 */
export const pretendard = localFont({
  src: [
    {
      path: '../../public/fonts/PretendardVariable.subset.woff2',
      weight: '400 700',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-pretendard',
  fallback: [
    'Toss Product Sans',
    'Tossface',
    'SF Pro KR',
    'SF Pro Display',
    'Apple SD Gothic Neo',
    'Roboto',
    'Noto Sans KR',
    'Malgun Gothic',
    'system-ui',
    'sans-serif',
  ],
})
