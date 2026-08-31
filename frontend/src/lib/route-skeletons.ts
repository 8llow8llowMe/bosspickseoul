/**
 * sitemap 이 읽는 라우트 목록. **여기 있는 두 필드가 전부다** — `app/sitemap.ts` 는
 * `visibility` 로 거르고 `path` 를 URL 로 만든다. 화면의 제목·설명은 각 라우트의
 * `createPageMetadata` 가 정본이니 여기에 다시 두지 않는다.
 *
 * 원래는 `route-placeholder-page.tsx` 가 이 타입을 내보내고 자리표시 화면도 그렸다.
 * 실제 화면이 전부 붙으면서 그 컴포넌트를 마운트하는 라우트가 없어졌고, 화면이 쓰던
 * `title`·`description` 은 아무도 읽지 않는 채 낡은 내부 카피만 나르고 있었다
 * (예: 「이후 인증 폼과 FCM 분기 로직을 이관합니다」). 컴포넌트와 함께 지웠다.
 */
export type RouteSkeletonDefinition = {
  path: string
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
    path: '/',
    visibility: 'index',
  },
  register: {
    path: '/register',
    visibility: 'noindex',
  },
  login: {
    path: '/login',
    visibility: 'noindex',
  },
  accountDeleted: {
    path: '/account-deleted',
    visibility: 'noindex',
  },
  profileBookmarks: {
    path: '/profile/bookmarks',
    visibility: 'noindex',
  },
  profileBookmarksAnalysis: {
    path: '/profile/bookmarks/analysis',
    visibility: 'noindex',
  },
  profileBookmarksRecommend: {
    path: '/profile/bookmarks/recommend',
    visibility: 'noindex',
  },
  profileBookmarksSimulation: {
    path: '/profile/bookmarks/simulation',
    visibility: 'noindex',
  },
  profileSettingsEdit: {
    path: '/profile/settings/edit',
    visibility: 'noindex',
  },
  profileSettingsChangePassword: {
    path: '/profile/settings/change-password',
    visibility: 'noindex',
  },
  profileSettingsWithdraw: {
    path: '/profile/settings/withdraw',
    visibility: 'noindex',
  },
  status: {
    path: '/status',
    visibility: 'index',
  },
  analysis: {
    path: '/analysis',
    visibility: 'noindex',
  },
  analysisResult: {
    path: '/analysis/result',
    visibility: 'noindex',
  },
  analysisSimulation: {
    path: '/analysis/simulation',
    visibility: 'noindex',
  },
  analysisSimulationReport: {
    path: '/analysis/simulation/report',
    visibility: 'noindex',
  },
  analysisSimulationCompare: {
    path: '/analysis/simulation/compare',
    visibility: 'noindex',
  },
  recommend: {
    path: '/recommend',
    visibility: 'index',
  },
  simulation: {
    path: '/simulation',
    visibility: 'noindex',
  },
  simulationReport: {
    path: '/simulation/report',
    visibility: 'noindex',
  },
  simulationCompare: {
    path: '/simulation/compare',
    visibility: 'noindex',
  },
  communityList: {
    path: '/community/list',
    visibility: 'index',
  },
  communityRegister: {
    path: '/community/register',
    visibility: 'noindex',
  },
  communityDetail: {
    path: '/community/[communityId]',
    visibility: 'index',
  },
  chattingList: {
    path: '/chatting/list',
    visibility: 'noindex',
  },
  chattingDetail: {
    path: '/chatting/[roomId]',
    visibility: 'noindex',
  },
}
