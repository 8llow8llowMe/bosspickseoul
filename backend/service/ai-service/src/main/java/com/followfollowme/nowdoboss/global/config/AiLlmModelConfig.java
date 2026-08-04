package com.followfollowme.nowdoboss.global.config;

import com.followfollowme.nowdoboss.global.properties.AiLlmProperties;
import java.time.Duration;
import org.springframework.ai.ollama.OllamaChatModel;
import org.springframework.ai.ollama.api.OllamaApi;
import org.springframework.ai.ollama.api.OllamaOptions;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.http.client.ClientHttpRequestFactoryBuilder;
import org.springframework.boot.http.client.ClientHttpRequestFactorySettings;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.DefaultResponseErrorHandler;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class AiLlmModelConfig {

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(3);

    @Bean
    @ConditionalOnProperty(prefix = "ai.llm", name = "provider", havingValue = "OLLAMA", matchIfMissing = true)
    public OllamaApi ollamaApi(RestClient.Builder restClientBuilder, WebClient.Builder webClientBuilder, AiLlmProperties properties) {
        // OllamaChatModel.call()은 RestClient 경로를 탄다. 타임아웃을 명시하지 않으면
        // LLM이 멈췄을 때 리포트 워커 스레드가 무기한 점유되므로 ai.llm.timeout-ms를 적용한다.
        ClientHttpRequestFactorySettings requestFactorySettings = ClientHttpRequestFactorySettings.defaults()
            .withConnectTimeout(CONNECT_TIMEOUT)
            .withReadTimeout(Duration.ofMillis(properties.timeoutMs()));
        return OllamaApi.builder()
            .baseUrl(properties.baseUrl())
            .restClientBuilder(
                restClientBuilder.requestFactory(ClientHttpRequestFactoryBuilder.detect().build(requestFactorySettings))
            )
            .webClientBuilder(webClientBuilder)
            .responseErrorHandler(new DefaultResponseErrorHandler())
            .build();
    }

    @Bean
    @ConditionalOnProperty(prefix = "ai.llm", name = "provider", havingValue = "OLLAMA", matchIfMissing = true)
    public OllamaChatModel ollamaChatModel(OllamaApi ollamaApi, AiLlmProperties properties) {
        return OllamaChatModel.builder()
            .ollamaApi(ollamaApi)
            .defaultOptions(
                OllamaOptions.builder()
                    .model(properties.model())
                    .temperature(properties.temperature())
                    .numPredict(properties.maxTokens())
                    .build()
            )
            .build();
    }
}
