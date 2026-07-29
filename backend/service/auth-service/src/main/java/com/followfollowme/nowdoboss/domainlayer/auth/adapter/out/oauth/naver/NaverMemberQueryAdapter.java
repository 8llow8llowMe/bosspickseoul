package com.followfollowme.nowdoboss.domainlayer.auth.adapter.out.oauth.naver;

import com.followfollowme.nowdoboss.domainlayer.auth.adapter.out.oauth.naver.dto.NaverAccount;
import com.followfollowme.nowdoboss.domainlayer.auth.adapter.out.oauth.naver.dto.NaverToken;
import com.followfollowme.nowdoboss.domainlayer.auth.adapter.out.oauth.naver.properties.NaverOAuthProperties;
import com.followfollowme.nowdoboss.domainlayer.auth.application.port.out.OAuthMemberQueryPort;
import com.followfollowme.nowdoboss.domainlayer.auth.application.port.out.query.OAuthMemberQueryResult;
import com.followfollowme.nowdoboss.domainlayer.member.domain.enums.OAuthProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

@Component
@RequiredArgsConstructor
public class NaverMemberQueryAdapter implements OAuthMemberQueryPort {

    private final NaverApiClient naverApiClient;
    private final NaverOAuthProperties naverOAuthProperties;

    @Override
    public OAuthProvider supports() {
        return OAuthProvider.NAVER;
    }

    @Override
    public OAuthMemberQueryResult fetchMember(String authCode, String state) {
        // 1. 인가코드 -> 액세스 토큰 교환 (네이버는 state를 함께 요구한다)
        NaverToken token = naverApiClient.fetchToken(buildTokenRequestParams(authCode, state));

        // 2. 사용자 프로필 조회 후 QueryResult로 변환
        NaverAccount account = naverApiClient.fetchMember("Bearer " + token.accessToken()).response();
        return OAuthMemberQueryResult.builder()
            .email(account.email())
            .name(account.name())
            .nickname(account.nickname())
            .profileImageUrl(account.profileImage())
            .build();
    }

    private MultiValueMap<String, String> buildTokenRequestParams(String authCode, String state) {
        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("grant_type", "authorization_code");
        params.add("client_id", naverOAuthProperties.clientId());
        params.add("client_secret", naverOAuthProperties.clientSecret());
        params.add("code", authCode);
        params.add("state", state);
        return params;
    }
}
