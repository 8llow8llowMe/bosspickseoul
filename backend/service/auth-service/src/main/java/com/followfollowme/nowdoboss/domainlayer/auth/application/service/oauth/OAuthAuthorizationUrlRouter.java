package com.followfollowme.nowdoboss.domainlayer.auth.application.service.oauth;

import com.followfollowme.nowdoboss.domainlayer.auth.application.exception.AuthErrorCode;
import com.followfollowme.nowdoboss.domainlayer.auth.application.port.out.OAuthAuthorizationUrlProvider;
import com.followfollowme.nowdoboss.domainlayer.auth.application.exception.AuthException;
import com.followfollowme.nowdoboss.domainlayer.member.domain.enums.OAuthProvider;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/**
 * provider별 인가 URL 생성 구현을 supports() 키로 라우팅한다.
 */
@Component
public class OAuthAuthorizationUrlRouter {

    private final Map<OAuthProvider, OAuthAuthorizationUrlProvider> providerMap;

    public OAuthAuthorizationUrlRouter(Set<OAuthAuthorizationUrlProvider> providers) {
        this.providerMap = providers.stream()
            .collect(Collectors.toMap(OAuthAuthorizationUrlProvider::supports, Function.identity()));
    }

    public String generateUrl(OAuthProvider provider, String state) {
        return getProvider(provider).generateUrl(state);
    }

    private OAuthAuthorizationUrlProvider getProvider(OAuthProvider provider) {
        return Optional.ofNullable(providerMap.get(provider))
            .orElseThrow(() -> new AuthException(AuthErrorCode.UNSUPPORTED_OAUTH_PROVIDER, provider.name()));
    }
}
