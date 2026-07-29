package com.followfollowme.nowdoboss.domainlayer.auth.adapter.out.oauth.kakao;

import com.followfollowme.nowdoboss.domainlayer.auth.adapter.out.oauth.kakao.dto.KakaoMemberResponse;
import com.followfollowme.nowdoboss.domainlayer.auth.adapter.out.oauth.kakao.dto.KakaoToken;
import com.followfollowme.nowdoboss.domainlayer.auth.adapter.out.oauth.kakao.properties.KakaoOAuthProperties;
import com.followfollowme.nowdoboss.domainlayer.auth.application.port.out.OAuthMemberQueryPort;
import com.followfollowme.nowdoboss.domainlayer.auth.application.port.out.query.OAuthMemberQueryResult;
import com.followfollowme.nowdoboss.domainlayer.member.domain.enums.OAuthProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

@Component
@RequiredArgsConstructor
public class KakaoMemberQueryAdapter implements OAuthMemberQueryPort {

    private final KakaoApiClient kakaoApiClient;
    private final KakaoOAuthProperties kakaoOAuthProperties;

    @Override
    public OAuthProvider supports() {
        return OAuthProvider.KAKAO;
    }

    @Override
    public OAuthMemberQueryResult fetchMember(String authCode, String state) {
        // 1. 인가코드 -> 액세스 토큰 교환
        KakaoToken token = kakaoApiClient.fetchToken(buildTokenRequestParams(authCode));

        // 2. 사용자 프로필 조회 후 QueryResult로 변환
        KakaoMemberResponse response = kakaoApiClient.fetchMember("Bearer " + token.accessToken());
        return OAuthMemberQueryResult.builder()
            .email(response.kakaoAccount().email())
            .name(response.kakaoAccount().name())
            .nickname(response.kakaoAccount().profile().nickname())
            .profileImageUrl(response.kakaoAccount().profile().profileImageUrl())
            .build();
    }

    private MultiValueMap<String, String> buildTokenRequestParams(String authCode) {
        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("grant_type", "authorization_code");
        params.add("client_id", kakaoOAuthProperties.clientId());
        params.add("client_secret", kakaoOAuthProperties.clientSecret());
        params.add("redirect_uri", kakaoOAuthProperties.redirectUri());
        params.add("code", authCode);
        return params;
    }
}
