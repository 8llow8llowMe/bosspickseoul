package com.followfollowme.nowdoboss.global.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "ai.llm")
public record AiLlmProperties(
    AiLlmProvider provider,
    String baseUrl,
    String apiKey,
    String model,
    long timeoutMs,
    int maxTokens,
    double temperature
) {

}
