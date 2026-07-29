package com.followfollowme.nowdoboss.domainlayer.auth.application.port.out;

import com.followfollowme.nowdoboss.domainlayer.auth.application.port.out.query.OAuthMemberQueryResult;
import com.followfollowme.nowdoboss.domainlayer.member.domain.enums.OAuthProvider;

public interface OAuthMemberQueryPort {

    OAuthProvider supports();

    OAuthMemberQueryResult fetchMember(String authCode, String state);
}
