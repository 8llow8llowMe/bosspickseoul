package com.followfollowme.bosspickseoul.apigateway.config;

import java.util.Arrays;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

@Configuration
public class ApiGatewayCorsConfig {

    @Bean
    public CorsWebFilter corsWebFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of(
            "http://localhost:5173",           // FE 로컬(next dev). 3000 이 로컬에서 점유라 5173 으로 바꿔 씀
            "https://dev.bosspickseoul.com",   // 개발 웹. BFF 가 브라우저 Origin 보존 전달 + 채팅 WS 직결 (빼면 쓰기만 빈 403)
            "https://www.bosspickseoul.com",   // 운영 웹. 이유는 개발 웹과 동일 — Swagger 용 아님
            "https://api-dev.bosspickseoul.com" // 개발 Swagger Try it out. nginx TLS 종료로 스킴이 달라 교차 출처 판정
        ));

        config.setAllowedHeaders(List.of("*"));
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        return new CorsWebFilter(source);
    }
}
