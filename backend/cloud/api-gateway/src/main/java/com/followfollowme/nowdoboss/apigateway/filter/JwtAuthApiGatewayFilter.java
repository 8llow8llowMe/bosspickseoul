package com.followfollowme.nowdoboss.apigateway.filter;

import com.followfollowme.nowdoboss.apigateway.filter.JwtAuthApiGatewayFilter.Config;
import com.followfollowme.nowdoboss.apigateway.jwt.AccessTokenBlacklistChecker;
import com.followfollowme.nowdoboss.apigateway.jwt.JwtVerifier;
import com.followfollowme.nowdoboss.apigateway.jwt.exception.JwtErrorCode;
import com.followfollowme.nowdoboss.apigateway.jwt.exception.JwtException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.SecurityException;
import io.jsonwebtoken.security.SignatureException;
import lombok.RequiredArgsConstructor;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import reactor.core.publisher.Mono;

@Component
@RequiredArgsConstructor
public class JwtAuthApiGatewayFilter extends AbstractGatewayFilterFactory<Config> {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtVerifier jwtVerifier;
    private final AccessTokenBlacklistChecker accessTokenBlacklistChecker;

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            ServerHttpRequest request = exchange.getRequest();
            String jwt = getJwtFrom(request);

            if (!StringUtils.hasText(jwt)) {
                return chain.filter(exchange);
            }

            return Mono.defer(() -> {
                try {
                    Claims claims = jwtVerifier.validateAndGetClaims(jwt);
                    String tokenId = claims.getId();
                    if (tokenId != null && accessTokenBlacklistChecker.isBlacklisted(tokenId)) {
                        throw new JwtException(JwtErrorCode.TOKEN_REVOKED);
                    }
                    return chain.filter(exchange);
                } catch (JwtException e) {
                    throw e;
                } catch (ExpiredJwtException e) {
                    throw new JwtException(JwtErrorCode.TOKEN_EXPIRED);
                } catch (SignatureException e) {
                    throw new JwtException(JwtErrorCode.TOKEN_SIGNATURE_INVALID);
                } catch (MalformedJwtException e) {
                    throw new JwtException(JwtErrorCode.TOKEN_MALFORMED);
                } catch (SecurityException | IllegalArgumentException e) {
                    throw new JwtException(JwtErrorCode.TOKEN_INVALID);
                }
            });
        };
    }

    private String getJwtFrom(ServerHttpRequest request) {
        String bearerToken = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith(BEARER_PREFIX)) {
            return bearerToken.substring(BEARER_PREFIX.length());
        }
        return null;
    }

    public static class Config {

    }
}