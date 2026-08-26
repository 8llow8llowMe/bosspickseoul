import { NextResponse, type NextRequest } from 'next/server'

/**
 * 같은 오리진 안에서 이동하는 리다이렉트 응답을 만든다. **라우트 핸들러 전용이다.**
 *
 * `NextResponse.redirect` 는 절대 URL 을 요구해서 보통 `request.url` 로 오리진을 만든다.
 * 그런데 standalone 서버는 컨테이너 바인드 주소(HOSTNAME/PORT)로 요청 URL 의 오리진을 구성하므로,
 * 리버스 프록시 뒤에서는 그 값이 `http://0.0.0.0:3000` 이 되어 브라우저가 도달할 수 없는 주소로 보낸다.
 * (frontend-web.Dockerfile 이 컨테이너 외부 접근을 위해 HOSTNAME=0.0.0.0 을 설정한다)
 *
 * Location 헤더는 상대 참조를 허용하고 브라우저가 요청 URL 기준으로 해석하므로,
 * 같은 오리진 이동은 상대 경로가 프록시 구성과 무관하게 항상 올바르다.
 *
 * **미들웨어에서는 쓸 수 없다.** Next 의 미들웨어 어댑터가 응답의 `Location` 을
 * `new NextURL(location)` 으로 파싱해 요청 host 와 비교하는데, 상대 경로는 base 가 없어
 * `TypeError: Invalid URL` 로 500 이 된다. 미들웨어에서는 `redirectRequestToPath` 를 쓴다.
 *
 * @param path `/` 로 시작하는 경로. 오리진을 직접 붙이지 않는다.
 */
export const redirectToPath = (path: string, status: 302 | 307 = 307) =>
  new NextResponse(null, { status, headers: { Location: path } })

/** 콤마로 이어진 프록시 헤더에서 첫 값만 취한다. */
const firstHeaderValue = (value: string | null) =>
  value?.split(',')[0]?.trim() || null

/**
 * **미들웨어 전용** 리다이렉트. 절대 URL 을 만든다.
 *
 * 미들웨어 어댑터가 `Location` 을 절대 URL 로 파싱하므로 상대 경로를 쓸 수 없다.
 * 그렇다고 `req.nextUrl.origin` 을 쓰면 standalone 서버의 바인드 주소(`0.0.0.0:3000`)가
 * 나와 브라우저가 도달할 수 없다 — 이것이 애초에 상대 경로를 쓰게 된 이유다.
 *
 * 그래서 오리진을 프록시 헤더에서 유도한다. `x-forwarded-*` → `host` → `nextUrl` 순으로
 * 폴백하므로 프록시 뒤에서도, 프록시 없이 로컬에서도 올바른 주소가 나온다.
 *
 * 주의: `x-forwarded-host` 는 프록시가 덮어쓰지 않으면 클라이언트가 위조할 수 있다.
 * 위조하면 자기 브라우저만 다른 호스트로 가므로 타인에게 영향은 없지만, 캐시에 실리면
 * 다른 사용자에게도 퍼질 수 있어 `Cache-Control: no-store` 를 붙인다.
 *
 * @param path `/` 로 시작하는 경로.
 */
export const redirectRequestToPath = (
  req: NextRequest,
  path: string,
  status: 302 | 307 = 307,
) => {
  const protocol =
    firstHeaderValue(req.headers.get('x-forwarded-proto')) ??
    req.nextUrl.protocol.replace(/:$/, '') ??
    'http'
  const host =
    firstHeaderValue(req.headers.get('x-forwarded-host')) ??
    req.headers.get('host') ??
    req.nextUrl.host

  const response = NextResponse.redirect(
    new URL(path, `${protocol}://${host}`),
    status,
  )
  response.headers.set('Cache-Control', 'no-store')
  return response
}
