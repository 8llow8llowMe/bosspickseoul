package com.followfollowme.nowdoboss.global.config;

import com.followfollowme.nowdoboss.domainlayer.auth.adapter.out.oauth.kakao.KakaoApiClient;
import com.followfollowme.nowdoboss.domainlayer.auth.adapter.out.oauth.kakao.properties.KakaoOAuthProperties;
import com.followfollowme.nowdoboss.domainlayer.auth.adapter.out.oauth.naver.NaverApiClient;
import com.followfollowme.nowdoboss.domainlayer.auth.adapter.out.oauth.naver.properties.NaverOAuthProperties;
import java.time.Duration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.support.WebClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;
import reactor.netty.http.client.HttpClient;

@Configuration
@EnableConfigurationProperties({KakaoOAuthProperties.class, NaverOAuthProperties.class})
public class OAuthClientConfig {

    private static final Duration RESPONSE_TIMEOUT = Duration.ofSeconds(10);

    @Bean
    public KakaoApiClient kakaoApiClient() {
        return createHttpInterface(KakaoApiClient.class);
    }

    @Bean
    public NaverApiClient naverApiClient() {
        return createHttpInterface(NaverApiClient.class);
    }

    private <T> T createHttpInterface(Class<T> serviceClass) {
        // provider 응답 지연이 로그인 요청을 무한정 붙잡지 않도록 타임아웃을 둔다.
        WebClient client = WebClient.builder()
            .clientConnector(new org.springframework.http.client.reactive.ReactorClientHttpConnector(
                HttpClient.create().responseTimeout(RESPONSE_TIMEOUT)))
            .build();

        return HttpServiceProxyFactory
            .builderFor(WebClientAdapter.create(client))
            .build()
            .createClient(serviceClass);
    }
}
