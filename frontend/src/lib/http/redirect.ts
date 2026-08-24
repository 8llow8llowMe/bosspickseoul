import { NextResponse } from 'next/server'

/**
 * 같은 오리진 안에서 이동하는 리다이렉트 응답을 만든다.
 *
 * `NextResponse.redirect` 는 절대 URL 을 요구해서 보통 `request.url` 로 오리진을 만든다.
 * 그런데 standalone 서버는 컨테이너 바인드 주소(HOSTNAME/PORT)로 요청 URL 의 오리진을 구성하므로,
 * 리버스 프록시 뒤에서는 그 값이 `http://0.0.0.0:3000` 이 되어 브라우저가 도달할 수 없는 주소로 보낸다.
 * (frontend-web.Dockerfile 이 컨테이너 외부 접근을 위해 HOSTNAME=0.0.0.0 을 설정한다)
 *
 * Location 헤더는 상대 참조를 허용하고 브라우저가 요청 URL 기준으로 해석하므로,
 * 같은 오리진 이동은 상대 경로가 프록시 구성과 무관하게 항상 올바르다.
 * 외부 도메인으로 보낼 때만 절대 URL 이 필요하다.
 *
 * @param path `/` 로 시작하는 경로. 오리진을 직접 붙이지 않는다.
 */
export const redirectToPath = (path: string, status: 302 | 307 = 307) =>
  new NextResponse(null, { status, headers: { Location: path } })
