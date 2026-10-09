'use client'

import Link from 'next/link'
import styled from 'styled-components'
import AuthShell, {
  FooterLink,
  FooterRow,
  Notice,
} from '@/components/auth/auth-shell'
import { LEGAL_HREF } from '@/lib/legal/links'

const PrimaryLink = styled(Link)`
  min-width: 180px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  border-radius: var(--radius-control);
  background: var(--color-fill-primary-text);
  color: white;
  font-size: 15px;
  font-weight: 600;
`

/** 안내 문단 안의 링크. 문단 색(primary-700)을 그대로 쓰고 밑줄로만 구분한다. */
const NoticeLink = styled(Link)`
  color: inherit;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 2px;
`

/*
  문구는 개인정보 처리방침 제6조 탈퇴 표(`src/lib/legal/privacy-policy.ts`)와 같은 사실만 말한다(#495).
  이름·닉네임은 「탈퇴회원」으로 바뀌고 모든 기기에서 로그아웃된다. 이메일은 재가입 차단을 위해 남고,
  게시글·댓글은 남되 작성자가 「탈퇴회원」으로 표시된다. 본문은 해요체(DESIGN.md §10).
  보관 기간은 아직 정해지지 않아(#508) 적지 않는다.
*/
export default function AccountDeletedPage() {
  return (
    <AuthShell
      eyebrow="회원 탈퇴"
      title="회원 탈퇴가 완료되었습니다."
      description="이름·닉네임을 지우고 모든 기기에서 로그아웃했어요."
    >
      <Notice>
        작성한 글과 댓글은 남고, 작성자는 「탈퇴회원」으로 표시돼요. 탈퇴한
        이메일로는 다시 가입할 수 없어요. 자세한 내용은{' '}
        <NoticeLink href={LEGAL_HREF.privacy}>개인정보 처리방침</NoticeLink>
        에서 볼 수 있어요.
      </Notice>
      <PrimaryLink href="/">메인으로 이동</PrimaryLink>
      <FooterRow>
        <span>다른 이메일로 다시 시작하려면</span>
        <FooterLink href="/register">회원가입</FooterLink>
      </FooterRow>
    </AuthShell>
  )
}
