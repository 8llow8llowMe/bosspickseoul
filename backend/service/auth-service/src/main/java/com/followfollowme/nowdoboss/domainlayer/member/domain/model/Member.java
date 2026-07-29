package com.followfollowme.nowdoboss.domainlayer.member.domain.model;

import com.followfollowme.nowdoboss.domainlayer.member.domain.enums.MemberStatus;
import com.followfollowme.nowdoboss.security.common.enums.SecurityRole;
import lombok.Builder;

@Builder
public record Member(
    long id,
    String email,
    String password,
    String name,
    String nickname,
    String profileImageUrl,
    SecurityRole role,
    MemberStatus status
) {

    private static final String WITHDRAWN_MASK = "탈퇴회원";

    /**
     * 논리 탈퇴 상태로 전이한다. 개인정보 노출을 줄이기 위해 이름/닉네임을 마스킹하고
     * 프로필 이미지와 비밀번호 해시를 제거한다. email은 유지되어 동일 이메일 재가입이 차단된다.
     */
    public Member withdraw() {
        return toBuilder().password(null).name(WITHDRAWN_MASK).nickname(WITHDRAWN_MASK).profileImageUrl(null)
            .status(MemberStatus.WITHDRAWN).build();
    }

    public Member updateProfile(String nickname, String profileImageUrl) {
        return toBuilder().nickname(nickname).profileImageUrl(profileImageUrl).build();
    }

    public Member changePassword(String encodedPassword) {
        return toBuilder().password(encodedPassword).build();
    }

    private MemberBuilder toBuilder() {
        return Member.builder()
            .id(id).email(email).password(password).name(name).nickname(nickname)
            .profileImageUrl(profileImageUrl).role(role).status(status);
    }
}
