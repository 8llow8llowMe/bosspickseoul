import localFont from 'next/font/local'

export const pretendard = localFont({
  src: [
    {
      path: '../../public/fonts/Pretendard-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Pretendard-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Pretendard-SemiBold.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../../public/fonts/Pretendard-Bold.woff2',
      weight: '700',
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
