package com.followfollowme.nowdoboss.global.config;

import com.followfollowme.nowdoboss.global.properties.AiLlmProperties;
import org.springframework.ai.ollama.OllamaChatModel;
import org.springframework.ai.ollama.api.OllamaApi;
import org.springframework.ai.ollama.api.OllamaOptions;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.DefaultResponseErrorHandler;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class AiLlmModelConfig {

    @Bean
    @ConditionalOnProperty(prefix = "ai.llm", name = "provider", havingValue = "OLLAMA", matchIfMissing = true)
    public OllamaApi ollamaApi(RestClient.Builder restClientBuilder, WebClient.Builder webClientBuilder, AiLlmProperties properties) {
        return OllamaApi.builder()
            .baseUrl(properties.baseUrl())
            .restClientBuilder(restClientBuilder)
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
