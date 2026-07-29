package com.followfollowme.nowdoboss.domainlayer.auth.application.port.out.query;

import lombok.Builder;

/**
 * 소셜 제공자에게서 조회한 사용자 프로필. adapter가 외부 응답을 이 형태로 변환해 넘긴다.
 */
@Builder
public record OAuthMemberQueryResult(
    String email,
    String name,
    String nickname,
    String profileImageUrl
) {

}
