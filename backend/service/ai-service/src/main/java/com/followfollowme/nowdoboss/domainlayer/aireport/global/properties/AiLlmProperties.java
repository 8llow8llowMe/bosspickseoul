package com.followfollowme.nowdoboss.domainlayer.aireport.global.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "ai.llm")
public record AiLlmProperties(
    String baseUrl,
    String apiKey,
    String model,
    int timeoutMs,
    int maxTokens,
    double temperature
) {

}
