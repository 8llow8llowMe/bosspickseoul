/**
 * 라우트별 메타데이터. `app/sitemap.ts` 가 경로와 색인 여부를 여기서 읽는다.
 *
 * 원래는 `route-placeholder-page.tsx` 가 이 타입을 내보내고 자리표시 화면도 그렸지만,
 * 실제 화면이 전부 붙은 뒤로 그 컴포넌트를 마운트하는 라우트가 없어졌다. 타입만 여기로
 * 옮기고 컴포넌트는 지웠다.
 */
export type RouteSkeletonDefinition = {
  title: string
  path: string
  description: string
  visibility: 'index' | 'noindex'
}

type RouteKey =
  | 'home'
  | 'register'
  | 'login'
  | 'accountDeleted'
  | 'profileBookmarks'
  | 'profileBookmarksAnalysis'
  | 'profileBookmarksRecommend'
  | 'profileBookmarksSimulation'
  | 'profileSettingsEdit'
  | 'profileSettingsChangePassword'
  | 'profileSettingsWithdraw'
  | 'status'
  | 'analysis'
  | 'analysisResult'
  | 'analysisSimulation'
  | 'analysisSimulationReport'
  | 'analysisSimulationCompare'
  | 'recommend'
  | 'simulation'
  | 'simulationReport'
  | 'simulationCompare'
  | 'communityList'
  | 'communityRegister'
  | 'communityDetail'
  | 'chattingList'
  | 'chattingDetail'

export const routeSkeletons: Record<RouteKey, RouteSkeletonDefinition> = {
  home: {
    title: '메인 페이지',
    path: '/',
    description:
      '서비스 메인 진입 경로입니다. 이후 실제 메인 UI와 소개 섹션을 이관합니다.',
    visibility: 'index',
  },
  register: {
    title: '회원가입 시작',
    path: '/register',
    description:
      '회원가입 진입 화면 라우트 골격입니다. 인증 화면은 기본적으로 noindex 정책을 사용합니다.',
    visibility: 'noindex',
  },
  login: {
    title: '로그인',
    path: '/login',
    description:
      '로그인 화면 라우트 골격입니다. 이후 인증 폼과 FCM 분기 로직을 이관합니다.',
    visibility: 'noindex',
  },
  accountDeleted: {
    title: '탈퇴 완료',
    path: '/account-deleted',
    description: '회원 탈퇴 완료 안내 화면 라우트 골격입니다.',
    visibility: 'noindex',
  },
  profileBookmarks: {
    title: '보관함',
    path: '/profile/bookmarks',
    description: '프로필 보관함 메인 화면 라우트 골격입니다.',
    visibility: 'noindex',
  },
  profileBookmarksAnalysis: {
    title: '분석 보관함',
    path: '/profile/bookmarks/analysis',
    description: '분석 결과 보관함 화면 라우트 골격입니다.',
    visibility: 'noindex',
  },
  profileBookmarksRecommend: {
    title: '추천 보관함',
    path: '/profile/bookmarks/recommend',
    description: '추천 결과 보관함 화면 라우트 골격입니다.',
    visibility: 'noindex',
  },
  profileBookmarksSimulation: {
    title: '시뮬레이션 보관함',
    path: '/profile/bookmarks/simulation',
    description: '시뮬레이션 리포트 보관함 화면 라우트 골격입니다.',
    visibility: 'noindex',
  },
  profileSettingsEdit: {
    title: '프로필 수정',
    path: '/profile/settings/edit',
    description: '프로필 수정 화면 라우트 골격입니다.',
    visibility: 'noindex',
  },
  profileSettingsChangePassword: {
    title: '비밀번호 변경',
    path: '/profile/settings/change-password',
    description: '비밀번호 변경 화면 라우트 골격입니다.',
    visibility: 'noindex',
  },
  profileSettingsWithdraw: {
    title: '회원 탈퇴',
    path: '/profile/settings/withdraw',
    description: '회원 탈퇴 화면 라우트 골격입니다.',
    visibility: 'noindex',
  },
  status: {
    title: '상권 현황',
    path: '/status',
    description: '상권 현황 조회 화면 라우트 골격입니다.',
    visibility: 'index',
  },
  analysis: {
    title: '상권 분석',
    path: '/analysis',
    description: '상권 분석 입력 화면 라우트 골격입니다.',
    visibility: 'noindex',
  },
  analysisResult: {
    title: '상권 분석 결과',
    path: '/analysis/result',
    description: '상권 분석 결과 화면 라우트 골격입니다.',
    visibility: 'noindex',
  },
  analysisSimulation: {
    title: '분석 기반 시뮬레이션',
    path: '/analysis/simulation',
    description: '분석 흐름 안의 시뮬레이션 화면 라우트 골격입니다.',
    visibility: 'noindex',
  },
  analysisSimulationReport: {
    title: '분석 기반 시뮬레이션 리포트',
    path: '/analysis/simulation/report',
    description: '분석 흐름 안의 시뮬레이션 리포트 화면 라우트 골격입니다.',
    visibility: 'noindex',
  },
  analysisSimulationCompare: {
    title: '분석 기반 시뮬레이션 비교',
    path: '/analysis/simulation/compare',
    description: '분석 흐름 안의 시뮬레이션 비교 화면 라우트 골격입니다.',
    visibility: 'noindex',
  },
  recommend: {
    title: '상권 추천',
    path: '/recommend',
    description: '상권 추천 조회 화면 라우트 골격입니다.',
    visibility: 'index',
  },
  simulation: {
    title: '시뮬레이션',
    path: '/simulation',
    description: '독립 시뮬레이션 입력 화면 라우트 골격입니다.',
    visibility: 'noindex',
  },
  simulationReport: {
    title: '시뮬레이션 리포트',
    path: '/simulation/report',
    description: '독립 시뮬레이션 리포트 화면 라우트 골격입니다.',
    visibility: 'noindex',
  },
  simulationCompare: {
    title: '시뮬레이션 비교',
    path: '/simulation/compare',
    description: '독립 시뮬레이션 비교 화면 라우트 골격입니다.',
    visibility: 'noindex',
  },
  communityList: {
    title: '커뮤니티 목록',
    path: '/community/list',
    description: '공개 커뮤니티 목록 화면 라우트 골격입니다.',
    visibility: 'index',
  },
  communityRegister: {
    title: '커뮤니티 글 등록',
    path: '/community/register',
    description: '커뮤니티 글 등록 화면 라우트 골격입니다.',
    visibility: 'noindex',
  },
  communityDetail: {
    title: '커뮤니티 상세',
    path: '/community/[communityId]',
    description: '공개 커뮤니티 상세 화면 라우트 골격입니다.',
    visibility: 'index',
  },
  chattingList: {
    title: '채팅 목록',
    path: '/chatting/list',
    description:
      '채팅 목록 화면 라우트 골격입니다. 실시간 기능은 이후 단계에서 이관합니다.',
    visibility: 'noindex',
  },
  chattingDetail: {
    title: '채팅 상세',
    path: '/chatting/[roomId]',
    description: '채팅방 상세 화면 라우트 골격입니다.',
    visibility: 'noindex',
  },
}
