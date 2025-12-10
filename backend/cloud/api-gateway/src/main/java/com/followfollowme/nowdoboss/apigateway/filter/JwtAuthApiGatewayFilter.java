package com.followfollowme.nowdoboss.apigateway.filter;

import com.followfollowme.nowdoboss.apigateway.filter.JwtAuthApiGatewayFilter.Config;
import com.followfollowme.nowdoboss.apigateway.jwt.JwtVerifier;
import com.followfollowme.nowdoboss.apigateway.jwt.exception.JwtErrorCode;
import com.followfollowme.nowdoboss.apigateway.jwt.exception.JwtException;
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

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            ServerHttpRequest request = exchange.getRequest();
            String jwt = getJwtFrom(request);

            // JWT가 없으면 바로 다음 필터로 (인증 불필요한 경로일 수 있음)
            if (!StringUtils.hasText(jwt)) {
                return chain.filter(exchange);
            }

            // JWT 검증을 reactive-safe 하게 처리
            return Mono.defer(() -> {

                try {
                    jwtVerifier.validate(jwt);
                    return chain.filter(exchange); // 검증 성공하면 다음 필터 실행
                } catch (ExpiredJwtException e) {
                    throw new JwtException(JwtErrorCode.TOKEN_EXPIRED);
                } catch (SignatureException e) {
                    throw new JwtException(JwtErrorCode.TOKEN_SIGNATURE_INVALID);
                } catch (MalformedJwtException e) {
                    throw new JwtException(JwtErrorCode.TOKEN_MALFORMED);
                } catch (SecurityException | IllegalArgumentException e) {
                    throw new JwtException(JwtErrorCode.TOKEN_INVALID);
                }

            }); // Mono.defer
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
