/**
 * 로그인 요청에 **브라우저의** User-Agent 를 실어 보낸다.
 *
 * 백엔드는 로그인 시점의 User-Agent 를 기기 세션 메타로 저장하고, 그걸
 * `GET /auth/sessions` 의 `deviceInfo` 로 보여 준다(BE 66a9e21d).
 *
 * 그런데 이 저장소의 로그인은 브라우저가 백엔드를 직접 부르지 않는다 — Next 서버의
 * 라우트 핸들러가 대신 부른다. 그래서 헤더를 넘겨주지 않으면 백엔드에 남는 건
 * 사용자의 기기가 아니라 **Next 서버의 런타임 UA** 다. 모든 세션 행이 똑같아져서
 * "어느 기기인지" 를 보여 주는 기능이 통째로 무의미해진다.
 *
 * 정제(제어문자 제거·150자 절단)는 백엔드가 한다. 여기서는 그대로 넘긴다.
 * 표시용이며 신뢰가 필요한 판단에는 쓰이지 않는다.
 *
 * BFF 범용 프록시(`app/api/bff/[...path]`)는 이미 요청 헤더를 통째로 복사하므로
 * 이 헬퍼가 필요 없다. 헤더를 직접 조립하는 **전용 라우트**에서만 쓴다.
 */
export const withClientUserAgent = (
  request: Request,
  base: Record<string, string>,
): Record<string, string> => {
  const userAgent = request.headers.get('user-agent')
  return userAgent ? { ...base, 'User-Agent': userAgent } : base
}
