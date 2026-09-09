package com.followfollowme.bosspickseoul.domainlayer.member.application.info;

import com.followfollowme.bosspickseoul.domainlayer.member.domain.model.Member;
import lombok.Builder;

/**
 * 다른 서비스(커뮤니티 등)가 작성자 표시용으로 쓰는 회원 요약.
 * 탈퇴 회원은 저장 시점에 이미 닉네임이 마스킹("탈퇴회원")되어 있으므로 상태 필터 없이 그대로 내려준다.
 */
@Builder
public record MemberSummaryInfo(
    long memberId,
    String nickname,
    // 소셜 제공자 외부 URL. 직접 업로드본이 있으면 null 이다.
    String profileImageUrl,
    // 직접 업로드본의 오브젝트 키. 공개 URL 조립은 Presenter 책임이다.
    String profileImageKey
) {

    public static MemberSummaryInfo from(Member member) {
        return MemberSummaryInfo.builder()
            .memberId(member.id())
            .nickname(member.nickname())
            .profileImageUrl(member.profileImageUrl())
            .profileImageKey(member.profileImageKey())
            .build();
    }
}
