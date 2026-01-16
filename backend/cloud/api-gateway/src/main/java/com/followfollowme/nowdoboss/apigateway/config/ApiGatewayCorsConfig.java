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
            "http://localhost:5173", // 프론트엔드 개발자가 로컬에서 실행한 Next.js 앱에서 백엔드로 API 요청할 수 있도록 허용
            // 개발서버 API Gateway에서 Swagger UI를 통해 각 마이크로서비스로 API 호출 시 CORS 허용 (Swagger Aggregation 패턴)
            "http://www.nowdoboss-dev.store:*",
            "https://www.nowdoboss.com" // 운영 배포된 프론트가 실제 API 서버로 요청할 때 CORS 허용
        ));

        config.setAllowedHeaders(List.of("*"));
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        return new CorsWebFilter(source);
    }
}
