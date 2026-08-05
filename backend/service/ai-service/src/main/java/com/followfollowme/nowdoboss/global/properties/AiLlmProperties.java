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
    double temperature,
    // gpt-oss 계열 추론 강도(low/medium/high). 기본 medium은 추론에 생성 토큰의
    // 대부분을 소모하므로(실측: 리포트 생성 37.7s -> 8.2s) low를 기본값으로 쓴다.
    String reasoningEffort
) {

}
