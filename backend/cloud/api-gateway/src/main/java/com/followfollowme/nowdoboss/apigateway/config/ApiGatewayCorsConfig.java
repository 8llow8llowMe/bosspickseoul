package com.followfollowme.nowdoboss.apigateway.config;

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
            "http://localhost:5173",
            "http://localhost:3000",
            "http://bosspickseoul-dev.store:[*]",
            "http://*.bosspickseoul-dev.store:[*]",
            "https://bosspickseoul.com",
            "https://www.bosspickseoul.com",
            // 집계 Swagger UI가 서빙되는 API 도메인 origin (auth-service 설정과 일관성 유지)
            "https://api.bosspickseoul.com",
            "https://api-dev.bosspickseoul.com"
        ));

        config.setAllowedHeaders(List.of("*"));
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        return new CorsWebFilter(source);
    }
}
