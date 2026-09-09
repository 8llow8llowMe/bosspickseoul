package com.followfollowme.bosspickseoul.security.common.dto;

import com.followfollowme.bosspickseoul.security.common.enums.SecurityRole;
import lombok.Builder;

@Builder
public record MemberLoginActive(
    // 인증된 회원 식별자
    long memberId,
    // 회원 권한
    SecurityRole role,
    // Access Token의 jti (블랙리스트 키)
    String tokenId,
    // Access Token의 iat (초 단위). 회원 단위 revocation 마커와 비교해 무효 토큰을 걸러낸다.
    // iat 클레임이 없는 토큰은 0 이며, 마커가 있으면 항상 무효로 판정된다.
    long issuedAtEpochSeconds
) {

}
