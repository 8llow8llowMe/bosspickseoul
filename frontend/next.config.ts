import type { NextConfig } from 'next'
import { HTML_LIMITED_BOT_UA_RE_STRING } from 'next/dist/shared/lib/router/utils/is-bot'

import { EXTRA_LINK_PREVIEW_BOTS_SOURCE } from './src/lib/share/link-preview-bots'

const nextConfig: NextConfig = {
  // 메타를 스트리밍하지 않고 `<head>` 에 막아 넣을 봇. 지정하면 Next 기본 목록을 **대체**하므로
  // 기본 목록(HTML_LIMITED_BOT_UA_RE_STRING)에 카카오톡·다음·텔레그램 미리보기 봇을 더한다.
  // 카카오톡(`kakaotalk-scrap`)이 기본 목록에 없어 `/s/{shareCode}` 의 og:title 이 `</head>` 뒤로
  // 밀렸다(2026-10-10 실측, share.md D4-1). 내부 경로 import 라 Next 가 옮기면 빌드가 깨진다 — 조용히
  // 기본 목록을 잃는 것보다 낫다. 문서: node_modules/next/dist/docs/.../next-config-js/htmlLimitedBots.md
  htmlLimitedBots: new RegExp(
    `${HTML_LIMITED_BOT_UA_RE_STRING}|${EXTRA_LINK_PREVIEW_BOTS_SOURCE}`,
    'i',
  ),
  // 배포는 Jenkins 빌더가 만든 산출물만 배포 호스트로 옮기는 방식이라
  // 서버 실행에 필요한 node_modules 까지 포함된 self-contained 번들이 필요하다.
  // (백엔드가 bootJar 산출물 하나만 옮기는 것과 같은 구조)
  output: 'standalone',
  // 추적 루트를 프로젝트 디렉터리로 고정한다. 비워두면 Next 가 lock 파일을 찾아
  // 루트를 추론하는데, 나중에 레포 최상단에 lock 파일이 생기면 backend/ 까지 훑게 된다.
  // 빌드는 항상 frontend/ 에서 실행하므로 cwd 가 곧 프로젝트 루트다.
  outputFileTracingRoot: process.cwd(),
  images: {
    // 이미지 최적화를 끈다. 이유가 둘이다.
    // 1) 최적화에 쓰이는 sharp 는 플랫폼별 네이티브 바이너리다. 빌드는 x86_64 Jenkins 빌더에서,
    //    실행은 aarch64 라즈베리파이에서 하므로 번들에 섞이면 런타임에 로드가 실패한다.
    // 2) 배포 호스트가 라즈베리파이라 온디맨드 이미지 리사이즈를 감당할 CPU 여유가 없다.
    // 정적 이미지는 public/ 에서 그대로 서빙되고 nginx 가 캐시 헤더를 붙인다.
    unoptimized: true,
  },
  // sharp 를 추적 대상에서 아예 뺀다. unoptimized 라 런타임에 쓰이지 않는데도
  // next 의 optional dependency 라서 그냥 두면 번들에 들어간다.
  // 번들에 네이티브 바이너리가 하나도 없어야 배포 파이프라인의 아키텍처 검사가 의미를 가진다.
  // 경로 앞에 **/ 가 필요하다. pnpm 은 node_modules/.pnpm/sharp@x/node_modules/sharp 처럼
  // 한 단계 더 들어간 곳에 실물을 두기 때문에 node_modules/sharp 로 시작하는 패턴은 빗나간다.
  outputFileTracingExcludes: {
    '*': ['**/node_modules/sharp/**', '**/node_modules/@img/**'],
  },
  compiler: {
    styledComponents: true,
  },
  // page 없이 하위 경로만 있는 기능 루트를 목록으로 보낸다. 주소를 줄여 치거나 외부 링크로 오면
  // 404 를 보던 곳이다(#636). `/community/` 끝 슬래시도 같은 규칙이 받고 쿼리는 그대로 이어진다.
  // 임시(307)로 둔다 — 나중에 루트가 랜딩이 될 수 있어 브라우저가 영구 캐시하지 않게 한다.
  // `/profile` 은 가야 할 곳(북마크·설정)이 갈려 여기서 정하지 않는다.
  async redirects() {
    return [
      {
        source: '/community',
        destination: '/community/list',
        permanent: false,
      },
      { source: '/chatting', destination: '/chatting/list', permanent: false },
    ]
  },
}

export default nextConfig
