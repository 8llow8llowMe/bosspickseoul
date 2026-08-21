package com.followfollowme.bosspickseoul.security.resourceserver.resolver;

import com.followfollowme.bosspickseoul.security.common.exception.SecurityErrorCode;
import com.followfollowme.bosspickseoul.security.common.resolver.JwtTokenErrorResolver;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;

public class OAuth2ResourceTokenErrorResolver implements JwtTokenErrorResolver {

    @Override
    public SecurityErrorCode resolve(Throwable ex) {

        if (ex instanceof OAuth2AuthenticationException oauth2Ex) {
            String msg = oauth2Ex.getError().getDescription().toLowerCase();

            if (msg.contains("expired")) {
                return SecurityErrorCode.TOKEN_EXPIRED;
            }
            if (msg.contains("signature")) {
                return SecurityErrorCode.TOKEN_SIGNATURE_INVALID;
            }
            if (msg.contains("malformed")) {
                return SecurityErrorCode.TOKEN_MALFORMED;
            }
            if (msg.contains("invalid")) {
                return SecurityErrorCode.TOKEN_INVALID;
            }
        }

        return SecurityErrorCode.UNAUTHORIZED;
    }
}
