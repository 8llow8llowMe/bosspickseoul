/**
 * 회원 탈퇴 요청. **전용 라우트를 거친다**(`app/api/auth/withdraw`).
 *
 * `apiClient` 로 백엔드를 직접 부르지 않는 이유: 탈퇴는 서버 세션을 파괴해야 하고,
 * 그 세션은 Next 서버가 들고 있다. 클라이언트에서 백엔드만 때리면 죽은 토큰이 담긴
 * 세션이 남아 로그인한 것처럼 보이다가 모든 호출이 실패한다.
 */
export const requestMemberWithdraw = async (): Promise<void> => {
  const response = await fetch('/api/auth/withdraw', { method: 'POST' })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string
    } | null

    throw new Error(
      body?.message ?? '탈퇴에 실패했어요. 잠시 후 다시 시도해 주세요.',
    )
  }
}
