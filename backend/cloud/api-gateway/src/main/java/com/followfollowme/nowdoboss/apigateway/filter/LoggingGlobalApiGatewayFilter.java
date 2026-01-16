package com.followfollowme.nowdoboss.apigateway.filter;

import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Slf4j
@Component
public class LoggingGlobalApiGatewayFilter implements GlobalFilter, Ordered {

    private static final String REQUEST_ID_HEADER = "X-Request-ID";
    private static final String REQUEST_START_TIME = "requestStartTime";
    private static final long SLOW_REQUEST_THRESHOLD_MS = 3000;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String requestId = getOrCreateRequestId(exchange.getRequest());
        exchange.getAttributes().put(REQUEST_ID_HEADER, requestId);

        long startTime = System.currentTimeMillis();
        exchange.getAttributes().put(REQUEST_START_TIME, startTime);

        logRequest(exchange, requestId);

        return chain.filter(exchange)
            .doFinally(signalType -> logResponse(exchange, requestId, startTime));
    }

    private String getOrCreateRequestId(ServerHttpRequest request) {
        String requestId = request.getHeaders().getFirst(REQUEST_ID_HEADER);
        return (requestId != null) ? requestId : UUID.randomUUID().toString();
    }

    private void logRequest(ServerWebExchange exchange, String requestId) {
        ServerHttpRequest request = exchange.getRequest();

        log.info("[REQUEST] requestId={} method={} uri={} clientIp={} userAgent={} hasAuth={} query={}",
            requestId, request.getMethod(), request.getURI(), getClientIp(request),
            getUserAgent(request), request.getHeaders().containsKey(HttpHeaders.AUTHORIZATION),
            request.getURI().getQuery() != null ? request.getURI().getQuery() : "none"
        );
    }

    private void logResponse(ServerWebExchange exchange, String requestId, long startTime) {
        ServerHttpResponse response = exchange.getResponse();
        HttpStatusCode statusCode = response.getStatusCode();

        long duration = System.currentTimeMillis() - startTime;
        int status = statusCode != null ? statusCode.value() : 0;
        String path = exchange.getRequest().getPath().toString();
        String contentLength = response.getHeaders().getFirst(HttpHeaders.CONTENT_LENGTH);

        log.info("[RESPONSE] requestId={} status={} duration={}ms path={} size={}",
            requestId, status, duration, path, contentLength != null ? contentLength + "bytes" : "unknown"
        );

        // 에러 응답 별도 로그
        if (status >= 400) {
            log.warn("[ERROR_RESPONSE] requestId={} status={} path={} duration={}ms clientIp={}",
                requestId, status, path, duration, getClientIp(exchange.getRequest())
            );
        }

        // 느린 요청 별도 로그
        if (duration > SLOW_REQUEST_THRESHOLD_MS) {
            log.warn("[SLOW_REQUEST] requestId={} duration={}ms threshold={}ms path={}",
                requestId, duration, SLOW_REQUEST_THRESHOLD_MS, path
            );
        }
    }

    private String getClientIp(ServerHttpRequest request) {
        String forwardedFor = request.getHeaders().getFirst("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isEmpty()) {
            return forwardedFor.split(",")[0].trim();
        }

        String realIp = request.getHeaders().getFirst("X-Real-IP");
        if (realIp != null) {
            return realIp;
        }

        return request.getRemoteAddress() != null
            ? request.getRemoteAddress().getAddress().getHostAddress()
            : "unknown";
    }

    private String getUserAgent(ServerHttpRequest request) {
        String userAgent = request.getHeaders().getFirst(HttpHeaders.USER_AGENT);
        if (userAgent == null) {
            return "unknown";
        }
        // 너무 길면 자르기 (Loki 효율성)
        return userAgent.length() > 100 ? userAgent.substring(0, 100) + "..." : userAgent;
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
