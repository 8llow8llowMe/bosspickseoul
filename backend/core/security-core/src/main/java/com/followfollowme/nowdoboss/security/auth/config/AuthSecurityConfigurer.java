package com.followfollowme.nowdoboss.security.auth.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.followfollowme.nowdoboss.security.auth.handler.JwtAuthenticationFailureHandler;
import com.followfollowme.nowdoboss.security.auth.jwt.JwtAuthFilter;
import com.followfollowme.nowdoboss.security.auth.jwt.JwtAuthProperties;
import com.followfollowme.nowdoboss.security.auth.jwt.JwtAuthProvider;
import com.followfollowme.nowdoboss.security.common.handler.AuthenticationFailureHandler;
import com.followfollowme.nowdoboss.security.common.handler.CustomAccessDeniedHandler;
import java.util.Arrays;
import java.util.List;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

@EnableMethodSecurity(securedEnabled = true)
public class AuthSecurityConfigurer {

    @Bean
    public SecurityFilterChain securityFilterChain(
        HttpSecurity http, JwtAuthFilter jwtAuthFilter, CustomAccessDeniedHandler customAccessDeniedHandler) throws Exception {

        http
            // 1. CORS(Cross-Origin Resource Sharing) 설정 적용
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // 2. 불필요한 기본 기능 비활성화
            // 2-1. CSRF 설정 비활성화
            .csrf(AbstractHttpConfigurer::disable)
            // 2-2. HTTP Basic 인증 방식을 비활성화 (ID/PW 기반 인증 사용하지 않음)
            .httpBasic(AbstractHttpConfigurer::disable)
            // 2-3. Spring Security 기본 로그인/로그아웃 기능 비활성화
            .formLogin(AbstractHttpConfigurer::disable)
            .logout(AbstractHttpConfigurer::disable)
            // 2-4. X-Frame-Options 비활성화 (H2 Console 접근 등 필요시 사용)
            .headers(header -> header.frameOptions(HeadersConfigurer.FrameOptionsConfig::disable))
            // 3. 모든 HTTP 요청에 대해 접근을 허용
            // 인증이 필요한 요청은 JwtAuthFilter에서 직접 토큰 검증을 수행하며,
            // @PreAuthorize 등 메서드 수준의 인가 처리는 EnableMethodSecurity에 의해 적용
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
            // 4. JWT 인증 필터 등록
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            // 5. 예외 처리 (권한 실패만 처리, 인증 실패는 Filter에서 처리)
            .exceptionHandling(ex -> ex
                // Auth‐Service 에서도 권한 체크(@PreAuthorize) 시 403 을 JSON으로 내려줌
                // AuthenticationEntryPoint 등록 안 함
                // 인증 실패는 JwtAuthFilter 안에서 처리 -> 커스텀 응답
                .accessDeniedHandler(customAccessDeniedHandler)
            );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = getCorsConfiguration(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public FilterRegistrationBean<CorsFilter> corsFilterRegistrationBean() {
        CorsConfiguration config = getCorsConfiguration(6000L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        FilterRegistrationBean<CorsFilter> filterBean = new FilterRegistrationBean<>(new CorsFilter(source));
        filterBean.setOrder(0);
        return filterBean;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public JwtAuthProvider jwtAuthProvider(JwtAuthProperties jwtAuthProperties) {
        return new JwtAuthProvider(jwtAuthProperties);
    }

    @Bean
    public JwtAuthFilter jwtAuthFilter(JwtAuthProvider jwtAuthProvider, AuthenticationFailureHandler jwtAuthenticationFailureHandler) {
        return new JwtAuthFilter(jwtAuthProvider, jwtAuthenticationFailureHandler);
    }

    @Bean
    public CustomAccessDeniedHandler customAccessDeniedHandler(ObjectMapper objectMapper) {
        return new CustomAccessDeniedHandler(objectMapper);
    }

    @Bean
    public AuthenticationFailureHandler jwtAuthenticationFailureHandler(ObjectMapper objectMapper) {
        return new JwtAuthenticationFailureHandler(objectMapper);
    }

    private CorsConfiguration getCorsConfiguration(long maxAge) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);
        config.setAllowedOriginPatterns(List.of(
            "http://localhost:5173", // 프론트엔드 개발자가 로컬에서 실행한 Vite(Next.js) 앱에서 백엔드로 API 요청할 수 있도록 허용
            // 로컬에서 API Gateway 실행 시, Swagger UI 통한 요청 등 CORS 허용 (Aggregation된 API 호출용) -> 하이브리드 인증/인가 패턴 때문에
            "http://localhost:8000"
            // TODO: 추후에 개발서버 운영서버 도메인 세팅 시 해당 설정 추가 예정
        ));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setMaxAge(maxAge);
        return config;
    }
}
